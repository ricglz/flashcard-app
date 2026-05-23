import { preloadQuery } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";
import {
  requireAuthToken,
  requirePreloadedDomainResult,
  requireRouteId,
} from "@/lib/routePreload";
import SetDetailClient from "./SetDetailClient";

export default async function SetDetailPage({
  params,
}: {
  params: Promise<{ setId: string }>;
}) {
  const { setId } = await params;
  const flashcardSetId = requireRouteId<"flashcardSets">(setId);
  const token = await requireAuthToken();

  const [preloadedSet, preloadedCards, preloadedTtsConfig, preloadedHasLlmKey, preloadedForkSyncStatus] = await Promise.all([
    preloadQuery(api.flashcardSets.get, { id: flashcardSetId }, { token }),
    preloadQuery(api.flashcards.list, { setId: flashcardSetId }, { token }),
    preloadQuery(api.userSettings.getTtsConfig, {}, { token }),
    preloadQuery(api.userSettings.hasLlmKey, {}, { token }),
    preloadQuery(api.flashcardSets.getForkSyncStatus, { setId: flashcardSetId }, { token }),
  ]);

  const setData = requirePreloadedDomainResult(preloadedSet);
  requirePreloadedDomainResult(preloadedCards);

  return (
    <SetDetailClient
      setId={setId}
      preloadedSet={preloadedSet}
      initialSet={setData}
      preloadedCards={preloadedCards}
      preloadedTtsConfig={preloadedTtsConfig}
      preloadedHasLlmKey={preloadedHasLlmKey}
      preloadedForkSyncStatus={preloadedForkSyncStatus}
    />
  );
}
