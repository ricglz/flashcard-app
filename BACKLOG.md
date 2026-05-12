# Flashcard App — Backlog & Ideas

> This is a historical planning document and backlog of ideas.
> For current status, see git history and README.md.
> 
> Initial plan: `docs/initial-plan.md`
> Product decisions: `docs/product-decisions.md`

## Code Quality — Typed Domain Validation Candidates
### Card / Set Domain Validation
- [x] Validate field definition invariants before creating/updating sets:
  - unique field names after trimming,
  - non-empty names,
  - stable `order` values,
  - supported roles,
  - metadata shape such as TTS language.
  - **DONE**: Implemented in `convex/domain/fieldDefinitions.ts` with `validateFieldDefinitions()` and `validateSetFields()`. All mutations now use domain validation.
- [x] Validate card field payloads against a set's runtime field definitions:
  - unknown fields,
  - missing expected fields when required,
  - all-empty cards,
  - duplicate/normalized field-name collisions.
  - **DONE**: Implemented in `convex/domain/cardFields.ts` with `validateCardFields()`. Returns normalized field map and detects duplicates.
- [x] Share validation rules between manual card creation, CSV import, batch create, and card update paths.
  - **DONE**: All paths now use domain validators from `convex/domain/`. CSV parser, flashcards mutations, and wizard all share the same validation logic.
- [x] Convert domain failures into actionable UI copy instead of generic thrown errors.
  - **DONE**: All mutations return `DomainResult<T, Failure>` instead of throwing. Frontend checks `isFailureResult()` and displays `error.message` to users.

### CSV / Import Pipeline
- [x] Replace string-only CSV errors with typed recoverable failures:
  - missing headers,
  - duplicate headers,
  - empty rows,
  - malformed rows,
  - rows with no useful field values,
  - unsupported inferred metadata.
  - **DONE**: Implemented in `src/lib/csvParser.ts` with `CsvBlockingError` and `CsvWarning` types. Uses domain validators for consistency.
- [x] Track row-level warnings separately from import-blocking errors.
  - **DONE**: `ParsedCsvResult` has separate `errors` (blocking) and `warnings` (non-blocking) arrays.
- [x] Add preview-friendly result unions for "valid cards + warnings" vs "cannot continue".
  - **DONE**: `ParsedCsvSuccess` (`ok: true`) vs `ParsedCsvFailure` (`ok: false`) discriminated union.
- [x] Add tests for partial-success import behavior and error display ordering.
  - **DONE**: Tests in `src/lib/csvParser.test.ts` cover warnings, errors, and partial success.

### Set Creation Wizard / Client State
- [x] Add typed validation for each wizard step rather than only boolean `canProceed`.
  - **DONE**: Added `validateWizardStep()` in `src/components/wizard/wizardState.ts` that returns `ValidationResult` with issues array.
- [x] Return per-field/per-step reasons that the UI can render near the invalid input.
  - **DONE**: `ValidationResult` includes `issues` with `field` and `message` properties.
- [ ] Validate transitions (`NEXT_STEP`, source-method switching, reset) so impossible wizard states are prevented or normalized.
  - **PARTIAL**: Basic validation exists, but transition validation could be enhanced.
- [x] Ensure CSV and manual paths use the same domain validation before final submit.
  - **DONE**: Both paths now use domain validators from `convex/domain/` via `validateWizardStep()`.

### Study Session Setup / Results
- [x] Validate session start inputs:
  - set exists and is accessible,
  - selected front/back/TTS-only fields exist,
  - card limit is within allowed bounds,
  - there are studyable cards.
  - **DONE**: Implemented in `convex/domain/studySessionSetup.ts` with Effect-based validation. Added `NoStudyableCards` failure type.
- [x] Return user-actionable setup failures such as "no cards", "field was removed", or "set access changed".
  - **DONE**: All mutations return `DomainResult` with typed failures. Frontend displays `error.message` to users.
