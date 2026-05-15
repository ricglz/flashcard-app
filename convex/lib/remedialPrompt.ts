import type { WeakCardsResponse } from "../../src/lib/aiToolingSchemas";

export function collectSourceSetIds(context: WeakCardsResponse): string[] {
  return [
    ...new Set(
      context.schemaGroups.flatMap((group) => group.sets.map((set) => set.setId))
    ),
  ];
}

export function compactWeakCardsContext(context: WeakCardsResponse) {
  return {
    scope: context.scope,
    methodology: context.methodology,
    generatedAt: context.generatedAt,
    schemaGroups: context.schemaGroups.map((group) => ({
      schemaFingerprint: group.schemaFingerprint,
      fieldDefinitions: group.fieldDefinitions,
      sets: group.sets.map((set) => ({
        setId: set.setId,
        name: set.name,
        weakCards: set.weakCards.map((card) => ({
          cardId: card.cardId,
          fields: card.fields,
          weakScore: card.weakScore,
          weakReasons: card.weakReasons,
          metrics: card.metrics,
          ...(card.recentRatings !== undefined ? { recentRatings: card.recentRatings } : {}),
        })),
      })),
    })),
  };
}

export function renderRemedialPrompt(options: {
  context: WeakCardsResponse;
  targetCardCount: number;
  name: string;
  addToSrs: boolean;
  instructions?: string;
}): string {
  const { context, targetCardCount, name, addToSrs, instructions } = options;
  const sourceSetIds = collectSourceSetIds(context);
  const firstGroup = context.schemaGroups[0];
  const fieldDefinitions = firstGroup?.fieldDefinitions ?? [];
  const fieldsTemplate = Object.fromEntries(fieldDefinitions.map((field) => [field.name, ""]));
  const sourceScope = context.scope.kind === "set" ? "single_set" : "srs_enabled_sets";

  return `# Generate Remedial Flashcards from SRS Weak Cards

You are helping improve my flashcards based on SRS review history. Create a new remedial flashcard set from the weak-card context below.

## Goal

- Create ${targetCardCount} new remedial cards.
- Target the cards with repeated wrong/hard ratings, low ease factors, learning status, or recently-due-again patterns.
- Create new practice cards, not exact duplicates of the source cards.
- If multiple schema groups are present, produce one generated set for one schema group only unless I explicitly ask for multiple sets.

## Output Requirements

Return only valid JSON. Do not wrap it in Markdown fences. The JSON must match this shape:

${JSON.stringify({
  name,
  description: "Remedial cards generated from SRS weak-card history.",
  sourceSetIds,
  sourceScope,
  weakContextMethodology: context.methodology,
  fieldDefinitions,
  cards: [
    {
      fields: fieldsTemplate,
      sourceCardIds: ["source-card-id"],
      rationale: "Briefly explain which weak pattern this card targets.",
    },
  ],
  addToSrs,
}, null, 2)}

## Generation Rules

- Preserve the selected schema group's \`fieldDefinitions\` exactly.
- Use valid \`sourceSetIds\` from the context.
- Every generated card should include one or more \`sourceCardIds\` from the weak-card context.
- Do not copy source cards exactly; reuse weak words, phrases, or concepts in new contexts.
- Prefer short, natural, beginner-friendly cards.
- If the fields are Chinese-oriented, include accurate Chinese, pinyin with tones, and concise English meaning.
- Use the weak scores, reasons, metrics, and recent ratings to prioritize what to practice.
- Keep output parseable as strict JSON.
${instructions ? `\n## Additional Instructions\n\n${instructions}\n` : ""}
## Weak SRS Context

${JSON.stringify(compactWeakCardsContext(context), null, 2)}
`;
}
