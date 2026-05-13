# Testing Strategy

> Status: Current
> Last reviewed: 2026-05-12
> Source of truth: Yes, for test organization and gaps.

## Purpose

Summarize how tests are organized, what is currently covered, and what still needs coverage.

## Commands

```bash
pnpm test          # Vitest unit and Convex tests
pnpm test:watch    # Vitest watch mode
pnpm test:e2e      # Playwright tests
pnpm test:e2e:ui   # Playwright UI mode
pnpm lint          # ESLint with zero warnings
```

## Test Organization

- `src/**/*.test.ts` — frontend/library unit tests.
- `src/components/**/*.test.ts` — component state/reducer tests, not visual UI tests.
- `tests/convex/*.test.ts` — Convex backend tests with `convex-test`.
- `e2e/*.spec.ts` — Playwright user-flow tests.

## Current Coverage

### Library and State Tests

- CSV parsing and import warnings/errors.
- Field toggle behavior.
- Preset validity.
- Shared type helpers.
- Wizard state validation.

### Convex Tests

- Flashcard set CRUD and access behavior.
- Flashcard CRUD and validation.
- Study session setup, result recording, and session state.
- SRS engine and review queue behavior.
- Queue refresh behavior.
- Progress aggregation.
- Sharing/library add behavior.
- CLI token creation/status parsing.
- User settings validation.
- Domain validation helpers.

### E2E Tests

- Set creation wizard CSV path.
- Set creation wizard manual path.

## Known Gaps

- Authenticated end-to-end flows beyond the wizard.
- SRS review E2E: queue, reveal, rate, completion, load more.
- Offline/reconnect E2E: queued reviews, outbox drain, idempotency, auth recovery.
- AI CLI/tooling API integration tests.
- Sharing/forking E2E when those flows expand.
- TTS behavior tests for browser error/fallback cases.

## Testing Principles

- Prefer type-level correctness first.
- Unit-test complex pure logic, parsers, reducers, validators, and scheduling math.
- Use Convex tests for backend behavior and access control.
- Use Playwright only for real user journeys worth protecting.
- Avoid mocking entire user flows when an E2E test can cover the real behavior.
