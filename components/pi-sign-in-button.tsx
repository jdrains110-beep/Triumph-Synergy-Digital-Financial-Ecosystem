"use client";

import { usePi } from "@/lib/pi-sdk/pi-provider";

/**
 * PiSignInButton — prompts the Pioneer to authenticate with Pi Network.
 *
 * Shows a spinner while loading, the Pioneer's username when authenticated,
 * and a Pi-branded sign-in button when not yet authenticated.
 *
 * Must be rendered inside a <PiProvider>.
 */
export function PiSignInButton({ className }: { className?: string }) {
  const { isAuthenticated, isLoading, isReady, user, authenticate } = usePi();

  if (!isReady || isLoading) {
    return (
      <button
        disabled
        aria-label="Connecting to Pi Network..."
        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium
          bg-yellow-400/20 text-yellow-700 dark:text-yellow-300 cursor-wait select-none
          border border-yellow-400/40 ${className ?? ""}`}
      >
        <span
          className="size-4 rounded-full border-2 border-yellow-500 border-t-transparent animate-spin"
          aria-hidden="true"
        />
        Connecting to Pi…
      </button>
    );
  }

  if (isAuthenticated && user) {
    return (
      <div
        role="status"
        aria-label={`Signed in as ${user.username}`}
        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium
          bg-yellow-400/15 text-yellow-800 dark:text-yellow-300
          border border-yellow-400/30 select-none ${className ?? ""}`}
      >
        {/* Pi symbol */}
        <span className="text-yellow-500 font-bold text-base" aria-hidden="true">π</span>
        <span className="truncate max-w-[160px]">{user.username}</span>
      </div>
    );
  }

  return (
    <button
      onClick={() => void authenticate()}
      aria-label="Sign in with Pi Network"
      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold
        bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-950
        hover:from-yellow-300 hover:to-yellow-400 active:scale-95
        transition-all duration-150 shadow-sm border border-yellow-500/30
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 ${className ?? ""}`}
    >
      <span className="font-bold text-base" aria-hidden="true">π</span>
      Sign in with Pi
    </button>
  );
}
