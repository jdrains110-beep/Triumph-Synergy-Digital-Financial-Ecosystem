#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# Idempotent cluster bootstrap for the Triumph redis-mesh-pod.
#
# Detects whether the 6 co-located redis nodes have already formed a healthy
# cluster (cluster_state=ok, cluster_known_nodes=6). If so it exits cleanly.
# Otherwise it resets every node and re-forms a 3-master / 3-replica cluster.
#
# All cluster traffic stays on this container's loopback (127.0.0.1) — the
# announce IP given to clients is the docker network alias passed as $1.
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ANNOUNCE_HOST="${1:-triumph-redis-mesh-pod}"
PORTS=(6381 6382 6383 6384 6385 6386)

cluster_state() {
  redis-cli -p "$1" cluster info 2>/dev/null \
    | awk -F: '/cluster_state/{gsub(/\r/,"");print $2}'
}
known_nodes() {
  redis-cli -p "$1" cluster info 2>/dev/null \
    | awk -F: '/cluster_known_nodes/{gsub(/\r/,"");print $2}'
}

STATE=$(cluster_state 6381 || echo "")
KNOWN=$(known_nodes 6381 || echo "0")

if [ "${STATE}" = "ok" ] && [ "${KNOWN}" = "6" ]; then
  echo "[cluster-init] ✓ cluster already healthy (state=ok, known=6) — nothing to do"
  redis-cli -p 6381 cluster info
  exit 0
fi

echo "[cluster-init] cluster not formed (state='${STATE}', known='${KNOWN}') — bootstrapping"

# ── Wipe any half-formed state on every node ──
for p in "${PORTS[@]}"; do
  redis-cli -p "${p}" FLUSHALL 2>/dev/null || true
  redis-cli -p "${p}" CLUSTER RESET HARD 2>/dev/null || true
done
sleep 1

# ── Form 3-master / 3-replica cluster across the 6 local ports ──
NODES=""
for p in "${PORTS[@]}"; do
  NODES="${NODES} 127.0.0.1:${p}"
done

echo "[cluster-init] redis-cli --cluster create${NODES} --cluster-replicas 1"
# shellcheck disable=SC2086
yes "yes" | redis-cli --cluster create ${NODES} --cluster-replicas 1

# ── Verify ──
sleep 2
FINAL_STATE=$(cluster_state 6381 || echo "")
FINAL_KNOWN=$(known_nodes 6381 || echo "0")
echo "[cluster-init] final state=${FINAL_STATE}  known=${FINAL_KNOWN}"
redis-cli -p 6381 cluster nodes || true

if [ "${FINAL_STATE}" != "ok" ] || [ "${FINAL_KNOWN}" != "6" ]; then
  echo "[cluster-init] !! cluster did NOT reach state=ok / known=6"
  exit 1
fi

echo "[cluster-init] ✓ mesh-pod cluster formed and healthy — announce host=${ANNOUNCE_HOST}"
