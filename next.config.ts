import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: "avatar.vercel.sh",
      },
    ],
    unoptimized: process.env.VERCEL === "1", // Disable image optimization on Vercel
    minimumCacheTTL: 31_536_000,
  },

  // Platform-aware output configuration
  // - Vercel: undefined (uses Vercel's output optimization)
  // - Docker: "standalone" (self-contained binary for containerization)
  // - Local: undefined (development mode)
  output: process.env.DOCKER_BUILD === "true" ? "standalone" : undefined,

  // Production optimizations
  compress: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,

  // Experimental features for better performance
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
    optimizePackageImports: ["@radix-ui/react-dialog", "sonner"],
  },

  // Ensure database connections aren't attempted during build
  env: {
    // These are build-time, not runtime
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || "1.0.0",
  },

  // Webpack configuration for better dependency handling
  webpack: (config, { isServer }) => {
    // Ignore optional dependencies that might not be available during build
    if (isServer) {
      config.externals = [
        ...(config.externals || []),
        {
          // Make these optional: only load if available
          redis: "redis",
          postgres: "postgres",
          pg: "pg",
        },
      ];
    }

    // Ensure proper memory usage during build
    config.optimization = config.optimization || {};
    config.optimization.splitChunks = {
      chunks: "all",
      cacheGroups: {
        default: false,
        vendors: false,
      },
    };

    return config;
  },

  // Turbopack configuration
  turbopack: {
    resolveAlias: {
      "@": "./*",
    },
  },

  // Prevent potential issues with trailing slashes
  trailingSlash: false,

  // No rewrites needed - pinet.com proxies to this Vercel app automatically
  // Pi Developer Portal configures the routing
  async rewrites() {
    return [];
  },

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
            key: "Content-Type",
            value: "text/plain",
          },
        ],
      },
      {
        // Allow all routes to be accessible through pinet proxy
        source: "/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "require-corp",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
