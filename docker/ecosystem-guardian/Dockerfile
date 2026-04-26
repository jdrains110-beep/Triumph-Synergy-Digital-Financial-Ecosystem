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

FROM docker:27-cli

RUN apk add --no-cache \
    python3 \
    py3-pip \
    curl \
    busybox-extras \
    supervisor \
 && rm -rf /var/cache/apk/*

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
