# ==============================================================================
# GUARDIAN-WATCHDOG-NEXUS — Apex Super-Pod (5 processes → 1 container)
# ==============================================================================
# Merges ecosystem-guardian + saib-watchdog to eliminate 1 daemon container:
#   ecosystem-guardian processes:
#     governor      (9912) — container memory & health watchdog
#     sentinel      (9913) — multi-WAN network monitor
#     hg-watchdog   (none) — horizon/Pi node shell guardian
#     hg-metrics    (9911) — metrics HTTP server for guardian
#   saib-watchdog processes:
#     saib-watchdog (none) — SAIB self-resurrection sidecar
#
# Both services share the same Python 3.13-slim base and docker.sock mount.
# Build context: REPO ROOT (needs docker/ecosystem-guardian/ and docker/saib-watchdog/)
# ==============================================================================

FROM python:3.13-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

# docker CLI (for watchdog.sh), supervisor, networking tools, saib-watchdog Python deps
RUN apt-get update && apt-get upgrade -y --no-install-recommends && apt-get install -y --no-install-recommends \
    ca-certificates curl gnupg supervisor procps iproute2 && \
    install -m 0755 -d /etc/apt/keyrings && \
    curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc && \
    chmod a+r /etc/apt/keyrings/docker.asc && \
    echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list && \
    apt-get update && apt-get upgrade -y --no-install-recommends && apt-get install -y --no-install-recommends docker-ce-cli && \
    rm -rf /var/lib/apt/lists/*

# saib-watchdog Python packages (not needed by ecosystem-guardian scripts)
RUN pip install --no-cache-dir httpx==0.27.2 docker==7.1.0 kubernetes==31.0.0

WORKDIR /app

# ── ecosystem-guardian scripts ───────────────────────────────────────────────
COPY docker/ecosystem-guardian/governor.py       /app/governor.py
COPY docker/ecosystem-guardian/sentinel.py       /app/sentinel.py
COPY docker/ecosystem-guardian/metrics_server.py /app/metrics_server.py
COPY docker/ecosystem-guardian/watchdog.sh       /app/watchdog.sh

# ── saib-watchdog script ─────────────────────────────────────────────────────
COPY docker/saib-watchdog/watchdog.py            /app/saib_watchdog.py

COPY docker/guardian-watchdog-nexus/supervisord.conf /app/supervisord.conf

RUN chmod +x /app/watchdog.sh /app/governor.py /app/sentinel.py \
    /app/metrics_server.py /app/saib_watchdog.py

EXPOSE 9911 9912 9913

LABEL org.triumph.pod="guardian-watchdog-nexus" \
    org.triumph.merges="ecosystem-guardian+saib-watchdog" \
    org.triumph.services="governor+sentinel+hg-watchdog+hg-metrics+saib-watchdog" \
    org.triumph.mainnet-only="true"

CMD ["supervisord", "-c", "/app/supervisord.conf"]
