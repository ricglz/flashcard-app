# Offline Strategy

> Status: Current, partially implemented
> Last reviewed: 2026-05-12
> Source of truth: Yes, for offline architecture and known limitations.

## Purpose

Explain how the app supports offline study, why the chosen approach was selected, and where the implementation lives.

## Requirements

- Offline app shell for installed PWA use.
- Offline reads for recently loaded sets, cards, progress, SRS queue, and settings.
- Offline review/study mutations queued locally.
- Reconnect sync that replays queued mutations against Convex.
- Clear UI state for offline and syncing modes.

## Current Implementation

The app uses a cloud-first cache/outbox model. Convex remains the source of truth.

### Service Worker

- `src/sw.ts` contains the service worker source.
- `scripts/generate-sw.mjs` builds it into `public/sw.js`.
- `src/components/RegisterSW.tsx` registers it from the app layout.
- Static Next.js assets use cache-first behavior.
- Same-origin GET requests use network-first behavior with cache fallback.

### IndexedDB Query Cache

- `src/lib/offlineDb.ts` defines the `flashcard-offline` IndexedDB database.
- Query results are stored in a generic `queryCache` store.
- `src/lib/useOfflineQuery.ts` wraps Convex `useQuery`:
  - live Convex data wins when available;
  - successful live data is cached;
  - cached data is returned when live data is unavailable.

### IndexedDB Mutation Outbox

- `src/lib/offlineOutbox.ts` stores queued mutations.
- `src/lib/useOfflineMutation.ts` wraps Convex mutations:
  - online: call Convex directly;
  - offline: store mutation name and args in IndexedDB.
- `src/lib/SyncProvider.tsx` drains pending outbox entries when the browser comes back online.
- Failed sync attempts are categorized as auth-related retry or permanent failure.

### UI Indicators

- `src/components/OfflineIndicator.tsx` shows offline, pending, and syncing state.
- It is mounted through `src/components/ConvexClientProvider.tsx`.

## Why This Approach

This app needs reliable solo study while offline, not full collaborative local-first editing. A service worker plus IndexedDB cache/outbox keeps Convex as the backend and avoids a full sync-system rewrite.

## Alternatives Considered

### CRDT / Automerge with Convex

Pros:
- Strong conflict-resolution model.
- True local-first editing.

Cons:
- More complex than needed for solo study flows.
- Harder to preserve Convex indexed queries, access control, and cron-driven SRS logic.
- Adds CRDT document overhead and a second data model.

### Replacing Convex with a Local-First Backend

Options considered included SQLite/Postgres sync systems and local-first frameworks.

Rejected because:
- It would require a backend rewrite.
- The app would lose Convex's current auth integration, functions, cron jobs, and reactive query model.
- The benefit did not justify the migration cost.

### No Offline Support

Rejected because mobile study often happens with unreliable connectivity.

## Current Limitations

- Cache is generic query-level storage, not normalized table storage.
- Offline cold start only works for routes/resources already cached by the service worker.
- Some server-preloaded flows may still require network before client-side cache fallback can help.
- Background Sync API is not used.
- Outbox replay depends on mutations being safe enough to retry.
- Offline/reconnect E2E coverage is still incomplete.

## Related Files

- `src/sw.ts`
- `scripts/generate-sw.mjs`
- `src/components/RegisterSW.tsx`
- `src/lib/offlineDb.ts`
- `src/lib/useOfflineQuery.ts`
- `src/lib/offlineOutbox.ts`
- `src/lib/useOfflineMutation.ts`
- `src/lib/SyncProvider.tsx`
- `src/components/OfflineIndicator.tsx`
- `docs/decisions/004-offline-cache-and-outbox.md`
