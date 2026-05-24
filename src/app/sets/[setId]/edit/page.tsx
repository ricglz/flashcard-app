import { api } from "../../../../../convex/_generated/api";
import {
  preloadRouteQuery,
  requireAuthToken,
  requirePreloadedDomainResult,
  requireRouteId,
} from "@/lib/routePreload";
import EditSetClient from "./EditSetClient";

export default async function EditSetPage({
  params,
}: {
  params: Promise<{ setId: string }>;
}) {
  const { setId } = await params;
  const flashcardSetId = requireRouteId<"flashcardSets">(setId);
  const token = await requireAuthToken();

  const preloadedSet = await preloadRouteQuery(
    api.flashcardSets.get,
    { id: flashcardSetId },
    { token }
  );

  const setData = requirePreloadedDomainResult(preloadedSet);

  const preloadedCards = await preloadRouteQuery(
    api.flashcards.list,
    { setId: flashcardSetId },
    { token }
  );

  requirePreloadedDomainResult(preloadedCards);

  return (
    <EditSetClient
      setId={setId}
      preloadedSet={preloadedSet}
      initialSet={setData}
      preloadedCards={preloadedCards}
    />
  );
}
