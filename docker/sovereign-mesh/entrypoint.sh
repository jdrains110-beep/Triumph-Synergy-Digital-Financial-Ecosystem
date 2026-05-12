#!/bin/sh
# =============================================================================
# Triumph Synergy Sovereign Mesh Hub — Entrypoint
# Generates WireGuard keypair, writes wg0 config, brings up interface,
# then starts the mesh management API.
# =============================================================================
set -e

WG_IFACE="${WG_INTERFACE:-wg-sovereign}"
WG_PORT="${WG_LISTEN_PORT:-51820}"
HUB_IP="${HUB_IP:-10.13.37.1}"
MESH_SUBNET="${MESH_SUBNET:-10.13.37.0/24}"
KEY_DIR="/app/keys"
WG_CONF="/etc/wireguard/${WG_IFACE}.conf"

echo "[MESH-HUB] Triumph Synergy Sovereign Mesh Hub starting..."
echo "[MESH-HUB] Interface: ${WG_IFACE} | Port: ${WG_PORT} | Hub IP: ${HUB_IP}"

# ── Generate hub keypair if not already present ───────────────────────────────
if [ ! -f "${KEY_DIR}/hub_private.key" ]; then
    echo "[MESH-HUB] Generating hub WireGuard keypair (Curve25519)..."
    wg genkey > "${KEY_DIR}/hub_private.key"
    chmod 600 "${KEY_DIR}/hub_private.key"
    wg pubkey < "${KEY_DIR}/hub_private.key" > "${KEY_DIR}/hub_public.key"
    echo "[MESH-HUB] Hub public key: $(cat ${KEY_DIR}/hub_public.key)"
fi

HUB_PRIVATE_KEY="$(cat ${KEY_DIR}/hub_private.key)"
HUB_PUBLIC_KEY="$(cat ${KEY_DIR}/hub_public.key)"

# ── Generate pre-shared keys for each node (extra layer, ChaCha20-Poly1305) ──
for NODE in app nginx apex-services smb quantum settlement pi-node governance vault; do
    PSK_FILE="${KEY_DIR}/psk_${NODE}.key"
    if [ ! -f "${PSK_FILE}" ]; then
        wg genpsk > "${PSK_FILE}"
        chmod 600 "${PSK_FILE}"
        echo "[MESH-HUB] Generated PSK for node: ${NODE}"
    fi
done

# ── Generate node keypairs ────────────────────────────────────────────────────
for NODE in app nginx apex-services smb quantum settlement pi-node governance vault; do
    PRIV="${KEY_DIR}/${NODE}_private.key"
    PUB="${KEY_DIR}/${NODE}_public.key"
    if [ ! -f "${PRIV}" ]; then
        wg genkey > "${PRIV}"
        chmod 600 "${PRIV}"
        wg pubkey < "${PRIV}" > "${PUB}"
        echo "[MESH-HUB] Generated keypair for node: ${NODE} | PubKey: $(cat ${PUB})"
    fi
done

# ── Write WireGuard server config ─────────────────────────────────────────────
echo "[MESH-HUB] Writing ${WG_CONF}..."

cat > "${WG_CONF}" << WGEOF
# Triumph Synergy Sovereign Mesh — Hub Configuration
# Generated at container start. Do NOT edit manually.
# Encryption: ChaCha20-Poly1305 (transport) + Curve25519 (key exchange)
#             Pre-Shared Keys per peer (additional symmetric layer)

[Interface]
PrivateKey = ${HUB_PRIVATE_KEY}
Address = ${HUB_IP}/24
ListenPort = ${WG_PORT}
# Forward packets between peers (hub-and-spoke mesh routing)
PostUp   = iptables -A FORWARD -i ${WG_IFACE} -j ACCEPT; iptables -A FORWARD -o ${WG_IFACE} -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i ${WG_IFACE} -j ACCEPT; iptables -D FORWARD -o ${WG_IFACE} -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

