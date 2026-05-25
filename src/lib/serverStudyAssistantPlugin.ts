import { fetchMutation, fetchQuery } from "convex/nextjs";
import { MultiToolPlugin, type PluginExecutionContext, type PluginTool } from "multi-llm-ts";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { CurrentCardNoteToolParamsSchema } from "./aiToolingSchemas";
import * as Schema from "effect/Schema";
import * as Either from "effect/Either";
import * as ParseResult from "effect/ParseResult";

const MAX_ROUNDS = 3;

const TOOL_NAME_LIST = ["list_sets", "get_weak_cards", "add_note_to_current_card"] as const;
type ToolName = typeof TOOL_NAME_LIST[number];
const TOOL_NAMES: ReadonlySet<string> = new Set(TOOL_NAME_LIST);

const TOOL_RUNNING_DESCRIPTIONS: Record<ToolName, string> = {
  list_sets: "Looking up your flashcard sets...",
  get_weak_cards: "Analyzing your weak cards...",
  add_note_to_current_card: "Adding note to this card...",
};

function isToolName(tool: string): tool is ToolName {
  return TOOL_NAMES.has(tool);
}

const TOOL_DEFINITIONS: PluginTool[] = [
  {
    name: "list_sets",
    description:
      "List the user's stored flashcard sets/decks with card counts, SRS statistics, and field definitions. Use only for questions about stored set/deck inventory or metadata. Do not use for basic explanations of the currently visible card.",
    parameters: [],
  },
  {
    name: "get_weak_cards",
    description:
      "Get the user's weakest flashcards based on SRS review history, lapses, difficulty, or study progress. Returns cards grouped by schema with weak reasons and metrics. Use only for weak-card, SRS, review-history, lapse, or progress questions. Do not use for basic explanations of the currently visible card.",
    parameters: [
      {
        name: "methodology",
        type: "string",
        description:
          "Scoring methodology: 'balanced' (default, overall weakness), 'recent_lapses' (recently failed), 'low_ease' (consistently difficult), 'learning_stuck' (not graduating from learning)",
        required: false,
      },
    ],
  },
  {
    name: "add_note_to_current_card",
    description:
      "Add a concise review note to the card the user is currently viewing. Use only when the user asks to save or add a note, and only if the current card has no existing note.",
    parameters: [
      {
        name: "note",
        type: "string",
        description:
          "A concise review note for the current card, usually 1-3 short sentences or bullets. Maximum 500 characters.",
        required: true,
      },
    ],
  },
];

const GetWeakCardsParamsSchema = Schema.Struct({
  methodology: Schema.optional(
    Schema.Literal("balanced", "recent_lapses", "low_ease", "learning_stuck")
  ),
});

function unwrapToolResult<T>(
  result: { ok: true; value: T } | { ok: false; error: { message: string } }
): T | { error: string } {
  return result.ok ? result.value : { error: result.error.message };
}

export class ServerStudyAssistantPlugin extends MultiToolPlugin {
  private token: string;
  private currentCardContext?: StudyAssistantCurrentCardContext;
  private roundCount = 0;

  constructor(token: string, currentCardContext?: StudyAssistantCurrentCardContext) {
    super();
    this.token = token;
    this.currentCardContext = currentCardContext;
  }

  getName(): string {
    return "study-assistant";
  }

  getDescription(): string {
    return "Access the user's flashcard data and study statistics";
  }

  async getTools(): Promise<PluginTool[]> {
    return TOOL_DEFINITIONS;
  }

  handlesTool(name: string): boolean {
    return TOOL_NAMES.has(name);
  }

  getRunningDescription(tool: string): string {
    if (isToolName(tool)) {
      return TOOL_RUNNING_DESCRIPTIONS[tool];
    }
    return tool;
  }

  async execute(
    _context: PluginExecutionContext,
    params: { tool: string; parameters?: Record<string, unknown> | null },
  ): Promise<unknown> {
    if (++this.roundCount > MAX_ROUNDS) {
      return { error: "Maximum tool call rounds exceeded. Please respond with what you have." };
    }

    try {
      switch (params.tool) {
        case "list_sets":
          return unwrapToolResult(
            await fetchQuery(
              api.tooling.listSetsPublic,
              { include: { srsSummary: true, fieldDefinitions: true } },
              { token: this.token },
            )
          );

        case "get_weak_cards": {
          const paramsResult = Schema.decodeUnknownEither(GetWeakCardsParamsSchema)(
            params.parameters ?? {}
          );
          
          if (Either.isLeft(paramsResult)) {
            const issues = ParseResult.ArrayFormatter.formatErrorSync(paramsResult.left);
            console.warn("[study-assistant] Invalid parameters for get_weak_cards:", issues);
          }
          
          const methodology = (Either.isRight(paramsResult)
            ? paramsResult.right.methodology
            : undefined) ?? "balanced";
          
          return unwrapToolResult(
            await fetchQuery(
              api.tooling.getWeakCardsPublic,
              {
                scope: { kind: "srs_enabled_sets" },
                methodology,
                include: { recentRatings: true },
              },
              { token: this.token },
            )
          );
        }

        case "add_note_to_current_card": {
          if (!this.currentCardContext) {
            return { error: "No current card is available for adding a note." };
          }
          if (this.currentCardContext.hasNote) {
            return { error: "This card already has a note." };
          }

          const paramsResult = Schema.decodeUnknownEither(CurrentCardNoteToolParamsSchema)(
            params.parameters ?? {}
          );

          if (Either.isLeft(paramsResult)) {
            const issues = ParseResult.ArrayFormatter.formatErrorSync(paramsResult.left);
            console.warn("[study-assistant] Invalid parameters for add_note_to_current_card:", issues);
            return { error: "Note must be non-empty and 500 characters or fewer." };
          }

          return unwrapToolResult(
            await fetchMutation(
              api.cardAnnotations.addAiNoteToCurrentCard,
              {
                setId: this.currentCardContext.setId,
                cardId: this.currentCardContext.cardId,
                note: paramsResult.right.note,
              },
              { token: this.token },
            )
          );
        }

        default:
          return { error: `Unknown tool: ${params.tool}` };
      }
    } catch (err) {
      console.error(`[study-assistant] Tool execution failed for ${params.tool}:`, err);
      return { error: `Tool execution failed: ${err instanceof Error ? err.message : "Unknown error"}` };
    }
  }
}

export type StudyAssistantCurrentCardContext = {
  setId: Id<"flashcardSets">;
  cardId: Id<"flashcards">;
  hasNote: boolean;
};
