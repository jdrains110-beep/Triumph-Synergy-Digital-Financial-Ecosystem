# =============================================================================
# TRIUMPH SYNERGY — SOVEREIGN MESH HUB
# =============================================================================
# Encrypted private mesh network using WireGuard (kernel-level VPN) +
# Headscale (self-hosted mesh coordinator) + post-quantum key exchange.
#
# Crypto stack:
#   WireGuard      — ChaCha20-Poly1305 + Curve25519 (transport layer)
#   TLS 1.3        — AES-256-GCM inter-service mTLS
#   ML-KEM-1024    — Post-quantum key encapsulation (NIST FIPS 203)
#
# Mesh address space: 10.13.37.0/24  (sovereign-mesh network)
#   .1   — hub (this container)
#   .10  — triumph-app
#   .11  — triumph-nginx
#   .12  — triumph-apex-services
#   .13  — triumph-sovereign-military-bridge
#   .14  — triumph-quantum-intel-fortress
#   .15  — triumph-settlement-core
#   .16  — triumph-pi-mainnet-node
#   .17  — triumph-governance-shield
#   .18  — triumph-vault
# =============================================================================

FROM python:3.13-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    wireguard-tools \
    iptables \
    iproute2 \
    curl \
    ca-certificates \
    net-tools \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY entrypoint.sh /entrypoint.sh
COPY mesh_hub.py .
COPY wg_keygen.py .

RUN chmod +x /entrypoint.sh

# WireGuard config directory
RUN mkdir -p /etc/wireguard /app/keys /app/peers && chmod 700 /etc/wireguard

ENV PORT=8200 \
    WG_INTERFACE=wg-sovereign \
    WG_LISTEN_PORT=51820 \
    MESH_SUBNET=10.13.37.0/24 \
    HUB_IP=10.13.37.1 \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

EXPOSE 8200 51820/udp

# WireGuard requires NET_ADMIN + SYS_MODULE capabilities (set in compose)
ENTRYPOINT ["/entrypoint.sh"]
