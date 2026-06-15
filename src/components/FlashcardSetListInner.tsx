"use client";

import { useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../convex/_generated/api";
import Link from "next/link";
import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LinkButton } from "@/components/ui/LinkButton";
import { Select } from "@/components/ui/Select";
import { useSaveHandler } from "@/hooks/useSaveHandler";
import { formatDate } from "@/lib/formatDate";

type SetList = Extract<
  FunctionReturnType<typeof api.flashcardSets.list>,
  { ok: true }
>["value"];

const SORT_OPTIONS = ["updated", "created", "name"] as const;
type SortOption = (typeof SORT_OPTIONS)[number];
const SORT_LABELS: Record<SortOption, string> = {
  updated: "Last updated",
  created: "Date created",
  name: "Name A-Z",
};

function isSortOption(value: string | null): value is SortOption {
  return value === "updated" || value === "created" || value === "name";
}

export default function FlashcardSetListInner({ sets }: { sets: SetList }) {
  const removeSet = useMutation(api.flashcardSets.remove);
  const { execute: executeRemove, error } = useSaveHandler<null>({
    fallbackErrorMessage: "Failed to delete set",
  });
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const sortParam = searchParams.get("sort");
  const sortBy: SortOption = isSortOption(sortParam) ? sortParam : "updated";

  const updateSort = (next: SortOption) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "updated") {
      params.delete("sort");
    } else {
      params.set("sort", next);
    }
    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
  };

  const sortedSets = useMemo(() => {
    const copy = [...sets];
    switch (sortBy) {
      case "name":
        copy.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "created":
        copy.sort((a, b) => {
          const aTime = a.createdAt;
          const bTime = b.createdAt;
          return bTime - aTime;
        });
        break;
      case "updated":
      default:
        copy.sort((a, b) => b.updatedAt - a.updatedAt);
        break;
    }
    return copy;
  }, [sets, sortBy]);

  if (sets.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted mb-4">No flashcard sets yet.</p>
        <LinkButton
          href="/sets/new"
        >
          Create Your First Set
        </LinkButton>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6">
        <h2 className="text-2xl font-bold">Your Flashcard Sets</h2>
        <Select
          value={sortBy}
          options={SORT_OPTIONS}
          labels={SORT_LABELS}
          onChange={updateSort}
        />
      </div>
      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sortedSets.map((set) => {
          const isOwner = set.userSet.role === "owner";
          return (
            <div
              key={set._id}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow flex flex-col"
            >
              <Link href={`/sets/${set._id}`} className="block flex-1">
                <div className="min-w-0 flex items-start gap-2 mb-1">
                  <h3 className="min-w-0 font-semibold text-lg break-words">
                    {set.name}
                  </h3>
                  {set.origin.kind === "ai_generated" && (
                    <Badge variant="info" size="sm">
                      AI generated
                    </Badge>
                  )}
                  {set.origin.kind === "forked" && (
                    <Badge variant="info" size="sm">
                      Forked
                    </Badge>
                  )}
                </div>
                {set.description && (
                  <p className="text-muted text-sm mb-2 break-words">
                    {set.description}
                  </p>
                )}
                <div className="flex items-center gap-2 text-xs text-muted">
                  <span>
                    {set.fieldDefinitions.length} field
                    {set.fieldDefinitions.length !== 1 ? "s" : ""}
                  </span>
                  <span>•</span>
                  <span>{formatDate(set.updatedAt)}</span>
                  {!isOwner && (
                    <>
                      <span>•</span>
                      <Badge variant="neutral" size="sm">
                        Shared
                      </Badge>
                    </>
                  )}
                </div>
              </Link>
              <div className="mt-3 flex gap-2">
                <LinkButton
                  href={`/study/${set._id}`}
                  size="sm"
                >
                  Study
                </LinkButton>
                {isOwner && (
                  <>
                    <LinkButton
                      href={`/sets/${set._id}/edit`}
                      variant="secondary"
                      size="sm"
                    >
                      Edit
                    </LinkButton>
                    <Button
                      onClick={() => {
                        if (confirm("Delete this set and all its cards?")) {
                          void executeRemove(() => removeSet({ id: set._id }));
                        }
                      }}
                      variant="ghost"
                      size="sm"
                      className="text-muted hover:text-danger hover:bg-danger-surface"
                    >
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
