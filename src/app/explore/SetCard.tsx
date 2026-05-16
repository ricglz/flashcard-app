import Link from "next/link";
import type { FieldDefinition } from "@/lib/types";
import { detectLanguage, languageLabel } from "./FilterBar";

export function SetCard({
  set,
}: {
  set: {
    _id: string;
    name: string;
    description?: string;
    fieldDefinitions: FieldDefinition[];
    cardCount: number;
  };
}) {
  const lang = detectLanguage(set.fieldDefinitions);

  return (
    <Link
      href={`/sets/${set._id}`}
      className="border border-edge rounded-lg p-4 hover:shadow-md transition-shadow flex flex-col"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-lg mb-1">{set.name}</h3>
        {lang && (
          <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-medium rounded bg-accent-surface text-accent-surface-text">
            {languageLabel(lang)}
          </span>
        )}
      </div>
      {set.description && (
        <p className="text-muted text-sm mb-2 line-clamp-2">
          {set.description}
        </p>
      )}
      <div className="mt-auto flex items-center gap-3 text-xs text-muted pt-2">
        <span>
          {set.fieldDefinitions.length} field
          {set.fieldDefinitions.length !== 1 ? "s" : ""}
        </span>
        <span>
          {set.cardCount} card
          {set.cardCount !== 1 ? "s" : ""}
        </span>
      </div>
    </Link>
  );
}
