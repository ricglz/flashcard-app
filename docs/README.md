# Docs

This directory is for durable product, architecture, workflow, testing, and decision context. Source and tests remain the source of truth for implemented behavior.

## Where To Look

- Product direction: `product/product-decisions.md`
- Offline architecture: `architecture/offline-strategy.md`
- AI CLI remedial sets workflow: `workflows/ai-cli-remedial-sets.md`
- E2E testing setup: `testing/e2e-testing.md`
- Decision records: `decisions/`

## Structure

- `product/` explains product intent and durable direction.
- `architecture/` explains system boundaries and architecture tradeoffs.
- `workflows/` explains operational or user-facing workflows that cross multiple files.
- `testing/` explains test infrastructure and constraints.
- `decisions/` stores concise historical decision records.

Prefer adding docs here only when they explain why something exists, when to use it, or how a cross-file workflow fits together.
