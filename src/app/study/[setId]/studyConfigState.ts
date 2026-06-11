export type StudyConfigMode = "study" | "browse";

export type StudyFieldSelection = {
  frontFields: readonly string[];
  backFields: readonly string[];
  ttsOnlyFields: readonly string[];
};

export type StudyConfigOptions = StudyFieldSelection & {
  shuffle: boolean;
  cardLimit: number | null;
};

export function hasRequiredStudyFields({
  frontFields,
  backFields,
}: Pick<StudyFieldSelection, "frontFields" | "backFields">): boolean {
  return frontFields.length > 0 && backFields.length > 0;
}

export function canSubmitStudyConfig({
  mode,
  cardCount,
  isAuthenticated,
  frontFields,
  backFields,
}: Pick<StudyConfigOptions, "frontFields" | "backFields"> & {
  mode: StudyConfigMode;
  cardCount: number;
  isAuthenticated: boolean;
}): boolean {
  if (!hasRequiredStudyFields({ frontFields, backFields })) return false;
  if (cardCount === 0) return false;
  return mode !== "study" || isAuthenticated;
}

export function buildBrowseSearchParams({
  frontFields,
  backFields,
  ttsOnlyFields,
  shuffle,
  cardLimit,
}: StudyConfigOptions): URLSearchParams {
  return new URLSearchParams({
    frontFields: frontFields.join(","),
    backFields: backFields.join(","),
    shuffle: String(shuffle),
    ...(ttsOnlyFields.length > 0 && { ttsOnlyFields: ttsOnlyFields.join(",") }),
    ...(cardLimit !== null && { cardLimit: String(cardLimit) }),
  });
}

export function buildStartSessionArgs<SetId extends string>({
  setId,
  frontFields,
  backFields,
  ttsOnlyFields,
  shuffle,
  cardLimit,
}: StudyConfigOptions & { setId: SetId }) {
  return {
    setId,
    frontFields: [...frontFields],
    backFields: [...backFields],
    ttsOnlyFields: [...ttsOnlyFields],
    shuffle,
    ...(cardLimit !== null && { cardLimit }),
  };
}

export function buildStudyModeHref(currentHref: string, mode: StudyConfigMode): string {
  const url = new URL(currentHref);
  if (mode === "browse") {
    url.searchParams.set("mode", "browse");
  } else {
    url.searchParams.delete("mode");
  }
  return url.pathname + url.search;
}
