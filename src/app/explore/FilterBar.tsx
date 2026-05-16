import { getTtsConfig, type FieldDefinition } from "@/lib/types";

type CardCountRange = "any" | "1-20" | "21-50" | "51-100" | "100+";

const CARD_COUNT_RANGES: { value: CardCountRange; label: string }[] = [
  { value: "any", label: "Any" },
  { value: "1-20", label: "1-20" },
  { value: "21-50", label: "21-50" },
  { value: "51-100", label: "51-100" },
  { value: "100+", label: "100+" },
];

const LANG_LABELS: Record<string, string> = {
  zh: "Chinese",
  es: "Spanish",
  ja: "Japanese",
  ko: "Korean",
  fr: "French",
  de: "German",
  pt: "Portuguese",
  it: "Italian",
  ru: "Russian",
  ar: "Arabic",
  hi: "Hindi",
  th: "Thai",
  vi: "Vietnamese",
};

export type { CardCountRange };

export function matchesCardCountRange(
  cardCount: number,
  range: CardCountRange,
): boolean {
  switch (range) {
    case "any":
      return true;
    case "1-20":
      return cardCount >= 1 && cardCount <= 20;
    case "21-50":
      return cardCount >= 21 && cardCount <= 50;
    case "51-100":
      return cardCount >= 51 && cardCount <= 100;
    case "100+":
      return cardCount > 100;
  }
}

export function detectLanguage(
  fieldDefinitions: FieldDefinition[],
): string | null {
  for (const field of fieldDefinitions) {
    const lang = getTtsConfig(field)?.lang;
    if (!lang) continue;
    const prefix = lang.split("-")[0]?.toLowerCase();
    if (prefix && prefix in LANG_LABELS) return prefix;
  }
  return null;
}

export function languageLabel(langCode: string): string {
  return LANG_LABELS[langCode] ?? langCode.toUpperCase();
}

export function collectLanguages(
  sets: { fieldDefinitions: FieldDefinition[] }[],
): string[] {
  const langs = new Set<string>();
  for (const set of sets) {
    const lang = detectLanguage(set.fieldDefinitions);
    if (lang) langs.add(lang);
  }
  return [...langs].sort();
}

export default function FilterBar({
  cardCountRange,
  onCardCountRangeChange,
  languageTag,
  onLanguageTagChange,
  availableLanguages,
}: {
  cardCountRange: CardCountRange;
  onCardCountRangeChange: (range: CardCountRange) => void;
  languageTag: string | null;
  onLanguageTagChange: (lang: string | null) => void;
  availableLanguages: string[];
}) {
  return (
    <div className="flex flex-wrap gap-4 mb-4">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted">Cards:</span>
        <div className="flex gap-1">
          {CARD_COUNT_RANGES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onCardCountRangeChange(value)}
              className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                cardCountRange === value
                  ? "bg-accent text-white border-accent"
                  : "border-edge hover:bg-surface-hover"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {availableLanguages.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">Language:</span>
          <div className="flex gap-1">
            <button
              onClick={() => onLanguageTagChange(null)}
              className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                languageTag === null
                  ? "bg-accent text-white border-accent"
                  : "border-edge hover:bg-surface-hover"
              }`}
            >
              All
            </button>
            {availableLanguages.map((lang) => (
              <button
                key={lang}
                onClick={() => onLanguageTagChange(lang)}
                className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                  languageTag === lang
                    ? "bg-accent text-white border-accent"
                    : "border-edge hover:bg-surface-hover"
                }`}
              >
                {languageLabel(lang)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
