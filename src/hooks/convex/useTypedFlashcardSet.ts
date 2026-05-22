import type { Preloaded } from "convex/react";
import { useConvexAuth, usePreloadedQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../convex/_generated/api";
import type { TypedFlashcardSet, Viewer } from "@/lib/types";
import type { Doc } from "../../../convex/_generated/dataModel";
import type { CommonFailure, DomainResult } from "../../../convex/domain/result";

export type TypedSetWithViewer = { set: TypedFlashcardSet; viewer: Viewer };
type RawSetWithViewer = Record<string, unknown> & { viewer: unknown };
type FlashcardSetResult = FunctionReturnType<typeof api.flashcardSets.get>;
export type FlashcardSetWithViewer = Extract<
  FlashcardSetResult,
  { readonly ok: true }
>["value"];

const VALID_ROLES = new Set<string>(["owner", "member", "visitor"]);

function parseViewer(raw: unknown): Viewer {
  if (!raw || typeof raw !== "object") {
    throw new Error("Missing viewer data in flashcardSets.get response");
  }
  const obj = raw as Record<string, unknown>;
  const role = obj.role;
  if (typeof role !== "string" || !VALID_ROLES.has(role)) {
    throw new Error(`Invalid viewer role: ${String(role)}`);
  }
  if (role === "visitor") {
    return { role: "visitor", userSet: null };
  }
  if (!obj.userSet || typeof obj.userSet !== "object") {
    throw new Error(`Viewer role "${role}" requires userSet data`);
  }
  return {
    role: role as "owner" | "member",
    userSet: obj.userSet as Doc<"userSets">,
  };
}

function toTypedResult(
  result: FlashcardSetResult,
): DomainResult<TypedSetWithViewer, CommonFailure> {
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  const { viewer: rawViewer, ...setData } = result.value as RawSetWithViewer;
  return {
    ok: true,
    value: {
      set: setData as TypedFlashcardSet,
      viewer: parseViewer(rawViewer),
    },
  };
}

export function useTypedFlashcardSet(
  preloaded: Preloaded<typeof api.flashcardSets.get>,
  initialSet: FlashcardSetWithViewer,
): DomainResult<TypedSetWithViewer, CommonFailure> {
  const auth = useConvexAuth();
  const liveResult = usePreloadedQuery(preloaded) as FlashcardSetResult | undefined;
  const initialResult: FlashcardSetResult = { ok: true, value: initialSet };
  if (
    liveResult === undefined ||
    (!liveResult.ok &&
      liveResult.error._tag === "Unauthenticated" &&
      auth.isLoading)
  ) {
    return toTypedResult(initialResult);
  }

  return toTypedResult(liveResult);
}
