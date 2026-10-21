#!/usr/bin/env node
// Fails when any PI_PROTOCOL_VERSION fallback disagrees with lib/pi-network/constants.ts.
const fs = require("node:fs");
const path = require("node:path");

const REPO = path.resolve(__dirname, "..");
const SKIP = new Set(["node_modules", ".git", ".next", "dist", "build"]);
const FALLBACK_RE = /PI_PROTOCOL_VERSION\s*\?\?\s*(\d+)/g;

function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return SKIP.has(e.name) ? [] : sourceFiles(full);
    return /\.(ts|tsx|js|mjs)$/.test(e.name) ? [full] : [];
  });
}

const found = [];
for (const file of sourceFiles(REPO)) {
  const text = fs.readFileSync(file, "utf8");
  for (const m of text.matchAll(FALLBACK_RE)) {
    found.push({ file: path.relative(REPO, file), version: Number(m[1]) });
  }
}

const canonical = found.find((f) => f.file === path.join("lib", "pi-network", "constants.ts"));
if (!canonical) {
  console.error("[check-protocol] no PI_PROTOCOL_VERSION fallback found in lib/pi-network/constants.ts");
  process.exit(1);
}

const stale = found.filter((f) => f.version !== canonical.version);
if (stale.length) {
  console.error(`[check-protocol] ${stale.length} fallback(s) differ from canonical ${canonical.version}:`);
  for (const s of stale) console.error(`  ${s.file}: ${s.version}`);
  process.exit(1);
}
console.log(`[check-protocol] ok: ${found.length} fallbacks all = ${canonical.version}`);
