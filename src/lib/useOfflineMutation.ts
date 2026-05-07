"use client";

import { useCallback } from "react";
import { useMutation } from "convex/react";
import type { FunctionReference, OptionalRestArgs } from "convex/server";
import { getFunctionName } from "convex/server";
import { addToOutbox } from "./offlineOutbox";
import { useOnlineStatus } from "./useOnlineStatus";

export function useOfflineMutation<
  Mutation extends FunctionReference<"mutation">,
>(mutation: Mutation) {
  const mutationFn = useMutation(mutation);
  const isOnline = useOnlineStatus();
  const name = getFunctionName(mutation);

  return useCallback(
    async (...args: OptionalRestArgs<Mutation>) => {
      if (isOnline) {
        return mutationFn(...args);
      }
      await addToOutbox(name, args[0]);
      return undefined as Mutation["_returnType"];
    },
    [isOnline, mutationFn, name]
  );
}
