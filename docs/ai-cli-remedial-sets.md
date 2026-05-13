# AI CLI Remedial Sets

> Status: Current
> Last reviewed: 2026-05-12
> Source of truth: Yes, for the current AI-assisted remedial set workflow.

## Purpose

Let a user generate remedial flashcard sets with an external assistant without the app calling an LLM API or storing LLM provider keys. The app exposes a narrow token-protected tooling API; the local CLI exports weak SRS context and imports reviewed generated JSON.

## Why This Exists

This provides AI-assisted value while keeping the app backend simple:

- No OpenAI/Anthropic/etc. keys are stored by the app.
- No platform LLM costs.
- User can use any assistant.
- Generated cards are validated before import.
- Remedial sets remain normal flashcard sets and can be enrolled in SRS.

See `docs/decisions/005-ai-cli-remedial-sets.md`.

## Workflow

1. Enable CLI access from Settings and copy the one-time token.
2. Log in locally:

   ```bash
   pnpm flashcard-ai login --site-url https://<deployment>.convex.site --token fcai_<publicId>_<secret>
   ```

3. Discover sets:

   ```bash
   pnpm flashcard-ai sets list --include-srs-summary --include-schema --out sets.json
   ```

4. Export an assistant-ready prompt:

   ```bash
   pnpm flashcard-ai srs remedial-prompt \
     --scope srs-enabled \
     --methodology balanced \
     --target-card-count 20 \
     --out remedial-prompt.md
   ```

5. Ask an assistant to create `generated-set.json` from `remedial-prompt.md`.
6. Validate the generated set:

   ```bash
   pnpm flashcard-ai generated-set validate --file generated-set.json
   ```

7. Create the generated set:

   ```bash
   pnpm flashcard-ai generated-set create --file generated-set.json --add-to-srs
   ```

Print the detailed local workflow at any time:

```bash
pnpm flashcard-ai workflow
```

## Weak Context Export

For raw weak-card JSON instead of an assistant prompt:

```bash
pnpm flashcard-ai srs weak-cards --scope srs-enabled --out weak-cards.json
```

Supported methodologies:

- `balanced`
- `recent-lapses`
- `low-ease`
- `learning-stuck`

The export can scope to all SRS-enabled sets or a specific set. It includes bounded SRS context such as recent misses, hard cards, low ease factors, learning cards, source set IDs, source card IDs, field definitions, and schema fingerprints.

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

## Tooling API

All endpoints live under `/tooling/v1` and require:

```http
Authorization: Bearer fcai_<publicId>_<secret>
```

Endpoints:

- `POST /tooling/v1/token/status`
- `POST /tooling/v1/sets/list`
- `POST /tooling/v1/srs/weak-cards`
- `POST /tooling/v1/generated-sets/validate`
- `POST /tooling/v1/generated-sets/create`

## Generated Set Expectations

Generated sets are normal flashcard sets with:

```ts
origin.kind = "ai_generated"
```

Generated payloads should:

- preserve one schema group's `fieldDefinitions`;
- include relevant `sourceSetIds`;
- include relevant `sourceCardIds` where possible;
- create cards targeting weak SRS signals;
- set `addToSrs` according to user intent.

Payload schemas live in `src/lib/aiToolingSchemas.ts`.

## Related Files

- `scripts/flashcard-ai.ts`
- `convex/http.ts`
- `convex/tooling.ts`
- `convex/cliTokens.ts`
- `src/lib/aiToolingSchemas.ts`
- `src/app/settings/page.tsx`
