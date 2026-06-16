"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { useConvex } from "convex/react";
import type { ReactNode } from "react";
import {
  AvailableModelsContext,
  availableModelsQueryKey,
  fetchModels,
} from "@/contexts/AvailableModelsContext";

export default function AvailableModelsSuspenseProvider({
  children,
}: {
  children: ReactNode;
}) {
  const client = useConvex();
  const { userId } = useAuth();
  const { data } = useSuspenseQuery({
    queryKey: availableModelsQueryKey(userId, "client"),
    queryFn: () => fetchModels(client),
  });

  return (
    <AvailableModelsContext.Provider value={{ models: data }}>
      {children}
    </AvailableModelsContext.Provider>
  );
}
