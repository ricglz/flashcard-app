# Product Decisions

> Status: Current
> Last reviewed: 2026-05-24
> Source of truth: Yes, for product direction and durable architecture rationale.

## Purpose

Capture product intent and durable decisions that are not obvious from reading the code. Implementation details belong in source, tests, and focused decision records.

## Vision

A Chinese-first flashcard app that is easier to use than Anki while keeping enough flexibility for other languages and subjects. The app starts as a PWA with cloud sync and offline support, with a possible native mobile app later.

## Product Principles

- Sets should feel simple for language learners, but the data model should not hardcode Chinese-only assumptions.
- Users should be able to study intentionally, review on a schedule, and inspect or correct their own material without fighting the app.
- Offline behavior should preserve solo study and review workflows, not turn the app into a separate local-first database.
- AI should help create or explain study material while keeping user review and schema validation in the loop.

## Key Decisions

### Generic Field-Based Data Model

The app is Chinese-first but not Chinese-only. Field definitions let each set choose its own shape while the UI uses roles and metadata for behavior. See `docs/decisions/001-field-based-data-model.md`.

### Field Metadata for TTS

TTS belongs to individual fields, not the whole set. This removed the need for a top-level language field and allows future metadata-driven behavior. Web Speech API remains the default because it requires no provider setup or key storage; external TTS remains optional/future.

### Focus Study and SRS Both Exist

Focus Study supports intentional drilling of a specific set. SRS supports daily scheduled review. They solve different study needs, so both are first-class. See `docs/decisions/003-focus-study-and-srs.md`.

### Offline Cache and Outbox Instead of Full Local-First

The app needs offline study, but not multi-user collaborative conflict resolution. Query caching plus mutation replay gives most of the value without replacing Convex or adopting CRDT complexity. See `docs/decisions/004-offline-cache-and-outbox.md`.

### AI Direction

The app supports in-app BYOK LLM features and a local CLI/tooling workflow. In-app AI is useful for integrated generation and study assistance. The CLI workflow remains useful for external assistants, local review of generated JSON, and narrow token-scoped automation. See `docs/workflows/ai-cli-remedial-sets.md` and `docs/decisions/005-ai-cli-remedial-sets.md`.

## Current Product Direction

- Improve UI polish and consistency.
- Expand offline testing, especially SRS review and reconnect behavior.
- Improve retry safety and idempotency where offline outbox replay touches review/study mutations.
- Strengthen CLI/tooling integration tests.
- Optional high-quality external TTS.
- Multi-modal cards with images/audio.
- Native mobile app.
