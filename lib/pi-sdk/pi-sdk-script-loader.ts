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
 * 
 * NOTE: In Pi Browser, window.Pi is ALREADY injected by the browser itself.
 * This function is a fallback for web browsers to load from CDN.
 */
export async function loadPiSDKScript(): Promise<boolean> {
  if (typeof document === "undefined") {
    return false;
  }

  // If already present (injected by Pi Browser or already loaded), skip loading
  if ((window as any).Pi !== undefined && typeof (window as any).Pi === "object") {
    console.log("[Pi SDK Script Loader] ✓ Pi SDK already available - skipping load");
    return true;
  }

  if (loadPromise) {
    console.log("[Pi SDK Script Loader] Already loading in progress - waiting...");
    return loadPromise;
  }

  // Try multiple CDN sources - but only if not in Pi Browser
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
      console.log("[Pi SDK Script Loader] Found existing pi-sdk script in DOM, waiting for load...");
      await waitForPiSDK(50, 200);
      return (window as any).Pi !== undefined;
    }

    console.log("[Pi SDK Script Loader] Attempting to load from", cdnUrls.length, "CDN sources");
    for (let i = 0; i < cdnUrls.length; i++) {
      const url = cdnUrls[i];
      console.log(`[Pi SDK Script Loader] Trying CDN ${i + 1}/${cdnUrls.length}: ${url}`);
      try {
        const loaded = await injectScript(url);
        if (loaded) {
          console.log("[Pi SDK Script Loader] ✓ Successfully loaded from:", url);
          return true;
        }
      } catch (err) {
        console.warn(`[Pi SDK Script Loader] CDN ${i + 1} failed:`, url, err instanceof Error ? err.message : err);
      }
    }

    console.error("[Pi SDK Script Loader] ❌ All CDN sources failed - likely OK if in Pi Browser");
    return false;
  })();

  return loadPromise;
}

async function injectScript(src: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.defer = false; // Don't defer - we need it available ASAP
    script.crossOrigin = "anonymous"; // Allow CORS
    script.type = "text/javascript";

    script.onload = async () => {
      console.log("[Pi SDK] ✓ Script tag loaded from", src);
      // Give extra time for Pi global to be attached
      const ready = await waitForPiSDK(50, 200);
      if (ready) {
        resolve(true);
      } else {
        reject(new Error("Pi object not ready after script load"));
      }
    };

    script.onerror = () => {
      console.error("[Pi SDK] ❌ Failed to load Pi SDK script from", src);
      script.remove();
      reject(new Error(`Failed to load Pi SDK from ${src}`));
    };

    // Add to DOM
    const head = document.head || document.getElementsByTagName("head")[0];
    head.appendChild(script);
    console.log("[Pi SDK] Script tag injected for:", src);
  });
}

/**
 * Wait for Pi SDK to be ready
 * Configurable timeout to handle slow CDN loads
 */
export async function waitForPiSDK(
  maxAttempts = 50,
  delayMs = 200
): Promise<boolean> {
  if (typeof window === "undefined") {
    return false;
  }

  console.log(`[Pi SDK] Waiting for Pi SDK... (${maxAttempts} attempts, ${delayMs}ms each = ${maxAttempts * delayMs}ms total)`);
  
  for (let i = 0; i < maxAttempts; i++) {
    if ((window as any).Pi !== undefined && typeof (window as any).Pi === "object") {
      console.log(`[Pi SDK] ✓ Pi SDK is ready (attempt ${i + 1}/${maxAttempts})`);
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
    
    // Log progress every 10 attempts
    if ((i + 1) % 10 === 0) {
      console.log(`[Pi SDK] Still waiting... (${i + 1}/${maxAttempts} attempts, ${((i + 1) * delayMs) / 1000}s elapsed)`);
    }
  }

  console.error(`[Pi SDK] ❌ Timeout waiting for Pi SDK after ${maxAttempts * delayMs}ms (${maxAttempts} attempts)`);
  console.error(`[Pi SDK] window.Pi is:`, typeof (window as any).Pi, (window as any).Pi);
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
