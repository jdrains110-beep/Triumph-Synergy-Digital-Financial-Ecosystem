"use client";

import { useEffect, useState } from "react";

export default function PiTestPage() {
  const [info, setInfo] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);
  const [authResult, setAuthResult] = useState<any>(null);
  const [checkCount, setCheckCount] = useState(0);

  // Check for Pi SDK with multiple attempts (it may load async)
  const checkPiSDK = () => {
    const data: Record<string, any> = {
      timestamp: new Date().toISOString(),
      checkNumber: checkCount + 1,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "N/A",
      url: typeof window !== "undefined" ? window.location.href : "N/A",
      origin: typeof window !== "undefined" ? window.location.origin : "N/A",
      hostname: typeof window !== "undefined" ? window.location.hostname : "N/A",
      protocol: typeof window !== "undefined" ? window.location.protocol : "N/A",
      isPinetDomain: typeof window !== "undefined" && window.location.hostname.includes("pinet.com"),
      isVercelDomain: typeof window !== "undefined" && window.location.hostname.includes("vercel.app"),
      hasPiSDK: typeof window !== "undefined" && !!(window as any).Pi,
      windowPiKeys: typeof window !== "undefined" ? 
        Object.keys(window).filter(k => k.toLowerCase().includes("pi")).join(", ") || "none" : "N/A",
    };

    // Pi Browser user agent detection
    if (data.userAgent) {
      data.isPiBrowser = data.userAgent.includes("PiBrowser");
      data.isAndroid = data.userAgent.includes("Android");
      data.isiOS = data.userAgent.includes("iPhone") || data.userAgent.includes("iPad");
    }

    // Check for Pi object and its methods
    if (typeof window !== "undefined" && (window as any).Pi) {
      const Pi = (window as any).Pi;
      data.piSDKDetected = true;
      data.piMethods = Object.keys(Pi).join(", ");
      data.piType = typeof Pi;
      
      // Check for specific methods
      data.hasInit = typeof Pi.init === "function";
      data.hasAuthenticate = typeof Pi.authenticate === "function";
      data.hasCreatePayment = typeof Pi.createPayment === "function";
    } else {
      data.piSDKDetected = false;
      data.note = "Pi SDK not found. If you're in Pi Browser, make sure the app URL matches your Developer Portal config.";
    }

    setInfo(data);
    setCheckCount(prev => prev + 1);
  };

  useEffect(() => {
    try {
      // Initial check
      checkPiSDK();
      
      // Check again after delays (Pi SDK loads asynchronously)
      const timers = [
        setTimeout(checkPiSDK, 500),
        setTimeout(checkPiSDK, 1000),
        setTimeout(checkPiSDK, 2000),
      ];
      
      return () => timers.forEach(clearTimeout);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
  }, []);

  // Test Pi SDK initialization
  const testPiInit = async () => {
    try {
      if (!(window as any).Pi) {
        setInfo(prev => ({ ...prev, initTest: "FAILED - Pi SDK not available" }));
        return;
      }
      
      const Pi = (window as any).Pi;
      await Pi.init({ version: "2.0" });
      setInfo(prev => ({ ...prev, initTest: "SUCCESS - Pi.init() completed" }));
    } catch (e) {
      setInfo(prev => ({ ...prev, initTest: `ERROR: ${(e as Error).message}` }));
    }
  };

  // Test Pi SDK authentication
  const testPiAuth = async () => {
    try {
      if (!(window as any).Pi) {
        setAuthResult({ error: "Pi SDK not available" });
        return;
      }
      
      const Pi = (window as any).Pi;
      
      // Initialize first
      await Pi.init({ version: "2.0" });
      
      // Authenticate with username scope
      const result = await Pi.authenticate(
        ["username", "payments"],
        (payment: any) => {
          console.log("Incomplete payment found:", payment);
          setInfo(prev => ({ ...prev, incompletePayment: payment }));
        }
      );
      
      setAuthResult({
        success: true,
        user: result.user,
        accessToken: result.accessToken ? "present (hidden)" : "missing",
      });
    } catch (e) {
      setAuthResult({ error: (e as Error).message });
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "monospace", background: "#1a1a2e", color: "#eee", minHeight: "100vh" }}>
      <h1 style={{ color: "#00ff00" }}>🥧 Pi Browser Debug Page</h1>
      <p>If you can see this, the app is loading correctly.</p>
      
      {error && (
        <div style={{ color: "#ff4444", marginTop: "20px", padding: "10px", background: "#330000" }}>
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {/* Pi SDK Status */}
      <div style={{ marginTop: "20px", padding: "15px", background: info.hasPiSDK ? "#002200" : "#220000", borderRadius: "8px" }}>
        <h2 style={{ color: info.hasPiSDK ? "#00ff00" : "#ff4444" }}>
          {info.hasPiSDK ? "✅ Pi SDK DETECTED" : "❌ Pi SDK NOT DETECTED"}
        </h2>
        {!info.hasPiSDK && (
          <div style={{ marginTop: "10px" }}>
            <p><strong>Troubleshooting:</strong></p>
            <ul>
              <li>Make sure you're opening this in Pi Browser</li>
              <li>The URL in Pi Developer Portal must match: <code>{info.origin}</code></li>
              <li>Domain must be verified in Pi App Studio</li>
              <li>For testnet: Use testnet Developer Portal (develop.pi sandbox)</li>
              <li>For mainnet: Use mainnet Developer Portal</li>
            </ul>
          </div>
        )}
      </div>
      
      {/* Environment Info */}
      <div style={{ marginTop: "20px" }}>
        <h2>📊 Environment Info:</h2>
        <pre style={{ background: "#111", padding: "15px", overflow: "auto", borderRadius: "8px", fontSize: "12px" }}>
          {JSON.stringify(info, null, 2)}
        </pre>
      </div>

      {/* Test Buttons */}
      <div style={{ marginTop: "20px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <button 
          onClick={checkPiSDK}
          style={{ padding: "12px 20px", cursor: "pointer", background: "#0066cc", color: "white", border: "none", borderRadius: "6px" }}
        >
          🔄 Re-check Pi SDK
        </button>
        
        <button 
          onClick={testPiInit}
          style={{ padding: "12px 20px", cursor: "pointer", background: "#6600cc", color: "white", border: "none", borderRadius: "6px" }}
        >
          🚀 Test Pi.init()
        </button>
        
        <button 
          onClick={testPiAuth}
          style={{ padding: "12px 20px", cursor: "pointer", background: "#00cc66", color: "white", border: "none", borderRadius: "6px" }}
        >
          🔐 Test Authentication
        </button>
        
        <button 
          onClick={async () => {
            try {
              const res = await fetch("/api/health");
              const data = await res.json();
              setInfo(prev => ({ ...prev, healthCheck: data }));
            } catch (e) {
              setInfo(prev => ({ ...prev, healthCheckError: (e as Error).message }));
            }
          }}
          style={{ padding: "12px 20px", cursor: "pointer", background: "#cc6600", color: "white", border: "none", borderRadius: "6px" }}
        >
          🏥 Test Health API
        </button>
      </div>

      {/* Auth Result */}
      {authResult && (
        <div style={{ marginTop: "20px" }}>
          <h2>🔐 Authentication Result:</h2>
          <pre style={{ background: authResult.error ? "#330000" : "#003300", padding: "15px", overflow: "auto", borderRadius: "8px" }}>
            {JSON.stringify(authResult, null, 2)}
          </pre>
        </div>
      )}

      {/* Developer Portal Instructions */}
      <div style={{ marginTop: "30px", padding: "15px", background: "#222", borderRadius: "8px" }}>
        <h2>📋 Developer Portal Checklist:</h2>
        <ol style={{ lineHeight: "2" }}>
          <li>Open <code>develop.pi</code> in Pi Browser</li>
          <li>Create/edit your app</li>
          <li>Set <strong>App URL</strong> to: <code>{info.origin || "your-vercel-url"}</code></li>
          <li>Verify your domain ownership with validation-key.txt</li>
          <li>For testnet: Use sandbox/testnet mode</li>
          <li>For mainnet: Use production/mainnet mode</li>
          <li>After saving, open your app through Pi Browser or via pinet.com link</li>
        </ol>
      </div>
    </div>
  );
}
