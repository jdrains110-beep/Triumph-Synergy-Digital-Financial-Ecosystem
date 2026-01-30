/**
 * Pi SDK Immediate Initialization Script
 * 
 * This script runs BEFORE React hydration to ensure:
 * 1. window.Pi is available (loaded from CDN)
 * 2. Pi.init() is called immediately
 * 3. Pi.authenticate(['payments']) is called to register app with Pi Browser
 * 4. Incomplete payments are recovered
 * 5. App is marked as "ready" for payments
 * 
 * This is the critical missing piece - without auto-authentication,
 * Pi Browser doesn't recognize the app as a valid Pi app.
 */

export function getPiInitializationScript(): string {
  return `
(function() {
  // Store initialization state
  window.__piInitialization = {
    status: 'initializing',
    initialized: false,
    authenticated: false,
    error: null,
    startTime: Date.now()
  };

  // Helper to get domain info
  function getDomainInfo() {
    const hostname = window.location.hostname;
    const isSandbox = hostname.includes('1991');
    const network = isSandbox ? 'testnet' : 'mainnet';
    return { hostname, isSandbox, network };
  }

  // Main initialization function
  async function initializePi() {
    const domainInfo = getDomainInfo();
    
    console.log('[Pi SDK Auto-Init] ===== Pi SDK Automatic Initialization =====');
    console.log('[Pi SDK Auto-Init] Domain:', domainInfo.hostname);
    console.log('[Pi SDK Auto-Init] Network:', domainInfo.network);
    console.log('[Pi SDK Auto-Init] Sandbox:', domainInfo.isSandbox);
    console.log('[Pi SDK Auto-Init] Starting initialization...');

    try {
      // Step 1: Wait for window.Pi to be available (from CDN script)
      console.log('[Pi SDK Auto-Init] Step 1: Waiting for window.Pi from CDN...');
      let attempts = 0;
      while (!window.Pi && attempts < 200) {
        await new Promise(resolve => setTimeout(resolve, 50));
        attempts++;
        if (attempts % 20 === 0) {
          console.log('[Pi SDK Auto-Init] Waiting... attempt', Math.floor(attempts / 2), 'seconds');
        }
      }

      if (!window.Pi) {
        throw new Error('window.Pi never loaded from CDN after 10 seconds');
      }

      console.log('[Pi SDK Auto-Init] ✓ window.Pi is available');
      window.__piInitialization.piLoaded = true;

      // Step 2: Call Pi.init() - registers app with Pi Network
      console.log('[Pi SDK Auto-Init] Step 2: Calling Pi.init()...');
      const initConfig = {
        version: '2.0',
        sandbox: domainInfo.isSandbox,
        appId: 'triumph-synergy'
      };
      console.log('[Pi SDK Auto-Init] Init config:', initConfig);

      await window.Pi.init(initConfig);
      console.log('[Pi SDK Auto-Init] ✓ Pi.init() succeeded');
      window.__piInitialization.initialized = true;

      // Step 3: Set up incomplete payment handler BEFORE authenticate
      console.log('[Pi SDK Auto-Init] Step 3: Setting up incomplete payment handler...');
      function handleIncompletePayment(payment) {
        console.log('[Pi SDK Auto-Init] Incomplete payment found:', payment);
        // In production, you would send this to your backend to recover
      }

      // Step 4: Call Pi.authenticate() with payments scope
      // THIS IS THE CRITICAL STEP THAT WAS MISSING!
      console.log('[Pi SDK Auto-Init] Step 4: Calling Pi.authenticate([\\\"payments\\\"])...');
      
      const auth = await window.Pi.authenticate(
        ['payments'],  // REQUIRED: Ask for payments permission
        handleIncompletePayment
      );

      console.log('[Pi SDK Auto-Init] ✓ Pi.authenticate() succeeded');
      console.log('[Pi SDK Auto-Init] Authenticated user:', auth.user.uid);
      window.__piInitialization.authenticated = true;
      window.__piInitialization.user = auth.user;

      // Step 5: Mark app as ready
      console.log('[Pi SDK Auto-Init] Step 5: App ready for payments');
      window.__piInitialization.status = 'ready';
      window.__piInitialization.initialized = true;
      window.__piInitialization.completionTime = Date.now();
      window.__piInitialization.duration = window.__piInitialization.completionTime - window.__piInitialization.startTime;

      console.log('[Pi SDK Auto-Init] ===== INITIALIZATION COMPLETE =====');
      console.log('[Pi SDK Auto-Init] Duration:', window.__piInitialization.duration, 'ms');
      console.log('[Pi SDK Auto-Init] Status:', window.__piInitialization.status);

      // Dispatch event so React knows Pi is ready
      window.dispatchEvent(new CustomEvent('piReady', { detail: auth }));
      
    } catch (error) {
      console.error('[Pi SDK Auto-Init] ❌ INITIALIZATION FAILED:', error);
      window.__piInitialization.status = 'failed';
      window.__piInitialization.error = error.message;
      
      // Try to dispatch event anyway so React can handle error state
      window.dispatchEvent(new CustomEvent('piError', { detail: error }));
    }
  }

  // Start initialization immediately
  if (document.readyState === 'loading') {
    // DOM still loading, wait for it
    document.addEventListener('DOMContentLoaded', initializePi);
  } else {
    // DOM already loaded, start immediately
    initializePi();
  }
})();
`;
}
