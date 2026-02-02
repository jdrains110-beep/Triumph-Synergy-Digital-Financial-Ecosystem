import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { LocaleProvider } from "@/components/locale-provider";
import { PiSdkDebugPanel } from "@/components/pi-sdk-debug-panel";
import { ThemeProvider } from "@/components/theme-provider";
import { getRequestLocale } from "@/lib/i18n/server";
import { PiProvider } from "@/lib/pi-sdk/pi-provider";

import "./globals.css";
import { SessionProvider } from "next-auth/react";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://triumph-synergy.vercel.app"
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
      process.env.NEXT_PUBLIC_APP_URL || "https://triumph-synergy.vercel.app",
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

        {/* Load Pi SDK scripts FIRST - BEFORE React initialization */}
        <script
          crossOrigin="anonymous"
          src="https://sdk.minepi.com/pi-sdk.js"
          type="text/javascript"
        />
        <script
          async
          crossOrigin="anonymous"
          defer
          src="https://app-cdn.minepi.com/pi-sdk.js"
          type="text/javascript"
        />

        {/* Simple Pi SDK status tracking - with safe auto-init */}
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: Required for Pi SDK tracking
          dangerouslySetInnerHTML={{
            __html: `
window.__piInitialization = { status: 'pending', authenticated: false };
console.log('[Pi SDK] Script loaded, checking environment...');

// Safely check for Pi Browser and initialize
(function initPiSdk() {
  // Check if we're in Pi Browser first
  var ua = navigator.userAgent || '';
  var isPiBrowser = ua.indexOf('PiBrowser') !== -1 || ua.indexOf('Pi Browser') !== -1 || ua.indexOf('PiNetwork') !== -1;
  
  console.log('[Pi SDK] User-Agent:', ua);
  console.log('[Pi SDK] In Pi Browser:', isPiBrowser);
  
  if (!isPiBrowser) {
    console.log('[Pi SDK] Not in Pi Browser - SDK will not work. Marking as unavailable.');
    window.__piInitialization.status = 'unavailable';
    window.__piInitialization.error = 'Not running in Pi Browser';
    return;
  }
  
  // Wait for Pi SDK to load
  function checkAndInit() {
    if (typeof window.Pi === 'undefined') {
      console.log('[Pi SDK] window.Pi not yet available, waiting...');
      setTimeout(checkAndInit, 200);
      return;
    }
    
    console.log('[Pi SDK] window.Pi found! Detecting domain...');
    
    // Domain-based network detection
    var hostname = window.location.hostname.toLowerCase();
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
    
    console.log('[Pi SDK] Domain: ' + hostname + ', sandbox: ' + sandbox);
    window.__piInitialization.status = 'initializing';
    
    try {
      window.Pi.init({ version: '2.0', sandbox: sandbox }).then(function() {
        console.log('[Pi SDK] Init completed, authenticating...');
        return window.Pi.authenticate(['username', 'payments'], function(payment) {
          console.log('[Pi SDK] Incomplete payment found:', payment);
        });
      }).then(function(auth) {
        console.log('[Pi SDK] Authenticated!', auth);
        window.__piInitialization.status = 'ready';
        window.__piInitialization.authenticated = true;
        window.__piInitialization.user = auth ? auth.user : null;
        // Fire event for React components
        window.dispatchEvent(new CustomEvent('piReady', { detail: auth }));
      }).catch(function(err) {
        console.error('[Pi SDK] Init/Auth error:', err);
        window.__piInitialization.status = 'failed';
        window.__piInitialization.error = err.message || String(err);
        window.dispatchEvent(new CustomEvent('piError', { detail: { message: err.message || String(err) }}));
      });
    } catch(e) {
      console.error('[Pi SDK] Exception:', e);
      window.__piInitialization.status = 'failed';
    }
  }
  
  // Start check after short delay to let scripts load
  setTimeout(checkAndInit, 100);
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
            <PiProvider>{children}</PiProvider>
            {/* Pi SDK Debug Panel */}
            <PiSdkDebugPanel />
          </LocaleProvider>
        </ThemeProvider>
        {/* Analytics disabled - may cause issues in Pi Browser */}
        {/* <Analytics /> */}
      </body>
    </html>
  );
}
