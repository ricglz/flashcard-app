const HALLUCINATED_FN_CALL = /<function=[^>]*>[\s\S]*?<\/function>/g;

export function stripHallucinatedFnCalls(
  text: string,
  onStrip?: (match: string) => void,
): string {
  return text.replace(HALLUCINATED_FN_CALL, (match) => {
    onStrip?.(match);
    return "";
  });
}
