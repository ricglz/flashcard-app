#!/usr/bin/env node
import { Command } from "commander";
import * as Schema from "effect/Schema";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import {
  ApiErrorResponseSchema,
  GeneratedSetCreateResponseSchema,
  GeneratedSetPayloadSchema,
  GeneratedSetValidationResponseSchema,
  SetsListResponseSchema,
  TokenStatusResponseSchema,
  WeakCardsRequestSchema,
  WeakCardsResponseSchema,
  type GeneratedSetPayload,
} from "../src/lib/aiToolingSchemas";

const CONFIG_DIR = join(homedir(), ".config", "flashcard-ai");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");
const DEFAULT_SITE_URL = process.env.FLASHCARD_AI_SITE_URL ?? process.env.NEXT_PUBLIC_CONVEX_SITE_URL;

const ConfigSchema = Schema.Struct({
  siteUrl: Schema.String,
  token: Schema.String,
});

type Config = Schema.Schema.Type<typeof ConfigSchema>;

type Json = Record<string, unknown>;

function decode<S extends Schema.Schema.AnyNoContext>(schema: S, value: unknown): Schema.Schema.Type<S> {
  return Schema.decodeUnknownSync(schema)(value);
}

function readConfig(): Config {
  try {
    return decode(ConfigSchema, JSON.parse(readFileSync(CONFIG_FILE, "utf8")));
  } catch {
    const siteUrl = process.env.FLASHCARD_AI_SITE_URL ?? process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
    if (!siteUrl) {
      throw new Error(
        `Not logged in. Run flashcard-ai login or set FLASHCARD_AI_SITE_URL/NEXT_PUBLIC_CONVEX_SITE_URL.`
      );
    }
    throw new Error("Not logged in. Run flashcard-ai login first.");
  }
}

function saveConfig(config: Config) {
  mkdirSync(dirname(CONFIG_FILE), { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), { mode: 0o600 });
}

function printJson(value: unknown) {
  console.log(JSON.stringify(value, null, 2));
}

async function apiPost<S extends Schema.Schema.AnyNoContext>(path: string, body: unknown, responseSchema: S): Promise<Schema.Schema.Type<S>> {
  const config = readConfig();
  const res = await fetch(`${config.siteUrl.replace(/\/$/, "")}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.token}`,
    },
    body: JSON.stringify(body ?? {}),
  });
  const json = await res.json() as unknown;
  if (!res.ok) {
    try {
      const error = decode(ApiErrorResponseSchema, json);
      throw new Error(error.error.message);
    } catch (err) {
      if (err instanceof Error && err.message !== "" && !err.message.includes("Expected")) throw err;
      throw new Error(`Request failed with status ${res.status}`);
    }
  }
  return decode(responseSchema, json);
}

function readJsonFile(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeOut(value: unknown, out?: string) {
  if (out) writeFileSync(out, JSON.stringify(value, null, 2) + "\n");
  else printJson(value);
}

function writeTextOut(value: string, out?: string) {
  if (out) writeFileSync(out, value.endsWith("\n") ? value : `${value}\n`);
  else console.log(value);
}

function parseInteger(value: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) throw new Error(`Expected integer, got ${value}`);
  return parsed;
}

function buildWeakCardsRequest(options: {
  scope?: string;
  set?: string;
  days?: number;
  totalLimit?: number;
  limitPerSet?: number;
  methodology?: string;
  excludeAiGeneratedSets?: boolean;
}) {
  const scope = options.set
    ? { kind: "set" as const, setId: options.set }
    : { kind: "srs_enabled_sets" as const };
  return decode(WeakCardsRequestSchema, {
    scope,
    methodology: options.methodology?.replace(/-/g, "_") ?? "balanced",
    filters: {
      ...(options.days !== undefined ? { days: options.days } : {}),
      excludeAiGeneratedSets: options.excludeAiGeneratedSets ?? false,
    },
    limits: {
      ...(options.totalLimit !== undefined ? { totalLimit: options.totalLimit } : {}),
      ...(options.limitPerSet !== undefined ? { limitPerSet: options.limitPerSet } : {}),
    },
    include: { recentRatings: true },
  });
}

type WeakCardsResponse = Schema.Schema.Type<typeof WeakCardsResponseSchema>;

function collectSourceSetIds(context: WeakCardsResponse) {
  return [
    ...new Set(
      context.schemaGroups.flatMap((group) => group.sets.map((set) => set.setId))
    ),
  ];
}

