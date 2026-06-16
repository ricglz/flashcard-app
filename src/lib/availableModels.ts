import type { LlmModel } from "@/lib/aiModels";

export type AvailableModelsSnapshot = {
  readonly models: readonly LlmModel[];
  readonly cacheKey: string;
  readonly canFetch: boolean;
  readonly fetchedAt: number;
};

export const unavailableAvailableModels: AvailableModelsSnapshot = {
  models: [],
  cacheKey: "unavailable",
  canFetch: false,
  fetchedAt: 0,
};
