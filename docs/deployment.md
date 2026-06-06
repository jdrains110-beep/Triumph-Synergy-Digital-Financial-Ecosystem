# Deployment Guide

## Overview

This guide covers deploying Triumph-Synergy to various environments.

## Quick Deploy

### Replit (Staging)

Deploy to staging via Replit: <https://Triumph-Synergy.replit.app>

1. Fork / import the repository into Replit
2. Configure environment variables in the Replit Secrets pane
3. Run the development server and promote to deploy

### Manual Deploy

```bash
# Pull latest main inside the Replit container
git reset --hard origin/main

# Install + build (use yarn since lockfile is yarn)
yarn install --frozen-lockfile
yarn build

# Start (Replit auto-runs `yarn start` when configured)
yarn start
```

## Environment Configuration

### Required Variables

```bash
# Database
POSTGRES_URL=postgresql://user:password@host:5432/database

# Redis (for sessions/cache)
REDIS_URL=redis://user:password@host:6379

# Authentication
AUTH_SECRET=your-auth-secret-min-32-chars
NEXTAUTH_URL=https://triumphsynergy.com

# Pi Network
PI_API_KEY=your-pi-api-key
PI_INTERNAL_API_KEY=your-internal-api-key

# Stellar
STELLAR_HORIZON_URL=https://horizon.stellar.org
STELLAR_PAYMENT_ACCOUNT=Gxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STELLAR_PAYMENT_SECRET=Sxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Pi Value Configuration
INTERNAL_PI_MULTIPLIER=1.5
INTERNAL_PI_MIN_VALUE=10.0
EXTERNAL_PI_MIN_VALUE=1.0
```

### Optional Variables

```bash
# Monitoring
SENTRY_DSN=https://...
VERCEL_ANALYTICS_ID=...  # removed—analytics now via /api/health/check + GitHub Actions monitoring

# Email (optional)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...

# Feature Flags
ENABLE_BIOMETRIC_AUTH=true
ENABLE_STREAMING=true
```

## Database Setup

### Supabase (Recommended)

1. Create project at [supabase.com](https://supabase.com)
2. Get connection string from Settings > Database
3. Set `POSTGRES_URL` environment variable

### Self-Hosted PostgreSQL

```bash
# Start PostgreSQL container
docker run -d \
  --name triumph-postgres \
  -e POSTGRES_USER=triumph \
  -e POSTGRES_PASSWORD=secure-password \
  -e POSTGRES_DB=triumph_synergy \
  -p 5432:5432 \
  postgres:16
```

### Run Migrations

```bash
# Generate migrations
pnpm db:generate

# Apply migrations
pnpm db:migrate
```

## Redis Setup

### Upstash (Recommended)

1. Create database at [upstash.com](https://upstash.com)
2. Get connection string
3. Set `REDIS_URL` environment variable

### Self-Hosted Redis

```bash
docker run -d \
  --name triumph-redis \
  -p 6379:6379 \
  redis:7
```

## Docker Deployment

### Build Image

```bash
docker build -t triumph-synergy .
```

### Run Container

```bash
docker run -d \
  --name triumph-synergy \
  -p 3000:3000 \
  -e POSTGRES_URL=... \
  -e REDIS_URL=... \
  -e AUTH_SECRET=... \
  triumph-synergy
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - POSTGRES_URL=postgresql://triumph:password@postgres:5432/triumph_synergy
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:16
    environment:
      - POSTGRES_USER=triumph
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=triumph_synergy
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## CI/CD with GitHub Actions

### Deploy on Push

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: pnpm/action-setup@v4
        with:
          version: 9
          
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
          
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm test:unit
      - run: pnpm build
      
      - name: Notify Replit Deploy
        if: github.ref == 'refs/heads/main'
        run: |
          echo "Replit auto-pulls main; nothing to push here."
          echo "Production URL: https://Triumph-Synergy.replit.app"
```

### Required Secrets

Add to GitHub repo Settings > Secrets:

- `GITHUB_TOKEN`: provided automatically by Actions; used by SAIB external remediation
- `POSTGRES_PASSWORD`: production Postgres password set in Replit Secrets too

## Health Checks

### Endpoint

```bash
curl https://triumphsynergy.com/api/health
```

### Expected Response

```json
{
  "status": "healthy",
  "timestamp": "2026-01-13T12:00:00.000Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "stellar": "connected",
    "pi_network": "connected"
  }
}
```

## Monitoring

### Replit Built-in Logs

Replit captures stdout/stderr automatically; pair with `/api/health/check` polling for liveness alerting.

### Custom Monitoring

```typescript
// lib/monitoring.ts
export async function trackMetric(name: string, value: number) {
  // Send to your monitoring service
  await fetch('https://metrics.your-service.com/api/v1/write', {
    method: 'POST',
    body: JSON.stringify({ name, value, timestamp: Date.now() }),
  });
}
```

## Scaling

### Replit

- Manual scale via Replit plan tier
- Add a Cloudflare proxy in front for caching and DDoS protection

### Self-Hosted

```yaml
# kubernetes/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: triumph-synergy
spec:
  replicas: 3
  selector:
    matchLabels:
      app: triumph-synergy
  template:
    spec:
      containers:
        - name: app
          image: triumph-synergy:latest
          ports:
            - containerPort: 3000
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
```

## Rollback

### Replit

```bash
# Revert to a known-good commit and let Replit redeploy
git reset --hard <good-sha>
git push --force-with-lease origin main
```

### Docker

```bash
# Tag current as backup
docker tag triumph-synergy:latest triumph-synergy:backup

# Rollback
docker run -d triumph-synergy:previous
```

## Troubleshooting

### Build Failures

```bash
# Clear cache and rebuild
rm -rf .next node_modules
pnpm install
pnpm build
```

### Database Connection Issues

1. Check `POSTGRES_URL` is correct
2. Verify network connectivity
3. Check database server is running
4. Verify SSL settings

### Pi SDK Issues

1. Ensure running in Pi Browser
2. Check API key is valid
3. Verify sandbox mode matches environment

## Post-Deployment Checklist

- [ ] All environment variables configured
- [ ] Database migrations applied
- [ ] Health check returning healthy
- [ ] Pi payment test successful
- [ ] SSL certificate valid
- [ ] Domain DNS configured
- [ ] Monitoring alerts set up
- [ ] Backup strategy in place
