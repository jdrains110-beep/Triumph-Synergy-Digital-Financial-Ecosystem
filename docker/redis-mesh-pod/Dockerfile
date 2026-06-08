# ╔══════════════════════════════════════════════════════════════════════════╗
# ║ Triumph Synergy — Sovereign Geographic Redis Mesh PoD                    ║
# ║ ──────────────────────────────────────────────────────────────────────── ║
# ║ Bundles all 6 redis-cluster nodes (3 masters + 3 replicas) into a single ║
# ║ co-located container so they share CPU + memory and form a tightly       ║
# ║ coupled mesh on a single host. All cluster-bus traffic stays on the      ║
# ║ loopback interface — no per-container scheduler/networking overhead.     ║
# ╚══════════════════════════════════════════════════════════════════════════╝
FROM redis:7.4-alpine

LABEL org.triumphsynergy.role="redis-mesh-pod"
LABEL org.triumphsynergy.tier="sovereign-data-plane"

RUN apk add --no-cache bash tini procps python3 && \
    mkdir -p /data/node-1 /data/node-2 /data/node-3 \
    /data/node-4 /data/node-5 /data/node-6 \
    /var/log/redis-mesh

COPY entrypoint.sh    /usr/local/bin/entrypoint.sh
COPY cluster-init.sh  /usr/local/bin/cluster-init.sh
COPY mesh-brain.py    /usr/local/bin/mesh-brain.py
RUN chmod +x /usr/local/bin/entrypoint.sh /usr/local/bin/cluster-init.sh /usr/local/bin/mesh-brain.py

# Ports: 6 redis instances + 6 cluster-bus ports
EXPOSE 6381 6382 6383 6384 6385 6386
EXPOSE 16381 16382 16383 16384 16385 16386

VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
    CMD redis-cli -p 6381 ping >/dev/null && \
    redis-cli -p 6386 ping >/dev/null && \
    [ "$(redis-cli -p 6381 cluster info | awk -F: '/cluster_state/{gsub(/\r/,\"\");print $2}')" = "ok" ] || exit 1

ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/entrypoint.sh"]
