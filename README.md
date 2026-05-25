# Flashcard App

Chinese-first flashcard PWA with a generic field-based data model. Built with Next.js, Convex, Clerk, Tailwind CSS, and pnpm.

## Product

See `docs/product-decisions.md` for product intent and durable architecture choices. The source and tests are the source of truth for implemented behavior.

## Development

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000.

## Observability

Sentry is optional. Error reporting is disabled unless a DSN is configured.

```bash
NEXT_PUBLIC_SENTRY_DSN=... # browser errors
SENTRY_DSN=...             # Next.js server and route-handler errors
SENTRY_ENVIRONMENT=...     # optional
SENTRY_RELEASE=...         # optional
```

Production source map upload runs only when all of these are present:

```bash
SENTRY_ORG=...
SENTRY_PROJECT=...
SENTRY_AUTH_TOKEN=...
```

Sentry user context is limited to the opaque Clerk user id. Do not add names, emails, avatars, flashcard content, prompts, or request bodies to Sentry events.

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

- `docs/product-decisions.md` — product intent and durable architecture rationale.
- `docs/offline-strategy.md` — offline architecture boundaries and limitations.
- `docs/e2e-testing.md` — local E2E setup and infrastructure constraints.
- `docs/ai-cli-remedial-sets.md` — external-assistant remedial set workflow.
- `docs/decisions/` — concise decision records explaining why key choices were made.

## Project Notes

- Read `AGENTS.md` before changing code.
- When working on Convex code, read `convex/_generated/ai/guidelines.md` first.
- Next.js APIs may differ from older versions; check `node_modules/next/dist/docs/` before changing framework-specific code.
