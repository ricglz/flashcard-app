import { redirect } from "next/navigation";
import { preloadQuery, preloadedQueryResult } from "convex/nextjs";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { getAuthToken } from "@/lib/server";
import EditSetClient from "./EditSetClient";

export default async function EditSetPage({
  params,
}: {
  params: Promise<{ setId: string }>;
}) {
  const { setId } = await params;
  const flashcardSetId = setId as Id<"flashcardSets">;
  const token = await getAuthToken();

  const preloadedSet = await preloadQuery(
    api.flashcardSets.get,
    { id: flashcardSetId },
    { token }
  );

  if (!preloadedQueryResult(preloadedSet)) {
    redirect("/");
  }

  const preloadedCards = await preloadQuery(
    api.flashcards.list,
    { setId: flashcardSetId },
    { token }
  );

  return (
    <EditSetClient
      setId={setId}
      preloadedSet={preloadedSet}
      preloadedCards={preloadedCards}
    />
  );
}
