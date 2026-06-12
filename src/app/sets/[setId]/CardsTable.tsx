"use client";

import Link from "next/link";
import TtsButton from "@/components/TtsButton";
import { getTtsConfig, type FieldDefinition } from "@/lib/types";
import type { Doc } from "../../../../convex/_generated/dataModel";

type Props = {
  setId: string;
  cards: Doc<"flashcards">[];
  sortedFieldDefs: FieldDefinition[];
  isOwner: boolean;
  ttsPlaybackSpeed: number;
};

export default function CardsTable({
  setId,
  cards,
  sortedFieldDefs,
  isOwner,
  ttsPlaybackSpeed,
}: Props) {
  if (cards.length === 0) {
    return (
      <div className="text-center py-8 border rounded-lg">
        <p className="text-muted mb-3">No cards yet.</p>
        {isOwner && (
          <Link
            href={`/sets/${setId}/edit`}
            className="text-accent hover:underline text-sm"
          >
            Add cards
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-raised">
            <th className="text-left px-4 py-2 text-xs text-muted">
              #
            </th>
            {sortedFieldDefs.map((fd) => (
              <th
                key={fd.name}
                className="text-left px-4 py-2 text-xs text-muted"
              >
                {fd.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...cards]
            .sort((a, b) => a.order - b.order)
            .map((card, idx) => (
              <tr key={card._id} className="border-t hover:bg-surface-hover">
                <td className="px-4 py-2 text-muted">{idx + 1}</td>
                {sortedFieldDefs.map((fd) => {
                  const value = card.fields[fd.name] ?? "";
                  const ttsConfig = getTtsConfig(fd);
                  return (
                    <td key={fd.name} className="px-4 py-2">
                      <div className="flex items-center gap-1">
                        <span>{value}</span>
                        {ttsConfig && value && (
                          <TtsButton
                            text={value}
                            lang={ttsConfig.lang}
                            rate={ttsPlaybackSpeed}
                          />
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
