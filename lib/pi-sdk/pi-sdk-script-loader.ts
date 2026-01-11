/**
 * lib/pi-sdk/pi-sdk-script-loader.ts
 * Load Pi SDK script into DOM
 */

/**
 * Load Pi SDK script into document head
 * Call this in app layout or on first client render
 */
export function loadPiSDKScript(): void {
  if (typeof document === "undefined") {
    return;
  }

  // Check if script already loaded
  if ((window as any).Pi !== undefined) {
    console.log("[Pi SDK] Script already loaded");
    return;
  }

  // Check if script tag already exists
  const existingScript = document.querySelector(
    'script[src*="sdk.minepi.com"]'
  );
  if (existingScript) {
    console.log("[Pi SDK] Script tag already exists");
    return;
  }

  // Create script element
  const script = document.createElement("script");
  script.src = "https://sdk.minepi.com/pi-sdk.js";
  script.async = true;
  script.defer = true;

  // Add event listeners for debugging
  script.onload = () => {
    console.log("[Pi SDK] Script loaded successfully");

    // Check if Pi object is available
    if ((window as any).Pi) {
      console.log("[Pi SDK] ✓ window.Pi is available");
    } else {
      console.warn("[Pi SDK] Script loaded but window.Pi not found yet");
    }
  };

  script.onerror = () => {
    console.error("[Pi SDK] Failed to load Pi SDK script");
  };

  // Add to head
  const head = document.head || document.getElementsByTagName("head")[0];
  head.appendChild(script);

  console.log("[Pi SDK] Script injection initiated");
}

/**
 * Wait for Pi SDK to be ready
 */
export async function waitForPiSDK(
  maxAttempts = 50,
  delayMs = 100
): Promise<boolean> {
  if (typeof window === "undefined") {
    return false;
  }

  for (let i = 0; i < maxAttempts; i++) {
    if ((window as any).Pi !== undefined) {
      console.log("[Pi SDK] ✓ Pi SDK is ready");
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  console.warn("[Pi SDK] Timeout waiting for Pi SDK (exceeded max attempts)");
  return false;
}

/**
 * Initialize Pi SDK with configuration
 */
export async function initializePiNetworkSDK(config: {
  appId: string;
  chestnut?: boolean;
  onIncompletePaymentFound?: (payment: any) => void;
}): Promise<boolean> {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    // Load script if not already loaded
    loadPiSDKScript();

    // Wait for Pi to be available
    const ready = await waitForPiSDK();

    if (!ready) {
      console.error("[Pi SDK] Failed to initialize - Pi SDK not available");
      return false;
    }

    const Pi = (window as any).Pi;

    // Initialize Pi
    await Pi.init({
      version: "2.0",
      appId: config.appId,
      chestnut: config.chestnut ?? false,
      onIncompletePaymentFound: config.onIncompletePaymentFound,
    });

    console.log("[Pi SDK] ✓ Pi SDK initialized successfully");
    return true;
  } catch (error) {
    console.error(
      "[Pi SDK] Initialization error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return false;
  }
}
