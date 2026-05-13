# Flashcard App

Chinese-first flashcard PWA with a generic field-based data model. Built with Next.js, Convex, Clerk, Tailwind CSS, and pnpm.

## Current Features

- Field-based flashcard sets: each set defines its own fields, roles, and metadata.
- Set creation wizard: create sets manually or import CSV files.
- Focus Study: on-demand scored sessions with configurable front/back fields.
- Browse Mode: no-scoring practice with free card navigation.
- SRS Queue: daily spaced-repetition reviews across SRS-enabled sets.
- Progress dashboard: streaks, daily goal, activity history, accuracy, and mastery views.
- Text-to-speech: Web Speech API with field-level language metadata and persisted playback speed.
- Offline support: service worker, IndexedDB query cache, offline mutation outbox, and sync indicator.
- AI assistant CLI workflow: export weak SRS context, generate remedial sets with an external assistant, validate/import generated JSON.

## Development

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000.

## Scripts

```bash
pnpm dev           # Start Next.js dev server
pnpm build         # Build app and generated service worker
pnpm start         # Start production server
pnpm lint          # ESLint with zero warnings
pnpm test          # Vitest unit and Convex tests
pnpm test:watch    # Vitest watch mode
pnpm test:e2e      # Playwright tests
pnpm flashcard-ai  # Local AI assistant CLI
```

For the AI remedial-set workflow:

```bash
pnpm flashcard-ai workflow
```

## Important Docs

- `docs/product-decisions.md` — current product shape, architecture, and roadmap.
- `docs/offline-strategy.md` — current offline implementation and rationale.
- `docs/testing-strategy.md` — current test coverage and gaps.
- `docs/ai-cli-remedial-sets.md` — current external-assistant remedial set workflow.
- `docs/decisions/` — concise decision records explaining why key choices were made.
- `docs/research/` — research notes, not current source of truth.

## Project Notes

- Read `AGENTS.md` before changing code.
- When working on Convex code, read `convex/_generated/ai/guidelines.md` first.
- Next.js APIs may differ from older versions; check `node_modules/next/dist/docs/` before changing framework-specific code.
