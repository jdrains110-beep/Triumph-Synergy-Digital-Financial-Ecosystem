# ==============================================================================
# GOVERNANCE-SHIELD — Super-Pod (4 services → 1 container) + Embedded Stellar Core
# ==============================================================================
# Merges:
#   stellar-core     (11626) — Pi Mainnet SCP v24 validator + /info endpoint (EMBEDDED)
#   compliance       (8087)  — KYC/AML/sanctions
#   judicial-monitor (8096)  — Court order + sanctions monitor
#   central-node     (11626) — SCP peer + governance (serves stellar-core /info locally)
#   scp-upgrader     (8083)  — Stellar Consensus Protocol upgrader
# Build context: REPO ROOT
# 
# NOTE: stellar-core v24 is EMBEDDED as central-node HTTP service (no binary needed)
# ==============================================================================
FROM node:22-alpine AS base
RUN apk upgrade --no-cache
RUN apk add --no-cache curl tini bash supervisor sqlite libpq libstdc++

FROM base AS builder
WORKDIR /app
COPY docker/package.microservice.json ./package.json
RUN npm install

# Shared libs (union of all 4)
COPY lib/compliance     ./lib/compliance
COPY lib/pi-kyc         ./lib/pi-kyc
COPY lib/identity       ./lib/identity
COPY lib/security       ./lib/security
COPY lib/judicial       ./lib/judicial
COPY lib/pi-transaction ./lib/pi-transaction
COPY lib/stellar        ./lib/stellar

COPY docker/compliance/bootstrap.ts       ./docker/compliance/bootstrap.ts
COPY docker/judicial-monitor/bootstrap.ts ./docker/judicial-monitor/bootstrap.ts
COPY docker/central-node/bootstrap.ts     ./docker/central-node/bootstrap.ts
COPY docker/scp-upgrader/bootstrap.ts     ./docker/scp-upgrader/bootstrap.ts
COPY tsconfig.docker.json ./tsconfig.json

RUN npx esbuild docker/compliance/bootstrap.ts       --bundle --platform=node --target=node20 --format=cjs --external:events --outfile=dist/compliance.js && \
    npx esbuild docker/judicial-monitor/bootstrap.ts --bundle --platform=node --target=node20 --format=cjs --external:events --outfile=dist/judicial-monitor.js && \
    npx esbuild docker/central-node/bootstrap.ts     --bundle --platform=node --target=node20 --format=cjs --external:events --outfile=dist/central-node.js && \
    npx esbuild docker/scp-upgrader/bootstrap.ts     --bundle --platform=node --target=node20 --format=cjs --external:events --outfile=dist/scp-upgrader.js

FROM base AS runner
WORKDIR /app

LABEL org.triumph.pod="governance-shield" \
    org.triumph.merges="stellar-core+compliance+judicial-monitor+central-node+scp-upgrader" \
    org.triumph.stellar-core="EMBEDDED_V24_PROTOCOL_ENGINE" \
    org.pinetwork.central-node="GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V"

RUN addgroup --system --gid 1015 govern && \
    adduser  --system --uid 1015 --ingroup govern govern && \
    mkdir -p /app/data /app/data/central /app/data/scp /app/data/stellar-core \
    /app/config /var/log/supervisor /var/log/stellar-core && \
    chown -R govern:govern /app /var/log/supervisor /var/log/stellar-core

COPY --from=builder --chown=govern:govern /app/dist ./dist
COPY docker/governance-shield/supervisord.conf /etc/supervisord.conf

ENV NODE_ENV=production \
    STELLAR_CORE_PROTOCOL=24 \
    STELLAR_CORE_VERSION=v24.0.0 \
    STELLAR_CORE_NETWORK=Pi\ Network

EXPOSE 8083 8087 8096 11625 11626 31400-31410

USER govern

HEALTHCHECK --interval=20s --timeout=15s --retries=10 --start-period=60s \
    CMD curl -fsS http://127.0.0.1:8087/health 2>/dev/null || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf", "-n"]
