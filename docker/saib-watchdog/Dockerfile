# ==============================================================================
# SAIB-WATCHDOG — Self-resurrection sidecar
# ==============================================================================
# Tiny, independent container whose ONLY job is to ensure SAIB itself
# (the apex-services container that hosts the Sovereign AI Bot) stays
# alive. SAIB cannot restart its own container from inside, so this
# watchdog acts as the external resurrection authority.
#
# Mainnet-only mandate — Pi Network + Stellar Protocol 24.
# Ubuntu 24.04 LTS base: full apt ecosystem, systemd-compatible, better
# compatibility with stellar-core tooling and docker CLI packages.
# ==============================================================================
FROM ubuntu:24.04

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1 \
    DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get upgrade -y --no-install-recommends && \
    apt-get install -y --no-install-recommends \
    python3 python3-pip python3-venv \
    ca-certificates curl wget gnupg \
    net-tools dnsutils iputils-ping \
    jq unzip tar && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN pip3 install --no-cache-dir httpx==0.27.2 docker==7.1.0 kubernetes==31.0.0

COPY saib-watchdog/watchdog.py /app/watchdog.py

# Run as root so the docker.sock group membership works on every host
# (the watchdog ONLY talks to docker.sock; no other privilege required).

LABEL org.triumph.pod="saib-watchdog" \
    org.triumph.purpose="self-resurrection-sidecar" \
    org.triumph.mainnet-only="true"

HEALTHCHECK --interval=60s --timeout=10s --retries=5 --start-period=30s \
    CMD python3 -c "import os; assert os.path.exists('/var/run/docker.sock')" || exit 1

CMD ["python3", "/app/watchdog.py"]
