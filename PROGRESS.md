# Flashcard App — Progress

> Initial plan: `docs/initial-plan.md`
> Product decisions: `docs/product-decisions.md`

## Phase 1 — MVP
- [ ] Mobile responsiveness verification (responsive padding and layouts are in place, needs device testing)

## Phase 3 — Offline & Local-First
- [ ] Research: evaluate local-first options (Convex offline caching vs. local DB + sync layer)
- [ ] PWA offline support — service worker caching app shell + static assets
- [ ] Offline data access — cache sets/cards for offline reads
- [ ] Offline write queue — queue mutations and sync when back online

## Phase 4 — Polish & Features
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
