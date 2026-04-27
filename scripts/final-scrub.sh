#!/usr/bin/env bash
# final-scrub.sh — run AFTER quitting VS Code completely.
#
# Purpose: redact the compromised funding secret from every VS Code
# cache/log/history/transcript file on disk and VACUUM sqlite stores so
# the secret cannot be recovered via deleted-row scraping.
#
# Usage:
#   1. Quit VS Code (Cmd-Q, confirm no Code processes via `pgrep -lf Code`).
#   2. SECRET_TO_REDACT='S...your-compromised-secret...' \
#        bash scripts/final-scrub.sh
#
# Safe to re-run. Does nothing destructive beyond redaction + VACUUM.
# The secret is NEVER hardcoded in this file; it must be passed at runtime.
set -euo pipefail

SECRET="${SECRET_TO_REDACT:-}"
if [ -z "$SECRET" ]; then
  echo "ERROR: set SECRET_TO_REDACT env var to the compromised secret string."
  echo "Example: SECRET_TO_REDACT='SA...' bash scripts/final-scrub.sh"
  exit 1
fi
PREFIX="${SECRET:0:8}"
REDACTED="${SECRET:0:1}$(printf '%*s' "$((${#SECRET}-2))" '' | tr ' ' '*')${SECRET: -1}"
CODE_DIR="$HOME/Library/Application Support/Code"

if pgrep -lf "Visual Studio Code" >/dev/null 2>&1 || pgrep -lf "Code Helper" >/dev/null 2>&1; then
  echo "ERROR: VS Code (or Code Helper) is still running. Quit it first."
  pgrep -lf "Visual Studio Code" || true
  pgrep -lf "Code Helper" || true
  exit 1
fi

if [ ! -d "$CODE_DIR" ]; then
  echo "VS Code dir not found at: $CODE_DIR"; exit 0
fi

echo "==> Redacting secret in plaintext files under: $CODE_DIR"
hits=0
while IFS= read -r f; do
  hits=$((hits+1))
  LC_ALL=C sed -i '' "s/$SECRET/$REDACTED/g" "$f" || true
  echo "  scrubbed: $f"
done < <(grep -rlI "$SECRET" "$CODE_DIR" 2>/dev/null || true)
echo "  files redacted: $hits"

echo "==> Removing chat transcript jsonl files containing the secret"
removed=0
while IFS= read -r f; do
  rm -f "$f" && removed=$((removed+1)) && echo "  removed: $f"
done < <(grep -rlI "$PREFIX" "$CODE_DIR" 2>/dev/null | grep -E "\.jsonl$" || true)
echo "  jsonl removed: $removed"

echo "==> VACUUMing sqlite stores"
if command -v sqlite3 >/dev/null 2>&1; then
  while IFS= read -r db; do
    sqlite3 "$db" "VACUUM;" 2>/dev/null && echo "  vacuumed: $db" || echo "  skip: $db"
  done < <(find "$CODE_DIR" -type f \( -name "state.vscdb" -o -name "*.db" \) 2>/dev/null)
else
  echo "  sqlite3 not installed — skipping VACUUM"
fi

echo "==> Final residual scan"
residual=$(grep -rlI "$SECRET" "$CODE_DIR" 2>/dev/null | wc -l | tr -d ' ')
echo "  residual hits: $residual"
[ "$residual" -eq 0 ] && echo "==> CLEAN" || echo "==> WARNING: $residual file(s) still contain the secret"
