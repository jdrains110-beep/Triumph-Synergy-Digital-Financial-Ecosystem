# ==============================================================================
# Compliance Engine Dockerfile
# ==============================================================================
# KYC/AML/GDPR screening pipeline — exposes REST on :8087
# ==============================================================================

FROM node:20-alpine AS base
RUN apk add --no-cache curl tini bash

FROM base AS builder
WORKDIR /app
COPY docker/package.microservice.json ./package.json
RUN npm install
COPY lib/compliance ./lib/compliance
COPY lib/pi-kyc ./lib/pi-kyc
COPY lib/identity ./lib/identity
COPY lib/security ./lib/security
COPY docker/compliance/bootstrap.ts ./docker/compliance/bootstrap.ts
COPY tsconfig.docker.json ./tsconfig.json
RUN npx esbuild docker/compliance/bootstrap.ts \
      --bundle --platform=node --target=node20 --format=cjs \
      --external:events --outfile=dist/compliance.js

FROM base AS runner
WORKDIR /app
LABEL org.pinetwork.service="compliance"
LABEL org.pinetwork.central-node="GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V"
RUN addgroup --system --gid 1001 pinetwork && \
    adduser  --system --uid 1001 compliance && \
    mkdir -p /app/data && chown -R compliance:pinetwork /app
COPY --from=builder --chown=compliance:pinetwork /app/dist ./dist
ENV NODE_ENV=production
EXPOSE 8087
USER compliance
HEALTHCHECK --interval=15s --timeout=10s --retries=5 \
    CMD curl -f http://localhost:8087/health || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/compliance.js"]
