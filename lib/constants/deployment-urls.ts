/**
 * IMMUTABLE DEPLOYMENT URL CONSTANTS
 * 
 * These URLs are locked for Pi Network domain verification.
 * DO NOT MODIFY - Changes require Pi Developer Portal re-verification
 * 
 * Last Verified: January 18, 2026
 * Commit Hash: (see git log)
 */

// ============================================================================
// PRODUCTION (MAINNET) - https://triumph-synergy-jeremiah-drains-projects.vercel.app
// ============================================================================
export const MAINNET_DEPLOYMENT = {
  // Primary Vercel URL (Immutable)
  vercelUrl: "https://triumph-synergy-jeremiah-drains-projects.vercel.app",
  
  // Custom pinet domain (registered & verified)
  customDomain: "https://triumphsynergy0576.pinet.com",
  
  // Network Configuration
  sandbox: false,
  network: "mainnet",
  
  // Pi Network Settings
  piAppId: "triumph-synergy",
  piNetwork: "mainnet",
  piApiEndpoint: "https://api.minepi.com",
  
  // Payment Limits
  maxPaymentAmount: 10000, // π
  networkFeePercentage: 2, // %
  
  // Verification Status
  verified: true,
  verificationDate: "2026-01-18",
} as const;

// ============================================================================
// TESTNET (SANDBOX) - https://triumph-synergy-testnet.vercel.app
// ============================================================================
export const TESTNET_DEPLOYMENT = {
  // Testnet Vercel URL (Immutable)
  vercelUrl: "https://triumph-synergy-testnet.vercel.app",
  
  // Same custom domain (routes to testnet via subdomain or env)
  customDomain: "https://triumphsynergy0576.pinet.com",
  
  // Network Configuration
  sandbox: true,
  network: "testnet",
  
  // Pi Network Settings
  piAppId: "triumph-synergy",
  piNetwork: "testnet",
  piApiEndpoint: "https://testnet-api.minepi.com",
  
  // Payment Limits (Testnet)
  maxPaymentAmount: 100, // π (testing limit)
  networkFeePercentage: 0.5, // %
  
  // Verification Status
  verified: true,
  verificationDate: "2026-01-18",
} as const;

// ============================================================================
// DEVELOPMENT (LOCAL) - http://localhost:3000
// ============================================================================
export const DEVELOPMENT_DEPLOYMENT = {
  // Local development URL
  vercelUrl: "http://localhost:3000",
  
  // No custom domain for local
  customDomain: null,
  
  // Network Configuration (configurable)
  sandbox: true, // Default to testnet for dev
  network: "development",
  
  // Pi Network Settings
  piAppId: "triumph-synergy",
  piNetwork: "testnet",
  piApiEndpoint: "https://testnet-api.minepi.com",
  
  // Payment Limits
  maxPaymentAmount: 100,
  networkFeePercentage: 0.5,
  
  // Verification Status
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
    case "development":
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
 * Validates that deployment URLs haven't been modified
 * Run this at startup to ensure configuration integrity
 */
export function validateDeploymentURLs(): boolean {
  const expectedMainnetUrl = "https://triumph-synergy-jeremiah-drains-projects.vercel.app";
  const expectedTestnetUrl = "https://triumph-synergy-testnet.vercel.app";
  
  const mainnetValid = MAINNET_DEPLOYMENT.vercelUrl === expectedMainnetUrl;
  const testnetValid = TESTNET_DEPLOYMENT.vercelUrl === expectedTestnetUrl;
  
  if (!mainnetValid) {
    console.error(
      `⚠️  MAINNET URL MISMATCH: Expected ${expectedMainnetUrl}, got ${MAINNET_DEPLOYMENT.vercelUrl}`
    );
  }
  
  if (!testnetValid) {
    console.error(
      `⚠️  TESTNET URL MISMATCH: Expected ${expectedTestnetUrl}, got ${TESTNET_DEPLOYMENT.vercelUrl}`
    );
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
  mainnet: MAINNET_DEPLOYMENT.vercelUrl,
  testnet: TESTNET_DEPLOYMENT.vercelUrl,
  development: DEVELOPMENT_DEPLOYMENT.vercelUrl,
} as const;

export const DEPLOYMENT_CONFIG = {
  mainnet: MAINNET_DEPLOYMENT,
  testnet: TESTNET_DEPLOYMENT,
  development: DEVELOPMENT_DEPLOYMENT,
} as const;
