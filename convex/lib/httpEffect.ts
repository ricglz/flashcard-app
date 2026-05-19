import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import * as ParseResult from "effect/ParseResult";
import type { FunctionReturnType } from "convex/server";
import { internal } from "../_generated/api";
import type { ApiErrorResponse } from "../../src/lib/aiToolingSchemas";

export type Scope = "sets:read" | "weak_context:read" | "ai_sets:create" | "srs:enroll";

export interface Auth {
  userId: string;
  scopes: Scope[];
  lastUsedAt: number;
  expiresAt: number;
  absoluteExpiresAt: number | undefined;
}

// Error types for HTTP pipeline
export class UnauthenticatedError {
  readonly _tag = "Unauthenticated";
  constructor(readonly message: string) {}
}

export class ForbiddenError {
  readonly _tag = "Forbidden";
  constructor(readonly message: string) {}
}

export class ParseError {
  readonly _tag = "ParseError";
  constructor(readonly message: string) {}
}

export class NotFoundError {
  readonly _tag = "NotFound";
  constructor(readonly message: string) {}
}

export type HttpError = UnauthenticatedError | ForbiddenError | ParseError | NotFoundError;

/**
 * Extract bearer token from Authorization header
 */
function bearerToken(req: Request): string | null {
  const header = req.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

/**
 * Effect-based authentication
 */
export function authenticateEffect(
  ctx: { runMutation: Function },
  req: Request,
  requiredScopes: Scope[]
): Effect.Effect<Auth, UnauthenticatedError | ForbiddenError> {
  return Effect.gen(function* () {
    const token = bearerToken(req);
    if (!token) {
      return yield* Effect.fail(new UnauthenticatedError("Missing bearer token."));
    }

    const auth = (yield* Effect.promise(() =>
      ctx.runMutation(internal.cliTokens.authenticate, { token, requiredScopes })
    )) as FunctionReturnType<typeof internal.cliTokens.authenticate>;

    if (!auth.ok) {
      if (auth.error._tag === "Forbidden") {
        return yield* Effect.fail(new ForbiddenError(auth.error.message));
      }
      return yield* Effect.fail(new UnauthenticatedError(auth.error.message));
    }

    return auth.value;
  });
}

/**
 * Effect-based body parsing with Schema validation
 */
export function parseBodyEffect<A, I>(
  req: Request,
  schema: Schema.Schema<A, I, never>
): Effect.Effect<A, ParseError> {
  return Effect.gen(function* () {
    const text = yield* Effect.promise(() => req.text());
    const json = text.trim().length === 0 ? "{}" : text;

    const result = yield* Effect.try({
      try: () => Schema.decodeUnknownSync(Schema.parseJson(schema))(json),
      catch: (error) => {
        const issues = ParseResult.ArrayFormatter.formatErrorSync(error as ParseResult.ParseError);
        const message = issues
          .map((i: ParseResult.ArrayFormatterIssue) => `${i.path.join(".")}: ${i.message}`)
          .join("; ");
        return new ParseError(message);
      },
    });

    return result;
  });
}

/**
 * Create JSON response
 */
export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

/**
 * Create error response
 */
export function errorResponse(code: string, message: string, status: number): Response {
  const body: ApiErrorResponse = { error: { code, message } };
  return jsonResponse(body, status);
}

/**
 * Map HttpError to Response
 */
export function httpErrorToResponse(error: HttpError): Response {
  switch (error._tag) {
    case "Unauthenticated":
      return errorResponse("unauthenticated", error.message, 401);
    case "Forbidden":
      return errorResponse("forbidden", error.message, 403);
    case "ParseError":
      return errorResponse("bad_request", error.message, 400);
    case "NotFound":
      return errorResponse("not_found", error.message, 404);
  }
}

/**
 * Main handler for tooling requests
 * Composes authentication, body parsing, and business logic execution
 */
export function handleToolingRequest<A, I, R>(
  ctx: { runMutation: Function; runQuery: Function },
  req: Request,
  schema: Schema.Schema<A, I, never>,
  scopes: Scope[],
  handler: (auth: Auth, body: A) => Promise<R>
): Promise<Response> {
  const program = Effect.gen(function* () {
    const auth = yield* authenticateEffect(ctx, req, scopes);
    const body = yield* parseBodyEffect(req, schema);
    const result = yield* Effect.tryPromise({
      try: () => handler(auth, body),
      catch: (err) => {
        throw new ParseError(err instanceof Error ? err.message : "Invalid request.");
      },
    });
    return jsonResponse(result);
  });

  return program.pipe(
    Effect.catchAll((error: unknown) => {
      if (error && typeof error === "object" && "_tag" in error) {
        const taggedError = error as HttpError;
        if (taggedError._tag === "Unauthenticated" || 
            taggedError._tag === "Forbidden" || 
            taggedError._tag === "ParseError" || 
            taggedError._tag === "NotFound") {
          return Effect.succeed(httpErrorToResponse(taggedError));
        }
      }
      return Effect.succeed(errorResponse("internal_error", "Unexpected error", 500));
    }),
    Effect.runPromise
  );
}

/**
 * Handler for requests without body (e.g., token status)
 */
export function handleToolingRequestNoBody<R>(
  ctx: { runMutation: Function },
  req: Request,
  scopes: Scope[],
  handler: (auth: Auth) => Promise<R>
): Promise<Response> {
  const program = Effect.gen(function* () {
    const auth = yield* authenticateEffect(ctx, req, scopes);
    const result = yield* Effect.tryPromise({
      try: () => handler(auth),
      catch: (err) => {
        throw new ParseError(err instanceof Error ? err.message : "Invalid request.");
      },
    });
    return jsonResponse(result);
  });

  return program.pipe(
    Effect.catchAll((error: unknown) => {
      if (error && typeof error === "object" && "_tag" in error) {
        const taggedError = error as HttpError;
        if (taggedError._tag === "Unauthenticated" || 
            taggedError._tag === "Forbidden" || 
            taggedError._tag === "ParseError" || 
            taggedError._tag === "NotFound") {
          return Effect.succeed(httpErrorToResponse(taggedError));
        }
      }
      return Effect.succeed(errorResponse("internal_error", "Unexpected error", 500));
    }),
    Effect.runPromise
  );
}
