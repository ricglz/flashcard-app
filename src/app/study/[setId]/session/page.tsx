import { redirect } from "next/navigation";
import { Id } from "../../../../../convex/_generated/dataModel";
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

  return (
    <StudySessionClient
      setId={setId}
      sessionId={sessionId as Id<"studySessions">}
    />
  );
}
