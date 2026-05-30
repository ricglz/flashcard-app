import { redirect } from "next/navigation";
import { preloadQuery, preloadedQueryResult } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";
import { requireAuthToken } from "@/lib/routePreload";
import { fetchAvailableModelsForServer } from "@/lib/serverAiModels";
import SrsReviewClient from "./SrsReviewClient";

export default async function SrsReviewPage() {
  const token = await requireAuthToken();
  const [
    preloadedQueue,
    preloadedStats,
    preloadedTtsConfig,
    preloadedAnnotations,
    initialAssistantModels,
  ] =
    await Promise.all([
      preloadQuery(api.srsReviewQueue.getHydratedQueue, {}, { token }),
      preloadQuery(api.srsReviewQueue.getQueueStats, {}, { token }),
      preloadQuery(api.userSettings.getTtsConfig, {}, { token }),
      preloadQuery(api.cardAnnotations.getAll, {}, { token }),
      fetchAvailableModelsForServer(token),
    ]);

  const queue = preloadedQueryResult(preloadedQueue);
  if (queue.length === 0) {
    redirect("/");
  }

  return (
    <SrsReviewClient
      preloadedQueue={preloadedQueue}
      preloadedStats={preloadedStats}
      preloadedTtsConfig={preloadedTtsConfig}
      preloadedAnnotations={preloadedAnnotations}
      initialAssistantModels={initialAssistantModels}
    />
  );
}
