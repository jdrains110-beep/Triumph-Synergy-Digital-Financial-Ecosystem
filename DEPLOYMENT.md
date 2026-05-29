# Triumph Synergy — Quick Start & Deployment Guide

## Prerequisites

- **Docker Desktop**: 16GB RAM, 6+ CPU cores (minimum; 20GB + 8 cores recommended)
- **Docker Compose**: v2.0+
- **Git**: For cloning the repository
- **Disk Space**: 100GB+ (Pi node blockchain data grows ~500MB/day)

## Quick Start (Development)

### 1. Clone & Setup

```bash
cd /Users/jeremiahdrains/Downloads/Triumph-Synergy-Digital-Financial-Ecosystem-main

# Copy environment template
cp .env.example .env

# Edit with your secrets
vim .env
# Required fields:
#   POSTGRES_PASSWORD=<strong-password>
#   PI_API_KEY=<your-pi-network-key>
#   AUTH_SECRET=<nextauth-secret>
#   NEXTAUTH_SECRET=<nextauth-secret>
```

### 2. Build & Start (9 Core Services)

```bash
# Clean previous images/containers
docker compose down --remove-orphans
docker system prune -a

# Build 9 core services (no Pi node, no app/apex)
docker compose build --no-cache \
  postgres redis pi-bridge-connector governance-shield \
  quantum-intel-fortress settlement-core vault nginx \
  observability-stack sovereign-mesh-hub

# Start all services
docker compose up -d

# Watch logs
docker compose logs -f
```

### 3. Verify Health

```bash
# Check all services running
docker ps -a

# Specific healthcheck status
docker ps --format "table {{.Names}}\t{{.Status}}"

# View metrics dashboard
open http://localhost:3001/d/triumph-overview  # Grafana

# View Prometheus targets
open http://localhost:9090/targets
```

---

## Production Deployment (Docker Compose)

### 1. Increase Docker Desktop Resources

```bash
# macOS: Docker Desktop → Settings → Resources
# Set:
#   CPUs: 8-12
#   Memory: 20-24 GB
#   Disk: 200 GB

# Linux/WSL2: Edit ~/.docker/daemon.json
{
  "memory": 20971520000,
  "cpus": 8,
  "storage-driver": "overlay2"
}
```

### 2. Deploy with CPU Tuning

```bash
# Use docker-compose.cpu-tuning.yml override
cd /Users/jeremiahdrains/Downloads/Triumph-Synergy-Digital-Financial-Ecosystem-main

docker compose \
  -f docker-compose.yml \
  -f docker-compose.cpu-tuning.yml \
  up -d --remove-orphans
```

### 3. Enable Pi Node (Mainnet Sync)

```bash
# Start pi-mainnet-node (adds 3-5 GB RAM overhead)
docker compose --profile pi-node up -d pi-mainnet-node testnet2

# Wait for sync (can take 1-4 hours on first run)
docker logs triumph-pi-mainnet-node -f | grep -i "ledger\|synced\|error"

# Check sync status
docker exec triumph-pi-mainnet-node curl -s http://localhost:11626/info | jq .
```

### 4. Build Optional Services (After Disk/Memory Cleanup)

```bash
# Build one at a time, with 300s waits between
docker compose build app
sleep 300

docker compose build apex-services
sleep 300

docker compose build apex-sovereign-nexus guardian-watchdog-nexus sovereign-life
sleep 300

# Start all (including app, apex-services, etc.)
docker compose up -d

# Verify 19/19 services running
docker compose ps | grep "Up"
```

### 5. Configure for Public Access

```bash
# nginx TLS certificates (example: self-signed)
mkdir -p certs/nginx
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout certs/nginx/private.key \
  -out certs/nginx/cert.crt \
  -subj "/C=US/ST=State/L=City/O=Org/CN=triumph-synergy.example.com"

# Update nginx.conf with your domain
sed -i 's/localhost/triumph-synergy.example.com/g' nginx.conf

# Restart nginx
docker compose restart nginx
```

---

## Monitoring & Operations

### Real-Time Metrics

