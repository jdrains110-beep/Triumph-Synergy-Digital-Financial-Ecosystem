import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { LocaleProvider } from "@/components/locale-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { getRequestLocale } from "@/lib/i18n/server";
import { PiProvider } from "@/lib/pi-sdk/pi-provider";
import { Web3Provider } from "@/lib/web3";

// Apex sovereign boot — wires audit chain to Supabase service-role client.
// Side-effect import: runs once per server process.
import "@/lib/security/boot";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://triumphsynergy0576.pinet.com"
  ),
  title: "Triumph Synergy - Pi App Studio",
  description:
    "Triumph Synergy: Advanced payment routing, compliance automation, and AI-powered financial services powered by Pi Network.",
  icons: {
    icon: "/favicon.ico",
  },
  keywords: ["Pi Network", "Payment Processing", "Compliance", "Fintech", "AI"],
  authors: [{ name: "Triumph Synergy Team" }],
  openGraph: {
    title: "Triumph Synergy - Pi App Studio",
    description: "Advanced payment routing with compliance automation",
    url:
      process.env.NEXT_PUBLIC_APP_URL || "https://triumphsynergy0576.pinet.com",
    siteName: "Triumph Synergy",
    type: "website",
  },
};

export const viewport = {
  maximumScale: 1, // Disable auto-zoom on mobile Safari
};

const geist = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-mono",
});

