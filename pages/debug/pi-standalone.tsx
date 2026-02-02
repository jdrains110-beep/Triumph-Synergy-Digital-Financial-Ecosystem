/**
 * STANDALONE Pi Diagnostic Page
 * This page renders WITHOUT the app layout to bypass any provider issues
 */

export default function StandaloneDiagnostic() {
  return (
    <html lang="en">
      <head>
        <title>Pi SDK Diagnostic (Standalone)</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script src="https://sdk.minepi.com/pi-sdk.js" />
      </head>
      <body style={{ backgroundColor: "#1a1a2e", color: "white", fontFamily: "monospace", padding: "20px", margin: 0 }}>
        <h1 style={{ color: "#9d4edd" }}>🔬 Pi SDK Standalone Diagnostic</h1>
        <p>This page bypasses all React providers.</p>
        
        <div id="output" style={{ backgroundColor: "#0f0f1a", padding: "15px", borderRadius: "8px", marginTop: "20px" }}>
          <div>Loading...</div>
        </div>

        <script
          dangerouslySetInnerHTML={{
            __html: `
              (async function() {
                const output = document.getElementById('output');
                const logs = [];
                
                function log(msg, color) {
                  logs.push('<div style="padding:5px;border-bottom:1px solid #333;color:' + (color || '#ccc') + '">' + msg + '</div>');
                  output.innerHTML = logs.join('');
                }
                
                log('Page loaded at ' + new Date().toLocaleTimeString());
                log('Hostname: ' + window.location.hostname);
                log('User Agent: ' + navigator.userAgent.substring(0, 60) + '...');
                
                const isPiBrowser = navigator.userAgent.includes('PiBrowser');
                log('Pi Browser: ' + (isPiBrowser ? 'YES ✅' : 'NO ❌'), isPiBrowser ? '#51cf66' : '#ff6b6b');
                
                log('Waiting for Pi SDK...');
                
                // Wait for Pi SDK
                let attempts = 0;
                while (!window.Pi && attempts < 100) {
                  await new Promise(r => setTimeout(r, 100));
                  attempts++;
                }
                
                if (!window.Pi) {
                  log('❌ window.Pi never loaded after 10 seconds', '#ff6b6b');
                  log('This means you are NOT in Pi Browser or Pi SDK failed to load');
                  return;
                }
                
                log('✅ window.Pi exists', '#51cf66');
                log('Pi.init type: ' + typeof window.Pi.init);
                log('Pi.authenticate type: ' + typeof window.Pi.authenticate);
                
                // Try init
                log('Calling Pi.init()...');
                const hostname = window.location.hostname;
                const sandbox = hostname.includes('testnet') || hostname === 'triumphsynergy1991.pinet.com' || hostname === 'localhost';
                
                try {
                  await window.Pi.init({ version: '2.0', sandbox: sandbox });
                  log('✅ Pi.init() SUCCESS (sandbox: ' + sandbox + ')', '#51cf66');
                } catch (e) {
                  log('❌ Pi.init() FAILED: ' + (e.message || e), '#ff6b6b');
                  return;
                }
                
                // Try authenticate
                log('Calling Pi.authenticate()...');
                try {
                  const auth = await window.Pi.authenticate(
                    ['username', 'payments'],
                    function(p) { log('Incomplete payment: ' + JSON.stringify(p)); }
                  );
                  log('✅ AUTHENTICATED!', '#51cf66');
                  log('User UID: ' + (auth.user ? auth.user.uid : 'unknown'));
                  log('Username: ' + (auth.user ? auth.user.username : 'unknown'));
                  log('Has Token: ' + (auth.accessToken ? 'YES' : 'NO'));
                } catch (e) {
                  log('❌ AUTHENTICATION FAILED: ' + (e.message || e), '#ff6b6b');
                }
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}

// This tells Next.js to NOT use the root layout
StandaloneDiagnostic.getLayout = () => null;