function compactWeakCardsContext(context: WeakCardsResponse) {
  return {
    scope: context.scope,
    methodology: context.methodology,
    generatedAt: context.generatedAt,
    schemaGroups: context.schemaGroups.map((group) => ({
      schemaFingerprint: group.schemaFingerprint,
      fieldDefinitions: group.fieldDefinitions,
      sets: group.sets.map((set) => ({
        setId: set.setId,
        name: set.name,
        weakCards: set.weakCards.map((card) => ({
          cardId: card.cardId,
          fields: card.fields,
          weakScore: card.weakScore,
          weakReasons: card.weakReasons,
          metrics: card.metrics,
          ...(card.recentRatings !== undefined ? { recentRatings: card.recentRatings } : {}),
        })),
      })),
    })),
  };
}

function renderRemedialPrompt(options: {
  context: WeakCardsResponse;
  targetCardCount: number;
  name: string;
  addToSrs: boolean;
}) {
  const { context, targetCardCount, name, addToSrs } = options;
  const sourceSetIds = collectSourceSetIds(context);
  const firstGroup = context.schemaGroups[0];
  const fieldDefinitions = firstGroup?.fieldDefinitions ?? [];
  const fieldsTemplate = Object.fromEntries(fieldDefinitions.map((field) => [field.name, ""]));
  const sourceScope = context.scope.kind === "set" ? "single_set" : "srs_enabled_sets";

  return `# Generate Remedial Flashcards from SRS Weak Cards

You are helping improve my flashcards based on SRS review history. Create a new remedial flashcard set from the weak-card context below.

## Goal

- Create ${targetCardCount} new remedial cards.
- Target the cards with repeated wrong/hard ratings, low ease factors, learning status, or recently-due-again patterns.
- Create new practice cards, not exact duplicates of the source cards.
- If multiple schema groups are present, produce one generated set for one schema group only unless I explicitly ask for multiple sets.

## Output Requirements

Return only valid JSON. Do not wrap it in Markdown fences. The JSON must match this shape:

${JSON.stringify({
  name,
  description: "Remedial cards generated from SRS weak-card history.",
  sourceSetIds,
  sourceScope,
  weakContextMethodology: context.methodology,
  fieldDefinitions,
  cards: [
    {
      fields: fieldsTemplate,
      sourceCardIds: ["source-card-id"],
      rationale: "Briefly explain which weak pattern this card targets.",
    },
  ],
  addToSrs,
}, null, 2)}

## Generation Rules

- Preserve the selected schema group's \`fieldDefinitions\` exactly.
- Use valid \`sourceSetIds\` from the context.
- Every generated card should include one or more \`sourceCardIds\` from the weak-card context.
- Do not copy source cards exactly; reuse weak words, phrases, or concepts in new contexts.
- Prefer short, natural, beginner-friendly cards.
- If the fields are Chinese-oriented, include accurate Chinese, pinyin with tones, and concise English meaning.
- Use the weak scores, reasons, metrics, and recent ratings to prioritize what to practice.
- Keep output parseable as strict JSON.

## Weak SRS Context

${JSON.stringify(compactWeakCardsContext(context), null, 2)}
`;
}

async function confirmUnlessYes(message: string, yes?: boolean) {
  if (yes) return;
  const rl = createInterface({ input, output });
  const answer = await rl.question(`${message} Type "yes" to continue: `);
  rl.close();
  if (answer.trim().toLowerCase() !== "yes") throw new Error("Cancelled.");
}

const program = new Command();
program
  .name("flashcard-ai")
  .description("CLI bridge for assistant-generated remedial flashcard sets")
  .addHelpText("after", `

SRS-to-new-cards workflow:
  flashcard-ai login --site-url <convex-site-url>
  flashcard-ai sets list --include-srs-summary --include-schema
  flashcard-ai srs remedial-prompt --scope srs-enabled --out remedial-prompt.md
  # Ask an assistant to create generated-set.json from remedial-prompt.md.
  flashcard-ai generated-set validate --file generated-set.json
  flashcard-ai generated-set create --file generated-set.json --add-to-srs

Run "flashcard-ai workflow" to print this workflow with more detail.`);

