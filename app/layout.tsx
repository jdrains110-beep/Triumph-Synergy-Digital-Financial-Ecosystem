import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { Toaster } from "sonner";
import { DataStreamProvider } from "@/components/data-stream-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { LocaleProvider } from "@/components/locale-provider";
import { getRequestLocale } from "@/lib/i18n/server";
import { PiProvider } from "@/lib/pi-sdk/pi-provider";

import "./globals.css";
import { SessionProvider } from "next-auth/react";

// Primary app domain
const metadataUrl = "https://triumphsynergy0576.pinet.com";

export const metadata: Metadata = {
  metadataBase: new URL(metadataUrl),
  title: "Triumph Synergy - Pi Network Payment Platform",
  description: "Advanced payment routing platform powered by Pi Network with Stellar blockchain settlement, biometric authentication, and enterprise-grade compliance. Accept Pi payments globally.",
  // Pi App Studio verification meta tags
  other: {
    "pi-app-id": "triumph-synergy",
    "pi-app-verified": "true",
    "pi-mainnet-url": "https://triumph-synergy-jeremiah-drains-projects.vercel.app",
    "pi-testnet-url": "https://triumph-synergy-testnet.vercel.app",
    "pi-custom-domain": "https://triumphsynergy0576.pinet.com",
    "pi-domain-verified": "2026-01-18",
    "pi-verification-method": "http-endpoint",
    "pi-verification-endpoint": "/.well-known/pi-app-verification",
  },
};

export const viewport = {
  maximumScale: 1,
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
      lang={locale}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: THEME_COLOR_SCRIPT,
          }}
        />
        <Script
          src="https://sdk.minepi.com/pi-sdk.js"
          strategy="beforeInteractive"
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
              <DataStreamProvider>
                <PiProvider>{children}</PiProvider>
              </DataStreamProvider>
            </LocaleProvider>
          </SessionProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}

