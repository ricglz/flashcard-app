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
- [ ] Extract shared TTS interaction state if TTS button/status behavior keeps expanding across `TtsButton`, `TappableCjkChar`, and `StudyCard`.

## Code Quality — React Component Structure

### Form / Draft State Helpers
- [ ] Extract reusable local draft helpers for editable settings forms if more settings sections need nullable draft-over-server-state behavior.
- [ ] Consolidate field definition add/remove/update helpers across manual set creation and field definition editing.

### Async Action State
- [ ] Evaluate `@convex-dev/react-query` / TanStack Query for components that still hand-roll `isSaving`/`error`/success state around Convex mutations.
  - Compare against a small local async-action hook before adopting another provider and dependency.
  - Keep standard Convex React hooks where offline/preloaded-query behavior or adapter beta gaps matter.

## Code Quality — Convex Performance

### SRS Queue Population
- [ ] Move toward incremental SRS enrollment so queue population does not need to repeatedly scan full flashcard sets and existing SRS cards.
- [ ] Revisit queue selection indexes if production signals show due/new card selection becoming hot.

### Large Set Study Paths
- [ ] Rework study session setup for large sets if full-card loading or stored `cardOrder` arrays become a practical limit.
- [ ] Consider count or summary tables only if production signals show queue/progress counts becoming hot.

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

### Study Assistant Tool Expansion
- [ ] Expand tool set beyond `list_sets` and `get_weak_cards` if usage shows demand (e.g., study stats, mastery levels, annotations)

## Code Quality — Error Handling

### Query Result Contracts
- [ ] Continue replacing ambiguous access-control `null` query returns with domain results where clients need to distinguish unauthenticated, forbidden, not found, and invalid input states.
  - Include a broad Convex nullable-to-domain-result migration once the route/client contracts are ready to change together.
  - `studySessions.get` and `studySessions.getResults`: split unauthenticated, invalid/missing session, and wrong-user access while preserving current redirects at route boundaries.
  - `userSets.get`: return a typed failure for unauthenticated/missing membership if callers need to show access or library state explicitly.
  - Auth-gated dashboard/query surfaces such as `srsReviewQueue.getQueueStats`, `weakAnalysis.getMyWeakCards`, and progress queries should either return a domain result or be documented as intentionally empty/hidden when signed out.
  - Keep valid optional-state queries nullable where `null` is the useful domain value, such as “no active study session” or “no fork sync status”.

### Effect Boundary Cleanup
- [ ] Define an Effect usage policy: use Effect for domain validation and external/HTTP/AI boundaries; avoid Services/Layers until dependency composition becomes real.
- [ ] Audit async boundaries and use `Effect.tryPromise` where rejected promises should become typed failures; keep unexpected Convex DB/runtime failures as defects unless there is a concrete recovery path.
- [ ] Consider `Data.TaggedError` for new Effect-heavy modules, but do not migrate existing plain `{ _tag, message }` failures without a clear reason.

## Code Quality — Card Navigation

### Shared `useCardNavigation` hook
- [ ] Unify card position tracking across study session, browse, and SRS review into a shared hook
  - Study session: `session.currentIndex` + `localIndexOffset` (optimistic) with render-time sync
  - Browse: `currentIndex` state + `cardOrder` + `dismissed` set
  - SRS: `reviewedIds` set, filters queue, takes first visible
  - All three solve "which card am I on" with optimistic local state — divergent patterns
- [ ] Initialize from server state (e.g. `session.currentIndex` for resumed sessions) via `useState` initializer rather than render-time `setLocalIndexOffset(0)`
- [ ] Use a ref to track last-seen server index, reconcile only on unexpected jumps (multi-device edge case)

## Code Quality — UI Consistency

### Status Color Guardrails
- [ ] Add a targeted lint rule or script for raw generic status color classes if they keep regressing after shared UI primitives exist. Keep chart, rating, and CJK colors exempt because those colors encode data.

## E2E Testing

### Infrastructure
- [ ] Dedicated Clerk + Convex test instances so e2e tests don't write to the dev database
- [ ] Playwright CI integration (GitHub Actions)

### SRS Queue Flows
- [ ] SRS enrollment (add set to library → enable SRS → verify srsCards created)
- [ ] New card introduction (verify daily limit, round-robin across sets)
- [ ] Queue carry-over (unfinished cards persist to next day)

### Sharing & Marketplace Flows
- [ ] Share a set via link → open link as another user → view shared set
- [ ] Fork a shared set → verify independent copy with editable cards
- [ ] Browse public marketplace → search → preview → fork
- [ ] Visibility toggle (private ↔ public) and verify marketplace listing
- [ ] Access-control route coverage:
  - multi-user private set denial
  - public/unlisted visitor access
  - mismatched `setId`/`sessionId` study route redirects
  - denial pages/routes do not expose card contents

### Offline → Online Flows
- [ ] Auth recovery after reconnect
- [ ] SRS offline review + sync on reconnect
- [ ] Outbox drain and idempotency
- [ ] Slow/blocked Convex mutation regression coverage for SRS and Focus Study rating clicks once auth + data seeding are reliable
- [ ] TTS voice recovery after reconnect

## Polish & Remaining Features

### Content Enhancements
- [ ] Multi-modal cards (images, audio clips as field values via Convex file storage)
- [ ] Cross-field word alignment (token mapping across fields, e.g., 你 ↔ nǐ ↔ you)
- [ ] Related card sets (user-curated or AI-suggested links between sets)
- [ ] Multi-language UX enhancements (tone color coding, language-specific rendering)

### Observability
- [ ] Configure Convex official exception reporting with Sentry via https://docs.convex.dev/production/integrations/exception-reporting
  - Convex built-in exception reporting is Pro-only.
  - Convex automatically uses `tokenIdentifier` as the Sentry user id.

### Platform
- [ ] Pronunciation validation (speech-to-text comparison against expected pinyin)
- [ ] Optional high-quality TTS (user-provided API key for Google Cloud / OpenAI TTS)
- [ ] Expo React Native app
- [ ] Push notifications for study reminders
