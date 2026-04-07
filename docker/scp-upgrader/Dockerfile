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

# Dependencies
FROM base AS builder
WORKDIR /app

COPY docker/package.microservice.json ./package.json
RUN npm install

COPY lib/pi-transaction ./lib/pi-transaction
COPY docker/scp-upgrader/bootstrap.ts ./docker/scp-upgrader/bootstrap.ts
COPY tsconfig.docker.json ./tsconfig.json

RUN npx esbuild docker/scp-upgrader/bootstrap.ts \
      --bundle --platform=node --target=node20 --format=cjs \
      --external:events --outfile=dist/scp-upgrader.js

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
CMD ["node", "dist/scp-upgrader.js"]
