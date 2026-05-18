/**
 * Triumph-Synergy Application Domain Configuration
 *
 * Dynamic configuration that works across testnet, mainnet, and Vercel
 * Loads from environment variables or detects from hostname
 */

/**
 * Get the canonical application URL
 * Priority: hostname detection > process.env > fallback
 */
function getCanonicalAppUrl(): string {
  // If in browser, use current location
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.host}`;
  }

  // If running on Vercel/Replit/etc, use VERCEL_URL / env hostname with canonical domain mapping
  if (process.env.VERCEL_URL) {
    // ============================================
    // CANONICAL DOMAIN MAPPING
    // ============================================
    const hostname = process.env.VERCEL_URL.toLowerCase();

    // MAINNET (Pi Network primary)
    if (hostname === "triumphsynergyab2099.pinet.com") {
      return "https://triumphsynergyab2099.pinet.com";
    }

    // TESTNET / STAGING (Replit)
    if (hostname === "triumph-synergy.replit.app") {
      return "https://Triumph-Synergy.replit.app";
    }

    return `https://${process.env.VERCEL_URL}`;
  }

  // If explicitly set in environment (legacy)
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  // Fallback for server-side without env vars
  return "https://triumphsynergyab2099.pinet.com";
}

/**
 * Get the actual hostname being accessed
 */
function getActualHostname(): string {
  // If in browser
  if (typeof window !== "undefined") {
    return window.location.hostname;
  }

  // If in server context with VERCEL_URL
  if (process.env.VERCEL_URL) {
    return process.env.VERCEL_URL;
  }

  // Extract from NEXT_PUBLIC_APP_URL
  if (process.env.NEXT_PUBLIC_APP_URL) {
    try {
      return new URL(process.env.NEXT_PUBLIC_APP_URL).hostname;
    } catch {
      return "triumphsynergyab2099.pinet.com";
    }
  }

  return "triumphsynergyab2099.pinet.com";
}

/**
 * Detect if this is testnet or mainnet based on hostname.
 * Canonical mapping:
 *   triumphsynergyab2099.pinet.com   → mainnet (Pi Network primary)
 *   triumph-synergy.replit.app       → testnet (staging)
 *   localhost / 127.0.0.1            → testnet (dev)
 */
function getEnvironmentNetwork(): "testnet" | "mainnet" {
  const hostname = getActualHostname().toLowerCase();

  // MAINNET (Pi Network primary)
  if (hostname === "triumphsynergyab2099.pinet.com") {
    return "mainnet";
  }

  // TESTNET / STAGING (Replit)
  if (hostname === "triumph-synergy.replit.app") {
    return "testnet";
  }

  // Fallback: any other .replit.app or .vercel.app = testnet (preview/staging)
  if (hostname.endsWith(".replit.app") || hostname.endsWith(".vercel.app")) {
    return "testnet";
  }

  // Fallback: localhost = testnet
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "testnet";
  }

  // Default to mainnet
  return "mainnet";
}

export const APP_CONFIG = {
  // Get the canonical app URL (respects environment variables)
  getCanonicalUrl: (): string => {
    return getCanonicalAppUrl();
  },

  // Get display URL for client-side use
  getDisplayUrl: (): string => {
    return getCanonicalAppUrl();
  },

  // Get the domain/hostname being accessed
  getDomain: (): string => {
    return getActualHostname();
  },

  // Get the network environment (testnet or mainnet)
  getNetwork: (): "testnet" | "mainnet" => {
    return getEnvironmentNetwork();
  },

  // Get the full API base URL for the current environment
  getApiBase: (): string => {
    return `${getCanonicalAppUrl()}/api`;
  },

  // Get Pi-specific configuration
  getPiConfig: () => ({
    sandbox: getEnvironmentNetwork() === "testnet", // Testnet = sandbox mode
    appId: process.env.NEXT_PUBLIC_PI_APP_ID || "triumph-synergy",
    network: getEnvironmentNetwork(),
    domain: getActualHostname(),
  }),
} as const;

export default APP_CONFIG;
