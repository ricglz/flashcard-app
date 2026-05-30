import "server-only";

import { fetchAction } from "convex/nextjs";
import { api } from "../../convex/_generated/api";
import type { LlmModel } from "@/lib/aiModels";

export async function fetchAvailableModelsForServer(
  token: string,
): Promise<LlmModel[] | undefined> {
  try {
    const result = await fetchAction(api.ai.getAvailableModels, {}, { token });
    if (!result.ok) return undefined;
    return result.value.models;
  } catch (error) {
    console.warn("[ai-models] Failed to preload available models", error);
    return undefined;
  }
}
