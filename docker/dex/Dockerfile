# ==============================================================================
# DEX Engine Dockerfile
# ==============================================================================
# Pi Network decentralized exchange — order book, pricing, liquidity on :8088
# ==============================================================================

FROM node:20-alpine AS base
RUN apk add --no-cache curl tini bash

FROM base AS builder
WORKDIR /app
COPY docker/package.microservice.json ./package.json
RUN npm install
COPY lib/dex ./lib/dex
COPY lib/tokens ./lib/tokens
COPY lib/blockchain ./lib/blockchain
COPY lib/stellar ./lib/stellar
COPY docker/dex/bootstrap.ts ./docker/dex/bootstrap.ts
COPY tsconfig.docker.json ./tsconfig.json
RUN npx esbuild docker/dex/bootstrap.ts \
      --bundle --platform=node --target=node20 --format=cjs \
      --external:events --outfile=dist/dex.js

FROM base AS runner
WORKDIR /app
LABEL org.pinetwork.service="dex"
LABEL org.pinetwork.central-node="GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V"
RUN addgroup --system --gid 1001 pinetwork && \
    adduser  --system --uid 1001 dexengine && \
    mkdir -p /app/data && chown -R dexengine:pinetwork /app
COPY --from=builder --chown=dexengine:pinetwork /app/dist ./dist
ENV NODE_ENV=production
EXPOSE 8088
USER dexengine
HEALTHCHECK --interval=15s --timeout=10s --retries=5 \
    CMD curl -f http://localhost:8088/health || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/dex.js"]
