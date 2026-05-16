# Tool Calling UI Streaming — Research

> Investigation into showing real-time tool status (e.g. "Looking up your flashcard sets...") in the Study Assistant while AI tools execute.

## Current State

- `AssistantPanelInner.tsx` shows a generic "Thinking..." spinner during AI responses
- `convex/ai.ts` uses `llm.complete(thread)` which blocks until all tool calls finish and returns only the final text
- `StudyAssistantPlugin` defines two tools: `list_sets` and `get_weak_cards`
- Tool execution (up to 3 rounds) happens entirely server-side with zero client visibility
- `ChatResult = { ok: false; error: string } | { ok: true; content: string }` — no tool metadata

## multi-llm-ts Streaming Support

The library fully supports streaming via `llm.generate(thread)`:

- Returns `AsyncIterable<LlmChunk>` — yields events as they happen
- `LlmChunkTool` events include `{ name: string, state: ToolExecutionState }` where state is `'preparing' | 'running' | 'completed' | 'canceled' | 'error'`
- Tool execution is automatic during iteration (same as `complete()`)
- Plugins can implement `executeWithUpdates()` (async generator yielding `PluginExecutionStatusUpdate`) for custom status messages during tool execution
- `LlmModel` (returned by `igniteModel()`) exposes both `complete()` and `generate()` with the same signature

## Architecture Options

### Option A: Next.js Route Handler + SSE

A Next.js route handler streams SSE events to the frontend.

**How it works:**
1. `POST /api/chat` authenticates via Clerk
2. Pre-fetches all tool data from Convex using `fetchQuery` from `"convex/nextjs"` (already used in 7+ server components via `preloadQuery`)
3. Runs `llm.generate()` with a pre-loaded plugin (tool data cached at request start — no Convex calls mid-stream)
4. Streams SSE events: tool status + text content + done signal
5. Frontend consumes via `ReadableStream` reader

**Requires:**
- 2-3 public query wrappers in `convex/tooling.ts` and `convex/userSettings.ts` (internal queries can't be called from `fetchQuery`)
- A pre-loaded plugin variant that uses cached data instead of `ctx.runQuery()`
- A `useChatStream` hook encapsulating SSE parsing, tool status, and error handling
- Route handler needs `export const runtime = "nodejs"` (multi-llm-ts isn't edge-compatible)

**Pros:** True streaming, no extra tables, clean architecture
**Cons:** New auth surface (public query wrappers), pre-fetches all tool data even if LLM doesn't use tools

### Option B: Convex Progress Table

Keep everything in Convex. Write tool state to a table during the action, frontend subscribes via `useQuery()`.

**How it works:**
1. Add `chatProgress` table (requestId, toolName, status)
2. Action uses `llm.generate()` — on `LlmChunkTool` events, writes to table via `ctx.runMutation()`
3. Frontend subscribes to progress via `useQuery()`
4. Clean up rows after action completes

**Pros:** No new auth paths, minimal plugin changes
**Cons:** Persistent storage for ephemeral UI state, extra round-trips (action → mutation → subscription), cleanup logic

## Open Questions

1. **Error typing for the streaming hook**: The hook's error should be richer than `string`. Options: typed union (`http | network | stream`), or a library like Vercel AI SDK that handles this. What granularity do we actually need?

2. **Library vs custom hook**: Should we use the Vercel AI SDK (`ai` package) which has a purpose-built `useChat()` hook with streaming, tool calls, and error handling? It would require bridging `multi-llm-ts` chunks to `ai`'s protocol. Or is a custom ~60-line hook sufficient for one chat component?

3. **Pre-fetching tradeoff (Option A)**: Always fetching all tool data upfront is wasteful when the LLM doesn't use tools. Is this acceptable given the data is small (user's sets + weak cards)?

4. **Streaming text too?**: Beyond tool status, should we also stream the AI response text incrementally (typewriter effect)? Both options support this — it's a frontend rendering question.

5. **Backwards compatibility**: Should we keep the Convex action (`sendChatMessage`) as a fallback, or fully replace it with the route handler?
