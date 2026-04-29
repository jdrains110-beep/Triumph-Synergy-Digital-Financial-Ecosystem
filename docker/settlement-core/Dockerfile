# ==============================================================================
# APEX-SETTLEMENT-CORE — Super-Pod (5 services → 1 container)
# ==============================================================================
# Merges:
#   transaction-engine  (8080) — 10B TPS hyper-engine
#   smart-contracts     (8082) — Pi smart-contract executor
#   tokenization-engine (8089) — Pi domain + allodial deed tokenization
#   dex                 (8088) — Sovereign DEX
#   payment-processor   (8084) — Pi payment processor (folded in for in-pod
#                                localhost calls between tx-engine and payments)
# Build context: REPO ROOT
# ==============================================================================
FROM node:20-alpine AS base
RUN apk add --no-cache curl tini bash supervisor

FROM base AS builder
WORKDIR /app
COPY docker/package.microservice.json ./package.json
RUN npm install
# Payment-processor extra deps (redis@4 + postgres@3) needed for its bundle
RUN npm install --no-save redis@4 postgres@3

# Shared libs (union of all 5)
COPY lib/pi-transaction ./lib/pi-transaction
COPY lib/dex            ./lib/dex
COPY lib/tokens         ./lib/tokens
COPY lib/blockchain     ./lib/blockchain
COPY lib/stellar        ./lib/stellar

COPY docker/transaction-engine/bootstrap.ts  ./docker/transaction-engine/bootstrap.ts
COPY docker/smart-contracts/bootstrap.ts     ./docker/smart-contracts/bootstrap.ts
COPY docker/tokenization-engine/bootstrap.ts ./docker/tokenization-engine/bootstrap.ts
COPY docker/dex/bootstrap.ts                 ./docker/dex/bootstrap.ts
COPY services/payment-processor/index.ts     ./services/payment-processor/index.ts
COPY tsconfig.docker.json ./tsconfig.json

RUN npx esbuild docker/transaction-engine/bootstrap.ts  --bundle --platform=node --target=node20 --format=cjs --external:events --outfile=dist/transaction-engine.js && \
    npx esbuild docker/smart-contracts/bootstrap.ts     --bundle --platform=node --target=node20 --format=cjs --external:events --outfile=dist/smart-contracts.js && \
    npx esbuild docker/tokenization-engine/bootstrap.ts --bundle --platform=node --target=node20 --format=cjs --external:events --outfile=dist/tokenization-engine.js && \
    npx esbuild docker/dex/bootstrap.ts                 --bundle --platform=node --target=node20 --format=cjs --external:events --outfile=dist/dex.js && \
    npx esbuild services/payment-processor/index.ts     --bundle --platform=node --target=node20 --format=cjs --external:events --outfile=dist/payment-processor.js

FROM base AS runner
WORKDIR /app

LABEL org.triumph.pod="settlement-core" \
    org.triumph.merges="transaction-engine+smart-contracts+tokenization-engine+dex+payment-processor" \
    org.triumph.tier="apex-sovereign"

RUN addgroup --system --gid 1014 settle && \
    adduser  --system --uid 1014 --ingroup settle settle && \
    mkdir -p /app/data /var/log/supervisor && \
    chown -R settle:settle /app /var/log/supervisor

COPY --from=builder --chown=settle:settle /app/dist ./dist
COPY docker/settlement-core/supervisord.conf /etc/supervisord.conf

ENV NODE_ENV=production \
    ENGINE_MODE=hyper \
    MAX_TPS=10000000000 \
    SHARD_COUNT=1024 \
    PARALLEL_CHANNELS=10000

EXPOSE 8080 8082 8084 8088 8089

USER settle

HEALTHCHECK --interval=20s --timeout=15s --retries=10 --start-period=180s \
    CMD curl -fsS http://127.0.0.1:8080/health && curl -fsS http://127.0.0.1:8082/health && curl -fsS http://127.0.0.1:8084/health && curl -fsS http://127.0.0.1:8088/health && curl -fsS http://127.0.0.1:8089/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf", "-n"]
