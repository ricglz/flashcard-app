"use client";

import { usePreloadedQuery, Preloaded } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useOfflineQuery } from "@/lib/useOfflineQuery";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TtsButton from "@/components/TtsButton";
import SrsSetConfig from "@/components/SrsSetConfig";
import { getTtsConfig } from "@/lib/types";
import { useTypedFlashcardSet } from "@/hooks/convex/useTypedFlashcardSet";

type Props = {
  setId: string;
  preloadedSet: Preloaded<typeof api.flashcardSets.get>;
  preloadedCards: Preloaded<typeof api.flashcards.list>;
  preloadedUserSet: Preloaded<typeof api.userSets.get>;
};

export default function SetDetailClient({
  setId,
  preloadedSet,
  preloadedCards,
  preloadedUserSet,
}: Props) {
  const set = useTypedFlashcardSet(preloadedSet);
  const cards = usePreloadedQuery(preloadedCards);
  const userSet = usePreloadedQuery(preloadedUserSet);
  const router = useRouter();
  const settings = useOfflineQuery(api.userSettings.get);

  const sortedFieldDefs = [...set.fieldDefinitions].sort(
    (a, b) => a.order - b.order
  );

  const isOwner = userSet?.role === "owner";

  return (
    <div className="min-h-screen">
      <header className="border-b px-4 sm:px-6 py-4 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="text-sm text-muted hover:text-foreground"
        >
          &larr; Back
        </button>
        <div className="flex gap-2">
          <Link
            href={`/study/${setId}`}
            className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover text-sm transition-colors"
          >
            Study
          </Link>
          {isOwner && (
            <Link
              href={`/sets/${setId}/edit`}
              className="px-4 py-2 border border-edge rounded-lg hover:bg-surface-hover text-sm transition-colors"
            >
              Edit
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 sm:p-6">
        <h1 className="text-2xl font-bold mb-1">{set.name}</h1>
        {set.description && (
          <p className="text-muted mb-4">{set.description}</p>
        )}
        <p className="text-sm text-muted mb-6">
          {cards.length} card{cards.length !== 1 ? "s" : ""}
        </p>

        {userSet && (
          <div className="mb-6">
            <SrsSetConfig
              setId={set._id}
              srsEnabled={userSet.srsEnabled}
              defaultFrontFields={userSet.defaultFrontFields}
              defaultBackFields={userSet.defaultBackFields}
              defaultTtsOnlyFields={userSet.defaultTtsOnlyFields ?? []}
              fieldDefinitions={set.fieldDefinitions}
            />
          </div>
        )}

        {cards.length === 0 ? (
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
        ) : (
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
                {cards
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
                                  rate={settings?.ttsPlaybackSpeed}
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
        )}
      </main>
    </div>
  );
}