```bash
# CPU/Memory dashboard
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# Watch Pi node sync progress
docker exec triumph-pi-mainnet-node \
  curl -s http://localhost:11626/info | jq '.info.state'

# Redis memory usage
docker exec triumph-redis redis-cli info memory | grep used_memory_human

# PostgreSQL connections
docker exec triumph-postgres \
  psql -U postgres -c "SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;"
```

### Health Probes

```bash
# API health endpoints
curl http://localhost:8083/health      # governance-shield
curl http://localhost:8092/health      # pi-bridge-connector
curl http://localhost:8094/health      # quantum-intel-fortress
curl http://localhost:8080/health      # settlement-core
curl http://localhost:8081/health      # vault

# Grafana dashboards
open http://localhost:3001             # Grafana (admin/triumph_admin)
open http://localhost:9090/graph       # Prometheus queries
```

### Auto-Restart & Recovery

```bash
# View restart count
docker inspect triumph-postgres --format='{{.RestartCount}}'

# Check OOM killer events
docker inspect triumph-quantum-intel-fortress --format='{{.State.OOMKilled}}'

# Manual restart with new limits
docker update --memory 1.5G triumph-quantum-intel-fortress
docker restart triumph-quantum-intel-fortress
```

---

## Troubleshooting

### Service Won't Start

```bash
# Check logs for errors
docker compose logs <service>

# Common issues:
# - Missing environment variable: Check .env
# - Port conflict: lsof -i :8080 (macOS) or netstat -tulpn (Linux)
# - Image build failed: docker compose build --no-cache <service>
```

### High CPU Usage

```bash
# Identify culprit
docker stats --format "table {{.Container}}\t{{.CPUPerc}}" --no-stream | sort -k3 -rn

# Reduce polling intervals (governance-shield):
docker exec triumph-governance-shield \
  sed -i 's/VERSION_CHECK_INTERVAL_MS=300000/VERSION_CHECK_INTERVAL_MS=600000/' \
  /etc/environment

# Or scale down via docker-compose.yml
```

### Out-of-Memory (OOM) Killer

```bash
# Check which container was killed
docker ps -a | grep "Exited"

# View OOM events
docker inspect <container> --format='{{.State.OOMKilled}}'

# Increase memory limit
docker update --memory 2G <container>
docker restart <container>

# Or edit docker-compose.yml and redeploy
docker compose up -d --force-recreate
```

### Redis AOF Corruption

```bash
# Symptom: Redis restarts repeatedly
docker logs triumph-redis | grep "Bad file format"

# Fix: Clear corrupted AOF
docker stop triumph-redis
docker run --rm -v triumph_redis_data:/data alpine \
  rm -rf /data/appendonlydir /data/temp*.rdb
docker start triumph-redis

# Verify
docker exec triumph-redis redis-cli PING
```

### Pi Node Sync Stuck

```bash
# Check ledger lag
docker exec triumph-pi-mainnet-node \
  curl -s http://localhost:11626/info | jq '.info.ledger'

# Restart if >1000 ledgers behind
docker restart triumph-pi-mainnet-node

# Monitor catchup
docker logs triumph-pi-mainnet-node -f | grep -i "applying\|checking"
```

---

## Scaling to Kubernetes

### Generate Manifests

```bash
# Convert docker-compose to k8s YAML
docker compose convert > k8s-manifest.yaml

# Review and edit:
vim k8s-manifest.yaml
# Key changes:
#   - Use Deployment (replicas: 2-3 for services, 1 for stateful)
#   - Add PersistentVolumeClaim for postgres/redis
#   - Use Ingress instead of LoadBalancer
#   - Add NetworkPolicy for pod-to-pod traffic
```

### Deploy to Kubernetes

```bash
# Create namespace
kubectl create namespace triumph-synergy

# Apply manifests
kubectl apply -f k8s-manifest.yaml -n triumph-synergy

# Verify rollout
kubectl rollout status deployment/app -n triumph-synergy
kubectl get pods -n triumph-synergy

# Access services
kubectl port-forward svc/nginx 80:80 -n triumph-synergy
open http://localhost
```

