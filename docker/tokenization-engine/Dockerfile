# ==============================================================================
# Tokenization Engine Dockerfile
# ==============================================================================
# Pi domain + allodial deed tokenization on Pi blockchain via Stellar SCP
# Serves on :8089
# ==============================================================================

FROM node:22-alpine AS base
RUN apk upgrade --no-cache
RUN apk add --no-cache curl tini bash

FROM base AS builder
WORKDIR /app
COPY docker/package.microservice.json ./package.json
RUN npm install
COPY docker/tokenization-engine/bootstrap.ts ./docker/tokenization-engine/bootstrap.ts
COPY docker/tokenization-engine/stellar-broadcaster.ts ./docker/tokenization-engine/stellar-broadcaster.ts
COPY tsconfig.docker.json ./tsconfig.json
RUN npx esbuild docker/tokenization-engine/bootstrap.ts \
    --bundle --platform=node --target=node20 --format=cjs \
    --external:events --outfile=dist/tokenization-engine.js

FROM base AS runner
WORKDIR /app
LABEL org.pinetwork.service="tokenization-engine"
LABEL org.pinetwork.central-node="GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V"
RUN addgroup --system --gid 1001 pinetwork && \
    adduser  --system --uid 1001 tokenengine && \
    mkdir -p /app/data && chown -R tokenengine:pinetwork /app
COPY --from=builder --chown=tokenengine:pinetwork /app/dist ./dist
ENV NODE_ENV=production
EXPOSE 8089
USER tokenengine
HEALTHCHECK --interval=15s --timeout=10s --retries=5 \
    CMD wget -qO- http://localhost:8089/health || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/tokenization-engine.js"]
