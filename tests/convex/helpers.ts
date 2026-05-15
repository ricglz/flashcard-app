export async function unwrap<T>(
  result: { ok: true; value: T } | { ok: false; error: { message: string } } | T,
): Promise<T> {
  if (result && typeof result === "object" && "ok" in result) {
    if (result.ok === false) throw new Error(result.error.message);
    return result.value;
  }
  return result as T;
}

export const TEST_USER = {
  tokenIdentifier: "test-user-1",
  subject: "user1",
};

export const fieldDefs = [
  { name: "Front", role: "primary" as const, metadata: {}, order: 0 },
  { name: "Back", role: "definition" as const, metadata: {}, order: 1 },
];

export const fieldDefsWithTts = [
  { name: "Character", role: "primary" as const, metadata: { tts: { lang: "zh-CN" } }, order: 0 },
  { name: "Pinyin", role: "pronunciation" as const, metadata: {}, order: 1 },
  { name: "Meaning", role: "definition" as const, metadata: {}, order: 2 },
];