### Helm Chart (Recommended for Multi-Env)

```bash
# Create Helm values for prod/staging/dev
helm create triumph-synergy-chart

# Deploy with environment-specific values
helm install triumph-synergy ./triumph-synergy-chart \
  -f values-prod.yaml \
  -n triumph-synergy \
  --create-namespace

# Upgrade with new image
helm upgrade triumph-synergy ./triumph-synergy-chart \
  -f values-prod.yaml \
  --set app.image.tag=v2.0.0
```

---

## CI/CD Integration (GitHub Actions)

### Build & Publish Images

```yaml
# .github/workflows/docker-build.yml
name: Build & Push Docker Images

on:
  push:
    branches: [main]
    paths:
      - 'docker/**'
      - 'Dockerfile'
      - '.github/workflows/docker-build.yml'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Build app
        uses: docker/build-push-action@v4
        with:
          context: .
          dockerfile: Dockerfile
          push: true
          tags: ghcr.io/triumph-synergy/app:${{ github.sha }}
      
      - name: Scan with Docker Scout
        run: |
          docker scout cves ghcr.io/triumph-synergy/app:${{ github.sha }} \
            --format json > cves.json
          # Fail on HIGH/CRITICAL
          if grep -q '"severity": "HIGH"' cves.json; then
            exit 1
          fi
      
      - name: Deploy to staging
        run: |
          docker compose -f docker-compose.yml \
            pull ghcr.io/triumph-synergy/app:${{ github.sha }}
          docker compose up -d app
```

---

## Backup & Disaster Recovery

### Backup State

```bash
# PostgreSQL dump
docker exec triumph-postgres \
  pg_dump -U postgres triumph_synergy > backup_$(date +%Y%m%d).sql

# Redis RDB snapshot
docker exec triumph-redis \
  redis-cli BGSAVE
docker cp triumph-redis:/data/dump.rdb ./backup_redis_$(date +%Y%m%d).rdb

# Archive to S3/GCS
aws s3 cp backup_*.sql backup_*.rdb s3://triumph-backups/
```

### Restore State

```bash
# Stop services
docker compose stop postgres redis

# Restore PostgreSQL
docker exec triumph-postgres \
  psql -U postgres -f /dev/stdin < backup_latest.sql

# Restore Redis (copy RDB, restart)
docker cp backup_redis_latest.rdb triumph-redis:/data/dump.rdb
docker restart triumph-redis
```

---

## Support & Community

- **GitHub Issues**: https://github.com/jdrains110-beep/Triumph-Synergy-Digital-Financial-Ecosystem/issues
- **Documentation**: See ARCHITECTURE.md, CPU_TUNING.md, SECURITY_AUDIT.md
- **Discord/Slack**: (add community channel link)
- **Enterprise Support**: contact@triumph-synergy.example.com

---

## Deployment Checklist

- [ ] Docker Desktop configured (16GB RAM, 6+ cores, 100GB disk)
- [ ] .env file created with secrets (PI_API_KEY, POSTGRES_PASSWORD, etc.)
- [ ] docker-compose.yml verified (all services, healthchecks, limits)
- [ ] docker-compose.cpu-tuning.yml applied (CPU tuning)
- [ ] 9 core services building & starting
- [ ] Pi node optional (add --profile pi-node)
- [ ] Grafana dashboards accessible (http://localhost:3001)
- [ ] Prometheus targets healthy (http://localhost:9090/targets)
- [ ] healthchecks passing (docker ps shows healthy services)
- [ ] Logs reviewed for errors (docker compose logs)
- [ ] Manual health probes passing (curl http://localhost:8083/health)
- [ ] HTTPS/TLS configured (nginx with cert)
- [ ] Backups scheduled (S3, GCS, or local archive)
- [ ] CI/CD pipeline active (GitHub Actions for image builds)
- [ ] Monitoring alerts configured (PagerDuty, Slack)
- [ ] Team trained on operations (runbook, incident response)

---

Deployment complete. Triumph Synergy is live and ready for investors/partners.
