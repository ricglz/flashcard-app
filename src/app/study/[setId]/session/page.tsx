import { redirect } from "next/navigation";
import { preloadQuery } from "convex/nextjs";
import { api } from "../../../../../convex/_generated/api";
import {
  requireAuthToken,
  requirePreloadedDomainResult,
  requirePreloadedValue,
  requireRouteId,
} from "@/lib/routePreload";
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
  const flashcardSetId = requireRouteId<"flashcardSets">(setId);

  if (!sessionId) {
    redirect(`/study/${setId}`);
  }

  const typedSessionId = requireRouteId<"studySessions">(sessionId);
  const token = await requireAuthToken();

  const [preloadedSession, preloadedSet, preloadedCards, preloadedTtsConfig, preloadedAnnotations] = await Promise.all([
    preloadQuery(api.studySessions.get, { id: typedSessionId }, { token }),
    preloadQuery(api.flashcardSets.get, { id: flashcardSetId }, { token }),
    preloadQuery(api.flashcards.list, { setId: flashcardSetId }, { token }),
    preloadQuery(api.userSettings.getTtsConfig, {}, { token }),
    preloadQuery(api.cardAnnotations.getForSet, { setId: flashcardSetId }, { token }),
  ]);

  const session = requirePreloadedValue(preloadedSession, `/study/${setId}`);

  if (session.setId !== flashcardSetId) {
    redirect(`/study/${session.setId}/session?sessionId=${sessionId}`);
  }

  if (session.status === "completed") {
    redirect(`/study/${setId}/results?sessionId=${sessionId}`);
  }

  if (session.status === "abandoned") {
    redirect(`/study/${setId}`);
  }

  const setData = requirePreloadedDomainResult(preloadedSet);
  requirePreloadedDomainResult(preloadedCards);

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
