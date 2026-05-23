import { preloadQuery } from "convex/nextjs";
import { api } from "../../../../../convex/_generated/api";
import {
  requireAuthToken,
  requirePreloadedDomainResult,
  requireRouteId,
} from "@/lib/routePreload";
import BrowseClient from "./BrowseClient";

export default async function BrowsePage({
  params,
  searchParams,
}: {
  params: Promise<{ setId: string }>;
  searchParams: Promise<{
    frontFields?: string;
    backFields?: string;
    ttsOnlyFields?: string;
    shuffle?: string;
    cardLimit?: string;
  }>;
}) {
  const { setId } = await params;
  const sp = await searchParams;
  const flashcardSetId = requireRouteId<"flashcardSets">(setId);
  const token = await requireAuthToken();

  const [preloadedSet, preloadedCards, preloadedTtsConfig, preloadedAnnotations] =
    await Promise.all([
      preloadQuery(api.flashcardSets.get, { id: flashcardSetId }, { token }),
      preloadQuery(api.flashcards.list, { setId: flashcardSetId }, { token }),
      preloadQuery(api.userSettings.getTtsConfig, {}, { token }),
      preloadQuery(api.cardAnnotations.getForSet, { setId: flashcardSetId }, { token }),
    ]);

  const setData = requirePreloadedDomainResult(preloadedSet);
  requirePreloadedDomainResult(preloadedCards);

  const frontFields = sp.frontFields?.split(",") ?? [];
  const backFields = sp.backFields?.split(",") ?? [];
  const ttsOnlyFields = sp.ttsOnlyFields?.split(",").filter(Boolean) ?? [];
  const shuffle = sp.shuffle === "true";
  const cardLimitRaw = sp.cardLimit ? Number(sp.cardLimit) : null;
  const cardLimit =
    cardLimitRaw !== null && !isNaN(cardLimitRaw) && cardLimitRaw > 0
      ? cardLimitRaw
      : null;

  return (
    <BrowseClient
      setId={setId}
      frontFields={frontFields}
      backFields={backFields}
      ttsOnlyFields={ttsOnlyFields}
      shuffle={shuffle}
      cardLimit={cardLimit}
      preloadedSet={preloadedSet}
      initialSet={setData}
      preloadedCards={preloadedCards}
      preloadedTtsConfig={preloadedTtsConfig}
      preloadedAnnotations={preloadedAnnotations}
    />
  );
}
