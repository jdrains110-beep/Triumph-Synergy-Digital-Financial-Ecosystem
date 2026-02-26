/**
 * lib/pi-sdk/domain-config.ts
 *
 * SINGLE SOURCE OF TRUTH for Pi Network domain configuration.
 *
 * ALL Pi SDK initialization MUST use this module for domain detection.
 * DO NOT use process.env for sandbox mode - use this runtime detection.
 *
 * Domain Mapping (as of January 2026):
 * =====================================
 *
 * TESTNET DOMAINS (sandbox: true):
 *   - triumphsynergy1991.pinet.com   → Development URL for testnet
 *   - triumph-synergy-testnet.vercel.app → Vercel testnet deployment
 *   - localhost / 127.0.0.1          → Local development
 *
 * MAINNET DOMAINS (sandbox: false):
 *   - triumphsynergy7386.pinet.com   → Development URL for mainnet
 *   - triumphsynergy0576.pinet.com   → Primary production pinet domain
 *   - triumph-synergy.vercel.app     → Vercel mainnet deployment
 */

export type NetworkConfig = {
  network: "testnet" | "mainnet";
  sandbox: boolean;
  hostname: string;
  appId: string;
  description: string;
};

/**
 * Domain to network configuration mapping
 * EXPLICIT - no pattern matching, exact domain strings only
 */
const DOMAIN_CONFIG: Record<
  string,
  Omit<NetworkConfig, "hostname" | "appId">
> = {
  // ==========================================
  // TESTNET DOMAINS
  // ==========================================
  "triumphsynergy1991.pinet.com": {
    network: "testnet",
    sandbox: true,
    description: "Pi Network Testnet (pinet.com development URL)",
  },
  "triumph-synergy-testnet.vercel.app": {
    network: "testnet",
    sandbox: true,
    description: "Vercel Testnet Deployment",
  },
  localhost: {
    network: "testnet",
    sandbox: true,
    description: "Local Development (testnet)",
  },
  "127.0.0.1": {
    network: "testnet",
    sandbox: true,
    description: "Local Development (testnet)",
  },

  // ==========================================
  // MAINNET DOMAINS
  // ==========================================
  "triumphsynergy7386.pinet.com": {
    network: "mainnet",
    sandbox: false,
    description: "Pi Network Mainnet (pinet.com development URL)",
  },
  "triumphsynergy0576.pinet.com": {
    network: "mainnet",
    sandbox: false,
    description: "Pi Network Mainnet Primary (pinet.com)",
  },
  "triumph-synergy.vercel.app": {
    network: "mainnet",
    sandbox: false,
    description: "Vercel Mainnet Production",
  },
};

/**
 * The registered Pi App ID - MUST match Pi Developer Portal
 */
const PI_APP_ID = "triumph-synergy";

/**
 * Get network configuration for current domain
 *
 * This is the ONLY function that should be used for domain detection.
 * It works at runtime in the browser, not build time.
 */
export function getNetworkConfig(): NetworkConfig {
  // Server-side rendering - can't detect domain
  if (typeof window === "undefined") {
    return {
      network: "mainnet",
      sandbox: false,
      hostname: "unknown",
      appId: PI_APP_ID,
      description: "Server-side render (defaulting to mainnet)",
    };
  }

  const hostname = window.location.hostname.toLowerCase();

  // Check for exact domain match first
  const exactMatch = DOMAIN_CONFIG[hostname];
  if (exactMatch) {
    return {
      ...exactMatch,
      hostname,
      appId: PI_APP_ID,
    };
  }

  // Fallback patterns for unknown domains
  // Any .vercel.app domain not explicitly listed = testnet (preview deployments)
  if (hostname.endsWith(".vercel.app")) {
    console.warn(
      `[Pi Domain Config] Unknown vercel domain: ${hostname} - defaulting to testnet`
    );
    return {
      network: "testnet",
      sandbox: true,
      hostname,
      appId: PI_APP_ID,
      description: `Unknown Vercel domain (${hostname}) - testnet fallback`,
    };
  }

  // Any .pinet.com domain not explicitly listed = mainnet
  if (hostname.endsWith(".pinet.com")) {
    console.warn(
      `[Pi Domain Config] Unknown pinet domain: ${hostname} - defaulting to mainnet`
    );
    return {
      network: "mainnet",
      sandbox: false,
      hostname,
      appId: PI_APP_ID,
      description: `Unknown pinet domain (${hostname}) - mainnet fallback`,
    };
  }

  // Completely unknown domain - default to mainnet (safer for production)
  console.warn(
    `[Pi Domain Config] Completely unknown domain: ${hostname} - defaulting to mainnet`
  );
  return {
    network: "mainnet",
    sandbox: false,
    hostname,
    appId: PI_APP_ID,
    description: `Unknown domain (${hostname}) - mainnet fallback`,
  };
}

