import type { ConvexReactClient } from "convex/react";
import type { FunctionArgs, FunctionReference } from "convex/server";
import { getFunctionName } from "convex/server";
import { api } from "../../convex/_generated/api";
import { parseId } from "./convexHelpers";
import { isCardRating } from "./types";

const OFFLINE_MUTATIONS = {
  "studySessions:recordResult": api.studySessions.recordResult,
  "srsReviewQueue:recordReview": api.srsReviewQueue.recordReview,
} as const satisfies Record<string, FunctionReference<"mutation">>;

export type OfflineMutationName = keyof typeof OFFLINE_MUTATIONS;
export type OfflineMutation = (typeof OFFLINE_MUTATIONS)[OfflineMutationName];

type BaseOutboxEntry<Name extends OfflineMutationName> = {
  id: number;
  mutationName: Name;
  args: FunctionArgs<(typeof OFFLINE_MUTATIONS)[Name]>;
  createdAt: number;
  status: "pending" | "syncing" | "failed" | "auth_required";
  retries: number;
  queuedWhileOnline?: boolean;
};

export type RegisteredOutboxEntry = {
  [Name in OfflineMutationName]: BaseOutboxEntry<Name>;
}[OfflineMutationName];

export function getOfflineMutationName(
  mutation: OfflineMutation,
): OfflineMutationName {
  const name = getFunctionName(mutation);
  if (!isOfflineMutationName(name)) {
    throw new Error(`Unsupported offline mutation: ${name}`);
  }
  return name;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseRecordResultArgs(
  args: unknown,
): FunctionArgs<typeof api.studySessions.recordResult> | null {
  if (!isRecord(args) || !isCardRating(args.rating)) return null;
  const sessionId = typeof args.sessionId === "string"
    ? parseId<"studySessions">(args.sessionId)
    : null;
  const cardId = typeof args.cardId === "string"
    ? parseId<"flashcards">(args.cardId)
    : null;
  if (!sessionId || !cardId) return null;
  return { sessionId, cardId, rating: args.rating };
}

function parseRecordReviewArgs(
  args: unknown,
): FunctionArgs<typeof api.srsReviewQueue.recordReview> | null {
  if (!isRecord(args) || !isCardRating(args.rating)) return null;
  const srsCardId = typeof args.srsCardId === "string"
    ? parseId<"srsCards">(args.srsCardId)
    : null;
  if (!srsCardId) return null;
  return { srsCardId, rating: args.rating };
}

export function decodeOutboxEntry(entry: {
  id: number;
  mutationName: string;
  args: unknown;
  createdAt: number;
  status: RegisteredOutboxEntry["status"];
  retries: number;
  queuedWhileOnline?: boolean;
}): RegisteredOutboxEntry | null {
  switch (entry.mutationName) {
    case "studySessions:recordResult": {
      const args = parseRecordResultArgs(entry.args);
      if (!args) return null;
      return { ...entry, mutationName: entry.mutationName, args };
    }
    case "srsReviewQueue:recordReview": {
      const args = parseRecordReviewArgs(entry.args);
      if (!args) return null;
      return { ...entry, mutationName: entry.mutationName, args };
    }
    default:
      return null;
  }
}

export function decodeOutboxArgs<Name extends OfflineMutationName>(
  mutationName: Name,
  args: unknown,
): OutboxArgs<Name> | null {
  switch (mutationName) {
    case "studySessions:recordResult":
      return parseRecordResultArgs(args) as OutboxArgs<Name> | null;
    case "srsReviewQueue:recordReview":
      return parseRecordReviewArgs(args) as OutboxArgs<Name> | null;
  }
}

export async function runOfflineMutation(
  client: ConvexReactClient,
  entry: RegisteredOutboxEntry,
) {
  switch (entry.mutationName) {
    case "studySessions:recordResult":
      return client.mutation(api.studySessions.recordResult, entry.args);
    case "srsReviewQueue:recordReview":
      return client.mutation(api.srsReviewQueue.recordReview, entry.args);
  }
}

export function isOfflineMutationName(
  name: string,
): name is OfflineMutationName {
  return Object.hasOwn(OFFLINE_MUTATIONS, name);
}

export type QueuedMutationValue = {
  status: "queued";
  id: number;
};

export type QueuedMutationFailure = {
  _tag: "permanentFailure" | "authRequiredRetry";
  message: string;
};

export type QueuedMutationResult =
  | { ok: true; value: QueuedMutationValue }
  | { ok: false; error: QueuedMutationFailure };

export type OutboxArgs<Name extends OfflineMutationName> =
  FunctionArgs<(typeof OFFLINE_MUTATIONS)[Name]>;
