# E2E Testing

Playwright tests use Clerk's testing token support and the local Convex dev
deployment configured by `.env.local`.

## Current Local Setup

Required environment:

- `CLERK_SECRET_KEY`
- `CLERK_JWT_ISSUER_DOMAIN`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_CONVEX_URL`

`e2e/global-setup.ts` creates the Clerk test user, `e2e/auth.setup.ts`
authenticates it through Clerk's Playwright helpers, and
`e2e/global-teardown.ts` removes the Clerk user and calls
`testing:cleanupTestUser` to delete Convex data by opaque
`tokenIdentifier`.

Seeded tests can create Convex data directly through internal functions in
`convex/testing.ts`. The Playwright helper in `e2e/seed.ts` resolves the Clerk
test user to its Convex `tokenIdentifier` and calls `npx convex run testing:*`.

## Future Isolated CI Setup

CI should wait until dedicated test infrastructure exists:

- Clerk test instance publishable and secret keys.
- Clerk testing token support for that instance.
- Dedicated Convex deployment URL and deploy key.
- CI secrets for the values above.

Until those secrets exist, run E2E tests locally against the current dev setup:

```bash
pnpm test:e2e e2e/study-abandon.spec.ts
pnpm test:e2e e2e/srs-review.spec.ts
```