# ── Peer: triumph-app (.10) ───────────────────────────────────────────────────
[Peer]
# triumph-app
PublicKey = $(cat ${KEY_DIR}/app_public.key)
PresharedKey = $(cat ${KEY_DIR}/psk_app.key)
AllowedIPs = 10.13.37.10/32

# ── Peer: triumph-nginx (.11) ─────────────────────────────────────────────────
[Peer]
# triumph-nginx
PublicKey = $(cat ${KEY_DIR}/nginx_public.key)
PresharedKey = $(cat ${KEY_DIR}/psk_nginx.key)
AllowedIPs = 10.13.37.11/32

# ── Peer: triumph-apex-services (.12) ────────────────────────────────────────
[Peer]
# triumph-apex-services
PublicKey = $(cat ${KEY_DIR}/apex-services_public.key)
PresharedKey = $(cat ${KEY_DIR}/psk_apex-services.key)
AllowedIPs = 10.13.37.12/32

# ── Peer: triumph-sovereign-military-bridge (.13) ────────────────────────────
[Peer]
# triumph-sovereign-military-bridge
PublicKey = $(cat ${KEY_DIR}/smb_public.key)
PresharedKey = $(cat ${KEY_DIR}/psk_smb.key)
AllowedIPs = 10.13.37.13/32

# ── Peer: triumph-quantum-intel-fortress (.14) ────────────────────────────────
[Peer]
# triumph-quantum-intel-fortress
PublicKey = $(cat ${KEY_DIR}/quantum_public.key)
PresharedKey = $(cat ${KEY_DIR}/psk_quantum.key)
AllowedIPs = 10.13.37.14/32

# ── Peer: triumph-settlement-core (.15) ───────────────────────────────────────
[Peer]
# triumph-settlement-core
PublicKey = $(cat ${KEY_DIR}/settlement_public.key)
PresharedKey = $(cat ${KEY_DIR}/psk_settlement.key)
AllowedIPs = 10.13.37.15/32

# ── Peer: triumph-pi-mainnet-node (.16) ──────────────────────────────────────
[Peer]
# triumph-pi-mainnet-node
PublicKey = $(cat ${KEY_DIR}/pi-node_public.key)
PresharedKey = $(cat ${KEY_DIR}/psk_pi-node.key)
AllowedIPs = 10.13.37.16/32

# ── Peer: triumph-governance-shield (.17) ────────────────────────────────────
[Peer]
# triumph-governance-shield
PublicKey = $(cat ${KEY_DIR}/governance_public.key)
PresharedKey = $(cat ${KEY_DIR}/psk_governance.key)
AllowedIPs = 10.13.37.17/32

# ── Peer: triumph-vault (.18) ─────────────────────────────────────────────────
[Peer]
# triumph-vault
PublicKey = $(cat ${KEY_DIR}/vault_public.key)
PresharedKey = $(cat ${KEY_DIR}/psk_vault.key)
AllowedIPs = 10.13.37.18/32
WGEOF

chmod 600 "${WG_CONF}"
echo "[MESH-HUB] WireGuard config written."

# ── Bring up WireGuard interface ──────────────────────────────────────────────
echo "[MESH-HUB] Bringing up ${WG_IFACE}..."
wg-quick up "${WG_IFACE}" 2>&1 || {
    echo "[MESH-HUB] wg-quick failed — trying userspace fallback (wireguard-go)..."
    # On Docker Desktop (macOS), kernel module unavailable; use boringtun
    ip link add dev "${WG_IFACE}" type wireguard 2>/dev/null || true
    wg setconf "${WG_IFACE}" "${WG_CONF}"
    ip address add "${HUB_IP}/24" dev "${WG_IFACE}"
    ip link set "${WG_IFACE}" up
}

echo "[MESH-HUB] Interface status:"
wg show "${WG_IFACE}" 2>/dev/null || echo "[MESH-HUB] (interface info unavailable in userspace mode)"

echo "[MESH-HUB] Starting Mesh Management API on :${PORT}..."
exec python -m uvicorn mesh_hub:app --host 0.0.0.0 --port "${PORT}" --workers 1
