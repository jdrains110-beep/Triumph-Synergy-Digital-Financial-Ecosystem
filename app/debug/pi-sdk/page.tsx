/**
 * app/debug/pi-sdk/page.tsx
 * Pi SDK and Pi Browser recognition debug page
 */

"use client";

import { useEffect, useState } from "react";
import {
  getPiBrowserInfo,
  getPiSDK,
  isRunningInPiBrowser,
  isPiNetworkAvailable,
  type PiBrowserInfo,
  type PiSDK,
} from "@/lib/pi-sdk/pi-sdk-initialization";

interface DebugStatus {
  loading: boolean;
  browserInfo: PiBrowserInfo | null;
  sdk: PiSDK | null;
  piGlobalObject: any;
  environment: {
    isPiBrowser: boolean;
    isPiNetworkAvailable: boolean;
    isClient: boolean;
    userAgent: string;
  };
  detectionMethods: {
    userAgentContainsPiBrowser: boolean;
    userAgentContainsPiNetwork: boolean;
    windowPiNetworkDefined: boolean;
    windowPiDefined: boolean;
    piObjectType: string;
    piSDKMethods: string[];
  };
}

export default function PiSDKDebugPage() {
  const [status, setStatus] = useState<DebugStatus>({
    loading: true,
    browserInfo: null,
    sdk: null,
    piGlobalObject: null,
    environment: {
      isPiBrowser: false,
      isPiNetworkAvailable: false,
      isClient: false,
      userAgent: "",
    },
    detectionMethods: {
      userAgentContainsPiBrowser: false,
      userAgentContainsPiNetwork: false,
      windowPiNetworkDefined: false,
      windowPiDefined: false,
      piObjectType: "undefined",
      piSDKMethods: [],
    },
  });

  useEffect(() => {
    const checkStatus = async () => {
      // Get Pi Browser info
      const browserInfo = getPiBrowserInfo();
      const sdk = await getPiSDK();

      // Check detection methods
      const piGlobal = (window as any).Pi;
      const piNetworkGlobal = (window as any).PiNetwork;

      const detectionMethods = {
        userAgentContainsPiBrowser: navigator.userAgent
          .toLowerCase()
          .includes("pibrowser"),
        userAgentContainsPiNetwork: navigator.userAgent
          .toLowerCase()
          .includes("pi network"),
        windowPiNetworkDefined: piNetworkGlobal !== undefined,
        windowPiDefined: piGlobal !== undefined,
        piObjectType: piGlobal ? typeof piGlobal : "undefined",
        piSDKMethods: piGlobal
          ? Object.keys(piGlobal).filter(
              (key) =>
                typeof (piGlobal as any)[key] === "object" ||
                typeof (piGlobal as any)[key] === "function"
            )
          : [],
      };

      setStatus({
        loading: false,
        browserInfo,
        sdk,
        piGlobalObject: piGlobal,
        environment: {
          isPiBrowser: isRunningInPiBrowser(),
          isPiNetworkAvailable: isPiNetworkAvailable(),
          isClient: true,
          userAgent: navigator.userAgent,
        },
        detectionMethods,
      });
    };

    checkStatus();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="border-b-2 border-blue-500 pb-6">
          <h1 className="text-4xl font-bold text-gray-900">
            Pi SDK & Pi Browser Debug
          </h1>
          <p className="text-gray-600 mt-2">
            Verify Pi SDK and Pi Browser recognition
          </p>
        </div>

        {status.loading ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <div className="text-xl text-blue-600 font-semibold">
              Initializing...
            </div>
          </div>
        ) : (
          <>
            {/* Environment Status */}
            <section className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Environment Status
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <StatusItem
                  label="Pi Browser"
                  value={status.environment.isPiBrowser}
                />
                <StatusItem
                  label="Pi Network Available"
                  value={status.environment.isPiNetworkAvailable}
                />
                <StatusItem
                  label="Client Side"
                  value={status.environment.isClient}
                />
              </div>
            </section>

            {/* Browser Info */}
            {status.browserInfo && (
              <section className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Browser Information
                </h2>
                <div className="space-y-3">
                  <InfoItem
                    label="User Agent"
                    value={status.browserInfo.userAgent}
                  />
                  <InfoItem
                    label="Platform"
                    value={status.browserInfo.platform || "N/A"}
                  />
                  {status.browserInfo.version && (
                    <InfoItem
                      label="Version"
                      value={status.browserInfo.version}
                    />
                  )}
                </div>
              </section>
            )}

            {/* Detection Methods */}
            <section className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Detection Methods
              </h2>
              <div className="space-y-2">
                <StatusItem
                  label="User Agent Contains 'PiBrowser'"
                  value={status.detectionMethods.userAgentContainsPiBrowser}
                />
                <StatusItem
                  label="User Agent Contains 'Pi Network'"
                  value={status.detectionMethods.userAgentContainsPiNetwork}
                />
                <StatusItem
                  label="window.PiNetwork Defined"
                  value={status.detectionMethods.windowPiNetworkDefined}
                />
                <StatusItem
                  label="window.Pi Defined"
                  value={status.detectionMethods.windowPiDefined}
                />
              </div>
            </section>

            {/* Pi Object Details */}
            {status.piGlobalObject && (
              <section className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Pi SDK Object
                </h2>
                <div className="space-y-3">
                  <InfoItem
                    label="Pi Object Type"
                    value={status.detectionMethods.piObjectType}
                  />
                  <div>
                    <label className="font-semibold text-gray-700 block mb-2">
                      Available Methods:
                    </label>
                    <div className="bg-gray-100 p-3 rounded text-sm font-mono space-y-1">
                      {status.detectionMethods.piSDKMethods.length > 0 ? (
                        status.detectionMethods.piSDKMethods.map((method) => (
                          <div key={method} className="text-gray-700">
                            • {method}
                          </div>
                        ))
                      ) : (
                        <div className="text-gray-500 italic">
                          No methods found
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Raw Objects */}
            <section className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Raw Objects (Console)
              </h2>
              <div className="bg-gray-100 p-3 rounded text-sm font-mono text-gray-700 mb-3">
                window.Pi = {status.piGlobalObject ? "defined" : "undefined"}
              </div>
              <button
                onClick={() => {
                  if (status.piGlobalObject) {
                    console.log("Pi SDK Object:", status.piGlobalObject);
                    alert("Pi SDK Object logged to console");
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Log Pi SDK to Console
              </button>
            </section>

            {/* Instructions */}
            <section className="bg-amber-50 rounded-lg border border-amber-200 p-6">
              <h3 className="font-semibold text-amber-900 mb-2">
                Testing Instructions:
              </h3>
              <ol className="list-decimal list-inside space-y-1 text-amber-800 text-sm">
                <li>
                  If running in Pi Browser: All items should show ✓ (enabled)
                </li>
                <li>
                  If running in regular web browser: Most items will show ✗
                  (disabled)
                </li>
                <li>
                  Check browser console for detailed logs with keyboard shortcut
                  F12
                </li>
                <li>
                  Pi SDK requires loading the Pi script in HTML head tag
                </li>
              </ol>
            </section>

            {/* Next Steps */}
            {!status.environment.isPiBrowser && (
              <section className="bg-blue-50 rounded-lg border border-blue-200 p-6">
                <h3 className="font-semibold text-blue-900 mb-2">
                  To enable Pi Network integration:
                </h3>
                <ol className="list-decimal list-inside space-y-2 text-blue-800 text-sm">
                  <li>
                    Add the Pi SDK script to your HTML head:{" "}
                    <code className="bg-white px-2 py-1 rounded border border-blue-200">
                      &lt;script src="https://sdk.minepi.com/pi-sdk.js"&gt;&lt;/script&gt;
                    </code>
                  </li>
                  <li>Test the app in Pi Browser or Pi Testnet</li>
                  <li>Ensure Pi API credentials are configured</li>
                </ol>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Status item component
 */
function StatusItem({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
      <span className="font-medium text-gray-700">{label}</span>
      <span
        className={`font-bold text-lg ${
          value ? "text-green-600" : "text-red-600"
        }`}
      >
        {value ? "✓" : "✗"}
      </span>
    </div>
  );
}

/**
 * Info item component
 */
function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="font-semibold text-gray-700 block mb-1">{label}</label>
      <div className="bg-gray-100 p-3 rounded text-sm font-mono break-all text-gray-700">
        {value}
      </div>
    </div>
  );
}
