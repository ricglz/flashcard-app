import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import {
  fieldDefinitionValidator,
  ratingValidator,
  sourceScopeValidator,
  srsCardStatusValidator,
  weakContextMethodologyValidator,
} from "./schema";
import { validateCardFields } from "./domain/cardFields";
import {
  invalidInput,
  fail,
  notFound,
  ok,
  unauthenticated,
  type CommonFailure,
  type DomainResult,
} from "./domain/result";
import { getFieldDefinitions } from "./lib/typed";
import { enrollCardsForSetHelper } from "./userSets";
import { getDefaultFieldLayout } from "../src/lib/types";
import { insertCards } from "./lib/cardCreation";
import { schemaFingerprint } from "../src/lib/aiToolingSchemas";
import type {
  GeneratedSetPayload,
  SetsListResponse,
  WeakCardsResponse,
} from "../src/lib/aiToolingSchemas";
import type { CardRating, FieldDefinition } from "../src/lib/types";

type Methodology = "balanced" | "recent_lapses" | "low_ease" | "learning_stuck";
type SourceScope = GeneratedSetPayload["sourceScope"];
type WeakSchemaGroup = WeakCardsResponse["schemaGroups"][number];
type WeakSet = WeakSchemaGroup["sets"][number];
type WeakCard = WeakSet["weakCards"][number];
type WeakReason = WeakCard["weakReasons"][number];
type MutableWeakCard = Omit<WeakCard, "weakReasons" | "recentRatings"> & {
  weakReasons: WeakReason[];
  recentRatings?: CardRating[];
};
type MutableWeakSet = Omit<WeakSet, "weakCards"> & { weakCards: MutableWeakCard[] };
type MutableWeakGroup = Omit<WeakSchemaGroup, "fieldDefinitions" | "sets"> & {
  fieldDefinitions: FieldDefinition[];
  sets: MutableWeakSet[];
};

const DEFAULT_DAYS = 90;
const DEFAULT_LIMIT_PER_SET = 10;
const DEFAULT_TOTAL_LIMIT = 40;
const LOW_EASE_THRESHOLD = 2.0;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const setsListIncludeValidator = v.object({
  srsSummary: v.optional(v.boolean()),
  schemaFingerprint: v.optional(v.boolean()),
  fieldDefinitions: v.optional(v.boolean()),
});

const weakCardsScopeValidator = v.union(
  v.object({ kind: v.literal("srs_enabled_sets") }),
  v.object({ kind: v.literal("set"), setId: v.id("flashcardSets") }),
  v.object({ kind: v.literal("sets"), setIds: v.array(v.id("flashcardSets")) })
);

const generatedCardValidator = v.object({
  fields: v.record(v.string(), v.string()),
  sourceCardIds: v.optional(v.array(v.id("flashcards"))),
  rationale: v.optional(v.string()),
});

function originSummary(origin: Doc<"flashcardSets">["origin"]): { kind: string } {
  return { kind: origin.kind };
}

async function getUserSetLinks(ctx: QueryCtx, userId: string) {
  return await ctx.db
    .query("userSets")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .take(100);
}

async function assertAccessibleSets(
  ctx: QueryCtx | MutationCtx,
  userId: string,
  sourceSetIds: ReadonlyArray<Id<"flashcardSets">>,
  sourceScope: SourceScope,
) {
  const unique = [...new Set(sourceSetIds)];
  if (unique.length === 0) {
    return sourceScope === "custom"
      ? ok(unique)
      : fail(invalidInput("At least one source set is required.", "sourceSetIds"));
  }
  for (const setId of unique) {
    const link = await ctx.db
      .query("userSets")
      .withIndex("by_userId_and_setId", (q) => q.eq("userId", userId).eq("setId", setId))
      .first();
    if (!link) return fail(notFound("Source set not found."));
  }
  return ok(unique);
}

async function srsSummary(ctx: QueryCtx, userId: string, setId: Id<"flashcardSets">) {
  const srsCards = await ctx.db
    .query("srsCards")
    .withIndex("by_userId_and_setId", (q) => q.eq("userId", userId).eq("setId", setId))
    .take(1000);
  let newCount = 0;
  let learning = 0;
  let review = 0;
  let weakCandidateCount = 0;
  let totalEase = 0;
  for (const card of srsCards) {
    totalEase += card.easeFactor;
    if (card.status === "new") newCount++;
    else if (card.status === "learning") learning++;
    else review++;
    if (card.status === "learning" || card.easeFactor <= LOW_EASE_THRESHOLD) weakCandidateCount++;
  }
  return {
    new: newCount,
    learning,
    review,
    weakCandidateCount,
    avgEase: srsCards.length > 0 ? totalEase / srsCards.length : 0,
  };
}

