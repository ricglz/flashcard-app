import { fetchQuery } from "convex/nextjs";
import { igniteModel, Message } from "multi-llm-ts";
import { api } from "../../../../convex/_generated/api";
import { getAuthToken } from "@/lib/server";
import { ServerStudyAssistantPlugin } from "@/lib/serverStudyAssistantPlugin";
import { DEFAULT_MODELS } from "@/lib/aiDefaults";
import { stripHallucinatedFnCalls } from "@/lib/stripHallucinatedFnCalls";
import { asId } from "@/lib/convexHelpers";
import * as Schema from "effect/Schema";
import * as Either from "effect/Either";
import * as ParseResult from "effect/ParseResult";
import * as Effect from "effect/Effect";

const ChatRequestSchema = Schema.Struct({
  message: Schema.String,
  history: Schema.Array(Schema.Struct({
    role: Schema.Literal("user", "assistant"),
    content: Schema.String,
  })),
  model: Schema.optional(Schema.String),
  context: Schema.optional(Schema.Struct({
    setId: Schema.optional(Schema.String),
    cardFields: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.String })),
  })),
});

function sseEvent(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

// Cache for models known to not support tools
const noToolsCache = new Map<string, boolean>();

function getCacheKey(provider: string, modelName: string): string {
  return `${provider}:${modelName}`;
}

function isToolUnsupportedError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return msg.includes("tool calling") && msg.includes("not supported");
}

async function generateWithPlugins(
  provider: string,
  modelName: string,
  apiKey: string,
  thread: Message[],
  token: string,
  request: Request,
  controller: ReadableStreamDefaultController
): Promise<void> {
  const llm = igniteModel(provider, modelName, { apiKey });
  llm.addPlugin(new ServerStudyAssistantPlugin(token));
  const stream = llm.generate(thread);
  
  for await (const chunk of stream) {
    if (request.signal.aborted) break;
    if (chunk.type === "content") {
      const cleaned = stripHallucinatedFnCalls(chunk.text, (match) => {
        console.warn("[chat] stripped hallucinated function-call syntax from text chunk:", match);
      });
      if (cleaned) {
        controller.enqueue(sseEvent({ type: "text", content: cleaned }));
      }
    } else if (chunk.type === "tool") {
      controller.enqueue(
        sseEvent({
          type: "tool",
          name: chunk.name,
          state: chunk.state,
        }),
      );
    }
  }
}

async function generateWithoutPlugins(
  provider: string,
  modelName: string,
  apiKey: string,
  thread: Message[],
  request: Request,
  controller: ReadableStreamDefaultController
): Promise<void> {
  const llm = igniteModel(provider, modelName, { apiKey });
  const stream = llm.generate(thread);
  
  for await (const chunk of stream) {
    if (request.signal.aborted) break;
    if (chunk.type === "content") {
      const cleaned = stripHallucinatedFnCalls(chunk.text, (match) => {
        console.warn("[chat] stripped hallucinated function-call syntax from text chunk:", match);
      });
      if (cleaned) {
        controller.enqueue(sseEvent({ type: "text", content: cleaned }));
      }
    } else if (chunk.type === "tool") {
      controller.enqueue(
        sseEvent({
          type: "tool",
          name: chunk.name,
          state: chunk.state,
        }),
      );
    }
  }
}

export async function POST(request: Request) {
  const token = await getAuthToken();
  if (!token) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const raw: unknown = await request.json();
  const decoded = Schema.decodeUnknownEither(ChatRequestSchema)(raw);
  if (Either.isLeft(decoded)) {
    const issues = ParseResult.ArrayFormatter.formatErrorSync(decoded.left);
    const message = issues.map((i: ParseResult.ArrayFormatterIssue) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return Response.json({ error: `Invalid request: ${message}` }, { status: 400 });
  }
  const body = decoded.right;

  const aiConfig = await fetchQuery(
    api.userSettings.getAiConfigForServer,
    {},
    { token },
  );
  if (!aiConfig) {
    return Response.json(
      { error: "No API key configured. Add one in Settings." },
      { status: 400 },
    );
  }
  if (request.signal.aborted) return new Response(null, { status: 499 });

  let systemPrompt =
    aiConfig.customChatPrompt ??
    "You are a study assistant for a flashcard app. Help the user understand their study material. You can look up the user's flashcard sets and identify their weak cards when relevant. Be concise and helpful. When you want to use a tool, invoke it through the tool-calling mechanism provided by the API. Never write function-call syntax like <function=name></function> in your responses.";

  if (body.context?.setId) {
    const set = await fetchQuery(
      api.flashcardSets.get,
      { id: asId<"flashcardSets">(body.context.setId) },
      { token },
    );
    if (set) {
      const fieldNames = set.fieldDefinitions
        .map((f: { name: string }) => f.name)
        .join(", ");
      systemPrompt += `\n\nThe user is studying the set "${set.name}" with fields: ${fieldNames}.`;
    }
  }

  if (body.context?.cardFields) {
    const entries = Object.entries(body.context.cardFields)
      .map(([field, value]) => `- ${field}: ${value}`)
      .join("\n");
    systemPrompt += `\n\nThey are currently looking at this card:\n${entries}`;
  }

  const modelName =
    body.model ?? DEFAULT_MODELS[aiConfig.provider] ?? "gpt-4o";

  const thread = [
    new Message("system", systemPrompt),
    ...body.history.map((m) => new Message(m.role, m.content)),
    new Message("user", body.message),
  ];

  const cacheKey = getCacheKey(aiConfig.provider, modelName);
  const cachedNoTools = noToolsCache.get(cacheKey);

  const stream = new ReadableStream({
    async start(controller) {
      const program = cachedNoTools
        ? Effect.tryPromise({
            try: () => generateWithoutPlugins(
              aiConfig.provider, modelName, aiConfig.apiKey, thread, request, controller
            ),
            catch: (e) => e as Error,
          })
        : Effect.tryPromise({
            try: () => generateWithPlugins(
              aiConfig.provider, modelName, aiConfig.apiKey, thread, token, request, controller
            ),
            catch: (e) => e as Error,
          }).pipe(
            Effect.catchIf(isToolUnsupportedError, () => {
              console.warn(`[chat] Model ${modelName} doesn't support tools, retrying without plugins`);
              noToolsCache.set(cacheKey, true);
              
              const noToolsPrompt = systemPrompt + 
                "\n\nNote: You do not have access to the user's flashcard data with the current model. Provide general study advice based on the conversation.";
              const newThread = [
                new Message("system", noToolsPrompt),
                ...body.history.map((m) => new Message(m.role, m.content)),
                new Message("user", body.message),
              ];
              
              return Effect.tryPromise({
                try: () => generateWithoutPlugins(
                  aiConfig.provider, modelName, aiConfig.apiKey, newThread, request, controller
                ),
                catch: (e) => e as Error,
              });
            })
          );

      const result = await Effect.runPromise(Effect.either(program));

      if (Either.isRight(result)) {
        controller.enqueue(sseEvent({ type: "done" }));
      } else {
        console.error(`[chat] Generation failed:`, result.left);
        controller.enqueue(
          sseEvent({
            type: "error",
            message: result.left.message,
          }),
        );
      }
      
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
