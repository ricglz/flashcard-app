"use client";

import { useState } from "react";
import { SignInButton, UserButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import type { Preloaded } from "convex/react";
import type { api } from "../../../convex/_generated/api";
import { PreloadedFlashcardSetList } from "@/components/FlashcardSetList";
import QuickCreateForm from "@/components/QuickCreateForm";
import Link from "next/link";

type Props = {
  preloadedSets: Preloaded<typeof api.flashcardSets.list>;
};

export default function SetsClient({ preloadedSets }: Props) {
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
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 max-w-5xl mx-auto w-full">
        <PreloadedFlashcardSetList preloaded={preloadedSets} />
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