export const listSetsForTool = internalQuery({
  args: {
    userId: v.string(),
    include: v.optional(setsListIncludeValidator),
  },
  handler: async (ctx, args): Promise<SetsListResponse> => {
    const links = await getUserSetLinks(ctx, args.userId);
    const sets = await Promise.all(
      links.map(async (link) => {
        const set = await ctx.db.get(link.setId);
        if (!set) return null;
        const fieldDefinitions = getFieldDefinitions(set);
        return {
          setId: set._id,
          name: set.name,
          ...(set.description !== undefined ? { description: set.description } : {}),
          srsEnabled: link.srsEnabled,
          cardCount: set.cardCount,
          origin: originSummary(set.origin),
          ...(args.include?.fieldDefinitions ? { fieldDefinitions } : {}),
          ...(args.include?.schemaFingerprint ? { schemaFingerprint: schemaFingerprint(fieldDefinitions) } : {}),
          ...(args.include?.srsSummary ? { srsSummary: await srsSummary(ctx, args.userId, set._id) } : {}),
        };
      }),
    );
    return { sets: sets.filter((s) => s !== null) };
  },
});

function scoreWeakCard(input: {
  methodology: Methodology;
  srsCard: { easeFactor: number; status: "new" | "learning" | "review"; repetitions: number; nextReviewAt: number; lastReviewedAt?: number };
  reviews: Array<{ rating: CardRating; timestamp: number }>;
  now: number;
}) {
  const { methodology, srsCard, reviews, now } = input;
  const wrongCount = reviews.filter((r) => r.rating === "wrong").length;
  const hardCount = reviews.filter((r) => r.rating === "hard").length;
  const lastRating = reviews[0]?.rating;
  const reasons: WeakReason[] = [];
  const lowEase = Math.max(0, LOW_EASE_THRESHOLD - srsCard.easeFactor);

  if (lastRating === "wrong") reasons.push("recent_wrong_rating");
  if (lastRating === "hard") reasons.push("recent_hard_rating");
  if (srsCard.easeFactor <= LOW_EASE_THRESHOLD) reasons.push("low_ease_factor");
  if (srsCard.status === "learning") reasons.push("learning_status");
  if (srsCard.repetitions >= 3 && srsCard.status !== "review") reasons.push("many_reviews_not_graduated");
  if (srsCard.nextReviewAt <= now) reasons.push("recently_due_again");

  let score = 0;
  switch (methodology) {
    case "recent_lapses":
      score = wrongCount * 6 + hardCount * 3 + (lastRating === "wrong" ? 4 : 0) + (lastRating === "hard" ? 2 : 0);
      break;
    case "low_ease":
      score = lowEase * 10 + wrongCount * 2 + hardCount;
      break;
    case "learning_stuck":
      score = (srsCard.status === "learning" ? 8 : 0) + srsCard.repetitions * 1.5 + wrongCount * 2 + hardCount;
      break;
    case "balanced":
      score = wrongCount * 4 + hardCount * 2 + lowEase * 5 + (srsCard.status === "learning" ? 3 : 0) + (lastRating === "wrong" ? 2 : 0);
      break;
  }

  if (reviews.length > 0) {
    const ageDays = Math.max(0, (now - (reviews[0]?.timestamp ?? now)) / MS_PER_DAY);
    score += Math.max(0, 2 - ageDays / 14);
  }

  return { score, reasons, wrongCount, hardCount, lastRating };
}

export const getWeakCardsForTool = internalQuery({
  args: {
    userId: v.string(),
    scope: v.optional(weakCardsScopeValidator),
    methodology: v.optional(weakContextMethodologyValidator),
    filters: v.optional(v.object({
      days: v.optional(v.number()),
      minReviews: v.optional(v.number()),
      ratings: v.optional(v.array(ratingValidator)),
      statuses: v.optional(v.array(srsCardStatusValidator)),
      maxEaseFactor: v.optional(v.number()),
      excludeAiGeneratedSets: v.optional(v.boolean()),
    })),
    limits: v.optional(v.object({
      limitPerSet: v.optional(v.number()),
      totalLimit: v.optional(v.number()),
    })),
    include: v.optional(v.object({
      recentRatings: v.optional(v.boolean()),
      siblingContext: v.optional(v.boolean()),
      strongCardSamples: v.optional(v.boolean()),
    })),
  },
  handler: async (ctx, args): Promise<WeakCardsResponse> => {
    return getWeakCardsHelper(ctx, args);
  },
});

