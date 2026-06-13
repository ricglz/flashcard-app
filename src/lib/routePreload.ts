import "server-only";

import { redirect } from "next/navigation";
import {
  fetchQuery,
  preloadQuery,
  preloadedQueryResult,
  type NextjsOptions,
} from "convex/nextjs";
import type { Preloaded } from "convex/react";
import type {
  FunctionArgs,
  FunctionReference,
  FunctionReturnType,
} from "convex/server";
import { isConvexArgumentValidationError } from "@/lib/convexErrors";
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

export async function preloadRouteQuery<Query extends FunctionReference<"query">>(
  query: Query,
  args: FunctionArgs<Query>,
  options: NextjsOptions,
  redirectTo = "/",
): Promise<Preloaded<Query>> {
  let validationError: unknown;
  try {
    return await preloadQuery(query, args, options);
  } catch (error) {
    if (!isConvexArgumentValidationError(error)) throw error;
    validationError = error;
  }

  if (validationError) redirect(redirectTo);
  throw validationError;
}

export async function fetchRouteQuery<Query extends FunctionReference<"query">>(
  query: Query,
  args: FunctionArgs<Query>,
  options: NextjsOptions,
  redirectTo = "/",
): Promise<FunctionReturnType<Query>> {
  let validationError: unknown;
  try {
    return await fetchQuery(query, args, options);
  } catch (error) {
    if (!isConvexArgumentValidationError(error)) throw error;
    validationError = error;
  }

  if (validationError) redirect(redirectTo);
  throw validationError;
}

type DomainResult<T> = { ok: true; value: T } | { ok: false; error?: unknown };
type DomainQuery = FunctionReference<"query"> & {
  _returnType: DomainResult<unknown>;
};

export function requirePreloadedDomainResult<
  Query extends DomainQuery,
>(
  preloaded: Preloaded<Query>,
  redirectTo = "/",
): FunctionReturnType<Query> extends DomainResult<infer Value> ? Value : never {
  const result = preloadedQueryResult(preloaded);
  if (!result.ok) redirect(redirectTo);
  return result.value;
}

export function assertPreloadedDomainResult<Query extends DomainQuery>(
  preloaded: Preloaded<Query>,
  redirectTo = "/",
): void {
  const result = preloadedQueryResult(preloaded);
  if (!result.ok) redirect(redirectTo);
}

export function requirePreloadedValue<Query extends FunctionReference<"query">>(
  preloaded: Preloaded<Query>,
  redirectTo = "/",
): NonNullable<FunctionReturnType<Query>> {
  const result = preloadedQueryResult(preloaded);
  if (result === null || result === undefined) redirect(redirectTo);
  return result;
}
