# Decision: Use Offline Cache and Mutation Outbox

> Status: Accepted, partially implemented
> Last reviewed: 2026-05-12

## Decision

Use a service worker, IndexedDB query cache, and IndexedDB mutation outbox instead of replacing Convex with a fully local-first backend.

## Why

The app needs offline study and reconnect sync, but most writes are per-user and sequential. A cache/outbox model handles this without CRDT complexity or a backend migration.

## Tradeoffs

- Convex remains the source of truth; local data can be stale.
- Offline cold start depends on what the service worker already cached.
- Mutations need retry-safe behavior for outbox replay.
- Query cache is generic and not normalized.

## Related Files

- `docs/offline-strategy.md`
- `src/sw.ts`
- `src/lib/offlineDb.ts`
- `src/lib/useOfflineQuery.ts`
- `src/lib/offlineOutbox.ts`
- `src/lib/useOfflineMutation.ts`
- `src/lib/SyncProvider.tsx`
