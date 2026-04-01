# ==============================================================================
# Pi SCP Auto-Upgrade Service Dockerfile
# ==============================================================================
# 
# Automatic Protocol Synchronization with Pi Network
# Zero-Downtime Upgrades
# Rollback Protection
# Central Node: GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V
# ==============================================================================

FROM node:20-alpine AS base

RUN apk add --no-cache curl tini bash
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate

# Dependencies
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY lib/pi-transaction ./lib/pi-transaction
COPY tsconfig.json ./
RUN pnpm add -D typescript @types/node
RUN npx tsc --project tsconfig.json --outDir ./dist || true

# Runner
FROM base AS runner
WORKDIR /app

LABEL org.pinetwork.service="scp-upgrader"
LABEL org.pinetwork.central-node="GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V"

RUN addgroup --system --gid 1001 pinetwork
RUN adduser --system --uid 1001 scp
RUN mkdir -p /app/data /app/data/upgrades /app/data/validators && \
    chown -R scp:pinetwork /app

COPY --from=builder --chown=scp:pinetwork /app/dist ./dist
COPY --from=builder --chown=scp:pinetwork /app/node_modules ./node_modules
COPY --from=builder --chown=scp:pinetwork /app/lib ./lib

ENV NODE_ENV=production
ENV AUTO_UPGRADE=true
ENV ZERO_DOWNTIME=true
ENV ROLLBACK_ON_FAILURE=true
ENV VERSION_CHECK_INTERVAL_MS=60000
ENV PARAMETER_SYNC_INTERVAL_MS=30000
ENV VALIDATOR_SYNC_INTERVAL_MS=300000

EXPOSE 8083

USER scp

HEALTHCHECK --interval=15s --timeout=10s --retries=5 \
    CMD curl -f http://localhost:8083/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/lib/pi-transaction/pi-scp-auto-upgrade.js"]
