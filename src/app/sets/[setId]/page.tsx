import { redirect } from "next/navigation";
import { preloadQuery, preloadedQueryResult } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";
import { getAuthToken } from "@/lib/server";
import { parseId } from "@/lib/convexHelpers";
import SetDetailClient from "./SetDetailClient";

export default async function SetDetailPage({
  params,
}: {
  params: Promise<{ setId: string }>;
}) {
  const { setId } = await params;
  const flashcardSetId = parseId<"flashcardSets">(setId);
  if (!flashcardSetId) redirect("/");
  const token = await getAuthToken();
  if (!token) redirect("/");

  const [preloadedSet, preloadedCards, preloadedTtsConfig, preloadedHasLlmKey, preloadedForkSyncStatus] = await Promise.all([
    preloadQuery(api.flashcardSets.get, { id: flashcardSetId }, { token }),
    preloadQuery(api.flashcards.list, { setId: flashcardSetId }, { token }),
    preloadQuery(api.userSettings.getTtsConfig, {}, { token }),
    preloadQuery(api.userSettings.hasLlmKey, {}, { token }),
    preloadQuery(api.flashcardSets.getForkSyncStatus, { setId: flashcardSetId }, { token }),
  ]);

  const setResult = preloadedQueryResult(preloadedSet);
  if (!setResult.ok) {
    redirect("/");
  }
  const setData = setResult.value;
  const cardsResult = preloadedQueryResult(preloadedCards);
  if (!cardsResult.ok) {
    redirect("/");
  }

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
