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
- [ ] Add a few cards manually via the edit page
- [ ] Study session: configure card limit (10/20/50/All)
- [ ] Study session: complete session, verify results page
- [ ] Browse mode: navigate back/forth, dismiss known cards
- [ ] Browse mode: verify TTS mute/unmute toggle
- [ ] Cross-device resume: start on one browser, resume in another

## Phase 2 — Polish & Features
- [ ] Telemetry / analytics
- [ ] PWA manifest + offline support
- [ ] Sharing via link
- [ ] Progress tracking dashboard
- [ ] Study streaks & daily goals
- [ ] Spaced repetition + smart subsets — track per-card proficiency from rating history, auto-select due/weak cards for sessions

## Phase 3 — Mobile
- [ ] Expo React Native app
- [ ] Push notifications for study reminders

## Phase 4 — Advanced
- [ ] AI card generation from prompts
- [ ] Pronunciation validation (speech-to-text)
- [ ] Card annotations / personal notes
- [ ] Multi-modal cards (images, audio clips)
- [ ] Multi-language UX enhancements
