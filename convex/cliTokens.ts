import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { cliScopeValidator } from "./schema";
import { fail, unauthenticated, forbidden, notFound } from "./domain/result";

const TOKEN_PREFIX = "fcai";
const PUBLIC_ID_LENGTH = 12;
const SECRET_LENGTH = 43;
const TOKEN_PART_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-";
const INACTIVITY_TTL_MS = 24 * 60 * 60 * 1000;
const ABSOLUTE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const DEFAULT_SCOPES = [
  "sets:read",
  "weak_context:read",
  "ai_sets:create",
  "srs:enroll",
] as const;

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function randomTokenPart(length: number): string {
  let result = "";
  // Rejection sampling keeps the generated characters unbiased while avoiding
  // "_" so token parts can be delimited unambiguously with underscores.
  const maxByte = Math.floor(256 / TOKEN_PART_ALPHABET.length) * TOKEN_PART_ALPHABET.length;
  while (result.length < length) {
    const bytes = new Uint8Array(Math.ceil((length - result.length) * 1.1) + 4);
    crypto.getRandomValues(bytes);
    for (const byte of bytes) {
      if (byte >= maxByte) continue;
      result += TOKEN_PART_ALPHABET[byte % TOKEN_PART_ALPHABET.length];
      if (result.length === length) break;
    }
  }
  return result;
}

export function parseCliToken(token: string) {
  const parts = token.split("_");
  if (parts.length !== 3 || parts[0] !== TOKEN_PREFIX || !parts[1] || !parts[2]) {
    return null;
  }
  return { publicId: parts[1], secret: parts[2] };
}

async function revokeActiveTokens(ctx: MutationCtx, userId: string, now: number) {
  const tokens = await ctx.db
    .query("cliAccessTokens")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .take(100);
  for (const token of tokens) {
    if (!token.revokedAt && token.expiresAt > now) {
      await ctx.db.patch(token._id, { revokedAt: now });
    }
  }
}

export const getStatus = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const now = Date.now();
    const tokens = await ctx.db
      .query("cliAccessTokens")
      .withIndex("by_userId", (q) => q.eq("userId", identity.tokenIdentifier))
      .take(100);
    const active = tokens
      .filter(
        (token) =>
          !token.revokedAt &&
          token.expiresAt > now &&
          (token.absoluteExpiresAt === undefined || token.absoluteExpiresAt > now)
      )
      .sort((a, b) => b.createdAt - a.createdAt)[0];
    if (!active) return { enabled: false as const };
    return {
      enabled: true as const,
      publicId: active.publicId,
      label: active.label,
      scopes: active.scopes,
      createdAt: active.createdAt,
      lastUsedAt: active.lastUsedAt,
      expiresAt: active.expiresAt,
      absoluteExpiresAt: active.absoluteExpiresAt,
    };
  },
});

export const create = mutation({
  args: {
    label: v.optional(v.string()),
    scopes: v.optional(v.array(cliScopeValidator)),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return fail(unauthenticated());
    const now = Date.now();
    await revokeActiveTokens(ctx, identity.tokenIdentifier, now);

    const publicId = randomTokenPart(PUBLIC_ID_LENGTH);
    const secret = randomTokenPart(SECRET_LENGTH);
    const token = `${TOKEN_PREFIX}_${publicId}_${secret}`;
    const tokenHash = await sha256Hex(secret);
    const scopes = args.scopes ?? [...DEFAULT_SCOPES];

    await ctx.db.insert("cliAccessTokens", {
      userId: identity.tokenIdentifier,
      publicId,
      tokenHash,
      label: args.label?.trim() ?? "Local AI assistant CLI",
      scopes,
      createdAt: now,
      expiresAt: now + INACTIVITY_TTL_MS,
      absoluteExpiresAt: now + ABSOLUTE_TTL_MS,
    });

    return {
      token,
      publicId,
      scopes,
      expiresAt: now + INACTIVITY_TTL_MS,
      absoluteExpiresAt: now + ABSOLUTE_TTL_MS,
    };
  },
});

export const revoke = mutation({
  args: { publicId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return fail(unauthenticated());
    const now = Date.now();
    const tokens = await ctx.db
      .query("cliAccessTokens")
      .withIndex("by_userId", (q) => q.eq("userId", identity.tokenIdentifier))
      .take(100);
    let revoked = 0;
    for (const token of tokens) {
      if (args.publicId && token.publicId !== args.publicId) continue;
      if (!token.revokedAt) {
        await ctx.db.patch(token._id, { revokedAt: now });
        revoked++;
      }
    }
    return { revoked };
  },
});

export const authenticate = internalMutation({
  args: {
    token: v.string(),
    requiredScopes: v.array(cliScopeValidator),
  },
  handler: async (ctx, args) => {
    const parsed = parseCliToken(args.token);
    if (!parsed) return fail(unauthenticated());

    const row = await ctx.db
      .query("cliAccessTokens")
      .withIndex("by_publicId", (q) => q.eq("publicId", parsed.publicId))
      .unique();
    if (!row) return fail(unauthenticated());

    const now = Date.now();
    const tokenHash = await sha256Hex(parsed.secret);
    if (tokenHash !== row.tokenHash) return fail(unauthenticated());
    if (row.revokedAt) return fail(forbidden("CLI token has been revoked."));
    if (row.expiresAt <= now) return fail(forbidden("CLI token expired. Re-enable CLI access in the web app."));
    if (row.absoluteExpiresAt !== undefined && row.absoluteExpiresAt <= now) {
      return fail(forbidden("CLI token expired. Rotate CLI access in the web app."));
    }

    for (const scope of args.requiredScopes) {
      if (!row.scopes.includes(scope)) {
        return fail(forbidden(`CLI token is missing required scope: ${scope}`));
      }
    }

    const nextExpiresAt = Math.min(
      now + INACTIVITY_TTL_MS,
      row.absoluteExpiresAt ?? now + INACTIVITY_TTL_MS
    );
    await ctx.db.patch(row._id, { lastUsedAt: now, expiresAt: nextExpiresAt });

    return {
      ok: true as const,
      value: {
        userId: row.userId,
        publicId: row.publicId,
        scopes: row.scopes,
        lastUsedAt: now,
        expiresAt: nextExpiresAt,
        absoluteExpiresAt: row.absoluteExpiresAt,
      },
    };
  },
});

export const getByPublicId = query({
  args: { publicId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return fail(unauthenticated());
    const row = await ctx.db
      .query("cliAccessTokens")
      .withIndex("by_publicId", (q) => q.eq("publicId", args.publicId))
      .unique();
    if (!row || row.userId !== identity.tokenIdentifier) return fail(notFound("CLI token not found"));
    return {
      publicId: row.publicId,
      label: row.label,
      scopes: row.scopes,
      createdAt: row.createdAt,
      lastUsedAt: row.lastUsedAt,
      expiresAt: row.expiresAt,
      absoluteExpiresAt: row.absoluteExpiresAt,
      revokedAt: row.revokedAt,
    };
  },
});
