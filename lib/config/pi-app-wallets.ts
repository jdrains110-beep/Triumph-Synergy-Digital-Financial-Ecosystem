/**
 * lib/config/pi-app-wallets.ts
 *
 * Triumph Synergy — Canonical Pi App Wallet Registry
 *
 * Single source of truth for every address SAIB, the credit engine, the
 * TRISYN issuer, and the Pioneer airdrop service are permitted to use as
 * a settlement, issuance, or distribution endpoint on Pi Network and
 * Stellar.
 *
 * IMPORTANT ROLE SEPARATION
 * ─────────────────────────
 *   FOUNDER_WALLET           — sovereign identity of the founder
 *                              (Jeremiah Joel Drains). Used for legal
 *                              attestations, HQ on-chain verification,
 *                              and sovereign trust documents. NEVER used
 *                              as a runtime payment destination.
 *
 *   APP_WALLET_PI_TESTNET    — the Pi Developer Portal-issued app wallet
 *                              for the registered Pi App
 *                              `triumphsynergyab2099.pinet.com`. This is
 *                              what Pi Wallet recognises as a valid
 *                              outbound destination on Pi Testnet, so it
 *                              is the canonical TRISYN issuer and
 *                              Pioneer airdrop source on testnet.
 *
 *   APP_WALLET_PI_MAINNET    — populated after mainnet promotion in the
 *                              Pi Developer Portal. Until then, runtime
 *                              code MUST refuse to settle TRISYN on
 *                              mainnet to prevent mis-routed payments.
 *
 *   STELLAR_TESTNET_ANCHOR   — audit-anchor keypair (controlled, funded
 *                              via friendbot tx
 *                              097fa75daa43f58ac479067a5d2c375aef3bdd482c598de98ac9082ab58773b3).
 *                              Used for cross-chain audit attestations.
 *
 * SAIB enforces `AUTHORIZED_PAYMENT_DESTINATIONS` on every outbound
 * payment task. Any address not in this set is rejected with a
 * `sovereign-override` alert.
 */

// ── Wallet addresses ─────────────────────────────────────────────────────────

/**
 * Sovereign founder wallet — legal/identity only. NOT a runtime payment
 * destination. Pi Wallet will refuse outbound payments to this address
 * because it has never been registered or activated on Pi Mainnet.
 */
export const FOUNDER_WALLET =
  "GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V";

/**
 * Pi Testnet App Wallet — issued by the Pi Developer Portal for the
 * Triumph Synergy Pi App (`triumphsynergyab2099.pinet.com`). This is the
 * ONLY currently-active runtime payment destination on Pi Testnet.
 *
 * Recognised by Pi Wallet for inbound payments. Used as:
 *   • TRISYN issuer (testnet)
 *   • Pioneer airdrop source (testnet)
 *   • A2U / U2A settlement endpoint (testnet)
 */
export const APP_WALLET_PI_TESTNET =
  "GC4ZAPK6QOEX2JJQBTQW2GVCYW3AI7NRYFNZUSE343S5OIK6G4FBM7XP";

/**
 * Pi Mainnet App Wallet — populated after mainnet promotion in the Pi
 * Developer Portal. Empty string means "not yet activated"; SAIB and the
 * credit engine MUST refuse mainnet settlement until this is set.
 */
export const APP_WALLET_PI_MAINNET =
  process.env.PI_APP_WALLET_MAINNET?.trim() || "";

/**
 * Stellar Testnet audit anchor — funded via friendbot on May 24, 2026.
 * Funding tx: 097fa75daa43f58ac479067a5d2c375aef3bdd482c598de98ac9082ab58773b3
 */
export const STELLAR_TESTNET_ANCHOR = FOUNDER_WALLET;

// ── Role-keyed exports (preferred call sites) ────────────────────────────────

/** TRISYN token issuer on Pi Testnet. */
export const TRISYN_ISSUER_TESTNET = APP_WALLET_PI_TESTNET;

/** TRISYN token issuer on Pi Mainnet (empty until mainnet promotion). */
export const TRISYN_ISSUER_MAINNET = APP_WALLET_PI_MAINNET;

/** Pioneer airdrop source — every new Pioneer's airdrop is paid from here. */
export const PIONEER_AIRDROP_SOURCE_TESTNET = APP_WALLET_PI_TESTNET;
export const PIONEER_AIRDROP_SOURCE_MAINNET = APP_WALLET_PI_MAINNET;

// ── SAIB enforcement set ─────────────────────────────────────────────────────

/**
 * The complete set of addresses SAIB is permitted to use as a runtime
 * payment destination. Any payment task whose destination is not in this
 * set is rejected.
 *
 * The founder wallet is INTENTIONALLY EXCLUDED — it's an identity, not
 * a payment endpoint.
 */
export const AUTHORIZED_PAYMENT_DESTINATIONS: ReadonlySet<string> = new Set(
  [APP_WALLET_PI_TESTNET, APP_WALLET_PI_MAINNET].filter(Boolean),
);

/** SAIB guard — call before queuing any outbound Pi payment. */
export function enforceAuthorizedDestination(address: string): void {
  if (!AUTHORIZED_PAYMENT_DESTINATIONS.has(address)) {
    throw new Error(
      `[SAIB] Refusing payment to unauthorised destination ${address}. ` +
        `Only Pi App Wallets in pi-app-wallets.ts may receive runtime payments. ` +
        `Founder wallet (${FOUNDER_WALLET}) is identity-only and cannot receive payments.`,
    );
  }
}

/** SAIB advisory — has Pi Mainnet been promoted yet? */
export function isPiMainnetActivated(): boolean {
  return APP_WALLET_PI_MAINNET.length > 0;
}

/**
 * Resolve the correct TRISYN issuer for the active network. Throws if
 * mainnet is requested before the App Wallet has been promoted.
 */
export function resolveTrisynIssuer(network: "testnet" | "mainnet"): string {
  if (network === "testnet") return TRISYN_ISSUER_TESTNET;
  if (!APP_WALLET_PI_MAINNET) {
    throw new Error(
      "[SAIB] TRISYN mainnet issuer not yet provisioned. Promote the Pi " +
        "App to mainnet in the Pi Developer Portal, then set " +
        "PI_APP_WALLET_MAINNET in the environment.",
    );
  }
  return APP_WALLET_PI_MAINNET;
}

/**
 * Resolve the Pioneer airdrop source for the active network. Mirrors
 * the issuer logic — airdrops are paid from the same App Wallet so SAIB
 * can debit a single balance.
 */
export function resolvePioneerAirdropSource(
  network: "testnet" | "mainnet",
): string {
  return resolveTrisynIssuer(network);
}
