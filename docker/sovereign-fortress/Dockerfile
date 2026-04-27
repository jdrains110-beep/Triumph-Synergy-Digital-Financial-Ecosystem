# ==============================================================================
# SOVEREIGN-FORTRESS — Super-Pod (5 services → 1 container)
# ==============================================================================
# Merges:
#   sovereign-ai-bot          (port 8099)  — FastAPI brain
#   sovereign-gateway         (port 8097)  — stdlib http.server universal gateway
#   sovereign-delivery-engine (port 8100)  — FastAPI delivery authorities
#   sovereign-pidex-engine    (port 8101)  — FastAPI Pi-DEX
#   sovereign-sports-hub      (port 8102)  — FastAPI sports platform
# Process supervisor: supervisord
# Build context: docker/  (so we can COPY from sibling dirs)
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

COPY sovereign-fortress/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy the original five service main.py files, renamed to avoid collision
COPY sovereign-ai-bot/main.py          /app/ai_bot.py
COPY sovereign-gateway/main.py         /app/gateway.py
COPY sovereign-delivery-engine/main.py /app/delivery.py
COPY sovereign-pidex-engine/main.py    /app/pidex.py
COPY sovereign-sports-hub/main.py      /app/sports.py

COPY sovereign-fortress/supervisord.conf /etc/supervisor/conf.d/sovereign-fortress.conf

RUN groupadd --system --gid 1010 sovereign && \
    useradd  --system --uid 1010 --gid sovereign sovereign && \
    mkdir -p /var/log/supervisor && \
    chown -R sovereign:sovereign /app /var/log/supervisor

EXPOSE 8097 8099 8100 8101 8102

LABEL org.triumph.pod="sovereign-fortress" \
    org.triumph.merges="ai-bot+gateway+delivery+pidex+sports-hub" \
    org.triumph.quantum="ML-DSA-87+ML-KEM-1024+SPHINCS+"

USER sovereign

# Healthcheck: every internal port must be listening
HEALTHCHECK --interval=20s --timeout=15s --retries=8 --start-period=180s \
    CMD python -c "import socket,sys; \
    [ (lambda p: (lambda s: (s.settimeout(5), s.connect(('127.0.0.1', p)), s.close()))(socket.socket()))(p) \
    for p in (8097, 8099, 8100, 8101, 8102) ]" || exit 1

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/sovereign-fortress.conf", "-n"]
