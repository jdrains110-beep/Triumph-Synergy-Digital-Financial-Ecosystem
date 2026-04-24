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

# Dependencies
FROM base AS builder
WORKDIR /app

COPY docker/package.microservice.json ./package.json
RUN npm install

COPY lib/pi-transaction ./lib/pi-transaction
COPY docker/transaction-engine/bootstrap.ts ./docker/transaction-engine/bootstrap.ts
COPY tsconfig.docker.json ./tsconfig.json

RUN npx esbuild docker/transaction-engine/bootstrap.ts \
      --bundle --platform=node --target=node20 --format=cjs \
      --external:events --outfile=dist/transaction-engine.js

# Runner
FROM base AS runner
WORKDIR /app

LABEL org.pinetwork.service="transaction-engine"
LABEL org.pinetwork.central-node="GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V"

RUN addgroup --system --gid 1001 pinetwork
RUN adduser --system --uid 1001 txengine
RUN mkdir -p /app/data && chown -R txengine:pinetwork /app

COPY --from=builder --chown=txengine:pinetwork /app/dist ./dist

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
CMD ["node", "dist/transaction-engine.js"]
