import { preloadQuery } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";
import { requireAuthToken } from "@/lib/routePreload";
import { fetchAvailableModelsForServer } from "@/lib/serverAiModels";
import GenerateClient from "./GenerateClient";

export default async function GeneratePage() {
  const token = await requireAuthToken();

  const [preloadedSets, availableModels] = await Promise.all([
    preloadQuery(api.flashcardSets.list, {}, { token }),
    fetchAvailableModelsForServer(token),
  ]);

  return <GenerateClient preloadedSets={preloadedSets} availableModels={availableModels} />;
}
