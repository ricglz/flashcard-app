import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../convex/_generated/api";

type SrsReviewSession = FunctionReturnType<
  typeof api.srsReviewQueue.getReviewSession
>;

export type ActiveSrsReviewSession = Extract<
  SrsReviewSession,
  { ok: true }
>["value"];

export type SrsReviewItem = ActiveSrsReviewSession["queue"][number];
