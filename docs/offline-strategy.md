# Offline & Local-First Strategy

> Date: 2026-04-26
> Status: Research complete, approach selected
> Referenced from: `docs/product-decisions.md`

## Problem

The app is installed as a PWA but requires an active internet connection for all functionality. Convex is a cloud-first reactive database — when the connection drops, queries pause and mutations fail. Users studying on mobile (subway, airplane, spotty Wi-Fi) lose access entirely.

**Goal**: Cards and study sessions should work offline. Data syncs when connectivity returns.

## Requirements

1. **Offline reads** — users can browse their sets and cards without a connection
2. **Offline study** — Focus Study and SRS review sessions work offline (reveal cards, rate them)
3. **Write sync** — ratings, session progress, and SRS state changes are queued locally and synced when back online
4. **Conflict resolution** — minimal concern since writes are per-user and mostly additive (new ratings, advancing indices)
5. **PWA install** — app shell, icons, manifest are properly cached for instant load

## Alternatives Explored

### Option A: Service Worker + IndexedDB Cache (selected)

**How it works:**
- **Serwist** (the maintained successor to `next-pwa`) adds a service worker to cache the app shell, static assets, and Next.js pages
- **IndexedDB** (via the `idb` library) acts as a local read cache — Convex query results are mirrored into IndexedDB on every successful fetch
- When offline, the app reads from IndexedDB instead of Convex
- Mutations are stored in an IndexedDB "outbox" queue and replayed against Convex when connectivity returns
- An online/offline indicator lets the user know their state

**Pros:**
- No backend changes required — Convex stays as-is
- Simple mental model: cache reads, queue writes, sync later
- Works well for our data patterns (reads are frequent, writes are additive and per-user)
- Serwist is actively maintained and designed for Next.js App Router
- IndexedDB is available in all modern browsers and has ample storage (typically 50%+ of disk)

**Cons:**
- Cache can become stale if the user is offline for extended periods
- No real-time reactivity while offline (acceptable — user is studying alone)
- We must build the caching and sync layer ourselves (no off-the-shelf Convex integration)
- Conflict resolution for edge cases (e.g., set deleted on server while user is offline) must be handled manually

**Estimated effort:** 2-3 days

---

### Option B: Automerge + Convex (CRDT hybrid)

