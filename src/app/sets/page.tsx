"use client";

import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { SignInButton, UserButton } from "@clerk/nextjs";
import FlashcardSetList from "@/components/FlashcardSetList";
import Link from "next/link";

export default function SetsPage() {
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
          <h1 className="text-xl font-bold">My Sets</h1>
        </div>
        <div className="flex items-center gap-4">
          <Authenticated>
            <Link
              href="/sets/new"
              className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover text-sm transition-colors"
            >
              New Set
            </Link>
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
            <p className="text-muted">Sign in to manage your flashcard sets.</p>
          </div>
        </Unauthenticated>

        <Authenticated>
          <FlashcardSetList />
        </Authenticated>
      </main>
    </div>
  );
}
