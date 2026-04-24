FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache curl tini

# Install production dependencies only
COPY package.json ./
RUN npm install --omit=dev

# Copy pre-compiled dist and source
COPY dist/ ./dist/
COPY index.ts ./

# Set memory limit
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=192"

EXPOSE 8084

HEALTHCHECK --interval=15s --timeout=10s --retries=5 --start-period=30s \
    CMD curl -f http://localhost:8084/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]
