#!/usr/bin/env bash
# =============================================================================
# Pi Node (testnet2) peer connection diagnostics and repair.
#
# DIAGNOSIS (run --dry-run to check without changing anything):
#
#   Root cause 1 — "all available slots are taken" peer drops:
#     stellar-core evicts non-preferred outbound peers to retry connections to
#     preferred Pi Network validators. The validators reject with ERR_LOAD
#     (they're overloaded), so stellar-core re-evicts repeatedly.
#     The config already has MAX_ADDITIONAL_PEER_CONNECTIONS=64 and
#     PREFERRED_PEERS_ONLY=false — both correct. TARGET_PEER_CONNECTIONS=32 is
#     also the right value; lowering it makes kicking worse (slots fill faster).
#
#   Root cause 2 — zero inbound connections:
#     MAX_ADDITIONAL_PEER_CONNECTIONS=64 and PREFERRED_PEERS_ONLY=false are
#     already set. The real blocker is NAT: your router must forward TCP 31402
#     to this Mac's LAN IP. Run: sudo bash scripts/setup-pi-supernode-macos.sh
#     to ensure macOS PF firewall allows inbound on 31402.
#
#   NOT applicable to Pi Network stellar-core v22 fork:
#     FLOOD_OP_RATE_PER_CONNECTION, PEER_FLOOD_READING_CAPACITY,
#     PEER_READING_CAPACITY, FLOW_CONTROL_SEND_MORE_BATCH_SIZE — these are
#     upstream stellar-core params that Pi Network's fork does not support.
#     Attempting to set them causes a FATAL parse error and core won't start.
#
# WHAT THIS SCRIPT DOES:
#   1. Verifies the config has optimal peer settings (no changes needed).
#   2. If config was accidentally corrupted, restores from backup.
#   3. Shows live peer status after verification.
#
# Usage:
#   bash scripts/patch-pi-node-peers.sh           # verify + show status
#   bash scripts/patch-pi-node-peers.sh --dry-run  # show status only
# =============================================================================

set -euo pipefail

DRY_RUN=false
CONTAINER="testnet2"
CFG="/opt/stellar/core/etc/stellar-core.cfg"

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    *) echo "Unknown arg: $arg"; exit 1 ;;
  esac
done

# ── Verify container is running ───────────────────────────────────────────────
if ! docker inspect "$CONTAINER" --format '{{.State.Running}}' 2>/dev/null | grep -q true; then
  echo "ERROR: container '$CONTAINER' is not running" >&2
  exit 1
fi

# ── Read current config ───────────────────────────────────────────────────────
echo "=== Current peer settings in $CFG ==="
docker exec "$CONTAINER" sh -c \
  "grep -iE 'TARGET_PEER|MAX_ADDITIONAL|MAX_PENDING|PREFERRED_PEERS_ONLY' $CFG 2>/dev/null" || true
echo ""

# ── Verify expected values ────────────────────────────────────────────────────
ISSUES=0

check_val() {
  local key="$1" expected="$2"
  actual=$(docker exec "$CONTAINER" sh -c "grep -oP '(?<=^${key}[[:space:]]*=[[:space:]]*)\\d+' $CFG 2>/dev/null || echo ''")
  if [[ "$actual" == "$expected" ]]; then
    echo "  [OK] ${key} = ${expected}"
  elif [[ -z "$actual" ]]; then
    echo "  [MISSING] ${key} not found (expected ${expected})"
    ISSUES=$((ISSUES + 1))
  else
    echo "  [WRONG] ${key} = ${actual} (expected ${expected})"
    ISSUES=$((ISSUES + 1))
  fi
}

echo "Checking peer config values..."
check_val "TARGET_PEER_CONNECTIONS" "32"
check_val "MAX_ADDITIONAL_PEER_CONNECTIONS" "64"
check_val "MAX_PENDING_CONNECTIONS" "1024"

preferred_only=$(docker exec "$CONTAINER" sh -c "grep -oP '(?<=^PREFERRED_PEERS_ONLY[[:space:]]*=[[:space:]]*)\\w+' $CFG 2>/dev/null || echo ''")
if [[ "$preferred_only" == "false" ]]; then
  echo "  [OK] PREFERRED_PEERS_ONLY = false"
else
  echo "  [WRONG] PREFERRED_PEERS_ONLY = ${preferred_only} (expected false)"
  ISSUES=$((ISSUES + 1))
fi

# Check for unsupported params that will cause a FATAL startup error
for BAD_KEY in FLOOD_OP_RATE_PER_CONNECTION PEER_FLOOD_READING_CAPACITY PEER_READING_CAPACITY FLOW_CONTROL_SEND_MORE_BATCH_SIZE; do
  if docker exec "$CONTAINER" sh -c "grep -q '^${BAD_KEY}' $CFG 2>/dev/null"; then
    echo "  [BAD] ${BAD_KEY} found — Pi Network fork does not support this param (will crash core)"
    ISSUES=$((ISSUES + 1))
  fi
done

echo ""

if [[ "$DRY_RUN" == "true" ]]; then
  echo "[dry-run] Issues found: ${ISSUES}. Run without --dry-run to fix."
  exit 0
