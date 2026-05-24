import { describe, expect, it } from "vitest";
import * as Schema from "effect/Schema";
import {
  domainResultToHttpEffect,
  ForbiddenError,
  handleToolingEffectRequest,
  handleToolingRequest,
  handleToolingRequestNoBody,
  type Auth,
} from "../../convex/lib/httpEffect";
import * as Effect from "effect/Effect";

type ToolingCtx = Parameters<typeof handleToolingRequest>[0];

const auth: Auth = {
  userId: "test-user",
  scopes: ["sets:read"],
  lastUsedAt: 1,
  expiresAt: 2,
  absoluteExpiresAt: undefined,
};

function request(body?: string): Request {
  return new Request("https://example.com/tooling", {
    method: "POST",
    headers: { authorization: "Bearer test-token" },
    ...(body !== undefined ? { body } : {}),
  });
}

function ctxWithAuthResult(authResult: unknown): ToolingCtx {
  return {
    runMutation: async () => authResult,
    runQuery: async () => {
      throw new Error("Unexpected runQuery");
    },
  } as ToolingCtx;
}

async function responseJson(response: Response): Promise<unknown> {
  return response.json();
}

describe("handleToolingRequest", () => {
  it("maps invalid JSON bodies to 400 responses", async () => {
    const response = await handleToolingRequest(
      ctxWithAuthResult({ ok: true, value: auth }),
      request("{"),
      Schema.Struct({ name: Schema.String }),
      ["sets:read"],
      async () => ({ ok: true }),
    );

    expect(response.status).toBe(400);
    expect(await responseJson(response)).toMatchObject({
      error: { code: "bad_request" },
    });
  });

  it("maps handler validation failures to 400 responses", async () => {
    const response = await handleToolingRequest(
      ctxWithAuthResult({ ok: true, value: auth }),
      request(JSON.stringify({ name: "Deck" })),
      Schema.Struct({ name: Schema.String }),
      ["sets:read"],
      async () => {
        throw new Error("Invalid generated set.");
      },
    );

    expect(response.status).toBe(400);
    expect(await responseJson(response)).toEqual({
      error: { code: "bad_request", message: "Invalid generated set." },
    });
  });

  it("preserves typed handler failures", async () => {
    const response = await handleToolingRequest(
      ctxWithAuthResult({ ok: true, value: auth }),
      request(JSON.stringify({ name: "Deck" })),
      Schema.Struct({ name: Schema.String }),
      ["sets:read"],
      async () => {
        throw new ForbiddenError("Missing generated-set scope.");
      },
    );

    expect(response.status).toBe(403);
    expect(await responseJson(response)).toEqual({
      error: { code: "forbidden", message: "Missing generated-set scope." },
    });
  });

  it("maps domain results in effect handlers", async () => {
    const response = await handleToolingEffectRequest(
      ctxWithAuthResult({ ok: true, value: auth }),
      request(JSON.stringify({ name: "Deck" })),
      Schema.Struct({ name: Schema.String }),
      ["sets:read"],
      () =>
        domainResultToHttpEffect({
          ok: false,
          error: {
            _tag: "Conflict",
            message: "Generated set already exists.",
          },
        }),
    );

    expect(response.status).toBe(409);
    expect(await responseJson(response)).toEqual({
      error: { code: "conflict", message: "Generated set already exists." },
    });
  });

  it("returns effect handler successes as JSON", async () => {
    const response = await handleToolingEffectRequest(
      ctxWithAuthResult({ ok: true, value: auth }),
      request(JSON.stringify({ name: "Deck" })),
      Schema.Struct({ name: Schema.String }),
      ["sets:read"],
      () => Effect.succeed({ created: true }),
    );

    expect(response.status).toBe(200);
    expect(await responseJson(response)).toEqual({ created: true });
  });

  it("maps missing bearer tokens to 401 responses", async () => {
    const response = await handleToolingRequest(
      ctxWithAuthResult({ ok: true, value: auth }),
      new Request("https://example.com/tooling", { method: "POST", body: "{}" }),
      Schema.Struct({}),
      [],
      async () => ({ ok: true }),
    );

    expect(response.status).toBe(401);
    expect(await responseJson(response)).toEqual({
      error: { code: "unauthenticated", message: "Missing bearer token." },
    });
  });

  it("maps forbidden auth failures to 403 responses", async () => {
    const response = await handleToolingRequestNoBody(
      ctxWithAuthResult({
        ok: false,
        error: { _tag: "Forbidden", message: "CLI token is missing required scope." },
      }),
      request(),
      ["sets:read"],
      async () => ({ ok: true }),
    );

    expect(response.status).toBe(403);
    expect(await responseJson(response)).toEqual({
      error: { code: "forbidden", message: "CLI token is missing required scope." },
    });
  });
});
