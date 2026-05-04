# ==============================================================================
# GOVERNANCE-SHIELD — Super-Pod (4 services → 1 container)
# ==============================================================================
# Merges:
#   compliance       (8087)  — KYC/AML/sanctions
#   judicial-monitor (8096)  — Court order + sanctions monitor
#   central-node     (11626) — Stellar Core compatible health/info + SCP peer
#   scp-upgrader     (8083)  — Stellar Consensus Protocol upgrader
# Build context: REPO ROOT
# ==============================================================================
FROM node:22-alpine AS base
RUN apk upgrade --no-cache
RUN apk add --no-cache curl tini bash supervisor

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
    org.triumph.merges="compliance+judicial-monitor+central-node+scp-upgrader" \
    org.pinetwork.central-node="GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V"

RUN addgroup --system --gid 1015 govern && \
    adduser  --system --uid 1015 --ingroup govern govern && \
    mkdir -p /app/data /app/data/central /app/data/scp /var/log/supervisor && \
    chown -R govern:govern /app /var/log/supervisor

COPY --from=builder --chown=govern:govern /app/dist ./dist
COPY docker/governance-shield/supervisord.conf /etc/supervisord.conf

ENV NODE_ENV=production

EXPOSE 8083 8087 8096 11625 11626 31400 31401 31402 31403 31404 31405 31406 31407 31408 31409

USER govern

HEALTHCHECK --interval=20s --timeout=15s --retries=10 --start-period=180s \
    CMD curl -fsS http://127.0.0.1:8087/health && curl -fsS http://127.0.0.1:8096/health && curl -fsS http://127.0.0.1:11626/health && curl -fsS http://127.0.0.1:8083/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf", "-n"]
