#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────
# TRIUMPH SYNERGY — APEX SECURITY: secret rotation
# Rotates: PI_API_KEY, SUPABASE_SERVICE_ROLE_KEY (manual fetch),
#          PQ_RECEIPT_SEED, STELLAR_SIGNING_SEED, NEXTAUTH_SECRET
#
# Generates fresh entropy locally, prints to stdout AND writes to
# .env.rotation.<timestamp> for atomic Replit Secrets sync.
#
# Usage:
#   ./scripts/rotate-secrets.sh                # generate
#   ./scripts/rotate-secrets.sh --push replit  # generate + push to Replit Secrets
# ─────────────────────────────────────────────────────────────────────────
set -euo pipefail

TS=$(date -u +"%Y%m%dT%H%M%SZ")
OUT=".env.rotation.${TS}"

hex() { openssl rand -hex "$1"; }
b64() { openssl rand -base64 "$1" | tr -d '\n=' | tr '/+' '_-'; }

PQ_RECEIPT_SEED=$(hex 32)              # 32 bytes / 64 hex for ML-DSA-65 keygen
STELLAR_SIGNING_SEED=$(hex 32)         # rotate offline; combine with multisig
NEXTAUTH_SECRET=$(b64 48)
APP_INTERNAL_HMAC=$(hex 32)
ALERT_WEBHOOK_TOKEN=$(b64 32)

cat > "${OUT}" <<EOF
# Generated ${TS} — DO NOT COMMIT
PQ_RECEIPT_SEED=${PQ_RECEIPT_SEED}
STELLAR_SIGNING_SEED=${STELLAR_SIGNING_SEED}
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
APP_INTERNAL_HMAC=${APP_INTERNAL_HMAC}
ALERT_WEBHOOK_TOKEN=${ALERT_WEBHOOK_TOKEN}
EOF

chmod 600 "${OUT}"
echo "✅ wrote ${OUT}"
echo
echo "Manual rotation still required for:"
echo "  - PI_API_KEY (regenerate at https://develop.pi/)"
echo "  - SUPABASE_SERVICE_ROLE_KEY (Supabase dashboard → Settings → API)"
echo "  - DATABASE_URL password"
echo

if [[ "${1:-}" == "--push" && "${2:-}" == "replit" ]]; then
  if [[ -z "${REPLIT_TOKEN:-}" || -z "${REPL_ID:-}" ]]; then
    echo "❌ REPLIT_TOKEN and REPL_ID env vars must be set to push secrets"
    echo "   Generate a token at https://replit.com/account#api and find REPL_ID in repl URL"
    exit 1
  fi
  if ! command -v curl >/dev/null 2>&1; then
    echo "❌ curl not installed"
    exit 1
  fi
  while IFS='=' read -r k v; do
    [[ -z "$k" || "$k" =~ ^# ]] && continue
    echo "→ pushing $k to Replit (production)"
    curl -sS -X POST "https://replit.com/api/v0/repls/${REPL_ID}/secrets" \
      -H "Authorization: Bearer ${REPLIT_TOKEN}" \
      -H "Content-Type: application/json" \
      -d "$(printf '{"key":"%s","value":%s}' "$k" "$(printf '%s' "$v" | python3 -c 'import json,sys;print(json.dumps(sys.stdin.read()))')")" \
      >/dev/null
  done < "${OUT}"
  echo "✅ Replit Secrets updated. Replit will rebuild on next push to main."
fi
