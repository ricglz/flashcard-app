import type { FieldDefinition } from "../../src/lib/types";

export function renderFreeformPrompt(options: {
  prompt: string;
  fieldDefinitions: FieldDefinition[];
  targetCardCount: number;
  name: string;
  addToSrs: boolean;
  instructions?: string;
}): string {
  const { prompt, fieldDefinitions, targetCardCount, name, addToSrs, instructions } = options;
  const fieldsTemplate = Object.fromEntries(fieldDefinitions.map((field) => [field.name, ""]));

  return `# Generate Flashcards from Prompt

You are a flashcard generation assistant. Create a flashcard set based on the user's request below.

## Goal

- Create ${targetCardCount} flashcards matching the user's request.
- Each card must use the exact field definitions provided.

## Output Requirements

Return only valid JSON. Do not wrap it in Markdown fences. The JSON must match this shape:

${JSON.stringify({
    name,
    description: "AI-generated flashcard set.",
    sourceSetIds: [],
    sourceScope: "custom",
    fieldDefinitions,
    cards: [
      {
        fields: fieldsTemplate,
        rationale: "Brief explanation of why this card was generated.",
      },
    ],
    addToSrs,
  }, null, 2)}

## Generation Rules

- Preserve the \`fieldDefinitions\` exactly as provided.
- \`sourceSetIds\` must be an empty array.
- \`sourceScope\` must be \`"custom"\`.
- Prefer short, natural, beginner-friendly cards.
- If the fields are Chinese-oriented, include accurate Chinese characters, pinyin with tones, and concise English meaning.
- If the fields are for another language, include accurate translations and transliterations where applicable.
- Keep output parseable as strict JSON.

## Quality Bar

- Each card must feel like a realistic study item a human tutor would write.
- Prefer cohesive, natural examples over arbitrary combinations of weak terms.
- Do not create text that only exists to satisfy a source-card or schema requirement.
- Each card should test one clear idea unless the user explicitly asks for combined practice.
- If using example sentences, make them plausible, grammatical, and useful for learning.
- Avoid awkward, contrived, or semantically incoherent text even when targeting requested criteria.
${instructions ? `\n## Additional Instructions\n\n${instructions}\n` : ""}
## User Request

${prompt}
`;
}
