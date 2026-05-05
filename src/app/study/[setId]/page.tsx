import { redirect } from "next/navigation";
import { preloadQuery, preloadedQueryResult } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";
import { getAuthToken } from "@/lib/server";
import { asId } from "@/lib/convexHelpers";
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
  const flashcardSetId = asId<"flashcardSets">(setId);
  const token = await getAuthToken();

  const preloadedSet = await preloadQuery(
    api.flashcardSets.get,
    { id: flashcardSetId },
    { token }
  );

  if (!preloadedQueryResult(preloadedSet)) {
    redirect("/");
  }

  const [preloadedCards, preloadedActiveSession, preloadedUserSet] =
    await Promise.all([
      preloadQuery(
        api.flashcards.list,
        { setId: flashcardSetId },
        { token }
      ),
      preloadQuery(
        api.studySessions.getActiveSession,
        { setId: flashcardSetId },
        { token }
      ),
      preloadQuery(
        api.userSets.get,
        { setId: flashcardSetId },
        { token }
      ),
    ]);

  const initialMode = modeParam === "browse" ? "browse" : "study";

  return (
    <StudyConfigClient
      setId={setId}
      initialMode={initialMode}
      preloadedSet={preloadedSet}
      preloadedCards={preloadedCards}
      preloadedActiveSession={preloadedActiveSession}
      preloadedUserSet={preloadedUserSet}
    />
  );
}
