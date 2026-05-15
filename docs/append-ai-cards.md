# Append AI-Generated Cards to Existing Sets

## Problem

AI card generation always creates a new set. Users should be able to generate cards and add them to an existing set — growing a set over time with AI assistance.

## Design Decisions

### Per-Card Origin Tracking

Add an optional `origin` field to the flashcards table:
- Values: `"manual"`, `"csv_import"`, `"ai_generated"`
- Existing cards without this field are implicitly the same origin as the set's creation method
- No backfill needed — missing origin is fine

### Set-Level Origin

When AI cards are appended to a non-AI set (e.g., a manual or CSV-imported set), the set's `origin` should become `{ kind: "mixed" }`. This tells the UI the set contains cards from multiple sources. The original creation method info is lost at the set level, but preserved per-card.

Add `"mixed"` as a new variant in `setOriginValidator`.

### Schema Matching

Generated cards must match the existing set's field definitions. Validate using `schemaFingerprint()` from `src/lib/aiToolingSchemas.ts` — it compares field names, roles, and metadata. Reject the append if schemas don't match.

### Card Ordering

Query the max `order` value from existing cards in the set, then insert new cards starting from `maxOrder + 1`. This ensures appended cards appear after existing ones.

### SRS Enrollment

If the target set has SRS enabled (check via `userSets` link), call `enrollCardsForSetHelper()` after inserting cards. This creates `srsCards` entries with initial ease/interval for the new cards only.

## Implementation Approach

### Backend

1. Add `appendToSetId` optional parameter to `confirmGeneratedSet` action and `createGeneratedSetForTool` mutation
2. When `appendToSetId` is present:
   - Validate ownership (reuse `assertOwner`)
   - Validate schema match via fingerprint comparison
   - Query max card order, insert cards sequentially
   - Tag each card with `origin: "ai_generated"`
   - Update set origin to `"mixed"` if it wasn't already AI-generated
   - Enroll in SRS if enabled
3. The `batchCreate` mutation should also accept an optional `origin` field per card (for the wizard AI path)

### Frontend

Add an "AI Generate Cards" button on the set detail page (gated by `hasLlmKey`). Clicking shows an inline form:
- Prompt textarea (freeform)
- Additional instructions (optional)
- Target card count
- Generate button → calls `generateFromPrompt` with the set's existing field definitions
- Preview with select/edit/deselect (reuse patterns from wizard AiPath / GeneratePreview)
- "Add to Set" confirm → calls `confirmGeneratedSet` with `appendToSetId`
- Card list refreshes automatically via Convex subscription

### What NOT to do

- Don't add append as a wizard option — the wizard is for creating new sets
- Don't allow appending cards with mismatched schemas — no schema migration
- Don't change existing card origins when appending — only new cards get tagged
