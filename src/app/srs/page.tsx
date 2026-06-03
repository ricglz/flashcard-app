import { redirect } from "next/navigation";
import { preloadQuery, preloadedQueryResult } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";
import { requireAuthToken } from "@/lib/routePreload";
import SrsReviewClient from "./SrsReviewClient";

export default async function SrsReviewPage() {
  const token = await requireAuthToken();
  const [preloadedSession, preloadedTtsConfig] =
    await Promise.all([
      preloadQuery(
        api.srsReviewQueue.getReviewSession,
        { batchSize: 50 },
        { token },
      ),
      preloadQuery(api.userSettings.getTtsConfig, {}, { token }),
    ]);

  const session = preloadedQueryResult(preloadedSession);
  if (session.queue.length === 0) {
    redirect("/");
  }

  return (
    <SrsReviewClient
      preloadedSession={preloadedSession}
      preloadedTtsConfig={preloadedTtsConfig}
    />
  );
}
