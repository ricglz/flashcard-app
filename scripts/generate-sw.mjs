import { buildSync } from "esbuild";
import { createHash } from "node:crypto";
import { readFileSync, existsSync, globSync, statSync } from "node:fs";
import { join, posix } from "node:path";

const ROOT = process.cwd();
const DIST_DIR = ".next";
const PUBLIC_DIR = "public";
const SW_SRC = "src/sw.ts";
const SW_DEST = join(PUBLIC_DIR, "sw.js");

function fileHash(filePath) {
  return createHash("md5").update(readFileSync(filePath)).digest("hex").slice(0, 16);
}

function collectPrecacheEntries() {
  const entries = [];

  // Static build assets
  const staticDir = join(ROOT, DIST_DIR, "static");
  if (existsSync(staticDir)) {
    const staticFiles = globSync("**/*.{js,css,html,ico,png,jpg,jpeg,gif,svg,webp,json,webmanifest,woff,woff2}", { cwd: staticDir });
    for (const file of staticFiles) {
      entries.push({
        url: `/_next/static/${file}`,
        revision: fileHash(join(staticDir, file)),
      });
    }
  }

  // Public directory assets
  const publicDir = join(ROOT, PUBLIC_DIR);
  const publicFiles = globSync("**/*", { cwd: publicDir });
  const ignore = new Set(["sw.js", "sw.js.map"]);
  for (const file of publicFiles) {
    if (ignore.has(file)) continue;
    const fullPath = join(publicDir, file);
    if (statSync(fullPath).isDirectory()) continue;
    entries.push({
      url: posix.join("/", file),
      revision: fileHash(fullPath),
    });
  }

  return entries;
}

const isDev = process.argv.includes("--dev");
const manifest = isDev ? [] : collectPrecacheEntries();

buildSync({
  entryPoints: [SW_SRC],
  outfile: SW_DEST,
  bundle: true,
  minify: !isDev,
  format: "esm",
  define: {
    "self.__SW_MANIFEST": JSON.stringify(manifest),
  },
});

console.log(`Service worker built → ${SW_DEST} (${manifest.length} precache entries)`);
