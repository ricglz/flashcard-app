import { redirect } from "next/navigation";
import { preloadQuery, preloadedQueryResult } from "convex/nextjs";
import { api } from "../../../../../convex/_generated/api";
import { getAuthToken } from "@/lib/server";
import { parseId } from "@/lib/convexHelpers";
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
  const flashcardSetId = parseId<"flashcardSets">(setId);
  if (!flashcardSetId) redirect("/");
  const token = await getAuthToken();
  if (!token) redirect(`/`);

  if (!sessionId) {
    redirect(`/study/${setId}`);
  }

  const typedSessionId = parseId<"studySessions">(sessionId);
  if (!typedSessionId) redirect("/");

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

  const results = preloadedQueryResult(preloadedResults);
  const setResult = preloadedQueryResult(preloadedSet);
  if (!results || !setResult.ok) {
    redirect("/");
  }
  const setData = setResult.value;

  if (results.session.setId !== flashcardSetId) {
    redirect(`/study/${results.session.setId}/results?sessionId=${sessionId}`);
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
    <ResultsClient
      setId={setId}
      preloadedResults={preloadedResults}
      preloadedCards={preloadedCards}
      preloadedSet={preloadedSet}
      initialSet={setData}
    />
  );
}
