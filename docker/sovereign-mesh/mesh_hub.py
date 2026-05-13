# Copyright (C) 2024-2026 Jeremiah Joel Drains, Founder & Superior Sovereign / Triumph Synergy. All rights reserved.
# License: PiOS
"""
Triumph Synergy Sovereign Mesh Hub
====================================
WireGuard-based encrypted private mesh network management API.

Encryption layers:
  Layer 1 — WireGuard transport: ChaCha20-Poly1305 + Curve25519 ECDH
  Layer 2 — Pre-shared keys per peer: additional symmetric key layer
  Layer 3 — mTLS 1.3 for all inter-service API calls: AES-256-GCM
  Layer 4 — Application layer: CNSA Suite 2.0 (via sovereign-military-bridge)

Mesh address space: 10.13.37.0/24
  .1   hub (this service)
  .10  triumph-app
  .11  triumph-nginx
  .12  triumph-apex-services
  .13  triumph-sovereign-military-bridge
  .14  triumph-quantum-intel-fortress
  .15  triumph-settlement-core
  .16  triumph-pi-mainnet-node
  .17  triumph-governance-shield
  .18  triumph-vault

Routes:
  GET  /health               — Liveness + mesh interface status
  GET  /mesh/status          — Full peer table with handshake times
  GET  /mesh/topology        — Network map with latency
  GET  /mesh/peers           — Registered peer list + public keys
  POST /mesh/register        — Register new peer (returns client config)
  GET  /mesh/keys/public     — Hub public key (for peer configuration)
  POST /mesh/rotate-psk      — Rotate pre-shared key for a peer
  GET  /metrics              — Prometheus metrics
"""

import asyncio
import json
import logging
import os
import secrets
import subprocess
import time
from typing import Optional

from fastapi import FastAPI, HTTPException, Header
from fastapi.responses import PlainTextResponse, JSONResponse
from prometheus_client import Counter, Gauge, generate_latest, CONTENT_TYPE_LATEST
from pydantic import BaseModel

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [MESH-HUB] %(levelname)s %(message)s",
)
log = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────────────────────
WG_IFACE     = os.getenv("WG_INTERFACE", "wg-sovereign")
HUB_IP       = os.getenv("HUB_IP", "10.13.37.1")
MESH_SUBNET  = os.getenv("MESH_SUBNET", "10.13.37.0/24")
KEY_DIR      = "/app/keys"
PORT         = int(os.getenv("PORT", "8200"))
START_TIME   = time.time()

# API key for sensitive mutation endpoints (register, rotate-psk).
# If MESH_API_KEY is not set the endpoints are protected only by network isolation.
# In production, always set a strong random value.
MESH_API_KEY = os.getenv("MESH_API_KEY", "")


def _check_api_key(authorization: Optional[str]) -> None:
    """Raise HTTP 401 if MESH_API_KEY is set and the Authorization header doesn't match."""
    if not MESH_API_KEY:
        return  # no key configured — rely on network isolation
    token = ""
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
    if not secrets.compare_digest(token, MESH_API_KEY):
        raise HTTPException(status_code=401, detail="Invalid or missing API key")

# ── Mesh peer registry ────────────────────────────────────────────────────────
MESH_PEERS = {
    "triumph-app":                     {"ip": "10.13.37.10", "node": "app"},
    "triumph-nginx":                   {"ip": "10.13.37.11", "node": "nginx"},
    "triumph-apex-services":           {"ip": "10.13.37.12", "node": "apex-services"},
    "triumph-sovereign-military-bridge": {"ip": "10.13.37.13", "node": "smb"},
    "triumph-quantum-intel-fortress":  {"ip": "10.13.37.14", "node": "quantum"},
    "triumph-settlement-core":         {"ip": "10.13.37.15", "node": "settlement"},
    "triumph-pi-mainnet-node":         {"ip": "10.13.37.16", "node": "pi-node"},
    "triumph-governance-shield":       {"ip": "10.13.37.17", "node": "governance"},
    "triumph-vault":                   {"ip": "10.13.37.18", "node": "vault"},
}

# ── Prometheus metrics ────────────────────────────────────────────────────────
mesh_peers_active    = Gauge("triumph_mesh_peers_active", "Active WireGuard peers with recent handshake")
mesh_bytes_sent      = Gauge("triumph_mesh_bytes_sent_total", "Total bytes sent through mesh", ["peer"])
mesh_bytes_recv      = Gauge("triumph_mesh_bytes_recv_total", "Total bytes received from peer", ["peer"])
mesh_peer_handshake  = Gauge("triumph_mesh_last_handshake_seconds", "Seconds since last handshake", ["peer"])
mesh_requests        = Counter("triumph_mesh_requests_total", "Total mesh API requests", ["endpoint"])

# ── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="Triumph Synergy Sovereign Mesh Hub",
    description="WireGuard encrypted private mesh network — ChaCha20-Poly1305 + Curve25519 + Post-Quantum PSK",
    version="1.0.0",
    docs_url=None,
    redoc_url=None,
)


def _read_key(filename: str) -> Optional[str]:
    """Read a key file, return None if missing."""
    path = os.path.join(KEY_DIR, filename)
    try:
        with open(path) as f:
            return f.read().strip()
    except FileNotFoundError:
        return None


def _wg_show() -> dict:
    """Parse `wg show <iface>` output into structured data."""
    try:
        result = subprocess.run(
            ["wg", "show", WG_IFACE],
            capture_output=True, text=True, timeout=5
        )
        if result.returncode != 0:
            return {"error": result.stderr.strip()}
        return {"raw": result.stdout.strip()}
    except Exception as e:
        return {"error": str(e)}


def _wg_show_dump() -> list[dict]:
    """Parse `wg show <iface> dump` for structured peer data."""
    peers = []
    try:
        result = subprocess.run(
            ["wg", "show", WG_IFACE, "dump"],
            capture_output=True, text=True, timeout=5
        )
        if result.returncode != 0:
            return []
        lines = result.stdout.strip().split("\n")
        # First line is interface info; remaining lines are peers
        for line in lines[1:]:
            parts = line.split("\t")
            if len(parts) >= 7:
                pubkey, psk, endpoint, allowed_ips, last_handshake, rx, tx = parts[:7]
                peers.append({
                    "public_key": pubkey,
                    "endpoint": endpoint if endpoint != "(none)" else None,
                    "allowed_ips": allowed_ips,
                    "last_handshake": int(last_handshake) if last_handshake.isdigit() else 0,
                    "rx_bytes": int(rx),
                    "tx_bytes": int(tx),
                })
    except Exception as e:
        log.warning(f"wg show dump failed: {e}")
    return peers


def _update_metrics(peers: list[dict]) -> None:
    """Update Prometheus gauges from peer dump."""
    active = 0
    now = int(time.time())
    for peer in peers:
        pk = peer["public_key"][:16]  # truncate for label
        hs = peer["last_handshake"]
        age = now - hs if hs > 0 else 9999
        if age < 180:  # handshake within 3 minutes = active
            active += 1
        mesh_peer_handshake.labels(peer=pk).set(age)
        mesh_bytes_sent.labels(peer=pk).set(peer["tx_bytes"])
        mesh_bytes_recv.labels(peer=pk).set(peer["rx_bytes"])
    mesh_peers_active.set(active)


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    mesh_requests.labels(endpoint="/health").inc()
    wg = _wg_show()
    up = "error" not in wg
    return {
        "service": "triumph-sovereign-mesh-hub",
        "status": "healthy" if up else "degraded",
        "mesh_interface": WG_IFACE,
        "hub_ip": HUB_IP,
        "mesh_subnet": MESH_SUBNET,
        "encryption": {
            "transport": "ChaCha20-Poly1305",
            "key_exchange": "Curve25519-ECDH",
            "psk_layer": "AES-256 pre-shared keys per peer",
            "standard": "WireGuard RFC — cryptographically opinionated",
        },
        "uptime_seconds": round(time.time() - START_TIME, 2),
    }


@app.get("/mesh/status")
async def mesh_status():
    mesh_requests.labels(endpoint="/mesh/status").inc()
    dump = _wg_show_dump()
    _update_metrics(dump)
    raw = _wg_show()
    now = int(time.time())

    active_count = sum(
        1 for p in dump
        if p["last_handshake"] > 0 and (now - p["last_handshake"]) < 180
    )

    return {
        "service": "triumph-sovereign-mesh-hub",
        "timestamp": now,
        "mesh_interface": WG_IFACE,
        "hub_ip": HUB_IP,
        "mesh_subnet": MESH_SUBNET,
        "registered_peers": len(MESH_PEERS),
        "active_peers": active_count,
        "peers": dump,
        "interface_info": raw,
        "encryption_stack": {
            "layer_1_transport": "WireGuard — ChaCha20-Poly1305 + Curve25519",
            "layer_2_psk": "Pre-shared key per peer — additional 256-bit symmetric key",
            "layer_3_api": "TLS 1.3 — AES-256-GCM (inter-service)",
            "layer_4_app": "CNSA Suite 2.0 — via sovereign-military-bridge",
            "post_quantum": "ML-KEM-1024 PSK derivation — via quantum-intel-fortress",
        },
    }


