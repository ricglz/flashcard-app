# Decision: Use a Field-Based Data Model

> Status: Accepted
> Last reviewed: 2026-05-12

## Decision

Flashcard sets define their own fields. Cards store values as a record keyed by field name instead of hardcoded `front`/`back` or Chinese-specific columns.

## Why

The app is Chinese-first but should support other subjects. A field-based model supports Character/Pinyin/Meaning for Chinese, Spanish/English for Spanish, or arbitrary custom fields without schema changes.

## Tradeoffs

- Runtime validation is required to ensure card fields match set field definitions.
- UI code must work from field definitions instead of fixed columns.
- Some features need semantic roles and metadata to infer behavior.
