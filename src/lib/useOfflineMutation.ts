"use client";

import { useCallback } from "react";
import { useMutation } from "convex/react";
import type { FunctionReference, OptionalRestArgs } from "convex/server";
import { getFunctionName } from "convex/server";
import { addToOutbox } from "./offlineOutbox";
import type { AppResult, AppFailure } from "./appResult";
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
      const queued = await addToOutbox(name, args[0]);
      if (!queued.ok) {
        return { ok: false, error: { _tag: queued.status, message: queued.message } } as AppResult<never, AppFailure<string, object>> as Mutation["_returnType"];
      }
      return { ok: true, value: { status: "queued", id: queued.id } } as Mutation["_returnType"];
    },
    [isOnline, mutationFn, name]
  );
}
