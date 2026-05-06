"use client";

import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { SignInButton, UserButton } from "@clerk/nextjs";
import SrsQueueStatus from "@/components/SrsQueueStatus";
import StreakBadge from "@/components/StreakBadge";
import DailyGoalRing from "@/components/DailyGoalRing";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b px-4 sm:px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Flashcard App</h1>
        <div className="flex items-center gap-4">
          <Authenticated>
            <UserButton />
          </Authenticated>
          <Unauthenticated>
            <SignInButton mode="modal">
              <button className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover text-sm transition-colors">
                Sign In
              </button>
            </SignInButton>
          </Unauthenticated>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 max-w-5xl mx-auto w-full">
        <AuthLoading>
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
          </div>
        </AuthLoading>

        <Unauthenticated>
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
        </Unauthenticated>

        <Authenticated>
          <SrsQueueStatus />

          <div className="mb-6 p-4 border border-edge rounded-lg flex items-center justify-between">
            <StreakBadge />
            <DailyGoalRing />
          </div>

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
              href="/progress"
              className="p-6 border border-edge rounded-lg hover:shadow-md transition-shadow"
            >
              <h2 className="font-semibold text-lg mb-1">Progress</h2>
              <p className="text-sm text-muted">
                View your study stats
              </p>
            </Link>
          </div>
        </Authenticated>
      </main>
    </div>
  );
}
