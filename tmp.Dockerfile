# Multi-stage build for optimized production image
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate

# Copy package files
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod=false

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment for build
ENV NEXT_TELEMETRY_DISABLED 1
ENV RUN_MIGRATIONS false
ENV DOCKER_BUILD true

# Build application
RUN pnpm build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
