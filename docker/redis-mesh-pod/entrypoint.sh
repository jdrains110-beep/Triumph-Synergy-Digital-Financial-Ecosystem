#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# Triumph Synergy — Sovereign Geographic Redis Mesh PoD entrypoint
#
# Boots all 6 redis-server instances (ports 6381..6386) inside this container,
# forwards each instance's logs, then runs the cluster-init bootstrap exactly
# once (idempotent — skips if cluster_state is already "ok"). All processes
# share the container's CPU, RAM, and page cache → mesh peers boost each
# other instead of each one paying the full per-container overhead tax.
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

LOG_DIR=${REDIS_MESH_LOG_DIR:-/var/log/redis-mesh}
mkdir -p "$LOG_DIR"

# The hostname/alias other services use to reach this pod. Each redis
# instance announces this hostname (cluster-announce-hostname) plus its
# own port. Redis 7 still requires a literal IP for cluster-announce-ip,
# so we resolve the pod's primary container IP from /etc/hosts at boot.
ANNOUNCE_HOST=${REDIS_MESH_ANNOUNCE_HOST:-triumph-redis-mesh-pod}
ANNOUNCE_IP=${REDIS_MESH_ANNOUNCE_IP:-$(hostname -i 2>/dev/null | awk '{print $1}')}
if [ -z "${ANNOUNCE_IP}" ]; then
  ANNOUNCE_IP=$(getent hosts "$(hostname)" | awk '{print $1}' | head -n1)
fi
if [ -z "${ANNOUNCE_IP}" ]; then
  ANNOUNCE_IP="127.0.0.1"
fi
echo "[redis-mesh] announce host=${ANNOUNCE_HOST}  announce ip=${ANNOUNCE_IP}"

# Per-instance memory cap (LRU evicts oldest keys past this).
MAXMEM=${REDIS_MESH_MAXMEMORY:-384mb}

# Cluster node timeout — how fast failover triggers after a node goes silent.
NODE_TIMEOUT=${REDIS_MESH_NODE_TIMEOUT_MS:-5000}

PIDS=()

start_node() {
  local idx=$1
  local port=$((6380 + idx))
  local bus_port=$((16380 + idx))
  local data_dir="/data/node-${idx}"
  local log_file="${LOG_DIR}/node-${idx}.log"

  mkdir -p "$data_dir"

  echo "[redis-mesh] starting node-${idx}  port=${port}  bus=${bus_port}  announce=${ANNOUNCE_HOST}:${port}"

  redis-server \
    --port "${port}" \
    --bind 0.0.0.0 \
    --protected-mode no \
    --cluster-enabled yes \
    --cluster-config-file "${data_dir}/nodes.conf" \
    --cluster-node-timeout "${NODE_TIMEOUT}" \
    --cluster-announce-ip "${ANNOUNCE_IP}" \
    --cluster-announce-hostname "${ANNOUNCE_HOST}" \
    --cluster-preferred-endpoint-type hostname \
    --cluster-announce-port "${port}" \
    --cluster-announce-bus-port "${bus_port}" \
    --appendonly yes \
    --dir "${data_dir}" \
    --maxmemory "${MAXMEM}" \
    --maxmemory-policy allkeys-lru \
    --tcp-backlog 511 \
    --tcp-keepalive 60 \
    --io-threads 2 \
    --io-threads-do-reads yes \
    --logfile "${log_file}" \
    --daemonize no &

  PIDS+=("$!")
}

# ── Boot all 6 nodes ────────────────────────────────────────────────────────
for i in 1 2 3 4 5 6; do
  start_node "$i"
done

# ── Wait until each node answers PING before initialising the cluster ──────
echo "[redis-mesh] waiting for all 6 nodes to respond to PING…"
for i in 1 2 3 4 5 6; do
  port=$((6380 + i))
  for attempt in $(seq 1 60); do
    if redis-cli -p "${port}" ping 2>/dev/null | grep -q PONG; then
      echo "[redis-mesh]   node-${i}:${port} ready"
      break
    fi
    sleep 1
    if [ "$attempt" -eq 60 ]; then
      echo "[redis-mesh] !! node-${i}:${port} never became ready"
      exit 1
    fi
  done
done

# ── Form / heal the cluster (idempotent) ────────────────────────────────────
/usr/local/bin/cluster-init.sh "${ANNOUNCE_HOST}" || {
  echo "[redis-mesh] cluster-init failed — see logs above"
  # Still keep the redis processes running so an operator can manually
  # inspect / re-run cluster-init from outside.
}

echo "[redis-mesh] mesh pod online — 6 nodes co-located, ports 6381..6386"

# ── Launch the self-learning Mesh-Brain sidecar in this same container ──
# It watches all 6 nodes, publishes insights to channel triumph:mesh:learning,
# and self-heals memory pressure / stalls. Lightweight — stdlib only.
if [ "${REDIS_MESH_BRAIN_DISABLED:-0}" != "1" ]; then
  echo "[redis-mesh] starting mesh-brain self-learning sidecar"
  python3 /usr/local/bin/mesh-brain.py >> "${LOG_DIR}/mesh-brain.log" 2>&1 &
  BRAIN_PID=$!
fi

# ── Stream per-node + brain logs to the container's stdout ──
tail -F "${LOG_DIR}"/node-*.log "${LOG_DIR}"/mesh-brain.log 2>/dev/null &
TAIL_PID=$!

# ── Forward signals + wait on every redis process ──────────────────────────
shutdown() {
  echo "[redis-mesh] shutdown signal — stopping all 6 redis nodes gracefully"
  if [ -n "${BRAIN_PID:-}" ]; then
    kill "${BRAIN_PID}" 2>/dev/null || true
  fi
  for i in 1 2 3 4 5 6; do
    port=$((6380 + i))
    redis-cli -p "${port}" SHUTDOWN NOSAVE 2>/dev/null || true
  done
  kill "${TAIL_PID}" 2>/dev/null || true
  wait
}
trap shutdown SIGTERM SIGINT

# Wait on whichever redis process exits first; that's our health signal.
wait -n "${PIDS[@]}"
EXIT_CODE=$?
echo "[redis-mesh] a redis process exited with code ${EXIT_CODE} — propagating"
shutdown
exit "${EXIT_CODE}"
