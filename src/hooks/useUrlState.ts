"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";

export type UrlStateOptions = {
  replace?: boolean;
  scroll?: boolean;
  serialize?: (value: unknown) => string;
};

function isDefaultValue<T>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

export function parseUrlState<T>(
  raw: string | null,
  schema: z.ZodType<T>,
  defaultValue: T,
): T {
  if (raw === null) return defaultValue;
  const result = schema.safeParse(raw);
  return result.success ? result.data : defaultValue;
}

export function serializeUrlState(value: unknown, serialize?: (value: unknown) => string): string {
  if (serialize) return serialize(value);
  return String(value as string | number | boolean);
}

export function useUrlState<T>(
  key: string,
  schema: z.ZodType<T>,
  defaultValue: T,
  options?: UrlStateOptions,
): [T, (next: T | ((prev: T) => T)) => void] {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const replace = options?.replace ?? true;
  const scroll = options?.scroll ?? false;

  const value = useMemo(() => {
    const raw = searchParams.get(key);
    return parseUrlState(raw, schema, defaultValue);
  }, [searchParams, key, schema, defaultValue]);

  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      const prev = parseUrlState(searchParams.get(key), schema, defaultValue);
      const resolved = typeof next === "function" ? (next as (prev: T) => T)(prev) : next;
      const params = new URLSearchParams(searchParams.toString());
      if (isDefaultValue(resolved, defaultValue)) {
        params.delete(key);
      } else {
        params.set(key, serializeUrlState(resolved, options?.serialize));
      }
      const query = params.toString();
      const url = query ? `${pathname}?${query}` : pathname;
      if (replace) {
        router.replace(url, { scroll });
      } else {
        router.push(url, { scroll });
      }
    },
    [searchParams, pathname, router, key, schema, defaultValue, replace, scroll, options?.serialize],
  );

  return [value, setValue];
}

export const zEnum = <T extends readonly [string, ...string[]]>(values: T) => z.enum(values);
