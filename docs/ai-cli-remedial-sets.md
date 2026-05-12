# AI CLI Remedial Sets

This feature lets an external assistant generate remedial flashcard sets without the app calling an LLM API. The app exposes a narrow, token-protected tooling API; a local CLI exports weak SRS context and creates AI-generated sets after the assistant prepares JSON.

## Workflow

1. Enable CLI access from the app settings and copy the one-time token.
2. Run `flashcard-ai login` and paste the token.
3. Run `flashcard-ai sets list --include-srs-summary` to discover SRS-enabled sets.
4. Run `flashcard-ai srs remedial-prompt --scope srs-enabled --out remedial-prompt.md` to export an assistant-ready prompt with bounded weak-card context.
5. Ask an assistant to generate one or more remedial set JSON files from that prompt.
6. Run `flashcard-ai generated-set validate --file generated-set.json`.
7. Run `flashcard-ai generated-set create --file generated-set.json --add-to-srs` after review.

You can print a detailed local workflow at any time:

```bash
flashcard-ai workflow
```

For SRS-history-based card generation, export an assistant-ready prompt first:

```bash
flashcard-ai sets list --include-srs-summary --include-schema --out sets.json
flashcard-ai srs remedial-prompt --scope srs-enabled --methodology balanced --target-card-count 20 --out remedial-prompt.md
```

Then ask an assistant to create a `generated-set.json` payload from `remedial-prompt.md`. The generated set should preserve one schema group's `fieldDefinitions`, include relevant `sourceSetIds` and `sourceCardIds`, and create new remedial cards that target recent misses, hard cards, low ease factors, or learning cards.

The `remedial-prompt` command does not call an LLM and does not require an OpenAI, Anthropic, or other provider API key. It only uses the local Flashcard CLI token to fetch SRS context, and it does not include CLI tokens or auth headers in the generated prompt.

## Security model

CLI tokens are created by an authenticated user in the UI. The full token is returned and shown only once immediately after creation or rotation, so copy it before leaving the settings page. After that, status views only show masked public metadata.

Tokens are hashed in Convex, scoped, revocable, and expire after 24 hours of inactivity. Convex stores the token public id and secret hash, not the full secret token. The CLI never sends a user id; the backend derives the owner from the token.

If an older copied token fails to authenticate, rotate CLI access in settings and run `flashcard-ai login` with the new token.

For non-interactive login, pass the copied token directly:

```bash
flashcard-ai login --site-url https://<deployment>.convex.site --token fcai_<publicId>_<secret>
```

Initial scopes are:

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

The default weak-card scope is all SRS-enabled sets. `sets/list` is lightweight discovery; full card contents and study-performance context are only returned by `srs/weak-cards`.

## Generated set metadata

Generated sets are normal flashcard sets with `origin.kind = "ai_generated"`. They are kept separate from source sets and can be enrolled in SRS like any other set.
