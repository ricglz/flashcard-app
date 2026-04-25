/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as crons from "../crons.js";
import type * as flashcardSets from "../flashcardSets.js";
import type * as flashcards from "../flashcards.js";
import type * as srs from "../srs.js";
import type * as srsEngine from "../srsEngine.js";
import type * as srsReviewQueue from "../srsReviewQueue.js";
import type * as studySessions from "../studySessions.js";
import type * as userSets from "../userSets.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  crons: typeof crons;
  flashcardSets: typeof flashcardSets;
  flashcards: typeof flashcards;
  srs: typeof srs;
  srsEngine: typeof srsEngine;
  srsReviewQueue: typeof srsReviewQueue;
  studySessions: typeof studySessions;
  userSets: typeof userSets;
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
