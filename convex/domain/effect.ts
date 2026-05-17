import * as Effect from "effect/Effect";
import * as Either from "effect/Either";
import type { UserIdentity } from "convex/server";
import type { AnyDomainFailure, CommonFailure, DomainResult } from "./result";

export function fromDomainResult<T, E extends AnyDomainFailure>(
  result: DomainResult<T, E>,
): Effect.Effect<T, E> {
  return result.ok ? Effect.succeed(result.value) : Effect.fail(result.error);
}

export function fromAsyncDomainResult<T, E extends AnyDomainFailure>(
  promise: Promise<DomainResult<T, E>>,
): Effect.Effect<T, E> {
  return Effect.promise(() => promise).pipe(Effect.flatMap(fromDomainResult));
}

export function toDomainResult<T, E extends AnyDomainFailure>(
  effect: Effect.Effect<T, E>,
): DomainResult<T, E> {
  const either = Effect.runSync(Effect.either(effect));
  return Either.isLeft(either)
    ? { ok: false, error: either.left }
    : { ok: true, value: either.right };
}

export async function toDomainResultAsync<T, E extends AnyDomainFailure>(
  effect: Effect.Effect<T, E>,
): Promise<DomainResult<T, E>> {
  const either = await Effect.runPromise(Effect.either(effect));
  return Either.isLeft(either)
    ? { ok: false, error: either.left }
    : { ok: true, value: either.right };
}

export function requireAuth(
  ctx: { auth: { getUserIdentity(): Promise<UserIdentity | null> } },
): Effect.Effect<UserIdentity, CommonFailure> {
  return Effect.promise(() => ctx.auth.getUserIdentity()).pipe(
    Effect.flatMap((identity) =>
      identity
        ? Effect.succeed(identity)
        : Effect.fail({
            _tag: "Unauthenticated" as const,
            message: "Please sign in to continue.",
          }),
    ),
  );
}

export function requireEntity<T>(
  promise: Promise<T | null>,
  message?: string,
): Effect.Effect<T, CommonFailure> {
  return Effect.promise(() => promise).pipe(
    Effect.flatMap((entity) =>
      entity !== null
        ? Effect.succeed(entity)
        : Effect.fail({
            _tag: "NotFound" as const,
            message: message ?? "That item was not found.",
          }),
    ),
  );
}
