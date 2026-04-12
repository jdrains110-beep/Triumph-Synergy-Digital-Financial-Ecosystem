#!/bin/sh
set -eu

TARGET_CONTAINER="${TARGET_CONTAINER:-testnet2}"
TARGET_PROCESS="${TARGET_PROCESS:-horizon}"
TARGET_URL="${TARGET_URL:-http://localhost:8000/}"
GUARD_INTERVAL_S="${GUARD_INTERVAL_S:-20}"
METRICS_DIR="${METRICS_DIR:-/app/metrics}"
METRICS_FILE="${METRICS_FILE:-$METRICS_DIR/metrics}"

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
EOF
}

check_horizon() {
  docker exec "$TARGET_CONTAINER" supervisorctl status "$TARGET_PROCESS" 2>/dev/null || true
}

probe_horizon_api() {
  docker exec "$TARGET_CONTAINER" sh -lc "curl -sS -m 5 -o /dev/null -w '%{http_code}' '$TARGET_URL'" 2>/dev/null || echo 000
}

start_horizon() {
  docker exec "$TARGET_CONTAINER" supervisorctl start "$TARGET_PROCESS" 2>/dev/null || true
}

log "starting; container=$TARGET_CONTAINER process=$TARGET_PROCESS interval=${GUARD_INTERVAL_S}s"

api_failure_count=0
api_failure_total=0
recovery_count=0
last_recovery_epoch=0
mkdir -p "$METRICS_DIR"
write_metrics "" 0

while true; do
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
