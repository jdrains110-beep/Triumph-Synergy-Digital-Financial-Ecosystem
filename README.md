# Triumph Synergy

Advanced payment routing with compliance automation powered by Pi Network.

## Overview

Triumph Synergy is a multi-cloud financial ecosystem that integrates Pi Network payments with compliance automation, AI-powered analytics, and zero-downtime deployment capabilities.

## Features

- **Pi Network Integration**: Primary payment method with 95% transaction volume target
- **Stellar Settlement**: Cross-chain settlement with Stellar Consensus
- **Compliance Automation**: PCI-DSS, SOC2, GDPR, CCPA compliance ready
- **Zero-Downtime Deployment**: Blue-green deployments with automatic failover
- **Multi-Cloud Architecture**: GCP primary, AWS secondary with automatic failover

## Quick Start

### Prerequisites

- Node.js 20+, pnpm 9.12.3+, PostgreSQL 15+, Redis 7+

### Setup

```bash
git clone https://github.com/jdrains110-beep/triumph-synergy.git
cd triumph-synergy
pnpm install
cp .env.example .env.local
pnpm db:start
pnpm db:migrate
pnpm dev
```

App runs on <http://localhost:3000>

## Deployment

### Vercel Secrets

NEXTAUTH_SECRET, AUTH_SECRET, PI_API_KEY, PI_INTERNAL_API_KEY, SUPABASE_ANON_KEY, POSTGRES_URL, REDIS_URL

### GitHub Secrets

VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID, SUPABASE_ANON_KEY

## Database

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:studio
```

## License

See LICENSE file.
