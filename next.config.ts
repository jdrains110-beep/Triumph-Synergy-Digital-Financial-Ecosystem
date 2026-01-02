import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: "avatar.vercel.sh",
      },
    ],
  },
  // Enable standalone output for Docker only (not for Vercel)
  output: process.env.DOCKER_BUILD === "true" ? "standalone" : undefined,
  // Optimize for production
  compress: true,
  poweredByHeader: false,
  // Handle Redis and PostgreSQL connections
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
