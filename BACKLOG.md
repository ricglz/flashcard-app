# Flashcard App — Backlog & Ideas

> This is a planning document and backlog of ideas.
> Remove items once they're completed — git history is the authoritative record.
> This file is only for unstarted or in-progress work.
> For current status, see git history and README.md.
> 
> Product decisions: `docs/product-decisions.md`

## Code Quality — Typed Domain Validation Candidates

### Study Session Setup / Results
- [ ] Standardize study session result types to use DomainResult pattern — abandon/complete already return discriminated outcomes (`"abandoned"`, `"alreadyClosed"`, `"duplicate"`, `"recorded"`), but the types are inline object literals rather than the shared DomainResult union used elsewhere.

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
- [ ] Search and filter (by language/field metadata, card count, popularity)
- [ ] Sort options (most forked, most users)
- [ ] User public profile page — deferred until proper username management exists (no PII in DB)

## AI Capabilities

### Multi-Provider Key Management
- [ ] Support multiple API keys per user (e.g., OpenAI for generation, Anthropic for assistant) — currently limited to one provider at a time
- [ ] Per-feature provider selection (which key to use for generation vs. chat)

### AI Weak Spot Analysis
- [ ] Build optional MCP wrapper around the same tooling API if CLI workflow proves useful.

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
- [ ] User-facing error boundaries with helpful messaging

### Platform
- [ ] Pronunciation validation (speech-to-text comparison against expected pinyin)
- [ ] Optional high-quality TTS (user-provided API key for Google Cloud / OpenAI TTS)
- [ ] Expo React Native app
- [ ] Push notifications for study reminders