fi

# ── Apply fixes if needed ─────────────────────────────────────────────────────
if [[ "$ISSUES" -gt 0 ]]; then
  echo "Fixing ${ISSUES} config issue(s)..."
  BACKUP_CFG="/opt/stellar/backups/stellar-core.cfg.pre-peer-patch.$(date +%Y%m%d-%H%M%S)"
  docker exec "$CONTAINER" sh -c "cp $CFG $BACKUP_CFG" 2>/dev/null || true
  echo "Backup → $BACKUP_CFG"

  # Restore correct values
  docker exec "$CONTAINER" sh -c "sed -i 's/^TARGET_PEER_CONNECTIONS[[:space:]]*=.*$/TARGET_PEER_CONNECTIONS         = 32/' $CFG"
  docker exec "$CONTAINER" sh -c "grep -q '^MAX_ADDITIONAL_PEER_CONNECTIONS' $CFG || sed -i '/^TARGET_PEER_CONNECTIONS/a MAX_ADDITIONAL_PEER_CONNECTIONS = 64' $CFG"
  docker exec "$CONTAINER" sh -c "sed -i 's/^MAX_ADDITIONAL_PEER_CONNECTIONS[[:space:]]*=.*$/MAX_ADDITIONAL_PEER_CONNECTIONS = 64/' $CFG"
  docker exec "$CONTAINER" sh -c "grep -q '^MAX_PENDING_CONNECTIONS' $CFG || sed -i '/^MAX_ADDITIONAL_PEER_CONNECTIONS/a MAX_PENDING_CONNECTIONS         = 1024' $CFG"
  docker exec "$CONTAINER" sh -c "sed -i 's/^MAX_PENDING_CONNECTIONS[[:space:]]*=.*$/MAX_PENDING_CONNECTIONS         = 1024/' $CFG"
  docker exec "$CONTAINER" sh -c "sed -i 's/^PREFERRED_PEERS_ONLY[[:space:]]*=.*$/PREFERRED_PEERS_ONLY = false/' $CFG"

  # Remove any unsupported params that cause FATAL crash
  for BAD_KEY in FLOOD_OP_RATE_PER_CONNECTION PEER_FLOOD_READING_CAPACITY PEER_READING_CAPACITY FLOW_CONTROL_SEND_MORE_BATCH_SIZE; do
    docker exec "$CONTAINER" sh -c "sed -i '/^${BAD_KEY}/d' $CFG"
  done

  echo "Restarting stellar-core..."
  docker exec "$CONTAINER" sh -c \
    "command -v supervisorctl >/dev/null 2>&1 && \
       supervisorctl restart stellar-core 2>/dev/null || \
     pkill -TERM stellar-core 2>/dev/null || \
     echo 'WARNING: restart the Pi Node app manually'"

  sleep 10
  for i in $(seq 1 6); do
    if docker exec "$CONTAINER" curl -sf http://localhost:1570/info >/dev/null 2>&1 || \
       docker exec "$CONTAINER" curl -sf http://localhost:11626/info >/dev/null 2>&1; then
      echo "stellar-core is responding."; break
    fi
    echo "  still waiting ($((i * 10))s)..."; sleep 10
  done
else
  echo "Config is optimal — no changes needed."
fi

# ── Live peer status ──────────────────────────────────────────────────────────
echo ""
echo "=== Live peer status ==="
docker exec "$CONTAINER" sh -c \
  "curl -sf http://localhost:1570/peers 2>/dev/null || \
   curl -sf http://localhost:11626/peers 2>/dev/null" | \
  python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    ap = d.get('authenticated_peers', {})
    pp = d.get('pending_peers', {})
    inb = ap.get('inbound')  or []
    out = ap.get('outbound') or []
    print(f'Authenticated — inbound: {len(inb)}, outbound: {len(out)}')
    print(f'Pending       — inbound: {len(pp.get(\"inbound\") or [])}, outbound: {len(pp.get(\"outbound\") or [])}')
    if inb:
        for p in inb: print(f'  INBOUND: {p[\"address\"]}')
except Exception as e:
    print(f'Could not parse peers response: {e}')
" 2>/dev/null || echo "(stellar-core HTTP not yet responding)"

echo ""
echo "=== Recent peer drop log ==="
docker exec "$CONTAINER" sh -c "tail -20 /tmp/stellar-core.log | grep -iE 'drop|reject|slots|ERR_LOAD' | tail -5" 2>/dev/null || true

echo ""
echo "To monitor peers continuously:"
echo "  watch -n 5 \"docker exec $CONTAINER curl -sf http://localhost:1570/peers | python3 -c \\\"import json,sys; ap=json.load(sys.stdin).get('authenticated_peers',{}); print('in:', len(ap.get('inbound') or []), 'out:', len(ap.get('outbound') or []))\\\"\""
echo ""
echo "For inbound connections from the internet:"
echo "  • Forward TCP port 31402 on your router → this Mac's LAN IP"
echo "  • Run: sudo bash scripts/setup-pi-supernode-macos.sh (macOS PF firewall)"
