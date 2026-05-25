# Decision: Build AI Remedial Sets Through a CLI First

> Status: Historical, accepted for the CLI-first rollout
> Last reviewed: 2026-05-24

## Decision

Implement AI-assisted remedial set generation through a local CLI and token-protected tooling API as the first AI workflow. In-app BYOK LLM features now also exist, but the CLI remains useful for external assistants and local review.

## Why

This gave users targeted AI generation while avoiding early commitment to LLM provider integrations.

Benefits:

- User can use any external assistant.
- Prompt export is bounded and excludes auth tokens.
- Generated JSON is validated before import.
- Token scopes provide a narrower automation surface than full user auth.

## Tradeoffs

- Less seamless than in-app generation.
- Requires local CLI usage.
- The app cannot directly control assistant quality or model choice.
