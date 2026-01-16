"use client";

import { useEffect, useState } from "react";

export default function PiBrowserCheckPage() {
  const [info, setInfo] = useState<{
    userAgent: string;
    isPiBrowser: boolean;
    piGlobalExists: boolean;
    piNetworkExists: boolean;
    sdkStatus: string;
    cdnAttempts: Array<{ url: string; status: string }>;
    appId: string;
    origin: string;
  }>({
    userAgent: "",
    isPiBrowser: false,
    piGlobalExists: false,
    piNetworkExists: false,
    sdkStatus: "checking",
    cdnAttempts: [],
    appId: "",
    origin: "",
  });

  useEffect(() => {
    const checkPiBrowser = async () => {
      const userAgent = navigator.userAgent;
      const isPiBrowser = userAgent.includes("PiBrowser") || 
                         userAgent.includes("Pi Network") ||
                         (window as any).PiNetwork !== undefined;
      
      const piGlobalExists = !!(window as any).Pi;
      const piNetworkExists = !!(window as any).PiNetwork;
      const appId = process.env.NEXT_PUBLIC_PI_APP_ID || "";
      const origin = window.location.origin;

      // Try loading SDK from multiple sources
      const cdnUrls = [
        "https://sdk.minepi.com/pi-sdk.js",
        "https://cdn.jsdelivr.net/npm/@pi-network/sdk@2.0/dist/pi-sdk.js",
        "https://unpkg.com/@pi-network/sdk@2.0/dist/pi-sdk.js",
      ];

      const cdnAttempts: Array<{ url: string; status: string }> = [];

      for (const url of cdnUrls) {
        try {
          const response = await fetch(url, { method: "HEAD" });
          cdnAttempts.push({
            url,
            status: response.ok ? "✅ Available" : `❌ Error ${response.status}`,
          });
          if (response.ok) break;
        } catch (err) {
          cdnAttempts.push({ url, status: "❌ Failed to fetch" });
        }
      }

      // Check if SDK loaded
      let sdkStatus = "❌ Not loaded";
      if (piGlobalExists) {
        sdkStatus = "✅ Loaded";
      } else {
        // Wait a bit to see if it loads
        await new Promise((r) => setTimeout(r, 2000));
        if ((window as any).Pi) {
          sdkStatus = "✅ Loaded (delayed)";
        }
      }

      setInfo({
        userAgent,
        isPiBrowser,
        piGlobalExists: !!(window as any).Pi,
        piNetworkExists,
        sdkStatus,
        cdnAttempts,
        appId,
        origin,
      });
    };

    checkPiBrowser();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 p-8 text-gray-100">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="border-b-2 border-blue-500 pb-4">
          <h1 className="text-4xl font-bold">🔍 Pi Browser Detection</h1>
          <p className="mt-2 text-gray-400">Real-time Pi Network integration status</p>
        </div>

        {/* Critical Info Banner */}
        <div className={`rounded-lg p-6 ${info.isPiBrowser ? 'bg-green-900/30 border border-green-500' : 'bg-red-900/30 border border-red-500'}`}>
          <div className="text-2xl font-bold">
            {info.isPiBrowser ? '✅ Pi Browser Detected' : '❌ Not Pi Browser'}
          </div>
          <div className="mt-2 text-sm text-gray-300">
            To use Pi Network payments, you must access this app from Pi Browser
          </div>
        </div>

        {/* App Configuration */}
        <div className="rounded-lg bg-gray-800 border border-gray-700 p-6">
          <h2 className="text-xl font-bold mb-4">📱 App Configuration</h2>
          <div className="space-y-2 font-mono text-sm">
            <div className="flex justify-between border-b border-gray-700 pb-2">
              <span className="text-gray-400">App ID:</span>
              <span className={info.appId ? 'text-green-400' : 'text-red-400'}>
                {info.appId || '❌ NOT SET'}
              </span>
            </div>
            <div className="flex justify-between border-b border-gray-700 pb-2">
              <span className="text-gray-400">Origin:</span>
              <span className="text-blue-400">{info.origin}</span>
            </div>
          </div>
        </div>

        {/* Environment Detection */}
        <div className="rounded-lg bg-gray-800 border border-gray-700 p-6">
          <h2 className="text-xl font-bold mb-4">🌐 Environment Detection</h2>
          <div className="space-y-3">
            <StatusRow label="window.Pi" status={info.piGlobalExists} />
            <StatusRow label="window.PiNetwork" status={info.piNetworkExists} />
            <div className="flex justify-between items-center border-b border-gray-700 pb-2">
              <span className="text-gray-300">SDK Status:</span>
              <span className={info.sdkStatus.includes('✅') ? 'text-green-400' : 'text-red-400'}>
                {info.sdkStatus}
              </span>
            </div>
          </div>
        </div>

        {/* User Agent */}
        <div className="rounded-lg bg-gray-800 border border-gray-700 p-6">
          <h2 className="text-xl font-bold mb-4">🔎 User Agent</h2>
          <div className="font-mono text-xs text-gray-300 break-all bg-gray-900 p-4 rounded">
            {info.userAgent || "Loading..."}
          </div>
          <div className="mt-3 text-sm text-gray-400">
            {info.isPiBrowser ? (
              <span className="text-green-400">✅ Contains Pi Browser identifiers</span>
            ) : (
              <span className="text-red-400">❌ No Pi Browser identifiers found</span>
            )}
          </div>
        </div>

        {/* CDN Status */}
        <div className="rounded-lg bg-gray-800 border border-gray-700 p-6">
          <h2 className="text-xl font-bold mb-4">📡 Pi SDK CDN Status</h2>
          <div className="space-y-2">
            {info.cdnAttempts.map((attempt, i) => (
              <div key={i} className="border-b border-gray-700 pb-2">
                <div className="text-sm font-mono text-gray-400">{attempt.url}</div>
                <div className="text-sm mt-1">{attempt.status}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="rounded-lg bg-blue-900/20 border border-blue-500/50 p-6">
          <h2 className="text-xl font-bold mb-3">📖 How to Access</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
            <li>Open Pi Browser app on your mobile device</li>
            <li>Navigate to: <code className="bg-gray-800 px-2 py-1 rounded text-blue-300">{info.origin}</code></li>
            <li>Reload this page to see updated detection results</li>
            <li>If detected, you can use the payment features</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

function StatusRow({ label, status }: { label: string; status: boolean }) {
  return (
    <div className="flex justify-between items-center border-b border-gray-700 pb-2">
      <span className="text-gray-300">{label}:</span>
      <span className={status ? "text-green-400" : "text-red-400"}>
        {status ? "✅ Exists" : "❌ Not found"}
      </span>
    </div>
  );
}
