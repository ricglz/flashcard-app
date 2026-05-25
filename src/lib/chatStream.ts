import * as Schema from "effect/Schema";
import type { ChatContext, ChatMessage } from "./chatSchemas";

export type { ChatContext, ChatMessage } from "./chatSchemas";

const ToolState = Schema.Literal("preparing", "running", "completed", "canceled", "error");

const SseEventSchema = Schema.Union(
  Schema.Struct({ type: Schema.Literal("text"), content: Schema.String }),
  Schema.Struct({ type: Schema.Literal("tool"), name: Schema.String, state: ToolState }),
  Schema.Struct({ type: Schema.Literal("done") }),
  Schema.Struct({ type: Schema.Literal("error"), message: Schema.String }),
);

const SseEventJsonSchema = Schema.parseJson(SseEventSchema);

export type SseEvent = typeof SseEventSchema.Type;

export type ToolStatus = {
  name: string;
  state: typeof ToolState.Type;
};

export type ChatStreamState = {
  text: string;
  toolStatus: ToolStatus | null;
};

export async function* streamChat(
  message: string,
  history: ChatMessage[],
  context: ChatContext,
  model: string,
  signal: AbortSignal,
): AsyncGenerator<SseEvent> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history, context, ...(model ? { model } : {}) }),
    signal,
  });

  if (!res.ok) {
    const body: unknown = await res.json().catch(() => null);
    const error = body !== null && typeof body === "object" && "error" in body ? body.error : undefined;
    yield { type: "error", message: typeof error === "string" ? error : `HTTP ${res.status}` };
    return;
  }

  if (!res.body) {
    yield { type: "error", message: "Empty response body" };
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let chunk = await reader.read();

  while (!chunk.done) {
    buffer += decoder.decode(chunk.value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const decoded = Schema.decodeUnknownEither(SseEventJsonSchema)(line.slice(6));
      if (decoded._tag === "Right") {
        yield decoded.right;
      }
    }
    chunk = await reader.read();
  }
}

export function reduceEvent(state: ChatStreamState, event: SseEvent): ChatStreamState {
  switch (event.type) {
    case "text":
      return { ...state, text: state.text + event.content };
    case "tool":
      return {
        ...state,
        toolStatus:
          event.state === "completed" ? null : { name: event.name, state: event.state },
      };
    case "done":
      return { ...state, toolStatus: null };
    case "error":
      return { text: `Error: ${event.message}`, toolStatus: null };
    default:
      return state;
  }
}
