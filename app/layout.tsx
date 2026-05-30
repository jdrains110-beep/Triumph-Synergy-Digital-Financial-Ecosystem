import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
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

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://triumph-synergy.replit.app";

export const metadata: Metadata = {
  // Canonical URL driven by NEXT_PUBLIC_APP_URL at deploy time.
  metadataBase: new URL(APP_URL),

  title: {
    default: "Triumph Synergy · Sovereign Digital Financial Ecosystem",
    template: "%s · Triumph Synergy",
  },
  description:
    "Triumph Synergy is a sovereign digital financial ecosystem powered by Pi Network — 41 authorities, quantum-grade ML-DSA-87 security, NESARA/GESARA compliance, Pi-DEX, Pi-Bank, UBI engine, and SAIB v3 sentinel. Founder-pinned by Jeremiah Joel Drains (KING_QUEEN).",

  applicationName: "Triumph Synergy",
  creator: "Jeremiah Joel Drains",
  authors: [{ name: "Jeremiah Joel Drains", url: APP_URL }],
  category: "Finance",

  keywords: [
    "Pi Network",
    "Pi cryptocurrency",
    "sovereign finance",
    "digital financial ecosystem",
    "NESARA GESARA",
    "Pi DEX",
    "Pi Bank",
    "Pi payments",
    "UBI Pi Network",
    "blockchain finance",
    "quantum finance",
    "ML-DSA-87",
    "SAIB AI",
    "Triumph Synergy",
    "Pi Network payments",
    "DeFi Pi",
    "sovereign AI bot",
    "Pi real estate",
    "Pi credit dispute",
    "FCRA §611",
    "Pi tokenization",
    "Pi Network mainnet",
    "Jeremiah Joel Drains",
  ],

  icons: {
    icon: "/favicon.ico",
    apple: "/icon-trisyn-512.png",
  },

  openGraph: {
    title: "Triumph Synergy · Sovereign Digital Financial Ecosystem",
    description:
      "41 sovereign authorities powered by Pi Network. Pi-DEX, Pi-Bank, NESARA, UBI, SAIB v3, quantum ML-DSA-87 security. Founder: Jeremiah Joel Drains.",
    url: APP_URL,
    siteName: "Triumph Synergy",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Triumph Synergy — Sovereign Digital Financial Ecosystem powered by Pi Network",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Triumph Synergy · Sovereign Digital Financial Ecosystem",
    description:
      "41 sovereign authorities on Pi Network. Pi-DEX, Pi-Bank, NESARA, UBI, SAIB v3, ML-DSA-87 quantum security.",
    images: ["/twitter-image.png"],
    creator: "@TriumphSynergy",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  alternates: {
    canonical: APP_URL,
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
  // Read per-request CSP nonce forwarded by middleware so that the Pi SDK
  // <script> tags pass `script-src 'strict-dynamic' 'nonce-...'`.
  const nonce = (await headers()).get("x-csp-nonce") ?? undefined;

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
          nonce={nonce}
          // biome-ignore lint/security/noDangerouslySetInnerHtml: "Required"
          dangerouslySetInnerHTML={{
            __html: THEME_COLOR_SCRIPT,
          }}
        />

        <script
          nonce={nonce}
          crossOrigin="anonymous"
          src="https://sdk.minepi.com/pi-sdk.js"
          type="text/javascript"
        />

        {/* Pi SDK Initialization - Works in all contexts (Pi Browser, Pi App Studio, regular browser) */}
        <script
          nonce={nonce}
          // biome-ignore lint/security/noDangerouslySetInnerHtml: Required for Pi SDK initialization
          dangerouslySetInnerHTML={{
            __html: `
window.__piInitialization = { status: 'pending', authenticated: false, sdkLoaded: false };
console.log('[Pi SDK] Script loaded on ' + window.location.hostname);

(function initPiSdk() {
  var hostname = window.location.hostname.toLowerCase();
  var ua = navigator.userAgent || '';
  var uaLower = ua.toLowerCase();

  // Network selection is driven by build-time env, NOT a hardcoded host
  // whitelist. Pi App Studio assigns each app a fresh hostname on transfer,
  // so any hardcoded check would mis-classify the new domain and break
  // verification. NEXT_PUBLIC_PI_SANDBOX="true" => testnet, otherwise mainnet.
  // Localhost always falls back to sandbox for safe local dev.
  var sandbox = ${process.env.NEXT_PUBLIC_PI_SANDBOX === "true" ? "true" : "false"};
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
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

  // Pi App Studio's verification crawler does not advertise a Pi Browser UA,
  // so we cannot gate authenticate() on isPiBrowser. Instead, we always attempt
  // Pi.authenticate(['username']) once Pi.init() resolves — Pi.init() only
  // resolves successfully when window.Pi is genuinely present (Pi Browser /
  // Pi App Studio webview), and Pi.authenticate() will safely reject in any
  // other context.
  var shouldAutoAuth = true;

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
        // Per Pi SDK Authentication docs (https://pi-apps.github.io/pi-sdk-docs/quick-start/genai/Authentication)
        // Pi.init() takes ONLY { version, sandbox }. The appId is resolved
        // server-side at authenticate() time from the request origin. Passing
        // an unexpected appId field caused Pi.init() to never resolve, which
        // broke Pi App Studio verification.
        window.Pi.init({ version: '2.0', sandbox: sandbox })
          .then(function() {
            console.log('[Pi SDK] Pi.init() completed');
            window.__piInitialization.status = 'initialized';
            
            // Auto-authenticate on load whenever Pi.init() succeeded. Pi.init()
            // only resolves when window.Pi is genuinely available, so this gate
            // is sufficient — and it is what Pi App Studio's verifier expects
            // to observe to mark the app as "Pi sign-in detected".
            if (shouldAutoAuth) {
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
