/**
 * lib/pi-sdk/pi-browser-detector.ts
 * Detects and validates Pi Browser environment
 */

export interface PiBrowserInfo {
  isAvailable: boolean;
  isPiBrowser: boolean;
  userAgent: string;
  version?: string;
  platform?: string;
  isPiNetworkAvailable: boolean;
}

/**
 * Detect if running in Pi Browser
 */
export function detectPiBrowser(): PiBrowserInfo {
  if (typeof window === "undefined") {
    return {
      isAvailable: false,
      isPiBrowser: false,
      userAgent: "server-side",
      platform: "server",
      isPiNetworkAvailable: false,
    };
  }

  const userAgent = navigator.userAgent.toLowerCase();
  const isPiBrowser =
    userAgent.includes("pibrowser") ||
    userAgent.includes("pi browser") ||
    (window as any).PiNetwork !== undefined ||
    (window as any).Pi !== undefined;

  const piNetworkAvailable =
    (window as any).Pi !== undefined && typeof (window as any).Pi === "object";

  return {
    isAvailable: true,
    isPiBrowser,
    userAgent: navigator.userAgent,
    version: getPiBrowserVersion(),
    platform: navigator.platform,
    isPiNetworkAvailable: piNetworkAvailable,
  };
}

/**
 * Get Pi Browser version
 */
function getPiBrowserVersion(): string | undefined {
  if (typeof window === "undefined") return undefined;

  const userAgent = navigator.userAgent;
  const match = userAgent.match(/PiBrowser\/([^\s]+)/i);
  return match ? match[1] : undefined;
}

/**
 * Validate Pi Browser environment
 */
export async function validatePiBrowserEnvironment(): Promise<{
  valid: boolean;
  errors: string[];
  info: PiBrowserInfo;
}> {
  const errors: string[] = [];
  const info = detectPiBrowser();

  // Check if running in browser
  if (!info.isAvailable) {
    errors.push("Not running in a browser environment");
    return { valid: false, errors, info };
  }

  // Check if Pi Browser
  if (!info.isPiBrowser) {
    console.warn("[Pi Browser] Not running in Pi Browser - using web fallback");
  }

  // Check if Pi Network available
  if (!info.isPiNetworkAvailable) {
    errors.push("Pi Network SDK not loaded");
    return { valid: false, errors, info };
  }

  // Check Pi SDK
  const Pi = (window as any).Pi;
  try {
    // Verify Pi SDK methods exist
    if (!Pi.payments || !Pi.auth) {
      errors.push("Pi SDK missing required methods");
      return { valid: false, errors, info };
    }
  } catch (err) {
    errors.push(`Pi SDK validation error: ${err instanceof Error ? err.message : "Unknown error"}`);
    return { valid: false, errors, info };
  }

  return {
    valid: errors.length === 0,
    errors,
    info,
  };
}

/**
 * Initialize Pi Browser specific features
 */
export async function initializePiBrowser(): Promise<{
  success: boolean;
  error?: string;
  environment: PiBrowserInfo;
}> {
  try {
    const info = detectPiBrowser();

    if (!info.isAvailable) {
      return {
        success: false,
        error: "Not running in browser",
        environment: info,
      };
    }

    console.log("[Pi Browser] Environment detected:", {
      isPiBrowser: info.isPiBrowser,
      isPiNetworkAvailable: info.isPiNetworkAvailable,
      version: info.version,
    });

    if (!info.isPiNetworkAvailable) {
      console.warn(
        "[Pi Browser] Pi Network not available - make sure you're in Pi Browser"
      );
      return {
        success: false,
        error: "Pi Network SDK not available",
        environment: info,
      };
    }

    return {
      success: true,
      environment: info,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Initialization failed",
      environment: detectPiBrowser(),
    };
  }
}

/**
 * Check if Pi Browser has payment support
 */
export function hasPaymentSupport(): boolean {
  if (typeof window === "undefined") return false;

  const Pi = (window as any).Pi;
  return (
    Pi !== undefined &&
    Pi.payments !== undefined &&
    typeof Pi.payments.request === "function"
  );
}

/**
 * Log Pi Browser info for debugging
 */
export function logPiBrowserInfo(): void {
  const info = detectPiBrowser();

  console.group("[Pi Browser Debug Info]");
  console.log("Browser Available:", info.isAvailable);
  console.log("Pi Browser Detected:", info.isPiBrowser);
  console.log("User Agent:", info.userAgent);
  console.log("Platform:", info.platform);
  console.log("Version:", info.version);
  console.log("Pi Network Available:", info.isPiNetworkAvailable);
  console.groupEnd();
}
