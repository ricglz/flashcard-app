import Link from "next/link";
import type { FieldDefinition } from "@/lib/types";
import { detectLanguage, languageLabel } from "./FilterBar";
import { formatDate } from "@/lib/formatDate";

export function SetCard({
  set,
}: {
  set: {
    _id: string;
    name: string;
    description?: string;
    fieldDefinitions: FieldDefinition[];
    cardCount: number;
    updatedAt: number;
    createdAt: number;
  };
}) {
  const lang = detectLanguage(set.fieldDefinitions);

  return (
    <Link
      href={`/sets/${set._id}`}
      className="border border-edge rounded-lg p-4 hover:shadow-md transition-shadow flex flex-col"
    >
      <div className="min-w-0 flex items-start justify-between gap-2">
        <h3 className="min-w-0 font-semibold text-lg mb-1 break-words">
          {set.name}
        </h3>
        {lang && (
          <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-medium rounded bg-accent-surface text-accent-surface-text">
            {languageLabel(lang)}
          </span>
        )}
      </div>
      {set.description && (
        <p className="text-muted text-sm mb-2 line-clamp-2 break-words">
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
        <span>{formatDate(set.updatedAt)}</span>
      </div>
    </Link>
  );
}