- [ ] Add typed results for resume/abandon/complete flows so offline replay and duplicate actions are explicit.
  - **PARTIAL**: Mutations return DomainResult, but offline replay could be enhanced with more specific result types.

### SRS Queue / Scheduling
- [x] Add typed guardrails around SRS settings:
  - daily new-card limit range,
  - reset UTC hour range,
  - enabled set membership.
  - **DONE**: Implemented in `convex/domain/srsSettings.ts` with `validateUserSettingsPatch()`. Validates ranges (0-200 cards, 0-23 hour, 0.25-2.0 speed, 0-500 daily goal).
- [ ] Validate review actions before scheduling:
  - SRS card belongs to user,
  - queue item exists or action is an idempotent replay,
  - rating is supported.
  - **PARTIAL**: Basic validation exists, but could be enhanced with more specific failure types.
- [ ] Keep pure scheduling math in plain/testable TypeScript unless a richer result type adds meaningful typed failure handling.
- [ ] Add tests for queue population edge cases: empty sets, duplicate queue entries, carry-over cards, and new-card limit exhaustion.

### TTS / External Integration Boundary
- [ ] Model TTS outcomes as typed failures where useful:
  - unsupported browser,
  - permission blocked,
  - no voice for language,
  - timeout,
  - network/local voice fallback.
- [ ] Consider richer orchestration helpers only if retry/timeout/fallback flows become more complex than current promise helpers.
- [ ] Keep UI-facing TTS results serializable and independent of server/domain internals.
- [ ] Add tests for `friendlySpeechError`, voice selection, timeout behavior, and empty text handling.

### Offline Sync / Outbox
- [x] Type offline mutation outcomes:
  - queued,
  - replayed,
  - duplicate/idempotent no-op,
  - permanent failure,
  - auth-required retry.
  - **DONE**: Mutations now return `DomainResult`. Offline layer handles `DomainResult` types. `useOfflineMutation` and `SyncProvider` updated to work with typed results.
- [x] Normalize server errors into stable categories for reconnect/retry UI.
  - **DONE**: All failures use `CommonFailure` union with `_tag` discriminator. Frontend can switch on `_tag` for specific handling.
- [ ] Add tests for outbox drain ordering, duplicate review replay, and failure recovery.

### Shared Types / Metadata
- [x] Runtime-validate `FieldMetadata` and narrow Convex `any` metadata at query/mutation boundaries.
  - **DONE**: Added `isFieldMetadata()` and `normalizeFieldMetadata()` in `src/lib/types.ts`. Created `convex/lib/typed.ts` with `getFieldDefinitions()` helper that normalizes metadata at the boundary.
- [x] Add typed helpers for TTS-enabled fields, displayable fields, and studyable field selections.
  - **DONE**: Added `getTtsConfig()`, `getTtsEnabledFields()`, `getDisplayableFields()`, `getStudyableFieldNames()` in `src/lib/types.ts`.
- [x] Keep `src/lib/types.ts` as the canonical static type source, with runtime validation colocated or clearly linked.
  - **DONE**: Types are canonical in `src/lib/types.ts`. Runtime validation in `convex/domain/` and `convex/lib/typed.ts`.

### Zod Integration Consideration
- [ ] Evaluate adding Zod for schema validation
  - **Context**: Current validation is hand-rolled in `convex/domain/` modules. Works well but requires manual type definitions + runtime validators.
  - **Pros**: Zod would provide single source of truth (schema → TypeScript types), better error messages, composable schemas, and ecosystem integrations.
  - **Cons**: Adds dependency, learning curve, and migration effort. Current solution is working well with 201 tests passing.
  - **Recommendation**: Consider Zod if:
    - Validation logic becomes more complex
    - Need to share schemas between frontend/backend more extensively
    - Want automatic OpenAPI/docs generation
    - Team grows and needs more standardized validation patterns
  - **If adopted**: Start with `FieldDefinition` and `FieldMetadata` schemas, then gradually migrate domain validators. Keep DomainResult pattern - Zod complements it rather than replaces it.

