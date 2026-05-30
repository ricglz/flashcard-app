import { redirect } from "next/navigation";
import { api } from "../../../../../convex/_generated/api";
import {
  preloadRouteQuery,
  requireAuthToken,
  requirePreloadedDomainResult,
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
    preloadRouteQuery(
      api.studySessions.getResults,
      { sessionId: typedSessionId },
      { token },
      `/study/${setId}`,
    ),
    preloadRouteQuery(
      api.flashcardSets.get,
      { id: flashcardSetId },
      { token }
    ),
  ]);

  const resultsValue = requirePreloadedDomainResult(preloadedResults, `/study/${setId}`);
  const setData = requirePreloadedDomainResult(preloadedSet);

  if (resultsValue.session.setId !== flashcardSetId) {
    redirect(`/study/${resultsValue.session.setId}/results?sessionId=${sessionId}`);
  }

  return (
    <ResultsClient
      setId={setId}
      preloadedResults={preloadedResults}
      preloadedSet={preloadedSet}
      initialSet={setData}
    />
  );
}
