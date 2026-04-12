import { redirect } from "next/navigation";
import { preloadQuery, preloadedQueryResult } from "convex/nextjs";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { getAuthToken } from "@/lib/server";
import ResultsClient from "./ResultsClient";

export default async function ResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ setId: string }>;
  searchParams: Promise<{ sessionId?: string }>;
}) {
  const { setId } = await params;
  const { sessionId } = await searchParams;
  const flashcardSetId = setId as Id<"flashcardSets">;
  const token = await getAuthToken();

  if (!sessionId) {
    redirect(`/study/${setId}`);
  }

  const typedSessionId = sessionId as Id<"studySessions">;

  const [preloadedResults, preloadedSet] = await Promise.all([
    preloadQuery(
      api.studySessions.getResults,
      { sessionId: typedSessionId },
      { token }
    ),
    preloadQuery(
      api.flashcardSets.get,
      { id: flashcardSetId },
      { token }
    ),
  ]);

  if (!preloadedQueryResult(preloadedResults) || !preloadedQueryResult(preloadedSet)) {
    redirect("/");
  }

  const preloadedCards = await preloadQuery(
    api.flashcards.list,
    { setId: flashcardSetId },
    { token }
  );

  return (
    <ResultsClient
      setId={setId}
      preloadedResults={preloadedResults}
      preloadedCards={preloadedCards}
      preloadedSet={preloadedSet}
    />
  );
}
