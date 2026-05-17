"use client";


import { useState } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type Props = {
  setId: Id<"flashcardSets">;
  isForking: boolean;
  forkError: string | null;
  onFork: () => void;
};

export default function VisitorActions({
  setId,
  isForking,
  forkError,
  onFork,
}: Props) {
  const router = useRouter();
  const addToLibrary = useMutation(api.sharing.addToLibrary);
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const handleAddToLibrary = async () => {
    setIsAdding(true);
    setAddError(null);
    try {
      const result = await addToLibrary({ setId });
      if (!result.ok) {
        setAddError(result.error.message);
        return;
      }
      router.refresh();
    } catch (err) {
      setAddError(
        err instanceof Error ? err.message : "Failed to add to library"
      );
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="mb-6 p-4 border border-edge rounded-lg">
      <p className="text-sm text-muted mb-3">
        This set is not in your library yet.
      </p>
      <div className="flex gap-2">
        <button
          onClick={handleAddToLibrary}
          disabled={isAdding}
          className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover text-sm transition-colors disabled:opacity-50"
        >
          {isAdding ? "Adding..." : "Add to My Library"}
        </button>
        <button
          onClick={onFork}
          disabled={isForking}
          className="px-4 py-2 border border-edge rounded-lg hover:bg-surface-hover text-sm transition-colors disabled:opacity-50"
        >
          {isForking ? "Forking..." : "Fork (Copy to My Sets)"}
        </button>
      </div>
      {addError && (
        <p className="text-sm text-danger mt-2">{addError}</p>
      )}
      {forkError && (
        <p className="text-sm text-danger mt-2">{forkError}</p>
      )}
    </div>
  );
}