export async function getWeakCardsHelper(
  ctx: QueryCtx,
  args: {
    userId: string;
    scope?: { kind: "srs_enabled_sets" } | { kind: "set"; setId: Id<"flashcardSets"> } | { kind: "sets"; setIds: Id<"flashcardSets">[] };
    methodology?: Methodology;
    filters?: {
      days?: number;
      minReviews?: number;
      ratings?: CardRating[];
      statuses?: Array<"new" | "learning" | "review">;
      maxEaseFactor?: number;
      excludeAiGeneratedSets?: boolean;
    };
    limits?: { limitPerSet?: number; totalLimit?: number };
    include?: { recentRatings?: boolean; siblingContext?: boolean; strongCardSamples?: boolean };
  }
): Promise<WeakCardsResponse> {
    const now = Date.now();
    const methodology = args.methodology ?? "balanced";
    const scope = args.scope ?? { kind: "srs_enabled_sets" as const };
    const days = Math.min(Math.max(args.filters?.days ?? DEFAULT_DAYS, 1), 365);
    const since = now - days * MS_PER_DAY;
    const limitPerSet = Math.min(Math.max(args.limits?.limitPerSet ?? DEFAULT_LIMIT_PER_SET, 1), 50);
    const totalLimit = Math.min(Math.max(args.limits?.totalLimit ?? DEFAULT_TOTAL_LIMIT, 1), 200);
    const includeRecentRatings = args.include?.recentRatings ?? true;

    const links = await getUserSetLinks(ctx, args.userId);
    const linkBySetId = new Map(links.map((link) => [link.setId, link]));
    let setIds: Id<"flashcardSets">[];
    if (scope.kind === "set") setIds = [scope.setId];
    else if (scope.kind === "sets") setIds = scope.setIds;
    else setIds = links.filter((link) => link.srsEnabled).map((link) => link.setId);

    const uniqueSetIds = [...new Set(setIds)];
    const sets = await Promise.all(uniqueSetIds.map((id) => ctx.db.get(id)));
    const existingSets = sets.filter((set): set is Doc<"flashcardSets"> => set !== null);
    const setMap = new Map(existingSets.map((set) => [set._id, set]));

    const srsCardsBySet = await Promise.all(
      uniqueSetIds.map((setId) =>
        ctx.db
          .query("srsCards")
          .withIndex("by_userId_and_setId", (q) => q.eq("userId", args.userId).eq("setId", setId))
          .take(1000)
      )
    );

    const allReviews = await ctx.db
      .query("srsReviews")
      .withIndex("by_userId_and_timestamp", (q) => q.eq("userId", args.userId).gte("timestamp", since))
      .order("desc")
      .take(5000);
    const reviewsBySrsCardId = new Map<string, typeof allReviews>();
    for (const review of allReviews) {
      const arr = reviewsBySrsCardId.get(review.srsCardId) ?? [];
      arr.push(review);
      reviewsBySrsCardId.set(review.srsCardId, arr);
    }

    const candidates: Array<{
      setId: Id<"flashcardSets">;
      setName: string;
      fieldDefinitions: FieldDefinition[];
      schemaFingerprint: string;
      cardId: Id<"flashcards">;
      srsCardId: Id<"srsCards">;
      weakScore: number;
      weakReasons: WeakReason[];
      metrics: WeakCardsResponse["schemaGroups"][number]["sets"][number]["weakCards"][number]["metrics"];
      recentRatings?: CardRating[];
    }> = [];

    for (let i = 0; i < uniqueSetIds.length; i++) {
      const setId = uniqueSetIds[i];
      const srsCards = srsCardsBySet[i];
      if (!setId || !srsCards) continue;
      const link = linkBySetId.get(setId);
      if (!link) continue;
      const set = setMap.get(setId);
      if (!set) continue;
      if (args.filters?.excludeAiGeneratedSets && set.origin.kind === "ai_generated") continue;
      const fieldDefinitions = getFieldDefinitions(set);
      const fingerprint = schemaFingerprint(fieldDefinitions);
      const perSet = [];
      for (const srsCard of srsCards) {
        if (args.filters?.statuses && !args.filters.statuses.includes(srsCard.status)) continue;
        if (args.filters?.maxEaseFactor !== undefined && srsCard.easeFactor > args.filters.maxEaseFactor) continue;
        const reviews = reviewsBySrsCardId.get(srsCard._id) ?? [];
        const recentReviews = reviews.filter((review) => review.timestamp >= since);
        if ((args.filters?.minReviews ?? 0) > recentReviews.length) continue;
        if (args.filters?.ratings && !recentReviews.some((review) => args.filters?.ratings?.includes(review.rating))) continue;
        const scored = scoreWeakCard({ methodology, srsCard, reviews: recentReviews, now });
        if (scored.score <= 0 && recentReviews.length === 0 && srsCard.status !== "learning" && srsCard.easeFactor > LOW_EASE_THRESHOLD) continue;
        perSet.push({
          setId,
          setName: set.name,
          fieldDefinitions,
          schemaFingerprint: fingerprint,
          cardId: srsCard.cardId,
          srsCardId: srsCard._id,
          weakScore: scored.score,
          weakReasons: scored.reasons,
          metrics: {
            reviewCount: recentReviews.length,
            wrongCount: scored.wrongCount,
            hardCount: scored.hardCount,
            ...(scored.lastRating !== undefined ? { lastRating: scored.lastRating } : {}),
            easeFactor: srsCard.easeFactor,
            repetitions: srsCard.repetitions,
            status: srsCard.status,
            ...(srsCard.lastReviewedAt !== undefined ? { lastReviewedAt: srsCard.lastReviewedAt } : {}),
          },
          ...(includeRecentRatings ? { recentRatings: recentReviews.slice(0, 10).map((review) => review.rating) } : {}),
        });
      }
      perSet.sort((a, b) => b.weakScore - a.weakScore);
      candidates.push(...perSet.slice(0, limitPerSet));
    }

    candidates.sort((a, b) => b.weakScore - a.weakScore);
    const selected = candidates.slice(0, totalLimit);

    const cardIds = selected.map((c) => c.cardId);
    const cards = await Promise.all(cardIds.map((id) => ctx.db.get(id)));
    const existingCards = cards.filter((card): card is Doc<"flashcards"> => card !== null);
    const cardMap = new Map(existingCards.map((card) => [card._id, card]));

    const groups = new Map<string, MutableWeakGroup>();
    for (const candidate of selected) {
      const card = cardMap.get(candidate.cardId);
      if (!card) continue;
      let group = groups.get(candidate.schemaFingerprint);
      if (!group) {
        group = { schemaFingerprint: candidate.schemaFingerprint, fieldDefinitions: candidate.fieldDefinitions, sets: [] };
        groups.set(candidate.schemaFingerprint, group);
      }
      let setEntry = group.sets.find((entry) => entry.setId === candidate.setId);
      if (!setEntry) {
        setEntry = { setId: candidate.setId, name: candidate.setName, weakCards: [] };
        group.sets.push(setEntry);
      }
      setEntry.weakCards.push({
        cardId: candidate.cardId,
        fields: card.fields,
        weakScore: candidate.weakScore,
        weakReasons: candidate.weakReasons,
        metrics: candidate.metrics,
        ...(candidate.recentRatings !== undefined ? { recentRatings: candidate.recentRatings } : {}),
      });
    }

    return { scope, methodology, generatedAt: now, schemaGroups: [...groups.values()] };
}

