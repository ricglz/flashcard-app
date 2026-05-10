import { usePreloadedQuery, Preloaded } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { TypedFlashcardSet, Viewer } from "@/lib/types";
import type { Doc } from "../../../convex/_generated/dataModel";

type SetWithViewer = { set: TypedFlashcardSet; viewer: Viewer };

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

export function useTypedFlashcardSet(
  preloaded: Preloaded<typeof api.flashcardSets.get>
): SetWithViewer {
  const raw = usePreloadedQuery(preloaded);
  const { viewer: rawViewer, ...setData } = raw as Record<string, unknown> & { viewer: unknown };
  return {
    set: setData as TypedFlashcardSet,
    viewer: parseViewer(rawViewer),
  };
}
