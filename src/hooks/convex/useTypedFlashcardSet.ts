import type { Preloaded } from "convex/react";
import { useConvexAuth, usePreloadedQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../convex/_generated/api";
import type { TypedFlashcardSet, Viewer } from "@/lib/types";
import type { CommonFailure, DomainResult } from "../../../convex/domain/result";
import type { SetWithViewer } from "../../../convex/flashcardSets";

export type TypedSetWithViewer = { set: TypedFlashcardSet; viewer: Viewer };
type FlashcardSetResult = FunctionReturnType<typeof api.flashcardSets.get>;
export type FlashcardSetWithViewer = Extract<
  FlashcardSetResult,
  { readonly ok: true }
>["value"];

function toTypedResult(
  result: FlashcardSetResult,
): DomainResult<TypedSetWithViewer, CommonFailure> {
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  const setWithViewer: SetWithViewer = result.value;
  const { viewer, ...set } = setWithViewer;
  return {
    ok: true,
    value: {
      set,
      viewer,
    },
  };
}

export function useTypedFlashcardSet(
  preloaded: Preloaded<typeof api.flashcardSets.get>,
  initialSet: FlashcardSetWithViewer,
): DomainResult<TypedSetWithViewer, CommonFailure> {
  const auth = useConvexAuth();
  const liveResult = usePreloadedQuery(preloaded);
  const initialResult: FlashcardSetResult = { ok: true, value: initialSet };
  if (
    !liveResult.ok &&
      liveResult.error._tag === "Unauthenticated" &&
      auth.isLoading
  ) {
    return toTypedResult(initialResult);
  }

  return toTypedResult(liveResult);
}
