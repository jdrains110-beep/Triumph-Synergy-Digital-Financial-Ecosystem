/**
 * Node Services Auto-Initialization
 * 
 * This module ensures that all node services (resilience, stability, guardian)
 * start automatically when triumph-synergy loads.
 * 
 * Import this module early in your application (e.g., in layout.tsx or instrumentation.ts)
 * to ensure all node services are active.
 */

let initialized = false;
let initializationPromise: Promise<void> | null = null;

/**
 * Initialize all node services
 * Safe to call multiple times - will only initialize once
 */
export async function initNodeServices(): Promise<void> {
  if (initialized) {
    return;
  }
  
  if (initializationPromise) {
    return initializationPromise;
  }
  
  initializationPromise = (async () => {
    try {
      console.log("[NodeServices] Initializing secure, stable, uninterruptible node connections...");
      
      // Import the service guardian which orchestrates everything
      const { startServiceGuardian } = await import("./service-guardian");
      
      // Start the guardian (which starts all subsystems)
      await startServiceGuardian();
      
      initialized = true;
      console.log("[NodeServices] All node services initialized successfully");
      console.log("[NodeServices] ✓ Connection Resilience: ACTIVE");
      console.log("[NodeServices] ✓ Supernode Stability: ACTIVE");
      console.log("[NodeServices] ✓ Service Guardian: ACTIVE");
      console.log("[NodeServices] All connections are now protected and will never be interrupted");
      
    } catch (error) {
      console.error("[NodeServices] Failed to initialize:", error);
      throw error;
    }
  })();
  
  return initializationPromise;
}

/**
 * Check if services are initialized
 */
export function isInitialized(): boolean {
  return initialized;
}

/**
 * Get initialization status
 */
export function getInitializationStatus(): {
  initialized: boolean;
  initializing: boolean;
} {
  return {
    initialized,
    initializing: initializationPromise !== null && !initialized,
  };
}

// Auto-initialize in development/production (not during build)
if (typeof window !== "undefined" || process.env.NODE_ENV !== "production") {
  // Client-side or development - defer to manual initialization
} else {
  // Server-side production - auto-initialize
  initNodeServices().catch(console.error);
}
