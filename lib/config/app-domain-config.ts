/**
 * Triumph-Synergy Application Domain Configuration
 * 
 * Dynamic configuration that works across testnet, mainnet, and Vercel
 * Loads from environment variables or detects from hostname
 */

/**
 * Get the canonical application URL
 * Priority: process.env > VERCEL_URL > fallback
 */
function getCanonicalAppUrl(): string {
  // If explicitly set in environment (production deployment)
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  
  // If running on Vercel, use VERCEL_URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // If in browser, use current location
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.host}`;
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
 */
function getEnvironmentNetwork(): "testnet" | "mainnet" {
  const hostname = getActualHostname();
  const isSandbox = process.env.NEXT_PUBLIC_PI_SANDBOX === "true";
  
  // Explicit environment variable takes precedence
  if (isSandbox) return "testnet";
  
  // Check hostname patterns
  if (hostname.includes("0576")) return "testnet";
  if (hostname.includes("7386")) return "mainnet";
  if (hostname.includes("testnet")) return "testnet";
  if (hostname.includes("staging")) return "testnet";
  if (hostname.includes("vercel.app")) {
    // For Vercel, check if it's a preview/staging or production
    return hostname.includes("-") ? "testnet" : "mainnet";
  }
  
  // Default based on NEXT_PUBLIC_PI_SANDBOX
  return isSandbox ? "testnet" : "mainnet";
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
    sandbox: process.env.NEXT_PUBLIC_PI_SANDBOX === "true",
    appId: process.env.NEXT_PUBLIC_PI_APP_ID || "triumph-synergy",
    network: getEnvironmentNetwork(),
  }),
} as const;

export default APP_CONFIG;
