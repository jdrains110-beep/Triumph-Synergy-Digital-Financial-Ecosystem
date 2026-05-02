# ==============================================================================
# APEX-SERVICES — Mega Super-Pod (18 services → 1 container)
# ==============================================================================
# Consolidates the three previously-standalone sovereign super-pods into one
# unified container, removing 2 redundant Python interpreters / supervisord
# overheads (~150 MB savings on an 8 GB Mac).
#
# Merged from:
#   sovereign-fortress   (5 services, ports 8097-8102)
#   sovereign-insurance  (7 services, ports 8110-8116)
#   sovereign-utilities  (6 services, ports 8120-8125)
#
# Each merged super-pod keeps its OWN working directory so that the existing
# `from _common import make_app` imports continue to resolve to the correct
# sibling module without any source modifications.
# ==============================================================================
FROM python:3.13-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    supervisor curl ca-certificates \
    build-essential && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY apex-services/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# ---- Fortress (5 services) ----
RUN mkdir -p /app/fortress
COPY sovereign-ai-bot/main.py          /app/fortress/ai_bot.py
COPY sovereign-gateway/main.py         /app/fortress/gateway.py
COPY sovereign-delivery-engine/main.py /app/fortress/delivery.py
COPY sovereign-pidex-engine/main.py    /app/fortress/pidex.py
COPY sovereign-sports-hub/main.py      /app/fortress/sports.py

# ---- Insurance (7 services + own _common.py) ----
RUN mkdir -p /app/insurance
COPY sovereign-insurance/_common.py  /app/insurance/_common.py
COPY sovereign-insurance/life.py     /app/insurance/life.py
COPY sovereign-insurance/home.py     /app/insurance/home.py
COPY sovereign-insurance/health.py   /app/insurance/health.py
COPY sovereign-insurance/auto.py     /app/insurance/auto.py
COPY sovereign-insurance/dental.py   /app/insurance/dental.py
COPY sovereign-insurance/vision.py   /app/insurance/vision.py
COPY sovereign-insurance/hospital.py /app/insurance/hospital.py

# ---- Utilities (6 services + own _common.py) ----
RUN mkdir -p /app/utilities
COPY sovereign-utilities/_common.py  /app/utilities/_common.py
COPY sovereign-utilities/electric.py /app/utilities/electric.py
COPY sovereign-utilities/water.py    /app/utilities/water.py
COPY sovereign-utilities/gas.py      /app/utilities/gas.py
COPY sovereign-utilities/hoa.py      /app/utilities/hoa.py
COPY sovereign-utilities/plumbing.py /app/utilities/plumbing.py
COPY sovereign-utilities/hvac.py     /app/utilities/hvac.py

COPY apex-services/supervisord.conf /etc/supervisor/conf.d/apex-services.conf

RUN groupadd --system --gid 1020 apex && \
    useradd  --system --uid 1020 --gid apex apex && \
    # Add apex user to docker group (GID 999 — standard Docker socket group)
    # so SAIB can access /var/run/docker.sock for container restart authority
    groupadd --system --gid 999 docker_sock 2>/dev/null || true && \
    usermod -aG docker_sock apex 2>/dev/null || true && \
    mkdir -p /var/log/supervisor && \
    chown -R apex:apex /app /var/log/supervisor

EXPOSE 8097 8099 8100 8101 8102 \
    8110 8111 8112 8113 8114 8115 8116 \
    8120 8121 8122 8123 8124 8125

LABEL org.triumph.pod="apex-services" \
    org.triumph.merges="sovereign-fortress+sovereign-insurance+sovereign-utilities" \
    org.triumph.services="18" \
    org.triumph.quantum="ML-DSA-87+ML-KEM-1024+SPHINCS+"

USER apex

# Healthcheck: spot-check one port from each merged super-pod
HEALTHCHECK --interval=30s --timeout=15s --retries=8 --start-period=240s \
    CMD python -c "import socket; \
    [ (lambda p: (lambda s: (s.settimeout(5), s.connect(('127.0.0.1', p)), s.close()))(socket.socket()))(p) \
    for p in (8099, 8112, 8120) ]" || exit 1

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/apex-services.conf", "-n"]
