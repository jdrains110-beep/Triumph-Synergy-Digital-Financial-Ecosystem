"use client";

/**
 * hooks/use-pi-auth.ts
 *
 * Thin convenience wrapper around usePi() that exposes just the auth subset of
 * the Pi context.  Import this in any platform page that needs to gate content
 * or display the current Pioneer's identity.
 *
 * Usage:
 *   const { isAuthenticated, user, signIn, isLoading } = usePiAuth();
 */

import { usePi } from "@/lib/pi-sdk/pi-provider";

export function usePiAuth() {
  const { isAuthenticated, user, authenticate, isLoading, error, isReady } =
    usePi();

  return {
    /** true once the Pi SDK has resolved (init + optional auto-auth) */
    isReady,
    /** true when a Pioneer is authenticated in this session */
    isAuthenticated,
    /** Pi user object — uid + username (null when not authenticated) */
    user,
    /** Trigger the Pi Browser authentication dialog manually */
    signIn: authenticate,
    /** true while authenticate() is in flight */
    isLoading,
    /** Non-null when Pi SDK is unavailable or auth was rejected */
    error,
  };
}
