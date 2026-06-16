# Merge Flashcard Sets — Design Spec

Date: 2026-06-15
Status: Approved design, pending implementation plan
Author: brainstorming session

## Summary
Add ability to create a new flashcard set by merging 2+ existing sets the user owns or is a member of. Cards are copied as new with fresh SRS history, deduplicated by exact field values. Source sets can optionally be archived (hidden from lists, visibility forced private, SRS paused). Requires identical field schemas across sources. New UI at `/sets/merge`, new Convex mutation `flashcardSets.merge`, schema changes for set archived state and structured card origin with source tracking.

## Goals
- Let users combine related sets without manual CSV export/import
- Preserve provenance: track which source set each merged card came from
- Offer clean lifecycle management via archive, not delete
- Follow existing fork pattern for consistency, keep v1 simple

## Non-Goals
- Moving cards instead of copying (destructive consolidation out of scope)
- Merging sets with different schemas (v1 requires exact match)
- Preserving SRS history from sources (fresh SRS by design)
- Delete source sets action (archive only in v1)
- Real-time sync between source and merged set (copy is point-in-time snapshot)

## 1. Data Model Changes

### src/lib/types.ts
- Replace `FLASHCARD_ORIGINS` string array with discriminated union:
  ```ts
  export type FlashcardOrigin =
    | { kind: "manual" }
    | { kind: "csv_import" }
    | { kind: "ai_generated" }
    | { kind: "forked"; sourceSetId?: Id<"flashcardSets"> }
    | { kind: "merged"; sourceSetId: Id<"flashcardSets"> };
  ```
- Add `"merged"` to set origin union in same file. New set origin shape:
  ```ts
  | { kind: "merged"; sourceSetIds: Id<"flashcardSets">[]; mergedAt: number }
  ```
- Provide `normalizeCardOrigin` helper used in every read path: accepts string legacy values (`"manual"` etc) or object, returns object form; maps unknown kind strings or unknown object kinds to `{kind:"manual"}` fallback for forward compatibility. All UI components and Convex query output mappers must call this helper before rendering origin badge or logic.
- Update `isPublicFlashcardSet` helper to also require archivedAt undefined in addition to visibility check.

### convex/schema.ts
- New `cardOriginValidator` as union of legacy string literals AND new object shapes for transition period. Long term object-only, but v1 accepts both to allow gradual migration and rollback. Validator does not perform mapping; mapping happens in normalize helper at application boundary.
- `flashcardSets` table add `archivedAt: v.optional(v.number())`.
- No new index on flashcardSets for archived filtering because list query is driven by userSets. Filtering happens in memory after joining userSets to sets. Acknowledge pagination risk: with `.take(100)` on userSets, if many archived sets are in first 100 links, active sets beyond 100 may be hidden until archived are unarchived or pagination improved. Acceptable for v1 side project; future improvement could denormalize archived flag onto userSets with index.
- `setOriginValidator` add merged kind object as above, accept legacy shapes, and be permissive to unknown kinds for forward compatibility (treat unknown as manual in normalize helper, not in validator).
- Update existing fork mutation to write card origin as object `{kind:"forked", sourceSetId}` instead of string.

### Migration and Rollback
- No active users per AGENTS.md. Existing cards with string origin normalized on read via helper. New writes use object form.
- Rollback safety: validators accept both string and object forms permanently in v1 to allow revert. True rollback to pre-merge code would require either keeping normalize helper in old code path, or running one-time migration script to convert object origins back to legacy strings (`{kind:"merged",...}` -> `"manual"` fallback, `{kind:"forked",sourceSetId}` -> `"forked"`). Spec calls out that rollback without code support breaks reading merged sets; recommended rollback path is keep permissive validators, not revert schema.

## 2. Backend — convex/flashcardSets.ts merge mutation

New export `merge` mutation args:
```ts
{
  sourceSetIds: v.array(v.id("flashcardSets")),
  archiveSource: v.boolean(),
}
```

Effect pipeline steps:
1. requireAuth, get tokenIdentifier.
2. Validate input limits: sourceSetIds length between 2 and 5 inclusive, unique IDs only, else invalidInput. Enforce v1 cap to bound transaction size; future work can use scheduler for larger merges.
3. Fetch each source set, verify exists. Fetch userSets link via `by_userId_and_setId`. Fail forbidden if no link (must be owner or member).
4. Verify all source fieldDefinitions deep-equal (name, role, order, metadata). Fail invalidInput listing mismatched set names.
5. Query active flashcards per source via `by_setId`, then sort in memory by `order` ascending to define deterministic source order (not query index order). Filter archivedAt undefined. Compute deduplication key = stable JSON stringify of sorted fields. Track winning sourceSetId per unique key (first source in input order wins, tie-break by lower card order). Total unique count must be >0 and <= 2000 for v1 (lower than MAX_CARDS_PER_SET to stay within Convex transaction limits; existing MAX is 10000 but merge is heavier due to per-card origin and SRS enrollment). Fail conflict if exceeded.
6. If archiveSource true, verify caller is owner on each source set, else fail forbidden listing non-owned sets.
7. Create new flashcardSet:
   - name: `Merged set YYYY-MM-DD` (user renames after)
   - description: auto-generated list of source names
   - fieldDefinitions: cloned from first source
   - ownerId: caller tokenIdentifier
   - origin: `{kind:"merged", sourceSetIds, mergedAt: now}`
   - visibility: "private", archivedAt undefined, cardCount = deduped count, createdAt/updatedAt now
