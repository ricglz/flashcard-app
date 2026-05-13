"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { getTtsConfig } from "@/lib/types";
import TtsButton from "@/components/TtsButton";
import Link from "next/link";

export default function FlaggedCardsClient() {
  const flaggedCards = useQuery(api.cardAnnotations.getFlagged);
  const toggleFlag = useMutation(api.cardAnnotations.toggleFlag);

  if (flaggedCards === undefined) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  if (flaggedCards.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-lg font-medium mb-2">No flagged cards yet</p>
        <p className="text-muted text-sm">
          Flag cards during study to see them here.
        </p>
      </div>
    );
  }

  const grouped = new Map<string, typeof flaggedCards>();
  for (const card of flaggedCards) {
    if (!card) continue;
    const existing = grouped.get(card.setId) ?? [];
    existing.push(card);
    grouped.set(card.setId, existing);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {[...grouped.entries()].map(([setId, cards]) => (
        <section key={setId}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">{cards[0]!.setName}</h2>
            <Link
              href={`/study/${setId}`}
              className="text-sm text-accent hover:text-accent-hover transition-colors"
            >
              Study set &rarr;
            </Link>
          </div>
          <div className="space-y-2">
            {cards.map((card) => {
              if (!card) return null;
              const fieldDefs = card.fieldDefinitions ?? [];
              return (
                <div
                  key={card.cardId}
                  className="bg-card-bg border border-card-border rounded-lg p-3 flex items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {fieldDefs.slice(0, 3).map((fd) => {
                        const value = card.fields[fd.name];
                        if (!value) return null;
                        const ttsConfig = getTtsConfig(fd);
                        return (
                          <span key={fd.name} className="flex items-center gap-1">
                            <span className={fd.role === "primary" ? "font-bold" : "text-muted"}>
                              {value}
                            </span>
                            {ttsConfig && (
                              <TtsButton text={value} lang={ttsConfig.lang} className="scale-75" />
                            )}
                          </span>
                        );
                      })}
                    </div>
                    {card.note && (
                      <p className="text-xs text-muted italic mt-1">{card.note}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => void toggleFlag({ cardId: card.cardId as Id<"flashcards">, setId: card.setId as Id<"flashcardSets"> })}
                    className="text-amber-500 hover:text-amber-600 transition-colors text-sm shrink-0"
                    aria-label="Unflag card"
                  >
                    ★
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
