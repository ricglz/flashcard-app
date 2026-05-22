import { redirect } from "next/navigation";
import { preloadQuery, preloadedQueryResult } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";
import { getAuthToken } from "@/lib/server";
import { parseId } from "@/lib/convexHelpers";
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
  const flashcardSetId = parseId<"flashcardSets">(setId);
  if (!flashcardSetId) redirect("/");
  const token = await getAuthToken();
  if (!token) redirect("/");

  const [preloadedSet, preloadedCards, preloadedActiveSession] =
    await Promise.all([
      preloadQuery(api.flashcardSets.get, { id: flashcardSetId }, { token }),
      preloadQuery(api.flashcards.list, { setId: flashcardSetId }, { token }),
      preloadQuery(
        api.studySessions.getActiveSession,
        { setId: flashcardSetId },
        { token },
      ),
    ]);

  const result = preloadedQueryResult(preloadedSet);
  if (!result) redirect("/");
  const cardsResult = preloadedQueryResult(preloadedCards);
  if (!cardsResult.ok) redirect("/");
  if (result.viewer.role === "visitor") redirect(`/sets/${setId}`);

  const initialMode = modeParam === "browse" ? "browse" : "study";

  return (
    <StudyConfigClient
      setId={setId}
      initialMode={initialMode}
      preloadedSet={preloadedSet}
      preloadedCards={preloadedCards}
      preloadedActiveSession={preloadedActiveSession}
      userSet={result.viewer.userSet}
    />
  );
}
