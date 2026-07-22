/**
 * Pi Network — Single Source of Truth
 *
 * All runtime code MUST import from this module to obtain the current
 * Pi mainnet endpoints, network passphrase, and Stellar Consensus Protocol
 * version. Values may be overridden at deploy time via environment variables
 * (e.g. by the protocol-version-watcher CI job).
 *
 * Mainnet-only by mandate. Test fixtures and validation type unions may
 * still reference "testnet" for code-path coverage, but no production
 * runtime path should depend on testnet defaults.
 *
 * Copyright (C) 2024-2026 Jeremiah Joel Drains. License: PiOS
 */

export const PI_NETWORK_NAME = "Pi Network" as const;

/** Pi mainnet Stellar network passphrase. */
export const PI_MAINNET_PASSPHRASE = "Pi Network" as const;

/** Pi mainnet Horizon REST API. */
export const PI_MAINNET_HORIZON = "https://api.mainnet.minepi.com" as const;

/** Pi mainnet RPC entrypoint. */
export const PI_MAINNET_RPC = "https://api.mainnet.minepi.com" as const;

/**
 * Current Pi Network Stellar Consensus Protocol version — Pi mainnet runs SCP Protocol 24.
 *
 * Updated automatically by `.github/workflows/protocol-version-watcher.yml`
 * which polls Pi mainnet horizon `/` for `current_protocol_version` and
 * opens a PR bumping this constant when Pi advances.
 */
export const PI_PROTOCOL_VERSION = Number(
  process.env.PI_PROTOCOL_VERSION ?? 25,
);

/** Minimum protocol version this build is known to be safe with. */
export const PI_MIN_SUPPORTED_PROTOCOL = 23 as const;

/** Stellar-core release line that ships Protocol 24. */
export const STELLAR_CORE_VERSION = "v24.0.0" as const;

/** Server identifier advertised by our supernode / history archive. */
export const TRIUMPH_NODE_SERVER_ID =
  `stellar-core triumph-synergy-mainnet ${STELLAR_CORE_VERSION}` as const; // Protocol 24 — Pi Network mainnet

/** Resolve the active Horizon URL — mainnet by default, env override allowed. */
export function getActiveHorizonUrl(): string {
  return process.env.STELLAR_HORIZON_URL || PI_MAINNET_HORIZON;
}

/** Resolve the active network passphrase — mainnet by default. */
export function getActiveNetworkPassphrase(): string {
  return process.env.STELLAR_NETWORK_PASSPHRASE || PI_MAINNET_PASSPHRASE;
}

/** Mainnet enforcement guard — throws if PI_NETWORK_MODE is forced to testnet in production. */
export function assertMainnet(): void {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.PI_NETWORK_MODE &&
    process.env.PI_NETWORK_MODE !== "mainnet"
  ) {
    throw new Error(
      `[Pi Network] Mainnet-only mandate violated: PI_NETWORK_MODE=${process.env.PI_NETWORK_MODE} in production`,
    );
  }
}

export const PI_NETWORK_CONSTANTS = {
  network: PI_NETWORK_NAME,
  passphrase: PI_MAINNET_PASSPHRASE,
  horizon: PI_MAINNET_HORIZON,
  rpc: PI_MAINNET_RPC,
  protocolVersion: PI_PROTOCOL_VERSION,
  stellarCoreVersion: STELLAR_CORE_VERSION,
  serverId: TRIUMPH_NODE_SERVER_ID,
} as const;
