#!/bin/sh
set -eu

METRICS_DIR="${METRICS_DIR:-/app/metrics}"
METRICS_PORT="${METRICS_PORT:-9911}"

mkdir -p "$METRICS_DIR"
: > "$METRICS_DIR/metrics"

busybox httpd -f -p "$METRICS_PORT" -h "$METRICS_DIR" &
HTTPD_PID=$!

cleanup() {
  kill "$HTTPD_PID" 2>/dev/null || true
}

trap cleanup EXIT INT TERM

exec /app/watchdog.sh