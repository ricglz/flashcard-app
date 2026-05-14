"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { asId } from "@/lib/convexHelpers";
import {
  FIELD_ROLES,
  FIELD_ROLE_LABELS,
  getTtsConfig,
  type FieldRole,
} from "@/lib/types";
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

  const cards = flaggedCards.filter(
    (c): c is NonNullable<typeof c> => c !== null
  );

  const presentRoles = FIELD_ROLES.filter((role) =>
    cards.some((card) => card.fieldDefinitions?.some((fd) => fd.role === role))
  );

  const hasNotes = cards.some((card) => card.note);

  function getFieldForRole(card: (typeof cards)[number], role: FieldRole) {
    const fd = card.fieldDefinitions?.find(
      (f: { role: string }) => f.role === role
    );
    if (!fd) return null;
    const value = card.fields[fd.name];
    if (!value) return null;
    return { value, ttsConfig: getTtsConfig(fd) };
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-raised">
              <th className="text-left px-4 py-2 text-xs text-muted">#</th>
              <th className="text-left px-4 py-2 text-xs text-muted">Set</th>
              {presentRoles.map((role) => (
                <th
                  key={role}
                  className="text-left px-4 py-2 text-xs text-muted"
                >
                  {FIELD_ROLE_LABELS[role]}
                </th>
              ))}
              {hasNotes && (
                <th className="text-left px-4 py-2 text-xs text-muted">
                  Note
                </th>
              )}
              <th className="px-4 py-2 text-xs text-muted w-8" />
            </tr>
          </thead>
          <tbody>
            {cards.map((card, idx) => (
                <tr key={card.cardId} className="border-t hover:bg-surface-hover">
                  <td className="px-4 py-2 text-muted">{idx + 1}</td>
                  <td className="px-4 py-2">
                    <Link
                      href={`/study/${card.setId}`}
                      className="text-accent hover:text-accent-hover transition-colors"
                    >
                      {card.setName}
                    </Link>
                  </td>
                  {presentRoles.map((role) => {
                    const field = getFieldForRole(card, role);
                    return (
                      <td key={role} className="px-4 py-2">
                        {field && (
                          <div className="flex items-center gap-1">
                            <span>{field.value}</span>
                            {field.ttsConfig && (
                              <TtsButton
                                text={field.value}
                                lang={field.ttsConfig.lang}
                              />
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                  {hasNotes && (
                    <td className="px-4 py-2 text-xs text-muted italic">
                      {card.note}
                    </td>
                  )}
                  <td className="px-4 py-2">
                    <button
                      type="button"
                      onClick={() =>
                        void toggleFlag({
                          cardId: asId<"flashcards">(card.cardId),
                          setId: asId<"flashcardSets">(card.setId),
                        })
                      }
                      className="text-amber-500 hover:text-amber-600 transition-colors"
                      aria-label="Unflag card"
                    >
                      ★
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
