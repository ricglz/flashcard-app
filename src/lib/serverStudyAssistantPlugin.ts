import { fetchQuery } from "convex/nextjs";
import { MultiToolPlugin, type PluginExecutionContext, type PluginTool } from "multi-llm-ts";
import { api } from "../../convex/_generated/api";
import * as Schema from "effect/Schema";
import * as Either from "effect/Either";
import * as ParseResult from "effect/ParseResult";

const MAX_ROUNDS = 3;

const TOOL_NAME_LIST = ["list_sets", "get_weak_cards"] as const;
type ToolName = typeof TOOL_NAME_LIST[number];
const TOOL_NAMES: ReadonlySet<string> = new Set(TOOL_NAME_LIST);

const TOOL_RUNNING_DESCRIPTIONS: Record<ToolName, string> = {
  list_sets: "Looking up your flashcard sets...",
  get_weak_cards: "Analyzing your weak cards...",
};

function isToolName(tool: string): tool is ToolName {
  return TOOL_NAMES.has(tool);
}

const TOOL_DEFINITIONS: PluginTool[] = [
  {
    name: "list_sets",
    description:
      "List all of the user's flashcard sets with card counts, SRS statistics, and field definitions.",
    parameters: [],
  },
  {
    name: "get_weak_cards",
    description:
      "Get the user's weakest flashcards based on SRS review history. Returns cards grouped by schema with weak reasons and metrics.",
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
];

const GetWeakCardsParamsSchema = Schema.Struct({
  methodology: Schema.optional(
    Schema.Literal("balanced", "recent_lapses", "low_ease", "learning_stuck")
  ),
});

export class ServerStudyAssistantPlugin extends MultiToolPlugin {
  private token: string;
  private roundCount = 0;

  constructor(token: string) {
    super();
    this.token = token;
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
          return await fetchQuery(
            api.tooling.listSetsPublic,
            { include: { srsSummary: true, fieldDefinitions: true } },
            { token: this.token },
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
          
          return await fetchQuery(
            api.tooling.getWeakCardsPublic,
            {
              scope: { kind: "srs_enabled_sets" },
              methodology,
              include: { recentRatings: true },
            },
            { token: this.token },
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
