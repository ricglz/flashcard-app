# Decision: Build AI Remedial Sets Through a CLI First

> Status: Accepted
> Last reviewed: 2026-05-12

## Decision

Implement AI-assisted remedial set generation through a local CLI and token-protected tooling API before building in-app BYOK LLM calls.

## Why

This gives users targeted AI generation while avoiding early commitment to LLM provider integrations.

Benefits:

- No LLM API keys stored in the app.
- No platform LLM cost.
- User can use any external assistant.
- Prompt export is bounded and excludes auth tokens.
- Generated JSON is validated before import.

## Tradeoffs

- Less seamless than an in-app “Suggest cards” button.
- Requires local CLI usage.
- The app cannot directly control assistant quality or model choice.
- In-app suggestion review/edit UI is deferred.

## Related Files

- `docs/ai-cli-remedial-sets.md`
- `scripts/flashcard-ai.ts`
- `convex/tooling.ts`
- `convex/http.ts`
- `src/lib/aiToolingSchemas.ts`
