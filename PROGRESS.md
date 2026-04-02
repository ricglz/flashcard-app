# Flashcard App — Progress

> Plan: `~/.claude/plans/sunny-dancing-fern.md`
> Product decisions: `~/.claude/context/flashcard-app-product-decisions.md`

## Status: Phase 1 — MVP (code complete, needs auth setup to run)

### Completed
- [x] Step 1: Project scaffold (Next.js 16 + Convex + Clerk + Tailwind + papaparse)
- [x] Step 2: CLAUDE.md files + PROGRESS.md
- [x] Step 3: Shared types & constants (`src/lib/types.ts`, `src/lib/presets.ts`)
- [x] Step 4: Convex schema (`convex/schema.ts`)
- [x] Step 5: Convex functions (`convex/flashcardSets.ts`, `convex/flashcards.ts`, `convex/studySessions.ts`)
- [x] Step 6: CSV import logic (`src/lib/csvParser.ts`)
- [x] Step 7: TTS utility (`src/lib/tts.ts`)
- [x] Step 8: Pages & components (dashboard, set CRUD, CSV importer, study session, results)
- [x] Step 9: Study session flow (state machine with cardOrder/currentIndex, resume, cross-device)

### Deferred (Phase 2+)
- [ ] Telemetry / analytics
- [ ] PWA manifest + offline support
- [ ] Sharing via link
- [ ] Progress tracking dashboard
- [ ] E2e tests
- [ ] Expo React Native mobile app
- [ ] Pronunciation validation
- [ ] Spaced repetition algorithm

## Auth Setup Required
Before running the app, you need to:
1. Create a Clerk app at clerk.com
2. Add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` to `.env.local`
3. Run `pnpx convex dev` to create a Convex project
4. In Clerk Dashboard: activate Convex integration
5. In Convex Dashboard: set `CLERK_JWT_ISSUER_DOMAIN` env var
