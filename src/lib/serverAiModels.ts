import "server-only";

import { createHash } from "node:crypto";
import { fetchAction } from "convex/nextjs";
import { fetchQuery } from "convex/nextjs";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../convex/_generated/api";
import {
  unavailableAvailableModels,
  type AvailableModelsSnapshot,
} from "@/lib/availableModels";

function aiConfigCacheKey(provider: string, apiKey: string): string {
  const digest = createHash("sha256")
    .update(`${provider}:${apiKey}`)
    .digest("hex")
    .slice(0, 16);
  return `${provider}:${digest}`;
}

export async function fetchAvailableModelsForServer(
  token: string,
): Promise<AvailableModelsSnapshot> {
  let configResult: FunctionReturnType<typeof api.userSettings.getAiConfigForServer>;
  try {
    configResult = await fetchQuery(
      api.userSettings.getAiConfigForServer,
      {},
      { token },
    );
  } catch (error) {
    console.warn("[ai-models] Failed to read AI config", error);
    return unavailableAvailableModels;
  }
  if (!configResult.ok || !configResult.value) {
    return unavailableAvailableModels;
  }

  const cacheKey = aiConfigCacheKey(
    configResult.value.provider,
    configResult.value.apiKey,
  );

  try {
    const result = await fetchAction(api.ai.getAvailableModels, {}, { token });
    if (!result.ok) return { models: [], cacheKey, canFetch: true, fetchedAt: 0 };
    return {
      models: result.value.models,
      cacheKey,
      canFetch: true,
      fetchedAt: Date.now(),
    };
  } catch (error) {
    console.warn("[ai-models] Failed to preload available models", error);
    return { models: [], cacheKey, canFetch: true, fetchedAt: 0 };
  }
}
