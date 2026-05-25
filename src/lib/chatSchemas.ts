import * as Schema from "effect/Schema";
import type { Id } from "../../convex/_generated/dataModel";

export const ChatContextRequestSchema = Schema.Struct({
  setId: Schema.optional(Schema.String),
  cardId: Schema.optional(Schema.String),
  hasNote: Schema.optional(Schema.Boolean),
  cardFields: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.String })),
});

export const ChatRequestSchema = Schema.Struct({
  message: Schema.String,
  history: Schema.Array(Schema.Struct({
    role: Schema.Literal("user", "assistant"),
    content: Schema.String,
  })),
  model: Schema.optional(Schema.String),
  context: Schema.optional(ChatContextRequestSchema),
});

export type ChatContext = {
  setId?: Id<"flashcardSets">;
  cardId?: Id<"flashcards">;
  hasNote?: boolean;
  cardFields?: Record<string, string>;
};

export type ChatMessage = { role: "user" | "assistant"; content: string };
