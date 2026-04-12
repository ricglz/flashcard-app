import { redirect } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import { auth } from "@clerk/nextjs/server";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import StudySessionClient from "./StudySessionClient";

async function getAuthToken() {
  return (await (await auth()).getToken()) ?? undefined;
}

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

  const token = await getAuthToken();
  const session = await fetchQuery(
    api.studySessions.get,
    { id: sessionId as Id<"studySessions"> },
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

  return (
    <StudySessionClient
      setId={setId}
      sessionId={sessionId as Id<"studySessions">}
    />
  );
}
