import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { DataStreamProvider } from "@/components/data-stream-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { LocaleProvider } from "@/components/locale-provider";
import { getRequestLocale } from "@/lib/i18n/server";
import { PiProvider } from "@/lib/pi-sdk/pi-provider";

import "./globals.css";
import { SessionProvider } from "next-auth/react";

export const metadata: Metadata = {
  metadataBase: new URL("https://triumphsynergy0576.pinet.com"),
  title: "Triumph Synergy - Pi Network Payment Platform",
  description:
    "Advanced payment routing platform powered by Pi Network with Stellar blockchain settlement, biometric authentication, and enterprise-grade compliance. Accept Pi payments globally.",
  icons: {
    icon: "/favicon.ico",
  },
  keywords: ["Pi Network", "Pi Payments", "Payment Processing", "Cryptocurrency", "Compliance", "Fintech", "Blockchain", "Stellar"],
  authors: [{ name: "Triumph Synergy LLC" }],
  openGraph: {
    title: "Triumph Synergy - Pi Network Payment Platform",
    description: "Advanced payment routing powered by Pi Network - Accept Pi payments globally",
    url: "https://triumphsynergy0576.pinet.com",
    siteName: "Triumph Synergy",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Triumph Synergy - Pi Network Payment Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Triumph Synergy - Pi Network Payment Platform",
    description: "Advanced payment routing powered by Pi Network",
    images: ["/og-image.png"],
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
        {/* Pi Network SDK - Version 2.0 */}
        {/* Pi SDK loaded dynamically in PiPaymentButton with fallbacks */}
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
