import { preloadQuery } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";
import { requireAuthToken } from "@/lib/routePreload";
import WeakSpotsClient from "./WeakSpotsClient";

export default async function WeakSpotsPage() {
  const token = await requireAuthToken();

  const [preloadedSets, preloadedHasLlmKey] = await Promise.all([
    preloadQuery(api.flashcardSets.list, {}, { token }),
    preloadQuery(api.userSettings.hasLlmKey, {}, { token }),
  ]);

  return (
    <WeakSpotsClient
      preloadedSets={preloadedSets}
      preloadedHasLlmKey={preloadedHasLlmKey}
    />
  );
}