program
  .command("login")
  .description("Save a one-time CLI token from Settings for later commands")
  .option("--site-url <url>", "Convex site URL", DEFAULT_SITE_URL)
  .option("--token <token>", "CLI token from the Settings page; useful for automation")
  .addHelpText("after", `

Examples:
  flashcard-ai login --site-url https://<deployment>.convex.site
  flashcard-ai login --site-url https://<deployment>.convex.site --token fcai_<publicId>_<secret>

Tip: interactive login avoids putting the token in shell history.`)
  .action(async (options) => {
    if (!options.siteUrl) throw new Error("Missing --site-url or FLASHCARD_AI_SITE_URL/NEXT_PUBLIC_CONVEX_SITE_URL.");
    const token = options.token ?? await (async () => {
      console.log("Paste the full CLI token copied from Settings > AI Assistant CLI Access.");
      console.log("Expected format: fcai_<publicId>_<secret>");
      console.log(`Non-interactive usage: flashcard-ai login --site-url ${options.siteUrl} --token <token>`);
      const rl = createInterface({ input, output });
      const answer = await rl.question("CLI token: ");
      rl.close();
      return answer;
    })();
    saveConfig({ siteUrl: options.siteUrl, token: token.trim() });
    console.log(`Saved config to ${CONFIG_FILE}`);
  });

program.command("status").description("Check whether the saved CLI token is valid").action(async () => {
  const result = await apiPost("/tooling/v1/token/status", {}, TokenStatusResponseSchema);
  printJson(result);
});

program.command("workflow").description("Print the SRS-history-to-generated-cards workflow").action(() => {
  const siteUrl = DEFAULT_SITE_URL ?? "https://<deployment>.convex.site";
  console.log(`SRS-history-to-new-cards workflow

1. In Settings > AI Assistant CLI Access, create or rotate a CLI token.

2. Save the token locally:
   flashcard-ai login --site-url ${siteUrl}

   For non-interactive use:
   flashcard-ai login --site-url ${siteUrl} --token fcai_<publicId>_<secret>

3. Discover SRS-enabled sets and their schemas:
   flashcard-ai sets list --include-srs-summary --include-schema --out sets.json

4. Export weak-card context from your SRS history:
   flashcard-ai srs remedial-prompt --scope srs-enabled --methodology balanced --out remedial-prompt.md

   Useful methodology choices:
   - balanced: mix recent misses, hard cards, low ease, and learning cards
   - recent-lapses: emphasize recent wrong/hard ratings
   - low-ease: emphasize cards the scheduler considers difficult
   - learning-stuck: emphasize cards not graduating from learning

5. Ask an assistant to read remedial-prompt.md and write generated-set.json matching the app schema.
   The generated set should preserve the fieldDefinitions from the selected schema group and set
   sourceSetIds/sourceCardIds from the exported context.

6. Validate the generated set JSON:
   flashcard-ai generated-set validate --file generated-set.json

7. After reviewing it, create the set and enroll it in SRS:
   flashcard-ai generated-set create --file generated-set.json --add-to-srs
`);
});

const sets = program.command("sets").description("Discover flashcard sets available to the CLI token");
sets
  .command("list")
  .description("List sets, optionally including SRS summaries and field schemas")
  .option("--include-srs-summary", "Include aggregate SRS counts and weak candidate count")
  .option("--include-schema", "Include schema fingerprints and field definitions for generated-set payloads")
  .option("--out <file>", "Write JSON to file")
  .addHelpText("after", `

Examples:
  flashcard-ai sets list
  flashcard-ai sets list --include-srs-summary --include-schema --out sets.json`)
  .action(async (options) => {
    const body: Json = {
      include: {
        srsSummary: Boolean(options.includeSrsSummary),
        schemaFingerprint: Boolean(options.includeSchema),
        fieldDefinitions: Boolean(options.includeSchema),
      },
    };
    const result = await apiPost("/tooling/v1/sets/list", body, SetsListResponseSchema);
    writeOut(result, options.out);
  });

const srs = program.command("srs").description("Export SRS-history context for assistant-generated remedial cards");
srs
  .command("weak-cards")
  .description("Export weak-card context scored from your SRS review history")
  .option("--scope <scope>", "Scope to export; currently supports srs-enabled", "srs-enabled")
  .option("--set <setId>", "Limit to one source set")
  .option("--methodology <name>", "Scoring strategy: balanced | recent-lapses | low-ease | learning-stuck", "balanced")
  .option("--days <days>", "Lookback days", parseInteger, 90)
  .option("--total-limit <n>", "Total weak card limit", parseInteger, 40)
  .option("--limit-per-set <n>", "Per-set weak card limit", parseInteger, 10)
  .option("--exclude-ai-generated-sets", "Exclude previous AI generated sets")
  .option("--out <file>", "Write JSON to file")
  .addHelpText("after", `

Examples:
  flashcard-ai srs weak-cards --scope srs-enabled --out weak-cards.json
  flashcard-ai srs weak-cards --methodology recent-lapses --days 30 --total-limit 25 --out lapses.json
  flashcard-ai srs weak-cards --set <setId> --methodology low-ease --out one-set.json

Use this output as the source context for creating new remedial cards.`)
  .action(async (options) => {
    if (options.scope !== "srs-enabled" && !options.set) throw new Error("Only --scope srs-enabled is supported unless --set is provided.");
    const body = buildWeakCardsRequest(options);
    const result = await apiPost("/tooling/v1/srs/weak-cards", body, WeakCardsResponseSchema);
    writeOut(result, options.out);
  });

