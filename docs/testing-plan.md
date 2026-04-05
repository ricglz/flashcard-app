# Testing Plan

**Approach:** `convex-test` + `vitest` for Convex backend tests, Playwright for E2E.

## Backend tests (`convex-test` + `vitest`)

Test files go inside `convex/` directory.

### Setup
- Install vitest + convex-test + @edge-runtime/vm

### `convex/__tests__/flashcardSets.test.ts` — CRUD operations
- Create a set, verify it appears in list
- Update set name/description/fieldDefinitions
- Delete set cascades to delete cards
- Unauthenticated users get empty results
- Users can only see/modify their own sets

### `convex/__tests__/flashcards.test.ts` — Card operations
- Create single card, verify fields stored correctly
- Batch create (CSV import path), verify all cards created with correct order
- Update card fields
- Delete card
- Ownership check: can't modify cards in another user's set

### `convex/__tests__/studySessions.test.ts` — Session state machine
- Start session with shuffle=false, verify cardOrder matches card order
- Start session with shuffle=true, verify cardOrder contains all cards but different order
- Record results, verify currentIndex advances
- Complete session (all cards rated), verify status="completed" and overallScore calculated
- Abandon session, verify status="abandoned"
- Resume: get active session returns in_progress session
- Can't record result on completed/abandoned session

## E2E tests (Playwright) — deferred to after backend tests

### Setup
- Install Playwright

### Test cases
- Happy path: sign in → create set → add cards → study → complete → view results
- CSV import: upload file → preview → confirm → cards appear in set
- Session resume: start session → navigate away → return → resume prompt shown