/**
 * Get Pi.init() configuration object
 * Use this directly in Pi.init() calls
 */
export function getPiInitConfig(): {
  version: string;
  sandbox: boolean;
  appId?: string;
} {
  const config = getNetworkConfig();
  return {
    version: "2.0",
    sandbox: config.sandbox,
    // Note: appId may or may not be required depending on Pi SDK version
    // Include it for forward compatibility
  };
}

/**
 * Check if current domain is testnet
 */
export function isTestnet(): boolean {
  return getNetworkConfig().sandbox === true;
}

/**
 * Check if current domain is mainnet
 */
export function isMainnet(): boolean {
  return getNetworkConfig().sandbox === false;
}

/**
 * Get all known domains for display/debugging
 */
export function getAllKnownDomains(): Array<{
  domain: string;
  network: string;
  sandbox: boolean;
}> {
  return Object.entries(DOMAIN_CONFIG).map(([domain, config]) => ({
    domain,
    network: config.network,
    sandbox: config.sandbox,
  }));
}

/**
 * Generate the inline script for Pi SDK auto-initialization
 * This MUST be used in layout.tsx for consistent initialization
 */
export function generatePiInitScript(): string {
  // This returns a string that will be executed inline in the browser
  // It contains the same domain detection logic as getNetworkConfig()
  return `
(function() {
  window.__piInitialization = {
    status: 'initializing',
    startTime: Date.now()
  };

  function getNetworkConfig(hostname) {
    // EXPLICIT DOMAIN MAPPING - SINGLE SOURCE OF TRUTH
    var domains = {
      // TESTNET
      'triumphsynergy1991.pinet.com': { network: 'testnet', sandbox: true },
      'triumph-synergy-testnet.vercel.app': { network: 'testnet', sandbox: true },
      'localhost': { network: 'testnet', sandbox: true },
      '127.0.0.1': { network: 'testnet', sandbox: true },
      // MAINNET
      'triumphsynergy7386.pinet.com': { network: 'mainnet', sandbox: false },
      'triumphsynergy0576.pinet.com': { network: 'mainnet', sandbox: false },
      'triumph-synergy.vercel.app': { network: 'mainnet', sandbox: false }
    };

    var config = domains[hostname];
    if (config) return config;

    // Fallback patterns
    if (hostname.endsWith('.vercel.app')) {
      return { network: 'testnet', sandbox: true };
    }
    if (hostname.endsWith('.pinet.com')) {
      return { network: 'mainnet', sandbox: false };
    }
    return { network: 'mainnet', sandbox: false };
  }

  async function initializePi() {
    var hostname = window.location.hostname.toLowerCase();
    var config = getNetworkConfig(hostname);

    console.log('[Pi SDK] ========================================');
    console.log('[Pi SDK] AUTOMATIC INITIALIZATION');
    console.log('[Pi SDK] ========================================');
    console.log('[Pi SDK] Hostname:', hostname);
    console.log('[Pi SDK] Network:', config.network);
    console.log('[Pi SDK] Sandbox:', config.sandbox);

    try {
      // Wait for Pi SDK to load from CDN
      var attempts = 0;
      while (!window.Pi && attempts < 100) {
        await new Promise(function(r) { setTimeout(r, 100); });
        attempts++;
      }

      if (!window.Pi) {
        throw new Error('Pi SDK not loaded after 10 seconds');
      }

      console.log('[Pi SDK] ✓ window.Pi available');

      // Initialize with domain-based config
      await window.Pi.init({
        version: '2.0',
        sandbox: config.sandbox
      });

      console.log('[Pi SDK] ✓ Pi.init() succeeded');

      // Authenticate to register app with Pi Browser
      var auth = await window.Pi.authenticate(
        ['payments'],
        function(payment) {
          console.log('[Pi SDK] Incomplete payment:', payment);
        }
      );

      console.log('[Pi SDK] ✓ Authenticated:', auth.user.uid);

      window.__piInitialization.status = 'ready';
      window.__piInitialization.authenticated = true;
      window.__piInitialization.user = auth.user;
      window.__piInitialization.duration = Date.now() - window.__piInitialization.startTime;

      console.log('[Pi SDK] ========================================');
      console.log('[Pi SDK] READY FOR PAYMENTS');
      console.log('[Pi SDK] ========================================');

      window.dispatchEvent(new CustomEvent('piReady', { detail: auth }));

    } catch (error) {
      console.error('[Pi SDK] ❌ INITIALIZATION FAILED:', error);
      window.__piInitialization.status = 'failed';
      window.__piInitialization.error = error.message;
      window.dispatchEvent(new CustomEvent('piError', { detail: error }));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePi);
  } else {
    initializePi();
  }
})();
`;
}
