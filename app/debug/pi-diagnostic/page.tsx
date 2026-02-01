"use client";

/**
 * /debug/pi-diagnostic
 *
 * COMPREHENSIVE Pi SDK Authentication Diagnostic Tool
 *
 * This page helps diagnose WHY authentication isn't working.
 * Run this in Pi Browser to see exactly what's happening.
 */

import { useCallback, useEffect, useState } from "react";

type DiagnosticResult = {
  category: string;
  check: string;
  status: "pass" | "fail" | "warn" | "info";
  message: string;
  fix?: string;
};

export default function PiDiagnosticPage() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [running, setRunning] = useState(false);
  const [piObject, setPiObject] = useState<any>(null);

  const addResult = useCallback((result: DiagnosticResult) => {
    setResults((prev) => [...prev, result]);
  }, []);

  const runDiagnostics = useCallback(async () => {
    setResults([]);
    setRunning(true);

    // ========================================
    // CATEGORY 1: ENVIRONMENT DETECTION
    // ========================================
    addResult({
      category: "Environment",
      check: "Current URL",
      status: "info",
      message: typeof window !== "undefined" ? window.location.href : "SSR",
    });

    addResult({
      category: "Environment",
      check: "Hostname",
      status: "info",
      message: typeof window !== "undefined" ? window.location.hostname : "SSR",
    });

    addResult({
      category: "Environment",
      check: "User Agent",
      status: "info",
      message: typeof navigator !== "undefined" ? navigator.userAgent : "SSR",
    });

    // Check if in Pi Browser
    const userAgent =
      typeof navigator !== "undefined" ? navigator.userAgent : "";
    const isPiBrowser =
      userAgent.includes("PiBrowser") || userAgent.includes("Pi Network");

    addResult({
      category: "Environment",
      check: "Pi Browser Detection",
      status: isPiBrowser ? "pass" : "fail",
      message: isPiBrowser
        ? "✅ Running in Pi Browser"
        : "❌ NOT in Pi Browser - Pi SDK requires Pi Browser",
      fix: isPiBrowser
        ? undefined
        : "Open this page in Pi Browser (not Chrome/Safari)",
    });

    // ========================================
    // CATEGORY 2: WINDOW.PI OBJECT
    // ========================================
    const Pi = (window as any).Pi;
    setPiObject(Pi);

    addResult({
      category: "Pi SDK",
      check: "window.Pi exists",
      status: Pi ? "pass" : "fail",
      message: Pi ? "✅ window.Pi is available" : "❌ window.Pi is NOT defined",
      fix: Pi ? undefined : "Pi SDK not injected - are you in Pi Browser?",
    });

    if (Pi) {
      addResult({
        category: "Pi SDK",
        check: "window.Pi type",
        status: "info",
        message: `Type: ${typeof Pi}, Keys: ${Object.keys(Pi).join(", ")}`,
      });

      // Check for init function
      const hasInit = typeof Pi.init === "function";
      addResult({
        category: "Pi SDK",
        check: "Pi.init() available",
        status: hasInit ? "pass" : "fail",
        message: hasInit
          ? "✅ Pi.init() is a function"
          : "❌ Pi.init() not found",
      });

      // Check for authenticate function
      const hasAuth = typeof Pi.authenticate === "function";
      addResult({
        category: "Pi SDK",
        check: "Pi.authenticate() available",
        status: hasAuth ? "pass" : "fail",
        message: hasAuth
          ? "✅ Pi.authenticate() is a function"
          : "❌ Pi.authenticate() not found",
      });

      // Check for createPayment function
      const hasPayment = typeof Pi.createPayment === "function";
      addResult({
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
    const hostname =
      typeof window !== "undefined" ? window.location.hostname : "";

    const knownDomains: Record<string, { network: string; expected: boolean }> =
      {
        "triumphsynergy1991.pinet.com": { network: "testnet", expected: true },
        "triumphsynergy7386.pinet.com": { network: "mainnet", expected: true },
        "triumphsynergy0576.pinet.com": { network: "mainnet", expected: true },
        "triumph-synergy.vercel.app": { network: "mainnet", expected: true },
        "triumph-synergy-testnet.vercel.app": {
          network: "testnet",
          expected: true,
        },
        localhost: { network: "testnet", expected: true },
      };

    const domainInfo = knownDomains[hostname];
    addResult({
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
      addResult({
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
          sandbox,
        });

        addResult({
          category: "Initialization",
          check: "Pi.init() result",
          status: "pass",
          message: `✅ Pi.init() succeeded! (sandbox: ${sandbox})`,
        });
      } catch (initError: any) {
        addResult({
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
      addResult({
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
            addResult({
              category: "Authentication",
              check: "Incomplete payment",
              status: "warn",
              message: `Found incomplete payment: ${payment?.identifier || "unknown"}`,
            });
          }
        );

        addResult({
          category: "Authentication",
          check: "Pi.authenticate() result",
          status: "pass",
          message: `✅ AUTHENTICATED! User: ${auth?.user?.username || auth?.user?.uid || "unknown"}`,
        });

        addResult({
          category: "Authentication",
          check: "Auth user data",
          status: "info",
          message: JSON.stringify(auth?.user, null, 2),
        });

        addResult({
          category: "Authentication",
          check: "Access token",
          status: auth?.accessToken ? "pass" : "fail",
          message: auth?.accessToken
            ? "✅ Access token received"
            : "❌ No access token",
        });
      } catch (authError: any) {
        const errorMsg = authError?.message || String(authError);

        // Parse common errors
        let fix = "";
        if (errorMsg.includes("User cancelled")) {
          fix =
            "User declined authentication - try again and approve the request";
        } else if (
          errorMsg.includes("not registered") ||
          errorMsg.includes("not found")
        ) {
          fix =
            "Your app is NOT registered in Pi Developer Portal - register it at develop.pi";
        } else if (errorMsg.includes("domain") || errorMsg.includes("url")) {
          fix =
            "Domain not whitelisted in Pi Developer Portal - add this domain to your app settings";
        } else if (errorMsg.includes("sandbox")) {
          fix =
            "Sandbox mode mismatch - check if you're using testnet app on mainnet or vice versa";
        } else {
          fix =
            "Check Pi Developer Portal configuration and ensure domain is verified";
        }

        addResult({
          category: "Authentication",
          check: "Pi.authenticate() result",
          status: "fail",
          message: `❌ AUTHENTICATION FAILED: ${errorMsg}`,
          fix,
        });
      }
    }

    // ========================================
    // CATEGORY 6: VALIDATION KEY CHECK
    // ========================================
    try {
      const validationResponse = await fetch("/validation-key-mainnet.txt");
      const validationKey = await validationResponse.text();

      addResult({
        category: "Validation",
        check: "Validation key endpoint",
        status: validationResponse.ok ? "pass" : "fail",
        message: validationResponse.ok
          ? `✅ Validation key available (${validationKey.trim().substring(0, 20)}...)`
          : "❌ Validation key endpoint not working",
      });
    } catch (e) {
      addResult({
        category: "Validation",
        check: "Validation key endpoint",
        status: "fail",
        message: "❌ Could not fetch validation key",
      });
    }

    // ========================================
    // FINAL SUMMARY
    // ========================================
    setRunning(false);
  }, [addResult]);

  // Auto-run on mount
  useEffect(() => {
    runDiagnostics();
  }, [runDiagnostics]);

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
    <div className="min-h-screen bg-gray-900 p-4 text-white">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-2 font-bold text-3xl">🔬 Pi SDK Diagnostic Tool</h1>
        <p className="mb-6 text-gray-400">
          Comprehensive check of Pi SDK authentication
        </p>

        {/* Summary */}
        <div className="mb-6 flex gap-4 rounded-lg bg-gray-800 p-4">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-green-500" />
            <span>{passCount} Passed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-red-500" />
            <span>{failCount} Failed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-yellow-500" />
            <span>{warnCount} Warnings</span>
          </div>
          <div className="ml-auto">
            <button
              className="rounded bg-purple-600 px-4 py-2 hover:bg-purple-700 disabled:opacity-50"
              disabled={running}
              onClick={runDiagnostics}
              type="button"
            >
              {running ? "Running..." : "🔄 Re-run Diagnostics"}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-2">
          {results.map((result, idx) => (
            <div
              className="rounded-lg bg-gray-800 p-3"
              key={`${result.category}-${result.check}-${idx}`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-1.5 h-3 w-3 rounded-full ${statusColors[result.status]}`}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-xs uppercase">
                      {result.category}
                    </span>
                    <span className="font-medium text-sm">{result.check}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-all text-gray-300 text-sm">
                    {result.message}
                  </p>
                  {result.fix && (
                    <p className="mt-1 text-sm text-yellow-400">
                      💡 Fix: {result.fix}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pi Object Inspector */}
        {piObject && (
          <div className="mt-6 rounded-lg bg-gray-800 p-4">
            <h2 className="mb-2 font-bold text-lg">📦 window.Pi Object</h2>
            <pre className="max-h-40 overflow-auto text-gray-400 text-xs">
              {JSON.stringify(
                {
                  type: typeof piObject,
                  keys: Object.keys(piObject),
                  init: typeof piObject.init,
                  authenticate: typeof piObject.authenticate,
                  createPayment: typeof piObject.createPayment,
                },
                null,
                2
              )}
            </pre>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 rounded-lg border border-yellow-500/50 bg-yellow-900/30 p-4">
          <h2 className="mb-2 font-bold text-lg text-yellow-400">
            📋 If Authentication Fails:
          </h2>
          <ol className="list-inside list-decimal space-y-2 text-gray-300 text-sm">
            <li>
              <strong>Open Pi Browser</strong> on your phone (not Chrome/Safari)
            </li>
            <li>
              Go to <code className="rounded bg-gray-800 px-1">develop.pi</code>
            </li>
            <li>
              <strong>Create/find your app</strong> called "Triumph Synergy"
            </li>
            <li>
              <strong>Add this domain</strong> to your app's allowed URLs:
              <code className="mt-1 block rounded bg-gray-800 px-2 py-1">
                {typeof window !== "undefined"
                  ? window.location.hostname
                  : "loading..."}
              </code>
            </li>
            <li>
              <strong>Verify the domain</strong> using the validation key URL:
              <code className="mt-1 block rounded bg-gray-800 px-2 py-1">
                {typeof window !== "undefined"
                  ? `${window.location.origin}/validation-key-mainnet.txt`
                  : "loading..."}
              </code>
            </li>
            <li>
              <strong>Make sure sandbox mode matches:</strong>
              <ul className="mt-1 ml-4">
                <li>• Testnet domains → sandbox: true</li>
                <li>• Mainnet domains → sandbox: false</li>
              </ul>
            </li>
          </ol>
        </div>

        {/* Developer Portal Link */}
        <div className="mt-6 text-center">
          <a
            className="inline-block rounded-lg bg-purple-600 px-6 py-3 font-medium hover:bg-purple-700"
            href="https://develop.pi"
            rel="noopener noreferrer"
            target="_blank"
          >
            🚀 Open Pi Developer Portal
          </a>
        </div>
      </div>
    </div>
  );
}