const LIGHT_THEME_COLOR = "hsl(0 0% 100%)";
const DARK_THEME_COLOR = "hsl(240deg 10% 3.92%)";
const THEME_COLOR_SCRIPT = `\
(function() {
  var html = document.documentElement;
  var meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  function updateThemeColor() {
    var isDark = html.classList.contains('dark');
    meta.setAttribute('content', isDark ? '${DARK_THEME_COLOR}' : '${LIGHT_THEME_COLOR}');
  }
  var observer = new MutationObserver(updateThemeColor);
  observer.observe(html, { attributes: true, attributeFilter: ['class'] });
  updateThemeColor();
})();`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getRequestLocale();

  return (
    <html
      className={`${geist.variable} ${geistMono.variable}`}
      // `next-themes` injects an extra classname to the body element to avoid
      // visual flicker before hydration. Hence the `suppressHydrationWarning`
      // prop is necessary to avoid the React hydration mismatch warning.
      // https://github.com/pacocoursey/next-themes?tab=readme-ov-file#with-app
      lang={locale}
      suppressHydrationWarning
    >
      <head>
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: "Required"
          dangerouslySetInnerHTML={{
            __html: THEME_COLOR_SCRIPT,
          }}
        />

        <script
          crossOrigin="anonymous"
          src="https://sdk.minepi.com/pi-sdk.js"
          type="text/javascript"
        />

        {/* Pi SDK Initialization - Works in all contexts (Pi Browser, Pi App Studio, regular browser) */}
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: Required for Pi SDK initialization
          dangerouslySetInnerHTML={{
            __html: `
window.__piInitialization = { status: 'pending', authenticated: false, sdkLoaded: false };
console.log('[Pi SDK] Script loaded on ' + window.location.hostname);

(function initPiSdk() {
  var hostname = window.location.hostname.toLowerCase();
  var ua = navigator.userAgent || '';
  var uaLower = ua.toLowerCase();
  
  // Domain-based network detection
  var sandbox = true; // Default to sandbox for safety
  
  // PINET domains
  if (hostname === 'triumphsynergy1991.pinet.com') {
    sandbox = true; // TESTNET
  } else if (hostname === 'triumphsynergy7386.pinet.com' || hostname === 'triumphsynergy0576.pinet.com') {
    sandbox = false; // MAINNET
  }
  // VERCEL domains  
  else if (hostname === 'triumph-synergy.vercel.app') {
    sandbox = false; // MAINNET
  } else if (hostname === 'triumph-synergy-testnet.vercel.app') {
    sandbox = true; // TESTNET
  }
  // localhost = testnet
  else if (hostname === 'localhost' || hostname === '127.0.0.1') {
    sandbox = true;
  }
  
  var appId = '${process.env.NEXT_PUBLIC_PI_APP_ID || "triumph-synergy"}';
  console.log('[Pi SDK] Configuration: domain=' + hostname + ', sandbox=' + sandbox + ', appId=' + appId);

  // Check if we're in Pi Browser context
  var isPiBrowser = 
    uaLower.indexOf('pibrowser') !== -1 ||
    uaLower.indexOf('pi browser') !== -1 ||
    uaLower.indexOf('pinetwork') !== -1 ||
    typeof window.Pi !== 'undefined' ||
    typeof window.PiNetwork !== 'undefined';
  
  console.log('[Pi SDK] In Pi Browser:', isPiBrowser, 'User-Agent:', ua.substring(0, 80));

  var maxTries = 50;
  var tries = 0;
  var initAttempted = false;

  function attemptInit() {
    tries++;
    
    // Check if Pi SDK available
    if (typeof window.Pi === 'undefined') {
      console.log('[Pi SDK] Attempt', tries + '/' + maxTries + ': window.Pi not available yet');
      if (tries < maxTries) {
        setTimeout(attemptInit, 200);
      } else {
        console.warn('[Pi SDK] Timeout: Pi SDK not available after', (maxTries * 200), 'ms');
        window.__piInitialization.status = 'unavailable';
        window.__piInitialization.error = 'Pi SDK not loaded';
      }
      return;
    }

    // Pi SDK is available - initialize it
    if (!initAttempted) {
      initAttempted = true;
      console.log('[Pi SDK] Pi SDK available after', tries, 'attempts. Initializing...');
      window.__piInitialization.status = 'initializing';
      
      try {
        // Perform initialization
        window.Pi.init({ version: '2.0', sandbox: sandbox, appId: appId })
          .then(function() {
            console.log('[Pi SDK] Pi.init() completed');
            window.__piInitialization.status = 'initialized';
            
            // Auto-authenticate on load if in Pi Browser context.
            // Use 'username' scope only — 'payments' is requested at payment time.
            if (isPiBrowser) {
              return window.Pi.authenticate(['username'], function(payment) {
                console.log('[Pi SDK] Incomplete payment found during init:', payment);
              });
            }
            return Promise.resolve(null);
          })
          .then(function(auth) {
            if (auth) {
              console.log('[Pi SDK] Authentication successful for user:', auth.user ? auth.user.uid : 'unknown');
              window.__piInitialization.authenticated = true;
              window.__piInitialization.user = auth.user;
              window.__piInitialization.status = 'ready';
              window.dispatchEvent(new CustomEvent('piReady', { detail: auth }));
              // Establish a server-side session so backend routes can trust this Pioneer.
              // GET /v2/me validation happens inside /api/pi/auth — no API key required.
              fetch('/api/pi/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessToken: auth.accessToken }),
              }).then(function(r) {
                if (r.ok) console.log('[Pi SDK] \u2713 Backend session established for', auth.user ? auth.user.username : 'user');
                else console.warn('[Pi SDK] \u26a0 Backend session failed:', r.status);
              }).catch(function(e) {
                console.warn('[Pi SDK] \u26a0 Backend session network error:', e);
              });
            } else {
              console.log('[Pi SDK] Initialized (not authenticated - expected in non-Pi contexts)');
              window.__piInitialization.status = 'ready';
            }
          })
          .catch(function(err) {
            console.error('[Pi SDK] Error:', err.message || err);
            window.__piInitialization.status = 'ready'; // Still mark as ready even if auth fails
            window.__piInitialization.error = err.message || String(err);
            window.dispatchEvent(new CustomEvent('piError', { detail: { message: err.message || String(err) } }));
          });
      } catch(e) {
        console.error('[Pi SDK] Exception during init:', e);
        window.__piInitialization.status = 'failed';
        window.__piInitialization.error = String(e);
      }
    }
  }

  // Start attempting initialization immediately
  attemptInit();
})();
            `,
          }}
        />
      </head>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          disableTransitionOnChange
          enableSystem
        >
          <Toaster position="top-center" />
          <LocaleProvider locale={locale}>
            <PiProvider>
              <Web3Provider>{children}</Web3Provider>
            </PiProvider>
          </LocaleProvider>
        </ThemeProvider>
        {/* Analytics disabled - may cause issues in Pi Browser */}
        {/* <Analytics /> */}
      </body>
    </html>
  );
}
