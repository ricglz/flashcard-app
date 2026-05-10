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

#### Offline → Online transitions
- **Auth recovery after reconnect**: go offline → come back online → verify user is still authenticated → navigate to dashboard → verify still authenticated
- **SRS offline review + sync**: start SRS → go offline → review 2-3 cards → come back online → verify "Syncing N changes" banner appears and clears → verify reviewed cards are no longer in the queue
- **SRS session continuity**: start SRS with 10+ cards → go offline → review 2 cards → come back online → verify session continues (not kicked to summary) → verify remaining cards are still reviewable
- **Outbox drain retry**: go offline → review a card → come back online with slow connection (throttle network) → verify sync retries and eventually succeeds
- **Outbox idempotency**: go offline → review a card → come back online → wait for sync → refresh page → verify card is not duplicated in review history
- **TTS voice recovery**: start SRS with TTS enabled → go offline → verify TTS uses local voice → come back online → advance to next card → verify TTS switches back to remote/enhanced voice

#### Offline data access
- **Cached queries**: visit dashboard online (loads sets, stats) → go offline → refresh page → verify cached data is displayed (not blank/error)
- **Offline navigation**: go offline → navigate between cached pages (dashboard, sets, progress) → verify pages render with last-known data

#### Network edge cases
- **Flaky connection**: rapidly toggle offline/online 3-4 times → verify app stabilizes (no stuck banners, auth resolves, no duplicate syncs)
- **Offline cold start**: install PWA → close app → go offline → reopen → verify app shell loads from service worker cache
- **Long offline period**: go offline for 5+ minutes (Clerk token expiry) → come back online → verify auth recovers without manual refresh
