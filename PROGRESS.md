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
- [ ] Backfill existing sets with `userSets` rows (run `internal.userSets.backfillExistingSets` after deploy)
- [ ] Manual testing: create set → verify SRS enrollment → trigger cron → review cards at `/srs`

## Phase 3 — Polish & Features
- [ ] Telemetry / analytics
- [ ] PWA manifest + offline support
- [ ] Sharing via link
- [ ] Progress tracking dashboard
- [ ] Study streaks & daily goals

## Phase 4 — Mobile
- [ ] Expo React Native app
- [ ] Push notifications for study reminders

## Phase 5 — Advanced
- [ ] AI card generation from prompts
- [ ] Pronunciation validation (speech-to-text)
- [ ] Card annotations / personal notes
- [ ] Multi-modal cards (images, audio clips)
- [ ] Multi-language UX enhancements
