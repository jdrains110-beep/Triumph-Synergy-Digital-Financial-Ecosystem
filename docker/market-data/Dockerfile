# ==============================================================================
# Market Data Service Dockerfile
# ==============================================================================
# Polls Pi Network Horizon API every 5 s for live ledger/fee/market data,
# caches to Redis, persists to Postgres, exposes REST on :8085
# ==============================================================================

FROM node:20-alpine AS base
RUN apk add --no-cache curl tini bash

FROM base AS builder
WORKDIR /app
COPY docker/package.microservice.json ./package.json
RUN npm install
COPY lib/blockchain ./lib/blockchain
COPY lib/stellar ./lib/stellar
COPY lib/pi-network ./lib/pi-network
COPY lib/api ./lib/api
COPY docker/market-data/bootstrap.ts ./docker/market-data/bootstrap.ts
COPY tsconfig.docker.json ./tsconfig.json
RUN npx esbuild docker/market-data/bootstrap.ts \
      --bundle --platform=node --target=node20 --format=cjs \
      --external:events --outfile=dist/market-data.js

FROM base AS runner
WORKDIR /app
LABEL org.pinetwork.service="market-data"
LABEL org.pinetwork.central-node="GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V"
RUN addgroup --system --gid 1001 pinetwork && \
    adduser  --system --uid 1001 mktdata  && \
    mkdir -p /app/data && chown -R mktdata:pinetwork /app
COPY --from=builder --chown=mktdata:pinetwork /app/dist ./dist
ENV NODE_ENV=production
EXPOSE 8085
USER mktdata
HEALTHCHECK --interval=15s --timeout=10s --retries=5 \
    CMD curl -f http://localhost:8085/health || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/market-data.js"]
