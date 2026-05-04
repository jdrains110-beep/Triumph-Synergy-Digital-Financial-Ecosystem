# ==========================================================================
# TRIUMPH SYNERGY — ECOSYSTEM GUARDIAN
# Copyright (C) 2024-2026 Jeremiah Joel Drains, Founder & Superior Sovereign
# / Triumph Synergy. All rights reserved.
# License: PiOS
# ==========================================================================
# Consolidates THREE watchdog services into ONE container:
#   health-governor   → port 9912  (container memory + health watchdog)
#   network-sentinel  → port 9913  (multi-WAN connectivity monitor)
#   horizon-guardian  → port 9911  (testnet2/Horizon process guardian)
#
# Uses supervisord to manage all four processes with individual restart
# policies — one container crash cannot take down another watchdog.
# Security: APEX-QUANTUM-SOVEREIGN (MAX) — ML-DSA-87 · ML-KEM-1024
# ==========================================================================

FROM python:3.13-slim

# Install docker CLI (for watchdog.sh) + supervisor (process manager) + curl
# Use Debian base to avoid Alpine musl/pyexpat ABI issues breaking supervisor
RUN apt-get update && apt-get upgrade -y --no-install-recommends && apt-get install -y --no-install-recommends \
    ca-certificates curl gnupg supervisor procps iproute2 && \
    install -m 0755 -d /etc/apt/keyrings && \
    curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc && \
    chmod a+r /etc/apt/keyrings/docker.asc && \
    echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list && \
    apt-get update && apt-get upgrade -y --no-install-recommends && apt-get install -y --no-install-recommends docker-ce-cli && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY governor.py       ./governor.py
COPY sentinel.py       ./sentinel.py
COPY metrics_server.py ./metrics_server.py
COPY watchdog.sh       ./watchdog.sh
COPY supervisord.conf  ./supervisord.conf

RUN chmod +x /app/watchdog.sh /app/governor.py /app/sentinel.py /app/metrics_server.py

# Expose all three metric/health ports
EXPOSE 9911 9912 9913

CMD ["supervisord", "-c", "/app/supervisord.conf"]
