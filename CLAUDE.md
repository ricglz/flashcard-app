# Flashcard App

## Overview
Chinese-first flashcard PWA with generic field-based data model.

## Progress Tracking
- **PROGRESS.md** is forward-looking only — it tracks what's next, not what's done. Never list completed items; git history is the authoritative record.
- Testing strategy and current coverage gaps live in `docs/testing-strategy.md`

## Testing
- **Testing hierarchy**: types > unit tests > e2e. Prioritize enforcing correctness through the type system first — consider architecture changes or more thoughtful type representations before reaching for runtime checks.
- **Unit tests** (`pnpm test`): only for complex logic with clear expectations (parsers, reducers, score computation, validation). Not for UI unless it's state/reduction logic. Tests live in `src/` alongside source files and in `tests/convex/` for backend.
- **E2E tests** (`pnpm test:e2e`): only to guarantee real user journeys/operations. No mocking — test what users actually do. Tests live in `e2e/`.
- **E2E locator pitfalls**:
  - Always use `exact: true` for button name matching — the Next.js Dev Tools button's aria-label contains "Next" and will cause strict mode violations.
  - Prefer `getByRole('textbox', { name: '...' })` over `getByLabel(...)` in Clerk modals — labels like "Password" also match the "Show password" button.
  - Auth is modal-based (Clerk `<SignInButton mode="modal">`), not route-based — there is no `/sign-in` or `/sign-up` page.
  - The CSV file input has `class="hidden"` — assert on the visible drop zone text, not `input[type="file"]`.

## Code Style
- Prefer event handlers or server-side logic over `useEffect` — follow React's "you might not need an effect"
- Use `useOfflineQuery` for offline-capable features (study, SRS, settings, progress). Use `useQuery` for online-dependent gating (AI/LLM key checks, real-time search, transient state) — it returns `undefined` when offline, correctly hiding features that require connectivity.

## Data Privacy
- Minimize user-sensitive data in the database. No PII storage (names, emails, avatars). User identity stays in Clerk; the DB stores only `tokenIdentifier` as an opaque reference.

@AGENTS.md

<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->
