"""
SAIB Peer Federation
====================

Lets multiple SAIB instances form a sovereign mesh:

  • Two Triumph Synergy Docker Desktop platforms (e.g. dev laptop + ops Mac)
  • The central / supernode SAIB (long-running infra host)
  • Optional K8s replicas

Each peer publishes its `/status` to every other peer at a fixed cadence
and pulls back the peer's status so all SAIBs share a global view of the
ecosystem. When a peer goes silent, the surviving peers raise an alert
and (if configured) take over the silent peer's external remediation
duties — preventing single-host blind spots.

Peer membership is configured via env:

  SAIB_PEERS=name1=https://...,name2=https://...
  SAIB_PEER_NAME=docker-desktop-a
  SAIB_PEER_POLL_S=30
  SAIB_PEER_OFFLINE_S=120        # peer flagged offline after this many seconds

Mainnet-only mandate: peer URLs are HTTPS-preferred and never carry
testnet network identifiers in their payloads.
"""

from __future__ import annotations

import os
import time
from dataclasses import dataclass, field


@dataclass
class SaibPeer:
    name: str
    base_url: str          # e.g. https://saib-a.example.com:8099
    last_seen_at: float = 0.0
    last_status: dict = field(default_factory=dict)
    last_error: str | None = None
    offline: bool = False


def _parse_peers(raw: str) -> list[SaibPeer]:
    peers: list[SaibPeer] = []
    for chunk in raw.split(","):
        chunk = chunk.strip()
        if not chunk or "=" not in chunk:
            continue
        name, url = chunk.split("=", 1)
        name = name.strip()
        url = url.strip().rstrip("/")
        if name and url:
            peers.append(SaibPeer(name=name, base_url=url))
    return peers


def build_peer_registry() -> dict[str, SaibPeer]:
    raw = os.getenv("SAIB_PEERS", "").strip()
    return {p.name: p for p in _parse_peers(raw)}


def peer_self_name() -> str:
    return os.getenv("SAIB_PEER_NAME", os.getenv("SAIB_REPLICA_ID", "saib-local"))


def peer_poll_interval_s() -> float:
    return float(os.getenv("SAIB_PEER_POLL_S", "30"))


def peer_offline_threshold_s() -> float:
    return float(os.getenv("SAIB_PEER_OFFLINE_S", "120"))


async def poll_peer(client, peer: SaibPeer) -> SaibPeer:
    """Pull `/status` from a peer SAIB and update local state."""
    try:
        resp = await client.get(f"{peer.base_url}/status", timeout=10.0)
        if resp.status_code == 200:
            peer.last_status = resp.json()
            peer.last_seen_at = time.time()
            peer.last_error = None
            peer.offline = False
        else:
            peer.last_error = f"HTTP {resp.status_code}"
            _maybe_mark_offline(peer)
    except Exception as exc:  # noqa: BLE001
        peer.last_error = str(exc)[:200]
        _maybe_mark_offline(peer)
    return peer


def _maybe_mark_offline(peer: SaibPeer) -> None:
    """Mark peer offline if it hasn't been seen for the configured window."""
    threshold = peer_offline_threshold_s()
    if peer.last_seen_at == 0.0:
        peer.offline = True
        return
    if time.time() - peer.last_seen_at > threshold:
        peer.offline = True


def federation_summary(peers: dict[str, SaibPeer]) -> dict:
    """Produce a JSON-serialisable summary of the peer mesh."""
    online = sum(1 for p in peers.values() if not p.offline)
    return {
        "self": peer_self_name(),
        "peer_count": len(peers),
        "online": online,
        "offline": len(peers) - online,
        "peers": [
            {
                "name": p.name,
                "url": p.base_url,
                "online": not p.offline,
                "last_seen_at": p.last_seen_at,
                "last_error": p.last_error,
                "services_healthy": (
                    p.last_status.get("services_healthy") if p.last_status else None
                ),
                "services_total": (
                    p.last_status.get("services_total") if p.last_status else None
                ),
            }
            for p in peers.values()
        ],
    }
