# Copyright (C) 2024-2026 Jeremiah Drains / Triumph Synergy. All rights reserved.
# License: PiOS
#
# Apex Sovereign Nexus — unified super-pod that replaces 4 standalone containers:
#   sovereign-commerce-authority (8160)
#   sovereign-gaming-nexus       (8131)
#   sovereign-work-nexus         (8132)
#   publix-phygital-hub          (8133)
#
# Runs all 4 FastAPI apps in one Python process group via supervisord.
# Reduces daemon container count by 3, freeing ~600m RAM + base-image overhead.

FROM python:3.13-slim

ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1

# Install supervisor + health-check deps in one layer
RUN apt-get update && apt-get upgrade -y --no-install-recommends \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Shared requirements — all 4 services use the same stack
COPY apex-sovereign-nexus/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy each service's main module under its pod-unique name
COPY sovereign-commerce-authority/main.py ./commerce_main.py
COPY sovereign-gaming-nexus/main.py       ./gaming_main.py
COPY sovereign-work-nexus/main.py         ./work_main.py
COPY publix-phygital-hub/main.py          ./phygital_main.py

# Supervisor config
COPY apex-sovereign-nexus/supervisord.conf /etc/supervisor/conf.d/nexus.conf

# Non-root user
RUN useradd -u 1020 -m nexus && chown -R nexus:nexus /app

# supervisord must run as root to manage child processes; children drop privileges
# via uvicorn's own process (inherits non-root env)
EXPOSE 8131 8132 8133 8160

HEALTHCHECK --interval=30s --timeout=10s --start-period=45s --retries=5 \
    CMD curl -sf http://localhost:8131/health && \
        curl -sf http://localhost:8132/health && \
        curl -sf http://localhost:8133/health && \
        curl -sf http://localhost:8160/health || exit 1

CMD ["supervisord", "-c", "/etc/supervisor/conf.d/nexus.conf"]
