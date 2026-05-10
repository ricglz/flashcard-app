"use client";

import { Show, ClerkLoading } from "@clerk/nextjs";
import { SignInButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import ProgressClient from "./ProgressClient";

export default function ProgressPage() {
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
        <Show when="signed-in">
          <UserButton />
        </Show>
        <Show when="signed-out">
          <SignInButton mode="modal">
            <button className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover text-sm transition-colors">
              Sign In
            </button>
          </SignInButton>
        </Show>
      </header>

      <main className="flex-1 p-4 sm:p-6 max-w-3xl mx-auto w-full">
        <ClerkLoading>
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
          </div>
        </ClerkLoading>

        <Show when="signed-out">
          <div className="text-center py-20">
            <p className="text-muted">Sign in to view your progress.</p>
          </div>
        </Show>

        <Show when="signed-in">
          <ProgressClient />
        </Show>
      </main>
    </div>
  );
}
