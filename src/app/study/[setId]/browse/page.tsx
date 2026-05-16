import { redirect } from "next/navigation";
import { preloadQuery, preloadedQueryResult } from "convex/nextjs";
import { api } from "../../../../../convex/_generated/api";
import { getAuthToken } from "@/lib/server";
import { asId } from "@/lib/convexHelpers";
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
  const flashcardSetId = asId<"flashcardSets">(setId);
  const token = await getAuthToken();
  if (!token) redirect("/");

  const [preloadedSet, preloadedCards, preloadedSettings, preloadedAnnotations] =
    await Promise.all([
      preloadQuery(api.flashcardSets.get, { id: flashcardSetId }, { token }),
      preloadQuery(api.flashcards.list, { setId: flashcardSetId }, { token }),
      preloadQuery(api.userSettings.get, {}, { token }),
      preloadQuery(api.cardAnnotations.getForSet, { setId: flashcardSetId }, { token }),
    ]);

  if (!preloadedQueryResult(preloadedSet)) {
    redirect("/");
  }

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
      preloadedCards={preloadedCards}
      preloadedSettings={preloadedSettings}
      preloadedAnnotations={preloadedAnnotations}
    />
  );
}
