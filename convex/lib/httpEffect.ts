import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import * as ParseResult from "effect/ParseResult";
import { internal } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";
import type { ApiErrorResponse } from "../../src/lib/aiToolingSchemas";

export type Scope = "sets:read" | "weak_context:read" | "ai_sets:create" | "srs:enroll";

export type Auth = {
  userId: string;
  scopes: Scope[];
  lastUsedAt: number;
  expiresAt: number;
  absoluteExpiresAt: number | undefined;
};

type AuthResult =
  | { readonly ok: true; readonly value: Auth }
  | {
      readonly ok: false;
      readonly error: { readonly _tag: string; readonly message: string };
    };

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

function parseErrorMessage(error: unknown): string {
  if (!ParseResult.isParseError(error)) {
    return error instanceof Error ? error.message : "Invalid request.";
  }

  const issues = ParseResult.ArrayFormatter.formatErrorSync(error);
  return issues
    .map((i: ParseResult.ArrayFormatterIssue) => `${i.path.join(".")}: ${i.message}`)
    .join("; ");
}

/**
 * Effect-based authentication
 */
export function authenticateEffect(
  ctx: Pick<ActionCtx, "runMutation">,
  req: Request,
  requiredScopes: Scope[]
): Effect.Effect<Auth, UnauthenticatedError | ForbiddenError> {
  return Effect.gen(function* () {
    const token = bearerToken(req);
    if (!token) {
      return yield* Effect.fail(new UnauthenticatedError("Missing bearer token."));
    }

    const auth: AuthResult = yield* Effect.promise(() =>
      ctx.runMutation(internal.cliTokens.authenticate, { token, requiredScopes })
    );

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
        return new ParseError(parseErrorMessage(error));
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

function isHttpError(error: unknown): error is HttpError {
  return error instanceof UnauthenticatedError ||
    error instanceof ForbiddenError ||
    error instanceof ParseError ||
    error instanceof NotFoundError;
}

/**
 * Main handler for tooling requests
 * Composes authentication, body parsing, and business logic execution
 */
export function handleToolingRequest<A, I, R>(
  ctx: Pick<ActionCtx, "runMutation" | "runQuery">,
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
        return new ParseError(err instanceof Error ? err.message : "Invalid request.");
      },
    });
    return jsonResponse(result);
  });

  return program.pipe(
    Effect.catchAll((error: unknown) => {
      if (isHttpError(error)) {
        return Effect.succeed(httpErrorToResponse(error));
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
  ctx: Pick<ActionCtx, "runMutation">,
  req: Request,
  scopes: Scope[],
  handler: (auth: Auth) => Promise<R>
): Promise<Response> {
  const program = Effect.gen(function* () {
    const auth = yield* authenticateEffect(ctx, req, scopes);
    const result = yield* Effect.tryPromise({
      try: () => handler(auth),
      catch: (err) => {
        return new ParseError(err instanceof Error ? err.message : "Invalid request.");
      },
    });
    return jsonResponse(result);
  });

  return program.pipe(
    Effect.catchAll((error: unknown) => {
      if (isHttpError(error)) {
        return Effect.succeed(httpErrorToResponse(error));
      }
      return Effect.succeed(errorResponse("internal_error", "Unexpected error", 500));
    }),
    Effect.runPromise
  );
}
