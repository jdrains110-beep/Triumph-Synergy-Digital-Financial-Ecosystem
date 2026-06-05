#!/bin/sh
set -eu

TARGET_CONTAINER="${TARGET_CONTAINER:-triumph-pi-mainnet-node}"
TARGET_PROCESS="${TARGET_PROCESS:-horizon}"
TARGET_URL="${TARGET_URL:-http://localhost:8000/}"
GUARD_INTERVAL_S="${GUARD_INTERVAL_S:-20}"
METRICS_DIR="${METRICS_DIR:-/app/metrics}"
METRICS_FILE="${METRICS_FILE:-$METRICS_DIR/metrics}"
PI_BRIDGE_NETWORK="${PI_BRIDGE_NETWORK:-pi-bridge}"

log() {
  printf '%s [horizon-guardian] %s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$*"
}

write_metrics() {
  running=0
  if echo "$1" | grep -q "RUNNING"; then
    running=1
  fi

  cat > "$METRICS_FILE" <<EOF
# HELP triumph_horizon_guardian_recoveries_total Total Horizon recovery attempts performed by the guardian.
# TYPE triumph_horizon_guardian_recoveries_total counter
triumph_horizon_guardian_recoveries_total ${recovery_count}
# HELP triumph_horizon_guardian_api_failures_total Total failed Horizon API probes observed by the guardian.
# TYPE triumph_horizon_guardian_api_failures_total counter
triumph_horizon_guardian_api_failures_total ${api_failure_total}
# HELP triumph_horizon_guardian_horizon_running Whether Horizon is currently reported as running by supervisorctl.
# TYPE triumph_horizon_guardian_horizon_running gauge
triumph_horizon_guardian_horizon_running ${running}
# HELP triumph_horizon_guardian_last_http_code Last HTTP status code observed from the Horizon API probe.
# TYPE triumph_horizon_guardian_last_http_code gauge
triumph_horizon_guardian_last_http_code ${2}
# HELP triumph_horizon_guardian_last_recovery_epoch_seconds Unix epoch timestamp of the last guardian recovery attempt.
# TYPE triumph_horizon_guardian_last_recovery_epoch_seconds gauge
triumph_horizon_guardian_last_recovery_epoch_seconds ${last_recovery_epoch}
# HELP triumph_horizon_guardian_network_reconnects_total Times Pi mainnet node was reconnected to pi-bridge network.
# TYPE triumph_horizon_guardian_network_reconnects_total counter
triump_horizon_guardian_network_reconnects_total ${network_reconnects}
# HELP triumph_horizon_guardian_container_starts_total Times Pi mainnet node was auto-started by guardian.
# TYPE triumph_horizon_guardian_container_starts_total counter
triumph_horizon_guardian_container_starts_total ${container_starts}
EOF
}

check_horizon() {
  # Silently suppress "executable not found" errors for optional external containers
  docker exec "$TARGET_CONTAINER" supervisorctl status "$TARGET_PROCESS" 2>&1 | grep -v "executable file not found" || true
}

probe_horizon_api() {
  docker exec "$TARGET_CONTAINER" sh -lc "curl -sS -m 5 -o /dev/null -w '%{http_code}' '$TARGET_URL'" 2>/dev/null || echo 000
}

start_horizon() {
  # Silently suppress "executable not found" errors for optional external containers
  docker exec "$TARGET_CONTAINER" supervisorctl start "$TARGET_PROCESS" 2>&1 | grep -v "executable file not found" || true
}

# ── Pi-bridge network connectivity check ──
# Ensures triumph-pi-mainnet-node is ALWAYS connected to the pi-bridge Docker network
# so Triumph Synergy services can reach it by hostname
ensure_pi_bridge_connected() {
  # Check if mainnet node is on pi-bridge by inspecting network members
  if docker network inspect "$PI_BRIDGE_NETWORK" --format '{{range .Containers}}{{.Name}} {{end}}' 2>/dev/null | grep -q "$TARGET_CONTAINER"; then
    return 0  # already connected
  fi
  # Not connected — try to connect it
  log "pi-bridge: $TARGET_CONTAINER not on $PI_BRIDGE_NETWORK — connecting..."
  if docker network connect "$PI_BRIDGE_NETWORK" "$TARGET_CONTAINER" 2>/dev/null; then
    log "pi-bridge: connected $TARGET_CONTAINER to $PI_BRIDGE_NETWORK"
    network_reconnects=$((network_reconnects + 1))
  else
    log "pi-bridge: FAILED to connect $TARGET_CONTAINER to $PI_BRIDGE_NETWORK"
  fi
}

