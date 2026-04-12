import { redirect } from "next/navigation";
import { fetchQuery, preloadQuery } from "convex/nextjs";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { getAuthToken } from "@/lib/server";
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

  if (!sessionId) {
    redirect(`/study/${setId}`);
  }

  const typedSessionId = sessionId as Id<"studySessions">;
  const flashcardSetId = setId as Id<"flashcardSets">;
  const token = await getAuthToken();

  // Fetch to validate status, then preload for the client
  const session = await fetchQuery(
    api.studySessions.get,
    { id: typedSessionId },
    { token }
  );

  if (!session) {
    redirect(`/study/${setId}`);
  }

  if (session.status === "completed") {
    redirect(`/study/${setId}/results?sessionId=${sessionId}`);
  }

  if (session.status === "abandoned") {
    redirect(`/study/${setId}`);
  }

  const [preloadedSession, preloadedSet, preloadedCards] = await Promise.all([
    preloadQuery(api.studySessions.get, { id: typedSessionId }, { token }),
    preloadQuery(api.flashcardSets.get, { id: flashcardSetId }, { token }),
    preloadQuery(api.flashcards.list, { setId: flashcardSetId }, { token }),
  ]);

  return (
    <StudySessionClient
      setId={setId}
      sessionId={typedSessionId}
      preloadedSession={preloadedSession}
      preloadedSet={preloadedSet}
      preloadedCards={preloadedCards}
    />
  );
}
