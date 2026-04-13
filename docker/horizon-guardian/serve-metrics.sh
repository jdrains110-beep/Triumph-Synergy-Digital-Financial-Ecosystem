#!/bin/sh
set -eu

METRICS_DIR="${METRICS_DIR:-/app/metrics}"
METRICS_FILE="${METRICS_FILE:-$METRICS_DIR/metrics}"

printf 'HTTP/1.1 200 OK\r\n'
printf 'Content-Type: text/plain; version=0.0.4; charset=utf-8\r\n'
printf 'Connection: close\r\n\r\n'
cat "$METRICS_FILE"
