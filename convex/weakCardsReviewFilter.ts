import { v } from "convex/values";
import * as Either from "effect/Either";
import * as ParseResult from "effect/ParseResult";
import * as Schema from "effect/Schema";
import {
  WeakCardsReviewFilterSchema,
  type WeakCardsReviewFilter,
} from "../src/lib/aiToolingSchemas";
import {
  fail,
  invalidInput,
  ok,
  type CommonFailure,
  type DomainResult,
} from "./domain/result";

export const DEFAULT_WEAK_CARDS_REVIEW_FILTER: WeakCardsReviewFilter = {
  kind: "relative_days",
  days: 90,
};

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const weakCardsReviewFilterValidator = v.union(
  v.object({
    kind: v.literal("relative_days"),
    days: v.number(),
  }),
  v.object({
    kind: v.literal("calendar_range"),
    startMs: v.number(),
    endMs: v.number(),
  }),
);

export function validateWeakCardsReviewFilter(
  filter: WeakCardsReviewFilter | undefined,
): DomainResult<WeakCardsReviewFilter, CommonFailure> {
  const decoded = Schema.decodeUnknownEither(WeakCardsReviewFilterSchema)(
    filter ?? DEFAULT_WEAK_CARDS_REVIEW_FILTER,
  );
  if (Either.isRight(decoded)) return ok(decoded.right);

  const issues = ParseResult.ArrayFormatter.formatErrorSync(decoded.left);
  const message = issues
    .map((issue: ParseResult.ArrayFormatterIssue) => issue.message)
    .join("; ");
  return fail(
    invalidInput(
      message || "Review filter must be a valid relative day or calendar range filter.",
      "reviewFilter",
    ),
  );
}

export function resolveWeakCardsReviewWindow(
  reviewFilter: WeakCardsReviewFilter,
  now: number,
): { startMs: number; endMs: number } {
  if (reviewFilter.kind === "calendar_range") {
    return { startMs: reviewFilter.startMs, endMs: reviewFilter.endMs };
  }
  return {
    startMs: now - reviewFilter.days * MS_PER_DAY,
    endMs: now,
  };
}
