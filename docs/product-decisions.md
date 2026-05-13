# Product Decisions

> Status: Current
> Last reviewed: 2026-05-12
> Source of truth: Yes, for product direction and high-level architecture.

## Purpose

This document summarizes what the app is, how it works today, and why major product/architecture choices were made. Focused decision records live in `docs/decisions/`; research notes live in `docs/research/`.

## Vision

A Chinese-first flashcard app that is easier to use than Anki while keeping enough flexibility for other languages and subjects. The app starts as a PWA with cloud sync and offline support, with a possible native mobile app later.

## Current Product Shape

### Flashcard Sets

- Sets are private to a user's library by default.
- A set has a name, optional description, field definitions, cards, and an origin.
- Cards are generic records keyed by field name.
- Field definitions control display order, semantic role, and metadata such as TTS language.

### Set Creation

- The primary creation flow is a step-by-step wizard.
- Users can import CSV files or enter cards manually.
- CSV headers become field names.
- Field roles and TTS metadata are configured after cards are visible, so users can make decisions from real data.
- Quick Create still exists for fast preset-based set creation.

### Focus Study

- On-demand scored study for one set.
- User chooses front fields, back fields, optional TTS-only fields, shuffle, and card limit.
- Sessions are persisted in Convex and can be resumed.
- Ratings are `wrong`, `hard`, `good`, and `easy`.

### Browse Mode

- No-scoring practice mode for one set.
- Users can move forward/backward freely and hide cards from the current browse session.
- Useful for familiarization before a scored or SRS review session.

### SRS Queue

- Daily spaced-repetition queue across all SRS-enabled sets.
- Per-user membership and SRS settings live on `userSets`.
- Per-user scheduling state lives on `srsCards`.
- Due cards are materialized into `reviewQueue` by a Convex cron.
- Review history is stored in `srsReviews`.
- Ratings reuse the same internal rating values as Focus Study; SRS UI labels `wrong` as “Again”.

### Progress

- Dashboard shows SRS status, streak, and daily goal.
- Progress page shows daily activity, accuracy, card status breakdown, and per-set mastery.
- `dailyStats` stores aggregated activity for efficient progress views.

### Text-to-Speech

- Web Speech API is the default TTS engine.
- TTS configuration lives on field metadata: `field.metadata.tts.lang`.
- Playback speed is stored in user settings.
- External TTS providers remain optional/future; see `docs/research/tts-api-research.md`.

### Offline Support

- The app uses a custom service worker, IndexedDB query cache, IndexedDB mutation outbox, and reconnect sync.
- Convex remains the source of truth; local data is cache/outbox, not an independent database.
- See `docs/offline-strategy.md`.

### AI Remedial Sets

- Current AI workflow avoids in-app LLM calls.
- User creates a temporary CLI token from Settings.
- Local CLI exports bounded weak SRS context.
- User asks an external assistant to produce generated-set JSON.
- CLI validates and imports the generated set through a token-protected tooling API.
- See `docs/ai-cli-remedial-sets.md`.

## Current Data Model

Main Convex tables:

- `flashcardSets` — set metadata, owner, field definitions, origin.
- `flashcards` — cards in a set.
- `userSets` — per-user set membership, role, SRS enrollment, default SRS study direction.
- `studySessions` — Focus Study session state.
- `cardResults` — Focus Study rating history.
- `srsCards` — per-user scheduling state for each SRS card.
- `reviewQueue` — materialized SRS cards to review.
- `srsReviews` — immutable SRS review log.
- `dailyStats` — aggregated progress data.
- `userSettings` — SRS limits, reset hour, TTS speed, daily goal.
- `cliAccessTokens` — hashed, scoped tokens for the local AI assistant CLI.

## Key Decisions and Why

### Generic Field-Based Data Model

The app is Chinese-first but not Chinese-only. Field definitions let each set choose its own shape while the UI uses roles and metadata for behavior. See `docs/decisions/001-field-based-data-model.md`.

### Field Metadata for TTS

TTS belongs to individual fields, not the whole set. This removed the need for a top-level language field and allows future metadata-driven behavior. See `docs/decisions/002-field-metadata-and-tts.md`.

### Focus Study and SRS Both Exist

Focus Study supports intentional drilling of a specific set. SRS supports daily scheduled review. They solve different study needs, so both are first-class. See `docs/decisions/003-focus-study-and-srs.md`.

### Offline Cache and Outbox Instead of Full Local-First Rewrite

The app needs offline study, but not multi-user collaborative conflict resolution. Query caching plus mutation replay gives most of the value without replacing Convex or adopting CRDT complexity. See `docs/decisions/004-offline-cache-and-outbox.md`.

### AI CLI Before In-App BYOK LLM

The current AI workflow gives value without storing LLM provider keys, paying API costs, or committing to one model/provider. See `docs/decisions/005-ai-cli-remedial-sets.md`.

## Roadmap

### Near-Term

- Improve UI polish and consistency.
- Expand offline testing, especially SRS review and reconnect behavior.
- Improve SRS idempotency and outbox replay edge cases.
- Add stronger CLI/tooling integration tests.

### Later

- Sharing/forking and possible marketplace.
- Card flags, notes, and difficult-card views.
- In-app LLM/BYOK workflows if the CLI workflow proves useful but too manual.
- Optional high-quality external TTS.
- Multi-modal cards with images/audio.
- Native mobile app.
