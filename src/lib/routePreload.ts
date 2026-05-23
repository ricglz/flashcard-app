import "server-only";

import { redirect } from "next/navigation";
import { preloadedQueryResult } from "convex/nextjs";
import type { Preloaded } from "convex/react";
import type { FunctionReference, FunctionReturnType } from "convex/server";
import { parseId } from "@/lib/convexHelpers";
import { getAuthToken } from "@/lib/server";
import type { Id, TableNames } from "../../convex/_generated/dataModel";

export async function requireAuthToken(redirectTo = "/"): Promise<string> {
  const token = await getAuthToken();
  if (!token) redirect(redirectTo);
  return token;
}

export function requireRouteId<T extends TableNames>(
  raw: string,
  redirectTo = "/",
): Id<T> {
  const id = parseId<T>(raw);
  if (!id) redirect(redirectTo);
  return id;
}

type DomainResult<T> = { ok: true; value: T } | { ok: false };
type DomainResultValue<Query extends FunctionReference<"query">> =
  FunctionReturnType<Query> extends DomainResult<infer Value> ? Value : never;

export function requirePreloadedDomainResult<Query extends FunctionReference<"query">>(
  preloaded: Preloaded<Query>,
  redirectTo = "/",
): DomainResultValue<Query> {
  const result = preloadedQueryResult(preloaded) as DomainResult<DomainResultValue<Query>>;
  if (!result.ok) redirect(redirectTo);
  return result.value;
}

export function requirePreloadedValue<Query extends FunctionReference<"query">>(
  preloaded: Preloaded<Query>,
  redirectTo = "/",
): NonNullable<FunctionReturnType<Query>> {
  const result = preloadedQueryResult(preloaded);
  if (result === null || result === undefined) redirect(redirectTo);
  return result as NonNullable<FunctionReturnType<Query>>;
}
