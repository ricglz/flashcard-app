# Flashcard App — Progress

> Initial plan: `docs/initial-plan.md`
> Product decisions: `docs/product-decisions.md`

## Phase 1 — MVP
- [ ] Mobile responsiveness verification (responsive padding and layouts are in place, needs device testing)

## Code Quality — Effect Adoption Candidates
- [ ] Evaluate `effect` for domain validation and typed expected failures before expanding usage broadly.
  - Good fits:
    - Card/set validation where runtime database state defines valid values (e.g. flashcard field keys).
    - CSV/import pipelines with recoverable row/header errors.
    - Study-session setup validation and result unions for user-actionable failures.
    - External integrations such as TTS, where retries, timeouts, and provider fallbacks may become useful.
  - Use sparingly at Convex boundaries: Convex functions should keep normal validators and convert Effect failures into either structured thrown errors or explicit result unions.
  - Avoid rewriting simple handlers wholesale until the small validation spike proves readability, bundle/runtime compatibility, and test ergonomics.

## Phase 3 — Offline & Local-First
- [ ] E2E tests for offline→online flows (auth recovery, sync drain, SRS continuity, TTS voice switching) — see `docs/testing-plan.md`

## Phase 4 — Polish & Features
- [ ] Telemetry / analytics
- [ ] Sharing via link

## Phase 5 — Mobile
- [ ] Expo React Native app
- [ ] Push notifications for study reminders

## Phase 6 — Advanced
- [ ] AI card generation from prompts
- [ ] AI-powered card suggestions based on SRS performance (design: `docs/ai-card-suggestions.md`)
- [ ] Pronunciation validation (speech-to-text)
- [ ] Card flags & annotations (flag cards as difficult, attach personal notes)
- [ ] Difficult cards cross-set view (SRS-derived + flags + focus study history)
- [ ] Per-character TTS playback (tap individual characters to hear them spoken)
- [ ] Multi-modal cards (images, audio clips)
- [ ] Multi-language UX enhancements
