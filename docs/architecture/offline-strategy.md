# Offline Strategy

> Status: Current, partially implemented
> Last reviewed: 2026-05-24
> Source of truth: Yes, for offline architecture and known limitations.

## Purpose

Explain the durable offline boundaries and why the app uses a cache/outbox model instead of a local-first rewrite.

## Requirements

- Offline app shell for installed PWA use.
- Offline reads for recently loaded sets, cards, progress, SRS queue, and settings.
- Offline review/study mutations queued locally.
- Reconnect sync that replays queued mutations against Convex.
- Clear UI state for offline and syncing modes.

## Architecture Boundary

The app uses a cloud-first cache/outbox model. Convex remains the source of truth; local data is a cache plus pending mutation queue, not an independent database.

## Hook Selection Policy

Use offline hooks for user-owned state that should keep rendering during study or review when the network drops:

- study cards and sessions;
- SRS queues, progress, annotations, and settings;
- set membership data needed by offline-capable screens.

Use live Convex hooks for data that is intentionally online-dependent:

- AI/LLM key checks and provider/model gates;
- real-time search and public browse queries;
- transient assistant or generation state that should disappear when offline.

Server preloads are still useful for auth-required route setup and first render, but offline-capable clients should switch to `useOfflinePreloadedQuery` or `useOfflineQuery` once hydrated.

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
