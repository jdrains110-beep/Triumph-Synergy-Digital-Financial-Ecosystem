#!/bin/sh
set -eu

METRICS_DIR="${METRICS_DIR:-/app/metrics}"
METRICS_PORT="${METRICS_PORT:-9911}"

mkdir -p "$METRICS_DIR"
: > "$METRICS_DIR/metrics"

if busybox --list | grep -qx "httpd"; then
  busybox httpd -f -p "$METRICS_PORT" -h "$METRICS_DIR" &
  HTTPD_PID=$!
else
  python3 /app/metrics-server.py &
  HTTPD_PID=$!
fi

cleanup() {
  kill "$HTTPD_PID" 2>/dev/null || true
}

trap cleanup EXIT INT TERM

exec /app/watchdog.sh