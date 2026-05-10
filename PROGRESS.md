# Flashcard App — Progress

> Initial plan: `docs/initial-plan.md`
> Product decisions: `docs/product-decisions.md`

## Code Quality — Effect Adoption Candidates
- [ ] Evaluate `effect` for domain validation and typed expected failures before expanding usage broadly.
  - Good fits:
    - Card/set validation where runtime database state defines valid values (e.g. flashcard field keys).
    - CSV/import pipelines with recoverable row/header errors.
    - Study-session setup validation and result unions for user-actionable failures.
    - External integrations such as TTS, where retries, timeouts, and provider fallbacks may become useful.
  - Use sparingly at Convex boundaries: Convex functions should keep normal validators and convert Effect failures into either structured thrown errors or explicit result unions.
  - Avoid rewriting simple handlers wholesale until the small validation spike proves readability, bundle/runtime compatibility, and test ergonomics.

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