## Marketplace & Multi-User

### Sharing
- [ ] Visibility settings on sets (private / unlisted-link-only / public)

### Forking
- [ ] Fork/clone a shared set into own library (deep copy — independent cards the user can edit)
- [ ] "Forked from" attribution link on cloned sets
- [ ] Sync indicator — show if the original set has changed since fork (no auto-merge, just awareness)

### Marketplace / Browse
- [ ] Public sets listing page (`/explore` or `/marketplace`) — browse all public sets
- [ ] Search and filter (by name, language/field metadata, card count, popularity)
- [ ] Sort options (newest, most forked, most users)
- [ ] Set preview cards (name, description, card count, field definitions, sample cards)
- [ ] Pagination / infinite scroll for large catalogs
- [ ] User public profile page — list of their public sets

## AI Capabilities

### BYOK Key Management
- [ ] User settings page for API key storage (OpenAI, Anthropic, etc.)
- [ ] Secure key storage in Convex (encrypted at rest, never sent to client)
- [ ] Key validation on save (test call to verify the key works)
- [ ] Support multiple providers (OpenAI, Anthropic, Google) with a provider selector

### AI Card Generation
- [ ] Prompt-based card generation UI — text input describing what to learn
- [ ] LLM generates cards matching the set's field definitions
- [ ] Review/edit screen before saving generated cards (preview, edit, remove individual cards)
- [ ] Template prompts for common use cases (e.g., "HSK level N vocab", "top N food words")
- [ ] Generate into existing set (append) or create new set from prompt
- [ ] Generation history — see past prompts and re-generate with tweaks

### AI Weak Spot Analysis
- [ ] Analyze SRS performance data (low ease factors, high lapse counts, frequent "wrong" ratings)
- [ ] LLM summarizes weak areas and suggests targeted card sets to address gaps
- [ ] One-click generation of suggested remedial cards
- [ ] Design doc: `docs/ai-card-suggestions.md`

### In-App LLM Assistant
- [ ] Chat-style interface for asking questions about study content
- [ ] Context-aware — knows which set/card the user is looking at
- [ ] Example uses: "Explain the tone rules for this word", "Give me a mnemonic for 你好"
- [ ] Feature suggestions — "What should I study next?" based on progress data

## E2E Testing

### Infrastructure
- [ ] Playwright setup and CI integration
- [ ] Test user authentication helpers (Clerk test mode or seeded users)
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
- [ ] See `docs/testing-plan.md` for detailed offline test cases

## Polish & Remaining Features

### Study Experience
- [ ] TTS speed control in study views (slider exists on dashboard/SrsQueueStatus but not during SRS review, focus study, or browse sessions)
- [ ] Per-character TTS playback (tap individual characters to hear them)
- [ ] Card flags & annotations (flag as difficult, personal notes/mnemonics)
- [ ] Difficult cards cross-set view (`/difficult` page, layered data sources)

### Content Enhancements
- [ ] Multi-modal cards (images, audio clips as field values via Convex file storage)
- [ ] Cross-field word alignment (token mapping across fields, e.g., 你 ↔ nǐ ↔ you)
- [ ] Related card sets (user-curated or AI-suggested links between sets)
- [ ] Multi-language UX enhancements (tone color coding, language-specific rendering)

### Observability
- [ ] Error tracking / reporting (client-side and Convex function errors)
- [ ] Operational telemetry (usage metrics across all users, function latency, error rates)
- [ ] User-facing error boundaries with helpful messaging

### Platform
- [ ] Pronunciation validation (speech-to-text comparison against expected pinyin)
- [ ] Optional high-quality TTS (user-provided API key for Google Cloud / OpenAI TTS)
- [ ] Expo React Native app
- [ ] Push notifications for study reminders
