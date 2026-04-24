# Deployment Guide

## Overview

This guide covers deploying Triumph-Synergy to various environments.

## Quick Deploy

### Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/jdrains110-beep/triumph-synergy)

1. Click the deploy button
2. Connect your GitHub account
3. Configure environment variables
4. Deploy!

### Manual Vercel Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
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
NEXTAUTH_URL=https://your-domain.com

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
VERCEL_ANALYTICS_ID=...

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
      
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### Required Secrets

Add to GitHub repo Settings > Secrets:

- `VERCEL_TOKEN`: Your Vercel API token
- `VERCEL_ORG_ID`: Your Vercel organization ID
- `VERCEL_PROJECT_ID`: Your Vercel project ID

## Health Checks

### Endpoint

```bash
curl https://your-domain.com/api/health
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

### Vercel Analytics

Automatically enabled for Vercel deployments.

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

### Vercel

- Automatic scaling built-in
- Edge functions for low-latency
- Serverless functions auto-scale

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

### Vercel

```bash
# List deployments
vercel list

# Rollback to previous
vercel rollback
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
