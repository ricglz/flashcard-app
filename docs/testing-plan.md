# Testing Plan

**Approach:** `convex-test` + `vitest` for Convex backend tests, Playwright for E2E.

## Backend tests (`convex-test` + `vitest`)

Test files go inside `convex/` directory.

### Setup
- Install vitest + convex-test + @edge-runtime/vm

### `convex/__tests__/flashcardSets.test.ts` — CRUD operations
- Create a set (name, description, fieldDefinitions), verify it appears in list
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

#### Set creation wizard — CSV path
- Navigate to /sets/new
- Enter set name and description
- Select "Import CSV" source method
- Upload a CSV file → verify field definitions are inferred from headers
- Proceed to Step 3 → verify field roles are pre-filled with heuristic defaults
- Modify a role or toggle TTS → verify card preview updates
- Proceed to Step 4 → verify review shows correct set info, fields, and cards
- Click "Create Set" → verify redirect to set detail page with all cards

#### Set creation wizard — Manual path
- Navigate to /sets/new
- Enter set name
- Select "Add Manually" source method
- Optionally pick a preset → verify field definitions are pre-filled
- Define field names (or use preset defaults)
- Add a few cards via the card form → verify they appear in the table
- Remove a card → verify it disappears
- Proceed to Step 3 → configure field roles and TTS
- Proceed to Step 4 → review and create
- Verify redirect to set detail page with correct cards

#### Set creation wizard — Navigation
- Verify "Next" is disabled when step validation fails (no name, no source method, no cards)
- Verify "Back" returns to previous step with state preserved
- Verify "Back" is disabled on Step 1

#### Study session (unchanged)
- Happy path: sign in → create set → add cards → study → complete → view results
- Session resume: start session → navigate away → return → resume prompt shown
