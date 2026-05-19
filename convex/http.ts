import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  SetsListRequestSchema,
  WeakCardsRequestSchema,
  GeneratedSetPayloadSchema,
} from "../src/lib/aiToolingSchemas";
import {
  handleToolingRequest,
  handleToolingRequestNoBody,
  jsonResponse,
  errorResponse,
} from "./lib/httpEffect";

const http = httpRouter();

http.route({
  path: "/tooling/v1/token/status",
  method: "POST",
  handler: httpAction((ctx, req) =>
    handleToolingRequestNoBody(ctx, req, [], async (auth) => ({
      authenticated: true,
      scopes: auth.scopes,
      lastUsedAt: auth.lastUsedAt,
      expiresAt: auth.expiresAt,
      absoluteExpiresAt: auth.absoluteExpiresAt,
    }))
  ),
});

http.route({
  path: "/tooling/v1/sets/list",
  method: "POST",
  handler: httpAction((ctx, req) =>
    handleToolingRequest(
      ctx,
      req,
      SetsListRequestSchema,
      ["sets:read"],
      async (auth, body) =>
        ctx.runQuery(internal.tooling.listSetsForTool, {
          userId: auth.userId,
          ...(body.include ? { include: body.include } : {}),
        })
    )
  ),
});

http.route({
  path: "/tooling/v1/srs/weak-cards",
  method: "POST",
  handler: httpAction((ctx, req) =>
    handleToolingRequest(
      ctx,
      req,
      WeakCardsRequestSchema,
      ["weak_context:read"],
      async (auth, body) => {
        const { scope, filters, ...rest } = body;
        return ctx.runQuery(internal.tooling.getWeakCardsForTool, {
          userId: auth.userId,
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
      }
    )
  ),
});

http.route({
  path: "/tooling/v1/generated-sets/validate",
  method: "POST",
  handler: httpAction((ctx, req) =>
    handleToolingRequest(
      ctx,
      req,
      GeneratedSetPayloadSchema,
      ["ai_sets:create"],
      async (auth, body) => {
        if (body.addToSrs && !auth.scopes.includes("srs:enroll")) {
          throw new Error("CLI token is missing required scope: srs:enroll");
        }
        const { sourceSetIds, fieldDefinitions, cards, ...rest } = body;
        return ctx.runQuery(internal.tooling.validateGeneratedSetForTool, {
          ...rest,
          sourceSetIds: [...sourceSetIds],
          fieldDefinitions: [...fieldDefinitions],
          cards: cards.map(({ sourceCardIds, ...c }) => ({
            ...c,
            sourceCardIds: sourceCardIds && [...sourceCardIds],
          })),
          userId: auth.userId,
        });
      }
    )
  ),
});

http.route({
  path: "/tooling/v1/generated-sets/create",
  method: "POST",
  handler: httpAction((ctx, req) =>
    handleToolingRequest(
      ctx,
      req,
      GeneratedSetPayloadSchema,
      ["ai_sets:create"],
      async (auth, body) => {
        if (body.addToSrs && !auth.scopes.includes("srs:enroll")) {
          throw new Error("CLI token is missing required scope: srs:enroll");
        }
        const { sourceSetIds, fieldDefinitions, cards, ...rest } = body;
        const result = await ctx.runMutation(internal.tooling.createGeneratedSetForTool, {
          ...rest,
          sourceSetIds: [...sourceSetIds],
          fieldDefinitions: [...fieldDefinitions],
          cards: cards.map(({ sourceCardIds, ...c }) => ({
            ...c,
            sourceCardIds: sourceCardIds && [...sourceCardIds],
          })),
          userId: auth.userId,
        });
        if (!result.ok) {
          throw new Error(`${result.error._tag}: ${result.error.message}`);
        }
        return result.value;
      }
    )
  ),
});

export default http;