function normalizeGeneratedPayload(args: GeneratedSetPayload): GeneratedSetPayload {
  return {
    ...args,
    name: args.name.trim(),
    description: args.description?.trim() ?? undefined,
    cards: args.cards.map((card) => ({
      ...card,
      rationale: card.rationale?.trim() ?? undefined,
    })),
  };
}

async function validateGeneratedPayload(ctx: QueryCtx | MutationCtx, userId: string, args: GeneratedSetPayload) {
  const normalized = normalizeGeneratedPayload(args);
  const issues: string[] = [];
  if (normalized.name.length === 0) issues.push("Set name is required.");
  if (normalized.cards.length === 0) issues.push("At least one generated card is required.");
  if (normalized.cards.length > 100) issues.push("Generated sets are limited to 100 cards.");

  const accessible = await assertAccessibleSets(ctx, userId, normalized.sourceSetIds, normalized.sourceScope);
  if (!accessible.ok) issues.push(accessible.error.message);

  const expectedFingerprint = schemaFingerprint(normalized.fieldDefinitions);
  const uniqueSourceSetIds = [...new Set(normalized.sourceSetIds)];
  const sourceSets = await Promise.all(uniqueSourceSetIds.map((id) => ctx.db.get(id)));
  for (const source of sourceSets) {
    if (!source) {
      issues.push("Source set not found.");
      continue;
    }
    const sourceFingerprint = schemaFingerprint(getFieldDefinitions(source));
    if (sourceFingerprint !== expectedFingerprint) {
      issues.push("Generated set field definitions must match all source sets.");
      break;
    }
  }

  const expectedFieldNames = normalized.fieldDefinitions.map((field) => field.name);
  const allSourceCardIds = normalized.cards
    .flatMap((c) => c.sourceCardIds ?? [])
    .filter((id, idx, arr) => arr.indexOf(id) === idx);
  const sourceCards = await Promise.all(allSourceCardIds.map((id) => ctx.db.get(id)));
  const existingSourceCards = sourceCards.filter((card): card is Doc<"flashcards"> => card !== null);
  const sourceCardMap = new Map(existingSourceCards.map((card) => [card._id, card]));

  for (const [index, card] of normalized.cards.entries()) {
    const validation = validateCardFields(expectedFieldNames, card.fields);
    if (!validation.ok) issues.push(`Card ${index + 1}: ${validation.error.message}`);
    if (card.sourceCardIds) {
      for (const cardId of card.sourceCardIds) {
        if (!sourceCardMap.has(cardId)) issues.push(`Card ${index + 1}: source card not found.`);
      }
    }
  }

  return { ok: issues.length === 0, issues, normalized: issues.length === 0 ? normalized : undefined };
}

