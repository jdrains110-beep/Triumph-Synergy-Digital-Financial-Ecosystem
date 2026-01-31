import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { LocaleProvider } from "@/components/locale-provider";
import { getRequestLocale } from "@/lib/i18n/server";
import { PiProvider } from "@/lib/pi-sdk/pi-provider";

import "./globals.css";
import { SessionProvider } from "next-auth/react";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://triumph-synergy.vercel.app"),
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
    url: process.env.NEXT_PUBLIC_APP_URL || "https://triumph-synergy.vercel.app",
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
        <script src="https://sdk.minepi.com/pi-sdk.js" type="text/javascript" crossOrigin="anonymous" />
        <script src="https://app-cdn.minepi.com/pi-sdk.js" type="text/javascript" crossOrigin="anonymous" async defer />
        
        {/* CRITICAL: Auto-initialize Pi SDK immediately after scripts load */}
        {/* This is what was missing - without this, Pi Browser doesn't recognize the app */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function() {
  window.__piInitialization = {
    status: 'initializing',
    startTime: Date.now()
  };

  function detectNetwork(hostname) {
    // ============================================
    // EXPLICIT FULL DOMAIN URL MATCHING
    // ALL 5 PRODUCTION DOMAINS LISTED EXPLICITLY
    // ============================================
    
    // PINET TESTNET DOMAIN
    if (hostname === 'triumphsynergy1991.pinet.com') {
      return { network: 'testnet', sandbox: true };
    }
    
    // PINET MAINNET DOMAINS
    if (hostname === 'triumphsynergy7386.pinet.com') {
      return { network: 'mainnet', sandbox: false };
    }
    
    if (hostname === 'triumphsynergy0576.pinet.com') {
      return { network: 'mainnet', sandbox: false };
    }
    
    // VERCEL MAINNET DOMAIN
    if (hostname === 'triumph-synergy.vercel.app') {
      return { network: 'mainnet', sandbox: false };
    }
    
    // VERCEL TESTNET DOMAIN (EXPLICIT)
    if (hostname === 'triumph-synergy-testnet.vercel.app') {
      return { network: 'testnet', sandbox: true };
    }
    
    // Fallback: Any other vercel.app subdomain = testnet
    if (hostname.endsWith('.vercel.app')) {
      return { network: 'testnet', sandbox: true };
    }
    
    // Fallback: localhost = testnet for development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return { network: 'testnet', sandbox: true };
    }
    
    // Default to mainnet for unknown domains
    return { network: 'mainnet', sandbox: false };
  }

  async function initializePi() {
    const hostname = window.location.hostname;
    const networkInfo = detectNetwork(hostname);
    
    console.log('[Pi SDK Auto-Init] ===== AUTOMATIC INITIALIZATION =====');
    console.log('[Pi SDK Auto-Init] Domain:', hostname);
    console.log('[Pi SDK Auto-Init] Network:', networkInfo.network);
    console.log('[Pi SDK Auto-Init] Sandbox:', networkInfo.sandbox);

    try {
      // Wait for Pi SDK to load
      let attempts = 0;
      while (!window.Pi && attempts < 200) {
        await new Promise(resolve => setTimeout(resolve, 50));
        attempts++;
      }

      if (!window.Pi) throw new Error('window.Pi never loaded');
      console.log('[Pi SDK Auto-Init] ✓ window.Pi loaded');

      // Initialize Pi SDK
      await window.Pi.init({
        version: '2.0',
        sandbox: networkInfo.sandbox,
        appId: 'triumph-synergy'
      });
      console.log('[Pi SDK Auto-Init] ✓ Pi.init() succeeded');

      // CRITICAL: Authenticate with payments scope
      // This is what tells Pi Browser this is a valid payments app
      const auth = await window.Pi.authenticate(
        ['payments'],
        (payment) => console.log('[Pi SDK] Incomplete payment:', payment)
      );
      console.log('[Pi SDK Auto-Init] ✓ AUTHENTICATED - User:', auth.user.uid);
      
      window.__piInitialization.status = 'ready';
      window.__piInitialization.authenticated = true;
      window.__piInitialization.duration = Date.now() - window.__piInitialization.startTime;
      
      console.log('[Pi SDK Auto-Init] ===== READY FOR PAYMENTS =====');
      window.dispatchEvent(new CustomEvent('piReady', { detail: auth }));
      
    } catch (error) {
      console.error('[Pi SDK Auto-Init] ❌ FAILED:', error);
      window.__piInitialization.status = 'failed';
      window.__piInitialization.error = error.message;
      window.dispatchEvent(new CustomEvent('piError', { detail: error }));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePi);
  } else {
    initializePi();
  }
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
          <SessionProvider>
            <LocaleProvider locale={locale}>
              <PiProvider>{children}</PiProvider>
            </LocaleProvider>
          </SessionProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
