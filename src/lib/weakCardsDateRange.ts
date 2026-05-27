import { z } from "zod";
import type { WeakCardsReviewFilter } from "./aiToolingSchemas";

const MAX_RANGE_MS = 365 * 24 * 60 * 60 * 1000;
const DEFAULT_RANGE_DAYS = 90;

const DateInputSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => parseLocalDateParts(value) !== null);

export type WeakCardsDateRange =
  | {
      ok: true;
      from: string;
      to: string;
      reviewFilter: WeakCardsReviewFilter;
    }
  | {
      ok: false;
      from: string;
      to: string;
      error: string;
    };

export type OptionalWeakCardsDateRange =
  | { status: "absent" }
  | {
      status: "valid";
      from: string;
      to: string;
      reviewFilter: WeakCardsReviewFilter;
    }
  | {
      status: "invalid";
      from: string;
      to: string;
      error: string;
    };

type LocalDateParts = {
  year: number;
  monthIndex: number;
  day: number;
};

function parseLocalDateParts(value: string): LocalDateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }

  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return { year, monthIndex: month - 1, day };
}

function dateInputToStartMs(value: string): number | null {
  const parts = parseLocalDateParts(value);
  if (!parts) return null;
  return new Date(parts.year, parts.monthIndex, parts.day).getTime();
}

function dateInputToExclusiveEndMs(value: string): number | null {
  const parts = parseLocalDateParts(value);
  if (!parts) return null;
  return new Date(parts.year, parts.monthIndex, parts.day + 1).getTime();
}

export function formatLocalDateInput(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function defaultWeakCardsDateRange(now = new Date()): {
  from: string;
  to: string;
} {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const from = new Date(today);
  from.setDate(today.getDate() - (DEFAULT_RANGE_DAYS - 1));
  return {
    from: formatLocalDateInput(from),
    to: formatLocalDateInput(today),
  };
}

export function parseWeakCardsDateRange(
  from: string,
  to: string,
): WeakCardsDateRange {
  const fromResult = DateInputSchema.safeParse(from);
  const toResult = DateInputSchema.safeParse(to);
  if (!fromResult.success || !toResult.success) {
    return { ok: false, from, to, error: "Choose valid from and to dates." };
  }

  const startMs = dateInputToStartMs(from);
  const endMs = dateInputToExclusiveEndMs(to);
  if (startMs === null || endMs === null) {
    return { ok: false, from, to, error: "Choose valid from and to dates." };
  }
  if (startMs >= endMs) {
    return { ok: false, from, to, error: "From date must be on or before to date." };
  }
  if (endMs - startMs > MAX_RANGE_MS) {
    return { ok: false, from, to, error: "Date range must be 365 days or less." };
  }

  return {
    ok: true,
    from,
    to,
    reviewFilter: { kind: "calendar_range", startMs, endMs },
  };
}

export function parseWeakCardsDateRangeParams(
  fromParam: string | null,
  toParam: string | null,
  now = new Date(),
): WeakCardsDateRange {
  if (fromParam === null && toParam === null) {
    const defaults = defaultWeakCardsDateRange(now);
    return parseWeakCardsDateRange(defaults.from, defaults.to);
  }

  const defaults = defaultWeakCardsDateRange(now);
  const from = fromParam ?? defaults.from;
  const to = toParam ?? defaults.to;
  if (fromParam === null || toParam === null) {
    return { ok: false, from, to, error: "Choose both from and to dates." };
  }

  return parseWeakCardsDateRange(from, to);
}

export function parseOptionalWeakCardsDateRangeParams(
  fromParam: string | null,
  toParam: string | null,
): OptionalWeakCardsDateRange {
  if (fromParam === null && toParam === null) return { status: "absent" };

  const from = fromParam ?? "";
  const to = toParam ?? "";
  if (fromParam === null || toParam === null) {
    return { status: "invalid", from, to, error: "Choose both from and to dates." };
  }

  const parsed = parseWeakCardsDateRange(from, to);
  return parsed.ok
    ? {
        status: "valid",
        from: parsed.from,
        to: parsed.to,
        reviewFilter: parsed.reviewFilter,
      }
    : {
        status: "invalid",
        from: parsed.from,
        to: parsed.to,
        error: parsed.error,
      };
}

export function formatWeakCardsReviewFilter(filter: WeakCardsReviewFilter): string {
  if (filter.kind === "relative_days") {
    return `Last ${filter.days} days`;
  }

  const from = formatLocalDateInput(new Date(filter.startMs));
  const exclusiveEnd = new Date(filter.endMs);
  const to = new Date(
    exclusiveEnd.getFullYear(),
    exclusiveEnd.getMonth(),
    exclusiveEnd.getDate() - 1,
  );
  return `${from} to ${formatLocalDateInput(to)}`;
}
