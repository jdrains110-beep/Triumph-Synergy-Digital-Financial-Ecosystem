FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Build TypeScript
RUN npm install -g typescript && tsc index.ts --outDir dist

# Set memory limit
ENV NODE_OPTIONS="--max-old-space-size=4096"

CMD ["node", "dist/index.js"]
