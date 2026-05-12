# AI CLI Remedial Sets

This feature lets an external assistant generate remedial flashcard sets without the app calling an LLM API. The app exposes a narrow, token-protected tooling API; a local CLI exports weak SRS context and creates AI-generated sets after the assistant prepares JSON.

## Workflow

1. Enable CLI access from the app settings and copy the one-time token.
2. Run `flashcard-ai login` and paste the token.
3. Run `flashcard-ai sets list --include-srs-summary` to discover SRS-enabled sets.
4. Run `flashcard-ai srs weak-cards --scope srs-enabled --out context.json` to export bounded weak-card context.
5. Ask an assistant to generate one or more remedial set JSON files from that context.
6. Run `flashcard-ai generated-set validate --file generated-set.json`.
7. Run `flashcard-ai generated-set create --file generated-set.json --add-to-srs` after review.

## Security model

CLI tokens are created by an authenticated user in the UI. Tokens are hashed in Convex, shown once, scoped, revocable, and expire after 24 hours of inactivity. The CLI never sends a user id; the backend derives the owner from the token.

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
