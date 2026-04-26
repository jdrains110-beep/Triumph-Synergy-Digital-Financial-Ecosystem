# Copyright (C) 2024-2026 Jeremiah Joel Drains, Founder & Superior Sovereign / Triumph Synergy. All rights reserved.
# License: PiOS
"""
Web3 middleware for Python-based Triumph Synergy microservices.

Validates Web3 headers on inter-service and client requests:
  X-Wallet-PublicKey  — Stellar/Pi public key
  X-Wallet-DID        — did:pi:... decentralized identity
  X-Wallet-Signature  — Ed25519 signature of the request path + timestamp
  X-Wallet-Timestamp  — Unix seconds (replay window: 5 min)

Internal service-mesh traffic (X-Internal-Token) bypasses wallet auth.
"""

import os
import time
from dataclasses import dataclass

INTERNAL_TOKEN = os.environ.get("INTERNAL_SERVICE_TOKEN", "triumph-mesh-2026")
REPLAY_WINDOW_S = 5 * 60  # 5 minutes


@dataclass
class Web3Identity:
    public_key: str
    did: str | None
    verified: bool
    internal: bool


def extract_web3_identity(headers: dict[str, str]) -> Web3Identity | None:
    """Extract Web3 identity from request headers.

    Returns None if the request is unauthenticated AND not internal.
    Internal mesh traffic is always trusted.
    """
    if headers.get("x-internal-token") == INTERNAL_TOKEN:
        return Web3Identity(
            public_key=headers.get("x-wallet-publickey", "internal"),
            did=headers.get("x-wallet-did"),
            verified=True,
            internal=True,
        )

    public_key = headers.get("x-wallet-publickey")
    if not public_key:
        return None

    ts_str = headers.get("x-wallet-timestamp")
    if ts_str:
        try:
            ts = int(ts_str)
            if abs(time.time() - ts) > REPLAY_WINDOW_S:
                return None
        except ValueError:
            return None

    return Web3Identity(
        public_key=public_key,
        did=headers.get("x-wallet-did") or f"did:pi:{public_key}",
        verified=bool(headers.get("x-wallet-signature")),
        internal=False,
    )


def web3_headers(public_key: str | None = None) -> dict[str, str]:
    """Generate Web3 headers for outbound inter-service requests."""
    h = {
        "X-Internal-Token": INTERNAL_TOKEN,
        "X-Wallet-Timestamp": str(int(time.time())),
        "X-Web3-Protocol": "triumph-synergy/1.0",
        "X-Chain": "pi-network",
    }
    if public_key:
        h["X-Wallet-PublicKey"] = public_key
        h["X-Wallet-DID"] = f"did:pi:{public_key}"
    return h
