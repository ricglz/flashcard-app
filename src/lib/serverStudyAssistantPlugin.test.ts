import { describe, expect, it } from "vitest";
import { ServerStudyAssistantPlugin } from "./serverStudyAssistantPlugin";

describe("ServerStudyAssistantPlugin", () => {
  it("advertises the current card note tool", async () => {
    const plugin = new ServerStudyAssistantPlugin("token");
    const tools = await plugin.getTools();

    expect(tools.map((tool) => tool.name)).toEqual([
      "list_sets",
      "get_weak_cards",
      "add_note_to_current_card",
    ]);
    expect(plugin.handlesTool("add_note_to_current_card")).toBe(true);
  });
});
