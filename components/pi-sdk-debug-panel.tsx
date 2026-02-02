"use client";

import { useEffect, useState } from "react";
import { getNetworkConfig } from "@/lib/pi-sdk/domain-config";

type PiInitState = {
  status: string;
  initialized?: boolean;
  authenticated?: boolean;
  error?: string;
  startTime?: number;
  duration?: number;
};

type PiAuthUser = {
  uid: string;
  username?: string;
};

type DomainInfo = {
  hostname: string;
  network: "testnet" | "mainnet";
  sandbox: boolean;
  isPiBrowser: boolean;
  piSdkLoaded: boolean;
};

type StatusLog = {
  timestamp: Date;
  message: string;
  type: "info" | "success" | "error" | "warning";
};

/**
 * Pi SDK Debug Panel
 *
 * A comprehensive on-screen debug panel that shows:
 * - Current domain and network detection
 * - Pi SDK loading status
 * - Initialization and authentication status
 * - User info when authenticated
 * - Real-time status logs
 * - Manual test buttons
 *
 * This panel helps verify Pi SDK is working across all 5 domains:
 * - triumphsynergy1991.pinet.com (PINET testnet)
 * - triumphsynergy7386.pinet.com (PINET mainnet)
 * - triumphsynergy0576.pinet.com (PINET mainnet)
 * - triumph-synergy.vercel.app (Vercel mainnet)
 * - triumph-synergy-testnet.vercel.app (Vercel testnet)
 */
