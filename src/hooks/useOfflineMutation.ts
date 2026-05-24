"use client";

import { useCallback } from "react";
import { useMutation } from "convex/react";
import type { OptionalRestArgs } from "convex/server";
import { addToOutbox } from "@/lib/offlineOutbox";
import {
  getOfflineMutationName,
  decodeOutboxArgs,
  type OfflineMutation,
  type OfflineMutationName,
  type QueuedMutationResult,
} from "@/lib/offlineMutationRegistry";
import { useOnlineStatus } from "./useOnlineStatus";

export type OfflineMutationStrategy = "online-first" | "queue-first";

type ExecuteOfflineMutationArgs<MutationReturn, Name extends OfflineMutationName> = {
  strategy: OfflineMutationStrategy;
  isOnline: boolean;
  mutationName: Name;
  mutationArgs: readonly unknown[];
  runMutation: () => Promise<MutationReturn>;
  queueMutation?: typeof addToOutbox;
};

export async function executeOfflineMutation<MutationReturn, Name extends OfflineMutationName>({
  strategy,
  isOnline,
  mutationName,
  mutationArgs,
  runMutation,
  queueMutation = addToOutbox,
}: ExecuteOfflineMutationArgs<MutationReturn, Name>): Promise<MutationReturn | QueuedMutationResult> {
  if (strategy === "online-first" && isOnline) {
    return runMutation();
  }

  const outboxArgs = decodeOutboxArgs(mutationName, mutationArgs[0]);
  if (!outboxArgs) {
    return {
      ok: false,
      error: { _tag: "permanentFailure", message: "Offline mutation arguments are invalid." },
    };
  }

  const queued = await queueMutation(mutationName, outboxArgs, {
    queuedWhileOnline: isOnline,
  });
  if (!queued.ok) {
    return {
      ok: false,
      error: { _tag: queued.status, message: queued.message },
    };
  }
  return {
    ok: true,
    value: { status: "queued", id: queued.id },
  };
}

export function useOfflineMutation<
  Mutation extends OfflineMutation,
>(
  mutation: Mutation,
  options: { strategy?: OfflineMutationStrategy } = {},
) {
  const mutationFn = useMutation(mutation);
  const isOnline = useOnlineStatus();
  const name = getOfflineMutationName(mutation);
  const strategy = options.strategy ?? "online-first";

  return useCallback(
    async (...args: OptionalRestArgs<Mutation>) => {
      return executeOfflineMutation<Mutation["_returnType"], typeof name>({
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
