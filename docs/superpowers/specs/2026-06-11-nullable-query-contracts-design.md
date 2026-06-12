# Nullable Query Contracts Design

## Goal

Make public app-facing Convex query contracts explicit when authentication, access control, missing entities, and optional domain state can otherwise be confused.

The migration should remove ambiguous `null` returns from auth-gated queries. It should preserve `null` only when `null` is the successful domain value, wrapped in `ok(null)`.

## Contract Policy

Use `DomainResult<T, CommonFailure>` for public app-facing queries when callers need to distinguish:

- signed-out state,
- forbidden access,
- missing data,
- invalid input,
- successful data,
- successful absence of optional data.

For those queries:

- signed-out returns `fail(unauthenticated())`;
- denied private access returns `fail(forbidden(...))`;
- missing protected resources return `fail(notFound(...))`;
- optional successful state returns `ok(null)` or `ok(value)`;
- collection queries return `ok([])` for a signed-in user with no rows.

Do not add shared client helpers that unwrap or flatten `DomainResult`. Each client must branch on the exact query result it consumes, so rendering and fallback behavior stays local and visible.

## Scope

Migrate ambiguous public app-facing query contracts in these areas:

- `convex/userSettings.ts`
- `convex/srsReviewQueue.ts`
- `convex/progress.ts`
- `convex/cliTokens.ts`
- `convex/studySessions.ts`
- `convex/flashcardSets.getForkSyncStatus`
- `convex/cardAnnotations.ts`

Keep existing explicit `DomainResult` query contracts in place for set/card/session route data.

Leave internal tool/test queries unchanged unless a migrated public caller requires type changes. Keep public browsing/list queries that intentionally hide signed-out state as empty lists or pages only where that behavior is deliberate.

## Frontend Changes

Update each client call site directly:

- check `result.ok` before reading `result.value`;
- render local fallback UI or nothing for failures based on that component's behavior;
- preserve route redirects that already use preloaded domain results;
- keep offline query caching of the full result object.

AI availability must inspect the `DomainResult` from `userSettings.hasLlmKey` directly instead of treating `null` as "no key."

## Testing

Update Convex tests to assert explicit failures instead of nullable signed-out returns.

Add or adjust signed-out tests for migrated auth-gated queries where existing coverage is missing.

Run unit/type checks after the migration.
