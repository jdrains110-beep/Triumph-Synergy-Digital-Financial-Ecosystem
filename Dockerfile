# Multi-stage build for optimized production image
FROM node:24-alpine AS base

# Install minimal runtime helpers early
RUN apk add --no-cache curl tini wget && corepack enable

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./
# BuildKit cache mount — yarn packages are cached in a Docker volume.
# First build downloads packages; all subsequent builds reuse the cache
# even when yarn.lock changes.  Never re-downloads unless new packages added.
# NOTE: do NOT use --ignore-optional — lightningcss ships its musl binary
# as an optional dep and Tailwind CSS/Turbopack needs it on Alpine.
# network-timeout 600000 = 10 min per package (handles slow registry responses)
# network-concurrency 1 serialises fetches to avoid simultaneous TLS timeouts
RUN --mount=type=cache,id=triumph-yarn-cache,target=/usr/local/share/.cache/yarn \
    yarn cache clean --cache-folder /usr/local/share/.cache/yarn 2>/dev/null || true && \
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

HEALTHCHECK --interval=30s --timeout=10s --retries=5 --start-period=40s \
    CMD wget -qO- http://localhost:3000/api/health || exit 1

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
