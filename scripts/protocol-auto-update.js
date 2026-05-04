#!/usr/bin/env node
/**
 * Protocol Auto-Update — polls Pi mainnet Horizon for the current protocol
 * version and patches `lib/pi-network/constants.ts`, `public/.well-known/stellar.toml`
 * and `infrastructure/history-archive/stellar-history.seed.json` when Pi advances.
 *
 * Invoked by `.github/workflows/protocol-version-watcher.yml` (cron + manual).
 * Exits 0 when no update is needed, exits 0 after writing files when an update
 * is applied (the workflow then opens a PR if files changed).
 *
 * Copyright (C) 2024-2026 Jeremiah Joel Drains. License: PiOS
 */
const fs = require("node:fs");
const path = require("node:path");

const HORIZON = process.env.PI_HORIZON_URL || "https://api.mainnet.minepi.com";
const REPO = path.resolve(__dirname, "..");

async function fetchCurrentProtocol() {
  const r = await fetch(HORIZON, { headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(`Horizon root returned ${r.status}`);
  const j = await r.json();
  const v = Number(j.current_protocol_version ?? j.core_supported_protocol_version);
  if (!Number.isFinite(v) || v <= 0) throw new Error("Could not parse protocol version from Horizon root");
  return v;
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
  patch("lib/pi-network/constants.ts", /(\?\?\s*)\d+(\s*,?\s*\);)/, `$1${live}$2`);
  patch("public/.well-known/stellar.toml", /PROTOCOL_VERSION="\d+"/, `PROTOCOL_VERSION="${live}"`);
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
