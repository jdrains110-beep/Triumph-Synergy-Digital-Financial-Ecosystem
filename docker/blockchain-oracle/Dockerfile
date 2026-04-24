# ==============================================================================
# Blockchain Oracle Service Dockerfile
# ==============================================================================
# Streams Pi Network Horizon SSE ledger events, publishes to Redis pub/sub,
# persists on-chain events to Postgres, exposes REST on :8086
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
COPY docker/blockchain-oracle/bootstrap.ts ./docker/blockchain-oracle/bootstrap.ts
COPY tsconfig.docker.json ./tsconfig.json
RUN npx esbuild docker/blockchain-oracle/bootstrap.ts \
      --bundle --platform=node --target=node20 --format=cjs \
      --external:events --outfile=dist/blockchain-oracle.js

FROM base AS runner
WORKDIR /app
LABEL org.pinetwork.service="blockchain-oracle"
LABEL org.pinetwork.central-node="GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V"
RUN addgroup --system --gid 1001 pinetwork && \
    adduser  --system --uid 1001 oracle    && \
    mkdir -p /app/data && chown -R oracle:pinetwork /app
COPY --from=builder --chown=oracle:pinetwork /app/dist ./dist
ENV NODE_ENV=production
EXPOSE 8086
USER oracle
HEALTHCHECK --interval=15s --timeout=10s --retries=5 \
    CMD curl -f http://localhost:8086/health || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/blockchain-oracle.js"]
