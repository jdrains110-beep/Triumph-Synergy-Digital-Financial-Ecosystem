# ==============================================================================
# SOVEREIGN-UTILITIES — Super-Pod (6 services → 1 container)
# ==============================================================================
# Real-world utility for Pi Network across the home-services industry:
#   electric  (port 8120)  — GRU, FPL, Clay Electric, Duke FL, TECO, JEA
#   water     (port 8121)  — GRU Water, JEA Water, CCUA, Putnam County, Ocala
#   gas       (port 8122)  — TECO Peoples Gas, FPU, Chesapeake Utilities
#   hoa       (port 8123)  — FirstService, Castle Group, Associa, Leland, Sentry
#   plumbing  (port 8124)  — Roto-Rooter, Mr. Rooter, Benjamin Franklin, ARS
#   hvac      (port 8125)  — Trane, Carrier, Lennox dealer networks, ARS, etc.
# Process supervisor: supervisord
# Build context: docker/
# ==============================================================================
FROM python:3.13-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update && apt-get upgrade -y --no-install-recommends && \
    apt-get install -y --no-install-recommends \
    supervisor curl ca-certificates \
    build-essential && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY sovereign-utilities/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY sovereign-utilities/_common.py  /app/_common.py
COPY sovereign-utilities/electric.py /app/electric.py
COPY sovereign-utilities/water.py    /app/water.py
COPY sovereign-utilities/gas.py      /app/gas.py
COPY sovereign-utilities/hoa.py      /app/hoa.py
COPY sovereign-utilities/plumbing.py /app/plumbing.py
COPY sovereign-utilities/hvac.py     /app/hvac.py

COPY sovereign-utilities/supervisord.conf /etc/supervisor/conf.d/sovereign-utilities.conf

RUN groupadd --system --gid 1018 utility && \
    useradd  --system --uid 1018 --gid utility utility && \
    mkdir -p /var/log/supervisor && \
    chown -R utility:utility /app /var/log/supervisor

EXPOSE 8120 8121 8122 8123 8124 8125

LABEL org.triumph.pod="sovereign-utilities" \
    org.triumph.merges="electric+water+gas+hoa+plumbing+hvac" \
    org.triumph.quantum="ML-DSA-87+ML-KEM-1024+SPHINCS+"

USER utility

HEALTHCHECK --interval=20s --timeout=15s --retries=8 --start-period=180s \
    CMD python -c "import socket; \
    [ (lambda p: (lambda s: (s.settimeout(5), s.connect(('127.0.0.1', p)), s.close()))(socket.socket()))(p) \
    for p in (8120, 8121, 8122, 8123, 8124, 8125) ]" || exit 1

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/sovereign-utilities.conf", "-n"]
