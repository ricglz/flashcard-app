import { describe, expect, it } from "vitest";
import * as Effect from "effect/Effect";
import * as Either from "effect/Either";
import {
  fromDomainResult,
  fromAsyncDomainResult,
  toDomainResult,
  toDomainResultAsync,
  requireAuth,
  requireEntity,
} from "../../convex/domain/effect";
import { ok, fail, type DomainResult } from "../../convex/domain/result";

describe("fromDomainResult", () => {
  it("lifts ok to Effect.succeed", () => {
    const result = Effect.runSync(fromDomainResult(ok(42)));
    expect(result).toBe(42);
  });

  it("lifts fail to Effect.fail", () => {
    const failure = { _tag: "TestError" as const, message: "boom" };
    const either = Effect.runSync(
      Effect.either(fromDomainResult(fail(failure))),
    );
    expect(Either.isLeft(either)).toBe(true);
    if (Either.isLeft(either)) expect(either.left).toEqual(failure);
  });
});

describe("fromAsyncDomainResult", () => {
  it("lifts async ok to Effect.succeed", async () => {
    const result = await Effect.runPromise(
      fromAsyncDomainResult(Promise.resolve(ok(42))),
    );
    expect(result).toBe(42);
  });

  it("lifts async fail to Effect.fail", async () => {
    const failure = { _tag: "TestError" as const, message: "boom" };
    const either = await Effect.runPromise(
      Effect.either(fromAsyncDomainResult(Promise.resolve(fail(failure)))),
    );
    expect(Either.isLeft(either)).toBe(true);
    if (Either.isLeft(either)) expect(either.left).toEqual(failure);
  });
});

describe("toDomainResult", () => {
  it("converts succeed to ok", () => {
    const result = toDomainResult(Effect.succeed(42));
    expect(result).toEqual({ ok: true, value: 42 });
  });

  it("converts fail to error", () => {
    const failure = { _tag: "TestError" as const, message: "boom" };
    const result: DomainResult<never, typeof failure> = toDomainResult(
      Effect.fail(failure),
    );
    expect(result).toEqual({ ok: false, error: failure });
  });
});

describe("toDomainResultAsync", () => {
  it("converts async succeed to ok", async () => {
    const result = await toDomainResultAsync(Effect.succeed(42));
    expect(result).toEqual({ ok: true, value: 42 });
  });

  it("converts async fail to error", async () => {
    const failure = { _tag: "TestError" as const, message: "boom" };
    const result = await toDomainResultAsync(Effect.fail(failure));
    expect(result).toEqual({ ok: false, error: failure });
  });

  it("handles async effects", async () => {
    const effect = Effect.promise(() => Promise.resolve(42));
    const result = await toDomainResultAsync(effect);
    expect(result).toEqual({ ok: true, value: 42 });
  });
});

describe("requireAuth", () => {
  it("succeeds with a valid identity", async () => {
    const identity = { tokenIdentifier: "test|123" } as Parameters<
      typeof requireAuth
    >[0] extends { auth: { getUserIdentity(): Promise<infer T> } }
      ? NonNullable<T>
      : never;
    const ctx = { auth: { getUserIdentity: () => Promise.resolve(identity) } };
    const result = await Effect.runPromise(requireAuth(ctx));
    expect(result.tokenIdentifier).toBe("test|123");
  });

  it("fails with Unauthenticated when identity is null", async () => {
    const ctx = { auth: { getUserIdentity: () => Promise.resolve(null) } };
    const either = await Effect.runPromise(Effect.either(requireAuth(ctx)));
    expect(Either.isLeft(either)).toBe(true);
    if (Either.isLeft(either)) {
      expect(either.left._tag).toBe("Unauthenticated");
    }
  });
});

describe("requireEntity", () => {
  it("succeeds when entity exists", async () => {
    const result = await Effect.runPromise(
      requireEntity(Promise.resolve({ id: 1 })),
    );
    expect(result).toEqual({ id: 1 });
  });

  it("fails with NotFound when entity is null", async () => {
    const either = await Effect.runPromise(
      Effect.either(requireEntity(Promise.resolve(null), "Thing not found")),
    );
    expect(Either.isLeft(either)).toBe(true);
    if (Either.isLeft(either)) {
      expect(either.left).toEqual({
        _tag: "NotFound",
        message: "Thing not found",
      });
    }
  });

  it("uses default message when none provided", async () => {
    const either = await Effect.runPromise(
      Effect.either(requireEntity(Promise.resolve(null))),
    );
    expect(Either.isLeft(either)).toBe(true);
    if (Either.isLeft(either)) {
      expect(either.left.message).toBe("That item was not found.");
    }
  });
});
