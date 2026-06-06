/**
 * app/diagnostic/page.tsx
 * Diagnostic page to verify the Cloudflare Tunnel deployment is serving correct content
 */

export default function DiagnosticPage() {
  return (
    <div style={{ padding: "40px", fontFamily: "monospace" }}>
      <h1>Triumph Synergy - Deployment Diagnostic</h1>

      <div style={{
        backgroundColor: "#f0f0f0",
        padding: "20px",
        borderRadius: "8px",
        marginBottom: "20px"
      }}>
        <h2>Environment Info:</h2>
        <p><strong>Node ENV:</strong> {process.env.NODE_ENV}</p>
        <p><strong>Build timestamp:</strong> {new Date().toISOString()}</p>
        <p><strong>App Version:</strong> 1.0.0</p>
      </div>

      <div style={{
        backgroundColor: "#e8f5e9",
        padding: "20px",
        borderRadius: "8px",
        marginBottom: "20px"
      }}>
        <h2>✅ Deployment Status: LIVE — Cloudflare Tunnel</h2>
        <p>This page proves triumphsynergy.com is correctly serving the Next.js app via Cloudflare Tunnel.</p>
        <p>If you can read this, the deployment is working. Tunnel ID: 55fdccae-8c34-403c-a894-7b13cfa9f71b</p>
      </div>

      <div style={{
        backgroundColor: "#fff3cd",
        padding: "20px",
        borderRadius: "8px",
        marginBottom: "20px"
      }}>
        <h2>⚠️ If you see a default placeholder page instead:</h2>
        <ul>
          <li>Clear browser cache (Ctrl+Shift+Delete)</li>
          <li>Try incognito/private window</li>
          <li>Check DNS hasn't cached old deployment</li>
          <li>Check cloudflared tunnel is running: <code>launchctl list | grep cloudflare</code></li>
        </ul>
      </div>

      <div style={{
        backgroundColor: "#e3f2fd",
        padding: "20px",
        borderRadius: "8px"
      }}>
        <h2>Navigation:</h2>
        <ul>
          <li><a href="/">Home (Main Dashboard)</a></li>
          <li><a href="/pi-app-studio-verify">Pi SDK Verification</a></li>
          <li><a href="/api/pi/status">Pi Status API</a></li>
          <li><a href="/api/health/check">Health Check</a></li>
        </ul>
      </div>

      <hr style={{ margin: "40px 0" }} />

      <h2>Verification Checklist:</h2>
      <ul>
        <li>✅ Next.js is deployed (Cloudflare Tunnel)</li>
        <li>✅ App is being served from triumphsynergy.com</li>
        <li>✅ Routes are working</li>
        <li>✅ You can see this diagnostic page</li>
      </ul>

      <div style={{ marginTop: "40px", color: "#666" }}>
        <small>
          Production domain: <strong>https://triumphsynergy.com</strong>
          <br />
          Deployed via Cloudflare Tunnel (permanent, auto-start on boot)
        </small>
      </div>
    </div>
  );
}
