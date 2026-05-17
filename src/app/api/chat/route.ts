import { fetchQuery } from "convex/nextjs";
import { igniteModel, Message } from "multi-llm-ts";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { getAuthToken } from "@/lib/server";
import { ServerStudyAssistantPlugin } from "@/lib/serverStudyAssistantPlugin";

const DEFAULT_MODELS: Record<string, string> = {
  openai: "gpt-4o",
  anthropic: "claude-sonnet-4-20250514",
  google: "gemini-2.0-flash",
  mistral: "mistral-large-latest",
  groq: "llama-3.3-70b-versatile",
  deepseek: "deepseek-chat",
  xai: "grok-3",
  ollama: "llama3",
};

type ChatRequest = {
  message: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  model?: string;
  context?: {
    setId?: Id<"flashcardSets">;
    cardFields?: Record<string, string>;
  };
};

function sseEvent(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: Request) {
  const token = await getAuthToken();
  if (!token) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await request.json()) as ChatRequest;

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

  let systemPrompt =
    aiConfig.customChatPrompt ??
    "You are a study assistant for a flashcard app. Help the user understand their study material. You can look up the user's flashcard sets and identify their weak cards when relevant. Be concise and helpful.";

  if (body.context?.setId) {
    const setList = await fetchQuery(
      api.tooling.listSetsPublic,
      { include: { fieldDefinitions: true } },
      { token },
    );
    const matchedSet = setList.sets.find((s) => s.setId === body.context?.setId);
    if (matchedSet) {
      const fieldNames = matchedSet.fieldDefinitions
        ?.map((f) => f.name)
        .join(", ");
      systemPrompt += `\n\nThe user is studying the set "${matchedSet.name}" with fields: ${fieldNames}.`;
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
  const llm = igniteModel(aiConfig.provider, modelName, {
    apiKey: aiConfig.apiKey,
  });
  llm.addPlugin(new ServerStudyAssistantPlugin(token));

  const thread = [
    new Message("system", systemPrompt),
    ...body.history.map((m) => new Message(m.role, m.content)),
    new Message("user", body.message),
  ];

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of llm.generate(thread)) {
          if (request.signal.aborted) break;
          if (chunk.type === "content") {
            controller.enqueue(sseEvent({ type: "text", content: chunk.text }));
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
        controller.enqueue(sseEvent({ type: "done" }));
      } catch (err) {
        controller.enqueue(
          sseEvent({
            type: "error",
            message: err instanceof Error ? err.message : "Stream failed",
          }),
        );
      } finally {
        controller.close();
      }
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
