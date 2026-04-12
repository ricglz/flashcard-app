import { redirect } from "next/navigation";
import { preloadQuery, preloadedQueryResult } from "convex/nextjs";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { getAuthToken } from "@/lib/server";
import BrowseClient from "./BrowseClient";

export default async function BrowsePage({
  params,
  searchParams,
}: {
  params: Promise<{ setId: string }>;
  searchParams: Promise<{
    frontFields?: string;
    backFields?: string;
    shuffle?: string;
    cardLimit?: string;
  }>;
}) {
  const { setId } = await params;
  const sp = await searchParams;
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

  const frontFields = sp.frontFields?.split(",") ?? [];
  const backFields = sp.backFields?.split(",") ?? [];
  const shuffle = sp.shuffle === "true";
  const cardLimitRaw = sp.cardLimit ? Number(sp.cardLimit) : null;
  const cardLimit =
    cardLimitRaw !== null && !isNaN(cardLimitRaw) && cardLimitRaw > 0
      ? cardLimitRaw
      : null;

  return (
    <BrowseClient
      setId={setId}
      frontFields={frontFields}
      backFields={backFields}
      shuffle={shuffle}
      cardLimit={cardLimit}
      preloadedSet={preloadedSet}
      preloadedCards={preloadedCards}
    />
  );
}
