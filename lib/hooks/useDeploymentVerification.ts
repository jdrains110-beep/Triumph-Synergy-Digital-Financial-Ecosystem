/**
 * IMMUTABLE DEPLOYMENT VERIFICATION
 *
 * This hook validates at startup that deployment URLs haven't been modified.
 * Ensures Pi Network domain verification remains locked.
 *
 * Usage: Call in app/layout.tsx or root provider
 */

import { useEffect } from "react";
import {
  DEPLOYMENT_URLS,
  validateDeploymentURLs,
} from "@/lib/constants/deployment-urls";

export function useDeploymentVerification() {
  useEffect(() => {
    // Validate only on client-side
    if (typeof window === "undefined") {
      return;
    }

    // Run validation
    const isValid = validateDeploymentURLs();

    if (isValid) {
      console.log("✅ Deployment URLs verified:", DEPLOYMENT_URLS);
    } else {
      console.warn(
        "⚠️  DEPLOYMENT URL VERIFICATION FAILED - Pi domain verification may be compromised"
      );
      // In production, could send alert to monitoring service
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
 * Network-mode helpers driven entirely by NEXT_PUBLIC_PI_SANDBOX. Pi App
 * Studio rotates the canonical hostname on every fresh transfer, so we no
 * longer compare against any hardcoded domain.
 */
export function isMainnetDeployment(): boolean {
  if (typeof window === "undefined") return false;
  if (isDevelopmentDeployment()) return false;
  return process.env.NEXT_PUBLIC_PI_SANDBOX !== "true";
}

export function isTestnetDeployment(): boolean {
  if (typeof window === "undefined") return false;
  if (isDevelopmentDeployment()) return false;
  return process.env.NEXT_PUBLIC_PI_SANDBOX === "true";
}

/**
 * Checks if running on local development
 */
export function isDevelopmentDeployment(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const currentUrl = window.location.origin;
  return currentUrl.includes("localhost") || currentUrl.includes("127.0.0.1");
}
