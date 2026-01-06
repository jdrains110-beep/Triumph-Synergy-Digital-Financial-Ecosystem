import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: "avatar.vercel.sh",
      },
    ],
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
    return config;
  },
  // Provide an explicit (empty) turbopack config to avoid Turbopack detection
  turbopack: {},
};

export default nextConfig;

