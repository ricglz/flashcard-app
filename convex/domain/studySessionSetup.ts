import { Effect, Either } from "effect";
import type { FieldDefinition } from "../../src/lib/types";
import { fail, type DomainFailure, type DomainResult } from "./result";

export type InvalidCardLimitFailure = DomainFailure<
  "InvalidCardLimit",
  { cardLimit: number }
>;

export type EmptyStudyFieldSelectionFailure = DomainFailure<
  "EmptyStudyFieldSelection",
  { selection: "frontFields" | "backFields" }
>;

export type InvalidStudyFieldFailure = DomainFailure<
  "InvalidStudyField",
  {
    selection: "frontFields" | "backFields" | "ttsOnlyFields";
    fieldName: string;
    validFieldNames: readonly string[];
  }
>;

export type OverlappingTtsOnlyFieldFailure = DomainFailure<
  "OverlappingTtsOnlyField",
  { fieldName: string }
>;

export type NonTtsOnlyFieldFailure = DomainFailure<
  "NonTtsOnlyField",
  { fieldName: string }
>;

export type NoStudyableCardsFailure = DomainFailure<"NoStudyableCards">;

export type StudySessionSetupFailure =
  | InvalidCardLimitFailure
  | EmptyStudyFieldSelectionFailure
  | InvalidStudyFieldFailure
  | OverlappingTtsOnlyFieldFailure
  | NonTtsOnlyFieldFailure
  | NoStudyableCardsFailure;

export type StudySessionSetupInput = {
  fieldDefinitions: readonly FieldDefinition[];
  frontFields: readonly string[];
  backFields: readonly string[];
  ttsOnlyFields?: readonly string[];
  cardLimit?: number;
  availableCardCount?: number;
};

export type ValidatedStudySessionSetup = {
  frontFields: string[];
  backFields: string[];
  ttsOnlyFields: string[];
  cardLimit?: number;
};

function validateCardLimit(
  cardLimit: number | undefined
): Effect.Effect<number | undefined, InvalidCardLimitFailure> {
  if (
    cardLimit !== undefined &&
    (!Number.isInteger(cardLimit) || cardLimit < 1 || cardLimit > 1000)
  ) {
    return Effect.fail({
      _tag: "InvalidCardLimit",
      message: "cardLimit must be an integer between 1 and 1000",
      cardLimit,
    });
  }

  return Effect.succeed(cardLimit);
}

function validateRequiredSelection(
  selection: "frontFields" | "backFields",
  fieldNames: readonly string[]
): Effect.Effect<string[], EmptyStudyFieldSelectionFailure> {
  if (fieldNames.length === 0) {
    return Effect.fail({
      _tag: "EmptyStudyFieldSelection",
      message: `${selection} must not be empty`,
      selection,
    });
  }

  return Effect.succeed([...fieldNames]);
}

function validateKnownFields(
  selection: "frontFields" | "backFields" | "ttsOnlyFields",
  fieldNames: readonly string[],
  validFieldNames: readonly string[]
): Effect.Effect<string[], InvalidStudyFieldFailure> {
  const validNames = new Set(validFieldNames);

  for (const fieldName of fieldNames) {
    if (!validNames.has(fieldName)) {
      const label =
        selection === "frontFields"
          ? "front"
          : selection === "backFields"
            ? "back"
            : "TTS-only";

      return Effect.fail({
        _tag: "InvalidStudyField",
        message: `Invalid ${label} field: ${fieldName}`,
        selection,
        fieldName,
        validFieldNames,
      });
    }
  }

  return Effect.succeed([...fieldNames]);
}

function validateTtsOnlyFields(
  ttsOnlyFields: readonly string[],
  frontFields: readonly string[],
  backFields: readonly string[],
  fieldDefinitions: readonly FieldDefinition[],
  validFieldNames: readonly string[]
): Effect.Effect<string[], InvalidStudyFieldFailure | OverlappingTtsOnlyFieldFailure | NonTtsOnlyFieldFailure> {
  return Effect.gen(function* () {
    const knownFields = yield* validateKnownFields(
      "ttsOnlyFields",
      ttsOnlyFields,
      validFieldNames
    );
    const frontSet = new Set(frontFields);
    const backSet = new Set(backFields);
    const fieldDefsMap = new Map(fieldDefinitions.map((fd) => [fd.name, fd]));

    for (const fieldName of knownFields) {
      if (frontSet.has(fieldName) || backSet.has(fieldName)) {
        return yield* Effect.fail({
          _tag: "OverlappingTtsOnlyField" as const,
          message: `Field "${fieldName}" cannot be in both ttsOnlyFields and front/back`,
          fieldName,
        });
      }

      const fieldDefinition = fieldDefsMap.get(fieldName)!;
      if (!fieldDefinition.metadata?.tts) {
        return yield* Effect.fail({
          _tag: "NonTtsOnlyField" as const,
          message: `Field "${fieldName}" has no TTS config and cannot be TTS-only`,
          fieldName,
        });
      }
    }

    return knownFields;
  });
}


export function validateStudySessionSetupEffect(
  input: StudySessionSetupInput
): Effect.Effect<ValidatedStudySessionSetup, StudySessionSetupFailure> {
  const validFieldNames = input.fieldDefinitions.map((fd) => fd.name);
  const resolvedTtsOnlyFields = input.ttsOnlyFields ?? [];

  return Effect.gen(function* () {
    const cardLimit = yield* validateCardLimit(input.cardLimit);
    if (input.availableCardCount !== undefined && input.availableCardCount <= 0) {
      return yield* Effect.fail({
        _tag: "NoStudyableCards" as const,
        message: "No cards in this set",
      });
    }
    const frontFields = yield* validateRequiredSelection(
      "frontFields",
      input.frontFields
    );
    const backFields = yield* validateRequiredSelection(
      "backFields",
      input.backFields
    );

    yield* validateKnownFields("frontFields", frontFields, validFieldNames);
    yield* validateKnownFields("backFields", backFields, validFieldNames);

    const ttsOnlyFields = yield* validateTtsOnlyFields(
      resolvedTtsOnlyFields,
      frontFields,
      backFields,
      input.fieldDefinitions,
      validFieldNames
    );

    return {
      frontFields,
      backFields,
      ttsOnlyFields,
      ...(cardLimit !== undefined ? { cardLimit } : {}),
    };
  });
}

export function validateStudySessionSetup(
  input: StudySessionSetupInput
): DomainResult<ValidatedStudySessionSetup, StudySessionSetupFailure> {
  const either = Effect.runSync(Effect.either(validateStudySessionSetupEffect(input)));

  if (Either.isLeft(either)) {
    return fail(either.left);
  }

  return { ok: true, value: either.right };
}
