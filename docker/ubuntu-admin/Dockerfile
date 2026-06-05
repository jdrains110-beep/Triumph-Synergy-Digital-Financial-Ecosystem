# ==============================================================================
# UBUNTU ADMIN — Triumph Synergy Sovereign Blockchain Admin Shell
# ==============================================================================
# Ubuntu 24.04 LTS container with full stellar-core tooling, Node.js 20 LTS,
# Python 3, Pi Network Horizon CLI utils, jq, curl, netstat, and all packages
# needed to administer the Pi Network mainnet SCP stack (Protocol 24).
#
# Services available from inside this container (triumph-net):
#   triumph-app:3000          — Next.js sovereign storefront
#   triumph-nginx:80          — Edge proxy
#   triumph-saib-enforcer:8210 — SAIB live ledger + enforcement
#   triumph-settlement-core:8080-8089 — Pi payment + tokenization
#   triumph-governance-shield:8087-8096 — judicial, compliance, SCP backbone
#   triumph-postgres:5432     — PostgreSQL
#   triumph-redis:6379        — Redis
#   triumph-pi-mainnet-node:8000 — Pi Node Horizon (Protocol 24)
# ==============================================================================
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive \
    NODE_VERSION=20 \
    PYTHONUNBUFFERED=1

# ── Base tools + Node.js + Python3 ───────────────────────────────────────────
RUN apt-get update && apt-get upgrade -y --no-install-recommends && \
    apt-get install -y --no-install-recommends \
    # Core utils
    curl wget ca-certificates gnupg \
    # Network diagnostics
    net-tools dnsutils iputils-ping netcat-openbsd tcpdump nmap \
    # Data tools
    jq unzip tar gzip bc \
    # Text processing
    vim nano less grep sed awk \
    # Build tools (for npm packages)
    build-essential git \
    # Python3
    python3 python3-pip python3-venv python3-requests \
    # PostgreSQL client
    postgresql-client \
    # Redis client
    redis-tools && \
    # ── Node.js 20 LTS via NodeSource ────────────────────────────────────────
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    # ── stellar-core CLI tools (Horizon client) ───────────────────────────────
    npm install -g @stellar/stellar-sdk @stellar/stellar-base stellar-hd-wallet && \
    # Cleanup
    rm -rf /var/lib/apt/lists/* /tmp/*

WORKDIR /admin

# ── Horizon connectivity helper scripts ──────────────────────────────────────
COPY entrypoint.sh /admin/entrypoint.sh
COPY pi-admin.js   /admin/pi-admin.js
RUN chmod +x /admin/entrypoint.sh

LABEL org.triumph.pod="ubuntu-admin" \
    org.triumph.purpose="blockchain-admin-shell-ubuntu-24.04" \
    org.triumph.protocol="SCP-24" \
    org.triumph.mainnet-only="true"

# Keep running so exec/attach always works
ENTRYPOINT ["/admin/entrypoint.sh"]
CMD ["tail", "-f", "/dev/null"]
