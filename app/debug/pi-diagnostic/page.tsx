"use client";

/**
 * /debug/pi-diagnostic
 *
 * COMPREHENSIVE Pi SDK Authentication Diagnostic Tool
 * Simplified version that runs automatically on mount
 */

import { useEffect, useState, useRef } from "react";

type DiagnosticResult = {
  category: string;
  check: string;
  status: "pass" | "fail" | "warn" | "info";
  message: string;
  fix?: string;
};

export default function PiDiagnosticPage() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [running, setRunning] = useState(true); // Start with running=true
  const [piObject, setPiObject] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const hasRun = useRef(false);

  const runDiagnostics = async () => {
    if (running) return;
    
    const newResults: DiagnosticResult[] = [];
    setRunning(true);
    setResults([]);

    // Helper to add result
    const add = (result: DiagnosticResult) => {
      newResults.push(result);
      setResults([...newResults]);
    };

    // ========================================
    // CATEGORY 1: ENVIRONMENT DETECTION
    // ========================================
    add({
      category: "Environment",
      check: "Current URL",
      status: "info",
      message: typeof window !== "undefined" ? window.location.href : "SSR",
    });

    add({
      category: "Environment",
      check: "Hostname",
      status: "info",
      message: typeof window !== "undefined" ? window.location.hostname : "SSR",
    });

    add({
      category: "Environment",
      check: "User Agent",
      status: "info",
      message: typeof navigator !== "undefined" ? navigator.userAgent : "SSR",
    });

    // Check if in Pi Browser
    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const isPiBrowser = userAgent.includes("PiBrowser") || userAgent.includes("Pi Network");

    add({
      category: "Environment",
      check: "Pi Browser Detection",
      status: isPiBrowser ? "pass" : "fail",
      message: isPiBrowser
        ? "✅ Running in Pi Browser"
        : "❌ NOT in Pi Browser - Pi SDK requires Pi Browser",
      fix: isPiBrowser ? undefined : "Open this page in Pi Browser (not Chrome/Safari)",
    });

    // ========================================
    // CATEGORY 2: WINDOW.PI OBJECT
    // ========================================
    
    // Wait a moment for Pi SDK to potentially load
    await new Promise(r => setTimeout(r, 2000));
    
    const Pi = (window as any).Pi;
    setPiObject(Pi);

    add({
      category: "Pi SDK",
      check: "window.Pi exists",
      status: Pi ? "pass" : "fail",
      message: Pi ? "✅ window.Pi is available" : "❌ window.Pi is NOT defined",
      fix: Pi ? undefined : "Pi SDK not injected - are you in Pi Browser?",
    });

    if (Pi) {
      add({
        category: "Pi SDK",
        check: "window.Pi type",
        status: "info",
        message: `Type: ${typeof Pi}, Keys: ${Object.keys(Pi).join(", ") || "none"}`,
      });

      // Check for init function
      const hasInit = typeof Pi.init === "function";
      add({
        category: "Pi SDK",
        check: "Pi.init() available",
        status: hasInit ? "pass" : "fail",
        message: hasInit ? "✅ Pi.init() is a function" : "❌ Pi.init() not found",
      });

      // Check for authenticate function
      const hasAuth = typeof Pi.authenticate === "function";
      add({
        category: "Pi SDK",
        check: "Pi.authenticate() available",
        status: hasAuth ? "pass" : "fail",
        message: hasAuth ? "✅ Pi.authenticate() is a function" : "❌ Pi.authenticate() not found",
      });

      // Check for createPayment function
      const hasPayment = typeof Pi.createPayment === "function";
      add({
        category: "Pi SDK",
        check: "Pi.createPayment() available",
        status: hasPayment ? "pass" : "warn",
        message: hasPayment
          ? "✅ Pi.createPayment() is a function"
          : "⚠️ Pi.createPayment() not found (OK if not initialized)",
      });
    }

    // ========================================
    // CATEGORY 3: DOMAIN CONFIGURATION
    // ========================================
    const hostname = typeof window !== "undefined" ? window.location.hostname : "";

    const knownDomains: Record<string, { network: string; expected: boolean }> = {
      "triumphsynergy1991.pinet.com": { network: "testnet", expected: true },
      "triumphsynergy7386.pinet.com": { network: "mainnet", expected: true },
      "triumphsynergy0576.pinet.com": { network: "mainnet", expected: true },
      "triumph-synergy.vercel.app": { network: "mainnet", expected: true },
      "triumph-synergy-testnet.vercel.app": { network: "testnet", expected: true },
      localhost: { network: "testnet", expected: true },
    };

    const domainInfo = knownDomains[hostname];
    add({
      category: "Domain",
      check: "Domain recognized",
      status: domainInfo ? "pass" : "warn",
      message: domainInfo
        ? `✅ ${hostname} is a known ${domainInfo.network} domain`
        : `⚠️ ${hostname} is not in the known domain list`,
    });

    // ========================================
    // CATEGORY 4: TRY Pi.init()
    // ========================================
    if (Pi && typeof Pi.init === "function") {
      add({
        category: "Initialization",
        check: "Attempting Pi.init()",
        status: "info",
        message: "Calling Pi.init() now...",
      });

      const sandbox =
        hostname.includes("testnet") ||
        hostname === "triumphsynergy1991.pinet.com" ||
        hostname === "localhost";

      try {
        await Pi.init({
          version: "2.0",
          sandbox: sandbox,
        });

        add({
          category: "Initialization",
          check: "Pi.init() result",
          status: "pass",
          message: `✅ Pi.init() succeeded! (sandbox: ${sandbox})`,
        });
      } catch (initError: any) {
        add({
          category: "Initialization",
          check: "Pi.init() result",
          status: "fail",
          message: `❌ Pi.init() FAILED: ${initError?.message || initError}`,
          fix: "Check Pi Developer Portal - is your app registered with this domain?",
        });
      }
    }

    // ========================================
    // CATEGORY 5: TRY Pi.authenticate()
    // ========================================
    if (Pi && typeof Pi.authenticate === "function") {
      add({
        category: "Authentication",
        check: "Attempting Pi.authenticate()",
        status: "info",
        message: "Calling Pi.authenticate() now...",
      });

      try {
        const auth = await Pi.authenticate(
          ["username", "payments"],
          (payment: any) => {
            console.log("[Diagnostic] Incomplete payment found:", payment);
          }
        );

        add({
          category: "Authentication",
          check: "Pi.authenticate() result",
          status: "pass",
          message: `✅ AUTHENTICATED! User: ${auth?.user?.username || auth?.user?.uid || "unknown"}`,
        });

        add({
          category: "Authentication",
          check: "Auth user data",
          status: "info",
          message: JSON.stringify(auth?.user, null, 2),
        });

        add({
          category: "Authentication",
          check: "Access token",
          status: auth?.accessToken ? "pass" : "fail",
          message: auth?.accessToken ? "✅ Access token received" : "❌ No access token",
        });
      } catch (authError: any) {
        const errorMsg = authError?.message || String(authError);

        let fix = "";
        if (errorMsg.includes("User cancelled")) {
          fix = "User declined authentication - try again and approve the request";
        } else if (errorMsg.includes("not registered") || errorMsg.includes("not found")) {
          fix = "Your app is NOT registered in Pi Developer Portal - register it at develop.pi";
        } else if (errorMsg.includes("domain") || errorMsg.includes("url")) {
          fix = "Domain not whitelisted in Pi Developer Portal - add this domain to your app settings";
        } else if (errorMsg.includes("sandbox")) {
          fix = "Sandbox mode mismatch - check if you're using testnet app on mainnet or vice versa";
        } else {
          fix = "Check Pi Developer Portal configuration and ensure domain is verified";
        }

        add({
          category: "Authentication",
          check: "Pi.authenticate() result",
          status: "fail",
          message: `❌ AUTHENTICATION FAILED: ${errorMsg}`,
          fix: fix,
        });
      }
    }

    // ========================================
    // CATEGORY 6: VALIDATION KEY CHECK
    // ========================================
    try {
      const validationResponse = await fetch("/validation-key-mainnet.txt");
      const validationKey = await validationResponse.text();

      add({
        category: "Validation",
        check: "Validation key endpoint",
        status: validationResponse.ok ? "pass" : "fail",
        message: validationResponse.ok
          ? `✅ Validation key available (${validationKey.trim().substring(0, 20)}...)`
          : "❌ Validation key endpoint not working",
      });
    } catch (e) {
      add({
        category: "Validation",
        check: "Validation key endpoint",
        status: "fail",
        message: "❌ Could not fetch validation key",
      });
    }

    // ========================================
    // CATEGORY 7: CHECK __piInitialization state
    // ========================================
    const initState = (window as any).__piInitialization;
    if (initState) {
      add({
        category: "Auto-Init",
        check: "__piInitialization status",
        status: initState.status === "ready" ? "pass" : initState.status === "failed" ? "fail" : "warn",
        message: `Status: ${initState.status}, Error: ${initState.error || "none"}`,
      });
    }

    setRunning(false);
  };

  // Auto-run on mount (only once)
  useEffect(() => {
    setMounted(true);
    // Small delay to ensure client is fully hydrated
    const timer = setTimeout(() => {
      if (!hasRun.current) {
        hasRun.current = true;
        runDiagnostics();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Show loading state until mounted
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-xl">Loading Diagnostic Tool...</p>
        </div>
      </div>
    );
  }

  const passCount = results.filter((r) => r.status === "pass").length;
  const failCount = results.filter((r) => r.status === "fail").length;
  const warnCount = results.filter((r) => r.status === "warn").length;

  const statusColors = {
    pass: "bg-green-500",
    fail: "bg-red-500",
    warn: "bg-yellow-500",
    info: "bg-blue-500",
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">🔬 Pi SDK Diagnostic Tool</h1>
        <p className="text-gray-400 mb-6">
          Comprehensive check of Pi SDK authentication
        </p>

        {/* Summary */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6 flex gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500" />
            <span>{passCount} Passed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500" />
            <span>{failCount} Failed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-yellow-500" />
            <span>{warnCount} Warnings</span>
          </div>
          <div className="ml-auto">
            <button
              type="button"
              onClick={() => {
                hasRun.current = false;
                runDiagnostics();
              }}
              disabled={running}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded disabled:opacity-50"
            >
              {running ? "Running..." : "🔄 Re-run Diagnostics"}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-2">
          {results.map((result, idx) => (
            <div
              key={`${result.category}-${result.check}-${idx}`}
              className="bg-gray-800 rounded-lg p-3"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-3 h-3 rounded-full mt-1.5 ${statusColors[result.status]}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-500 uppercase">
                      {result.category}
                    </span>
                    <span className="text-sm font-medium">{result.check}</span>
                  </div>
                  <p className="text-sm text-gray-300 mt-1 whitespace-pre-wrap break-all">
                    {result.message}
                  </p>
                  {result.fix && (
                    <p className="text-sm text-yellow-400 mt-1">
                      💡 Fix: {result.fix}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
          {results.length === 0 && !running && (
            <div className="text-center text-gray-500 py-8">
              Click "Re-run Diagnostics" to start
            </div>
          )}
          {running && results.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              Running diagnostics...
            </div>
          )}
        </div>

        {/* Pi Object Inspector */}
        {piObject && (
          <div className="mt-6 bg-gray-800 rounded-lg p-4">
            <h2 className="text-lg font-bold mb-2">📦 window.Pi Object</h2>
            <pre className="text-xs text-gray-400 overflow-auto max-h-40">
              {JSON.stringify(
                {
                  type: typeof piObject,
                  keys: Object.keys(piObject || {}),
                  init: typeof piObject?.init,
                  authenticate: typeof piObject?.authenticate,
                  createPayment: typeof piObject?.createPayment,
                },
                null,
                2
              )}
            </pre>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-4">
          <h2 className="text-lg font-bold text-yellow-400 mb-2">
            📋 If Authentication Fails:
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
            <li>
              <strong>Open Pi Browser</strong> on your phone (not Chrome/Safari)
            </li>
            <li>
              Go to <code className="bg-gray-800 px-1 rounded">develop.pi</code>
            </li>
            <li>
              <strong>Create/find your app</strong> called "Triumph Synergy"
            </li>
            <li>
              <strong>Add this domain</strong> to your app's allowed URLs:
              <code className="block bg-gray-800 px-2 py-1 rounded mt-1">
                {typeof window !== "undefined" ? window.location.hostname : "loading..."}
              </code>
            </li>
            <li>
              <strong>Verify the domain</strong> using the validation key URL:
              <code className="block bg-gray-800 px-2 py-1 rounded mt-1">
                {typeof window !== "undefined"
                  ? `${window.location.origin}/validation-key-mainnet.txt`
                  : "loading..."}
              </code>
            </li>
            <li>
              <strong>Make sure sandbox mode matches:</strong>
              <ul className="ml-4 mt-1">
                <li>• Testnet domains → sandbox: true</li>
                <li>• Mainnet domains → sandbox: false</li>
              </ul>
            </li>
          </ol>
        </div>

        {/* Developer Portal Link */}
        <div className="mt-6 text-center">
          <a
            href="https://develop.pi"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium"
          >
            🚀 Open Pi Developer Portal
          </a>
        </div>
      </div>
    </div>
  );
}
