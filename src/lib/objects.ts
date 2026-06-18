function compareStrings(a: string, b: string): number {
  // Deterministic code-point order for stable SSR/hydration across locales.
  // Avoids default localeCompare which varies by user locale and Node vs browser.
  return a < b ? -1 : a > b ? 1 : 0;
}

export function sortedEntries<T>(record: Record<string, T>): [string, T][] {
  return Object.entries(record).sort(([a], [b]) => compareStrings(a, b));
}

export function sortedStrings(arr: readonly string[]): string[] {
  return [...arr].sort(compareStrings);
}
