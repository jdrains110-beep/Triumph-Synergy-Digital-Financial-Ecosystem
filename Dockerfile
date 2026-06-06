# Multi-stage build for optimized production image
FROM node:24-alpine AS base

# Install minimal runtime helpers.
# CRITICAL: package.json has "packageManager":"yarn@1.22.22" which triggers
# Corepack to intercept every 'yarn' call and try to download that exact
# version from the registry — this fails in Docker build networks.
# Fix: disable Corepack shims, then install yarn@1.22.22 via the npm JS API
# (avoids Corepack entirely). COREPACK_ENABLE_NETWORK=0 + STRICT=0 are set
# as ENV so they survive into child stages.
ENV COREPACK_ENABLE_NETWORK=0
ENV COREPACK_ENABLE_STRICT=0
RUN apk upgrade --no-cache
RUN apk add --no-cache curl tini wget && \
    corepack disable && \
    npm install -g yarn@1.22.22 --prefer-offline 2>/dev/null; \
    yarn --version || npm install -g yarn@1.22.22

# ── Single build stage: install deps + compile in one layer ──────────────────
# Merging deps + builder avoids a 300MB inter-stage COPY node_modules which
# causes Docker Desktop (Mac) BuildKit gRPC EOF and legacy-builder pipe crashes.
FROM base AS builder
# libc6-compat, python3, make, g++ — standard native build tools
# libusb-dev + eudev-dev — required by node-hid (transitive dep of @ledgerhq/hw-transport-node-hid)
RUN apk add --no-cache libc6-compat python3 make g++ libusb-dev eudev-dev linux-headers vips-dev
WORKDIR /app

# Copy package files
COPY package.json ./
# Use npm instead of yarn for fetching — yarn v1 hangs on [3/5] Fetching inside
# Docker Desktop on macOS due to connection-pool exhaustion.
# Strip the "packageManager" field so npm doesn't defer to corepack/yarn.
RUN sed -i 's|"packageManager":.*||' package.json && \
    npm config set registry https://registry.npmjs.org && \
    npm install --legacy-peer-deps --no-fund --no-audit && \
    npm install sharp --legacy-peer-deps --no-fund --no-audit || true

# Copy source and build
COPY . .

# Set environment for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=2048"
ENV RUN_MIGRATIONS=false
ENV DOCKER_BUILD=true

# Build application — fail hard if standalone output is missing
RUN yarn build && \
    test -s .next/standalone/server.js || \
    (echo "FATAL: .next/standalone/server.js missing or empty — build failed" && exit 1)

# Production image, copy all the files and run next
FROM alpine:latest AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install Node.js, sharp native deps, and tini
RUN apk add --no-cache nodejs npm tini vips

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built application from builder stage
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

HEALTHCHECK --interval=30s --timeout=20s --retries=8 --start-period=90s \
    CMD wget -qO- http://localhost:3000/api/health || exit 1

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Run tini as PID 1 so it reaps zombie processes correctly.
# -s registers tini as subreaper when it can't run as PID 1 (e.g. docker-compose).
ENTRYPOINT ["/sbin/tini", "-s", "--"]
CMD ["node", "server.js"]
