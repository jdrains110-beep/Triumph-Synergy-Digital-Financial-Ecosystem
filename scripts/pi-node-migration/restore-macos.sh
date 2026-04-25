#!/usr/bin/env bash
set -euo pipefail

SNAPSHOT_DIR="${1:-}"
TARGET_CONTAINER="${2:-testnet2}"
RESTORE_PREFS="${3:-false}"

if [[ -z "$SNAPSHOT_DIR" ]]; then
  echo "Usage: bash ./scripts/pi-node-migration/restore-macos.sh /absolute/path/to/snapshot-folder [container] [restore-prefs:true|false]"
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

if [[ -f "$SNAPSHOT_DIR/SHA256SUMS.txt" ]]; then
  echo "Verifying archive checksums..."
  (
    cd "$SNAPSHOT_DIR"
    shasum -a 256 -c SHA256SUMS.txt
  )
fi

echo "Stopping target container $TARGET_CONTAINER..."
docker stop "$TARGET_CONTAINER" >/dev/null

TMP_MOUNTS="$(mktemp)"
docker inspect "$TARGET_CONTAINER" --format '{{range .Mounts}}{{println .Destination "|" .Source}}{{end}}' > "$TMP_MOUNTS"

parse_manifest_line() {
  local line="$1"
  local dst=""
  local archive=""
  IFS=',' read -r -a parts <<< "$line"

  if [[ "${#parts[@]}" -eq 4 ]]; then
    # old format: container,destination,source,archive
    dst="${parts[1]}"
    archive="${parts[3]}"
  elif [[ "${#parts[@]}" -ge 6 ]]; then
    # new format: container,type,name,destination,source,archive
    dst="${parts[3]}"
    archive="${parts[5]}"
  else
    echo "ERROR: manifest row has unsupported format: $line"
    exit 1
  fi

  echo "$dst|$archive"
}

# Validate all manifest destination paths exist in target mounts.
tail -n +2 "$MANIFEST" | while IFS= read -r line; do
  [[ -z "$line" ]] && continue
  parsed="$(parse_manifest_line "$line")"
  dst="${parsed%%|*}"
  archive="${parsed##*|}"

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
done

echo "Validation passed. Restoring data..."
tail -n +2 "$MANIFEST" | while IFS= read -r line; do
  [[ -z "$line" ]] && continue
  parsed="$(parse_manifest_line "$line")"
  dst="${parsed%%|*}"
  archive="${parsed##*|}"

  target_src="$(awk -F'|' -v d="$dst" '{gsub(/^ +| +$/, "", $1); gsub(/^ +| +$/, "", $2); if ($1 == d) print $2}' "$TMP_MOUNTS")"
  if [[ -z "$target_src" ]]; then
    echo "ERROR: could not resolve target mount source for destination $dst"
    rm -f "$TMP_MOUNTS"
    exit 1
  fi

  echo "Restoring $archive -> $target_src"
  sudo rm -rf "$target_src"/*
  sudo tar -xzf "$SNAPSHOT_DIR/$archive" -C "$target_src"

  if [[ -z "$(find "$target_src" -mindepth 1 -print -quit 2>/dev/null || true)" ]]; then
    echo "ERROR: restore appears empty for $dst ($target_src)"
    rm -f "$TMP_MOUNTS"
    exit 1
  fi
done

rm -f "$TMP_MOUNTS"

if [[ "$RESTORE_PREFS" == "true" && -f "$SNAPSHOT_DIR/user-preferences" ]]; then
  PREFS_DIR="$HOME/Library/Application Support/Pi Network"
  PREFS_PATH="$PREFS_DIR/user-preferences"
  mkdir -p "$PREFS_DIR"
  if [[ -f "$PREFS_PATH" ]]; then
    cp "$PREFS_PATH" "$PREFS_PATH.bak.$(date +%Y%m%d-%H%M%S)"
  fi
  cp "$SNAPSHOT_DIR/user-preferences" "$PREFS_PATH"
  echo "Restored Pi Desktop user-preferences to: $PREFS_PATH"
fi

echo "Starting target container $TARGET_CONTAINER..."
docker start "$TARGET_CONTAINER" >/dev/null

echo "Restore complete. Verify with: docker ps ; docker logs --tail 200 $TARGET_CONTAINER"
