import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getFunctionName } from "convex/server";

type GenerateChunk =
  | { type: "content"; text: string }
  | { type: "tool"; name: string; state: string };

type GenerateEntry = Error | ReadonlyArray<GenerateChunk>;

type GenerateCall = {
  thread: MockMessage[];
  options: Record<string, unknown> | undefined;
};

class MockMessage {
  constructor(
    readonly role: string,
    readonly content: string,
  ) {}
}

const server = vi.hoisted(() => ({
  getAuthToken: vi.fn(),
}));

const convex = vi.hoisted(() => ({
  fetchMutation: vi.fn(),
  fetchQuery: vi.fn(),
}));

const llm = vi.hoisted(() => ({
  addPluginCalls: [] as unknown[],
  generateCalls: [] as GenerateCall[],
  igniteModel: vi.fn(),
  models: [] as Array<{
    addPlugin: ReturnType<typeof vi.fn>;
    generate: ReturnType<typeof vi.fn>;
  }>,
  sequence: [] as GenerateEntry[],
}));

const sentry = vi.hoisted(() => ({
  captureException: vi.fn(),
}));

vi.mock("@/lib/server", () => ({
  getAuthToken: server.getAuthToken,
}));

vi.mock("convex/nextjs", () => ({
  fetchMutation: convex.fetchMutation,
  fetchQuery: convex.fetchQuery,
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: sentry.captureException,
}));

vi.mock("multi-llm-ts", () => ({
  igniteModel: llm.igniteModel,
  Message: MockMessage,
  MultiToolPlugin: class MultiToolPlugin {},
}));

const SET_ID = "aaaaaaaaaaaaaaaa";
const CARD_ID = "bbbbbbbbbbbbbbbb";
const VALIDATION_ERROR =
  '400 tool call validation failed: attempted to call tool "list_sets" which was not in request.tools';
const UNSUPPORTED_TOOLS_ERROR = "tool calling is not supported by this model";
const GENERATED_NOTE = "Review hen gaoxing as very happy to.";

async function* streamEntry(entry: GenerateEntry) {
  if (entry instanceof Error) {
    throw entry;
  }

  for (const chunk of entry) {
    yield chunk;
  }
}

function mockGenerateSequence(sequence: GenerateEntry[]) {
  llm.sequence.splice(0, llm.sequence.length, ...sequence);
  llm.igniteModel.mockImplementation(() => {
    const model = {
      addPlugin: vi.fn((plugin: unknown) => {
        llm.addPluginCalls.push(plugin);
      }),
      generate: vi.fn((thread: MockMessage[], options?: Record<string, unknown>) => {
        llm.generateCalls.push({ thread, options });
        const entry = llm.sequence.shift();
        if (!entry) {
          throw new Error("No mocked generation result is configured.");
        }
        return streamEntry(entry);
      }),
    };
    llm.models.push(model);
    return model;
  });
}

function makeChatRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function readSse(response: Response): Promise<Array<Record<string, unknown>>> {
  const reader = response.body?.getReader();
  expect(reader).toBeDefined();

  const decoder = new TextDecoder();
  let text = "";
  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;
    text += typeof value === "string" ? value : decoder.decode(value, { stream: true });
  }
  text += decoder.decode();

  return text
    .split("\n")
    .filter((line) => line.startsWith("data: "))
    .map((line) => JSON.parse(line.slice("data: ".length)) as Record<string, unknown>);
}

function chatBody(overrides: Record<string, unknown> = {}) {
  return {
    message: "what does this sentence mean?",
    history: [],
    model: "llama-test",
    context: {
      setId: SET_ID,
      cardId: CARD_ID,
      hasNote: false,
      cardFields: {
        Front: "hen gaoxing",
        Back: "very happy",
      },
    },
    ...overrides,
  };
}

async function loadRoute() {
  const route = await import("./route");
  return { POST: route.POST };
}

function expectMutationSavedNote() {
  expect(convex.fetchMutation).toHaveBeenCalledOnce();
  const call = convex.fetchMutation.mock.calls[0];
  expect(call).toBeDefined();

  const [mutation, args, options] = call!;
  expect(getFunctionName(mutation)).toBe("cardAnnotations:addAiNoteToCurrentCard");
  expect(args).toEqual({
    setId: SET_ID,
    cardId: CARD_ID,
    note: GENERATED_NOTE,
  });
  expect(options).toEqual({ token: "token" });
}

