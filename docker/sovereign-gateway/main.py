# Copyright (C) 2024-2026 Jeremiah Joel Drains, Founder & Superior Sovereign / Triumph Synergy. All rights reserved.
"""
Triumph Synergy — Sovereign Gateway Service

The universal entry point for ALL external systems connecting to the
Pi Network / Triumph Synergy ecosystem.  Banks, governments, payment
processors, and crypto networks attach HERE.

Pi is the base settlement layer.  USD and every other currency is derivative.
"""

import hashlib
import hmac
import json
import os
import time
import uuid
from datetime import datetime, timezone
from http.server import HTTPServer, BaseHTTPRequestHandler
from typing import Any

PORT = int(os.environ.get("PORT", "8097"))

# ── Pi Value Constants ──
PI_INTERNAL_VALUE = 314_159   # $314,159 per internally-mined Pi
PI_EXTERNAL_VALUE = 314.159   # $314.159 per external-market Pi
PI_MULTIPLIER = 1_000         # Internal = 1000× external

# ── Bridge Networks ──
BRIDGE_NETWORKS = {
    # Traditional finance — they attach to US
    "swift":    {"finality_s": 86400, "fee_bps": 15, "kyc": True,  "asset": "USD"},
    "ach":      {"finality_s": 7200,  "fee_bps": 10, "kyc": True,  "asset": "USD"},
    "fedwire":  {"finality_s": 3600,  "fee_bps": 5,  "kyc": True,  "asset": "USD"},
    "sepa":     {"finality_s": 3600,  "fee_bps": 8,  "kyc": True,  "asset": "EUR"},
    "chips":    {"finality_s": 1800,  "fee_bps": 3,  "kyc": True,  "asset": "USD"},
    "rtgs":     {"finality_s": 600,   "fee_bps": 5,  "kyc": True,  "asset": "USD"},
    # Crypto — interop bridges
    "ethereum":  {"finality_s": 15,  "fee_bps": 25, "kyc": False, "asset": "ETH"},
    "bitcoin":   {"finality_s": 600, "fee_bps": 30, "kyc": False, "asset": "BTC"},
    "solana":    {"finality_s": 1,   "fee_bps": 5,  "kyc": False, "asset": "SOL"},
    "polygon":   {"finality_s": 2,   "fee_bps": 5,  "kyc": False, "asset": "MATIC"},
    "avalanche": {"finality_s": 2,   "fee_bps": 8,  "kyc": False, "asset": "AVAX"},
    "cosmos":    {"finality_s": 6,   "fee_bps": 10, "kyc": False, "asset": "ATOM"},
    # Pi-native — sovereign layer
    "stellar":    {"finality_s": 5, "fee_bps": 0, "kyc": False, "asset": "XLM"},
    "pi-mainnet": {"finality_s": 5, "fee_bps": 0, "kyc": False, "asset": "PI"},
    "pi-testnet": {"finality_s": 5, "fee_bps": 0, "kyc": False, "asset": "PI_TEST"},
}

# ── Real-World Utility Sectors ──
UTILITY_SECTORS = [
    "banking", "real-estate", "commerce", "delivery", "travel",
    "education", "entertainment", "healthcare", "permits-licensing",
    "vehicles", "agriculture", "energy", "telecommunications",
    "insurance", "legal-judicial", "government-services",
    "supply-chain", "phygital-retail", "ubi-social-programs",
    "tokenized-assets",
]

# ── In-memory connector store ──
connectors: dict[str, dict] = {}
settlements: list[dict] = []
startup_time = datetime.now(timezone.utc)


