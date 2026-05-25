import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SEARCH_DIRS = ["src"];
const FILE_EXTENSIONS = new Set([".ts", ".tsx"]);
const EXEMPT_PATHS = new Set([
  "src/components/AccuracyChart.tsx",
  "src/components/AnnotationControls.tsx",
  "src/components/CardRatingButtons.tsx",
  "src/components/CardStatusBreakdown.tsx",
  "src/components/DailyGoalRingInner.tsx",
  "src/components/SetMasteryList.tsx",
  "src/lib/studyResults.ts",
  "src/app/srs/SrsReviewComplete.tsx",
]);

const RAW_STATUS_COLOR_PATTERN = /\b(?:bg|text|border)-(?:red|green|yellow|blue|amber|orange)-(?:50|100|200|300|400|500|600|700|800|900|950)(?:\/\d+)?\b/g;

function extension(path) {
  const match = path.match(/\.[^.]+$/);
  return match?.[0] ?? "";
}

function walk(dir) {
  const entries = readdirSync(dir);
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      files.push(...walk(path));
    } else if (FILE_EXTENSIONS.has(extension(path))) {
      files.push(path);
    }
  }
  return files;
}

const violations = [];
for (const searchDir of SEARCH_DIRS) {
  for (const file of walk(join(ROOT, searchDir))) {
    const rel = relative(ROOT, file);
    if (EXEMPT_PATHS.has(rel)) continue;
    const text = readFileSync(file, "utf8");
    const lines = text.split("\n");
    for (const [index, line] of lines.entries()) {
      const matches = line.match(RAW_STATUS_COLOR_PATTERN);
      if (matches) {
        violations.push(`${rel}:${index + 1} ${matches.join(", ")}`);
      }
    }
  }
}

if (violations.length > 0) {
  console.error("Raw generic status color classes found. Use semantic tokens or shared UI primitives.");
  for (const violation of violations) console.error(`  ${violation}`);
  process.exit(1);
}
