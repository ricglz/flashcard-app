# Tool Calling UI Streaming — Research

> Investigation into showing real-time tool status (e.g. "Looking up your flashcard sets...") in the Study Assistant while AI tools execute, plus streaming text responses.

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

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Architecture | Next.js Route Handler + SSE | Clean streaming, no ephemeral tables |
| Stream scope | Both tool status + text | Full typewriter UX |
| Client library | TanStack Query `streamedQuery` | Declarative state management, reducer pattern for mixed events, caching per message |
| Experimental risk | Accepted | Ergonomics worth the risk of API changes |
| Fallback | Fully replace `sendChatMessage` | One code path, less maintenance |
| Auth | Clerk `getAuthToken()` + `fetchQuery` | Already used in 7+ server components |
| Tool data fetching | On demand (mid-stream) | Don't pre-fetch if LLM doesn't use tools |
| Chat history | Client state only | No persistence needed yet |
| Query key strategy | Per-message | Matches TanStack chat example, enables caching |

## Architecture: Next.js Route Handler + SSE + TanStack `streamedQuery`

### How it works

1. `POST /api/chat` — authenticates via Clerk `getAuthToken()`
2. Fetches user's AI config (provider, API key) from Convex via `fetchQuery`
3. Runs `llm.generate()` with `StudyAssistantPlugin` — plugin fetches tool data on demand via `fetchQuery`
4. Streams SSE events: tool status + text content + done signal
5. Client consumes via TanStack `streamedQuery` with a custom `reducer`

### SSE Event Format

```
data: {"type":"tool","name":"list_sets","state":"running"}

data: {"type":"tool","name":"list_sets","state":"completed"}

data: {"type":"text","content":"Here are"}

data: {"type":"text","content":" your flashcard"}

data: {"type":"done"}
```

### Client-side: `streamedQuery` with Reducer

```typescript
const chatQueryOptions = (message: string, history: ChatMessage[], context: StudyContext) =>
  queryOptions({
    queryKey: ['chat', message, history.length],
    queryFn: streamedQuery({
      streamFn: async function* () {
        const res = await fetch('/api/chat', {
          method: 'POST',
          body: JSON.stringify({ message, history, context }),
        });
        // parse SSE, yield typed events
      },
      reducer: (acc, chunk) => {
        if (chunk.type === 'text') return { ...acc, text: acc.text + chunk.content };
        if (chunk.type === 'tool') return { ...acc, toolStatus: { name: chunk.name, state: chunk.state } };
        if (chunk.type === 'done') return { ...acc, toolStatus: null };
        return acc;
      },
      initialValue: { text: '', toolStatus: null as ToolStatus | null },
    }),
    staleTime: Infinity,
  });
```

### Query Exposure Requirements

These internal queries need public wrappers for `fetchQuery` access from the route handler:

| Internal query | Purpose | New public wrapper |
|---|---|---|
| `internal.userSettings.getAiConfig` | Get provider + API key | `api.userSettings.getAiConfigForServer` |
| `internal.tooling.listSetsForTool` | List user's flashcard sets | `api.tooling.listSetsPublic` |
| `internal.tooling.getWeakCardsForTool` | Get weak cards for a user | `api.tooling.getWeakCardsPublic` |

All public wrappers must authenticate via the Clerk token (identity check) — they should not accept a raw `userId` parameter.

## Client-Side Fetch Approach Comparison

### 1. Native `fetch` + `ReadableStream`

| | |
|---|---|
| **Pros** | Zero dependencies, full control over parsing, works with any SSE format |
| **Cons** | Manual SSE parsing boilerplate, no built-in reconnection/retry, manual cleanup via `AbortController`, manual state management |
| **Tool events** | Excellent — full control over parsing pipeline |
| **Bundle** | 0 KB |

### 2. Vercel AI SDK `useChat`

| | |
|---|---|
| **Pros** | Battle-tested, handles SSE parsing + message state + cleanup, built-in retry |
| **Cons** | Assumes Vercel's own protocol format — custom `{type: "tool"}` events don't integrate natively. ~15-25 KB. Tight coupling to their server conventions while we use `multi-llm-ts` |
| **Tool events** | Poor — only understands its own protocol |
| **Bundle** | ~15-25 KB |

### 3. `EventSource` API

| | |
|---|---|
| **Pros** | Browser native, automatic reconnection, zero dependencies |
| **Cons** | GET only (can't send request body), no custom HTTP headers (auth). Effectively deprecated |
| **Tool events** | N/A — GET-only is a dealbreaker |
| **Bundle** | 0 KB |

### 4. TanStack Query `streamedQuery` (chosen)

| | |
|---|---|
| **Pros** | Declarative state via `useQuery` (`data`, `isFetching`, `error`), `reducer` pattern for accumulating mixed event types, per-message caching, automatic cleanup, integrates with existing React Query patterns |
| **Cons** | Still requires manual SSE parsing inside `streamFn`. Marked `experimental`. ~13 KB for `@tanstack/react-query` |
| **Tool events** | Good — `reducer` naturally handles heterogeneous event types |
| **Bundle** | ~13 KB |

**Why `streamedQuery` wins**: It solves the React state lifecycle (loading, error, streaming, done) declaratively while leaving SSE parsing flexible. The `reducer` is a natural fit for accumulating text + tool status. Per-message query keys give free caching. The experimental risk is acceptable for one component.

## Implementation Checklist

- [x] ~~Install `@tanstack/react-query` and set up `QueryClientProvider`~~ — not needed; event handler approach is simpler
- [x] Create public query wrappers for `getAiConfig`, `listSetsForTool`, `getWeakCardsForTool`
- [x] Create `POST /api/chat` route handler with Clerk auth + SSE streaming
- [x] Adapt `StudyAssistantPlugin` to work outside Convex actions (using `fetchQuery` instead of `ctx.runQuery`)
- [x] ~~Create `chatQueryOptions` with `streamedQuery` + reducer~~ — replaced with `streamChat` generator + `reduceEvent` helper
- [x] Rewrite `AssistantPanelInner` to use streaming `fetch` instead of `useAction`
- [x] Remove `sendChatMessage` action from `convex/ai.ts`
- [x] Add tool status UI (e.g., "Looking up your sets..." with spinner)
- [x] Add typewriter text rendering (blinking cursor during stream)
