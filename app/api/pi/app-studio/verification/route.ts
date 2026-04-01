/**
 * app/api/pi/app-studio/verification/route.ts
 *
 * Comprehensive verification endpoint for Pi App Studio integration
 * Verifies:
 * 1. Vercel deployment is live and accessible
 * 2. Pi SDK is properly injected in all domains
 * 3. Domain mappings are correct (testnet vs mainnet)
 * 4. Connection to PINET primary domain (triumphsynergy0576.pinet.com)
 * 5. Pi App Studio integration status
 */

import { NextRequest, NextResponse } from "next/server";

const PRODUCTION_DOMAINS = {
  mainnet: {
    vercel: "triumph-synergy.vercel.app",
    pinet: ["triumphsynergy7386.pinet.com", "triumphsynergy0576.pinet.com"],
  },
  testnet: {
    vercel: "triumph-synergy-testnet.vercel.app",
    pinet: ["triumphsynergy1991.pinet.com"],
  },
};

const PRIMARY_MAINNET_DOMAIN = "triumphsynergy0576.pinet.com";

async function verifyDomainAccessibility(domain: string): Promise<{
  accessible: boolean;
  statusCode?: number;
  error?: string;
  responseTime?: number;
}> {
  try {
    const startTime = Date.now();
    const protocol = domain.includes("localhost") ? "http" : "https";
    const response = await fetch(`${protocol}://${domain}/api/pi/status`, {
      method: "GET",
      headers: {
        "User-Agent": "Pi-App-Verification/1.0",
        Accept: "application/json",
      },
      timeout: 10000,
    });

    const responseTime = Date.now() - startTime;

    return {
      accessible: response.ok,
      statusCode: response.status,
      responseTime,
    };
  } catch (error) {
    return {
      accessible: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function verifyPiSdkInjection(domain: string): Promise<{
  injected: boolean;
  checkTime?: number;
  error?: string;
}> {
  try {
    const startTime = Date.now();
    const protocol = domain.includes("localhost") ? "http" : "https";
    const response = await fetch(`${protocol}://${domain}`, {
      method: "GET",
      headers: {
        "User-Agent": "Pi-App-Verification/1.0",
      },
      timeout: 15000,
    });

    const html = await response.text();
    const checkTime = Date.now() - startTime;

    // Check for Pi SDK script injection
    const hasPiSdkScript = html.includes("sdk.minepi.com/pi-sdk.js");
    const hasPiInit = html.includes("window.Pi.init") || html.includes('Pi.init({');

    return {
      injected: hasPiSdkScript && hasPiInit,
      checkTime,
    };
  } catch (error) {
    return {
      injected: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

function getDomainNetwork(
  domain: string
): "mainnet" | "testnet" | "unknown" {
  const mainnetDomains = [
    ...PRODUCTION_DOMAINS.mainnet.vercel,
    ...PRODUCTION_DOMAINS.mainnet.pinet,
  ];
  const testnetDomains = [
    PRODUCTION_DOMAINS.testnet.vercel,
    ...PRODUCTION_DOMAINS.testnet.pinet,
  ];

  if (mainnetDomains.includes(domain)) return "mainnet";
  if (testnetDomains.includes(domain)) return "testnet";
  return "unknown";
}

function getSandboxMode(domain: string): boolean {
  return getDomainNetwork(domain) === "testnet";
}

export async function GET(request: NextRequest) {
  const hostname = request.nextUrl.hostname.toLowerCase();
  const requestMode = request.nextUrl.searchParams.get("mode"); // "check-all" or "quick"

  const verification: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    requestedDomain: hostname,
    primaryMainnetDomain: PRIMARY_MAINNET_DOMAIN,
    deploymentStatus: "checking",
    piSdkStatus: "checking",
    domainMapping: {},
    piAppStudioIntegration: {},
    issues: [] as string[],
    warnings: [] as string[],
  };

  // Verify current domain
  const currentDomainAccessible = await verifyDomainAccessibility(hostname);
  const currentSdkInjected = await verifyPiSdkInjection(hostname);

  const currentNetwork = getDomainNetwork(hostname);
  const currentSandbox = getSandboxMode(hostname);

  verification.currentDomain = {
    hostname,
    network: currentNetwork,
    sandbox: currentSandbox,
    accessible: currentDomainAccessible.accessible,
    sdkInjected: currentSdkInjected.injected,
    statusCode: currentDomainAccessible.statusCode,
    responseTime: currentDomainAccessible.responseTime,
  };

  // If current deployment is not accessible/configured, add warning
  if (!currentDomainAccessible.accessible) {
    verification.issues.push(
      `Current domain (${hostname}) not accessible: ${currentDomainAccessible.error}`
    );
  }

  if (!currentSdkInjected.injected) {
    verification.issues.push(
      `Pi SDK not injected on current domain (${hostname})`
    );
  }

  // Check all production domains if requested
  if (requestMode === "check-all") {
    verification.allDomains = {
      mainnet: {},
      testnet: {},
    };

    // Check mainnet domains
    for (const domain of PRODUCTION_DOMAINS.mainnet.pinet) {
      const accessible = await verifyDomainAccessibility(domain);
      const sdkInjected = await verifyPiSdkInjection(domain);

      if (!accessible.accessible) {
        verification.warnings.push(`Mainnet PINET domain ${domain} unreachable`);
      }

      (verification.allDomains as Record<string, unknown>).mainnet =
        Object.assign(
          (verification.allDomains as Record<string, unknown>).mainnet || {},
          {
            [domain]: {
              accessible: accessible.accessible,
              sdkInjected: sdkInjected.injected,
              responseTime: accessible.responseTime,
              statusCode: accessible.statusCode,
            },
          }
        );
    }

    const mainnetVercelAccessible = await verifyDomainAccessibility(
      PRODUCTION_DOMAINS.mainnet.vercel
    );
    const mainnetVercelSdk = await verifyPiSdkInjection(
      PRODUCTION_DOMAINS.mainnet.vercel
    );

    if (!mainnetVercelAccessible.accessible) {
      verification.issues.push(
        `Vercel mainnet domain unreachable: ${mainnetVercelAccessible.error}`
      );
    }

    (verification.allDomains as Record<string, unknown>).mainnet =
      Object.assign(
        (verification.allDomains as Record<string, unknown>).mainnet || {},
        {
          [PRODUCTION_DOMAINS.mainnet.vercel]: {
            accessible: mainnetVercelAccessible.accessible,
            sdkInjected: mainnetVercelSdk.injected,
            responseTime: mainnetVercelAccessible.responseTime,
            statusCode: mainnetVercelAccessible.statusCode,
          },
        }
      );
  }

  // Verify triumphsynergy0576.pinet.com is primary mainnet
  verification.piAppStudioIntegration = {
    primaryDomain: PRIMARY_MAINNET_DOMAIN,
    isTrueMainnet:
      currentNetwork === "mainnet" &&
      (hostname === PRIMARY_MAINNET_DOMAIN ||
        hostname === PRODUCTION_DOMAINS.mainnet.vercel),
    vercelMainnetConnectsToMainnet: currentNetwork === "mainnet",
    piSdkVersion: "2.0",
    appId: "triumph-synergy",
  };

  // Final setup validation
  const isValidSetup =
    currentDomainAccessible.accessible &&
    currentSdkInjected.injected &&
    (verification.issues as string[]).length === 0;

  verification.deploymentStatus = currentDomainAccessible.accessible
    ? "live"
    : "failed";
  verification.piSdkStatus = currentSdkInjected.injected
    ? "injected"
    : "missing";
  verification.validSetup = isValidSetup;

  // Determine if false setup (not displaying mainnet domain correctly)
  if (
    hostname === PRODUCTION_DOMAINS.mainnet.vercel &&
    currentNetwork !== "mainnet"
  ) {
    verification.issues.push(
      `FALSE SETUP: Vercel mainnet domain not recognized as mainnet. Detected as: ${currentNetwork}`
    );
  }

  if (
    hostname === PRODUCTION_DOMAINS.mainnet.vercel &&
    !currentSdkInjected.injected
  ) {
    verification.issues.push(
      `FALSE SETUP: Vercel mainnet not displaying Pi SDK initialization`
    );
  }

  const statusCode =
    (verification.issues as string[]).length > 0 ? 400 : 200;

  return NextResponse.json(verification, { status: statusCode });
}

export async function POST(request: NextRequest) {
  // Allow verification from Pi App Studio or other trusted sources
  const origin = request.headers.get("origin");
  const authorization = request.headers.get("authorization");

  // Quick diagnostic without auth for now
  const hostname = request.nextUrl.hostname.toLowerCase();

  const diagnosis = {
    timestamp: new Date().toISOString(),
    hostname,
    network: getDomainNetwork(hostname),
    sandbox: getSandboxMode(hostname),
    message: `Pi App Studio verification point for ${hostname}`,
    primaryMainnet: PRIMARY_MAINNET_DOMAIN,
    vercelMainnet: PRODUCTION_DOMAINS.mainnet.vercel,
    vercelTestnet: PRODUCTION_DOMAINS.testnet.vercel,
  };

  const accessible = await verifyDomainAccessibility(hostname);
  const sdkInjected = await verifyPiSdkInjection(hostname);

  return NextResponse.json(
    {
      ...diagnosis,
      deployment: {
        accessible: accessible.accessible,
        responseTime: accessible.responseTime,
      },
      piSdk: {
        injected: sdkInjected.injected,
        checkTime: sdkInjected.checkTime,
      },
    },
    { status: accessible.accessible ? 200 : 503 }
  );
}
