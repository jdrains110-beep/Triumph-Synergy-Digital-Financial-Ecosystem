#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────
# TRIUMPH SYNERGY — APEX SECURITY: secret rotation
# Rotates: PI_API_KEY, SUPABASE_SERVICE_ROLE_KEY (manual fetch),
#          PQ_RECEIPT_SEED, STELLAR_SIGNING_SEED, NEXTAUTH_SECRET
#
# Generates fresh entropy locally, prints to stdout AND writes to
# .env.rotation.<timestamp> for atomic Vercel sync.
#
# Usage:
#   ./scripts/rotate-secrets.sh                # generate
#   ./scripts/rotate-secrets.sh --push vercel  # generate + push to Vercel envs
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

if [[ "${1:-}" == "--push" && "${2:-}" == "vercel" ]]; then
  if ! command -v vercel >/dev/null 2>&1; then
    echo "❌ vercel CLI not installed (npm i -g vercel)"
    exit 1
  fi
  while IFS='=' read -r k v; do
    [[ -z "$k" || "$k" =~ ^# ]] && continue
    echo "→ pushing $k to Vercel (production)"
    printf '%s' "$v" | vercel env add "$k" production --force >/dev/null
  done < "${OUT}"
  echo "✅ Vercel env updated. Trigger a redeploy: vercel --prod"
fi