export const validateGeneratedSetForTool = internalQuery({
  args: {
    userId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    sourceSetIds: v.array(v.id("flashcardSets")),
    sourceScope: sourceScopeValidator,
    weakContextMethodology: v.optional(weakContextMethodologyValidator),
    fieldDefinitions: v.array(fieldDefinitionValidator),
    cards: v.array(generatedCardValidator),
    addToSrs: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await validateGeneratedPayload(ctx, args.userId, args);
  },
});

export const createGeneratedSetForTool = internalMutation({
  args: {
    userId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    sourceSetIds: v.array(v.id("flashcardSets")),
    sourceScope: sourceScopeValidator,
    weakContextMethodology: v.optional(weakContextMethodologyValidator),
    fieldDefinitions: v.array(fieldDefinitionValidator),
    cards: v.array(generatedCardValidator),
    addToSrs: v.boolean(),
  },
  handler: async (ctx, args) => {
    const validation = await validateGeneratedPayload(ctx, args.userId, args);
    if (!validation.ok || !validation.normalized) return fail(invalidInput(validation.issues.join(" ") || "Invalid generated set."));
    const normalized = validation.normalized;
    const sourceSetIds = [...normalized.sourceSetIds];
    const fieldDefinitions = [...normalized.fieldDefinitions];
    const now = Date.now();
    const setId = await ctx.db.insert("flashcardSets", {
      name: normalized.name,
      description: normalized.description,
      ownerId: args.userId,
      fieldDefinitions,
      origin: {
        kind: "ai_generated" as const,
        generatedAt: now,
        sourceSetIds,
        sourceScope: normalized.sourceScope,
        ...(normalized.weakContextMethodology !== undefined ? { weakContextMethodology: normalized.weakContextMethodology } : {}),
      },
      visibility: "private",
      cardCount: normalized.cards.length,
      updatedAt: now,
      createdAt: now,
    });

    const inserted = await insertCards(ctx, {
      setId,
      fieldNames: fieldDefinitions.map((field) => field.name),
      cards: normalized.cards.map((card, index) => ({
        fields: card.fields,
        order: index,
      })),
      origin: "ai_generated",
    });
    if (!inserted.ok) return inserted;

    const { defaultFrontFields, defaultBackFields } = getDefaultFieldLayout(fieldDefinitions);
    await ctx.db.insert("userSets", {
      userId: args.userId,
      setId,
      role: "owner",
      srsEnabled: normalized.addToSrs,
      defaultFrontFields,
      defaultBackFields,
      defaultTtsOnlyFields: [],
      createdAt: now,
    });

    if (normalized.addToSrs) {
      await enrollCardsForSetHelper(ctx, args.userId, setId);
    }

    return ok({ setId, cardCount: normalized.cards.length, srsEnabled: normalized.addToSrs });
  },
});

