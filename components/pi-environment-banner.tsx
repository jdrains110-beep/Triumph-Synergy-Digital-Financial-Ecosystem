/**
 * components/pi-environment-banner.tsx
 * Shows Pi Browser/Network status with helpful guidance
 */

"use client";

import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { useEffect, useState } from "react";
import {
  isPiNetworkAvailable,
  isRunningInPiBrowser,
} from "@/lib/pi-sdk/pi-sdk-initialization";

export function PiEnvironmentBanner() {
  const [status, setStatus] = useState<{
    isPiBrowser: boolean;
    isPiNetworkAvailable: boolean;
  }>({
    isPiBrowser: false,
    isPiNetworkAvailable: false,
  });
  const [network, setNetwork] = useState<"mainnet" | "testnet">("mainnet");

  useEffect(() => {
    setStatus({
      isPiBrowser: isRunningInPiBrowser(),
      isPiNetworkAvailable: isPiNetworkAvailable(),
    });
    // Reflect the active network chosen by the runtime trigger (cookie set in
    // layout.tsx) so the banner stays in sync with the Pi SDK init.
    const m = document.cookie.match(/(?:^|;\s*)pi_network=([^;]+)/);
    const cookieNet = m ? decodeURIComponent(m[1]).toLowerCase() : "";
    const wnet = (
      window as unknown as { __piInitialization?: { network?: string } }
    ).__piInitialization?.network;
    setNetwork(
      cookieNet === "testnet" || wnet === "testnet" ? "testnet" : "mainnet",
    );
  }, []);

  // Switch network via the runtime trigger: set the pi_network cookie and reload
  // so the Pi SDK re-initializes against the selected network.
  const switchNetwork = (next: "mainnet" | "testnet") => {
    document.cookie = `pi_network=${next};path=/;max-age=604800;samesite=lax`;
    const url = new URL(window.location.href);
    url.searchParams.set("network", next);
    window.location.href = url.toString();
  };

  const NetworkToggle = () => (
    <div className="mt-2 flex items-center gap-2">
      <span className="font-medium text-xs uppercase tracking-wide opacity-70">
        Network:
      </span>
      <button
        type="button"
        onClick={() => switchNetwork("mainnet")}
        className={`rounded px-2 py-0.5 font-semibold text-xs ${
          network === "mainnet"
            ? "bg-green-600 text-white"
            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
        }`}
      >
        Mainnet
      </button>
      <button
        type="button"
        onClick={() => switchNetwork("testnet")}
        className={`rounded px-2 py-0.5 font-semibold text-xs ${
          network === "testnet"
            ? "bg-amber-600 text-white"
            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
        }`}
      >
        Testnet
      </button>
    </div>
  );

  // In Pi Browser with full access
  if (status.isPiBrowser && status.isPiNetworkAvailable) {
    return (
      <div className="border-green-500 border-l-4 bg-green-50 p-3 text-sm">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <span className="text-green-800">
            <strong>✓ Pi Browser Detected</strong> - Full Pi Network access
            enabled
          </span>
        </div>
        <NetworkToggle />
      </div>
    );
  }

  // Running in web browser (fallback mode)
  if (!status.isPiBrowser) {
    return (
      <div className="border-blue-500 border-l-4 bg-blue-50 p-4 text-sm">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
          <div className="flex-1 space-y-2 text-blue-800">
            <p>
              <strong>🌐 Web Browser Detected</strong> - Running in fallback
              mode
            </p>
            <p>
              Transactions work normally but require real Pi Browser for
              blockchain settlement. You can:
            </p>
            <ul className="ml-4 list-disc space-y-1">
              <li>Test transactions in web mode (simulated)</li>
              <li>
                Open in <strong>Pi Browser app</strong> for real blockchain
                transactions
              </li>
            </ul>
            <NetworkToggle />
          </div>
        </div>
      </div>
    );
  }

  // Pi Browser detected but Pi Network not available (network issue)
  return (
    <div className="border-amber-500 border-l-4 bg-amber-50 p-4 text-sm">
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
        <div className="flex-1 space-y-1 text-amber-800">
          <p>
            <strong>⚠ Pi Browser Detected</strong> - Network connection issue
          </p>
          <p>Pi Network is not responding. Check your connection and reload.</p>
          <NetworkToggle />
        </div>
      </div>
    </div>
  );
}
