#!/usr/bin/env node
/**
 * Protocol Auto-Update — polls Pi mainnet Horizon for the current protocol
 * version and patches every `PI_PROTOCOL_VERSION ?? <n>` fallback in the code
 * plus `infrastructure/history-archive/stellar-history.seed.json` when Pi advances.
 * `public/.well-known/stellar.toml` is deliberately left alone: it advertises the
 * protocol our own validator runs, which only changes when the node is upgraded.
 *
 * Invoked by `.github/workflows/protocol-version-watcher.yml` (cron + manual).
 * Exits 0 when no update is needed, exits 0 after writing files when an update
 * is applied (the workflow then opens a PR if files changed).
 *
 * Copyright (C) 2024-2026 Jeremiah Joel Drains. License: PiOS
 */
const fs = require("node:fs");
const path = require("node:path");

// Default dual-stack connect races time out against Pi's Horizon on some networks.
require("node:dns").setDefaultResultOrder("ipv4first");
require("node:net").setDefaultAutoSelectFamily(false);

const HORIZON = process.env.PI_HORIZON_URL || "https://api.mainnet.minepi.com";
const REPO = path.resolve(__dirname, "..");
const FALLBACK_RE = /(PI_PROTOCOL_VERSION\s*\?\?\s*)(\d+)/g;

async function fetchCurrentProtocol() {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await fetch(HORIZON, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(20000),
      });
      if (!r.ok) throw new Error(`Horizon root returned ${r.status}`);
      const j = await r.json();
      const v = Number(j.current_protocol_version ?? j.core_supported_protocol_version);
      if (!Number.isFinite(v) || v <= 0) throw new Error("Could not parse protocol version from Horizon root");
      return v;
    } catch (e) {
      lastError = e;
      await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
    }
  }
  throw lastError;
}

function sourceFiles(dir) {
  const skip = new Set(["node_modules", ".git", ".next", "dist", "build"]);
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return skip.has(e.name) ? [] : sourceFiles(full);
    return /\.(ts|tsx|js|mjs)$/.test(e.name) ? [full] : [];
  });
}

// Every fallback must agree, so the update touches all of them.
function patchAllFallbacks(live) {
  let changed = 0;
  for (const file of sourceFiles(REPO)) {
    const before = fs.readFileSync(file, "utf8");
    const after = before.replace(FALLBACK_RE, `$1${live}`);
    if (before !== after) {
      fs.writeFileSync(file, after);
      console.log(`[protocol-auto-update] patched ${path.relative(REPO, file)}`);
      changed++;
    }
  }
  return changed;
}

function patch(file, regex, replacement) {
  const p = path.join(REPO, file);
  const before = fs.readFileSync(p, "utf8");
  const after = before.replace(regex, replacement);
  if (before !== after) {
    fs.writeFileSync(p, after);
    console.log(`[protocol-auto-update] patched ${file}`);
    return true;
  }
  return false;
}

(async () => {
  const live = await fetchCurrentProtocol();
  console.log(`[protocol-auto-update] Pi mainnet current_protocol_version = ${live}`);

  const constantsPath = path.join(REPO, "lib/pi-network/constants.ts");
  const constants = fs.readFileSync(constantsPath, "utf8");
  const match = constants.match(/process\.env\.PI_PROTOCOL_VERSION\s*\?\?\s*(\d+)/);
  const current = match ? Number(match[1]) : 0;

  if (live <= current) {
    console.log(`[protocol-auto-update] no update needed (current=${current}, live=${live})`);
    process.exit(0);
  }

  console.log(`[protocol-auto-update] bumping ${current} -> ${live}`);
  patchAllFallbacks(live);
  patch(
    "infrastructure/history-archive/stellar-history.seed.json",
    /"protocolVersion"\s*:\s*\d+/,
    `"protocolVersion": ${live}`
  );

  // Emit GitHub Actions outputs
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `previous=${current}\nlive=${live}\nbumped=true\n`);
  }
})().catch(e => {
  console.error("[protocol-auto-update] FAILED:", e);
  process.exit(1);
});
