# ==============================================================================
# APEX-SOVEREIGN-LIFE — Super-Pod (3 services → 1 container)
# ==============================================================================
# Consolidates the three single-process Python sovereign apex services that
# share an identical FastAPI/uvicorn/Redis/httpx/Prometheus stack and the same
# upstream dependencies (Vault, Payment-Processor, SAIB, Quantum-Shield):
#
#   sovereign-bank      (port 8150) — full-reserve, 0%, anti-cartel Pi bank
#   sovereign-education (port 8130) — K-12, college, faculty pay, learn-and-earn
#   sovereign-telecom   (port 8140) — 7-layer quantum mesh, never-offline
#
# Process supervisor: supervisord (matches ecosystem-guardian pattern)
# Build context: docker/
# ==============================================================================
FROM python:3.13-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    supervisor curl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY sovereign-life/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Pull each service's main.py and rename to <service>.py so all three FastAPI
# apps can be hosted side-by-side under a single supervisord.
COPY sovereign-bank/main.py      /app/bank.py
COPY sovereign-education/main.py /app/education.py
COPY sovereign-telecom/main.py   /app/telecom.py

COPY sovereign-life/supervisord.conf /etc/supervisor/conf.d/sovereign-life.conf

RUN groupadd --system --gid 1018 sovlife && \
    useradd  --system --uid 1018 --gid sovlife sovlife && \
    mkdir -p /var/log/supervisor && \
    chown -R sovlife:sovlife /app /var/log/supervisor

EXPOSE 8130 8140 8150

LABEL org.triumph.pod="sovereign-life" \
      org.triumph.merges="sovereign-bank+sovereign-education+sovereign-telecom" \
      org.triumph.tier="apex-sovereign" \
      org.triumph.quantum="ML-DSA-87+ML-KEM-1024+SPHINCS+"

USER sovlife

HEALTHCHECK --interval=20s --timeout=15s --retries=8 --start-period=120s \
    CMD python3 -c "import socket; \
    [ (lambda p: (lambda s: (s.settimeout(5), s.connect(('127.0.0.1', p)), s.close()))(socket.socket()))(p) \
    for p in (8130, 8140, 8150) ]" || exit 1

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/sovereign-life.conf", "-n"]
