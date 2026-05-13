# ==============================================================================
# SAIB-WATCHDOG — Self-resurrection sidecar
# ==============================================================================
# Tiny, independent container whose ONLY job is to ensure SAIB itself
# (the apex-services container that hosts the Sovereign AI Bot) stays
# alive. SAIB cannot restart its own container from inside, so this
# watchdog acts as the external resurrection authority.
#
# Mainnet-only mandate — Pi Network + Stellar Protocol 24.
# ==============================================================================
FROM python:3.13-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update && apt-get upgrade -y --no-install-recommends && \
    apt-get install -y --no-install-recommends ca-certificates curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN pip install --no-cache-dir httpx==0.27.2 docker==7.1.0 kubernetes==31.0.0

COPY saib-watchdog/watchdog.py /app/watchdog.py

# Run as root so the docker.sock group membership works on every host
# (the watchdog ONLY talks to docker.sock; no other privilege required).

LABEL org.triumph.pod="saib-watchdog" \
    org.triumph.purpose="self-resurrection-sidecar" \
    org.triumph.mainnet-only="true"

HEALTHCHECK --interval=60s --timeout=10s --retries=5 --start-period=30s \
    CMD python -c "import os; assert os.path.exists('/var/run/docker.sock')" || exit 1

CMD ["python", "/app/watchdog.py"]
