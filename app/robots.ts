import type { MetadataRoute } from "next";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://triumph-synergy.replit.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/(auth)/",
          "/auth/",
          "/diagnostic/",
          "/pi-app-studio-verify/",
          "/pi-studio-sync/",
          "/trisyn-test/",
          "/_next/",
        ],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
    host: APP_URL,
  };
}
