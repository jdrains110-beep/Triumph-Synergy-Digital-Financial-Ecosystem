/**
 * lib/pi-sdk/pi-sdk-script-loader.ts
 * Load Pi SDK script into DOM
 */

/**
 * Cached loader promise to avoid parallel injections
 */
let loadPromise: Promise<boolean> | null = null;

/**
 * Load Pi SDK script into document head with CDN fallbacks.
 * Returns true if window.Pi becomes available.
 */
export async function loadPiSDKScript(): Promise<boolean> {
  if (typeof document === "undefined") {
    return false;
  }

  // If already present, skip loading
  if ((window as any).Pi !== undefined) {
    return true;
  }

  if (loadPromise) {
    return loadPromise;
  }

  // Try multiple CDN sources plus the original endpoint
  const cdnUrls = [
    "https://sdk.minepi.com/pi-sdk.js", // primary
    "https://app-cdn.minepi.com/pi-sdk.js", // Pi CDN fallback
    "https://cdn.jsdelivr.net/npm/@pi-network/sdk@2.0/dist/pi-sdk.js", // jsdelivr
    "https://unpkg.com/@pi-network/sdk@2.0/dist/pi-sdk.js", // unpkg
  ];

  loadPromise = (async () => {
    // If an existing pi-sdk script tag is already in the DOM, let it finish
    const existing = document.querySelector('script[src*="pi-sdk"]');
    if (existing) {
      await waitForPiSDK();
      return (window as any).Pi !== undefined;
    }

    for (const url of cdnUrls) {
      try {
        const loaded = await injectScript(url);
        if (loaded) {
          return true;
        }
      } catch (err) {
        console.warn("[Pi SDK] CDN load failed", url, err);
      }
    }

    console.error("[Pi SDK] All CDN sources failed. Pi SDK unavailable.");
    return false;
  })();

  return loadPromise;
}

async function injectScript(src: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.defer = true;

    script.onload = async () => {
      console.log("[Pi SDK] Script loaded from", src);
      const ready = await waitForPiSDK();
      return ready ? resolve(true) : reject(new Error("Pi object not ready"));
    };

    script.onerror = () => {
      console.error("[Pi SDK] Failed to load Pi SDK script from", src);
      script.remove();
      reject(new Error(`Failed to load Pi SDK from ${src}`));
    };

    const head = document.head || document.getElementsByTagName("head")[0];
    head.appendChild(script);
    console.log("[Pi SDK] Script injection initiated", src);
  });
}

/**
 * Wait for Pi SDK to be ready
 * Reduced timeout to prevent blocking app load
 */
export async function waitForPiSDK(
  maxAttempts = 20,
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

  console.warn("[Pi SDK] Timeout waiting for Pi SDK after", maxAttempts * delayMs, "ms");
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
    // Load script (with fallbacks) if not already loaded
    const loaded = await loadPiSDKScript();

    // Wait for Pi to be available
    const ready = loaded ? await waitForPiSDK() : false;

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
