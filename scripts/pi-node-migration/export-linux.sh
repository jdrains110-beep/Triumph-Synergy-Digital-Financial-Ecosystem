#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="${1:-testnet2}"
STAMP="$(date +%Y%m%d-%H%M%S)"
PLATFORM="$(uname -s | tr '[:upper:]' '[:lower:]')"
OUT_BASE="$HOME/PI-MIGRATION/${PLATFORM}-$(hostname)-${STAMP}"

mkdir -p "$OUT_BASE"

echo "Stopping container $CONTAINER_NAME..."
docker stop "$CONTAINER_NAME" >/dev/null

echo "container,destination,source,archive" > "$OUT_BASE/manifest.csv"

docker inspect "$CONTAINER_NAME" --format '{{range .Mounts}}{{println .Destination "|" .Source}}{{end}}' \
| while IFS='|' read -r dst src; do
  dst="$(echo "$dst" | xargs)"
  src="$(echo "$src" | xargs)"
  safe="$(echo "$dst" | sed 's#[/\\:]#_#g; s/^_//')"
  archive="${safe}.tgz"

  echo "Archiving $dst from $src..."
  sudo tar -czf "$OUT_BASE/$archive" -C "$src" .
  echo "$CONTAINER_NAME,$dst,$src,$archive" >> "$OUT_BASE/manifest.csv"
done

echo "Starting container $CONTAINER_NAME..."
docker start "$CONTAINER_NAME" >/dev/null

echo "Snapshot created: $OUT_BASE"
