# Flashcard App — Backlog & Ideas

> This is a historical planning document and backlog of ideas.
> **DO NOT** mark items as done, check them off, update status notes, or remove entries.
> Git history and the code itself are the authoritative record of what's been completed.
> This file is only for adding new ideas or refining descriptions of unstarted work.
> For current status, see git history and README.md.
> 
> Product decisions: `docs/product-decisions.md`

## Code Quality — Typed Domain Validation Candidates

### Set Creation Wizard / Client State
- [ ] Validate transitions (`NEXT_STEP`, source-method switching, reset) so impossible wizard states are prevented or normalized.
  - **PARTIAL**: Basic validation exists, but transition validation could be enhanced.

### Study Session Setup / Results
- [ ] Add typed results for resume/abandon/complete flows so offline replay and duplicate actions are explicit.
  - **PARTIAL**: Mutations return DomainResult, but offline replay could be enhanced with more specific result types.

### SRS Queue / Scheduling
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
- [ ] Add tests for outbox drain ordering, duplicate review replay, and failure recovery.

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
- [ ] Add assistant prompt/eval examples for producing high-quality remedial sets from exported weak context.
- [ ] Build optional MCP wrapper around the same tooling API if CLI workflow proves useful.
- [ ] Future in-app LLM flow: LLM summarizes weak areas and suggests/generated targeted card sets without external assistant dependency.

### In-App LLM Assistant
- [ ] Chat-style interface for asking questions about study content
- [ ] Context-aware — knows which set/card the user is looking at
- [ ] Example uses: "Explain the tone rules for this word", "Give me a mnemonic for 你好"
- [ ] Feature suggestions — "What should I study next?" based on progress data

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