export const appendGeneratedCardsForTool = internalMutation({
  args: {
    userId: v.string(),
    targetSetId: v.id("flashcardSets"),
    fieldDefinitions: v.array(fieldDefinitionValidator),
    cards: v.array(generatedCardValidator),
  },
  handler: async (ctx, args) => {
    const targetSet = await ctx.db.get(args.targetSetId);
    if (!targetSet) return fail(notFound("Target set not found."));

    const ownerLink = await ctx.db
      .query("userSets")
      .withIndex("by_userId_and_setId", (q) =>
        q.eq("userId", args.userId).eq("setId", args.targetSetId),
      )
      .first();
    if (!ownerLink || ownerLink.role !== "owner") {
      return fail(invalidInput("You must own the target set."));
    }

    const targetFingerprint = schemaFingerprint(getFieldDefinitions(targetSet));
    const payloadFingerprint = schemaFingerprint(
      args.fieldDefinitions,
    );
    if (targetFingerprint !== payloadFingerprint) {
      return fail(invalidInput("Field definitions don't match the target set."));
    }

    if (args.cards.length === 0) {
      return fail(invalidInput("At least one card is required."));
    }
    if (args.cards.length > 100) {
      return fail(invalidInput("Appending is limited to 100 cards at a time."));
    }

    const existingCards = await ctx.db
      .query("flashcards")
      .withIndex("by_setId", (q) => q.eq("setId", args.targetSetId))
      .take(10000);
    const maxOrder = existingCards.reduce((max, c) => Math.max(max, c.order), -1);

    const inserted = await insertCards(ctx, {
      setId: args.targetSetId,
      fieldNames: args.fieldDefinitions.map((field) => field.name),
      cards: args.cards.map((card, index) => ({
        fields: card.fields,
        order: maxOrder + 1 + index,
      })),
      origin: "ai_generated",
    });
    if (!inserted.ok) return inserted;

    const patchData: Record<string, unknown> = {
      cardCount: targetSet.cardCount + inserted.value.length,
      updatedAt: Date.now(),
    };
    if (targetSet.origin.kind !== "ai_generated") {
      patchData.origin = { kind: "mixed" };
    }
    await ctx.db.patch(args.targetSetId, patchData);

    if (ownerLink.srsEnabled) {
      await enrollCardsForSetHelper(ctx, args.userId, args.targetSetId);
    }

    return ok({
      setId: args.targetSetId,
      cardCount: args.cards.length,
      srsEnabled: ownerLink.srsEnabled,
    });
  },
});

export const listSetsPublic = query({
  args: {
    include: v.optional(setsListIncludeValidator),
  },
  handler: async (
    ctx,
    args
  ): Promise<DomainResult<SetsListResponse, CommonFailure>> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return fail(unauthenticated());
    const userId = identity.tokenIdentifier;
    const links = await getUserSetLinks(ctx, userId);
    const sets = await Promise.all(
      links.map(async (link) => {
        const set = await ctx.db.get(link.setId);
        if (!set) return null;
        const fieldDefinitions = getFieldDefinitions(set);
        return {
          setId: set._id,
          name: set.name,
          ...(set.description !== undefined ? { description: set.description } : {}),
          srsEnabled: link.srsEnabled,
          cardCount: set.cardCount,
          origin: originSummary(set.origin),
          ...(args.include?.fieldDefinitions ? { fieldDefinitions } : {}),
          ...(args.include?.schemaFingerprint ? { schemaFingerprint: schemaFingerprint(fieldDefinitions) } : {}),
          ...(args.include?.srsSummary ? { srsSummary: await srsSummary(ctx, userId, set._id) } : {}),
        };
      }),
    );
    return ok({ sets: sets.filter((s) => s !== null) });
  },
});

export const getWeakCardsPublic = query({
  args: {
    scope: v.optional(weakCardsScopeValidator),
    methodology: v.optional(weakContextMethodologyValidator),
    include: v.optional(v.object({
      recentRatings: v.optional(v.boolean()),
    })),
  },
  handler: async (
    ctx,
    args
  ): Promise<DomainResult<WeakCardsResponse, CommonFailure>> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return fail(unauthenticated());
    return ok(await getWeakCardsHelper(ctx, {
      userId: identity.tokenIdentifier,
      scope: args.scope,
      methodology: args.methodology,
      include: args.include,
    }));
  },
});
