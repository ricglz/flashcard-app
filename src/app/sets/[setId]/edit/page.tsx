import { redirect } from "next/navigation";
import { fetchQuery, preloadQuery } from "convex/nextjs";
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

  const set = await fetchQuery(
    api.flashcardSets.get,
    { id: flashcardSetId },
    { token }
  );

  if (!set) {
    redirect("/");
  }

  const [preloadedSet, preloadedCards] = await Promise.all([
    preloadQuery(api.flashcardSets.get, { id: flashcardSetId }, { token }),
    preloadQuery(api.flashcards.list, { setId: flashcardSetId }, { token }),
  ]);

  return (
    <EditSetClient
      setId={setId}
      preloadedSet={preloadedSet}
      preloadedCards={preloadedCards}
    />
  );
}
