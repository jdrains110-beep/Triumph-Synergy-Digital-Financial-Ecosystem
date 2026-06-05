# Triumph Synergy — Replit Setup Guide

## What's in this archive

The full Triumph Synergy Digital Financial Ecosystem source tree:
- `app/`, `components/`, `lib/`, `hooks/` — Next.js 15 app (App Router)
- `docker/` — 30+ microservice Dockerfiles + 7 mega-pod consolidated images
- `docker-compose.yml` — 19-service orchestration with quantum-managed CPU/RAM tier scheme (T0-T6)
- `infrastructure/`, `services/`, `supabase/` — chain config + back-office
- `tests/`, `playwright.config.ts`, `vitest.config.ts` — test harness
- `scripts/` — operational + deploy scripts
- `package.json`, `yarn.lock`, `pnpm-lock.yaml` — Node deps

## Excluded from archive (regenerated on Replit)

- `node_modules/` — install with `yarn install --frozen-lockfile`
- `.next/` — built with `yarn build`
- `.venv/` — Python venv (Replit creates per-language)
- `.git/` — re-init or push to a fresh repo
- `*.log`, `coverage/`, `playwright-report/`, `test-results/`
- `docker/saib-secrets/` — sensitive; create your own
- `.env.local`, `.env.production.local`, `.env.testnet.local`

## On Replit

### Option 1 — Web app only (Next.js)
```bash
yarn install --frozen-lockfile
yarn build
yarn start
```
Visit the Replit-assigned URL.

### Option 2 — Full mesh via docker-compose
Replit Pro / Replit Deployments support Docker. From the shell:
```bash
docker compose --profile pi-node up -d
```
This brings up all 19 containers under the quantum-managed tier scheme.

### Required environment variables
Create `.env.local` from the keys in `.env.example` (if present) plus:
- `POSTGRES_PASSWORD` — required for compose
- `PI_API_KEY` — Pi Network app key
- `PI_WALLET_PRIVATE_SEED` — server wallet (KEEP SECRET)
- `GITHUB_TOKEN` — optional, for SAIB GitHub sync
- `GRAFANA_ADMIN_PASSWORD` — observability stack
- `CLOUDFLARE_*` — optional cloud-memory backups

## Quantum-managed CPU/RAM tier scheme

| Tier | RAM cap | CPU share | Pods |
|---|---|---|---|
| T0 stellar core | 4500m | 1.5 | pi-mainnet-node |
| T1 datastore | 256m | 0.5 | postgres, redis |
| T2 mega-pod | 1536m | 1.0 | apex-services (18 svc) |
| T3 sentinel | 768m | 0.6 | apex-sovereign-nexus, observability-stack |
| T4 quorum/settle | 384m | 0.4 | governance-shield, settlement-core, supernode-peer-2, quantum-intel-fortress |
| T5 mesh peer | 256m | 0.3 | sovereign-life, horizon-stream, app, sovereign-military-bridge, pi-bridge-connector |
| T6 sidekick | 128m | 0.2 | vault, nginx, guardian-watchdog-nexus, sovereign-mesh-hub |

Total ceiling ~11 GB oversubscribed; typical idle ~4–5 GB. Pods are time-sliced fairly under contention.

## Mesh services (19 total, 0 duplicates)

Standalone (11): `postgres`, `redis`, `pi-bridge-connector`, `app`, `vault`, `nginx`, `governance-shield`, `supernode-peer-2`, `pi-mainnet-node`, `sovereign-military-bridge`, `sovereign-mesh-hub`

Mega-pods (8): `apex-services` (5 svc consolidated), `apex-sovereign-nexus` (4 svc), `sovereign-life` (3 svc), `quantum-intel-fortress` (7 svc), `horizon-stream` (2 svc), `observability-stack` (4 svc), `guardian-watchdog-nexus` (5 svc), `settlement-core` (embeds payment-processor)

Legacy hostnames (e.g. `triumph-sovereign-fortress`, `triumph-financial-intel`) are Docker network aliases pointing at the consolidated mega-pods — not separate containers.

## Pi Network integration

- Mainnet node image: `pinetwork/pi-node-docker:organization-mainnet-v1.0-p24.1.0`
- Live mainnet protocol: P22 (image is P23-ready and votes for upgrade)
- Bridge probes both pi-node `/info` and central-node `/health`
- See `lib/pi-network/` for SDK usage and `app/api/pi-*/` for routes

## Verifying the mesh after `up -d`

```bash
docker exec triumph-pi-bridge-connector curl -sS http://localhost:8092/health | jq
```
Expect: `pi_node_reachable:true`, `central_node_reachable:true`, `latest_ledger_seq` advancing.

## Repo

GitHub: https://github.com/jdrains110-beep/Triumph-Synergy-Digital-Financial-Ecosystem
Branch: `main`
