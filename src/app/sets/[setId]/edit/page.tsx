import { redirect } from "next/navigation";
import { preloadQuery, preloadedQueryResult } from "convex/nextjs";
import { api } from "../../../../../convex/_generated/api";
import { getAuthToken } from "@/lib/server";
import { parseId } from "@/lib/convexHelpers";
import EditSetClient from "./EditSetClient";

export default async function EditSetPage({
  params,
}: {
  params: Promise<{ setId: string }>;
}) {
  const { setId } = await params;
  const flashcardSetId = parseId<"flashcardSets">(setId);
  if (!flashcardSetId) redirect("/");
  const token = await getAuthToken();
  if (!token) redirect("/");

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

  const cardsResult = preloadedQueryResult(preloadedCards);
  if (!cardsResult.ok) {
    redirect("/");
  }

  return (
    <EditSetClient
      setId={setId}
      preloadedSet={preloadedSet}
      preloadedCards={preloadedCards}
    />
  );
}
