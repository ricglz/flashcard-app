"use client";

import { useState } from "react";
import { Show, ClerkLoading } from "@clerk/nextjs";
import { SignInButton, UserButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import FlashcardSetList from "@/components/FlashcardSetList";
import QuickCreateForm from "@/components/QuickCreateForm";
import Link from "next/link";

export default function SetsPage() {
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const router = useRouter();

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
          <Show when="signed-in">
            <button
              onClick={() => setShowQuickCreate(true)}
              className="px-4 py-2 border border-edge rounded-lg hover:bg-surface-hover text-sm transition-colors"
            >
              Quick Create
            </button>
            <Link
              href="/sets/new"
              className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover text-sm transition-colors"
            >
              New Set
            </Link>
            <UserButton />
          </Show>
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover text-sm transition-colors">
                Sign In
              </button>
            </SignInButton>
          </Show>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 max-w-5xl mx-auto w-full">
        <ClerkLoading>
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
          </div>
        </ClerkLoading>

        <Show when="signed-out">
          <div className="text-center py-20">
            <p className="text-muted">Sign in to manage your flashcard sets.</p>
          </div>
        </Show>

        <Show when="signed-in">
          <FlashcardSetList />
        </Show>
      </main>

      {showQuickCreate && (
        <QuickCreateForm
          onClose={() => setShowQuickCreate(false)}
          onCreated={(setId) => {
            setShowQuickCreate(false);
            router.push(`/sets/${setId}`);
          }}
        />
      )}
    </div>
  );
}
