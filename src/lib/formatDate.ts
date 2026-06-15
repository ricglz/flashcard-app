export function formatDate(ms: number | undefined | null): string {
  if (ms === undefined || ms === null) return "Never";
  return new Date(ms).toLocaleString();
}
