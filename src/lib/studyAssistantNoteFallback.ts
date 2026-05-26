import { CurrentCardNoteToolParamsSchema } from "./aiToolingSchemas";
import * as Either from "effect/Either";
import * as ParseResult from "effect/ParseResult";
import * as Schema from "effect/Schema";

const NOTE_WORD_PATTERN = /\b(note|notes|mnemonic|mnemonics)\b/i;
const NOTE_SAVE_VERB_PATTERN = /\b(add|attach|create|keep|make|record|save|set|write)\b/i;
const CURRENT_CARD_REFERENCE_PATTERN = /\b(card|current|it|that|this)\b/i;
const TOOL_INSTRUCTION_PATTERN =
  /\b(tool|tools|function|functions|function-call|add_note_to_current_card|list_sets|get_weak_cards)\b/i;

export function isCurrentCardNoteSaveRequest(message: string): boolean {
  const normalized = message.trim();
  if (!normalized) return false;
  return (
    NOTE_WORD_PATTERN.test(normalized) &&
    NOTE_SAVE_VERB_PATTERN.test(normalized) &&
    CURRENT_CARD_REFERENCE_PATTERN.test(normalized)
  );
}

function sanitizeCustomPrompt(customChatPrompt: string | undefined): string | undefined {
  const trimmed = customChatPrompt?.trim();
  if (!trimmed || TOOL_INSTRUCTION_PATTERN.test(trimmed)) return undefined;
  return trimmed;
}

export function buildNoToolsSystemPrompt(options: {
  customChatPrompt?: string;
  contextSections?: string[];
}): string {
  const customPrompt = sanitizeCustomPrompt(options.customChatPrompt);
  return [
    "You are a study assistant for a flashcard app. Help the user understand their study material. Be concise and helpful.",
    "No function or tool calls are available for this response. Answer in natural language only from the current conversation and visible card context.",
    customPrompt ? `Style guidance:\n${customPrompt}` : undefined,
    ...(options.contextSections ?? []),
  ]
    .filter((section): section is string => Boolean(section?.trim()))
    .join("\n\n");
}

export function buildNoteOnlySystemPrompt(contextSections: string[]): string {
  return [
    "Write only the note text to save on the current flashcard.",
    "No function or tool calls are available. Do not include a confirmation, label, markdown, or quotation marks.",
    "The note must be concise, review-oriented, and 500 characters or fewer.",
    ...contextSections,
  ].join("\n\n");
}

export function normalizeGeneratedNote(content: string): string {
  return content
    .trim()
    .replace(/^```(?:\w+)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim()
    .replace(/^(?:added note|note)\s*:\s*/i, "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .trim();
}

export function validateGeneratedNote(
  content: string,
): { ok: true; note: string } | { ok: false; message: string } {
  const note = normalizeGeneratedNote(content);
  const decoded = Schema.decodeUnknownEither(CurrentCardNoteToolParamsSchema)({ note });
  if (Either.isRight(decoded)) {
    return { ok: true, note: decoded.right.note };
  }
  const issues = ParseResult.ArrayFormatter.formatErrorSync(decoded.left);
  const message = issues.map((issue) => issue.message).join("; ");
  return { ok: false, message: message || "Generated note is invalid." };
}