class GatewayHandler(BaseHTTPRequestHandler):
    """HTTP handler for the Sovereign Gateway service."""

    def do_GET(self) -> None:
        if self.path == "/health":
            self._json(200, {
                "status": "healthy",
                "service": "sovereign-gateway",
                "uptime_s": (datetime.now(timezone.utc) - startup_time).total_seconds(),
                "connectors": len(connectors),
                "settlements": len(settlements),
                "bridges": len(BRIDGE_NETWORKS),
                "sectors": len(UTILITY_SECTORS),
            })
        elif self.path == "/bridges":
            self._json(200, {
                "bridges": [
                    {"network": k, **v} for k, v in BRIDGE_NETWORKS.items()
                ],
                "total": len(BRIDGE_NETWORKS),
            })
        elif self.path == "/reserve":
            self._json(200, {
                "protocol": "Triumph Synergy Global Reserve Protocol v1.0",
                "base_currency": "Pi Network",
                "internal_value_usd": PI_INTERNAL_VALUE,
                "external_value_usd": PI_EXTERNAL_VALUE,
                "multiplier": PI_MULTIPLIER,
                "sectors": UTILITY_SECTORS,
                "total_connectors": len(connectors),
                "total_settlements": len(settlements),
                "positioning": (
                    "Pi Network, powered by Triumph Synergy real-world utility, "
                    "is the sovereign global reserve. Every financial system "
                    "attaches to Pi to survive and maintain."
                ),
            })
        elif self.path == "/rates":
            rates = {
                "PI": 1,
                "USD": PI_EXTERNAL_VALUE,
                "EUR": PI_EXTERNAL_VALUE * 0.92,
                "GBP": PI_EXTERNAL_VALUE * 0.79,
                "JPY": PI_EXTERNAL_VALUE * 154.5,
                "CNY": PI_EXTERNAL_VALUE * 7.24,
                "BTC": PI_EXTERNAL_VALUE / 67_000,
                "ETH": PI_EXTERNAL_VALUE / 3_200,
                "XLM": PI_EXTERNAL_VALUE / 0.12,
            }
            self._json(200, {
                "base": "PI",
                "note": "All rates expressed as: 1 Pi = X units of quote currency",
                "rates": rates,
            })
        else:
            self._json(404, {"error": "Not found"})

    def do_POST(self) -> None:
        body = self._read_body()

        if self.path == "/connect":
            self._handle_connect(body)
        elif self.path == "/settle":
            self._handle_settle(body)
        elif self.path == "/bridge":
            self._handle_bridge(body)
        else:
            self._json(404, {"error": "Not found"})

    # ── Handlers ──

    def _handle_connect(self, body: dict) -> None:
        name = body.get("name")
        tier = body.get("tier", "commercial")
        webhook_url = body.get("webhookUrl", "")
        supported = body.get("supportedCurrencies", ["PI", "USD"])

        if not name:
            return self._json(400, {"error": "name is required"})

        connector_id = str(uuid.uuid4())
        hmac_secret = hashlib.sha256(os.urandom(32)).hexdigest()

        caps = {
            "sovereign": float("inf"),
            "institutional": 100_000_000,
            "enterprise": 10_000_000,
            "commercial": 1_000_000,
            "individual": 100_000,
        }

        connector = {
            "id": connector_id,
            "name": name,
            "tier": tier,
            "status": "active" if tier == "sovereign" else "pending_verification",
            "supportedCurrencies": supported,
            "dailySettlementCap": caps.get(tier, 1_000_000),
            "dailyVolumeUsed": 0,
            "webhookUrl": webhook_url,
            "registeredAt": datetime.now(timezone.utc).isoformat(),
            "totalLifetimeVolume": 0,
        }

        connectors[connector_id] = connector

        self._json(201, {
            "success": True,
            "connector": connector,
            "hmacSecret": hmac_secret,
            "message": "Store the hmacSecret securely. It will not be shown again.",
        })

    def _handle_settle(self, body: dict) -> None:
        connector_id = body.get("connectorId")
        amount_pi = body.get("amountPi", 0)
        target = body.get("targetCurrency", "USD")

        if not connector_id or amount_pi <= 0:
            return self._json(400, {"error": "connectorId and positive amountPi required"})

        connector = connectors.get(connector_id)
        if not connector or connector["status"] != "active":
            return self._json(422, {"error": "Connector not found or inactive"})

        rate = PI_EXTERNAL_VALUE
        amount_target = amount_pi * rate

        settlement = {
            "id": str(uuid.uuid4()),
            "connectorId": connector_id,
            "amountPi": amount_pi,
            "amountTarget": amount_target,
            "targetCurrency": target,
            "exchangeRate": rate,
            "status": "settled",
            "settledAt": datetime.now(timezone.utc).isoformat(),
        }

        settlements.append(settlement)
        connector["dailyVolumeUsed"] += amount_pi
        connector["totalLifetimeVolume"] += amount_pi

        self._json(200, {"success": True, "settlement": settlement})

    def _handle_bridge(self, body: dict) -> None:
        network = body.get("network")
        amount_pi = body.get("amountPi", 0)
        sender = body.get("senderAddress", "")
        recipient = body.get("recipientAddress", "")

        if not network or amount_pi <= 0 or not sender or not recipient:
            return self._json(400, {"error": "network, amountPi, senderAddress, recipientAddress required"})

        bridge = BRIDGE_NETWORKS.get(network)
        if not bridge:
            return self._json(422, {"error": f"Bridge not configured: {network}"})

        fee_pi = (amount_pi * bridge["fee_bps"]) / 10_000
        net_pi = amount_pi - fee_pi

        tx = {
            "id": str(uuid.uuid4()),
            "network": network,
            "amountPi": amount_pi,
            "feePi": fee_pi,
            "netPi": net_pi,
            "externalAsset": bridge["asset"],
            "exchangeRate": PI_EXTERNAL_VALUE,
            "amountExternal": net_pi * PI_EXTERNAL_VALUE,
            "status": "pending",
            "createdAt": datetime.now(timezone.utc).isoformat(),
        }

        self._json(200, {"success": True, "transaction": tx})

    # ── Utilities ──

    def _read_body(self) -> dict:
        length = int(self.headers.get("Content-Length", 0))
        if length == 0:
            return {}
        raw = self.rfile.read(length)
        return json.loads(raw)

    def _json(self, code: int, data: Any) -> None:
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("X-Powered-By", "Triumph-Synergy-Pi-Network")
        self.send_header("X-Reserve-Currency", "Pi")
        self.end_headers()
        self.wfile.write(json.dumps(data, default=str).encode())

    def log_message(self, fmt: str, *args: Any) -> None:
        ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        print(f"[{ts}] [sovereign-gateway] {fmt % args}")


def main() -> None:
    print(f"╔══════════════════════════════════════════════════════════════╗")
    print(f"║   TRIUMPH SYNERGY — SOVEREIGN GATEWAY                      ║")
    print(f"║   Pi Network: Global Reserve Currency & Settlement Layer    ║")
    print(f"║   Real-World Utility: {len(UTILITY_SECTORS)} sectors | "
          f"Bridges: {len(BRIDGE_NETWORKS)} networks    ║")
    print(f"║   Port: {PORT}                                               ║")
    print(f"╚══════════════════════════════════════════════════════════════╝")

    server = HTTPServer(("0.0.0.0", PORT), GatewayHandler)
    server.serve_forever()


if __name__ == "__main__":
    main()
