/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as cliTokens from "../cliTokens.js";
import type * as crons from "../crons.js";
import type * as domain_cardFields from "../domain/cardFields.js";
import type * as domain_fieldDefinitions from "../domain/fieldDefinitions.js";
import type * as domain_result from "../domain/result.js";
import type * as domain_srsSettings from "../domain/srsSettings.js";
import type * as domain_studySessionSetup from "../domain/studySessionSetup.js";
import type * as flashcardSets from "../flashcardSets.js";
import type * as flashcards from "../flashcards.js";
import type * as http from "../http.js";
import type * as lib_typed from "../lib/typed.js";
import type * as progress from "../progress.js";
import type * as sharing from "../sharing.js";
import type * as srs from "../srs.js";
import type * as srsEngine from "../srsEngine.js";
import type * as srsReviewQueue from "../srsReviewQueue.js";
import type * as studySessions from "../studySessions.js";
import type * as tooling from "../tooling.js";
import type * as userSets from "../userSets.js";
import type * as userSettings from "../userSettings.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  cliTokens: typeof cliTokens;
  crons: typeof crons;
  "domain/cardFields": typeof domain_cardFields;
  "domain/fieldDefinitions": typeof domain_fieldDefinitions;
  "domain/result": typeof domain_result;
  "domain/srsSettings": typeof domain_srsSettings;
  "domain/studySessionSetup": typeof domain_studySessionSetup;
  flashcardSets: typeof flashcardSets;
  flashcards: typeof flashcards;
  http: typeof http;
  "lib/typed": typeof lib_typed;
  progress: typeof progress;
  sharing: typeof sharing;
  srs: typeof srs;
  srsEngine: typeof srsEngine;
  srsReviewQueue: typeof srsReviewQueue;
  studySessions: typeof studySessions;
  tooling: typeof tooling;
  userSets: typeof userSets;
  userSettings: typeof userSettings;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
