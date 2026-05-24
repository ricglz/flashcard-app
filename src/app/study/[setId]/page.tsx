import { redirect } from "next/navigation";
import { api } from "../../../../convex/_generated/api";
import {
  preloadRouteQuery,
  requireAuthToken,
  requirePreloadedDomainResult,
  requireRouteId,
} from "@/lib/routePreload";
import StudyConfigClient from "./StudyConfigClient";

export default async function StudyConfigPage({
  params,
  searchParams,
}: {
  params: Promise<{ setId: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { setId } = await params;
  const { mode: modeParam } = await searchParams;
  const flashcardSetId = requireRouteId<"flashcardSets">(setId);
  const token = await requireAuthToken();

  const [preloadedSet, preloadedCards, preloadedActiveSession] =
    await Promise.all([
      preloadRouteQuery(api.flashcardSets.get, { id: flashcardSetId }, { token }),
      preloadRouteQuery(api.flashcards.list, { setId: flashcardSetId }, { token }),
      preloadRouteQuery(
        api.studySessions.getActiveSession,
        { setId: flashcardSetId },
        { token },
      ),
    ]);

  const setData = requirePreloadedDomainResult(preloadedSet);
  requirePreloadedDomainResult(preloadedCards);
  if (setData.viewer.role === "visitor") redirect(`/sets/${setId}`);

  const initialMode = modeParam === "browse" ? "browse" : "study";

  return (
    <StudyConfigClient
      flashcardSetId={flashcardSetId}
      initialMode={initialMode}
      preloadedSet={preloadedSet}
      preloadedCards={preloadedCards}
      preloadedActiveSession={preloadedActiveSession}
      initialSet={setData}
      userSet={setData.viewer.userSet}
    />
  );
}
