# Decision: Store TTS Config in Field Metadata

> Status: Accepted
> Last reviewed: 2026-05-12

## Decision

TTS configuration lives on individual fields as `field.metadata.tts.lang`. The app does not use a top-level set language or a dedicated `ttsEnabled` database column.

## Why

TTS behavior belongs to fields. A Chinese set may speak the Character field but not Pinyin; another set may have multiple speakable fields. Metadata keeps the schema generic while allowing typed helpers to provide safe access.

## Tradeoffs

- Metadata must be normalized and validated at runtime.
- Documentation and examples must use the current metadata shape:

```ts
metadata: { tts: { lang: "zh-CN" } }
```

## Related Files

- `src/lib/types.ts`
- `src/lib/tts.ts`
- `convex/schema.ts`
- `convex/domain/fieldDefinitions.ts`
- `convex/lib/typed.ts`
