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

  const preloadedSet = await preloadQuery(
    api.flashcardSets.get,
    { id: flashcardSetId },
    { token }
  );

  if (!preloadedQueryResult(preloadedSet)) {
    redirect("/");
  }

  const preloadedCards = await preloadQuery(
    api.flashcards.list,
    { setId: flashcardSetId },
    { token }
  );

  return (
    <SetDetailClient
      setId={setId}
      preloadedSet={preloadedSet}
      preloadedCards={preloadedCards}
    />
  );
}
