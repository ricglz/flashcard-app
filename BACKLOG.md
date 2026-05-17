# Flashcard App — Backlog & Ideas

> This is a planning document and backlog of ideas.
> Remove items once they're completed — git history is the authoritative record.
> This file is only for unstarted or in-progress work.
> For current status, see git history and README.md.
> 
> Product decisions: `docs/product-decisions.md`

## Code Quality — Typed Domain Validation Candidates

### SRS Queue / Scheduling
- [ ] Validate review actions before scheduling:
  - SRS card belongs to user,
  - queue item exists or action is an idempotent replay,
  - rating is supported.
  - **PARTIAL**: Basic validation exists, but could be enhanced with more specific failure types.

### TTS / External Integration Boundary
- [ ] Consider richer orchestration helpers only if retry/timeout/fallback flows become more complex than current promise helpers.

## Marketplace & Multi-User

### Marketplace / Browse
- [ ] Sort options (most forked, most users)
- [ ] User public profile page — deferred until proper username management exists (no PII in DB)

## AI Capabilities

### Multi-Provider Key Management
- [ ] Support multiple API keys per user (e.g., OpenAI for generation, Anthropic for assistant) — currently limited to one provider at a time
- [ ] Per-feature provider selection (which key to use for generation vs. chat)

### AI Weak Spot Analysis
- [ ] Build optional MCP wrapper around the same tooling API if CLI workflow proves useful.

### Study Assistant Streaming & Tool Calling
- [ ] Migrate chat from Convex action to Next.js Route Handler + SSE streaming — see [research doc](docs/research/tool-calling-streaming.md)
  - Install TanStack Query, set up `QueryClientProvider`
  - Create public query wrappers for `getAiConfig`, `listSetsForTool`, `getWeakCardsForTool`
  - Build `POST /api/chat` route handler with Clerk auth + SSE streaming
  - Adapt `StudyAssistantPlugin` for `fetchQuery` (instead of `ctx.runQuery`)
  - Implement `streamedQuery` + reducer for mixed tool/text events
  - Rewrite `AssistantPanelInner` to use streaming
  - Remove `sendChatMessage` Convex action
  - Tool status UI ("Looking up your sets..." with spinner)
  - Typewriter text rendering
- [ ] Expand tool set beyond `list_sets` and `get_weak_cards` if usage shows demand (e.g., study stats, mastery levels, annotations)

## Code Quality — Error Handling

### Effect-Based Error Patterns
- [ ] Audit try/catch patterns across the codebase and discuss migrating to Effect-based error handling for more typed, composable error flows (especially in AI actions and frontend async code).

## Code Quality — Card Navigation

### Shared `useCardNavigation` hook
- [ ] Unify card position tracking across study session, browse, and SRS review into a shared hook
  - Study session: `session.currentIndex` + `localIndexOffset` (optimistic) with render-time sync
  - Browse: `currentIndex` state + `cardOrder` + `dismissed` set
  - SRS: `reviewedIds` set, filters queue, takes first visible
  - All three solve "which card am I on" with optimistic local state — divergent patterns
- [ ] Initialize from server state (e.g. `session.currentIndex` for resumed sessions) via `useState` initializer rather than render-time `setLocalIndexOffset(0)`
- [ ] Use a ref to track last-seen server index, reconcile only on unexpected jumps (multi-device edge case)
## E2E Testing

### Infrastructure
- [ ] Dedicated Clerk + Convex test instances so e2e tests don't write to the dev database
- [ ] Playwright setup and CI integration
- [ ] Use `clerk.signIn()` from `@clerk/testing/playwright` instead of manual modal UI — creates proper server-side sessions that work with server component auth guards (`getAuthToken()` / `auth()`)
- [ ] Shared Playwright fixture (`e2e/fixtures.ts`) that calls `setupClerkTestingToken({ page })` per-test — `storageState` alone doesn't persist the route interception across browser contexts
- [ ] Persistent test user in Clerk dashboard + `E2E_CLERK_USER_EMAIL` env var (required by `clerk.signIn()`)
- [ ] Test data seeding utilities (create sets, cards, sessions programmatically)
- [ ] Convex test environment isolation (each test run gets clean state)

### Core User Flows
- [ ] Set creation wizard — CSV import path (upload → infer fields → configure metadata → create)
- [ ] Set creation wizard — manual entry path (name → add cards → configure fields → create)
- [ ] Set creation wizard — navigation (step validation, back/forward state preservation)
- [ ] Study session happy path (create set → add cards → study → rate cards → complete → view results)
- [ ] Session resume (start → navigate away → return → resume prompt)

### SRS Queue Flows
- [ ] SRS enrollment (add set to library → enable SRS → verify srsCards created)
- [ ] Daily queue review (open queue → review cards → rate → verify scheduling updates)
- [ ] New card introduction (verify daily limit, round-robin across sets)
- [ ] Queue carry-over (unfinished cards persist to next day)

### Sharing & Marketplace Flows
- [ ] Share a set via link → open link as another user → view shared set
- [ ] Fork a shared set → verify independent copy with editable cards
- [ ] Browse public marketplace → search → preview → fork
- [ ] Visibility toggle (private ↔ public) and verify marketplace listing

### Offline → Online Flows
- [ ] Auth recovery after reconnect
- [ ] SRS offline review + sync on reconnect
- [ ] Outbox drain and idempotency
- [ ] TTS voice recovery after reconnect
- [ ] See `docs/testing-strategy.md` for current offline testing gaps

## Polish & Remaining Features

### Content Enhancements
- [ ] Multi-modal cards (images, audio clips as field values via Convex file storage)
- [ ] Cross-field word alignment (token mapping across fields, e.g., 你 ↔ nǐ ↔ you)
- [ ] Related card sets (user-curated or AI-suggested links between sets)
- [ ] Multi-language UX enhancements (tone color coding, language-specific rendering)

### Observability
- [ ] Error tracking / reporting (client-side and Convex function errors)
- [ ] Operational telemetry (usage metrics across all users, function latency, error rates)

### Platform
- [ ] Pronunciation validation (speech-to-text comparison against expected pinyin)
- [ ] Optional high-quality TTS (user-provided API key for Google Cloud / OpenAI TTS)
- [ ] Expo React Native app
- [ ] Push notifications for study reminders
