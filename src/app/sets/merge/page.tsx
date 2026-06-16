import { preloadQuery } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";
import { requireAuthToken } from "@/lib/routePreload";
import MergeClient from "./MergeClient";

export default async function MergePage() {
  const token = await requireAuthToken();

  const preloadedSets = await preloadQuery(
    api.flashcardSets.list,
    { includeArchived: false },
    { token },
  );

  return <MergeClient preloadedSets={preloadedSets} />;
}
