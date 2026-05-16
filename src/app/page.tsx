import { preloadQuery } from "convex/nextjs";
import { api } from "../../convex/_generated/api";
import { getAuthToken } from "@/lib/server";
import HomeClient, { HomeLanding } from "./HomeClient";

export default async function Home() {
  const token = await getAuthToken();

  if (!token) {
    return <HomeLanding />;
  }

  const [preloadedStats, preloadedSettings, preloadedStreak, preloadedGoal] =
    await Promise.all([
      preloadQuery(api.srsReviewQueue.getQueueStats, {}, { token }),
      preloadQuery(api.userSettings.get, {}, { token }),
      preloadQuery(api.progress.getStreakStats, {}, { token }),
      preloadQuery(api.progress.getDailyGoalProgress, {}, { token }),
    ]);

  return (
    <HomeClient
      preloadedStats={preloadedStats}
      preloadedSettings={preloadedSettings}
      preloadedStreak={preloadedStreak}
      preloadedGoal={preloadedGoal}
    />
  );
}
