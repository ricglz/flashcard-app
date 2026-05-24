import { describe, expect, it, vi } from "vitest";
import { executeOfflineMutation } from "./useOfflineMutation";
import { parseId } from "@/lib/convexHelpers";
import type { TableNames } from "../../convex/_generated/dataModel";

function requireTestId<TableName extends TableNames>(raw: string) {
  const id = parseId<TableName>(raw);
  if (id === null) throw new Error(`Invalid test ID: ${raw}`);
  return id;
}

const sessionId = requireTestId<"studySessions">("abc123def456ghi7");
const cardId = requireTestId<"flashcards">("abc123def456ghi8");
const srsCardId = requireTestId<"srsCards">("abc123def456ghi9");

describe("executeOfflineMutation", () => {
  it("queues instead of calling Convex in queue-first mode while online", async () => {
    const runMutation = vi.fn(async () => ({ ok: true, value: "remote" }));
    const queueMutation = vi.fn(async () => ({ ok: true as const, status: "queued" as const, id: 1 }));

    const result = await executeOfflineMutation({
      strategy: "queue-first",
      isOnline: true,
      mutationName: "studySessions:recordResult",
      mutationArgs: [{ sessionId, cardId, rating: "good" }],
      runMutation,
      queueMutation,
    });

    expect(runMutation).not.toHaveBeenCalled();
    expect(queueMutation).toHaveBeenCalledWith("studySessions:recordResult", { sessionId, cardId, rating: "good" }, {
      queuedWhileOnline: true,
    });
    expect(result).toEqual({ ok: true, value: { status: "queued", id: 1 } });
  });

  it("queues in queue-first mode while offline", async () => {
    const runMutation = vi.fn(async () => ({ ok: true, value: "remote" }));
    const queueMutation = vi.fn(async () => ({ ok: true as const, status: "queued" as const, id: 2 }));

    const result = await executeOfflineMutation({
      strategy: "queue-first",
      isOnline: false,
      mutationName: "srsReviewQueue:recordReview",
      mutationArgs: [{ srsCardId, rating: "hard" }],
      runMutation,
      queueMutation,
    });

    expect(runMutation).not.toHaveBeenCalled();
    expect(queueMutation).toHaveBeenCalledWith("srsReviewQueue:recordReview", { srsCardId, rating: "hard" }, {
      queuedWhileOnline: false,
    });
    expect(result).toEqual({ ok: true, value: { status: "queued", id: 2 } });
  });

  it("returns a mutation-shaped error when queueing fails", async () => {
    const result = await executeOfflineMutation({
      strategy: "queue-first",
      isOnline: true,
      mutationName: "srsReviewQueue:recordReview",
      mutationArgs: [{ srsCardId, rating: "easy" }],
      runMutation: vi.fn(async () => ({ ok: true, value: "remote" })),
      queueMutation: vi.fn(async () => ({
        ok: false as const,
        status: "permanentFailure" as const,
        id: -1,
        message: "QuotaExceededError",
      })),
    });

    expect(result).toEqual({
      ok: false,
      error: { _tag: "permanentFailure", message: "QuotaExceededError" },
    });
  });

  it("keeps online-first behavior unchanged while online", async () => {
    const runMutation = vi.fn(async () => ({ ok: true, value: "remote" }));
    const queueMutation = vi.fn();

    const result = await executeOfflineMutation({
      strategy: "online-first",
      isOnline: true,
      mutationName: "srsReviewQueue:recordReview",
      mutationArgs: [{ srsCardId, rating: "good" }],
      runMutation,
      queueMutation,
    });

    expect(runMutation).toHaveBeenCalledTimes(1);
    expect(queueMutation).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true, value: "remote" });
  });
});
