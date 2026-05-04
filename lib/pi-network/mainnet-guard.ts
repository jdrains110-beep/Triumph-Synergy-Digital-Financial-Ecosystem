/**
 * Mainnet Guard — runtime enforcement for the
 * "Pi Network mainnet + Stellar Protocol 23" mandate.
 *
 * The ONLY testnet artifact preserved across the ecosystem is the
 * static testnet validation key served from
 * `app/validation-key-testnet.txt/route.ts` (used by Pi App Studio
 * for legacy domain ownership verification). Every other runtime
 * code path must call into this module to assert that no testnet
 * endpoint, passphrase, or RPC route ever reaches mainnet flows.
 *
 * Copyright (C) 2024-2026 Jeremiah Joel Drains. License: PiOS
 */

const TESTNET_HOST_PATTERNS = [
  /(?:^|\/\/)api\.testnet\.minepi\.com/i,
  /(?:^|\/\/)horizon-testnet\.stellar\.org/i,
  /(?:^|\/\/)rpc\.testnet\.minepi\.com/i,
  /(?:^|\/\/)horizon\.testnet\./i,
];

const TESTNET_PASSPHRASES = new Set([
  "Pi Testnet",
  "Test SDF Network ; September 2015",
]);

/** True iff the URL points at any known Stellar/Pi testnet endpoint. */
export function isTestnetEndpoint(url: string | undefined | null): boolean {
  if (!url) return false;
  return TESTNET_HOST_PATTERNS.some((re) => re.test(url));
}

/** True iff the passphrase identifies a testnet network. */
export function isTestnetPassphrase(passphrase: string | undefined | null): boolean {
  return !!passphrase && TESTNET_PASSPHRASES.has(passphrase);
}

/**
 * Throws unless `url` and `passphrase` both designate Pi mainnet.
 * Use at the boundary of any runtime path that submits transactions,
 * verifies signatures, or persists ledger state.
 */
export function assertMainnetEndpoint(opts: {
  url?: string | null;
  passphrase?: string | null;
  context?: string;
}): void {
  const where = opts.context ? ` [${opts.context}]` : "";
  if (isTestnetEndpoint(opts.url)) {
    throw new Error(
      `[mainnet-guard]${where} Refusing to use testnet endpoint: ${opts.url}`,
    );
  }
  if (isTestnetPassphrase(opts.passphrase)) {
    throw new Error(
      `[mainnet-guard]${where} Refusing to use testnet passphrase: ${opts.passphrase}`,
    );
  }
}

/**
 * Reject any network identifier that is not Pi mainnet at runtime.
 * Keeps "testnet" type-union members compilable (no cascading type
 * surgery) but blocks them at the function boundary.
 */
export function assertMainnetNetwork(network: string, context?: string): void {
  if (typeof network !== "string") return;
  const n = network.toLowerCase();
  const isTestnet =
    n === "testnet" ||
    n.includes("testnet") ||
    n === "stellar_testnet" ||
    n === "pi-testnet" ||
    n === "stellar-testnet";
  if (isTestnet) {
    const where = context ? ` [${context}]` : "";
    throw new Error(
      `[mainnet-guard]${where} Mainnet-only mandate: refusing network=${network}`,
    );
  }
}

export const MAINNET_GUARD_PURPOSE =
  "Pi mainnet + Stellar Protocol 23 only — testnet validation key is the sole permitted testnet artifact";
