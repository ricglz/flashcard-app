# Flashcard App — Backlog & Ideas

> This is a planning document and backlog of ideas.
> Remove items once they're completed — git history is the authoritative record.
> This file is only for unstarted or in-progress work.
> For current status, see git history and README.md.
> 
> Product decisions: `docs/product-decisions.md`

## Code Quality — Typed Domain Validation Candidates

### Boolean / Optional Branch Guardrails
- [ ] Add a low-noise static guardrail for exported helper/hook boolean parameters if this pattern keeps recurring.
  - Flag boolean parameters on exported non-component functions where a union or named command would better express behavior.
  - Exempt React component props, real binary domain fields, result tags, and UI state props such as `disabled`, `loading`, `selected`, and `flagged`.
  - Prefer a small custom ESLint rule only if it can avoid noisy false positives.

### Schema Requiredness Audit
- [ ] Audit optional schema fields that should become required, starting with `flashcards.origin`.
  - Use widen-migrate-narrow for Convex schema tightening when existing data may violate the new shape.
  - For `flashcards.origin`, add/keep the full origin union including `forked`, check for existing rows missing `origin`, default missing existing rows to `manual` unless reliable set-level evidence says otherwise, then make the field required.

### SRS Queue / Scheduling
- [ ] Centralize review queue row creation if more queue writers are added, so denormalized `reviewQueue.cardId` / `setId` fields stay consistent with their `srsCardId`.

### TTS / External Integration Boundary
- [ ] Consider richer orchestration helpers only if retry/timeout/fallback flows become more complex than current promise helpers.
- [ ] Make `TtsEvent` a stricter discriminated union so failure statuses require failure fields like `message` and `kind`, and consumers can narrow on the event shape instead of classifying status strings.

## Code Quality — React Component Structure

### Form / Draft State Helpers
- [ ] Extend reusable local draft helpers beyond `useDraftValue` if more settings sections need nullable draft-over-server-state behavior.

### Async Action State
- [ ] Evaluate `@convex-dev/react-query` / TanStack Query for components that still hand-roll `isSaving`/`error`/success state around Convex mutations.
  - Compare against a small local async-action hook before adopting another provider and dependency.
  - Treat offline support as a prototype target, not a blocker: TanStack Query has persisted cache and paused-mutation examples, but this app still needs validation against Convex live queries, Next route preloading, Clerk auth, and the existing IndexedDB outbox.
  - Keep standard Convex React hooks where live subscription or preloaded-query behavior is materially simpler.
- [ ] Stabilize local async-action helpers if `useSaveHandler` keeps spreading.
  - Keep the local helper for one-shot Convex mutations that only need button loading, inline errors, and success callbacks.
  - Revisit TanStack Query instead of adding more local abstraction when multiple features need shared mutation/query state, retry/backoff policy, cancellation/deduping, cache invalidation/refetch orchestration, or optimistic updates beyond the offline outbox.
  - Adopt `@convex-dev/react-query` only if a prototype proves it can coexist with or simplify the current offline cache/outbox without weakening core study-flow reliability.
- [ ] Make SRS settings save transactional if partial saves become a practical issue.
  - Keep explicit SRS intent, but consider a backend command with `{ defaults, srsAction: "unchanged" | "enable" | "disable" }` so field defaults and SRS enable/disable are applied in one mutation.
  - Preserve the current explicit `enableSrs` / `disableSrs` commands for call sites that only need enrollment state changes.

## Code Quality — Convex Performance

### Generated API Artifacts
- [ ] Decide whether Convex generated API files should be committed after function API changes.
  - If yes, document the expected regeneration command and include generated diffs in API-changing commits.
  - If no, document that local tests and typechecking derive enough from source for this repo workflow.

### SRS Queue Population
- [ ] Centralize Convex card creation paths so manual, AI/tooling, fork, and append flows share one backend helper for flashcard inserts, card counts, origin metadata, and SRS enrollment hooks.
  - Consider moving the pure validation portion of `convex/lib/cardCreation.ts` to Effect only if card creation grows into a larger typed-failure pipeline or needs cleaner composition inside `Effect.gen` callers. Keep ordinary Convex DB insert failures as defects unless there is a concrete recovery path.
- [ ] Batch SRS enrollment for large shared sets if public/marketplace sets start accumulating many users.
  - Current bounded per-card enrollment is acceptable for side-project scale.
  - Move to scheduled batches if a single card creation needs to enroll more users than fits comfortably in one Convex mutation.
- [ ] Revisit queue selection indexes if production signals show due/new card selection becoming hot.

### Large Set Study Paths
- [ ] Rework study session setup for large sets if full-card loading or stored `cardOrder` arrays become a practical limit.
- [ ] Consider count or summary tables only if production signals show queue/progress counts becoming hot.

## Marketplace & Multi-User

### Shared Learning / Coaching
- [ ] Coach-visible learner progress for explicitly shared relationships.
  - Keep consent explicit: the learner should opt in before another user can view progress.
  - Start with read-only progress summaries and weak spots, not account impersonation or direct access to private data.
  - Avoid storing PII for invitations or profiles; identify users through Clerk and store only opaque references in Convex.
- [ ] Lightweight invite flow for one learner to join an unlisted set.
  - Make the recommended owner workflow clear: share link → learner adds to library → owner can keep adding cards.
  - Preserve the distinction between adding to library and forking, since forking intentionally breaks future owner updates.
- [ ] Shared-set member view that explains update behavior.
  - Tell members when the set owner adds or changes cards, and clarify that their SRS/progress remains personal.
  - Consider a simple "new cards added" signal before building notification infrastructure.

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
- [ ] Expand tool set beyond the current `list_sets`, `get_weak_cards`, and `add_note_to_current_card` tools if usage shows demand (e.g., study stats, mastery levels, richer annotation workflows)

## Code Quality — Error Handling

### Query Result Contracts
- [ ] Continue replacing ambiguous access-control `null` query returns with domain results where clients need to distinguish unauthenticated, forbidden, not found, and invalid input states.
- [ ] Create a nullable query contract decision map before the broader migration:
  - classify each `null` return as valid optional domain state, access-control failure, missing entity, or intentionally hidden signed-out state,
  - migrate only route/client contracts that are ready to change together.
  - Include a broad Convex nullable-to-domain-result migration once the route/client contracts are ready to change together.
  - Auth-gated dashboard/query surfaces such as `srsReviewQueue.getQueueStats` and progress queries should either return a domain result or be documented as intentionally empty/hidden when signed out.
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
- [ ] Convex unit coverage for SRS enrollment commands.
  - `enableSrs` is idempotent and enrolls cards only when transitioning from disabled to enabled.
  - `disableSrs` preserves existing SRS cards and queue rows.
  - non-members cannot enable or disable SRS for another user's set.
- [ ] SRS enrollment (add set to library → enable SRS → verify srsCards created)
- [ ] New card introduction (verify daily limit, round-robin across sets)
- [ ] Queue carry-over (unfinished cards persist to next day)

### Sharing & Marketplace Flows
- [ ] Share a set via link → open link as another user → view shared set
- [ ] Add unlisted set to library as another user → verify independent SRS enrollment and progress state
- [ ] Owner adds cards to shared set → verify SRS-enabled members are enrolled in the new cards
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
