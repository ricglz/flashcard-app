import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { FunctionReturnType } from "convex/server";
import type { ApiErrorResponse } from "../src/lib/aiToolingSchemas";
import {
  SetsListRequestSchema,
  WeakCardsRequestSchema,
  GeneratedSetPayloadSchema,
} from "../src/lib/aiToolingSchemas";
import * as Schema from "effect/Schema";
import * as ParseResult from "effect/ParseResult";

const http = httpRouter();

type Scope = "sets:read" | "weak_context:read" | "ai_sets:create" | "srs:enroll";

async function parseBody<A, I>(
  req: Request,
  schema: Schema.Schema<A, I, never>,
): Promise<{ ok: true; data: A } | { ok: false; response: Response }> {
  const text = await req.text();
  const json = text.trim().length === 0 ? "{}" : text;
  const result = Schema.decodeUnknownEither(Schema.parseJson(schema))(json);
  if (result._tag === "Left") {
    const issues = ParseResult.ArrayFormatter.formatErrorSync(result.left);
    const message = issues.map((i: ParseResult.ArrayFormatterIssue) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return { ok: false, response: errorResponse("bad_request", message, 400) };
  }
  return { ok: true, data: result.right };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function errorResponse(code: string, message: string, status: number) {
  const body: ApiErrorResponse = { error: { code, message } };
  return jsonResponse(body, status);
}

function bearerToken(req: Request) {
  const header = req.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

async function authenticate(
  ctx: Parameters<Parameters<typeof httpAction>[0]>[0],
  req: Request,
  requiredScopes: Scope[]
) {
  const token = bearerToken(req);
  if (!token) return { ok: false as const, response: errorResponse("unauthenticated", "Missing bearer token.", 401) };
  const auth: FunctionReturnType<typeof internal.cliTokens.authenticate> = await ctx.runMutation(
    internal.cliTokens.authenticate,
    { token, requiredScopes }
  );
  if (!auth.ok) {
    const status = auth.error._tag === "Forbidden" ? 403 : 401;
    return { ok: false as const, response: errorResponse(auth.error._tag, auth.error.message, status) };
  }
  return { ok: true as const, auth: auth.value };
}

http.route({
  path: "/tooling/v1/token/status",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const auth = await authenticate(ctx, req, []);
    if (!auth.ok) return auth.response;
    return jsonResponse({
      authenticated: true,
      scopes: auth.auth.scopes,
      lastUsedAt: auth.auth.lastUsedAt,
      expiresAt: auth.auth.expiresAt,
      absoluteExpiresAt: auth.auth.absoluteExpiresAt,
    });
  }),
});

http.route({
  path: "/tooling/v1/sets/list",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const auth = await authenticate(ctx, req, ["sets:read"]);
    if (!auth.ok) return auth.response;
    try {
      const body = await parseBody(req, SetsListRequestSchema);
      if (!body.ok) return body.response;
      const result = await ctx.runQuery(internal.tooling.listSetsForTool, {
        userId: auth.auth.userId,
        ...(body.data.include ? { include: body.data.include } : {}),
      });
      return jsonResponse(result);
    } catch (err) {
      return errorResponse("bad_request", err instanceof Error ? err.message : "Invalid request.", 400);
    }
  }),
});

http.route({
  path: "/tooling/v1/srs/weak-cards",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const auth = await authenticate(ctx, req, ["weak_context:read"]);
    if (!auth.ok) return auth.response;
    try {
      const body = await parseBody(req, WeakCardsRequestSchema);
      if (!body.ok) return body.response;
      const { scope, filters, ...rest } = body.data;
      const result = await ctx.runQuery(internal.tooling.getWeakCardsForTool, {
        userId: auth.auth.userId,
        ...rest,
        ...(scope && {
          scope: scope.kind === "sets"
            ? { ...scope, setIds: [...scope.setIds] }
            : scope,
        }),
        ...(filters && {
          filters: {
            ...filters,
            ratings: filters.ratings && [...filters.ratings],
            statuses: filters.statuses && [...filters.statuses],
          },
        }),
      });
      return jsonResponse(result);
    } catch (err) {
      return errorResponse("bad_request", err instanceof Error ? err.message : "Invalid request.", 400);
    }
  }),
});

http.route({
  path: "/tooling/v1/generated-sets/validate",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const auth = await authenticate(ctx, req, ["ai_sets:create"]);
    if (!auth.ok) return auth.response;
    try {
      const body = await parseBody(req, GeneratedSetPayloadSchema);
      if (!body.ok) return body.response;
      if (body.data.addToSrs && !auth.auth.scopes.includes("srs:enroll")) {
        return errorResponse("Forbidden", "CLI token is missing required scope: srs:enroll", 403);
      }
      const { sourceSetIds, fieldDefinitions, cards, ...rest } = body.data;
      const result = await ctx.runQuery(internal.tooling.validateGeneratedSetForTool, {
        ...rest,
        sourceSetIds: [...sourceSetIds],
        fieldDefinitions: [...fieldDefinitions],
        cards: cards.map(({ sourceCardIds, ...c }) => ({
          ...c,
          sourceCardIds: sourceCardIds && [...sourceCardIds],
        })),
        userId: auth.auth.userId,
      });
      return jsonResponse(result);
    } catch (err) {
      return errorResponse("bad_request", err instanceof Error ? err.message : "Invalid request.", 400);
    }
  }),
});

http.route({
  path: "/tooling/v1/generated-sets/create",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const auth = await authenticate(ctx, req, ["ai_sets:create"]);
    if (!auth.ok) return auth.response;
    try {
      const body = await parseBody(req, GeneratedSetPayloadSchema);
      if (!body.ok) return body.response;
      if (body.data.addToSrs && !auth.auth.scopes.includes("srs:enroll")) {
        return errorResponse("Forbidden", "CLI token is missing required scope: srs:enroll", 403);
      }
      const { sourceSetIds, fieldDefinitions, cards, ...rest } = body.data;
      const result = await ctx.runMutation(internal.tooling.createGeneratedSetForTool, {
        ...rest,
        sourceSetIds: [...sourceSetIds],
        fieldDefinitions: [...fieldDefinitions],
        cards: cards.map(({ sourceCardIds, ...c }) => ({
          ...c,
          sourceCardIds: sourceCardIds && [...sourceCardIds],
        })),
        userId: auth.auth.userId,
      });
      if (!result.ok) {
        return errorResponse(result.error._tag, result.error.message, 400);
      }
      return jsonResponse(result.value);
    } catch (err) {
      return errorResponse("bad_request", err instanceof Error ? err.message : "Invalid request.", 400);
    }
  }),
});

export default http;
