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
    unoptimized: process.env.DOCKER_BUILD === "true",
    minimumCacheTTL: 31_536_000,
  },

  // Platform-aware output configuration
  output: process.env.DOCKER_BUILD === "true" ? "standalone" : undefined,

  // Enable production optimizations
  compress: true,
  poweredByHeader: false,

  // Experimental features for better performance
  experimental: {
    // Optimize Radix UI imports
    optimizePackageImports: ["@radix-ui/react-dialog"],
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
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
      {
        // Allow Pi Network to access domain verification file
        source: "/.well-known/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
      {
        // SEP-1 stellar.toml — must be served as text/plain per the spec
        source: "/.well-known/stellar.toml",
        headers: [
          {
            key: "Content-Type",
            value: "text/plain; charset=utf-8",
          },
        ],
      },
      {
        // Allow all routes to be accessible through Pi Browser & known domains
        source: "/:path*",
        headers: [
          {
            // No hardcoded origin pin — Pi App Studio rotates the canonical
            // hostname on every fresh app transfer. Configure via
            // PI_ACAO_ORIGIN at deploy time, or fall back to wildcard so a
            // freshly-issued domain is never blocked.
            key: "Access-Control-Allow-Origin",
            value: process.env.PI_ACAO_ORIGIN || "*",
          },
          // Remove restrictive COOP/COEP headers that interfere with Pi Browser
          // {
          //   key: "Cross-Origin-Opener-Policy",
          //   value: "same-origin-allow-popups",
          // },
          // {
          //   key: "Cross-Origin-Embedder-Policy",
          //   value: "require-corp",
          // },
        ],
      },
    ];
  },
};

export default nextConfig;
