# AI CLI Remedial Sets Workflow

> Status: Current
> Last reviewed: 2026-05-24
> Source of truth: Yes, for the CLI/tooling workflow.

## Purpose

Generate remedial flashcard sets with an external assistant while keeping the app in control of auth, validation, and import.

Search terms: `flashcard-ai`, `remedial-prompt`, `weak-cards`, `generated-set`, `/tooling/v1`, `fcai_`.

This workflow has three parts:

- local CLI: `pnpm flashcard-ai`
- tooling HTTP API: `/tooling/v1/*`
- generated set JSON reviewed by the user before import

## When To Use This

Use this workflow when the user wants to bring their own external assistant instead of using the in-app BYOK LLM flow.

- User can use any assistant.
- Generated JSON can be inspected locally before import.
- Tooling tokens are scoped and revocable.
- Generated cards are validated before import.
- Remedial sets remain normal flashcard sets and can be enrolled in SRS.

Use in-app AI when the user wants a faster integrated generation or study-assistant flow and is comfortable saving a provider key in app settings.

## Quick Command Reference

```bash
pnpm flashcard-ai workflow
pnpm flashcard-ai login --site-url https://<deployment>.convex.site --token fcai_<publicId>_<secret>
pnpm flashcard-ai sets list --include-srs-summary --include-schema --out sets.json
pnpm flashcard-ai srs remedial-prompt --scope srs-enabled --methodology balanced --target-card-count 20 --out remedial-prompt.md
pnpm flashcard-ai generated-set validate --file generated-set.json
pnpm flashcard-ai generated-set create --file generated-set.json --add-to-srs
```

## End-To-End Workflow

1. Enable CLI access in Settings and copy the one-time token.
2. Store the token locally:

   ```bash
   pnpm flashcard-ai login --site-url https://<deployment>.convex.site --token fcai_<publicId>_<secret>
   ```

3. Export set metadata and SRS summary:

   ```bash
   pnpm flashcard-ai sets list --include-srs-summary --include-schema --out sets.json
   ```

4. Export an assistant-ready remedial prompt:

   ```bash
   pnpm flashcard-ai srs remedial-prompt \
     --scope srs-enabled \
     --methodology balanced \
     --target-card-count 20 \
     --out remedial-prompt.md
   ```

5. Ask an external assistant to create `generated-set.json` from `remedial-prompt.md`.
6. Validate before import:

   ```bash
   pnpm flashcard-ai generated-set validate --file generated-set.json
   ```

7. Import as a normal flashcard set:

   ```bash
   pnpm flashcard-ai generated-set create --file generated-set.json --add-to-srs
   ```

## Weak Context Export

The remedial prompt command wraps the weak-card context in assistant instructions. For raw JSON, use:

```bash
pnpm flashcard-ai srs weak-cards --scope srs-enabled --out weak-cards.json
```

Methodologies:

- `balanced`
- `recent-lapses`
- `low-ease`
- `learning-stuck`

Scope can be all SRS-enabled sets or one set. The export includes bounded SRS context:

- recent misses
- hard cards
- low ease factors
- learning cards
- source set IDs
- source card IDs
- field definitions
- schema fingerprints

## Generated Set Contract

Generated sets are normal flashcard sets with:

```ts
origin.kind = "ai_generated"
```

Generated payloads should:

- preserve one schema group's `fieldDefinitions`
- include relevant `sourceSetIds`
- include relevant `sourceCardIds` where possible
- create cards targeting weak SRS signals
- set `addToSrs` according to user intent

Validation happens before create, so malformed assistant output does not become app data.

## Security Model

- CLI tokens are created by an authenticated user in Settings.
- The full token is shown only once on creation/rotation.
- Tokens are hashed in Convex; the backend stores public ID and secret hash, not the full token.
- Tokens are scoped, revocable, and expire after inactivity.
- The CLI never sends a user ID. The backend derives the owner from the token.
- The generated assistant prompt does not include CLI tokens or auth headers.

Initial scopes:

- `sets:read`
- `weak_context:read`
- `ai_sets:create`
- `srs:enroll`

## Tooling HTTP API

All endpoints require:

```http
Authorization: Bearer fcai_<publicId>_<secret>
```

Endpoints:

- `POST /tooling/v1/token/status`
- `POST /tooling/v1/sets/list`
- `POST /tooling/v1/srs/weak-cards`
- `POST /tooling/v1/generated-sets/validate`
- `POST /tooling/v1/generated-sets/create`

## Implementation Files

- CLI entry point: `scripts/flashcard-ai.ts`
- HTTP routes: `convex/http.ts`
- token lifecycle: `convex/cliTokens.ts`
- tooling schemas: `src/lib/aiToolingSchemas.ts`
- prompt rendering: `convex/lib/remedialPrompt.ts`
- settings UI: `src/app/settings/CliTokenSection.tsx`

## Related Docs

- Product rationale: `docs/product/product-decisions.md`
- Historical rollout decision: `docs/decisions/005-ai-cli-remedial-sets.md`