srs
  .command("remedial-prompt")
  .description("Write an assistant-ready Markdown prompt from your weak SRS history")
  .option("--scope <scope>", "Scope to export; currently supports srs-enabled", "srs-enabled")
  .option("--set <setId>", "Limit to one source set")
  .option("--methodology <name>", "Scoring strategy: balanced | recent-lapses | low-ease | learning-stuck", "balanced")
  .option("--days <days>", "Lookback days", parseInteger, 90)
  .option("--total-limit <n>", "Total weak card limit", parseInteger, 40)
  .option("--limit-per-set <n>", "Per-set weak card limit", parseInteger, 10)
  .option("--exclude-ai-generated-sets", "Exclude previous AI generated sets")
  .option("--target-card-count <n>", "Requested number of new remedial cards", parseInteger, 20)
  .option("--name <name>", "Suggested generated set name", "AI Remedial Chinese Weak Cards")
  .option("--add-to-srs", "Ask the assistant to set addToSrs to true")
  .option("--out <file>", "Write Markdown prompt to file")
  .addHelpText("after", `

Examples:
  flashcard-ai srs remedial-prompt --out remedial-prompt.md
  flashcard-ai srs remedial-prompt --methodology recent-lapses --days 30 --target-card-count 15 --out prompt.md
  flashcard-ai srs remedial-prompt --set <setId> --methodology low-ease --out one-set-prompt.md

This command does not call an LLM and does not create cards. It writes a safe prompt
that excludes CLI tokens and can be given to an assistant to produce generated-set.json.`)
  .action(async (options) => {
    if (options.scope !== "srs-enabled" && !options.set) throw new Error("Only --scope srs-enabled is supported unless --set is provided.");
    const body = buildWeakCardsRequest(options);
    const context = await apiPost("/tooling/v1/srs/weak-cards", body, WeakCardsResponseSchema);
    const prompt = renderRemedialPrompt({
      context,
      targetCardCount: options.targetCardCount,
      name: options.name,
      addToSrs: Boolean(options.addToSrs),
    });
    writeTextOut(prompt, options.out);
  });

const generatedSet = program.command("generated-set").description("Validate or create assistant-generated flashcard sets");
generatedSet
  .command("validate")
  .description("Validate generated set JSON before writing it to the app")
  .requiredOption("--file <file>", "Generated set JSON file")
  .addHelpText("after", `

Example:
  flashcard-ai generated-set validate --file generated-set.json`)
  .action(async (options) => {
    const payload = decode(GeneratedSetPayloadSchema, readJsonFile(options.file));
    const result = await apiPost("/tooling/v1/generated-sets/validate", payload, GeneratedSetValidationResponseSchema);
    printJson(result);
  });

generatedSet
  .command("create")
  .description("Create a generated set in the app after review")
  .requiredOption("--file <file>", "Generated set JSON file")
  .option("--add-to-srs", "Enroll generated set in SRS")
  .option("--yes", "Skip confirmation")
  .addHelpText("after", `

Examples:
  flashcard-ai generated-set create --file generated-set.json
  flashcard-ai generated-set create --file generated-set.json --add-to-srs`)
  .action(async (options) => {
    const payload: GeneratedSetPayload = decode(GeneratedSetPayloadSchema, readJsonFile(options.file));
    const finalPayload = { ...payload, addToSrs: Boolean(options.addToSrs || payload.addToSrs) };
    await confirmUnlessYes(`Create generated set "${finalPayload.name}" with ${finalPayload.cards.length} cards?`, options.yes);
    const result = await apiPost("/tooling/v1/generated-sets/create", finalPayload, GeneratedSetCreateResponseSchema);
    printJson(result);
  });

program.parseAsync().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
