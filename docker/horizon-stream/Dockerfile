# ==============================================================================
# HORIZON-STREAM — Super-Pod (2 services → 1 container)
# ==============================================================================
# Merges:
#   blockchain-oracle (8086) — Stellar/Pi ledger oracle
#   market-data       (8085) — Pi market data feed (testnet2)
# Shared Node 20 + @stellar/stellar-sdk + redis + pg
# Build context: REPO ROOT (needs docker/, lib/, tsconfig.docker.json)
# ==============================================================================
FROM node:22-alpine AS base
RUN apk upgrade --no-cache
RUN apk add --no-cache curl tini bash supervisor

FROM base AS builder
WORKDIR /app
COPY docker/package.microservice.json ./package.json
RUN npm install

# Shared libs
COPY lib/blockchain ./lib/blockchain
COPY lib/stellar    ./lib/stellar
COPY lib/pi-network ./lib/pi-network
COPY lib/api        ./lib/api

COPY docker/blockchain-oracle/bootstrap.ts ./docker/blockchain-oracle/bootstrap.ts
COPY docker/market-data/bootstrap.ts       ./docker/market-data/bootstrap.ts
COPY tsconfig.docker.json ./tsconfig.json

RUN npx esbuild docker/blockchain-oracle/bootstrap.ts \
    --bundle --platform=node --target=node20 --format=cjs \
    --external:events --outfile=dist/blockchain-oracle.js && \
    npx esbuild docker/market-data/bootstrap.ts \
    --bundle --platform=node --target=node20 --format=cjs \
    --external:events --outfile=dist/market-data.js

FROM base AS runner
WORKDIR /app

LABEL org.triumph.pod="horizon-stream" \
    org.triumph.merges="blockchain-oracle+market-data"

RUN addgroup --system --gid 1013 horizon && \
    adduser  --system --uid 1013 --ingroup horizon horizon && \
    mkdir -p /app/data /var/log/supervisor && \
    chown -R horizon:horizon /app /var/log/supervisor

COPY --from=builder --chown=horizon:horizon /app/dist ./dist
COPY docker/horizon-stream/supervisord.conf /etc/supervisord.conf

ENV NODE_ENV=production

EXPOSE 8085 8086

USER horizon

HEALTHCHECK --interval=20s --timeout=15s --retries=8 --start-period=120s \
    CMD curl -fsS http://127.0.0.1:8085/health && curl -fsS http://127.0.0.1:8086/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf", "-n"]
