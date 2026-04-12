# Flashcard App

## Overview
Chinese-first flashcard PWA with generic field-based data model. Built with Next.js 16 (App Router) + Convex + Clerk + Tailwind CSS.

## Dev Commands
```bash
pnpm dev          # Start Next.js dev server (with Turbopack)
pnpx convex dev   # Start Convex dev server (run in separate terminal)
pnpm build        # Production build
pnpm lint         # ESLint
```

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

## Key Conventions
- **Package manager**: pnpm
- **Import alias**: `@/` maps to `src/`
- **Components**: PascalCase, `.tsx` extension, `"use client"` only when needed
- **Server components first**: Pages should be server components that handle data fetching, validation, and route guards (e.g., redirect if set not found). Client components are only for interactivity — receive validated data as props. Pattern: server uses `getAuthToken()` from `src/lib/server.ts` + `fetchQuery` for validation + `preloadQuery` to pass data; client uses `usePreloadedQuery` for immediate data + real-time subscription.
- **Next.js 16**: `params` is a `Promise` — must be awaited in page components
- **Convex functions**: always check auth via `ctx.auth.getUserIdentity()`
- **Single source of truth types**: `FieldRole`, `FieldMetadata`, `SessionStatus` in `src/lib/types.ts`
- **Metadata pattern**: feature-specific config (e.g., TTS) lives in `FieldMetadata` typed blocks — presence = enabled
- **Metadata is intentionally `v.any()`**: The Convex schema uses `v.record(v.string(), v.any())` for field metadata by design — it's an open map for disjoint types per field role. Type safety is enforced at the application layer via typed accessors (e.g., `getTtsConfig()` in `src/lib/types.ts`). If a stronger Convex validator is found that still supports extensible metadata, updating the schema is welcome.
- **URL reflects page state**: When a page has user-selectable modes or state (e.g., study/browse toggle), sync it to URL search params so browser back/forward preserves the selection. Use `router.replace` for in-place updates.

## Progress Tracking
- **PROGRESS.md** tracks current status, forward-looking tasks, and completed items for the active phase only — once a phase is done, remove its completed items (git has the record)
- When a phase is completed, create a commit marking the phase as done (update PROGRESS.md to clear completed items and advance status)
- Git history is the authoritative record of what was built and when
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
