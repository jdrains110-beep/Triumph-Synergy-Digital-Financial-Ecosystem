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
  
  // If running on Vercel, use VERCEL_URL with FULL DOMAIN URL detection
  if (process.env.VERCEL_URL) {
    // Detect domain from VERCEL_URL - EXPLICIT FULL DOMAIN MATCHING
    const hostname = process.env.VERCEL_URL.toLowerCase();
    if (hostname === "triumphsynergy1991.pinet.com") {
      return "https://triumphsynergy1991.pinet.com";
    } else if (hostname === "triumphsynergy7386.pinet.com") {
      return "https://triumphsynergy7386.pinet.com";
    } else if (hostname === "triumphsynergy0576.pinet.com") {
      return "https://triumphsynergy0576.pinet.com";
    } else if (hostname === "triumph-synergy.vercel.app") {
      return "https://triumph-synergy.vercel.app";
    }
    return `https://${process.env.VERCEL_URL}`;
  }

  // If explicitly set in environment (legacy)
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  
  // Fallback for server-side without env vars
  return "https://triumphsynergy0576.pinet.com";
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
      return "triumphsynergy0576.pinet.com";
    }
  }
  
  return "triumphsynergy0576.pinet.com";
}

/**
 * Detect if this is testnet or mainnet based on hostname
 * Domain mapping:
 *   0576 = Primary app domain (mainnet)
 *   1991 = Testnet (development/testing) ← ALWAYS testnet
 *   7386 = Mainnet (production)
 */
function getEnvironmentNetwork(): "testnet" | "mainnet" {
  const hostname = getActualHostname().toLowerCase();
  
  // EXPLICIT FULL DOMAIN URL MATCHING - PINET DOMAINS
  if (hostname === "triumphsynergy1991.pinet.com") {
    return "testnet";
  }
  
  if (hostname === "triumphsynergy7386.pinet.com") {
    return "mainnet";
  }
  
  if (hostname === "triumphsynergy0576.pinet.com") {
    return "mainnet";
  }
  
  // EXPLICIT FULL DOMAIN URL MATCHING - VERCEL DOMAINS
  if (hostname === "triumph-synergy.vercel.app") {
    return "mainnet";
  }
  
  // Vercel branch preview deployments are testnet
  if (hostname.endsWith(".vercel.app")) {
    return "testnet";
  }
  
  // Named domains
  if (hostname.includes("testnet") || hostname.includes("staging")) {
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
