"use client";

import { useState } from "react";
import { UserButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import type { Preloaded } from "convex/react";
import type { api } from "../../../convex/_generated/api";
import FlashcardSetList from "@/components/FlashcardSetList";
import QuickCreateForm from "@/components/QuickCreateForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { LinkButton } from "@/components/ui/LinkButton";

type Props = {
  preloadedSets: Preloaded<typeof api.flashcardSets.list>;
};

export default function SetsClient({ preloadedSets }: Props) {
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const router = useRouter();

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="My Sets"
        backLabel="Dashboard"
        actions={
          <>
            <Button variant="secondary" onClick={() => setShowQuickCreate(true)}>
              Quick Create
            </Button>
            <LinkButton href="/sets/merge" variant="secondary">
              Merge sets
            </LinkButton>
            <LinkButton href="/sets/new">New Set</LinkButton>
            <UserButton />
          </>
        }
      />

      <main className="flex-1 p-4 sm:p-6 max-w-5xl mx-auto w-full">
        <FlashcardSetList preloaded={preloadedSets} />
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
