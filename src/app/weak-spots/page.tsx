import { redirect } from "next/navigation";
import { preloadQuery } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";
import { getAuthToken } from "@/lib/server";
import WeakSpotsClient from "./WeakSpotsClient";

export default async function WeakSpotsPage() {
  const token = await getAuthToken();
  if (!token) redirect("/");

  const [preloadedSets, preloadedHasLlmKey] = await Promise.all([
    preloadQuery(api.flashcardSets.list, {}, { token }),
    preloadQuery(api.userSettings.hasLlmKey, {}, { token }),
  ]);

  return (
    <WeakSpotsClient
      preloadedSets={preloadedSets}
      preloadedHasLlmKey={preloadedHasLlmKey}
    />
  );
}
