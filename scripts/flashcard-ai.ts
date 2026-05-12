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

async function confirmUnlessYes(message: string, yes?: boolean) {
  if (yes) return;
  const rl = createInterface({ input, output });
  const answer = await rl.question(`${message} Type "yes" to continue: `);
  rl.close();
  if (answer.trim().toLowerCase() !== "yes") throw new Error("Cancelled.");
}

const program = new Command();
program.name("flashcard-ai").description("CLI bridge for assistant-generated remedial flashcard sets");

program
  .command("login")
  .option("--site-url <url>", "Convex site URL", process.env.FLASHCARD_AI_SITE_URL ?? process.env.NEXT_PUBLIC_CONVEX_SITE_URL)
  .action(async (options) => {
    if (!options.siteUrl) throw new Error("Missing --site-url or FLASHCARD_AI_SITE_URL/NEXT_PUBLIC_CONVEX_SITE_URL.");
    const rl = createInterface({ input, output });
    const token = await rl.question("Paste CLI token: ");
    rl.close();
    saveConfig({ siteUrl: options.siteUrl, token: token.trim() });
    console.log(`Saved config to ${CONFIG_FILE}`);
  });

program.command("status").action(async () => {
  const result = await apiPost("/tooling/v1/token/status", {}, TokenStatusResponseSchema);
  printJson(result);
});

const sets = program.command("sets");
sets
  .command("list")
  .option("--include-srs-summary", "Include aggregate SRS summary")
  .option("--include-schema", "Include schema fingerprints and field definitions")
  .option("--out <file>", "Write JSON to file")
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

const srs = program.command("srs");
srs
  .command("weak-cards")
  .option("--scope <scope>", "Scope, currently srs-enabled", "srs-enabled")
  .option("--set <setId>", "Limit to one source set")
  .option("--methodology <name>", "balanced | recent-lapses | low-ease | learning-stuck", "balanced")
  .option("--days <days>", "Lookback days", parseInteger, 90)
  .option("--total-limit <n>", "Total weak card limit", parseInteger, 40)
  .option("--limit-per-set <n>", "Per-set weak card limit", parseInteger, 10)
  .option("--exclude-ai-generated-sets", "Exclude previous AI generated sets")
  .option("--out <file>", "Write JSON to file")
  .action(async (options) => {
    if (options.scope !== "srs-enabled" && !options.set) throw new Error("Only --scope srs-enabled is supported unless --set is provided.");
    const body = buildWeakCardsRequest(options);
    const result = await apiPost("/tooling/v1/srs/weak-cards", body, WeakCardsResponseSchema);
    writeOut(result, options.out);
  });

const generatedSet = program.command("generated-set");
generatedSet
  .command("validate")
  .requiredOption("--file <file>", "Generated set JSON file")
  .action(async (options) => {
    const payload = decode(GeneratedSetPayloadSchema, readJsonFile(options.file));
    const result = await apiPost("/tooling/v1/generated-sets/validate", payload, GeneratedSetValidationResponseSchema);
    printJson(result);
  });

generatedSet
  .command("create")
  .requiredOption("--file <file>", "Generated set JSON file")
  .option("--add-to-srs", "Enroll generated set in SRS")
  .option("--yes", "Skip confirmation")
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
