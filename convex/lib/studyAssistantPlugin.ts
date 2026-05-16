"use node";

import { MultiToolPlugin, type PluginExecutionContext, type PluginTool } from "multi-llm-ts";
import type { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";

const MAX_ROUNDS = 3;

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

const TOOL_NAMES = new Set(TOOL_DEFINITIONS.map((t) => t.name));

export class StudyAssistantPlugin extends MultiToolPlugin {
  private ctx: ActionCtx;
  private userId: string;
  private roundCount = 0;

  constructor(ctx: ActionCtx, userId: string) {
    super();
    this.ctx = ctx;
    this.userId = userId;
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

  async execute(
    _context: PluginExecutionContext,
    params: { tool: string; parameters: Record<string, unknown> },
  ): Promise<unknown> {
    if (++this.roundCount > MAX_ROUNDS) {
      return { error: "Maximum tool call rounds exceeded. Please respond with what you have." };
    }

    switch (params.tool) {
      case "list_sets":
        return await this.ctx.runQuery(internal.tooling.listSetsForTool, {
          userId: this.userId,
          include: { srsSummary: true, fieldDefinitions: true },
        });

      case "get_weak_cards": {
        const methodology = params.parameters.methodology as
          | "balanced"
          | "recent_lapses"
          | "low_ease"
          | "learning_stuck"
          | undefined;
        return await this.ctx.runQuery(internal.tooling.getWeakCardsForTool, {
          userId: this.userId,
          scope: { kind: "srs_enabled_sets" },
          methodology: methodology ?? "balanced",
          include: { recentRatings: true },
        });
      }

      default:
        return { error: `Unknown tool: ${params.tool}` };
    }
  }
}
