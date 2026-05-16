"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import type { OptionalRestArgsOrSkip } from "convex/react";
import type { FunctionReference } from "convex/server";
import { getFunctionName } from "convex/server";
import { putCachedQuery, getCachedQuery } from "./offlineDb";

export function buildCacheKey(
  queryOrName: FunctionReference<"query"> | string,
  args: unknown
): string {
  const name =
    typeof queryOrName === "string"
      ? queryOrName
      : getFunctionName(queryOrName);
  if (args === undefined || args === null) return name;
  const sortedArgs = JSON.stringify(args, Object.keys(args as object).sort());
  return `${name}:${sortedArgs}`;
}

export function useOfflineQuery<Query extends FunctionReference<"query">>(
  query: Query,
  ...args: OptionalRestArgsOrSkip<Query>
): Query["_returnType"] | undefined {
  const liveData = useQuery(query, ...args);
  const [cachedData, setCachedData] = useState<
    Query["_returnType"] | undefined
  >(undefined);

  const actualArgs = args[0];
  const isSkipped = actualArgs === "skip";
  const cacheKey = isSkipped ? null : buildCacheKey(query, actualArgs);

  useEffect(() => {
    if (cacheKey) {
      void getCachedQuery<Query["_returnType"]>(cacheKey).then(setCachedData);
    }
  }, [cacheKey]);

  useEffect(() => {
    if (liveData !== undefined && cacheKey) {
      void putCachedQuery(cacheKey, liveData);
    }
  }, [liveData, cacheKey]);

  if (liveData !== undefined) return liveData;
  return cachedData;
}
