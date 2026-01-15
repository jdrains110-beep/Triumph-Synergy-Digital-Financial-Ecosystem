"use client";

import { useEffect, useState } from "react";

export default function PiTestPage() {
  const [info, setInfo] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const data: Record<string, any> = {
        timestamp: new Date().toISOString(),
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "N/A",
        url: typeof window !== "undefined" ? window.location.href : "N/A",
        hasPiSDK: typeof window !== "undefined" && !!(window as any).Pi,
        windowKeys: typeof window !== "undefined" ? Object.keys(window).filter(k => k.toLowerCase().includes("pi")).join(", ") : "N/A",
        branch: "testnet",
      };

      // Check for Pi object
      if (typeof window !== "undefined" && (window as any).Pi) {
        data.piSDKVersion = "detected";
        data.piMethods = Object.keys((window as any).Pi).join(", ");
      }

      setInfo(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
  }, []);

  return (
    <div style={{ padding: "20px", fontFamily: "monospace", background: "#000", color: "#0f0", minHeight: "100vh" }}>
      <h1>Pi Browser Debug Page (TESTNET)</h1>
      <p>If you can see this, the app loaded successfully!</p>
      
      {error && (
        <div style={{ color: "red", marginTop: "20px" }}>
          <strong>Error:</strong> {error}
        </div>
      )}
      
      <div style={{ marginTop: "20px" }}>
        <h2>Environment Info:</h2>
        <pre style={{ background: "#111", padding: "10px", overflow: "auto" }}>
          {JSON.stringify(info, null, 2)}
        </pre>
      </div>

      <div style={{ marginTop: "20px" }}>
        <h2>Health Check:</h2>
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
          style={{ padding: "10px 20px", cursor: "pointer" }}
        >
          Test Health API
        </button>
      </div>
    </div>
  );
}
