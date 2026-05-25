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

### Async Action State
- [ ] Evaluate `@convex-dev/react-query` / TanStack Query for components that still hand-roll `isSaving`/`error`/success state around Convex mutations.
  - Compare against a small local async-action hook before adopting another provider and dependency.
  - Keep standard Convex React hooks where offline/preloaded-query behavior or adapter beta gaps matter.
- [ ] Stabilize local async-action helpers if `useSaveHandler` keeps spreading.
  - Keep the local helper for one-shot Convex mutations that only need button loading, inline errors, and success callbacks.
  - Revisit TanStack Query instead of adding more local abstraction when multiple features need shared mutation/query state, retry/backoff policy, cancellation/deduping, cache invalidation/refetch orchestration, or optimistic updates beyond the offline outbox.
  - Do not adopt `@convex-dev/react-query` until offline/preloaded-query behavior and adapter maturity are compatible with this app's core study flows.

## Code Quality — Convex Performance

### SRS Queue Population
- [ ] Centralize Convex card creation paths so manual, AI/tooling, fork, and append flows share one backend helper for flashcard inserts, card counts, origin metadata, and SRS enrollment hooks.
- [ ] Batch SRS enrollment for large shared sets if public/marketplace sets start accumulating many users.
  - Current bounded per-card enrollment is acceptable for side-project scale.
  - Move to scheduled batches if a single card creation needs to enroll more users than fits comfortably in one Convex mutation.
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
- [ ] Create a nullable query contract decision map before the broader migration:
  - classify each `null` return as valid optional domain state, access-control failure, missing entity, or intentionally hidden signed-out state,
  - migrate only route/client contracts that are ready to change together.
  - Include a broad Convex nullable-to-domain-result migration once the route/client contracts are ready to change together.
  - `userSets.get`: return a typed failure for unauthenticated/missing membership if callers need to show access or library state explicitly.
  - Auth-gated dashboard/query surfaces such as `srsReviewQueue.getQueueStats`, `weakAnalysis.getMyWeakCards`, and progress queries should either return a domain result or be documented as intentionally empty/hidden when signed out.
  - Keep valid optional-state queries nullable where `null` is the useful domain value, such as “no active study session” or “no fork sync status”.

### Effect Boundary Cleanup
- [ ] Define an Effect usage policy: use Effect for domain validation and external/HTTP/AI boundaries; avoid Services/Layers until dependency composition becomes real.
- [ ] Audit async boundaries and use `Effect.tryPromise` where rejected promises should become typed failures; keep unexpected Convex DB/runtime failures as defects unless there is a concrete recovery path.
- [ ] Consider `Data.TaggedError` for new Effect-heavy modules, but do not migrate existing plain `{ _tag, message }` failures without a clear reason.

## Code Quality — Card Navigation

### Shared `useCardNavigation` hook
- [ ] Add hook-level tests for `useCardNavigation` if the project adopts a lightweight React hook test pattern.
  - Pure navigation helpers already cover index math.
  - Hook-level coverage should focus on resumed-session server-index reconciliation and hidden-card state across changing input orders.

## Code Quality — UI Consistency

### Status Color Guardrails
- [ ] Expand status color guardrail exemptions or semantic primitives only when new legitimate data-color surfaces appear. Keep chart, rating, and CJK colors exempt because those colors encode data.

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
