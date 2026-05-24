import { describe, expect, it } from "vitest";
import type { TableNames } from "../../convex/_generated/dataModel";
import { parseId } from "./convexHelpers";
import { decodeOutboxEntry } from "./offlineMutationRegistry";

function requireTestId<TableName extends TableNames>(
  raw: string,
) {
  const id = parseId<TableName>(raw);
  if (id === null) throw new Error(`Invalid test ID: ${raw}`);
  return id;
}

const srsCardId = requireTestId<"srsCards">("abc123def456ghi7");
const sessionId = requireTestId<"studySessions">("abc123def456ghi8");
const cardId = requireTestId<"flashcards">("abc123def456ghi9");

const baseEntry = {
  id: 1,
  createdAt: 123,
  status: "pending" as const,
  retries: 0,
};

describe("decodeOutboxEntry", () => {
  it("decodes registered SRS review entries", () => {
    expect(decodeOutboxEntry({
      ...baseEntry,
      mutationName: "srsReviewQueue:recordReview",
      args: { srsCardId, rating: "good" },
    })).toMatchObject({
      mutationName: "srsReviewQueue:recordReview",
      args: { srsCardId, rating: "good" },
    });
  });

  it("decodes registered study result entries", () => {
    expect(decodeOutboxEntry({
      ...baseEntry,
      mutationName: "studySessions:recordResult",
      args: { sessionId, cardId, rating: "hard" },
    })).toMatchObject({
      mutationName: "studySessions:recordResult",
      args: { sessionId, cardId, rating: "hard" },
    });
  });

  it("rejects unknown mutation names", () => {
    expect(decodeOutboxEntry({
      ...baseEntry,
      mutationName: "unknown:mutation",
      args: {},
    })).toBeNull();
  });

  it("rejects malformed persisted arguments", () => {
    expect(decodeOutboxEntry({
      ...baseEntry,
      mutationName: "srsReviewQueue:recordReview",
      args: { srsCardId: "not an id", rating: "good" },
    })).toBeNull();
  });
});
