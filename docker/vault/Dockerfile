# ==============================================================================
# Pi Trillion Vault Dockerfile
# ==============================================================================
# 
# Unlimited Capacity Vault Management
# Quantum Encryption Protection
# Central Node: GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V
# ==============================================================================

FROM node:20-alpine AS base

RUN apk add --no-cache curl tini bash openssl

# Dependencies
FROM base AS builder
WORKDIR /app

COPY docker/package.microservice.json ./package.json
RUN npm install

COPY lib/pi-transaction ./lib/pi-transaction
COPY docker/vault/bootstrap.ts ./docker/vault/bootstrap.ts
COPY tsconfig.docker.json ./tsconfig.json

RUN npx esbuild docker/vault/bootstrap.ts \
      --bundle --platform=node --target=node20 --format=cjs \
      --external:events --outfile=dist/vault.js

# Runner
FROM base AS runner
WORKDIR /app

LABEL org.pinetwork.service="trillion-vault"
LABEL org.pinetwork.central-node="GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V"

RUN addgroup --system --gid 1001 pinetwork
RUN adduser --system --uid 1001 vault
RUN mkdir -p /app/data /app/data/vaults /app/data/audit && \
    chown -R vault:pinetwork /app

COPY --from=builder --chown=vault:pinetwork /app/dist ./dist

ENV NODE_ENV=production
ENV VAULT_MODE=trillion
ENV MAX_CAPACITY=unlimited
ENV QUANTUM_ENCRYPTION=true
ENV MULTI_SIG_MAX=10
ENV REAL_TIME_AUDIT=true

EXPOSE 8081

USER vault

HEALTHCHECK --interval=15s --timeout=10s --retries=5 \
    CMD curl -f http://localhost:8081/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/vault.js"]