export function PiSdkDebugPanel() {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [domainInfo, setDomainInfo] = useState<DomainInfo | null>(null);
  const [initState, setInitState] = useState<PiInitState | null>(null);
  const [authUser, setAuthUser] = useState<PiAuthUser | null>(null);
  const [logs, setLogs] = useState<StatusLog[]>([]);
  const [testPaymentStatus, setTestPaymentStatus] = useState<string>("");

  // Wait for mount before doing any window access
  useEffect(() => {
    setMounted(true);
  }, []);

  // Add a log entry
  const addLog = (
    message: string,
    type: "info" | "success" | "error" | "warning" = "info"
  ) => {
    setLogs((prev) =>
      [{ timestamp: new Date(), message, type }, ...prev].slice(0, 50)
    );
  };

  // Detect domain and network using centralized config
  const detectDomainInfo = (): DomainInfo => {
    const config = getNetworkConfig();

    const isPiBrowser =
      typeof window !== "undefined" &&
      (navigator.userAgent.includes("PiBrowser") ||
        navigator.userAgent.includes("Pi Network") ||
        !!(window as any).Pi);

    const piSdkLoaded = typeof window !== "undefined" && !!(window as any).Pi;

    return {
      hostname: config.hostname,
      network: config.network,
      sandbox: config.sandbox,
      isPiBrowser,
      piSdkLoaded,
    };
  };

  // Check Pi initialization state
  const checkInitState = () => {
    if (typeof window === "undefined") {
      return null;
    }
    return (window as any).__piInitialization as PiInitState | null;
  };

  // Manual Pi SDK initialization test
  const testPiInit = async () => {
    addLog("🔄 Testing Pi.init()...", "info");

    if (typeof window === "undefined") {
      addLog("❌ Window not available", "error");
      return;
    }

    const Pi = (window as any).Pi;
    if (!Pi) {
      addLog("❌ window.Pi not loaded - Are you in Pi Browser?", "error");
      return;
    }

    try {
      const config = getNetworkConfig();
      addLog(`📍 Domain: ${config.hostname}`, "info");
      addLog(`🌐 Network: ${config.network}`, "info");
      addLog(`🧪 Sandbox: ${config.sandbox}`, "info");

      await Pi.init({
        version: "2.0",
        sandbox: config.sandbox,
      });
      addLog("✅ Pi.init() SUCCESS", "success");
    } catch (err) {
      addLog(`❌ Pi.init() FAILED: ${err}`, "error");
    }
  };

  // Manual Pi authentication test
  const testPiAuth = async () => {
    addLog("🔄 Testing Pi.authenticate()...", "info");

    if (typeof window === "undefined") {
      addLog("❌ Window not available", "error");
      return;
    }

    const Pi = (window as any).Pi;
    if (!Pi) {
      addLog("❌ window.Pi not loaded - Are you in Pi Browser?", "error");
      return;
    }

    try {
      const auth = await Pi.authenticate(["payments"], (payment: any) => {
        addLog(`⚠️ Incomplete payment found: ${payment.identifier}`, "warning");
      });

      setAuthUser(auth.user);
      addLog(`✅ AUTHENTICATED! User: ${auth.user.uid}`, "success");
      if (auth.user.username) {
        addLog(`👤 Username: ${auth.user.username}`, "info");
      }
      addLog(`🔑 Access Token: ${auth.accessToken.slice(0, 20)}...`, "info");
    } catch (err) {
      addLog(`❌ Authentication FAILED: ${err}`, "error");
    }
  };

  // Test payment creation (sandbox only)
  const testCreatePayment = async () => {
    addLog("🔄 Testing Pi.createPayment()...", "info");
    setTestPaymentStatus("Creating...");

    if (typeof window === "undefined") {
      addLog("❌ Window not available", "error");
      setTestPaymentStatus("Failed");
      return;
    }

    const Pi = (window as any).Pi;
    if (!Pi) {
      addLog("❌ window.Pi not loaded", "error");
      setTestPaymentStatus("Failed");
      return;
    }

    const info = detectDomainInfo();
    if (!info.sandbox) {
      addLog("⚠️ Test payment skipped - Not in sandbox/testnet mode", "warning");
      setTestPaymentStatus("Skipped (mainnet)");
      return;
    }

    try {
      const payment = await Pi.createPayment(
        {
          amount: 0.01,
          memo: "Debug Panel Test Payment",
          metadata: { test: true, timestamp: Date.now() },
        },
        {
          onReadyForServerApproval: (paymentId: string) => {
            addLog(`📋 Payment ready for approval: ${paymentId}`, "info");
            setTestPaymentStatus(`Approving: ${paymentId.slice(0, 8)}...`);
          },
          onReadyForServerCompletion: (paymentId: string, txid: string) => {
            addLog(`✅ Payment completed! TxID: ${txid}`, "success");
            setTestPaymentStatus(`Complete: ${txid.slice(0, 8)}...`);
          },
          onCancel: (paymentId: string) => {
            addLog(`⚠️ Payment cancelled: ${paymentId}`, "warning");
            setTestPaymentStatus("Cancelled");
          },
          onError: (error: Error) => {
            addLog(`❌ Payment error: ${error.message}`, "error");
            setTestPaymentStatus(`Error: ${error.message}`);
          },
        }
      );

      addLog(`✅ Payment initiated: ${payment.identifier}`, "success");
    } catch (err) {
      addLog(`❌ createPayment FAILED: ${err}`, "error");
      setTestPaymentStatus("Failed");
    }
  };

  // Full SDK test sequence
  const runFullTest = async () => {
    addLog("🚀 Starting FULL Pi SDK Test Sequence...", "info");
    addLog("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "info");

    // Step 1: Check domain
    const info = detectDomainInfo();
    setDomainInfo(info);
    addLog(`📍 Domain: ${info.hostname}`, "info");
    addLog(`🌐 Network: ${info.network}`, "info");
    addLog(`🧪 Sandbox: ${info.sandbox}`, "info");
    addLog(
      `📱 Pi Browser: ${info.isPiBrowser ? "YES" : "NO"}`,
      info.isPiBrowser ? "success" : "warning"
    );
    addLog(
      `📦 Pi SDK Loaded: ${info.piSdkLoaded ? "YES" : "NO"}`,
      info.piSdkLoaded ? "success" : "error"
    );

    if (!info.piSdkLoaded) {
      addLog("❌ STOPPING: Pi SDK not loaded. Open in Pi Browser!", "error");
      return;
    }

    // Step 2: Test init
    await testPiInit();
    await new Promise((r) => setTimeout(r, 500));

    // Step 3: Test auth
    await testPiAuth();
    await new Promise((r) => setTimeout(r, 500));

    // Step 4: Check window.__piInitialization
    const state = checkInitState();
    if (state) {
      setInitState(state);
      addLog(
        `📊 Init State: ${state.status}`,
        state.status === "ready" ? "success" : "warning"
      );
      if (state.duration) {
        addLog(`⏱️ Init Duration: ${state.duration}ms`, "info");
      }
    }

    addLog("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "info");
    addLog("✅ Full test sequence complete!", "success");
  };

  // Poll for status updates
  // biome-ignore lint/correctness/useExhaustiveDependencies: Run only once on mount
  useEffect(() => {
    if (!mounted) return;
    
    const updateStatus = () => {
      setDomainInfo(detectDomainInfo());
      setInitState(checkInitState());
    };

    updateStatus();
    const interval = setInterval(updateStatus, 1000);

    // Listen for Pi events
    const handlePiReady = (e: CustomEvent) => {
      addLog("🎉 Pi SDK Ready Event received!", "success");
      if (e.detail?.user) {
        setAuthUser(e.detail.user);
      }
    };

    const handlePiError = (e: CustomEvent) => {
      addLog(
        `❌ Pi SDK Error Event: ${e.detail?.message || e.detail}`,
        "error"
      );
    };

    window.addEventListener("piReady", handlePiReady as EventListener);
    window.addEventListener("piError", handlePiError as EventListener);

    // Initial log
    addLog("🔍 Pi SDK Debug Panel initialized", "info");

    return () => {
      clearInterval(interval);
      window.removeEventListener("piReady", handlePiReady as EventListener);
      window.removeEventListener("piError", handlePiError as EventListener);
    };
  }, []);

  if (!isOpen) {
    return (
      <button
        className="fixed right-4 bottom-4 z-[9999] rounded-full bg-purple-600 px-4 py-2 text-white shadow-lg transition-colors hover:bg-purple-700"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        🔧 Pi Debug
      </button>
    );
  }

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case "ready":
        return "text-green-400";
      case "failed":
        return "text-red-400";
      case "initializing":
        return "text-yellow-400";
      default:
        return "text-gray-400";
    }
  };

  const getStatusEmoji = (status: string | undefined) => {
    switch (status) {
      case "ready":
        return "✅";
      case "failed":
        return "❌";
      case "initializing":
        return "⏳";
      default:
        return "❓";
    }
  };

  return (
    <div className="fixed right-4 bottom-4 z-[9999] max-h-[90vh] w-[420px] overflow-hidden rounded-lg border border-purple-500 bg-gray-900 font-mono text-sm text-white shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between bg-purple-700 px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔧</span>
          <span className="font-bold">Pi SDK Debug Panel</span>
        </div>
        <div className="flex gap-2">
          <button
            className="rounded px-2 py-1 hover:bg-purple-600"
            onClick={() => setIsMinimized(!isMinimized)}
            type="button"
          >
            {isMinimized ? "▲" : "▼"}
          </button>
          <button
            className="rounded px-2 py-1 hover:bg-purple-600"
            onClick={() => setIsOpen(false)}
            type="button"
          >
            ✕
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="max-h-[calc(90vh-48px)] overflow-y-auto">
          {/* Domain & Network Info */}
          <div className="border-gray-700 border-b p-4">
            <h3 className="mb-2 font-bold text-purple-300">
              📍 Domain Detection
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded bg-gray-800 p-2">
                <span className="text-gray-400">Hostname:</span>
                <div className="break-all text-cyan-300">
                  {domainInfo?.hostname || "Loading..."}
                </div>
              </div>
              <div className="rounded bg-gray-800 p-2">
                <span className="text-gray-400">Network:</span>
                <div
                  className={
                    domainInfo?.network === "mainnet"
                      ? "text-green-400"
                      : "text-yellow-400"
                  }
                >
                  {domainInfo?.network?.toUpperCase() || "..."}
                </div>
              </div>
              <div className="rounded bg-gray-800 p-2">
                <span className="text-gray-400">Sandbox:</span>
                <div
                  className={
                    domainInfo?.sandbox ? "text-yellow-400" : "text-green-400"
                  }
                >
                  {domainInfo?.sandbox ? "TRUE (test)" : "FALSE (real)"}
                </div>
              </div>
              <div className="rounded bg-gray-800 p-2">
                <span className="text-gray-400">Pi Browser:</span>
                <div
                  className={
                    domainInfo?.isPiBrowser ? "text-green-400" : "text-red-400"
                  }
                >
                  {domainInfo?.isPiBrowser ? "✅ YES" : "❌ NO"}
                </div>
              </div>
            </div>
          </div>

          {/* SDK Status */}
          <div className="border-gray-700 border-b p-4">
            <h3 className="mb-2 font-bold text-purple-300">📦 SDK Status</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded bg-gray-800 p-2">
                <span className="text-gray-400">window.Pi:</span>
                <div
                  className={
                    domainInfo?.piSdkLoaded ? "text-green-400" : "text-red-400"
                  }
                >
                  {domainInfo?.piSdkLoaded ? "✅ LOADED" : "❌ NOT LOADED"}
                </div>
              </div>
              <div className="rounded bg-gray-800 p-2">
                <span className="text-gray-400">Init Status:</span>
                <div className={getStatusColor(initState?.status)}>
                  {getStatusEmoji(initState?.status)}{" "}
                  {initState?.status || "unknown"}
                </div>
              </div>
              <div className="rounded bg-gray-800 p-2">
                <span className="text-gray-400">Initialized:</span>
                <div
                  className={
                    initState?.initialized ? "text-green-400" : "text-gray-500"
                  }
                >
                  {initState?.initialized ? "✅ YES" : "⏳ NO"}
                </div>
              </div>
              <div className="rounded bg-gray-800 p-2">
                <span className="text-gray-400">Authenticated:</span>
                <div
                  className={
                    initState?.authenticated
                      ? "text-green-400"
                      : "text-gray-500"
                  }
                >
                  {initState?.authenticated ? "✅ YES" : "⏳ NO"}
                </div>
              </div>
            </div>

            {initState?.error && (
              <div className="mt-2 rounded border border-red-500 bg-red-900/50 p-2 text-red-300 text-xs">
                ❌ Error: {initState.error}
              </div>
            )}

            {initState?.duration && (
              <div className="mt-2 text-gray-400 text-xs">
                ⏱️ Initialization took: {initState.duration}ms
              </div>
            )}
          </div>

          {/* User Info */}
          {authUser && (
            <div className="border-gray-700 border-b p-4">
              <h3 className="mb-2 font-bold text-purple-300">
                👤 Authenticated User
              </h3>
              <div className="rounded border border-green-500 bg-green-900/30 p-3">
                <div className="text-xs">
                  <span className="text-gray-400">UID:</span>{" "}
                  <span className="text-green-300">{authUser.uid}</span>
                </div>
                {authUser.username && (
                  <div className="mt-1 text-xs">
                    <span className="text-gray-400">Username:</span>{" "}
                    <span className="text-green-300">@{authUser.username}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Test Buttons */}
          <div className="border-gray-700 border-b p-4">
            <h3 className="mb-2 font-bold text-purple-300">🧪 Manual Tests</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                className="rounded bg-purple-600 px-3 py-2 font-bold text-xs transition-colors hover:bg-purple-700"
                onClick={runFullTest}
                type="button"
              >
                🚀 Run Full Test
              </button>
              <button
                className="rounded bg-blue-600 px-3 py-2 text-xs transition-colors hover:bg-blue-700"
                onClick={testPiInit}
                type="button"
              >
                🔧 Test Pi.init()
              </button>
              <button
                className="rounded bg-green-600 px-3 py-2 text-xs transition-colors hover:bg-green-700"
                onClick={testPiAuth}
                type="button"
              >
                🔐 Test Authenticate
              </button>
              <button
                className="rounded bg-orange-600 px-3 py-2 text-xs transition-colors hover:bg-orange-700"
                onClick={testCreatePayment}
                type="button"
              >
                💰 Test Payment
              </button>
            </div>
            {testPaymentStatus && (
              <div className="mt-2 text-xs text-yellow-300">
                Payment Status: {testPaymentStatus}
              </div>
            )}
          </div>

          {/* Expected Domains Reference */}
          <div className="border-gray-700 border-b p-4">
            <h3 className="mb-2 font-bold text-purple-300">
              📋 Expected Domains
            </h3>
            <div className="space-y-1 text-xs">
              <div
                className={
                  domainInfo?.hostname === "triumphsynergy1991.pinet.com"
                    ? "font-bold text-green-400"
                    : "text-gray-500"
                }
              >
                {domainInfo?.hostname === "triumphsynergy1991.pinet.com"
                  ? "▶"
                  : "○"}{" "}
                triumphsynergy1991.pinet.com (PINET testnet)
              </div>
              <div
                className={
                  domainInfo?.hostname === "triumphsynergy7386.pinet.com"
                    ? "font-bold text-green-400"
                    : "text-gray-500"
                }
              >
                {domainInfo?.hostname === "triumphsynergy7386.pinet.com"
                  ? "▶"
                  : "○"}{" "}
                triumphsynergy7386.pinet.com (PINET mainnet)
              </div>
              <div
                className={
                  domainInfo?.hostname === "triumphsynergy0576.pinet.com"
                    ? "font-bold text-green-400"
                    : "text-gray-500"
                }
              >
                {domainInfo?.hostname === "triumphsynergy0576.pinet.com"
                  ? "▶"
                  : "○"}{" "}
                triumphsynergy0576.pinet.com (PINET mainnet)
              </div>
              <div
                className={
                  domainInfo?.hostname === "triumph-synergy.vercel.app"
                    ? "font-bold text-green-400"
                    : "text-gray-500"
                }
              >
                {domainInfo?.hostname === "triumph-synergy.vercel.app"
                  ? "▶"
                  : "○"}{" "}
                triumph-synergy.vercel.app (Vercel mainnet)
              </div>
              <div
                className={
                  domainInfo?.hostname === "triumph-synergy-testnet.vercel.app"
                    ? "font-bold text-green-400"
                    : "text-gray-500"
                }
              >
                {domainInfo?.hostname === "triumph-synergy-testnet.vercel.app"
                  ? "▶"
                  : "○"}{" "}
                triumph-synergy-testnet.vercel.app (Vercel testnet)
              </div>
            </div>
          </div>

          {/* Status Logs */}
          <div className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-bold text-purple-300">📜 Status Logs</h3>
              <button
                className="text-gray-400 text-xs hover:text-white"
                onClick={() => setLogs([])}
                type="button"
              >
                Clear
              </button>
            </div>
            <div className="max-h-[200px] space-y-1 overflow-y-auto rounded bg-black/50 p-2 text-xs">
              {logs.length === 0 ? (
                <div className="text-gray-500 italic">
                  No logs yet. Run a test!
                </div>
              ) : (
                logs.map((log, i) => (
                  <div
                    className={`${
                      log.type === "success"
                        ? "text-green-400"
                        : log.type === "error"
                          ? "text-red-400"
                          : log.type === "warning"
                            ? "text-yellow-400"
                            : "text-gray-300"
                    }`}
                    key={`${log.timestamp.getTime()}-${i}`}
                  >
                    <span className="text-gray-600">
                      {log.timestamp.toLocaleTimeString()}
                    </span>{" "}
                    {log.message}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-800 p-2 text-center text-gray-500 text-xs">
            Pi SDK Debug Panel v1.0 | Triumph Synergy
          </div>
        </div>
      )}
    </div>
  );
}

export default PiSdkDebugPanel;
