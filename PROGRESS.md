# Flashcard App — Progress

> Initial plan: `docs/initial-plan.md`
> Product decisions: `docs/product-decisions.md`

## Phase 1 — MVP (in manual testing)

### Next: Bug Fixes & Polish
- [x] "TTS Only" field display option — fields can be assigned to TTS Only (audio-only, not displayed) in study/browse/SRS config
- [x] Bulk set creation — Quick Create modal on sets page with language presets
- [x] PWA manifest + mobile meta tags + touch target improvements
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
- [x] Hourly cron job (populate queue with due cards every hour + new cards at user's reset hour, round-robin across sets, carry over unfinished)
- [x] SRS review UI (`/srs` route — queue progress, card review, rating, completion screen)
- [x] Dashboard: "X cards due today" indicator + "Review" header link
- [x] SRS config per set (toggle + default front/back fields on set detail page)
- [x] Dashboard: owner/member role-aware UI (edit/delete only for owners)
- [x] Backfill existing sets with `userSets` rows (run `internal.userSets.backfillExistingSets` after deploy)
- [x] Per-user `maxNewCardsPerDay` setting with round-robin distribution across sets
- [x] User-configurable day reset hour (local time → UTC conversion)
- [x] Server-side reviewed count on SRS completion screen
- [x] Split home screen into dashboard and dedicated sets page

### Manual Testing
- [x] Set detail page: verify SRS Settings section appears with toggle and front/back config
- [x] Set detail page: toggle SRS off/on, change front/back defaults, save
- [x] Dashboard: trigger queue population via Convex dashboard (`internal.srsEngine.populateQueues`)
- [x] Dashboard: verify "X cards to review" indicator appears with "Start Review" button
- [x] SRS review (`/srs`): cards render with reveal + Again/Hard/Good/Easy buttons
- [x] SRS review: rate cards, verify progress bar advances and cards leave queue
- [x] SRS review: TTS auto-plays on reveal, mute toggle works
- [x] SRS review: finish all cards, verify completion screen with score breakdown
- [x] SRS review: "End Session" button returns to dashboard with progress saved
- [x] Dashboard: after completing all reviews, verify "All done for today!" message
- [x] Existing Focus Study flow still works (create set, study, browse, results)
- [x] Create a new set: verify `userSets` row auto-created (SRS Settings visible on detail page)
- [x] Delete a set: verify SRS data cleaned up (no orphaned srsCards/reviewQueue rows)

## Phase 3 — Offline & Local-First
- [ ] Research: evaluate local-first options (Convex offline caching vs. local DB + sync layer)
- [ ] PWA offline support — service worker caching app shell + static assets
- [ ] Offline data access — cache sets/cards for offline reads
- [ ] Offline write queue — queue mutations and sync when back online
- [x] TTS playback speed control (slider or preset in session header)

## Phase 4 — Polish & Features
- [x] Progress tracking dashboard (`/progress` route with activity chart, accuracy, card status, per-set mastery)
- [x] Study streaks & daily goals (streak tracking, daily goal ring, dashboard widget)
- [ ] Telemetry / analytics
- [ ] Sharing via link

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
