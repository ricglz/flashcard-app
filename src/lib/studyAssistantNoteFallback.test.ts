import { describe, expect, it } from "vitest";
import {
  buildNoToolsSystemPrompt,
  isCurrentCardNoteSaveRequest,
  normalizeGeneratedNote,
  validateGeneratedNote,
} from "./studyAssistantNoteFallback";

describe("study assistant note fallback helpers", () => {
  it("detects current-card note save requests", () => {
    expect(isCurrentCardNoteSaveRequest("can you add a note for this? keep it simple")).toBe(true);
    expect(isCurrentCardNoteSaveRequest("Add that as a note")).toBe(true);
  });

  it("rejects ordinary explanation questions", () => {
    expect(isCurrentCardNoteSaveRequest("what does this sentence mean?")).toBe(false);
    expect(isCurrentCardNoteSaveRequest("can you explain this note?")).toBe(false);
  });

  it("builds no-tools prompts without stale tool-use instructions", () => {
    const prompt = buildNoToolsSystemPrompt({
      customChatPrompt: "Use tools whenever possible.",
      contextSections: ["The current card does not have a note."],
    });

    expect(prompt).toContain("No function or tool calls are available");
    expect(prompt).not.toContain("add_note_to_current_card");
    expect(prompt).not.toContain("Use tools whenever possible");
    expect(prompt).not.toMatch(/Use tools only/i);
  });

  it("normalizes provider note text", () => {
    expect(normalizeGeneratedNote('Note: "Review the tone marker."')).toBe(
      "Review the tone marker.",
    );
  });

  it("validates generated note text", () => {
    expect(validateGeneratedNote("A concise review note.")).toMatchObject({
      ok: true,
      note: "A concise review note.",
    });
    expect(validateGeneratedNote("   ")).toMatchObject({ ok: false });
    expect(validateGeneratedNote("x".repeat(501))).toMatchObject({ ok: false });
  });
});
