/**
 * IMMUTABLE DEPLOYMENT VERIFICATION
 * 
 * This hook validates at startup that deployment URLs haven't been modified.
 * Ensures Pi Network domain verification remains locked.
 * 
 * Usage: Call in app/layout.tsx or root provider
 */

import { useEffect } from "react";
import { validateDeploymentURLs, DEPLOYMENT_URLS } from "@/lib/constants/deployment-urls";

export function useDeploymentVerification() {
  useEffect(() => {
    // Validate only on client-side
    if (typeof window === "undefined") return;

    // Run validation
    const isValid = validateDeploymentURLs();

    if (!isValid) {
      console.warn(
        "⚠️  DEPLOYMENT URL VERIFICATION FAILED - Pi domain verification may be compromised"
      );
      // In production, could send alert to monitoring service
    } else {
      console.log(
        "✅ Deployment URLs verified:",
        DEPLOYMENT_URLS
      );
    }
  }, []);
}

/**
 * Returns the verified deployment URLs
 */
export function getVerifiedDeploymentURLs() {
  return DEPLOYMENT_URLS;
}

/**
 * Checks if running on verified mainnet deployment
 */
export function isMainnetDeployment(): boolean {
  if (typeof window === "undefined") return false;
  
  const currentUrl = window.location.origin;
  const expectedMainnetUrl = "https://triumph-synergy-jeremiah-drains-projects.vercel.app";
  
  return (
    currentUrl === expectedMainnetUrl ||
    currentUrl === "https://triumphsynergy0576.pinet.com"
  );
}

/**
 * Checks if running on verified testnet deployment
 */
export function isTestnetDeployment(): boolean {
  if (typeof window === "undefined") return false;
  
  const currentUrl = window.location.origin;
  const expectedTestnetUrl = "https://triumph-synergy-testnet.vercel.app";
  
  return currentUrl === expectedTestnetUrl;
}

/**
 * Checks if running on local development
 */
export function isDevelopmentDeployment(): boolean {
  if (typeof window === "undefined") return false;
  
  const currentUrl = window.location.origin;
  return currentUrl.includes("localhost") || currentUrl.includes("127.0.0.1");
}
