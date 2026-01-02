FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY tsconfig.json ./
RUN npm install

# Copy source
COPY . .

# Build TypeScript
RUN npm run build && npm prune --omit=dev

# Set memory limit
ENV NODE_OPTIONS="--max-old-space-size=4096"

CMD ["node", "dist/index.js"]