**How it works:**
- Automerge is a CRDT (Conflict-free Replicated Data Type) library that maintains a local document that can be edited offline and merged without conflicts
- Convex published a [reference architecture](https://stack.convex.dev/automerge-and-convex) showing how to pair Automerge with Convex as the sync backend
- Each user's data lives in an Automerge document locally, synced to Convex when online

**Pros:**
- Robust conflict resolution out of the box (CRDTs guarantee convergence)
- True local-first — the local copy is authoritative, not a cache
- Well-documented pattern from Convex team

**Cons:**
- Significant architectural complexity — every table needs an Automerge document representation
- CRDT overhead (document size grows with edit history)
- Overkill for our use case — we don't have multi-user concurrent edits on the same data
- Automerge documents are opaque blobs from Convex's perspective, so indexed queries and server-side logic (cron jobs, access control) become harder

**Verdict:** Too complex for the problem we're solving. CRDTs shine when multiple users edit the same document — our writes are single-user and additive.

---

### Option C: Replace Convex with a local-first backend

Several platforms offer built-in local-first with sync:

| Platform | Local Storage | Sync | Convex Compatible? |
|----------|--------------|------|-------------------|
| **ElectricSQL** | SQLite (via wa-sqlite) | Postgres sync | No — requires Postgres backend |
| **PowerSync** | SQLite | Postgres/Supabase sync | No — requires Postgres backend |
| **Zero** (Rocicorp) | IndexedDB | Custom sync server | No — requires its own backend |
| **TinyBase** | IndexedDB | Custom sync adapters | Partial — no Convex adapter exists |

**Pros:**
- Purpose-built for local-first with battle-tested sync
- Rich offline capabilities including conflict resolution

**Cons:**
- All require abandoning Convex — complete backend rewrite
- Lose Convex's real-time reactivity, auth integration, and serverless functions
- Massive effort for a problem that has a simpler solution

**Verdict:** Not viable without a full backend migration. The effort-to-benefit ratio is terrible when Option A solves the problem adequately.

---

## Selected Approach: Option A

Service Worker (Serwist) + IndexedDB read cache + write queue. No backend changes.

## Implementation Overview

### Layer 1: PWA Shell (Serwist)

**What:** Service worker that caches the app shell (HTML, JS, CSS, images) for instant offline load.

**Key decisions:**
- Use Serwist's `@serwist/next` integration for App Router compatibility
- Cache strategy: **stale-while-revalidate** for static assets, **network-first** for API/data routes
- Precache all app routes so navigation works offline
- Add `manifest.json` with app name, icons, theme color (may already partially exist)

**Files involved:**
- `next.config.ts` — Serwist plugin integration
- `src/app/manifest.ts` — PWA manifest
- `src/sw.ts` — service worker entry point

### Layer 2: IndexedDB Read Cache

**What:** Mirror Convex query results into IndexedDB. When offline, read from the cache instead of Convex.

**Key decisions:**
- Use the `idb` library (thin, promise-based wrapper over IndexedDB)
- Cache these tables: `flashcardSets`, `flashcards`, `userSets`, `srsCards`, `reviewQueue`
- NOT cached: `studySessions`, `cardResults`, `srsReviews` (session-scoped, not needed offline)
- Cache is populated/updated on every successful Convex query response
- Create a custom React hook (e.g., `useOfflineQuery`) that wraps `useQuery`:
  - Online: returns Convex data, updates IndexedDB in background
  - Offline: returns IndexedDB data, marks as stale

**Schema mapping:**
```
IndexedDB "flashcard-cache" database:
  flashcardSets: keyPath="_id"
  flashcards:    keyPath="_id", index on setId
  userSets:      keyPath="_id", index on userId
  srsCards:      keyPath="_id", index on [userId, setId]
  reviewQueue:   keyPath="_id", index on userId
```

**Files involved:**
- `src/lib/offlineDb.ts` — IndexedDB schema + CRUD helpers
- `src/lib/useOfflineQuery.ts` — hook wrapping useQuery with cache fallback

### Layer 3: Offline Write Queue (Outbox)

**What:** When offline, store mutations in an IndexedDB "outbox" table. When connectivity returns, replay them in order against Convex.

**Key decisions:**
- Outbox stores: `{ id, mutationName, args, createdAt, status }`
- Status: `pending` → `syncing` → `synced` (or `failed`)
- On reconnect, process the queue sequentially (order matters for SRS state)
- Failed mutations are retried with exponential backoff (max 3 retries)
- Create a custom hook (e.g., `useOfflineMutation`) that wraps `useMutation`:
  - Online: calls Convex directly (normal behavior)
  - Offline: stores in outbox, returns optimistically

**Conflict handling:**
- **Card rating while offline**: Queue the `recordReview` mutation. On sync, if the reviewQueue item was already deleted (e.g., by cron), skip gracefully.
- **Set deleted while offline**: On sync, mutation fails with "Not found". Remove from local cache, show user notification.
- **SRS state divergence**: The server always wins. After sync, refresh the local cache from Convex.

**Files involved:**
- `src/lib/offlineOutbox.ts` — outbox CRUD + sync logic
- `src/lib/useOfflineMutation.ts` — hook wrapping useMutation with outbox fallback
- `src/lib/syncManager.ts` — listens for online/offline events, triggers outbox drain

### Layer 4: UI Indicators

**What:** Let the user know when they're offline and when data is syncing.

- Subtle banner or icon in header when offline ("Offline — changes will sync when connected")
- Sync indicator when outbox is draining ("Syncing 3 changes...")
- Toast notification if a queued mutation fails after retry

**Files involved:**
- `src/components/OfflineIndicator.tsx`

### Integration Points

The existing codebase uses two patterns for data:
1. **Server components** with `preloadQuery` — these won't work offline (server can't be reached). Offline fallback needs to happen at the client level.
2. **Client components** with `useQuery` / `useMutation` — these are the primary integration point for the offline hooks.

**Key challenge:** Server components that redirect based on data (e.g., "redirect if set not found") won't work offline. Options:
- (a) Make those pages client components when offline (detect at layout level)
- (b) Use a service worker to serve cached HTML for those routes
- Option (b) is cleaner — Serwist handles this via precaching

### Migration Path

The offline layer is additive — no existing code needs to be rewritten. The hooks (`useOfflineQuery`, `useOfflineMutation`) are drop-in replacements for `useQuery` and `useMutation`. Migration can happen incrementally, page by page:

1. Start with the SRS review page (`/srs`) — highest value for offline use
2. Then the study session page
3. Then the dashboard and set detail pages

## Open Questions

- **Cache eviction**: How much data to keep? For a flashcard app, probably everything (total data per user is small — hundreds of cards, not millions of rows). But should we set a max age for stale cache entries?
- **Background sync API**: Should we use the [Background Sync API](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API) for outbox drain, or just listen for `online` events? Background Sync works even after the tab is closed, but browser support is Chrome-only.
- **Server component fallback**: How gracefully can we degrade server components when offline? Need to prototype this.
