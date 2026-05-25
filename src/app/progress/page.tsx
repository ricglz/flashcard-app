import { preloadQuery } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";
import { requireAuthToken } from "@/lib/routePreload";
import ProgressClient from "./ProgressClient";
import Link from "next/link";

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
      <header className="border-b px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-sm text-muted hover:text-foreground"
          >
            &larr; Dashboard
          </Link>
          <h1 className="text-xl font-bold">Your Progress</h1>
        </div>
      </header>

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
