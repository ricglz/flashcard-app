import { redirect } from "next/navigation";
import { preloadQuery, preloadedQueryResult } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";
import { getAuthToken } from "@/lib/server";
import SrsReviewClient from "./SrsReviewClient";

export default async function SrsReviewPage() {
  const token = await getAuthToken();
  const [preloadedQueue, preloadedStats, preloadedSettings, preloadedAnnotations] =
    await Promise.all([
      preloadQuery(api.srsReviewQueue.getHydratedQueue, {}, { token }),
      preloadQuery(api.srsReviewQueue.getQueueStats, {}, { token }),
      preloadQuery(api.userSettings.get, {}, { token }),
      preloadQuery(api.cardAnnotations.getAll, {}, { token }),
    ]);

  const queue = preloadedQueryResult(preloadedQueue);
  if (queue.length === 0) {
    redirect("/");
  }

  return (
    <SrsReviewClient
      preloadedQueue={preloadedQueue}
      preloadedStats={preloadedStats}
      preloadedSettings={preloadedSettings}
      preloadedAnnotations={preloadedAnnotations}
    />
  );
}
