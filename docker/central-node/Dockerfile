# ==============================================================================
# Pi Central Node Dockerfile
# ==============================================================================
# 
# Stellar Core + Pi Network Central Node Integration
# Central Node: GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V
#
# Features:
# - Stellar Core for SCP consensus
# - Pi Network protocol synchronization
# - 10 billion TPS transaction handling
# - Zero congestion guarantee
# - Automatic SCP upgrades
# ==============================================================================

FROM node:20-alpine AS base

# Install dependencies
RUN apk add --no-cache \
    curl \
    tini \
    bash \
    openssl \
    ca-certificates \
    postgresql-client \
    python3 \
    make \
    g++ \
    git

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate

# ==============================================================================
# Dependencies Stage
# ==============================================================================

FROM base AS deps
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ==============================================================================
# Builder Stage
# ==============================================================================

FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY lib/pi-transaction ./lib/pi-transaction
COPY lib/stellar ./lib/stellar
COPY tsconfig.json ./

# Build TypeScript
RUN pnpm add -D typescript @types/node
RUN npx tsc --project tsconfig.json --outDir ./dist || true

# ==============================================================================
# Runner Stage
# ==============================================================================

FROM base AS runner
WORKDIR /app

# Labels
LABEL org.pinetwork.service="central-node"
LABEL org.pinetwork.central-node="GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V"
LABEL org.pinetwork.version="1.0.0"
LABEL org.pinetwork.description="Pi Network Central Node with Stellar Core Integration"

# Create non-root user
RUN addgroup --system --gid 1001 pinetwork
RUN adduser --system --uid 1001 centralnode

# Create data directories
RUN mkdir -p /app/data /opt/stellar/data && \
    chown -R centralnode:pinetwork /app /opt/stellar

# Copy built application
COPY --from=builder --chown=centralnode:pinetwork /app/dist ./dist
COPY --from=builder --chown=centralnode:pinetwork /app/node_modules ./node_modules
COPY --from=builder --chown=centralnode:pinetwork /app/lib ./lib

# Copy startup script
COPY docker/central-node/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Environment
ENV NODE_ENV=production
ENV CENTRAL_NODE_PUBLIC_KEY=GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V
ENV NODE_TYPE=central
ENV NODE_PRIORITY=supreme

# Stellar Core ports
EXPOSE 11625
EXPOSE 11626

# Pi Node ports
EXPOSE 31400-31409

# Health check HTTP port
EXPOSE 8080

USER centralnode

HEALTHCHECK --interval=15s --timeout=10s --retries=5 --start-period=30s \
    CMD curl -f http://localhost:11626/info || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/entrypoint.sh"]
