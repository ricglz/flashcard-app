"use client";

import { useCallback } from "react";
import { useMutation } from "convex/react";
import type { FunctionReference, OptionalRestArgs } from "convex/server";
import { getFunctionName } from "convex/server";
import { addToOutbox } from "@/lib/offlineOutbox";
import type { AppResult, AppFailure } from "@/lib/appResult";
import { useOnlineStatus } from "./useOnlineStatus";

export type OfflineMutationStrategy = "online-first" | "queue-first";

type ExecuteOfflineMutationArgs<MutationReturn> = {
  strategy: OfflineMutationStrategy;
  isOnline: boolean;
  mutationName: string;
  mutationArgs: readonly unknown[];
  runMutation: () => Promise<MutationReturn>;
  queueMutation?: typeof addToOutbox;
};

export async function executeOfflineMutation<MutationReturn>({
  strategy,
  isOnline,
  mutationName,
  mutationArgs,
  runMutation,
  queueMutation = addToOutbox,
}: ExecuteOfflineMutationArgs<MutationReturn>): Promise<MutationReturn> {
  if (strategy === "online-first" && isOnline) {
    return runMutation();
  }

  const queued = await queueMutation(mutationName, mutationArgs[0], {
    queuedWhileOnline: isOnline,
  });
  if (!queued.ok) {
    return {
      ok: false,
      error: { _tag: queued.status, message: queued.message },
    } as AppResult<never, AppFailure<string, object>> as MutationReturn;
  }
  return {
    ok: true,
    value: { status: "queued", id: queued.id },
  } as MutationReturn;
}

export function useOfflineMutation<
  Mutation extends FunctionReference<"mutation">,
>(
  mutation: Mutation,
  options: { strategy?: OfflineMutationStrategy } = {},
) {
  const mutationFn = useMutation(mutation);
  const isOnline = useOnlineStatus();
  const name = getFunctionName(mutation);
  const strategy = options.strategy ?? "online-first";

  return useCallback(
    async (...args: OptionalRestArgs<Mutation>) => {
      return executeOfflineMutation<Mutation["_returnType"]>({
        strategy,
        isOnline,
        mutationName: name,
        mutationArgs: args,
        runMutation: () => mutationFn(...args),
      });
    },
    [isOnline, mutationFn, name, strategy]
  );
}
