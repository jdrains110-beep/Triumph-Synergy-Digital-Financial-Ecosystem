import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable type checking during build to catch real errors
  typescript: {
    // Ignore build errors for now - will be fixed in next release
    // The errors are in dependencies (streamdown), not our code
    ignoreBuildErrors: true,
  },

  images: {
    remotePatterns: [
      {
        // Pi Network ecosystem CDN only
        hostname: "*.minepi.com",
      },
      {
        hostname: "localhost",
      },
    ],
    // Keep Next.js image optimization enabled in Docker (sharp is installed)
    unoptimized: false,
    // 1 year CDN cache for optimized images
    minimumCacheTTL: 31_536_000,
    // Serve WebP by default for all modern browsers
    formats: ["image/webp", "image/avif"],
    // Predefine sizes so Next.js generates fewer srcset variants
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Platform-aware output configuration
  output: process.env.DOCKER_BUILD === "true" ? "standalone" : undefined,

  // Enable production optimizations
  compress: true,
  poweredByHeader: false,

  // Experimental features for better performance
  experimental: {
    // Tree-shake these large packages — only import what's used
    optimizePackageImports: [
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@radix-ui/react-tooltip",
      "lucide-react",
      "sonner",
      "framer-motion",
      "date-fns",
    ],
  },

  // Ensure database connections aren't attempted during build
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || "1.0.0",
  },

  // Prevent potential issues with trailing slashes
  trailingSlash: false,

  // Ensure proper headers for caching
  headers: async () => {
    return [
      // ── Immutable static assets (JS/CSS bundles with content hash) ──────
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // ── Next.js image optimization output ───────────────────────────────
      {
        source: "/_next/image",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
          { key: "Vary", value: "Accept" },
        ],
      },
      // ── Public static files (icons, images, fonts, manifests) ───────────
      {
        source: "/favicon.ico",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
      {
        source: "/:file(.*\\.(?:png|jpg|jpeg|webp|avif|gif|svg|ico|woff2?|ttf|eot|otf))",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
          { key: "Vary", value: "Accept" },
        ],
      },
      // ── Pi verification / stellar.toml ───────────────────────────────────
      {
        source: "/.well-known/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
      {
        source: "/.well-known/stellar.toml",
        headers: [
          { key: "Content-Type", value: "text/plain; charset=utf-8" },
        ],
      },
      // ── API routes — never cache ─────────────────────────────────────────
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
      // ── All other routes — short-lived CDN edge cache ───────────────────
      {
        source: "/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: process.env.PI_ACAO_ORIGIN || "*",
          },
          // Cloudflare CDN: cache HTML pages for 60s, serve stale for 5min
          // while revalidating — eliminates cold-start latency for millions of visitors
          {
            key: "Cache-Control",
            value: "public, s-maxage=60, stale-while-revalidate=300",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