8. Insert userSets owner link with srsEnabled true, default front/back from fieldDefinitions via getDefaultFieldLayout.
9. Batch insert cards with per-card origin:
   - Extend `convex/lib/cardCreation.ts` with new helper `createInitialCardsForSetWithOrigins` accepting cards array where each card includes `origin` object override. Helper must not assert single origin for whole batch, must handle per-card origin.
   - For each unique card in deterministic order (source input order, then card order ascending), insert into flashcards table with fields copied, order sequential starting at 0, origin `{kind:"merged", sourceSetId: winningSourceId}`, archivedAt undefined.
   - Use DELETION_BATCH_SIZE chunks within single mutation; acknowledge Convex transaction limits — v1 caps at 2000 cards and 5 sources to mitigate. Future improvement: use scheduler to chunk across mutations for larger merges.
   - Enroll owner in SRS via helper similar to fork path.
10. Post-action archive: if archiveSource true, for each source where caller is owner, patch flashcardSets with archivedAt=now and visibility="private". Do NOT modify userSets.srsEnabled — preserve each user's SRS preference. Instead, delete all reviewQueue rows for that setId across all users (query reviewQueue by set index or via srsCards join, delete in batches similar to existing disable-SRS cleanup pattern in userSets.ts). This ensures archived sets do not contribute to queue counts or block refresh. srsEngine and all queue stats paths must defensively filter out archived sets by joining to flashcardSets and checking archivedAt undefined.
11. Return `{setId, skippedDuplicateCount}`.

New mutations:
- `unarchive` args `{id}` owner only, clears archivedAt, restores visibility to private (user can change later). Does NOT modify userSets.srsEnabled — respects existing user preference. SRS queue will naturally repopulate on next engine run for users who have srsEnabled true.
- `updateVisibility` add guard rejecting change to public or unlisted when target set has archivedAt defined; only private allowed while archived. UI hides visibility controls for archived sets.

Updated queries:
- `list` add optional arg `includeArchived` default false. After fetching userSets links (take 100), join to flashcardSets and filter out where archivedAt defined in memory. Document pagination limitation in code comment.
- `listPublic` add defensive filter to exclude archivedAt defined even if visibility somehow public.
- `searchPublic` and `searchPublicCombined` add archivedAt filter similarly; update `isPublicFlashcardSet` helper in src/lib/types.ts to require archivedAt undefined as well as visibility public.
- `updateVisibility` add guard: if set.archivedAt defined, reject visibility change to public or unlisted, allow only private. Return invalidInput with clear message.
- srsEngine and reviewQueue stats paths: add defensive join/filter to exclude archived sets when counting queue rows, building sessions, or hydrating review cards. Archive action deletes reviewQueue rows for archived set across all users to prevent stale counts.

Error types: CommonFailure plus invalidInput for schema mismatch, forbidden for permission, conflict for limit exceeded, notFound.

Partial failure handling: if card insertion fails mid-way, Effect cleanup deletes partially created set and userSets link. Best effort, acceptable for side project.

## 3. Frontend UI Flow

New route `src/app/sets/merge/page.tsx`:
- Server preloads `api.flashcardSets.list` (non-archived).
- Client `MergeClient` component:
  - Checklist table of eligible sets showing name, cardCount, field summary, owner/member badge. Disabled with tooltip if schema differs from first selection.
  - Selection counter, live total estimated unique cards, duplicate estimate placeholder.
  - Checkbox "Archive source sets after merge" with helper text explaining sets will be hidden from lists, set private, SRS paused. Disabled if any selected set is member-only, with tooltip listing those sets.
  - Primary button Merge disabled until >=2 sets selected, schemas match, total within limit.
  - On submit calls `useMutation(api.flashcardSets.merge)`, shows loading state, on success toast with skipped duplicate count and router push to `/sets/[newId]`.
  - Uses existing UI primitives from `src/components/ui`, matches header style of sets page.

Update `src/app/sets/SetsClient.tsx`:
- Add "Merge sets" button next to Quick Create / New Set linking to `/sets/merge`.

