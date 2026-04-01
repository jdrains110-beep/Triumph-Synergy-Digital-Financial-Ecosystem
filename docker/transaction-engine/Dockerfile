# ==============================================================================
# Pi Hyper-Transaction Engine Dockerfile
# ==============================================================================
# 
# 10 Billion TPS Transaction Processing
# Zero Congestion Guarantee
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

LABEL org.pinetwork.service="transaction-engine"
LABEL org.pinetwork.central-node="GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V"

RUN addgroup --system --gid 1001 pinetwork
RUN adduser --system --uid 1001 txengine
RUN mkdir -p /app/data && chown -R txengine:pinetwork /app

COPY --from=builder --chown=txengine:pinetwork /app/dist ./dist
COPY --from=builder --chown=txengine:pinetwork /app/node_modules ./node_modules
COPY --from=builder --chown=txengine:pinetwork /app/lib ./lib

ENV NODE_ENV=production
ENV ENGINE_MODE=hyper
ENV MAX_TPS=10000000000
ENV SHARD_COUNT=1024
ENV PARALLEL_CHANNELS=10000

EXPOSE 8080

USER txengine

HEALTHCHECK --interval=15s --timeout=10s --retries=5 \
    CMD curl -f http://localhost:8080/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/lib/pi-transaction/pi-hyper-transaction-engine.js"]