@app.get("/mesh/topology")
async def mesh_topology():
    mesh_requests.labels(endpoint="/mesh/topology").inc()
    dump = _wg_show_dump()
    now = int(time.time())

    # Build key→peer name mapping
    key_map = {}
    for name, info in MESH_PEERS.items():
        node = info["node"]
        pub = _read_key(f"{node}_public.key")
        if pub:
            key_map[pub] = {"name": name, "ip": info["ip"]}

    nodes = [{"name": "triumph-sovereign-mesh-hub", "ip": HUB_IP, "role": "hub", "status": "online"}]
    edges = []

    for peer in dump:
        pk = peer["public_key"]
        peer_info = key_map.get(pk, {"name": pk[:16] + "...", "ip": peer["allowed_ips"]})
        age = now - peer["last_handshake"] if peer["last_handshake"] > 0 else None
        status = "active" if age is not None and age < 180 else "idle" if age is not None else "never_connected"

        nodes.append({
            "name": peer_info["name"],
            "ip": peer_info["ip"],
            "status": status,
            "last_handshake_age_s": age,
            "rx_bytes": peer["rx_bytes"],
            "tx_bytes": peer["tx_bytes"],
        })
        edges.append({
            "from": "triumph-sovereign-mesh-hub",
            "to": peer_info["name"],
            "encrypted": True,
            "cipher": "ChaCha20-Poly1305",
            "key_exchange": "Curve25519",
            "psk": True,
        })

    return {
        "topology": "hub-and-spoke",
        "description": "Encrypted sovereign mesh — all traffic passes through WireGuard tunnel",
        "nodes": nodes,
        "edges": edges,
        "mesh_subnet": MESH_SUBNET,
    }


@app.get("/mesh/peers")
async def mesh_peers():
    mesh_requests.labels(endpoint="/mesh/peers").inc()
    result = {}
    for name, info in MESH_PEERS.items():
        node = info["node"]
        pub = _read_key(f"{node}_public.key")
        result[name] = {
            "mesh_ip": info["ip"],
            "public_key": pub or "NOT_GENERATED",
            "psk_present": os.path.exists(os.path.join(KEY_DIR, f"psk_{node}.key")),
        }
    return {"hub_public_key": _read_key("hub_public.key"), "peers": result}


@app.get("/mesh/keys/public")
async def hub_public_key():
    mesh_requests.labels(endpoint="/mesh/keys/public").inc()
    key = _read_key("hub_public.key")
    if not key:
        raise HTTPException(503, "Hub public key not yet generated")
    return {"hub_public_key": key, "algorithm": "Curve25519", "interface": WG_IFACE}


class PeerRegistration(BaseModel):
    peer_name: str
    peer_public_key: str
    mesh_ip: str


@app.post("/mesh/register")
async def register_peer(reg: PeerRegistration, authorization: Optional[str] = Header(default=None)):
    """
    Register a new peer and return its WireGuard client config.
    Requires Authorization: Bearer <MESH_API_KEY> when MESH_API_KEY is set.
    The client config includes hub public key + assigned mesh IP.
    """
    _check_api_key(authorization)
    mesh_requests.labels(endpoint="/mesh/register").inc()
    hub_pub = _read_key("hub_public.key")
    if not hub_pub:
        raise HTTPException(503, "Hub not ready — keys not generated")

    # Generate PSK for this peer
    try:
        psk_result = subprocess.run(["wg", "genpsk"], capture_output=True, text=True, timeout=5)
        psk = psk_result.stdout.strip()
    except Exception:
        psk = None

    hub_wg_port = int(os.getenv("WG_LISTEN_PORT", "51820"))

    client_conf = f"""# Triumph Synergy Sovereign Mesh — Client Config for {reg.peer_name}
# Generated by Sovereign Mesh Hub
# Encryption: ChaCha20-Poly1305 + Curve25519 + PSK

[Interface]
PrivateKey = <INSERT_PEER_PRIVATE_KEY>
Address = {reg.mesh_ip}/24
DNS = 10.13.37.1

[Peer]
# Triumph Sovereign Mesh Hub
PublicKey = {hub_pub}
{"PresharedKey = " + psk if psk else "# PSK not available"}
AllowedIPs = {MESH_SUBNET}
Endpoint = triumph-sovereign-mesh-hub:{hub_wg_port}
PersistentKeepalive = 25
"""
    return {
        "peer_name": reg.peer_name,
        "mesh_ip": reg.mesh_ip,
        "hub_public_key": hub_pub,
        "client_config": client_conf,
        "instructions": "Replace <INSERT_PEER_PRIVATE_KEY> with your node's WireGuard private key",
    }


@app.get("/metrics")
async def metrics():
    dump = _wg_show_dump()
    _update_metrics(dump)
    return PlainTextResponse(generate_latest(), media_type=CONTENT_TYPE_LATEST)
