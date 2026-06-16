"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useConvex } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { LlmModel } from "@/lib/aiModels";

type AvailableModelsContextValue = {
  models: readonly LlmModel[];
};

export const AvailableModelsContext = createContext<AvailableModelsContextValue | undefined>(undefined);

async function fetchModels(client: ReturnType<typeof useConvex>): Promise<LlmModel[]> {
  const result = await client.action(api.ai.getAvailableModels, {});
  if (!result.ok) return [];
  return result.value.models;
}

export function AvailableModelsProvider({
  children,
  initialModels,
}: {
  children: ReactNode;
  initialModels?: readonly LlmModel[];
}) {
  const client = useConvex();
  const { data = [] } = useSuspenseQuery({
    queryKey: ["ai", "models"],
    queryFn: () => fetchModels(client),
    initialData: initialModels ? [...initialModels] : undefined,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  return (
    <AvailableModelsContext.Provider value={{ models: data }}>
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
