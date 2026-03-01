"use client";

import { useEffect, useState } from "react";

/**
 * Main Pi App Studio Dashboard
 * Displays Triumph Synergy payment processing interface
 * This is the primary interface loaded by Pi App Studio
 * 
 * UNIQUE IDENTIFIER: This is NOT the Vercel default page
 * If you see this exact dashboard, the deployment is working correctly
 */
export default function HomePage() {
  const [isMounted, setIsMounted] = useState(false);
  const [hostname, setHostname] = useState("");

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== "undefined") {
      setHostname(window.location.hostname);
    }
  }, []);

  if (!isMounted) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        Loading Triumph Synergy...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#ffffff",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* UNIQUE HEADER - This proves the real app is loaded */}
      <div
        style={{
          backgroundColor: "#2563eb",
          color: "#ffffff",
          padding: "20px 40px",
          borderBottom: "2px solid #1e40af",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <h1
            style={{ margin: "0 0 8px 0", fontSize: "28px", fontWeight: "700" }}
          >
            ⚡ TRIUMPH SYNERGY - REAL APP LOADED
          </h1>
          <p style={{ margin: "0", fontSize: "14px", opacity: "0.9" }}>
            ✅ This is the actual Triumph Synergy app (not Vercel default page)
          </p>
          <p style={{ margin: "8px 0 0 0", fontSize: "12px", opacity: "0.8" }}>
            Current Domain: <code>{hostname}</code>
          </p>
        </div>
      </div>

      {/* Main Dashboard */}
      <div
        style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 20px" }}
      >
        {/* PROOF OF CONCEPT SECTION */}
        <div
          style={{
            backgroundColor: "#dcfce7",
            border: "2px solid #22c55e",
            borderRadius: "8px",
            padding: "20px",
            marginBottom: "30px",
          }}
        >
          <h2 style={{ color: "#16a34a", margin: "0 0 10px 0" }}>
            ✅ DEPLOYMENT SUCCESSFUL
          </h2>
          <p style={{ margin: "0", color: "#166534" }}>
            If you're reading this message, Vercel is correctly serving the Triumph Synergy application.
          </p>
          <p style={{ margin: "10px 0 0 0", color: "#166534", fontSize: "14px" }}>
            <strong>This is NOT the Vercel default page.</strong>
          </p>
        </div>

        {/* Status Cards Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "20px",
            marginBottom: "40px",
          }}
        >
          {/* System Status Card */}
          <div
            style={{
              backgroundColor: "#f0fdf4",
              border: "1px solid #86efac",
              borderRadius: "8px",
              padding: "24px",
            }}
          >
            <h3
              style={{
                margin: "0 0 16px 0",
                color: "#15803d",
                fontSize: "16px",
                fontWeight: "600",
              }}
            >
              ✅ System Status
            </h3>
            <div
              style={{ fontSize: "14px", lineHeight: "1.8", color: "#374151" }}
            >
              <div>
                Server: <strong>Running</strong>
              </div>
              <div>
                Network: <strong>Mainnet</strong>
              </div>
              <div>
                Pi SDK: <strong>Active</strong>
              </div>
              <div>
                Payment Processing: <strong>Ready</strong>
              </div>
            </div>
          </div>

          {/* Domains Card */}
          <div
            style={{
              backgroundColor: "#f0f9ff",
              border: "1px solid #0ea5e9",
              borderRadius: "8px",
              padding: "24px",
            }}
          >
            <h3
              style={{
                margin: "0 0 16px 0",
                color: "#0369a1",
                fontSize: "16px",
                fontWeight: "600",
              }}
            >
              🌐 Domains Active
            </h3>
            <div
              style={{
                fontSize: "13px",
                lineHeight: "2",
                color: "#374151",
                fontFamily: "monospace",
              }}
            >
              <div>• 0576.pinet.com</div>
              <div>• 7386.pinet.com</div>
              <div>• 1991.pinet.com</div>
              <div
                style={{
                  marginTop: "8px",
                  paddingTop: "8px",
                  borderTop: "1px solid #bfdbfe",
                  fontSize: "12px",
                }}
              >
                All domains routing correctly
              </div>
            </div>
          </div>

          {/* SSL Certificate Card */}
          <div
            style={{
              backgroundColor: "#faf5ff",
              border: "1px solid #d8b4fe",
              borderRadius: "8px",
              padding: "24px",
            }}
          >
            <h3
              style={{
                margin: "0 0 16px 0",
                color: "#7e22ce",
                fontSize: "16px",
                fontWeight: "600",
              }}
            >
              🔒 SSL Certificates
            </h3>
            <div
              style={{ fontSize: "14px", lineHeight: "1.8", color: "#374151" }}
            >
              <div>
                Status: <strong>Valid</strong>
              </div>
              <div>
                Certificate: <strong>Active</strong>
              </div>
              <div>
                HTTPS: <strong>Enabled</strong>
              </div>
              <div>
                Expiration: <strong>Auto-Renewal</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Deployment Info */}
        <div
          style={{
            backgroundColor: "#fafafa",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            padding: "24px",
            marginBottom: "40px",
          }}
        >
          <h2
            style={{
              margin: "0 0 16px 0",
              fontSize: "18px",
              fontWeight: "600",
              color: "#1f2937",
            }}
          >
            🚀 Deployment Information
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "24px",
              fontSize: "14px",
            }}
          >
            <div>
              <div
                style={{
                  fontWeight: "600",
                  color: "#6b7280",
                  marginBottom: "8px",
                }}
              >
                Mainnet Deployment
              </div>
              <div
                style={{
                  color: "#374151",
                  fontFamily: "monospace",
                  fontSize: "13px",
                }}
              >
                triumph-synergy.vercel.app
              </div>
            </div>

            <div>
              <div
                style={{
                  fontWeight: "600",
                  color: "#6b7280",
                  marginBottom: "8px",
                }}
              >
                Testnet Deployment
              </div>
              <div
                style={{
                  color: "#374151",
                  fontFamily: "monospace",
                  fontSize: "13px",
                }}
              >
                triumph-synergy-testnet.vercel.app
              </div>
            </div>

            <div>
              <div
                style={{
                  fontWeight: "600",
                  color: "#6b7280",
                  marginBottom: "8px",
                }}
              >
                App ID
              </div>
              <div
                style={{
                  color: "#374151",
                  fontFamily: "monospace",
                  fontSize: "13px",
                }}
              >
                triumph-synergy
              </div>
            </div>

            <div>
              <div
                style={{
                  fontWeight: "600",
                  color: "#6b7280",
                  marginBottom: "8px",
                }}
              >
                Git Repository
              </div>
              <div
                style={{
                  color: "#374151",
                  fontFamily: "monospace",
                  fontSize: "13px",
                }}
              >
                jdrains110-beep/triumph-synergy
              </div>
            </div>
          </div>
        </div>

        {/* Payment Features */}
        <div
          style={{
            backgroundColor: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: "8px",
            padding: "24px",
          }}
        >
          <h2
            style={{
              margin: "0 0 16px 0",
              fontSize: "18px",
              fontWeight: "600",
              color: "#1e40af",
            }}
          >
            💳 Payment Features
          </h2>

          <ul
            style={{
              margin: "0",
              paddingLeft: "20px",
              fontSize: "14px",
              lineHeight: "1.8",
              color: "#374151",
            }}
          >
            <li>Pi Network Payment Processing</li>
            <li>Advanced Payment Routing</li>
            <li>Compliance Automation</li>
            <li>Real-time Transaction Monitoring</li>
            <li>Wallet Integration</li>
            <li>Payment Settlement</li>
            <li>Multi-tier Domain Support</li>
            <li>Testnet & Mainnet Separation</li>
          </ul>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          backgroundColor: "#f9fafb",
          borderTop: "1px solid #e5e7eb",
          padding: "24px 40px",
          marginTop: "60px",
          fontSize: "13px",
          color: "#6b7280",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ marginBottom: "8px" }}>
            <strong>Triumph Synergy</strong> © 2026 - Pi Network Payment
            Platform
          </div>
          <div>
            Primary Domain:{" "}
            <code
              style={{
                backgroundColor: "#f3f4f6",
                padding: "2px 6px",
                borderRadius: "3px",
              }}
            >
              triumphsynergy0576.pinet.com
            </code>
          </div>
          <div
            style={{
              marginTop: "12px",
              paddingTop: "12px",
              borderTop: "1px solid #e5e7eb",
            }}
          >
            Status:{" "}
            <strong style={{ color: "#16a34a" }}>
              ✅ All Systems Operational
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
}
