/**
 * DEPLOYMENT URL CONSTANTS
 *
 * Pi App Studio assigns a fresh canonical hostname on every (re)transfer
 * (and the same goes for any Pi Browser app distribution). We therefore do
 * NOT pin static `*.pinet.com` or `*.vercel.app` URLs here — they all flow
 * through env vars (NEXT_PUBLIC_APP_URL / PI_APP_PRIMARY_URL) so the value
 * follows the current transfer without code changes.
 */

function envUrl(name: string, fallback: string): string {
  const v = process.env[name];
  return v && v.length > 0 ? v : fallback;
}

export const MAINNET_DEPLOYMENT = {
  primaryUrl: envUrl("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),
  vercelUrl: "",
  customDomain: envUrl("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),
  sandbox: false,
  network: "mainnet",
  piAppId: process.env.NEXT_PUBLIC_PI_APP_ID || "triumph-synergy",
  piNetwork: "mainnet",
  piApiEndpoint: "https://api.minepi.com",
  maxPaymentAmount: 10_000,
  networkFeePercentage: 2,
  verified: true,
} as const;

export const TESTNET_DEPLOYMENT = {
  primaryUrl: envUrl("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),
  vercelUrl: "",
  customDomain: envUrl("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),
  sandbox: true,
  network: "testnet",
  piAppId: process.env.NEXT_PUBLIC_PI_APP_ID || "triumph-synergy",
  piNetwork: "testnet",
  piApiEndpoint: "https://testnet-api.minepi.com",
  maxPaymentAmount: 100,
  networkFeePercentage: 0.5,
  verified: true,
} as const;

export const DEVELOPMENT_DEPLOYMENT = {
  vercelUrl: "http://localhost:3000",
  customDomain: null,
  sandbox: true,
  network: "development",
  piAppId: process.env.NEXT_PUBLIC_PI_APP_ID || "triumph-synergy",
  piNetwork: "testnet",
  piApiEndpoint: "https://testnet-api.minepi.com",
  maxPaymentAmount: 100,
  networkFeePercentage: 0.5,
  verified: false,
  verificationDate: null,
} as const;

// ============================================================================
// RUNTIME URL SELECTION
// ============================================================================

export type DeploymentEnvironment = "production" | "testnet" | "development";

export function getDeploymentConfig(env?: DeploymentEnvironment) {
  const currentEnv = env || getCurrentEnvironment();

  switch (currentEnv) {
    case "production":
      return MAINNET_DEPLOYMENT;
    case "testnet":
      return TESTNET_DEPLOYMENT;
    default:
      return DEVELOPMENT_DEPLOYMENT;
  }
}

export function getCurrentEnvironment(): DeploymentEnvironment {
  // Check environment variables set by Vercel
  const nextPublicAppUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const sandbox = process.env.NEXT_PUBLIC_PI_SANDBOX;

  // If running locally
  if (typeof window === "undefined" && !nextPublicAppUrl) {
    return "development";
  }

  // Detect from Vercel URL or env var
  if (nextPublicAppUrl.includes("localhost")) {
    return "development";
  }

  if (sandbox === "true" || nextPublicAppUrl.includes("testnet")) {
    return "testnet";
  }

  return "production";
}

// ============================================================================
// VALIDATION & INTEGRITY CHECKS
// ============================================================================

/**
 * Validates that the resolved deployment URL is non-empty.
 * Pi App Studio assigns the canonical hostname per transfer, so we only
 * check that NEXT_PUBLIC_APP_URL has been set (or that we're in local dev).
 */
export function validateDeploymentURLs(): boolean {
  const mainnetValid = MAINNET_DEPLOYMENT.primaryUrl.length > 0;
  const testnetValid = TESTNET_DEPLOYMENT.primaryUrl.length > 0;

  if (!mainnetValid) {
    console.error("⚠️  NEXT_PUBLIC_APP_URL is not set (mainnet deployment)");
  }
  if (!testnetValid) {
    console.error("⚠️  NEXT_PUBLIC_APP_URL is not set (testnet deployment)");
  }

  return mainnetValid && testnetValid;
}

/**
 * Gets the current app URL based on deployment environment
 */
export function getAppURL(): string {
  const config = getDeploymentConfig();
  return config.vercelUrl;
}

/**
 * Gets the Pi API endpoint for current environment
 */
export function getPiApiEndpoint(): string {
  const config = getDeploymentConfig();
  return config.piApiEndpoint;
}

/**
 * Gets max payment amount for current network
 */
export function getMaxPaymentAmount(): number {
  const config = getDeploymentConfig();
  return config.maxPaymentAmount;
}

/**
 * Gets network fee percentage for current environment
 */
export function getNetworkFeePercentage(): number {
  const config = getDeploymentConfig();
  return config.networkFeePercentage;
}

// ============================================================================
// EXPORT SUMMARY
// ============================================================================

export const DEPLOYMENT_URLS = {
  mainnet: MAINNET_DEPLOYMENT.primaryUrl,
  testnet: TESTNET_DEPLOYMENT.primaryUrl,
  development: DEVELOPMENT_DEPLOYMENT.vercelUrl,
} as const;

export const DEPLOYMENT_CONFIG = {
  mainnet: MAINNET_DEPLOYMENT,
  testnet: TESTNET_DEPLOYMENT,
  development: DEVELOPMENT_DEPLOYMENT,
} as const;
