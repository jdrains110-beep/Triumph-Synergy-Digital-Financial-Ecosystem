#!/usr/bin/env bash
# =============================================================================
# docker-recover.sh — Safe recovery from Docker Desktop crash / stale state
#
# Fixes:
#   - Zombie hash-prefixed containers (bdfe50ad1124_triumph-*)
#   - Created-state containers blocking new starts
#   - Stale name conflicts from crashed daemon sessions
#   - Batched startup to avoid overloading Docker Desktop VM
#
# Usage:
#   ./scripts/docker-recover.sh            # normal recovery
#   ./scripts/docker-recover.sh --restart  # restart Docker Desktop first
# =============================================================================
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$REPO_DIR/docker/saib-secrets/.env.saib.central.local"
COMPOSE="docker compose --env-file $ENV_FILE"

log()  { echo "[$(date +%H:%M:%S)] $*"; }
warn() { echo "[$(date +%H:%M:%S)] WARN: $*" >&2; }

# ── 1. Optionally restart Docker Desktop ────────────────────────────────────
if [[ "${1:-}" == "--restart" ]]; then
  log "Restarting Docker Desktop..."
  pkill -x "Docker Desktop" 2>/dev/null || true
  sleep 3
  open -a Docker
fi

# ── 2. Wait for daemon ───────────────────────────────────────────────────────
log "Waiting for Docker daemon..."
TRIES=0
until docker info >/dev/null 2>&1; do
  printf "."
  sleep 5
  TRIES=$((TRIES + 1))
  if [[ $TRIES -gt 48 ]]; then   # 4 min max
    echo ""
    warn "Docker daemon did not respond in 4 minutes. Trying relaunch..."
    pkill -x "Docker Desktop" 2>/dev/null || true
    sleep 3
    open -a Docker
    TRIES=0
  fi
done
echo ""
log "Daemon ready."

# ── 3. Remove zombie hash-prefixed containers ────────────────────────────────
ZOMBIES=$(docker ps -a --format "{{.Names}}" 2>/dev/null | grep -E '^[a-f0-9]{12}_' || true)
if [[ -n "$ZOMBIES" ]]; then
  log "Removing zombie containers: $(echo "$ZOMBIES" | tr '\n' ' ')"
  echo "$ZOMBIES" | xargs docker rm -f 2>/dev/null || true
else
  log "No zombie containers found."
fi

# ── 4. Remove Created-state containers (stale from crashed sessions) ─────────
CREATED=$(docker ps -a --filter status=created -q 2>/dev/null || true)
if [[ -n "$CREATED" ]]; then
  COUNT=$(echo "$CREATED" | wc -l | tr -d ' ')
  log "Removing $COUNT Created-state containers..."
  echo "$CREATED" | xargs docker rm -f 2>/dev/null || true
else
  log "No Created-state containers found."
fi

# ── 5. Ensure required external networks exist ───────────────────────────────
cd "$REPO_DIR"

log "Ensuring triumph-redis-cluster-net exists..."
docker network inspect triumph-redis-cluster-net >/dev/null 2>&1 || \
  docker network create --driver bridge triumph-redis-cluster-net

# ── 6. Start infrastructure first (max-parallel=4 to avoid overloading VM) ──
log "Starting infrastructure services..."
COMPOSE_PARALLEL_LIMIT=4 $COMPOSE up -d \
  postgres redis vault pi-bridge-connector 2>&1 | tail -8

log "Waiting 15s for infrastructure to become healthy..."
sleep 15

# ── 7. Start remaining services ───────────────────────────────────────────────
log "Starting remaining services (max-parallel=6)..."
COMPOSE_PARALLEL_LIMIT=6 $COMPOSE up -d 2>&1 | tail -10

# ── 8. Show final status ─────────────────────────────────────────────────────
log "Waiting 10s for healthchecks to settle..."
sleep 10

log "Container status:"
docker ps --format "{{printf \"  %-45s %s\" .Names .Status}}" | sort

UNHEALTHY=$(docker ps --format "{{.Names}}\t{{.Status}}" | grep "unhealthy" || true)
if [[ -n "$UNHEALTHY" ]]; then
  warn "Unhealthy containers:"
  echo "$UNHEALTHY" | while read -r name status; do
    echo "  $name — $status"
    docker inspect "$name" --format "{{json .State.Health.Log}}" 2>/dev/null | \
      python3 -c "import sys,json; logs=json.load(sys.stdin); [print('    ', l['Output'][:200]) for l in logs[-2:]]" 2>/dev/null || true
  done
else
  log "All containers healthy (or still in start_period)."
fi
