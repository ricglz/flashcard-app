"use client";

import { use, useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import StudyCard from "@/components/StudyCard";
import BrowseNavigation from "@/components/BrowseNavigation";
import { FieldDefinition } from "@/lib/types";

function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export default function BrowsePage({
  params,
}: {
  params: Promise<{ setId: string }>;
}) {
  const { setId } = use(params);
  const searchParams = useSearchParams();
  const frontFields = searchParams.get("frontFields")?.split(",") ?? [];
  const backFields = searchParams.get("backFields")?.split(",") ?? [];
  const shuffle = searchParams.get("shuffle") === "true";
  const cardLimitParam = searchParams.get("cardLimit");
  const cardLimit = cardLimitParam ? parseInt(cardLimitParam, 10) : null;

  const set = useQuery(api.flashcardSets.get, {
    id: setId as Id<"flashcardSets">,
  });
  const cards = useQuery(api.flashcards.list, {
    setId: setId as Id<"flashcardSets">,
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [revealed, setRevealed] = useState(false);

  // Compute card order once when cards first load, then filter dismissed
  const [cardOrder, setCardOrder] = useState<string[] | null>(null);

  if (cards && cardOrder === null) {
    const sorted = [...cards]
      .sort((a, b) => a.order - b.order)
      .map((c) => c._id);
    let order = shuffle ? shuffleArray(sorted) : sorted;
    if (cardLimit && cardLimit > 0 && cardLimit < order.length) {
      order = order.slice(0, cardLimit);
    }
    setCardOrder(order);
  }

  const activeCardIds = useMemo(() => {
    if (!cardOrder) return [];
    return cardOrder.filter((id) => !dismissed.has(id));
  }, [cardOrder, dismissed]);

  if (set === undefined || cards === undefined) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!set) {
    return (
      <div className="text-center py-12">
        <p className="text-muted">Set not found.</p>
      </div>
    );
  }

  const fieldDefs = set.fieldDefinitions as FieldDefinition[];
  const cardsMap = new Map(cards.map((c) => [c._id, c]));

  if (activeCardIds.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="border-b px-4 sm:px-6 py-4">
          <Link
            href={`/study/${setId}`}
            className="text-sm text-muted hover:text-foreground"
          >
            &larr; Back
          </Link>
        </header>
        <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6">
          <p className="text-lg font-medium mb-4">
            {dismissed.size > 0
              ? "You've reviewed all the cards!"
              : "No cards to browse."}
          </p>
          <Link
            href={`/study/${setId}`}
            className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover text-sm transition-colors"
          >
            Back to Study Config
          </Link>
        </main>
      </div>
    );
  }

  // Clamp index to valid range
  const safeIndex = Math.min(currentIndex, activeCardIds.length - 1);
  const currentCardId = activeCardIds[safeIndex];
  const currentCard = currentCardId ? cardsMap.get(currentCardId) : null;

  if (!currentCard) {
    return (
      <div className="text-center py-12">
        <p className="text-muted">Card not found.</p>
      </div>
    );
  }

  const handlePrev = () => {
    if (safeIndex > 0) {
      setCurrentIndex(safeIndex - 1);
      setRevealed(false);
    }
  };

  const handleNext = () => {
    if (safeIndex < activeCardIds.length - 1) {
      setCurrentIndex(safeIndex + 1);
      setRevealed(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(new Set([...dismissed, currentCardId]));
    setRevealed(false);
    // If we dismissed the last card, move index back
    if (safeIndex >= activeCardIds.length - 2) {
      setCurrentIndex(Math.max(0, safeIndex - 1));
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b px-4 sm:px-6 py-4 flex items-center justify-between">
        <Link
          href={`/study/${setId}`}
          className="text-sm text-muted hover:text-foreground"
        >
          &larr; Back
        </Link>
        <span className="text-sm text-muted">
          {safeIndex + 1} / {activeCardIds.length}
          {dismissed.size > 0 && (
            <span className="ml-2">({dismissed.size} dismissed)</span>
          )}
        </span>
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-raised">
        <div
          className="h-full bg-accent transition-all"
          style={{
            width: `${((safeIndex + 1) / activeCardIds.length) * 100}%`,
          }}
        />
      </div>

      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6">
        <StudyCard
          key={currentCardId}
          card={currentCard}
          fieldDefinitions={fieldDefs}
          frontFields={frontFields}
          backFields={backFields}
          onRevealed={() => setRevealed(true)}
        />

        {revealed && (
          <BrowseNavigation
            onPrev={handlePrev}
            onNext={handleNext}
            onDismiss={handleDismiss}
            canPrev={safeIndex > 0}
            canNext={safeIndex < activeCardIds.length - 1}
          />
        )}
      </main>
    </div>
  );
}
