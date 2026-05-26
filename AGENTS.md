This file should contain only things that agents will update when they don't understand something, and not as a "cache" or something that they could always find or figure out based on reading the code.

## Status
Right now there are no active users. This is a side project, so:

- No backfilling is needed for current data changes.
- Experimental features are acceptable when there is a clear rollback path.

Observability is still important because the app is mainly tested in production.

## Source control
- Prefer rebasing over merging branches

## Backlog
- **BACKLOG.md** is forward-looking only — it tracks what's next, not what's done. Never list completed items; git history is the authoritative record.

## Testing
- **Testing hierarchy**: types > unit tests > e2e. Prioritize enforcing correctness through the type system first — consider architecture changes or more thoughtful type representations before reaching for runtime checks.
- **Unit tests** (`pnpm test`): only for complex logic with clear expectations (parsers, reducers, score computation, validation). Not for UI unless it's state/reduction logic. Tests live in `src/` alongside source files and in `tests/convex/` for backend.
- **E2E tests** (`pnpm test:e2e`): only to guarantee real user journeys/operations. No mocking — test what users actually do. Tests live in `e2e/`.
- **E2E locator pitfalls**:
  - Always use `exact: true` for button name matching — the Next.js Dev Tools button's aria-label contains "Next" and will cause strict mode violations.
  - Prefer `getByRole('textbox', { name: '...' })` over `getByLabel(...)` in Clerk modals — labels like "Password" also match the "Show password" button.
  - Auth is modal-based (Clerk `<SignInButton mode="modal">`), not route-based — there is no `/sign-in` or `/sign-up` page.
  - The CSV file input has `class="hidden"` — assert on the visible drop zone text, not `input[type="file"]`.
- Right now agents are not able to use e2e test flows. You will need to ask the user

## Code Style
- Prefer event handlers or server-side logic over `useEffect` — follow React's "you might not need an effect"
- Use `useOfflineQuery` for offline-capable features (study, SRS, settings, progress). Use `useQuery` for online-dependent gating (AI/LLM key checks, real-time search, transient state) — it returns `undefined` when offline, correctly hiding features that require connectivity.
- Comments should be essential-only: explain non-obvious intent, external constraints, generated/tooling requirements, suppression rationale, or behavior the code/types cannot express. Delete comments that restate names, JSX structure, test steps, or architecture facts discoverable from the code.

## Consistency Guardrails
- Use shared `src/components/ui` primitives for common controls and status UI.
- Use route preload helpers from `src/lib/routePreload.ts` for auth-required pages.
- Convex functions must declare validators, including `args: {}` for empty argument objects.
- For offline-capable user state, prefer offline query hooks. For online gates, search, and transient data, use live query hooks.
- When adding a convention, add an ESLint rule if it can be enforced with low noise.

## Data Privacy
- Minimize user-sensitive data in the database. No PII storage (names, emails, avatars). User identity stays in Clerk; the DB stores only `tokenIdentifier` as an opaque reference.

## Planning

When making plans don't

* Over-explain things. There's no need for fluff
* Give time estimates. Related to the prior, it's just fluff
* Prioritize. This doesn't mean that don't propose phases, but there's no higher/smaller priority. Just items that we should execute on

But do:

* Consider how to organize the atomic commits
* Assume that other agents may also be making changes, so consider using separate worktree

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
