# ==============================================================================
# SUPERNODE-PEER — Apex-Quantum peer supernode (no-npm-install fast bundle)
# ==============================================================================
# bootstrap.ts only depends on node built-ins (node:http, events) + local
# lib/pi-transaction. We bundle with a one-shot esbuild via npx --yes.
# ==============================================================================
# Copyright (C) 2024-2026 Jeremiah Joel Drains. License: PiOS
FROM node:22-alpine AS builder
RUN apk upgrade --no-cache
WORKDIR /b
RUN apk add --no-cache curl
COPY lib/pi-transaction ./lib/pi-transaction
COPY lib/stellar        ./lib/stellar
COPY lib/security       ./lib/security
COPY lib/identity       ./lib/identity
COPY docker/central-node/bootstrap.ts ./docker/central-node/bootstrap.ts
RUN npx --yes esbuild@0.24.0 docker/central-node/bootstrap.ts \
      --bundle --platform=node --target=node20 --format=cjs \
      --outfile=/out/supernode-peer.js

FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache curl tini && \
    addgroup --system --gid 1016 peer && \
    adduser  --system --uid 1016 --ingroup peer peer && \
    mkdir -p /app/data && chown -R peer:peer /app
COPY --from=builder --chown=peer:peer /out/supernode-peer.js ./supernode-peer.js
LABEL org.triumph.pod="supernode-peer" \
      org.triumph.role="apex-quantum-peer-supernode"
ENV NODE_ENV=production \
    SUPERNODE_ROLE=peer \
    SUPERNODE_ID=supernode-peer-2
EXPOSE 11626
USER peer
HEALTHCHECK --interval=20s --timeout=10s --retries=10 --start-period=60s \
    CMD curl -fsS http://127.0.0.1:11626/health || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "/app/supernode-peer.js"]
