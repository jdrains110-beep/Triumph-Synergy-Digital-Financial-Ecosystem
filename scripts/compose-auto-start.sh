#!/bin/zsh
# =============================================================================
# Triumph Synergy — Docker Compose Auto-Start Script
# Called by com.triumph-synergy.compose-startup LaunchAgent on every login.
# Waits for Docker daemon to be ready, then starts all triumph services.
# =============================================================================

set -euo pipefail

COMPOSE_DIR="/Users/jeremiahdrains/Downloads/Triumph-Synergy-Digital-Financial-Ecosystem-main"
LOG="/tmp/triumph-compose-startup.log"
DOCKER="/usr/local/bin/docker"
MAX_WAIT=120   # seconds to wait for Docker daemon
SLEEP_INTERVAL=3

log() { echo "$(date '+%Y-%m-%d %T') [triumph-startup] $*" | tee -a "$LOG"; }

log "=== Triumph Synergy compose auto-start ==="

# Wait for Docker daemon to be responsive
elapsed=0
until "$DOCKER" info &>/dev/null; do
  if (( elapsed >= MAX_WAIT )); then
    log "ERROR: Docker daemon not ready after ${MAX_WAIT}s — aborting"
    exit 1
  fi
  log "Waiting for Docker daemon... (${elapsed}s)"
  sleep "$SLEEP_INTERVAL"
  (( elapsed += SLEEP_INTERVAL ))
done

log "Docker daemon is ready"

cd "$COMPOSE_DIR"

# Start all services except the pi-node profile (heavy — started manually)
log "Starting Triumph Synergy ecosystem (all services except pi-node profile)..."
"$DOCKER" compose up -d --remove-orphans 2>&1 | tee -a "$LOG"

log "Triumph Synergy ecosystem started"
exit 0
