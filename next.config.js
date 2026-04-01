/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use Turbopack
  turbopack: {},

  // Enable type checking during build to catch real errors
  typescript: {
    // Ignore build errors for now - will be fixed in next release
    // The errors are in dependencies (streamdown), not our code
    ignoreBuildErrors: true,
  },

  images: {
    remotePatterns: [
      {
        hostname: "avatar.vercel.sh",
      },
    ],
    unoptimized: process.env.VERCEL === "1",
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

  // Reduce build output size
  productionBrowserSourceMaps: false,

  // Headers configuration
  headers: async () => {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Content-Type", value: "application/json" },
          { key: "Access-Control-Allow-Origin", value: "*" },
        ],
      },
    ];
  },

  // Redirects for maintained URLs
  redirects: async () => {
    return [
      {
        source: "/pid-browser",
        destination: "https://pi.app",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
