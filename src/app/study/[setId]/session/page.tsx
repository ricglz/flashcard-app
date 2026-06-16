import { redirect } from "next/navigation";
import { preloadQuery } from "convex/nextjs";
import { api } from "../../../../../convex/_generated/api";
import {
  assertPreloadedDomainResult,
  fetchRouteQuery,
  preloadRouteQuery,
  requireAuthToken,
  requirePreloadedDomainResult,
  requireRouteId,
} from "@/lib/routePreload";
import { isActiveStudySession } from "@/lib/types";
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

  const sessionForRouting = await fetchRouteQuery(
    api.studySessions.get,
    { id: typedSessionId },
    { token },
    `/study/${setId}`,
  );
  if (!sessionForRouting.ok) {
    redirect(`/study/${setId}`);
  }
  const session = sessionForRouting.value;

  if (session.setId !== flashcardSetId) {
    redirect(`/study/${session.setId}/session?sessionId=${sessionId}`);
  }

  if (session.status === "completed") {
    redirect(`/study/${setId}/results?sessionId=${sessionId}`);
  }

  if (session.status === "abandoned") {
    redirect(`/study/${setId}`);
  }
  if (!isActiveStudySession(session)) {
    redirect(`/study/${setId}`);
  }

  const [
    preloadedSet,
    preloadedCards,
    preloadedTtsConfig,
    preloadedAnnotations,
  ] = await Promise.all([
    preloadRouteQuery(api.flashcardSets.get, { id: flashcardSetId }, { token }),
    preloadRouteQuery(api.flashcards.list, { setId: flashcardSetId }, { token }),
    preloadQuery(api.userSettings.getTtsConfig, {}, { token }),
    preloadRouteQuery(api.cardAnnotations.getForSet, { setId: flashcardSetId }, { token }),
  ]);

  const setData = requirePreloadedDomainResult(preloadedSet);
  assertPreloadedDomainResult(preloadedCards);

  return (
    <StudySessionClient
      initialSession={session}
      preloadedSet={preloadedSet}
      initialSet={setData}
      preloadedCards={preloadedCards}
      preloadedTtsConfig={preloadedTtsConfig}
      preloadedAnnotations={preloadedAnnotations}
    />
  );
}
