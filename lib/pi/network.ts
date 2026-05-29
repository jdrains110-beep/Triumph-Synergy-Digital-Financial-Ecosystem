/**
 * Pi network resolver — single source of truth for the dual-network switch.
 *
 * Selector precedence (highest first):
 *   1. X-Pi-Network header on the incoming request
 *   2. ?network= query param
 *   3. Pi Platform payment metadata `sandbox: true` (when provided)
 *   4. PI_DEFAULT_NETWORK env var
 *   5. "mainnet"
 *
 * Returns the matched network plus the right Pi Platform API key, the right
 * Pi Platform API base URL, and the right bridge horizon URL.
 */

export type PiNetwork = "mainnet" | "testnet";

export interface PiNetworkResolved {
  network: PiNetwork;
  piApiKey: string;
  piApiBase: string;        // Pi Platform API base (api.minepi.com — same domain, key differs)
  bridgeBase: string;       // triumph-pi-bridge-connector base URL
  bridgeNetworkHeader: Record<string, string>; // ready-to-spread fetch headers
  horizon: string;          // direct horizon URL (debug / non-bridge calls)
  passphrase: string;
}

const DEFAULT_NETWORK = (
  process.env.PI_DEFAULT_NETWORK || "mainnet"
).trim().toLowerCase() as PiNetwork;

const PI_API_BASE = process.env.PI_API_URL || "https://api.minepi.com";

const PI_API_KEY_MAINNET = process.env.PI_API_KEY || "";
const PI_API_KEY_TESTNET =
  process.env.PI_API_KEY_TESTNET || process.env.PI_API_KEY_SANDBOX || PI_API_KEY_MAINNET;

const BRIDGE_BASE = (
  process.env.PI_BRIDGE_URL || "http://triumph-pi-bridge-connector:8092"
).replace(/\/+$/, "");

const HORIZON_MAINNET =
  process.env.PI_MAINNET_HORIZON || "https://api.mainnet.minepi.com";
const HORIZON_TESTNET =
  process.env.PI_TESTNET_HORIZON || "https://api.testnet.minepi.com";

const PASSPHRASE_MAINNET = process.env.PI_MAINNET_PASSPHRASE || "Pi Network";
const PASSPHRASE_TESTNET = process.env.PI_TESTNET_PASSPHRASE || "Pi Testnet";

function normalize(value: string | null | undefined): PiNetwork | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (["mainnet", "pubnet", "pi", "pi-network", "prod", "production"].includes(v))
    return "mainnet";
  if (["testnet", "test", "pi-testnet", "sandbox", "dev"].includes(v))
    return "testnet";
  return null;
}

export interface ResolverInput {
  headers?: Headers | Record<string, string | undefined> | null;
  searchParams?: URLSearchParams | null;
  paymentSandbox?: boolean;
  override?: PiNetwork;
}

function readHeader(
  headers: ResolverInput["headers"],
  name: string,
): string | null {
  if (!headers) return null;
  if (headers instanceof Headers) return headers.get(name);
  const rec = headers as Record<string, string | undefined>;
  return rec[name] ?? rec[name.toLowerCase()] ?? null;
}

export function resolvePiNetwork(input: ResolverInput = {}): PiNetworkResolved {
  let network: PiNetwork = DEFAULT_NETWORK === "testnet" ? "testnet" : "mainnet";

  if (input.override) {
    network = input.override;
  } else {
    const fromHeader = normalize(readHeader(input.headers, "x-pi-network"));
    const fromQuery = normalize(input.searchParams?.get("network") ?? null);
    if (fromHeader) network = fromHeader;
    else if (fromQuery) network = fromQuery;
    else if (input.paymentSandbox === true) network = "testnet";
    else if (input.paymentSandbox === false) network = "mainnet";
  }

  const isTestnet = network === "testnet";

  return {
    network,
    piApiKey: isTestnet ? PI_API_KEY_TESTNET : PI_API_KEY_MAINNET,
    piApiBase: PI_API_BASE,
    bridgeBase: BRIDGE_BASE,
    bridgeNetworkHeader: { "X-Pi-Network": network },
    horizon: isTestnet ? HORIZON_TESTNET : HORIZON_MAINNET,
    passphrase: isTestnet ? PASSPHRASE_TESTNET : PASSPHRASE_MAINNET,
  };
}

/**
 * Convenience for Next.js route handlers: resolve the network from a Request,
 * peek at Pi Platform payment metadata if you've already fetched it, and
 * return the resolved network record.
 */
export function resolveFromRequest(
  req: Request,
  paymentSandbox?: boolean,
): PiNetworkResolved {
  const url = new URL(req.url);
  return resolvePiNetwork({
    headers: req.headers,
    searchParams: url.searchParams,
    paymentSandbox,
  });
}

/** TriSyn asset binding — populated via env once the issuer/distributor exist. */
export interface TriSynAsset {
  code: string | null;
  issuer: string | null;
  distributor: string | null;
  network: PiNetwork;
}

export function getTriSynAsset(): TriSynAsset {
  return {
    code: process.env.TRISYN_ASSET_CODE || null,
    issuer: process.env.TRISYN_ISSUER || null,
    distributor: process.env.TRISYN_DISTRIBUTOR || null,
    network: (process.env.TRISYN_NETWORK as PiNetwork) || "testnet",
  };
}
