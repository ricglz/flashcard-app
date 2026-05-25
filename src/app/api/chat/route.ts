import { fetchQuery } from "convex/nextjs";
import type { FunctionReturnType } from "convex/server";
import * as Sentry from "@sentry/nextjs";
import { igniteModel, Message } from "multi-llm-ts";
import { api } from "../../../../convex/_generated/api";
import { getAuthToken } from "@/lib/server";
import {
  ServerStudyAssistantPlugin,
  type StudyAssistantCurrentCardContext,
} from "@/lib/serverStudyAssistantPlugin";
import { DEFAULT_MODELS } from "@/lib/aiDefaults";
import { stripHallucinatedFnCalls } from "@/lib/stripHallucinatedFnCalls";
import { parseId } from "@/lib/convexHelpers";
import { isConvexArgumentValidationError } from "@/lib/convexErrors";
import {
  isRetryableToolCallValidationError,
  isToolUnsupportedError,
  sanitizeChatGenerationError,
} from "@/lib/chatGenerationErrors";
import { ChatRequestSchema } from "@/lib/chatSchemas";
import * as Schema from "effect/Schema";
import * as Either from "effect/Either";
import * as ParseResult from "effect/ParseResult";
import * as Effect from "effect/Effect";

const BASIC_EXPLANATION_TOOL_GUIDANCE =
  "Do not use tools for basic explanation questions. If the user asks about the visible card, sentence meaning, translation, pinyin, pronunciation, grammar, or examples, answer directly from the current card context and conversation. Use tools only when the user asks about their stored flashcard data, such as sets, weak cards, SRS history, progress, or study statistics.";

const DEFAULT_STUDY_ASSISTANT_PROMPT = `${BASIC_EXPLANATION_TOOL_GUIDANCE}

You are a study assistant for a flashcard app. Help the user understand their study material. You can look up the user's flashcard sets and identify their weak cards when relevant. Be concise and helpful. When you want to use a tool, invoke it through the tool-calling mechanism provided by the API. Never write function-call syntax like <function=name></function> in your responses.`;

const NO_TOOLS_RETRY_PROMPT_NOTE =
  "Answer from the current conversation and visible card context only. Flashcard-data tools are unavailable for this response.";

function sseEvent(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

const noToolsCache = new Map<string, boolean>();

function getCacheKey(provider: string, modelName: string): string {
  return `${provider}:${modelName}`;
}

function normalizeGenerationError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

async function generateWithPlugins(
  provider: string,
  modelName: string,
  apiKey: string,
  thread: Message[],
  token: string,
  currentCardContext: StudyAssistantCurrentCardContext | undefined,
  request: Request,
  controller: ReadableStreamDefaultController
): Promise<void> {
  const llm = igniteModel(provider, modelName, { apiKey });
  llm.addPlugin(new ServerStudyAssistantPlugin(token, currentCardContext));
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

  const customChatPrompt = aiConfig.customChatPrompt?.trim();
  let systemPrompt = customChatPrompt
    ? `${BASIC_EXPLANATION_TOOL_GUIDANCE}\n\n${customChatPrompt}`
    : DEFAULT_STUDY_ASSISTANT_PROMPT;

  let currentSetId: StudyAssistantCurrentCardContext["setId"] | undefined;
  let currentCardContext: StudyAssistantCurrentCardContext | undefined;

  if (body.context?.setId) {
    const setId = parseId<"flashcardSets">(body.context.setId);
    if (!setId) {
      return Response.json({ error: "Invalid set context." }, { status: 400 });
    }
    currentSetId = setId;
    let set: FunctionReturnType<typeof api.flashcardSets.get>;
    try {
      set = await fetchQuery(
        api.flashcardSets.get,
        { id: setId },
        { token },
      );
    } catch (error) {
      if (!isConvexArgumentValidationError(error)) throw error;
      return Response.json({ error: "Invalid set context." }, { status: 400 });
    }
    if (set.ok) {
      const fieldNames = set.value.fieldDefinitions
        .map((f: { name: string }) => f.name)
        .join(", ");
      systemPrompt += `\n\nThe user is studying the set "${set.value.name}" with fields: ${fieldNames}.`;
    }
  }

  if (body.context?.cardId) {
    const cardId = parseId<"flashcards">(body.context.cardId);
    if (!cardId || !currentSetId) {
      return Response.json({ error: "Invalid card context." }, { status: 400 });
    }
    currentCardContext = {
      setId: currentSetId,
      cardId,
      hasNote: body.context.hasNote ?? false,
    };
    systemPrompt += currentCardContext.hasNote
      ? "\n\nThe current card already has a note. Do not use the note-adding tool for it."
      : "\n\nThe current card does not have a note. If the user asks you to save a note for this card, use the add_note_to_current_card tool with a concise review-oriented note. The tool writes only to the current card.";
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
            catch: normalizeGenerationError,
          })
        : Effect.tryPromise({
            try: () => generateWithPlugins(
              aiConfig.provider, modelName, aiConfig.apiKey, thread, token, currentCardContext, request, controller
            ),
            catch: normalizeGenerationError,
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
                catch: normalizeGenerationError,
              });
            }),
            Effect.catchIf(isRetryableToolCallValidationError, (error) => {
              console.warn(`[chat] Tool-call validation failed for ${modelName}, retrying without plugins`, error);
              Sentry.captureException(error, {
                tags: {
                  route: "api.chat",
                  provider: aiConfig.provider,
                  retry: "without_tools",
                  reason: "tool_call_validation",
                },
                extra: {
                  modelName,
                },
              });

              const noToolsPrompt = `${systemPrompt}\n\n${NO_TOOLS_RETRY_PROMPT_NOTE}`;
              const newThread = [
                new Message("system", noToolsPrompt),
                ...body.history.map((m) => new Message(m.role, m.content)),
                new Message("user", body.message),
              ];

              return Effect.tryPromise({
                try: () => generateWithoutPlugins(
                  aiConfig.provider, modelName, aiConfig.apiKey, newThread, request, controller
                ),
                catch: normalizeGenerationError,
              });
            })
          );

      const result = await Effect.runPromise(Effect.either(program));

      if (Either.isRight(result)) {
        controller.enqueue(sseEvent({ type: "done" }));
      } else {
        Sentry.captureException(result.left, {
          tags: {
            route: "api.chat",
            provider: aiConfig.provider,
          },
          extra: {
            modelName,
          },
        });
        console.error(`[chat] Generation failed:`, result.left);
        controller.enqueue(
          sseEvent({
            type: "error",
            message: sanitizeChatGenerationError(result.left),
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
