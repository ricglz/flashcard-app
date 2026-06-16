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
- Provide backward-compat helper `normalizeCardOrigin` to read legacy string origins as `{kind}` objects during transition.

### convex/schema.ts
- New `cardOriginValidator` object union matching above TypeScript type, replacing `literalUnion(FLASHCARD_ORIGINS)`.
- `flashcardSets` table add `archivedAt: v.optional(v.number())`.
- Add index `by_ownerId_and_archivedAt` or filter in queries; list queries default to exclude archived.
- `setOriginValidator` add merged kind object as above.
- Update existing fork mutation to write card origin as object `{kind:"forked", sourceSetId}` instead of string.

### Migration
No active users per AGENTS.md. Existing cards with string origin will be normalized on read by helper, and rewritten to object form on next write path or via one-time backfill script if needed. Accept breaking change in dev.

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
2. Fetch each source set, verify exists. Fetch userSets link via `by_userId_and_setId`. Fail forbidden if no link (must be owner or member).
3. Verify all source fieldDefinitions deep-equal (name, role, order, metadata). Fail invalidInput listing mismatched set names.
4. Query active flashcards per source via `by_setId`, filter archivedAt undefined. Compute deduplication key = stable JSON stringify of sorted fields. Total unique count must be >0 and <= MAX_CARDS_PER_SET else fail conflict.
5. If archiveSource true, verify caller is owner on each source set, else fail forbidden listing non-owned sets.
6. Create new flashcardSet:
   - name: `Merged set YYYY-MM-DD` (user renames after)
   - description: auto-generated list of source names
   - fieldDefinitions: cloned from first source
   - ownerId: caller tokenIdentifier
   - origin: `{kind:"merged", sourceSetIds, mergedAt: now}`
   - visibility: "private", archivedAt undefined, cardCount = deduped count, createdAt/updatedAt now
7. Insert userSets owner link with srsEnabled true, default front/back from fieldDefinitions via getDefaultFieldLayout.
8. Batch insert cards:
   - For each source in order, for each unique card, insert into flashcards table with fields copied, order sequential, origin `{kind:"merged", sourceSetId: source._id}`, archivedAt undefined.
   - Use DELETION_BATCH_SIZE chunks similar to fork.
   - Call createInitialCardsForSet helper to enroll in SRS for owner.
9. Post-action archive: if archiveSource true, for each source where caller is owner, patch flashcardSets with archivedAt=now and visibility="private", and patch userSets link to set srsEnabled false to pause reviews.
10. Return `{setId, skippedDuplicateCount}`.

New mutations:
- `unarchive` args `{id}` owner only, clears archivedAt, restores visibility to private (user can change later), sets srsEnabled true.

Updated queries:
- `list` add optional arg `includeArchived` default false, filter out archivedAt defined.
- `listPublic` unchanged (archived sets are private anyway).

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

No changes to New Set wizard. Merge is separate action, not creation method.

## 4. Permissions and Archived State

- Source eligibility: userSets role owner OR member.
- Archive action: owner only per source. Mutation fails upfront if archive requested but any source is member-only.
- Archived semantics:
  - flashcardSets.archivedAt timestamp set, visibility forced private.
  - list queries exclude archived by default.
  - Direct link `/sets/[id]` still works, shows archived badge in UI (future).
  - userSets srsEnabled set false on archive to pause SRS reviews.
  - unarchive mutation reverses: clears archivedAt, sets srsEnabled true, leaves visibility private for user to adjust.
- No delete action in v1 per product decision.

## 5. Error Handling and Edge Cases

- Schema mismatch: client prevents selection, server validates and returns invalidInput with names.
- Card limit exceeded after dedup: conflict error with count shown.
- Empty result after dedup: invalidInput require at least 1 card (defensive, empty sets shouldn't exist per product note).
- Duplicate selection: client dedupes, server validates unique IDs.
- Archived source sets filtered from selection UI.
- Concurrent source edits during merge ignored — copy is snapshot.
- SRS fresh start confirmed, no history carryover.
- Partial failure cleanup best effort delete new set.

## 6. Testing Strategy

Types first per AGENTS.md:
- Update TypeScript types, ensure convex codegen passes.

Unit tests `pnpm test`:
- `convex/flashcardSets.merge.test.ts` testing pure deduplication function, schema match validator, permission checks mocked, archive flag behavior, limit enforcement.
- Update existing fork tests for new card origin object shape.
- Test list query archived filter.

E2E `pnpm test:e2e` (user to run, agents can't):
- Seed two sets with identical schema via UI or API, navigate to /sets/merge, select both, merge, verify new set card count equals sum minus duplicates, verify sources archived when checked, verify new set origin shows merged badge.

Manual checklist in PR description.

## 7. Rollout and Observability

- Side project, no active users, no backfill needed.
- Experimental feature acceptable with clear rollback: revert commit removes route and mutation, existing merged sets remain readable as manual sets with new origin kind (graceful degradation).
- Observability: rely on existing Sentry instrumentation, Convex logs for mutation failures.

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
