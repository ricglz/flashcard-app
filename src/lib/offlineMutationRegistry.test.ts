import { describe, expect, it } from "vitest";
import type { ConvexReactClient } from "convex/react";
import type { TableNames } from "../../convex/_generated/dataModel";
import { parseId } from "./convexHelpers";
import { decodeOutboxEntry, runOfflineMutation } from "./offlineMutationRegistry";

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
const setId = requireTestId<"flashcardSets">("abc123def456ghia");

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

  it("decodes registered flag entries", () => {
    expect(decodeOutboxEntry({
      ...baseEntry,
      mutationName: "cardAnnotations:toggleFlag",
      args: { cardId, setId },
    })).toMatchObject({
      mutationName: "cardAnnotations:toggleFlag",
      args: { cardId, setId },
    });
  });

  it("decodes registered note entries", () => {
    expect(decodeOutboxEntry({
      ...baseEntry,
      mutationName: "cardAnnotations:setNote",
      args: { cardId, setId, note: "Remember tone change." },
    })).toMatchObject({
      mutationName: "cardAnnotations:setNote",
      args: { cardId, setId, note: "Remember tone change." },
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

  it("rejects malformed note payloads", () => {
    expect(decodeOutboxEntry({
      ...baseEntry,
      mutationName: "cardAnnotations:setNote",
      args: { cardId, setId, note: 123 },
    })).toBeNull();
  });
});

describe("runOfflineMutation", () => {
  it("replays study results with outbox creation time", async () => {
    const calls: unknown[] = [];
    const client = {
      mutation: async (_mutation: unknown, args: unknown) => {
        calls.push(args);
        return { ok: true, value: null };
      },
    } as ConvexReactClient;

    const entry = decodeOutboxEntry({
      ...baseEntry,
      createdAt: 456,
      mutationName: "studySessions:recordResult",
      args: { sessionId, cardId, rating: "hard" },
    });
    if (!entry) throw new Error("Expected decoded entry");

    await runOfflineMutation(client, entry);

    expect(calls).toEqual([{ sessionId, cardId, rating: "hard", answeredAt: 456 }]);
  });

  it("replays SRS reviews with outbox creation time", async () => {
    const calls: unknown[] = [];
    const client = {
      mutation: async (_mutation: unknown, args: unknown) => {
        calls.push(args);
        return { ok: true, value: null };
      },
    } as ConvexReactClient;

    const entry = decodeOutboxEntry({
      ...baseEntry,
      createdAt: 789,
      mutationName: "srsReviewQueue:recordReview",
      args: { srsCardId, rating: "good" },
    });
    if (!entry) throw new Error("Expected decoded entry");

    await runOfflineMutation(client, entry);

    expect(calls).toEqual([{ srsCardId, rating: "good", reviewedAt: 789 }]);
  });
});
