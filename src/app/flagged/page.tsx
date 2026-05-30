import { preloadQuery } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";
import { requireAuthToken } from "@/lib/routePreload";
import { fetchAvailableModelsForServer } from "@/lib/serverAiModels";
import FlaggedCardsClient from "./FlaggedCardsClient";

export default async function FlaggedPage() {
  const token = await requireAuthToken();

  const [preloaded, preloadedTtsConfig, initialAssistantModels] = await Promise.all([
    preloadQuery(api.cardAnnotations.getFlagged, {}, { token }),
    preloadQuery(api.userSettings.getTtsConfig, {}, { token }),
    fetchAvailableModelsForServer(token),
  ]);

  return (
    <FlaggedCardsClient
      preloaded={preloaded}
      preloadedTtsConfig={preloadedTtsConfig}
      initialAssistantModels={initialAssistantModels}
    />
  );
}
