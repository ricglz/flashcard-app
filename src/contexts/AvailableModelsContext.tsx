"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { useConvex } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { LlmModel } from "@/lib/aiModels";
import type { AvailableModelsSnapshot } from "@/lib/availableModels";

type AvailableModelsContextValue = {
  models: readonly LlmModel[];
};

export const AvailableModelsContext = createContext<AvailableModelsContextValue | undefined>(undefined);

export async function fetchModels(client: ReturnType<typeof useConvex>): Promise<LlmModel[]> {
  try {
    const result = await client.action(api.ai.getAvailableModels, {});
    if (!result.ok) return [];
    return result.value.models;
  } catch {
    return [];
  }
}

export function availableModelsQueryKey(userId: string | null | undefined, cacheKey: string) {
  return ["ai", "models", userId ?? "signed-out", cacheKey] as const;
}

export function AvailableModelsProvider({
  children,
  snapshot,
}: {
  children: ReactNode;
  snapshot?: AvailableModelsSnapshot;
}) {
  const client = useConvex();
  const { isLoaded, userId } = useAuth();
  const initialModels = snapshot?.models;
  const cacheKey = snapshot?.cacheKey ?? "client";
  const canFetch = snapshot?.canFetch ?? true;
  const { data } = useQuery({
    queryKey: availableModelsQueryKey(userId, cacheKey),
    queryFn: () => fetchModels(client),
    enabled: isLoaded && !!userId && canFetch,
    initialData: initialModels ? [...initialModels] : undefined,
    initialDataUpdatedAt: snapshot?.fetchedAt ?? 0,
  });
  const models = data ?? initialModels ?? [];

  return (
    <AvailableModelsContext.Provider value={{ models }}>
      {children}
    </AvailableModelsContext.Provider>
  );
}

export function useAvailableModelsContext(): readonly LlmModel[] {
  const ctx = useContext(AvailableModelsContext);
  if (!ctx) {
    throw new Error("useAvailableModelsContext must be used within AvailableModelsProvider");
  }
  return ctx.models;
}
