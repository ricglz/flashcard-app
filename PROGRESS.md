# Flashcard App — Progress

> Initial plan: `docs/initial-plan.md`
> Product decisions: `~/.claude/context/flashcard-app-product-decisions.md`

## Phase 1 — MVP (code complete, auth configured, ready for manual testing)

### Completed
- [x] Project scaffold (Next.js 16 + Convex + Clerk + Tailwind + papaparse)
- [x] Shared types & constants (`src/lib/types.ts`, `src/lib/presets.ts`)
- [x] Convex schema + functions (sets, cards, study sessions)
- [x] CSV import logic, TTS utility
- [x] Pages & components (dashboard, set CRUD, CSV importer, study session, results)
- [x] Study session flow (state machine with cardOrder/currentIndex, resume, cross-device)
- [x] Clerk + Convex auth integration

### Next: Manual Testing
- [ ] Verify sign-in/sign-out flow works
- [ ] Create a Chinese flashcard set manually (Character, Pinyin, Meaning fields)
- [ ] Add a few cards manually via the edit page
- [ ] Import the 100 common characters CSV
- [ ] Study session: configure front/back fields, toggle shuffle
- [ ] Study session: flip through cards, verify TTS plays for pinyin fields
- [ ] Study session: rate cards, verify progress bar advances
- [ ] Study session: leave mid-session, verify resume prompt appears
- [ ] Study session: complete session, verify results page (score, breakdown, per-card details)
- [ ] Cross-device resume: start on one browser, resume in another

### Next: Bug Fixes & Polish
- [ ] UI/UX issues discovered during testing
- [ ] Edge cases (empty sets, no cards, no front/back fields selected)
- [ ] TTS voice quality / availability on different browsers
- [ ] Mobile responsiveness (should work as PWA target)

### Next: Automated Testing
See `docs/testing-plan.md` for detailed test cases.

## Phase 2 — Polish & Features
- [ ] Telemetry / analytics
- [ ] PWA manifest + offline support
- [ ] Sharing via link
- [ ] Progress tracking dashboard
- [ ] Spaced repetition + smart subsets — track per-card proficiency from rating history, auto-select due/weak cards for sessions, with optional manual subset override

## Phase 3 — Mobile
- [ ] Expo React Native app
- [ ] Push notifications for study reminders

## Phase 4 — Advanced
- [ ] Pronunciation validation (speech-to-text)
- [ ] Multi-language UX enhancements
