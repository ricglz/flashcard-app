import { redirect } from "next/navigation";
import { preloadQuery } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";
import { getAuthToken } from "@/lib/server";
import ProgressClient from "./ProgressClient";
import Link from "next/link";

export default async function ProgressPage() {
  const token = await getAuthToken();
  if (!token) redirect("/");

  const [preloadedBreakdown, preloadedMastery, preloadedStreak, preloadedGoal] =
    await Promise.all([
      preloadQuery(api.progress.getCardStatusBreakdown, {}, { token }),
      preloadQuery(api.progress.getPerSetMastery, {}, { token }),
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
          preloadedBreakdown={preloadedBreakdown}
          preloadedMastery={preloadedMastery}
          preloadedStreak={preloadedStreak}
          preloadedGoal={preloadedGoal}
        />
      </main>
    </div>
  );
}
