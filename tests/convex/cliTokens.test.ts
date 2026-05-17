/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../../convex/_generated/api";
import { parseCliToken } from "../../convex/cliTokens";
import schema from "../../convex/schema";
import { TEST_USER } from "./helpers";

const modules = import.meta.glob("../../convex/**/*.ts");

describe("parseCliToken", () => {
  it("parses tokens whose public id and secret do not contain underscores", () => {
    expect(parseCliToken("fcai_publicId_secret")).toEqual({
      publicId: "publicId",
      secret: "secret",
    });
  });

  it("rejects malformed tokens with extra underscores", () => {
    expect(parseCliToken("fcai_a_FML22cIL2z_Fz0wfXm7ZGvJeCOnWwgSVxqfkM42oexqAxCRIxAbWhE")).toBeNull();
  });
});

describe("cliTokens", () => {
  it("creates tokens with unambiguous delimiter-safe parts", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);

    const result = await as.mutation(api.cliTokens.create, {});
    expect(result).toMatchObject({ ok: true, value: { token: expect.any(String), publicId: expect.any(String) } });

    if (!result.ok) throw new Error("Expected ok result");
    const parsed = parseCliToken(result.value.token);
    expect(parsed).not.toBeNull();
    expect(parsed?.publicId).toBe(result.value.publicId);

    const [prefix, publicId, secret, ...extraParts] = result.value.token.split("_");
    expect(prefix).toBe("fcai");
    expect(publicId).toBe(result.value.publicId);
    expect(publicId).not.toContain("_");
    expect(secret).not.toContain("_");
    expect(extraParts).toHaveLength(0);
  });

  it("returns only sanitized token status after creation", async () => {
    const t = convexTest(schema, modules);
    const as = t.withIdentity(TEST_USER);

    const created = await as.mutation(api.cliTokens.create, {});
    if (!created.ok) throw new Error("Expected ok result");

    const status = await as.query(api.cliTokens.getStatus, {});
    expect(status).toMatchObject({
      enabled: true,
      publicId: created.value.publicId,
      scopes: created.value.scopes,
    });
    expect(JSON.stringify(status)).not.toContain(created.value.token);
    const parsed = parseCliToken(created.value.token);
    expect(parsed).not.toBeNull();
    expect(JSON.stringify(status)).not.toContain(parsed?.secret);
  });
});
