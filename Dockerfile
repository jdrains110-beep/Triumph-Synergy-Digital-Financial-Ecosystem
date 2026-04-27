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
RUN apk add --no-cache curl tini wget && \
    corepack disable && \
    npm install -g yarn@1.22.22 --prefer-offline 2>/dev/null; \
    yarn --version || npm install -g yarn@1.22.22

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./
# BuildKit cache mount — yarn packages cached in a Docker volume.
# Cache ID bumped to v2 to avoid the corrupted @stellar/stellar-sdk entry.
# yarn cache clean runs first to evict any corrupt tarballs from the volume.
# network-timeout 600000 = 10 min per package (handles slow registry responses)
# network-concurrency 1 serialises fetches to avoid simultaneous TLS timeouts
RUN --mount=type=cache,id=triumph-yarn-cache-v2,target=/usr/local/share/.cache/yarn \
    yarn cache clean --cache-folder /usr/local/share/.cache/yarn 2>/dev/null || true && \
    yarn config set network-timeout 600000 && \
    yarn install --frozen-lockfile \
    --network-timeout 600000 \
    --network-concurrency 1 \
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
