import Link from "next/link";

export function SetCard({ set }: { set: { _id: string; name: string; description?: string; fieldDefinitions: { name: string }[]; cardCount?: number } }) {
  return (
    <Link
      href={`/sets/${set._id}`}
      className="border border-edge rounded-lg p-4 hover:shadow-md transition-shadow flex flex-col"
    >
      <h3 className="font-semibold text-lg mb-1">{set.name}</h3>
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
          {set.cardCount ?? "?"} card
          {(set.cardCount ?? 0) !== 1 ? "s" : ""}
        </span>
      </div>
    </Link>
  );
}
