import { describe, it, expect } from "vitest";
import { sortedEntries, sortedStrings } from "./objects";

describe("sortedEntries", () => {
  it("sorts object keys alphabetically", () => {
    const input = { zebra: "z", apple: "a", mango: "m" };
    expect(sortedEntries(input)).toEqual([
      ["apple", "a"],
      ["mango", "m"],
      ["zebra", "z"],
    ]);
  });

  it("returns empty array for empty object", () => {
    expect(sortedEntries({})).toEqual([]);
  });
});

describe("sortedStrings", () => {
  it("sorts strings alphabetically without mutating original", () => {
    const input = ["zebra", "apple", "mango"];
    const sorted = sortedStrings(input);
    expect(sorted).toEqual(["apple", "mango", "zebra"]);
    expect(input).toEqual(["zebra", "apple", "mango"]);
  });
});
