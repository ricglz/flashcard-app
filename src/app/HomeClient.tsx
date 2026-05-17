"use client";

import { SignInButton, UserButton } from "@clerk/nextjs";
import type { Preloaded } from "convex/react";
import type { api } from "../../convex/_generated/api";
import SrsQueueStatus from "@/components/SrsQueueStatus";
import StreakBadge from "@/components/StreakBadge";
import DailyGoalRing from "@/components/DailyGoalRing";
import Link from "next/link";

type Props = {
  preloadedStats: Preloaded<typeof api.srsReviewQueue.getQueueStats>;
  preloadedSettings: Preloaded<typeof api.userSettings.get>;
  preloadedStreak: Preloaded<typeof api.progress.getStreakStats>;
  preloadedGoal: Preloaded<typeof api.progress.getDailyGoalProgress>;
};

export default function HomeClient({
  preloadedStats,
  preloadedSettings,
  preloadedStreak,
  preloadedGoal,
}: Props) {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b px-4 sm:px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Flashcard App</h1>
        <div className="flex items-center gap-4">
          <Link
            href="/settings"
            className="text-muted hover:text-foreground transition-colors"
            aria-label="Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
          </Link>
          <UserButton />
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 max-w-5xl mx-auto w-full">
        <SrsQueueStatus
          preloadedStats={preloadedStats}
          preloadedSettings={preloadedSettings}
        />

        <div className="mb-6 p-4 border border-edge rounded-lg flex items-center justify-between">
          <StreakBadge preloaded={preloadedStreak} />
          <DailyGoalRing preloaded={preloadedGoal} />
        </div>

        <section className="mb-6">
          <h3 className="text-sm font-medium text-muted mb-3">Library</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <Link
              href="/sets"
              className="p-6 border border-edge rounded-lg hover:shadow-md transition-shadow"
            >
              <h2 className="font-semibold text-lg mb-1">My Sets</h2>
              <p className="text-sm text-muted">
                Manage your flashcard sets
              </p>
            </Link>
            <Link
              href="/sets/new"
              className="p-6 border border-edge rounded-lg hover:shadow-md transition-shadow"
            >
              <h2 className="font-semibold text-lg mb-1">New Set</h2>
              <p className="text-sm text-muted">
                Create a new flashcard set
              </p>
            </Link>
            <Link
              href="/explore"
              className="p-6 border border-edge rounded-lg hover:shadow-md transition-shadow"
            >
              <h2 className="font-semibold text-lg mb-1">Explore</h2>
              <p className="text-sm text-muted">
                Browse publicly shared flashcard sets
              </p>
            </Link>
          </div>
        </section>

        <section>
          <h3 className="text-sm font-medium text-muted mb-3">Study & Review</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <Link
              href="/progress"
              className="p-6 border border-edge rounded-lg hover:shadow-md transition-shadow"
            >
              <h2 className="font-semibold text-lg mb-1">Progress</h2>
              <p className="text-sm text-muted">
                View your study stats
              </p>
            </Link>
            <Link
              href="/flagged"
              className="p-6 border border-edge rounded-lg hover:shadow-md transition-shadow"
            >
              <h2 className="font-semibold text-lg mb-1">Flagged Cards</h2>
              <p className="text-sm text-muted">
                Review cards you flagged during study
              </p>
            </Link>
            <Link
              href="/weak-spots"
              className="p-6 border border-edge rounded-lg hover:shadow-md transition-shadow"
            >
              <h2 className="font-semibold text-lg mb-1">Weak Spots</h2>
              <p className="text-sm text-muted">
                Analyze cards you struggle with
              </p>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

export function HomeLanding() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b px-4 sm:px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Flashcard App</h1>
        <div className="flex items-center gap-4">
          <SignInButton mode="modal">
            <button className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover text-sm transition-colors">
              Sign In
            </button>
          </SignInButton>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 max-w-5xl mx-auto w-full">
        <div className="text-center py-20">
          <h2 className="text-3xl font-bold mb-4">
            Learn with Flashcards
          </h2>
          <p className="text-muted mb-8 max-w-md mx-auto">
            Create custom flashcard sets, study with text-to-speech,
            and track your progress. Sign in to get started.
          </p>
          <SignInButton mode="modal">
            <button className="px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent-hover text-lg transition-colors">
              Get Started
            </button>
          </SignInButton>
        </div>
      </main>
    </div>
  );
}
