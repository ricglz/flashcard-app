import { redirect } from "next/navigation";
import { preloadQuery } from "convex/nextjs";
import { api } from "../../../../../convex/_generated/api";
import {
  requireAuthToken,
  requirePreloadedDomainResult,
  requirePreloadedValue,
  requireRouteId,
} from "@/lib/routePreload";
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
  const flashcardSetId = requireRouteId<"flashcardSets">(setId);
  const token = await requireAuthToken("/");

  if (!sessionId) {
    redirect(`/study/${setId}`);
  }

  const typedSessionId = requireRouteId<"studySessions">(sessionId);

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

  const results = requirePreloadedValue(preloadedResults);
  const setData = requirePreloadedDomainResult(preloadedSet);

  if (results.session.setId !== flashcardSetId) {
    redirect(`/study/${results.session.setId}/results?sessionId=${sessionId}`);
  }

  const preloadedCards = await preloadQuery(
    api.flashcards.list,
    { setId: flashcardSetId },
    { token }
  );
  requirePreloadedDomainResult(preloadedCards);

  return (
    <ResultsClient
      setId={setId}
      preloadedResults={preloadedResults}
      preloadedCards={preloadedCards}
      preloadedSet={preloadedSet}
      initialSet={setData}
    />
  );
}
