"use client";

import { useEffect } from "react";
import { usePreloadedQuery } from "convex/react";
import type { Preloaded } from "convex/react";
import type { FunctionReference } from "convex/server";
import { putCachedQuery } from "./offlineDb";
import { buildCacheKey } from "./useOfflineQuery";

export function useOfflinePreloadedQuery<
  Query extends FunctionReference<"query">,
>(preloaded: Preloaded<Query>): Query["_returnType"] {
  const result = usePreloadedQuery(preloaded);

  // _argsJSON is typed as string but Convex sets it to convexToJson(args) which is an object
  const args =
    typeof preloaded._argsJSON === "string"
      ? JSON.parse(preloaded._argsJSON)
      : preloaded._argsJSON;
  const cacheKey = buildCacheKey(preloaded._name, args);

  useEffect(() => {
    if (result !== undefined) {
      void putCachedQuery(cacheKey, result);
    }
  }, [result, cacheKey]);

  return result;
}
