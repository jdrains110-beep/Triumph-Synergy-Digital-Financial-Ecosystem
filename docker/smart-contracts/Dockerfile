# ==============================================================================
# Pi Smart Contract Engine Dockerfile
# ==============================================================================
# 
# 10,000 Parallel Execution Channels
# Unlimited Gas Execution
# Checkpoint/Resume System
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
COPY docker/smart-contracts/bootstrap.ts ./docker/smart-contracts/bootstrap.ts
COPY tsconfig.docker.json ./tsconfig.json

RUN npx esbuild docker/smart-contracts/bootstrap.ts \
      --bundle --platform=node --target=node20 --format=cjs \
      --external:events --outfile=dist/smart-contracts.js

# Runner
FROM base AS runner
WORKDIR /app

LABEL org.pinetwork.service="smart-contracts"
LABEL org.pinetwork.central-node="GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V"

RUN addgroup --system --gid 1001 pinetwork
RUN adduser --system --uid 1001 contracts
RUN mkdir -p /app/data /app/data/contracts /app/data/checkpoints && \
    chown -R contracts:pinetwork /app

COPY --from=builder --chown=contracts:pinetwork /app/dist ./dist

ENV NODE_ENV=production
ENV EXECUTION_CHANNELS=10000
ENV MAX_CONTRACT_SIZE_MB=100
ENV GAS_LIMIT=unlimited
ENV CHECKPOINT_ENABLED=true
ENV AUTO_RESUME=true
ENV INTERRUPTION_PROTECTION=true

EXPOSE 8082

USER contracts

HEALTHCHECK --interval=15s --timeout=10s --retries=5 \
    CMD curl -f http://localhost:8082/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/smart-contracts.js"]
