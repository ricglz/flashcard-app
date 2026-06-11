import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../convex/_generated/api";

type SrsReviewSession = FunctionReturnType<
  typeof api.srsReviewQueue.getReviewSession
>;

export type SrsReviewItem = SrsReviewSession["queue"][number];
