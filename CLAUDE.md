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

## Code Style
- Prefer event handlers or server-side logic over `useEffect` — follow React's "you might not need an effect"

@AGENTS.md
