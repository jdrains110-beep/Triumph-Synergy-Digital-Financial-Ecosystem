#!/usr/bin/env bash
set -euo pipefail

SNAPSHOT_DIR="${1:-}"
TARGET_CONTAINER="${2:-testnet2}"

if [[ -z "$SNAPSHOT_DIR" ]]; then
  echo "Usage: bash ./scripts/pi-node-migration/restore-macos.sh /absolute/path/to/snapshot-folder [container]"
  exit 1
fi

if [[ ! -d "$SNAPSHOT_DIR" ]]; then
  echo "Snapshot directory not found: $SNAPSHOT_DIR"
  exit 1
fi

MANIFEST="$SNAPSHOT_DIR/manifest.csv"
if [[ ! -f "$MANIFEST" ]]; then
  echo "manifest.csv not found in snapshot directory"
  exit 1
fi

echo "Stopping target container $TARGET_CONTAINER..."
docker stop "$TARGET_CONTAINER" >/dev/null

TMP_MOUNTS="$(mktemp)"
docker inspect "$TARGET_CONTAINER" --format '{{range .Mounts}}{{println .Destination "|" .Source}}{{end}}' > "$TMP_MOUNTS"

# Validate all manifest destination paths exist in target mounts.
while IFS=',' read -r container dst src archive; do
  [[ "$container" == "container" ]] && continue

  if ! awk -F'|' -v d="$dst" '{gsub(/^ +| +$/, "", $1); if ($1 == d) found=1} END {exit(found?0:1)}' "$TMP_MOUNTS"; then
    echo "ERROR: destination path from manifest not found in target container mounts: $dst"
    rm -f "$TMP_MOUNTS"
    exit 1
  fi

  if [[ ! -f "$SNAPSHOT_DIR/$archive" ]]; then
    echo "ERROR: archive missing: $archive"
    rm -f "$TMP_MOUNTS"
    exit 1
  fi
done < "$MANIFEST"

echo "Validation passed. Restoring data..."
while IFS=',' read -r container dst src archive; do
  [[ "$container" == "container" ]] && continue

  target_src="$(awk -F'|' -v d="$dst" '{gsub(/^ +| +$/, "", $1); gsub(/^ +| +$/, "", $2); if ($1 == d) print $2}' "$TMP_MOUNTS")"
  if [[ -z "$target_src" ]]; then
    echo "ERROR: could not resolve target mount source for destination $dst"
    rm -f "$TMP_MOUNTS"
    exit 1
  fi

  echo "Restoring $archive -> $target_src"
  sudo rm -rf "$target_src"/*
  sudo tar -xzf "$SNAPSHOT_DIR/$archive" -C "$target_src"
done < "$MANIFEST"

rm -f "$TMP_MOUNTS"

echo "Starting target container $TARGET_CONTAINER..."
docker start "$TARGET_CONTAINER" >/dev/null

echo "Restore complete. Verify with: docker ps ; docker logs --tail 200 $TARGET_CONTAINER"
