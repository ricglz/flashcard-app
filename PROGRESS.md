# Flashcard App — Progress

> Initial plan: `docs/initial-plan.md`
> Product decisions: `docs/product-decisions.md`

## Phase 1 — MVP (in manual testing)

### Next: Bug Fixes & Polish
- [ ] UI/UX issues discovered during testing
- [ ] Add labels/tooltips to make icon buttons more obvious (e.g., mute/unmute TTS)
- [ ] TTS playback speed control (slider or preset buttons in session header)
- [ ] Consider allowing fields to be excluded from the card entirely (e.g., Character used only for TTS, not displayed — currently all fields must be front or back)
- [ ] Mobile responsiveness verification (responsive padding and layouts are in place, needs device testing)
- [ ] "Create Another" option after set creation — reset wizard to step 1 instead of always navigating to the new set
- [ ] Bulk set creation — quick-create mode or streamlined flow for adding many sets at once (noted: the full wizard is too heavyweight when creating several sets in a row)

### Next: Manual Testing (ongoing)
- [x] Verify sign-in/sign-out flow works
- [x] Create a Chinese flashcard set via wizard — manual path
- [x] Create a set via wizard — CSV path (import 100 common characters CSV)
- [x] Verify wizard navigation (back/next, validation, step indicator)
- [x] Verify field metadata configuration (roles, TTS toggle, card preview)
- [x] Study session: configure front/back fields, toggle shuffle
- [x] Study session: flip through cards, verify TTS plays for character fields
- [x] Study session: rate cards, verify progress bar advances
- [x] Study session: leave mid-session, verify resume prompt appears
- [x] Add a few cards manually via the edit page
- [x] Study session: configure card limit (10/20/50/All)
- [x] Study session: complete session, verify results page
- [x] Browse mode: navigate back/forth, dismiss known cards
- [x] Browse mode: verify TTS mute/unmute toggle
- [x] Cross-device resume: start on one browser, resume in another

## Phase 2 — SRS Queue (code complete, needs Convex deployment + manual testing)
- [x] `userSets` table (per-user set link with role, SRS toggle + default front/back fields)
- [x] `srsCards` table (per-user, per-card scheduling state)
- [x] `reviewQueue` table (daily to-do list populated by cron)
- [x] `srsReviews` table (immutable review log)
- [x] SM-2 algorithm implementation + unit tests
- [x] Access control migration (`ownerId` checks → `userSets` membership/ownership)
- [x] `flashcardSets.create` auto-creates `userSets` row with `role: "owner"`
- [x] Cascade delete of SRS data on set removal
- [x] Daily cron job (populate queue with due + new cards, max 20/day global, shuffle, carry over unfinished)
- [x] SRS review UI (`/srs` route — queue progress, card review, rating, completion screen)
- [x] Dashboard: "X cards due today" indicator + "Review" header link
- [x] SRS config per set (toggle + default front/back fields on set detail page)
- [x] Dashboard: owner/member role-aware UI (edit/delete only for owners)
- [x] Backfill existing sets with `userSets` rows (run `internal.userSets.backfillExistingSets` after deploy)

### Manual Testing
- [ ] Set detail page: verify SRS Settings section appears with toggle and front/back config
- [ ] Set detail page: toggle SRS off/on, change front/back defaults, save
- [ ] Dashboard: trigger queue population via Convex dashboard (`internal.srsEngine.populateQueues`)
- [ ] Dashboard: verify "X cards to review" indicator appears with "Start Review" button
- [ ] SRS review (`/srs`): cards render with reveal + Again/Hard/Good/Easy buttons
- [ ] SRS review: rate cards, verify progress bar advances and cards leave queue
- [ ] SRS review: TTS auto-plays on reveal, mute toggle works
- [ ] SRS review: finish all cards, verify completion screen with score breakdown
- [ ] SRS review: "End Session" button returns to dashboard with progress saved
- [ ] Dashboard: after completing all reviews, verify "All done for today!" message
- [ ] Existing Focus Study flow still works (create set, study, browse, results)
- [ ] Create a new set: verify `userSets` row auto-created (SRS Settings visible on detail page)
- [ ] Delete a set: verify SRS data cleaned up (no orphaned srsCards/reviewQueue rows)

## Phase 3 — Offline & Local-First
- [ ] Research: evaluate local-first options (Convex offline caching vs. local DB + sync layer)
- [ ] PWA offline support — service worker caching app shell + static assets
- [ ] Offline data access — cache sets/cards for offline reads
- [ ] Offline write queue — queue mutations and sync when back online
- [ ] TTS playback speed control (slider or preset in session header)

## Phase 4 — Polish & Features
- [ ] Telemetry / analytics
- [ ] Sharing via link
- [ ] Progress tracking dashboard
- [ ] Study streaks & daily goals

## Phase 5 — Mobile
- [ ] Expo React Native app
- [ ] Push notifications for study reminders

## Phase 6 — Advanced
- [ ] AI card generation from prompts
- [ ] AI-powered card suggestions based on SRS performance (design: `docs/ai-card-suggestions.md`)
- [ ] Pronunciation validation (speech-to-text)
- [ ] Card flags & annotations (flag cards as difficult, attach personal notes)
- [ ] Difficult cards cross-set view (SRS-derived + flags + focus study history)
- [ ] Per-character TTS playback (tap individual characters to hear them spoken)
- [ ] Multi-modal cards (images, audio clips)
- [ ] Multi-language UX enhancements
