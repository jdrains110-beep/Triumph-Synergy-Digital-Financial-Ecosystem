# Triumph Synergy M1 MacBook Setup (Docker Desktop + Pi Node + GitHub)

This runbook brings the stack online in controlled phases on Apple Silicon with resource gates, health gates, and optional strict log gating.

## 1) M1 Host Baseline

Set Docker Desktop resources first:

- CPUs: 8 minimum (10 to 12 preferred)
- Memory: 20 GiB minimum (24 GiB preferred)
- Disk image: 200 GiB minimum

Enable:

- Use Virtualization Framework
- VirtioFS file sharing

Use the repo root as your working directory.

## 2) Clone and Sync from GitHub

```bash
git clone https://github.com/jdrains110-beep/Triumph-Synergy-Digital-Financial-Ecosystem.git
cd Triumph-Synergy-Digital-Financial-Ecosystem
git checkout main
git pull --ff-only
```

## 3) Environment Setup

```bash
cp .env.example .env
```

Set these required values in .env before startup:

- POSTGRES_PASSWORD
- PI_API_KEY
- PI_INTERNAL_API_KEY
- PI_MAINNET_API_KEY
- PI_API_SECRET
- AUTH_SECRET
- NEXTAUTH_SECRET

## 4) Open Pi Ports on macOS

```bash
bash scripts/open_pi_ports_macos.sh
```

For a dry run first:

```bash
bash scripts/open_pi_ports_macos.sh --dry-run
```

## 5) Controlled One-by-One Startup

Use the phased M1 script:

```bash
bash scripts/m1-quantum-bringup.sh --strict-logs
```

Include Pi mainnet node (heavier):

```bash
bash scripts/m1-quantum-bringup.sh --with-pi-node --strict-logs
```

Attach an existing `testnet2` Pi container to the ecosystem networks (for dual-node operations):

```bash
bash scripts/m1-quantum-bringup.sh --with-testnet2-bridge --strict-logs
```

Run both mainnet node profile and testnet2 bridge in one pass:

```bash
bash scripts/m1-quantum-bringup.sh --with-pi-node --with-testnet2-bridge --strict-logs
```

If you want a fresh image update/build pass:

```bash
bash scripts/m1-quantum-bringup.sh --pull --build --with-pi-node --strict-logs
```

What this script enforces:

- Uses all three compose layers:
  - docker-compose.yml
  - docker-compose.override.yml
  - docker-compose.quantum-cpu.yml
- Starts services in phases, not all-at-once
- Waits each service for running plus health (or running when no healthcheck exists)
- Optionally fails on startup warnings/errors in logs
- Validates Docker Desktop CPU and memory floor before startup
- Optionally connects an existing `testnet2` container to `pi-bridge` and `triumph-net`
- Verifies `pi-bridge-connector` can reach `http://testnet2:8000`

## 6) Post-Startup Validation

```bash
docker compose -f docker-compose.yml -f docker-compose.override.yml -f docker-compose.quantum-cpu.yml ps
docker stats --no-stream
curl -fsS http://localhost:3000/api/health
```

When Pi node is enabled:

```bash
curl -fsS http://localhost:31501/
curl -fsS http://localhost:31500/info
```

## 7) Recovery if Docker Desktop Crashes

```bash
bash scripts/docker-recover.sh
```

## 8) Operational Notes

- This repo already pins amd64 for key services through docker-compose.override.yml, which is important on Apple Silicon.
- The quantum CPU tuning file applies cpuset and cpu_shares strategies for predictable contention behavior.
- Strict zero-warning operation depends on the runtime behavior of all dependent services and external APIs. Use strict mode and fail fast on first startup anomaly.
