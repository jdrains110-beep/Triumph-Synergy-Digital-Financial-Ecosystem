#!/usr/bin/env bash
# ==============================================================================
# TRIUMPH UBUNTU ADMIN — entrypoint
# Validates Pi mainnet stack connectivity on startup, prints a live ledger
# summary, then yields to CMD (tail -f /dev/null keeps the container alive).
# ==============================================================================
set -euo pipefail

SAIB_ENFORCER="${SAIB_ENFORCER_URL:-http://triumph-saib-enforcer:8210}"
PI_HORIZON="${STELLAR_HORIZON_URL:-https://api.mainnet.minepi.com}"
TRIUMPH_APP="${TRIUMPH_APP_URL:-http://triumph-app:3000}"

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  TRIUMPH SYNERGY DIGITAL FINANCIAL ECOSYSTEM                    ║"
echo "║  Ubuntu 24.04 LTS Admin Shell — Pi Network SCP Protocol 24     ║"
echo "║  GCV: \$314,159.00 / π                                          ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo "[ubuntu-admin] OS: $(lsb_release -ds 2>/dev/null || echo 'Ubuntu 24.04')"
echo "[ubuntu-admin] Node.js: $(node --version 2>/dev/null || echo 'not found')"
echo "[ubuntu-admin] Python: $(python3 --version 2>/dev/null || echo 'not found')"
echo ""

# ── Check SAIB live ledger ────────────────────────────────────────────────────
echo "[ubuntu-admin] Checking SAIB Enforcer at $SAIB_ENFORCER ..."
if curl -sf "$SAIB_ENFORCER/health" -o /tmp/saib-health.json; then
  echo "[ubuntu-admin] SAIB OK: $(cat /tmp/saib-health.json)"
else
  echo "[ubuntu-admin] WARNING: SAIB Enforcer not yet reachable — may still be starting"
fi

# ── Check Triumph App ─────────────────────────────────────────────────────────
echo "[ubuntu-admin] Checking Triumph App at $TRIUMPH_APP ..."
if curl -sf --max-time 5 "$TRIUMPH_APP/api/health" -o /dev/null 2>&1; then
  echo "[ubuntu-admin] Triumph App: REACHABLE"
else
  echo "[ubuntu-admin] WARNING: Triumph App health check skipped (may not expose /api/health)"
fi

# ── Check Pi mainnet Horizon ──────────────────────────────────────────────────
echo "[ubuntu-admin] Checking Pi Network Horizon at $PI_HORIZON ..."
if curl -sf --max-time 8 "$PI_HORIZON" -o /tmp/horizon.json; then
  LATEST_LEDGER=$(jq -r '.history_latest_ledger // "unknown"' /tmp/horizon.json 2>/dev/null || echo "unknown")
  echo "[ubuntu-admin] Pi mainnet Horizon OK — latest ledger: $LATEST_LEDGER"
else
  echo "[ubuntu-admin] WARNING: Pi mainnet Horizon not reachable from this container (check STELLAR_HORIZON_URL)"
fi

echo ""
echo "[ubuntu-admin] Shell ready. Run: docker exec -it triumph-ubuntu-admin bash"
echo "[ubuntu-admin] Admin scripts: node /admin/pi-admin.js --help"
echo ""

# Execute CMD
exec "$@"
