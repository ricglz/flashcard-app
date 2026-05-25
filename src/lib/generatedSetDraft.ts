import type { FunctionArgs } from "convex/server";
import type { api } from "../../convex/_generated/api";
import type { GeneratedSetPayload } from "./aiToolingSchemas";

type RefineDraft = FunctionArgs<typeof api.ai.refineGeneratedSet>["draft"];
type DraftCard = Pick<GeneratedSetPayload["cards"][number], "fields" | "sourceCardIds" | "rationale">;

export function cloneFieldDefinitionsForAction(
  fieldDefinitions: GeneratedSetPayload["fieldDefinitions"],
): RefineDraft["fieldDefinitions"] {
  return fieldDefinitions.map((field) => ({
    name: field.name,
    role: field.role,
    metadata: field.metadata.tts
      ? { tts: { lang: field.metadata.tts.lang } }
      : {},
    order: field.order,
  }));
}

export function cloneGeneratedSetForAction(
  payload: GeneratedSetPayload,
  cards: ReadonlyArray<DraftCard> = payload.cards,
): RefineDraft {
  return {
    name: payload.name,
    description: payload.description,
    sourceSetIds: [...payload.sourceSetIds],
    sourceScope: payload.sourceScope,
    weakContextMethodology: payload.weakContextMethodology,
    fieldDefinitions: cloneFieldDefinitionsForAction(payload.fieldDefinitions),
    cards: cards.map((card) => ({
      fields: { ...card.fields },
      sourceCardIds: card.sourceCardIds ? [...card.sourceCardIds] : undefined,
      rationale: card.rationale,
    })),
    addToSrs: payload.addToSrs,
  };
}
