import { redirect } from "next/navigation";
import { preloadQuery, preloadedQueryResult } from "convex/nextjs";
import { api } from "../../../../../convex/_generated/api";
import { getAuthToken } from "@/lib/server";
import { parseId } from "@/lib/convexHelpers";
import StudySessionClient from "./StudySessionClient";

export default async function StudySessionPage({
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

  if (!sessionId) {
    redirect(`/study/${setId}`);
  }

  const typedSessionId = parseId<"studySessions">(sessionId);
  if (!typedSessionId) redirect("/");
  const token = await getAuthToken();
  if (!token) redirect("/");

  const [preloadedSession, preloadedSet, preloadedCards, preloadedTtsConfig, preloadedAnnotations] = await Promise.all([
    preloadQuery(api.studySessions.get, { id: typedSessionId }, { token }),
    preloadQuery(api.flashcardSets.get, { id: flashcardSetId }, { token }),
    preloadQuery(api.flashcards.list, { setId: flashcardSetId }, { token }),
    preloadQuery(api.userSettings.getTtsConfig, {}, { token }),
    preloadQuery(api.cardAnnotations.getForSet, { setId: flashcardSetId }, { token }),
  ]);

  const session = preloadedQueryResult(preloadedSession);

  if (!session) {
    redirect(`/study/${setId}`);
  }

  if (session.setId !== flashcardSetId) {
    redirect(`/study/${session.setId}/session?sessionId=${sessionId}`);
  }

  if (session.status === "completed") {
    redirect(`/study/${setId}/results?sessionId=${sessionId}`);
  }

  if (session.status === "abandoned") {
    redirect(`/study/${setId}`);
  }

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
    <StudySessionClient
      setId={setId}
      sessionId={typedSessionId}
      preloadedSession={preloadedSession}
      preloadedSet={preloadedSet}
      initialSet={setData}
      preloadedCards={preloadedCards}
      preloadedTtsConfig={preloadedTtsConfig}
      preloadedAnnotations={preloadedAnnotations}
    />
  );
}
