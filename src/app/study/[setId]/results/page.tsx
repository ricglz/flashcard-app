import { redirect } from "next/navigation";
import { fetchQuery, preloadQuery } from "convex/nextjs";
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

  const [resultsData, set] = await Promise.all([
    fetchQuery(
      api.studySessions.getResults,
      { sessionId: typedSessionId },
      { token }
    ),
    fetchQuery(
      api.flashcardSets.get,
      { id: flashcardSetId },
      { token }
    ),
  ]);

  if (!resultsData || !set) {
    redirect("/");
  }

  const [preloadedResults, preloadedCards, preloadedSet] = await Promise.all([
    preloadQuery(
      api.studySessions.getResults,
      { sessionId: typedSessionId },
      { token }
    ),
    preloadQuery(
      api.flashcards.list,
      { setId: flashcardSetId },
      { token }
    ),
    preloadQuery(
      api.flashcardSets.get,
      { id: flashcardSetId },
      { token }
    ),
  ]);

  return (
    <ResultsClient
      setId={setId}
      preloadedResults={preloadedResults}
      preloadedCards={preloadedCards}
      preloadedSet={preloadedSet}
    />
  );
}
