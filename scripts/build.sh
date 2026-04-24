#!/bin/bash
# GitHub Actions build script with optimized memory settings
set -e

# Configure Node.js for limited memory environments
export NODE_OPTIONS="--max-old-space-size=6144"
export NODE_ENV=production

# Clean build cache
rm -rf .next
rm -rf .turbo

# Install dependencies
pnpm install --frozen-lockfile

# Run build
pnpm run build

echo "Build completed successfully!"
