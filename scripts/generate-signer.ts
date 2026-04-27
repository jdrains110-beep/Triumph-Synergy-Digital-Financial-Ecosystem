#!/usr/bin/env npx tsx
/**
 * Generate a fresh Stellar keypair (Pi Testnet/Mainnet compatible).
 *
 * Prints PUBLIC and SECRET. Pipe to /dev/null + keychain in one shot:
 *
 *   eval "$(npx tsx scripts/generate-signer.ts --shell)"
 *   # exposes $SIGNER_PUBLIC and $SIGNER_SECRET in your current shell
 *
 * Or write directly into macOS Keychain (recommended):
 *
 *   npx tsx scripts/generate-signer.ts --keychain pi-signer-mac
 *   # -> stores SECRET in login keychain under service "pi-signer-mac"
 *   # -> prints PUBLIC to stdout for you to record
 *
 * Or just print both (less safe — secret hits your terminal scrollback):
 *
 *   npx tsx scripts/generate-signer.ts
 */

import { execSync } from "node:child_process";
import { Keypair } from "@stellar/stellar-sdk";

function parseArgs(argv: string[]) {
  const out: { shell?: boolean; keychain?: string; quiet?: boolean } = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--shell") out.shell = true;
    else if (argv[i] === "--quiet") out.quiet = true;
    else if (argv[i] === "--keychain") out.keychain = argv[++i];
  }
  return out;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const kp = Keypair.random();
  const pub = kp.publicKey();
  const sec = kp.secret();

  if (opts.keychain) {
    // macOS only — uses /usr/bin/security
    const service = opts.keychain;
    const account = process.env.USER || "user";
    try {
      // delete existing entry quietly so add doesn't fail
      try {
        execSync(
          `security delete-generic-password -a "${account}" -s "${service}" >/dev/null 2>&1`,
        );
      } catch {
        /* not present */
      }
      execSync(
        `security add-generic-password -a "${account}" -s "${service}" -w "${sec}" -U`,
        { stdio: "inherit" },
      );
      console.error(
        `\n✓ secret stored in macOS Keychain (service="${service}", account="${account}")`,
      );
      console.error(
        `  retrieve later: security find-generic-password -a "${account}" -s "${service}" -w`,
      );
      console.log(pub);
      return;
    } catch (e: any) {
      console.error("ERROR: keychain write failed:", e?.message ?? e);
      process.exit(1);
    }
  }

  if (opts.shell) {
    process.stdout.write(
      `export SIGNER_PUBLIC=${pub}\nexport SIGNER_SECRET=${sec}\n`,
    );
    return;
  }

  if (opts.quiet) {
    console.log(pub);
    return;
  }

  console.log("PUBLIC:", pub);
  console.log("SECRET:", sec);
  console.log("");
  console.log(
    "⚠  SECRET above is in your terminal scrollback. Clear it with `clear; printf '\\e[3J'` after recording.",
  );
}

main();
