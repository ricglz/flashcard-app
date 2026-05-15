import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { FunctionReturnType } from "convex/server";
import type { Id } from "./_generated/dataModel";
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

type GeneratedSetHttpBody = {
  name: string;
  description?: string;
  sourceSetIds: Id<"flashcardSets">[];
  sourceScope: "single_set" | "srs_enabled_sets" | "custom";
  weakContextMethodology?: "balanced" | "recent_lapses" | "low_ease" | "learning_stuck";
  fieldDefinitions: Array<{
    name: string;
    role: "primary" | "pronunciation" | "definition" | "note";
    metadata: Record<string, unknown>;
    order: number;
  }>;
  cards: Array<{
    fields: Record<string, string>;
    sourceCardIds?: Id<"flashcards">[];
    rationale?: string;
  }>;
  addToSrs: boolean;
};

function validateBody<A, I>(schema: Schema.Schema<A, I>, body: unknown): Response | null {
  const result = Schema.decodeUnknownEither(schema)(body);
  if (result._tag === "Left") {
    const issues = ParseResult.ArrayFormatter.formatErrorSync(result.left);
    const message = issues.map((i: ParseResult.ArrayFormatterIssue) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return errorResponse("bad_request", message, 400);
  }
  return null;
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

async function readJson(req: Request) {
  const text = await req.text();
  if (text.trim().length === 0) return {};
  return JSON.parse(text) as Record<string, unknown>;
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
      const body = await readJson(req);
      const validationError = validateBody(SetsListRequestSchema, body);
      if (validationError) return validationError;
      const include = body.include && typeof body.include === "object" ? body.include as {
        srsSummary?: boolean;
        schemaFingerprint?: boolean;
        fieldDefinitions?: boolean;
      } : undefined;
      const result = await ctx.runQuery(internal.tooling.listSetsForTool, {
        userId: auth.auth.userId,
        ...(include ? { include } : {}),
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
      const body = await readJson(req);
      const validationError = validateBody(WeakCardsRequestSchema, body);
      if (validationError) return validationError;
      const result = await ctx.runQuery(internal.tooling.getWeakCardsForTool, {
        userId: auth.auth.userId,
        ...body,
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
      const body = await readJson(req);
      const validationError = validateBody(GeneratedSetPayloadSchema, body);
      if (validationError) return validationError;
      const payload = body as GeneratedSetHttpBody;
      if (payload.addToSrs && !auth.auth.scopes.includes("srs:enroll")) {
        return errorResponse("Forbidden", "CLI token is missing required scope: srs:enroll", 403);
      }
      const result = await ctx.runQuery(internal.tooling.validateGeneratedSetForTool, {
        ...payload,
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
      const body = await readJson(req);
      const validationError = validateBody(GeneratedSetPayloadSchema, body);
      if (validationError) return validationError;
      const payload = body as GeneratedSetHttpBody;
      if (payload.addToSrs && !auth.auth.scopes.includes("srs:enroll")) {
        return errorResponse("Forbidden", "CLI token is missing required scope: srs:enroll", 403);
      }
      const result = await ctx.runMutation(internal.tooling.createGeneratedSetForTool, {
        ...payload,
        userId: auth.auth.userId,
      });
      if ("ok" in result && result.ok === false) {
        return errorResponse(result.error._tag, result.error.message, 400);
      }
      return jsonResponse(result);
    } catch (err) {
      return errorResponse("bad_request", err instanceof Error ? err.message : "Invalid request.", 400);
    }
  }),
});

export default http;
