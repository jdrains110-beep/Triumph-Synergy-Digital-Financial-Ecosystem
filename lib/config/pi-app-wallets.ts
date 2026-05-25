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
 *   • TRISYN issuer (testnet) — the on-chain token issuer account
 *   • Pioneer airdrop source (testnet)
 *   • A2U / U2A settlement endpoint (testnet)
 */
export const APP_WALLET_PI_TESTNET =
  "GC4ZAPK6QOEX2JJQBTQW2GVCYW3AI7NRYFNZUSE343S5OIK6G4FBM7XP";

/**
 * TRISYN Distributor wallet (Pi Testnet) — the second Pi Wallet required
 * by the Pi Tokens spec. The distributor holds the minted supply and
 * settles outbound payments to Pioneers who have established a trustline.
 *
 * Default value is the operator-confirmed distributor pubkey; an env
 * override (PI_TRISYN_DISTRIBUTOR_TESTNET) is still honored so a different
 * environment (staging, fork, replay) can swap it without a code change.
 * The issuer (App Wallet) MUST NOT hold supply after mainnet promotion —
 * master weight gets set to 0 to lock supply at the configured maximum.
 */
export const TRISYN_DISTRIBUTOR_TESTNET =
  process.env.PI_TRISYN_DISTRIBUTOR_TESTNET?.trim() ||
  "GDINCI6L7M3J3YTUEMSX3SP2OD7VBJEVX6DTC3BHLD4SD4CMVQ2DVTMF";

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

// ── TRISYN on-chain asset metadata (Pi Tokens spec) ─────────────────────────

/**
 * On-chain asset code. Up to 12 alphanumeric characters, case-sensitive.
 * `TRISYN` is a credit_alphanum12 asset on Pi Blockchain.
 */
export const TRISYN_ASSET_CODE = "TRISYN";

/** Fixed supply minted by the issuer to the distributor at deployment. */
export const TRISYN_MAX_SUPPLY = "100000000000"; // 100 billion (string for SDK)

/** Pi Testnet Horizon endpoint per https://github.com/pi-apps/pi-platform-docs/blob/master/tokens.md */
export const PI_TESTNET_HORIZON = "https://api.testnet.minepi.com";
export const PI_TESTNET_PASSPHRASE = "Pi Testnet";

/** Pi Mainnet Horizon endpoint. */
export const PI_MAINNET_HORIZON = "https://api.mainnet.minepi.com";
export const PI_MAINNET_PASSPHRASE = "Pi Network";

/**
 * Home domain set on the issuer account so Pi Wallet can discover
 * `https://<HOME_DOMAIN>/.well-known/pi.toml` and list TRISYN.
 */
export const TRISYN_HOME_DOMAIN = "triumphsynergyab2099.pinet.com";

// ── SAIB enforcement set ─────────────────────────────────────────────────────

/**
 * The complete set of addresses SAIB is permitted to use as a runtime
 * payment destination. Any payment task whose destination is not in this
 * set is rejected.
 *
 * The founder wallet is INTENTIONALLY EXCLUDED — it's an identity, not
 * a payment endpoint. The TRISYN distributor IS included so Pioneers can
 * pay Pi to it in exchange for TRISYN (U2A buy flow).
 */
export const AUTHORIZED_PAYMENT_DESTINATIONS: ReadonlySet<string> = new Set(
  [
    APP_WALLET_PI_TESTNET,
    APP_WALLET_PI_MAINNET,
    TRISYN_DISTRIBUTOR_TESTNET,
  ].filter(Boolean),
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
