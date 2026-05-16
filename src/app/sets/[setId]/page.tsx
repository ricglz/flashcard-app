import { redirect } from "next/navigation";
import { preloadQuery, preloadedQueryResult } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";
import { getAuthToken } from "@/lib/server";
import { asId } from "@/lib/convexHelpers";
import SetDetailClient from "./SetDetailClient";

export default async function SetDetailPage({
  params,
}: {
  params: Promise<{ setId: string }>;
}) {
  const { setId } = await params;
  const flashcardSetId = asId<"flashcardSets">(setId);
  const token = await getAuthToken();
  if (!token) redirect("/");

  const [preloadedSet, preloadedCards, preloadedSettings, preloadedForkSyncStatus] = await Promise.all([
    preloadQuery(api.flashcardSets.get, { id: flashcardSetId }, { token }),
    preloadQuery(api.flashcards.list, { setId: flashcardSetId }, { token }),
    preloadQuery(api.userSettings.get, {}, { token }),
    preloadQuery(api.flashcardSets.getForkSyncStatus, { setId: flashcardSetId }, { token }),
  ]);

  const setData = preloadedQueryResult(preloadedSet);
  if (!setData) {
    redirect("/");
  }

  return (
    <SetDetailClient
      setId={setId}
      preloadedSet={preloadedSet}
      preloadedCards={preloadedCards}
      preloadedSettings={preloadedSettings}
      preloadedForkSyncStatus={preloadedForkSyncStatus}
    />
  );
}
