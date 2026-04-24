#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="${1:-testnet2}"
STAMP="$(date +%Y%m%d-%H%M%S)"
PLATFORM="$(uname -s | tr '[:upper:]' '[:lower:]')"
OUT_BASE="$HOME/PI-MIGRATION/${PLATFORM}-$(hostname)-${STAMP}"

mkdir -p "$OUT_BASE"

docker inspect "$CONTAINER_NAME" > "$OUT_BASE/inspect.json"
WAS_RUNNING="$(docker inspect "$CONTAINER_NAME" --format '{{.State.Running}}')"

if [[ "$WAS_RUNNING" == "true" ]]; then
  echo "Stopping container $CONTAINER_NAME..."
  docker stop "$CONTAINER_NAME" >/dev/null
fi

echo "container,type,name,destination,source,archive" > "$OUT_BASE/manifest.csv"

docker inspect "$CONTAINER_NAME" --format '{{range .Mounts}}{{println .Type "|" .Name "|" .Destination "|" .Source}}{{end}}' \
| while IFS='|' read -r mtype mname dst src; do
  mtype="$(echo "$mtype" | xargs)"
  mname="$(echo "$mname" | xargs)"
  dst="$(echo "$dst" | xargs)"
  src="$(echo "$src" | xargs)"
  safe="$(echo "$dst" | sed 's#[/\\:]#_#g; s/^_//')"
  archive="${safe}.tgz"

  echo "Archiving $dst [$mtype] from $src..."
  sudo tar -czf "$OUT_BASE/$archive" -C "$src" .
  echo "$CONTAINER_NAME,$mtype,$mname,$dst,$src,$archive" >> "$OUT_BASE/manifest.csv"
done

# If exporting from macOS source, include Pi Desktop user-preferences if present.
MAC_PREFS="$HOME/Library/Application Support/Pi Network/user-preferences"
if [[ -f "$MAC_PREFS" ]]; then
  cp "$MAC_PREFS" "$OUT_BASE/user-preferences"
fi

if [[ "$WAS_RUNNING" == "true" ]]; then
  echo "Starting container $CONTAINER_NAME..."
  docker start "$CONTAINER_NAME" >/dev/null
fi

(
  cd "$OUT_BASE"
  ls *.tgz >/dev/null 2>&1 && shasum -a 256 *.tgz > SHA256SUMS.txt
  if [[ -f "inspect.json" ]]; then
    shasum -a 256 inspect.json >> SHA256SUMS.txt
  fi
  if [[ -f "user-preferences" ]]; then
    shasum -a 256 user-preferences >> SHA256SUMS.txt
  fi
)

echo "Snapshot created: $OUT_BASE"
echo "Includes: all Docker mounts from inspect + inspect.json + SHA256SUMS.txt + user-preferences (if present)."
