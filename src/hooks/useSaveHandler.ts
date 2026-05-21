"use client";

import { useCallback, useState } from "react";
import type { AppResult, AppFailure } from "@/lib/appResult";

type UseSaveHandlerOptions<T> = {
  onSuccess?: (result: T) => void;
  onError?: (error: string) => void;
};

export function useSaveHandler<T>(options?: UseSaveHandlerOptions<T>) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (operation: () => Promise<AppResult<T, AppFailure<string, object>>>): Promise<T | null> => {
      setIsSaving(true);
      setError(null);
      try {
        const result = await operation();
        if (!result.ok) {
          const message = result.error.message;
          setError(message);
          options?.onError?.(message);
          return null;
        }
        options?.onSuccess?.(result.value);
        return result.value;
      } finally {
        setIsSaving(false);
      }
    },
    [options]
  );

  return { execute, isSaving, error, setError };
}