Update `FlashcardSetList` component:
- Filter out archived sets by default (relies on updated list query). Future backlog: toggle to show archived.

Update `SetDetailInner` visibility UI:
- Hide visibility dropdown or disable public/unlisted options when set is archived, show archived badge and unarchive button instead. Prevents archived sets becoming public via UI; server guard is authoritative.

No changes to New Set wizard. Merge is separate action, not creation method.

## 4. Permissions and Archived State

- Source eligibility: userSets role owner OR member.
- Archive action: owner only per source. Mutation fails upfront if archive requested but any source is member-only.
- Archived semantics:
  - flashcardSets.archivedAt timestamp set, visibility forced private.
  - list queries exclude archived by default via in-memory filter after userSets join; pagination limitation documented.
  - Direct link `/sets/[id]` still works, shows archived badge in UI, hides visibility controls except unarchive.
  - userSets.srsEnabled is NOT modified on archive or unarchive — preserves user preference. Archive action deletes all reviewQueue rows for that set across all users to clear pending counts. srsEngine, queue stats, and session builders defensively filter out archived sets.
  - unarchive mutation reverses: clears archivedAt, leaves visibility private and srsEnabled untouched. SRS naturally resumes for users with srsEnabled true on next engine run.
  - updateVisibility mutation rejects public/unlisted while archived.
- No delete action in v1 per product decision.

## 5. Error Handling and Edge Cases

- Schema mismatch: client prevents selection, server validates and returns invalidInput with names.
- Card limit exceeded after dedup: conflict error with count shown. v1 caps at 2000 cards and max 5 source sets to stay within Convex transaction limits; document future scheduler-based batching for larger merges.
- Empty result after dedup: invalidInput require at least 1 card (defensive, empty sets shouldn't exist per product note).
- Duplicate selection: client dedupes, server validates unique IDs.
- Archived source sets filtered from selection UI and rejected server-side if passed.
- Archived visibility guard: updateVisibility rejects public/unlisted on archived sets server-side; UI hides controls. searchPublic paths also filter archived.
- Source order definition: merge preserves card order field value from source, final merged set orders by source input order then by original card order ascending (not query index order).
- Concurrent source edits during merge ignored — copy is snapshot.
- SRS fresh start confirmed, no history carryover. Archived source sets clear reviewQueue for all users and are filtered defensively in srsEngine and queue stats; user srsEnabled preference preserved.
- Partial failure cleanup best effort delete new set.
- Rollback safety via permissive validators accepting string and object forms, normalize helper mapping unknown to manual fallback, and documented migration script requirement for true rollback.

## 6. Testing Strategy

Types first per AGENTS.md:
- Update TypeScript types, ensure convex codegen passes.

Unit tests `pnpm test`:
- `convex/flashcardSets.merge.test.ts` testing pure deduplication function, schema match validator, permission checks mocked, archive flag behavior, limit enforcement (5 sources, 2000 cards cap), per-card origin tracking, source order tie-breaking.
- Update existing fork tests for new card origin object shape.
- Test list query archived filter and pagination behavior with mixed archived/active.
- Test updateVisibility guard rejecting public on archived, and searchPublic filtering archived.
- Test srsEngine skips archived sets and reviewQueue cleared on archive.
- Test card origin validator accepts legacy strings and new objects, normalize helper maps unknown to manual fallback, and handles rollback scenario.

E2E `pnpm test:e2e` (user to run, agents can't):
- Seed two sets with identical schema via UI or API, navigate to /sets/merge, select both, merge, verify new set card count equals sum minus duplicates, verify sources archived when checked, verify new set origin shows merged badge.

Manual checklist in PR description.

## 7. Rollout and Observability

- Side project, no active users, no backfill needed.
- Experimental feature acceptable. Rollback safety: origin validators accept both string and object forms permanently in v1. Normalize helper maps unknown kinds to manual fallback on read. True rollback to pre-merge code without helper would require migration script converting object origins back to legacy strings; document this in rollback runbook section.
- Observability: rely on existing Sentry instrumentation, Convex logs for mutation failures. Add log on merge start with source count and card count for transaction monitoring.

## 8. Future Backlog Items
- Per-card provenance UI showing source set name in card detail view.
- Show archived toggle in sets list.
- Extend card origin object to fork as well with mandatory sourceSetId (already planned in this spec partially).
- Allow schema mapping UI for merging different schemas.
- Merge as creation method in wizard if usage justifies.

## Open Questions Resolved in Session
- Copy not move: confirmed.
- Identical schema required: confirmed.
- Owner or member can merge, archive owner-only: confirmed.
- Archive state as archivedAt + private visibility: confirmed.
- Deduplicate exact matches: confirmed.
- Auto-name with date: confirmed.
- No delete action: confirmed.
- Structured card origin with sourceSetId: confirmed.
