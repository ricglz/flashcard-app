import { preloadQuery } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";
import { requireAuthToken } from "@/lib/routePreload";
import ProgressClient from "./ProgressClient";
import { PageHeader } from "@/components/ui/PageHeader";

export default async function ProgressPage() {
  const token = await requireAuthToken();

  const [preloadedSrsSummary, preloadedStreak, preloadedGoal] =
    await Promise.all([
      preloadQuery(api.progress.getSrsProgressSummary, {}, { token }),
      preloadQuery(api.progress.getStreakStats, {}, { token }),
      preloadQuery(api.progress.getDailyGoalProgress, {}, { token }),
    ]);

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="Your Progress" backLabel="Dashboard" />

      <main className="flex-1 p-4 sm:p-6 max-w-3xl mx-auto w-full">
        <ProgressClient
          preloadedSrsSummary={preloadedSrsSummary}
          preloadedStreak={preloadedStreak}
          preloadedGoal={preloadedGoal}
        />
      </main>
    </div>
  );
}
