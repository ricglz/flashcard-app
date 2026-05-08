# Flashcard App

## Overview
Chinese-first flashcard PWA with generic field-based data model.

## Project Structure
```
src/
  app/             # Next.js App Router pages
  components/      # React components
  lib/             # Shared types, utilities, helpers
convex/            # Convex backend (schema, functions)
data/              # CSV datasets for flashcard import
tests/convex/      # Convex backend unit tests (NOT in convex/ — avoid pnpx convex dev processing)
e2e/               # Playwright E2E tests
```

## Progress Tracking
- **PROGRESS.md** is forward-looking only — it tracks what's next, not what's done. Never list completed items; git history is the authoritative record.
- Test plans live in `docs/testing-plan.md` until replaced by actual test code

## Testing
- **Testing hierarchy**: types > unit tests > e2e. Prioritize enforcing correctness through the type system first — consider architecture changes or more thoughtful type representations before reaching for runtime checks.
- **Unit tests** (`pnpm test`): only for complex logic with clear expectations (parsers, reducers, score computation, validation). Not for UI unless it's state/reduction logic. Tests live in `src/` alongside source files and in `tests/convex/` for backend.
- **E2E tests** (`pnpm test:e2e`): only to guarantee real user journeys/operations. No mocking — test what users actually do. Tests live in `e2e/`.

## Documentation
- **Product decisions**: `docs/product-decisions.md` — vision, feature specs, data model, differentiation, development phases
- **Testing plan**: `docs/testing-plan.md` — manual and automated test cases
- **Initial plan**: `docs/initial-plan.md` — original project plan

@AGENTS.md

<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->
