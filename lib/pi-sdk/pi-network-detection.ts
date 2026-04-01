/**
 * lib/pi-sdk/pi-network-detection.ts
 * Detects and manages Pi Network environment (testnet vs mainnet)
 * References: https://developer.minepi.com/
 */

export type PiNetworkEnvironment = "testnet" | "mainnet" | "unknown";

/**
 * Detect current Pi Network environment
 */
export function detectPiNetworkEnvironment(): PiNetworkEnvironment {
  if (typeof window === "undefined") {
    return "unknown";
  }

  const Pi = (window as any).Pi;

  // If Pi SDK is available, use it to determine network
  if (Pi?.network) {
    try {
      const network = Pi.network.getNetwork?.();
      if (network === "testnet" || network === "mainnet") {
        return network;
      }
    } catch (err) {
      console.warn("[Pi Network] Error detecting network via SDK:", err);
    }
  }

  // Check environment variables as fallback
  const envNetwork = process.env.NEXT_PUBLIC_PI_NETWORK;
  if (envNetwork === "testnet" || envNetwork === "mainnet") {
    return envNetwork;
  }

  // Check sandbox mode
  const isSandbox = process.env.NEXT_PUBLIC_PI_SANDBOX === "true";
  return isSandbox ? "testnet" : "mainnet";
}

/**
 * Get current Pi Network environment with metadata
 */
export function getPiNetworkInfo(): {
  environment: PiNetworkEnvironment;
  isSandbox: boolean;
  apiUrl: string;
  appUrl: string;
  description: string;
} {
  const environment = detectPiNetworkEnvironment();
  const isSandbox =
    environment === "testnet" || process.env.NEXT_PUBLIC_PI_SANDBOX === "true";

  const config =
    environment === "mainnet"
      ? {
          apiUrl: "https://api.minepi.com/v2",
          appUrl: "https://minepi.com",
          description: "Pi Network Production (Mainnet)",
        }
      : {
          apiUrl: "https://testnet-api.minepi.com/v2",
          appUrl: "https://testnet.minepi.com",
          description: "Pi Network Testing (Testnet/Sandbox)",
        };

  return {
    environment,
    isSandbox,
    ...config,
  };
}

/**
 * Check if running in mainnet environment
 */
export function isMainnet(): boolean {
  return detectPiNetworkEnvironment() === "mainnet";
}

/**
 * Check if running in testnet/sandbox environment
 */
export function isTestnet(): boolean {
  const env = detectPiNetworkEnvironment();
  return env === "testnet" || env === "unknown";
}

/**
 * Get API endpoint based on current network
 */
export function getPiApiEndpoint(path: string): string {
  const { apiUrl } = getPiNetworkInfo();
  return `${apiUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Get Pi Browser app URL based on current network
 */
export function getPiAppUrl(path = ""): string {
  const { appUrl } = getPiNetworkInfo();
  if (!path) {
    return appUrl;
  }
  return `${appUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Validate payment amount for current network
 * Testnet might have different limits than mainnet
 */
export function isValidPaymentAmount(amount: number): {
  valid: boolean;
  reason?: string;
} {
  // Pi Network minimum is typically 0.01 π
  if (amount < 0.01) {
    return {
      valid: false,
      reason: "Payment amount must be at least 0.01 π",
    };
  }

  // Testnet might have lower limits for testing
  if (isTestnet() && amount > 100) {
    return {
      valid: false,
      reason: "Testnet payments are limited to 100 π",
    };
  }

  // Mainnet might have higher limits
  if (isMainnet() && amount > 10_000) {
    return {
      valid: false,
      reason: "Mainnet payments are limited to 10,000 π",
    };
  }

  return { valid: true };
}

/**
 * Log network information for debugging
 */
export function logPiNetworkInfo(): void {
  const info = getPiNetworkInfo();

  console.group("[Pi Network Debug Info]");
  console.log("Environment:", info.environment);
  console.log("Is Sandbox:", info.isSandbox);
  console.log("API URL:", info.apiUrl);
  console.log("App URL:", info.appUrl);
  console.log("Description:", info.description);
  console.groupEnd();
}

/**
 * Get appropriate fee percentage based on network
 * Testnet might use different fee structure for testing
 */
export function getNetworkFeePercentage(): number {
  // Testnet typically has lower or zero fees for testing
  if (isTestnet()) {
    return 0.5; // 0.5% for testing
  }

  // Mainnet uses standard fee
  return 2.0; // 2% for production
}

/**
 * Format amount for display based on network
 */
export function formatPiAmount(amount: number): string {
  const validation = isValidPaymentAmount(amount);
  if (!validation.valid) {
    return `Invalid (${validation.reason})`;
  }

  return `${amount.toFixed(2)} π`;
}