# ── Ensure Pi mainnet node container is running ──
ensure_container_running() {
  local container_status
  container_status="$(docker inspect --format '{{.State.Status}}' "$TARGET_CONTAINER" 2>/dev/null || echo "missing")"
  if [ "$container_status" = "running" ]; then
    return 0
  fi
  log "container: $TARGET_CONTAINER status=$container_status — starting..."
  if docker start "$TARGET_CONTAINER" 2>/dev/null; then
    log "container: $TARGET_CONTAINER started successfully"
    container_starts=$((container_starts + 1))
    sleep 5  # Give stellar-core time to initialize
  else
    log "container: FAILED to start $TARGET_CONTAINER"
    return 1
  fi
}

log "starting; container=$TARGET_CONTAINER process=$TARGET_PROCESS interval=${GUARD_INTERVAL_S}s network=$PI_BRIDGE_NETWORK"

api_failure_count=0
api_failure_total=0
recovery_count=0
last_recovery_epoch=0
network_reconnects=0
container_starts=0
mkdir -p "$METRICS_DIR"
write_metrics "" 0

while true; do
  # Phase 0: Skip entirely if target container is not deployed (opt-in profile)
  if ! docker inspect "$TARGET_CONTAINER" >/dev/null 2>&1; then
    write_metrics "" 0
    sleep "$GUARD_INTERVAL_S"
    continue
  fi

  # Phase 1: Ensure Pi mainnet node container is running
  if ! ensure_container_running; then
    log "container not running — skipping Horizon checks this cycle"
    write_metrics "" 0
    sleep "$GUARD_INTERVAL_S"
    continue
  fi

  # Phase 2: Ensure Pi mainnet node is on pi-bridge network
  ensure_pi_bridge_connected

  # Phase 3: Check Horizon process and API
  status="$(check_horizon)"
  code="$(probe_horizon_api)"

  if echo "$status" | grep -q "RUNNING" && [ "$code" = "200" ]; then
    api_failure_count=0
    log "ok status=RUNNING api=200"
    write_metrics "$status" "$code"
  elif echo "$status" | grep -q "RUNNING"; then
    api_failure_count=$((api_failure_count + 1))
    api_failure_total=$((api_failure_total + 1))

    if [ "$api_failure_count" -lt 3 ]; then
      log "api degraded status=RUNNING api=$code failures=$api_failure_count"
      write_metrics "$status" "$code"
    else
      recovery_count=$((recovery_count + 1))
      last_recovery_epoch="$(date +%s)"
      log "recovering after repeated api failures status='${status:-unknown}' api=$code failures=$api_failure_count"
      start_horizon
      sleep 3
      status2="$(check_horizon)"
      code2="$(probe_horizon_api)"
      log "post-recovery status='${status2:-unknown}' api=$code2"
      write_metrics "$status2" "$code2"
      if echo "$status2" | grep -q "RUNNING" && [ "$code2" = "200" ]; then
        api_failure_count=0
      fi
    fi
  else
    api_failure_count=0
    api_failure_total=$((api_failure_total + 1))
    recovery_count=$((recovery_count + 1))
    last_recovery_epoch="$(date +%s)"
    log "recovering status='${status:-unknown}' api=$code"
    start_horizon
    sleep 3
    status2="$(check_horizon)"
    code2="$(probe_horizon_api)"
    log "post-recovery status='${status2:-unknown}' api=$code2"
    write_metrics "$status2" "$code2"
  fi

  sleep "$GUARD_INTERVAL_S"
done
