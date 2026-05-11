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

# Install dependencies only when needed
FROM base AS deps
# libc6-compat, python3, make, g++ — standard native build tools
# libusb-dev + eudev-dev — required by node-hid (transitive dep of @ledgerhq/hw-transport-node-hid)
RUN apk add --no-cache libc6-compat python3 make g++ libusb-dev eudev-dev linux-headers
WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./
# BuildKit cache mount — yarn packages cached in a Docker volume.
# Cache ID bumped to v3 to start with a clean slate (v2 had stale partial downloads).
# DO NOT run yarn cache clean here — it defeats the cache and forces full re-download every build.
# network-timeout 600000 = 10 min per package (handles slow registry responses)
# network-concurrency 4 allows parallel fetches; concurrency 1 caused single-package stalls
# --prefer-offline uses cached tarballs where available, network only for missing packages
RUN --mount=type=cache,id=triumph-yarn-cache-v3,target=/usr/local/share/.cache/yarn \
    yarn config set network-timeout 600000 && \
    yarn install --frozen-lockfile \
    --network-timeout 600000 \
    --network-concurrency 4 \
    --prefer-offline \
    --cache-folder /usr/local/share/.cache/yarn

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=1024"
ENV RUN_MIGRATIONS=false
ENV DOCKER_BUILD=true

# Build application — fail hard if standalone output is missing
RUN yarn build && \
    test -s .next/standalone/server.js || \
    (echo "FATAL: .next/standalone/server.js missing or empty — build failed" && exit 1)

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

HEALTHCHECK --interval=30s --timeout=20s --retries=8 --start-period=90s \
    CMD wget -qO- http://localhost:3000/api/health || exit 1

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
