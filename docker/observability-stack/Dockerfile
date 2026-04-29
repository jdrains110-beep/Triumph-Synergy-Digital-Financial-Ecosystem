# ==============================================================================
# APEX-OBSERVABILITY-STACK — Super-Pod (5 services → 1 container) — SLIM build
# ==============================================================================
# Merges:
#   prometheus         (9090) — TSDB (binary fetched from official tarball)
#   grafana            (3000) — Dashboards (installed via grafana .deb repo)
#   postgres-exporter  (9187) — pg metrics (binary copied from tiny upstream)
#   redis-exporter     (9121) — redis metrics (binary copied from alpine image)
#   cloud-memory       (8095) — LZ4 cross-service compressed memory layer
#
# CHANGES vs. fat Dockerfile (Dockerfile.bak-fat):
#   • No COPY --from=grafana/prometheus stages (those huge multi-stage COPYs
#     trigger BuildKit "exporting layers" hangs on Docker Desktop macOS for
#     >2 GB images). Grafana installed via apt repo, prometheus via tarball.
#   • Build deps purged after pip install (saves ~250 MB).
#   • Final image target: ~700 MB (was 2.21 GB).
# ==============================================================================

# Tiny exporter source stages (single binaries — these COPYs are small & safe)
FROM prometheuscommunity/postgres-exporter:latest AS pgexp-stage
FROM oliver006/redis_exporter:alpine              AS redisexp-stage

# ── Runner ──
FROM debian:bookworm-slim AS runner

ENV DEBIAN_FRONTEND=noninteractive \
    PROM_VERSION=2.55.1 \
    GF_PATHS_DATA=/var/lib/grafana \
    GF_PATHS_LOGS=/var/log/grafana \
    GF_PATHS_PLUGINS=/var/lib/grafana/plugins \
    GF_PATHS_PROVISIONING=/etc/grafana/provisioning

# ── Base packages ──
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        supervisor curl ca-certificates wget gosu gnupg2 \
        python3 python3-pip python3-venv && \
    rm -rf /var/lib/apt/lists/*

# ── Grafana via official apt repo (single layer, ~250 MB installed) ──
RUN mkdir -p /etc/apt/keyrings && \
    wget -qO- https://apt.grafana.com/gpg.key | gpg --dearmor > /etc/apt/keyrings/grafana.gpg && \
    echo "deb [signed-by=/etc/apt/keyrings/grafana.gpg] https://apt.grafana.com stable main" \
        > /etc/apt/sources.list.d/grafana.list && \
    apt-get update && \
    apt-get install -y --no-install-recommends grafana && \
    rm -rf /var/lib/apt/lists/* && \
    cp -r /etc/grafana /etc/grafana.default

# ── Prometheus via official tarball (single layer, ~150 MB) ──
RUN set -eux; \
    arch="$(dpkg --print-architecture)"; \
    case "$arch" in \
        amd64) PROM_ARCH=linux-amd64 ;; \
        arm64) PROM_ARCH=linux-arm64 ;; \
        *) echo "unsupported arch $arch" && exit 1 ;; \
    esac; \
    cd /tmp && \
    wget -q "https://github.com/prometheus/prometheus/releases/download/v${PROM_VERSION}/prometheus-${PROM_VERSION}.${PROM_ARCH}.tar.gz" && \
    tar -xzf "prometheus-${PROM_VERSION}.${PROM_ARCH}.tar.gz" && \
    mv "prometheus-${PROM_VERSION}.${PROM_ARCH}/prometheus" /usr/local/bin/prometheus && \
    mv "prometheus-${PROM_VERSION}.${PROM_ARCH}/promtool"   /usr/local/bin/promtool && \
    mkdir -p /etc/prometheus.default && \
    cp -r "prometheus-${PROM_VERSION}.${PROM_ARCH}/consoles" /etc/prometheus.default/ && \
    cp -r "prometheus-${PROM_VERSION}.${PROM_ARCH}/console_libraries" /etc/prometheus.default/ && \
    rm -rf "/tmp/prometheus-${PROM_VERSION}.${PROM_ARCH}" "/tmp/prometheus-${PROM_VERSION}.${PROM_ARCH}.tar.gz" && \
    mkdir -p /prometheus && chmod -R 777 /prometheus

# ── Exporters (small single-binary COPYs from tiny upstream images) ──
COPY --from=pgexp-stage    /bin/postgres_exporter  /usr/local/bin/postgres_exporter
COPY --from=redisexp-stage /redis_exporter         /usr/local/bin/redis_exporter

# ── Cloud-memory app: install build deps, build, then purge to keep image slim ──
COPY cloud-memory/requirements.txt /opt/cloud-memory/requirements.txt
RUN apt-get update && \
    apt-get install -y --no-install-recommends build-essential python3-dev && \
    python3 -m venv /opt/cloud-memory/venv && \
    /opt/cloud-memory/venv/bin/pip install --no-cache-dir --upgrade pip && \
    /opt/cloud-memory/venv/bin/pip install --no-cache-dir -r /opt/cloud-memory/requirements.txt && \
    apt-get purge -y --auto-remove build-essential python3-dev && \
    rm -rf /var/lib/apt/lists/* /root/.cache
COPY cloud-memory/main.py /opt/cloud-memory/main.py

# ── Pod config + provisioning ──
COPY observability-stack/supervisord.conf /etc/supervisor/conf.d/observability-stack.conf
COPY prometheus/prometheus.yml /etc/prometheus/prometheus.yml
COPY grafana/dashboards/    /etc/grafana/provisioning/dashboards/
COPY grafana/datasources/   /etc/grafana/provisioning/datasources/

# ── Pod user + dirs ──
RUN groupadd --system --gid 1016 obs && \
    useradd  --system --uid 1016 --gid obs obs && \
    mkdir -p /var/log/supervisor \
             /backup/local /backup/offline \
             /etc/grafana/provisioning/dashboards \
             /etc/grafana/provisioning/datasources \
             /etc/grafana/provisioning/alerting \
             /etc/grafana/provisioning/plugins \
             /etc/grafana/provisioning/notifiers \
             /etc/grafana/provisioning/access-control \
             /etc/prometheus && \
    chown -R obs:obs /prometheus /var/lib/grafana /var/log/grafana /var/log/supervisor \
                     /etc/grafana /etc/prometheus /opt/cloud-memory /backup

EXPOSE 3000 9090 9121 9187 8095

LABEL org.triumph.pod="observability-stack" \
      org.triumph.merges="prometheus+grafana+postgres-exporter+redis-exporter+cloud-memory" \
      org.triumph.tier="apex-observability"

COPY observability-stack/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

HEALTHCHECK --interval=30s --timeout=45s --retries=10 --start-period=300s \
    CMD curl -fsS --max-time 10 http://127.0.0.1:9090/-/healthy && \
        curl -fsS --max-time 10 http://127.0.0.1:3000/api/health && \
        curl -fsS --max-time 10 http://127.0.0.1:9187/metrics > /dev/null && \
        curl -fsS --max-time 10 http://127.0.0.1:9121/metrics > /dev/null && \
        curl -fsS --max-time 10 http://127.0.0.1:8095/health > /dev/null || exit 1

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/observability-stack.conf", "-n"]
