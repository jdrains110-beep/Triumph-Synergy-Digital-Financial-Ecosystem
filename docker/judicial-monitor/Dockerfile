# ==============================================================================
# Judicial Monitor — Courtroom Transparency & Anti-Railroading Engine
# ==============================================================================
# Real-time courtroom monitoring, evidence verification, bias detection,
# charge stacking prevention, and immutable transparency ledger.
# Florida-first deployment — scales to all 50 states.
# Exposes REST on :8096
# ==============================================================================

FROM node:20-alpine AS base
RUN apk add --no-cache curl tini bash

FROM base AS builder
WORKDIR /app
COPY docker/package.microservice.json ./package.json
RUN npm install
COPY lib/judicial ./lib/judicial
COPY lib/security ./lib/security
COPY docker/judicial-monitor/bootstrap.ts ./docker/judicial-monitor/bootstrap.ts
COPY tsconfig.docker.json ./tsconfig.json
RUN npx esbuild docker/judicial-monitor/bootstrap.ts \
      --bundle --platform=node --target=node20 --format=cjs \
      --external:pg-native \
      --outfile=dist/judicial-monitor.js

FROM base AS runner
WORKDIR /app
LABEL org.pinetwork.service="judicial-monitor"
LABEL org.pinetwork.central-node="GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V"
LABEL org.triumph.judicial.purpose="courtroom-transparency-anti-railroading"
LABEL org.triumph.judicial.jurisdiction="florida-first"
LABEL org.triumph.owner.name="Jeremiah Joel Drains"
RUN addgroup --system --gid 1001 pinetwork && \
    adduser  --system --uid 1001 judicial && \
    mkdir -p /app/data && chown -R judicial:pinetwork /app
COPY --from=builder --chown=judicial:pinetwork /app/dist ./dist
ENV NODE_ENV=production
EXPOSE 8096
USER judicial
HEALTHCHECK --interval=15s --timeout=10s --retries=5 \
    CMD curl -f http://localhost:8096/health || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/judicial-monitor.js"]