describe("/api/chat route tool retries", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    server.getAuthToken.mockReset();
    convex.fetchMutation.mockReset();
    convex.fetchQuery.mockReset();
    llm.addPluginCalls.splice(0);
    llm.generateCalls.splice(0);
    llm.models.splice(0);
    llm.sequence.splice(0);
    llm.igniteModel.mockReset();
    sentry.captureException.mockReset();

    server.getAuthToken.mockResolvedValue("token");
    convex.fetchQuery.mockImplementation(async (_query, args) => {
      if (args && typeof args === "object" && "id" in args) {
        return {
          ok: true,
          value: {
            name: "Chinese",
            fieldDefinitions: [{ name: "Front" }, { name: "Back" }],
          },
        };
      }

      return { ok: true, value: { provider: "groq", apiKey: "key" } };
    });
    convex.fetchMutation.mockResolvedValue({
      ok: true,
      value: { note: GENERATED_NOTE },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("registers the current-card note tool on the normal tool path", async () => {
    mockGenerateSequence([[{ type: "content", text: "Here is an explanation." }]]);
    const { POST } = await loadRoute();

    const response = await POST(makeChatRequest(chatBody()));
    await readSse(response);

    expect(llm.models[0]?.addPlugin).toHaveBeenCalledOnce();
    const plugin = llm.addPluginCalls[0] as {
      getTools: () => Promise<Array<{ name: string }>>;
      handlesTool: (name: string) => boolean;
    };

    const tools = await plugin.getTools();
    expect(tools.map((tool) => tool.name)).toContain("add_note_to_current_card");
    expect(plugin.handlesTool("add_note_to_current_card")).toBe(true);
  });

  it("maps AI config domain failures to public HTTP responses", async () => {
    convex.fetchQuery.mockResolvedValueOnce({
      ok: false,
      error: {
        _tag: "Forbidden",
        message: "Internal authorization details.",
      },
    });
    const { POST } = await loadRoute();

    const response = await POST(makeChatRequest(chatBody()));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "You do not have access to chat configuration.",
    });
  });

  it("keeps missing AI config as a setup error", async () => {
    convex.fetchQuery.mockResolvedValueOnce({ ok: true, value: null });
    const { POST } = await loadRoute();

    const response = await POST(makeChatRequest(chatBody()));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "No API key configured. Add one in Settings.",
    });
  });

  it("saves a note through fallback when tool validation fails for a note request", async () => {
    mockGenerateSequence([
      new Error(VALIDATION_ERROR),
      [{ type: "content", text: `Note: ${GENERATED_NOTE}` }],
    ]);
    const { POST } = await loadRoute();

    const response = await POST(
      makeChatRequest(chatBody({ message: "can you add a note for this? keep it simple" })),
    );
    const events = await readSse(response);

    expect(llm.models[0]?.addPlugin).toHaveBeenCalledOnce();
    expect(llm.generateCalls[0]?.options).toBeUndefined();
    expect(llm.generateCalls[0]?.thread[0]?.content).toContain("add_note_to_current_card");
    expect(llm.generateCalls[1]?.options).toEqual({ tools: false, maxTokens: 200 });
    expectMutationSavedNote();
    expect(events).toContainEqual({ type: "text", content: `Added note: ${GENERATED_NOTE}` });
    expect(events.at(-1)).toEqual({ type: "done" });
  });

  it("retries non-note requests without tools after tool validation failure", async () => {
    mockGenerateSequence([
      new Error(VALIDATION_ERROR),
      [{ type: "content", text: "It means very happy." }],
    ]);
    const { POST } = await loadRoute();

    const response = await POST(makeChatRequest(chatBody({ message: "what does this sentence mean?" })));
    await readSse(response);

    expect(llm.models[0]?.addPlugin).toHaveBeenCalledOnce();
    expect(llm.generateCalls[1]?.options).toEqual({ tools: false });
    expect(convex.fetchMutation).not.toHaveBeenCalled();

    const retrySystemPrompt = llm.generateCalls[1]?.thread[0]?.content ?? "";
    expect(retrySystemPrompt).not.toContain("add_note_to_current_card");
    expect(retrySystemPrompt).not.toContain("list_sets");
    expect(retrySystemPrompt).not.toContain("get_weak_cards");
    expect(retrySystemPrompt).not.toMatch(/use tools/i);
    expect(retrySystemPrompt).not.toMatch(/You can look up the user's flashcard sets/i);
  });

  it("still saves note requests when the provider/model is cached as no-tools", async () => {
    mockGenerateSequence([
      new Error(UNSUPPORTED_TOOLS_ERROR),
      [{ type: "content", text: "It means very happy." }],
      [{ type: "content", text: `Note: ${GENERATED_NOTE}` }],
    ]);
    const { POST } = await loadRoute();

    const firstResponse = await POST(makeChatRequest(chatBody({ message: "what does this sentence mean?" })));
    await readSse(firstResponse);
    const pluginCallCountAfterFirstRequest = llm.addPluginCalls.length;
    const generateCallCountAfterFirstRequest = llm.generateCalls.length;

    const secondResponse = await POST(
      makeChatRequest(chatBody({ message: "can you add a note for this? keep it simple" })),
    );
    const events = await readSse(secondResponse);

    expect(pluginCallCountAfterFirstRequest).toBe(1);
    expect(llm.addPluginCalls).toHaveLength(pluginCallCountAfterFirstRequest);
    expect(llm.generateCalls).toHaveLength(generateCallCountAfterFirstRequest + 1);
    expect(llm.generateCalls.at(-1)?.options).toEqual({ tools: false, maxTokens: 200 });
    expectMutationSavedNote();
    expect(events).toContainEqual({ type: "text", content: `Added note: ${GENERATED_NOTE}` });
  });

  it("returns the existing-note domain message without saving", async () => {
    mockGenerateSequence([
      new Error(VALIDATION_ERROR),
      [{ type: "content", text: "This should not be used." }],
    ]);
    const { POST } = await loadRoute();

    const response = await POST(
      makeChatRequest(
        chatBody({
          message: "can you add a note for this? keep it simple",
          context: {
            setId: SET_ID,
            cardId: CARD_ID,
            hasNote: true,
            cardFields: {
              Front: "hen gaoxing",
              Back: "very happy",
            },
          },
        }),
      ),
    );
    const events = await readSse(response);

    expect(convex.fetchMutation).not.toHaveBeenCalled();
    expect(events).toContainEqual({ type: "text", content: "This card already has a note." });
  });
});
