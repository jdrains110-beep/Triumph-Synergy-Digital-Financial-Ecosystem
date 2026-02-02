"use client";

import { useEffect, useState } from "react";

export default function PiDiagnosticPage() {
  const [logs, setLogs] = useState<string[]>(["Page loaded..."]);
  const [hasWindow, setHasWindow] = useState(false);

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  useEffect(() => {
    setHasWindow(true);
    addLog("Client mounted");
    
    // Run diagnostic
    const runTest = async () => {
      try {
        addLog(`Hostname: ${window.location.hostname}`);
        addLog(`User Agent: ${navigator.userAgent.substring(0, 50)}...`);
        
        const isPiBrowser = navigator.userAgent.includes("PiBrowser");
        addLog(`Pi Browser: ${isPiBrowser ? "YES ✅" : "NO ❌"}`);
        
        // Check window.Pi
        addLog("Checking window.Pi...");
        await new Promise((r) => setTimeout(r, 2000));
        
        const Pi = (window as any).Pi;
        if (!Pi) {
          addLog("❌ window.Pi is UNDEFINED");
          addLog("Pi SDK not loaded - not in Pi Browser?");
          return;
        }
        
        addLog("✅ window.Pi exists");
        addLog(`Pi.init: ${typeof Pi.init}`);
        addLog(`Pi.authenticate: ${typeof Pi.authenticate}`);
        
        // Try init
        addLog("Calling Pi.init()...");
        const hostname = window.location.hostname;
        const sandbox = hostname.includes("testnet") || hostname === "triumphsynergy1991.pinet.com";
        
        try {
          await Pi.init({ version: "2.0", sandbox });
          addLog(`✅ Pi.init() SUCCESS (sandbox: ${sandbox})`);
        } catch (e: any) {
          addLog(`❌ Pi.init() FAILED: ${e?.message || e}`);
          return;
        }
        
        // Try authenticate
        addLog("Calling Pi.authenticate()...");
        try {
          const auth = await Pi.authenticate(["username", "payments"], (p: any) => {
            addLog(`Incomplete payment: ${JSON.stringify(p)}`);
          });
          addLog(`✅ AUTHENTICATED!`);
          addLog(`User: ${auth?.user?.username || auth?.user?.uid}`);
          addLog(`Token: ${auth?.accessToken ? "YES" : "NO"}`);
        } catch (e: any) {
          addLog(`❌ AUTHENTICATION FAILED: ${e?.message || e}`);
        }
      } catch (e: any) {
        addLog(`ERROR: ${e?.message || e}`);
      }
    };
    
    runTest();
  }, []);

  return (
    <div style={{ 
      backgroundColor: "#1a1a2e", 
      color: "white", 
      minHeight: "100vh", 
      padding: "20px",
      fontFamily: "monospace"
    }}>
      <h1 style={{ color: "#9d4edd", marginBottom: "20px" }}>
        🔬 Pi SDK Diagnostic
      </h1>
      
      <div style={{ marginBottom: "20px" }}>
        <strong>Status:</strong> {hasWindow ? "Running tests..." : "Loading..."}
      </div>
      
      <div style={{ 
        backgroundColor: "#0f0f1a", 
        padding: "15px", 
        borderRadius: "8px",
        maxHeight: "70vh",
        overflow: "auto"
      }}>
        {logs.map((log, i) => (
          <div 
            key={i} 
            style={{ 
              padding: "5px 0",
              borderBottom: "1px solid #333",
              color: log.includes("❌") ? "#ff6b6b" : log.includes("✅") ? "#51cf66" : "#ccc"
            }}
          >
            {log}
          </div>
        ))}
      </div>
      
      <button
        type="button"
        onClick={() => window.location.reload()}
        style={{
          marginTop: "20px",
          padding: "10px 20px",
          backgroundColor: "#9d4edd",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
          fontSize: "16px"
        }}
      >
        🔄 Reload & Retest
      </button>
      
      <div style={{ marginTop: "20px", color: "#888", fontSize: "12px" }}>
        <p>Open this page in Pi Browser to test authentication.</p>
        <p>Current URL: {hasWindow ? window.location.href : "..."}</p>
      </div>
    </div>
  );
}
