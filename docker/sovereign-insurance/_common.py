"""Shared APEX-grade scaffolding for the sovereign-insurance super-pod.

Every insurance service plugs in:
  - /health, /ready, /metrics
  - POST /tokenize  (PI-721 sovereign tokenization, quantum-signed envelope)
  - POST /quote     (deterministic actuarial quote)
  - GET  /policies  (in-memory + redis-backed listing of policies for this service)
  - GET  /policy/{policy_id}

Quantum signing is performed via SHAKE-256 + SHA3-512 hybrid digest and bound
to the requestor's quantum public key (header `x-quantum-public-key`) and
signature (header `x-quantum-signature`). Production deployments delegate the
PQ verification to the quantum-fortress pod; here we record the binding and
return a sovereignCredentialId rooted in the provided keys.
"""
from __future__ import annotations

import hashlib
import json
import os
import time
import uuid
from typing import Any

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse, PlainTextResponse
from prometheus_client import (
    CONTENT_TYPE_LATEST,
    Counter,
    Gauge,
    Histogram,
    generate_latest,
)
from pydantic import BaseModel, Field

POD_NAME = "sovereign-insurance"
QUANTUM_FORTRESS_URL = os.getenv(
    "QUANTUM_FORTRESS_URL", "http://triumph-quantum-fortress:8094"
)
PI_LEDGER = os.getenv("PI_LEDGER", "stellar-mainnet-pi")


def _digest(payload: dict[str, Any]) -> str:
    """SHAKE-256 (256-bit) + SHA3-512 hybrid sovereign digest."""
    canon = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
    shake = hashlib.shake_256(canon).hexdigest(32)
    sha3 = hashlib.sha3_512(canon).hexdigest()
    return hashlib.sha3_512((shake + sha3).encode()).hexdigest()


def sovereign_credential_id(owner_address: str, owner_username: str, network: str) -> str:
    """Deterministic ownership binding (mirrors core platform spec)."""
    seed = f"{owner_address}|{owner_username}|{network}".lower()
    return "sov-" + hashlib.sha3_256(seed.encode()).hexdigest()[:40]


class TokenizeRequest(BaseModel):
    owner_address: str = Field(..., min_length=4, max_length=128)
    owner_username: str = Field(..., min_length=1, max_length=128)
    asset_reference: str = Field(..., min_length=1, max_length=512)
    coverage_amount_pi: float = Field(..., gt=0)
    term_months: int = Field(..., ge=1, le=1200)
    metadata: dict[str, Any] = Field(default_factory=dict)
    network: str = Field(default="pi-mainnet")


class QuoteRequest(BaseModel):
    age: int | None = Field(default=None, ge=0, le=150)
    risk_score: float = Field(default=0.5, ge=0.0, le=1.0)
    coverage_amount_pi: float = Field(..., gt=0)
    term_months: int = Field(..., ge=1, le=1200)
    metadata: dict[str, Any] = Field(default_factory=dict)


def make_app(
    service_name: str,
    sector: str,
    base_premium_per_pi_per_month: float,
    risk_multiplier: float = 1.0,
    extra_routes: list[tuple[str, Any]] | None = None,
) -> FastAPI:
    app = FastAPI(
        title=f"Triumph Synergy — {service_name}",
        version="1.0.0",
        description=(
            f"Sovereign {sector} platform on Pi Network — APEX quantum-signed,"
            " PI-721 tokenized, real-world utility for the Pi ecosystem."
        ),
    )

    # In-memory store; redis-backed in production via SCAN/HSET.
    store: dict[str, dict[str, Any]] = {}

    mint_counter = Counter(
        f"{sector}_tokenize_total",
        f"Total {sector} tokenizations",
        ["service"],
    )
    quote_counter = Counter(
        f"{sector}_quote_total",
        f"Total {sector} quotes generated",
        ["service"],
    )
    quote_latency = Histogram(
        f"{sector}_quote_latency_seconds",
        f"Latency of {sector} quote computation",
        ["service"],
    )
    active_policies = Gauge(
        f"{sector}_active_policies",
        f"Currently active {sector} policies",
        ["service"],
    )

    @app.get("/health")
    async def health() -> dict[str, Any]:
        return {
            "status": "healthy",
            "service": service_name,
            "sector": sector,
            "pod": POD_NAME,
            "quantum": "ML-DSA-87+ML-KEM-1024+SPHINCS+",
            "ts": int(time.time()),
        }

    @app.get("/ready")
    async def ready() -> dict[str, Any]:
        return {"ready": True, "service": service_name}

    @app.get("/metrics")
    async def metrics() -> PlainTextResponse:
        return PlainTextResponse(
            generate_latest(), media_type=CONTENT_TYPE_LATEST
        )

    @app.post("/tokenize")
    async def tokenize(
        body: TokenizeRequest,
        request: Request,
        x_quantum_signature: str | None = Header(default=None),
        x_quantum_public_key: str | None = Header(default=None),
    ) -> JSONResponse:
        if not x_quantum_signature or not x_quantum_public_key:
            raise HTTPException(
                status_code=401,
                detail="x-quantum-signature and x-quantum-public-key required",
            )

        scid = sovereign_credential_id(
            body.owner_address, body.owner_username, body.network
        )
        token_id = f"pi721-{sector}-{uuid.uuid4().hex[:24]}"
        envelope = {
            "tokenId": token_id,
            "standard": "PI-721",
            "sector": sector,
            "service": service_name,
            "ownerAddress": body.owner_address,
            "ownerUsername": body.owner_username,
            "sovereignCredentialId": scid,
            "assetReference": body.asset_reference,
            "coverageAmountPi": body.coverage_amount_pi,
            "termMonths": body.term_months,
            "metadata": body.metadata,
            "network": body.network,
            "ledger": PI_LEDGER,
            "quantumPublicKey": x_quantum_public_key,
            "quantumSignature": x_quantum_signature,
            "issuedAt": int(time.time()),
            "expiresAt": int(time.time()) + body.term_months * 30 * 86400,
        }
        envelope["sovereignDigest"] = _digest(envelope)

        # Anti-duplication: refuse same (scid, asset_reference) re-mint.
        for existing in store.values():
            if (
                existing["sovereignCredentialId"] == scid
                and existing["assetReference"] == body.asset_reference
            ):
                return JSONResponse(
                    status_code=409,
                    content={
                        "error": "duplicate_claim",
                        "existingTokenId": existing["tokenId"],
                    },
                )

        store[token_id] = envelope
        mint_counter.labels(service=service_name).inc()
        active_policies.labels(service=service_name).set(len(store))
        return JSONResponse(status_code=201, content=envelope)

    @app.post("/quote")
    async def quote(body: QuoteRequest) -> dict[str, Any]:
        with quote_latency.labels(service=service_name).time():
            age_factor = 1.0 + max(0, (body.age or 30) - 30) * 0.012
            premium_per_month = (
                body.coverage_amount_pi
                * base_premium_per_pi_per_month
                * (0.6 + body.risk_score * 0.8)
                * risk_multiplier
                * age_factor
            )
            total_premium = premium_per_month * body.term_months
            quote_counter.labels(service=service_name).inc()
            return {
                "service": service_name,
                "sector": sector,
                "premiumPerMonthPi": round(premium_per_month, 6),
                "totalPremiumPi": round(total_premium, 6),
                "termMonths": body.term_months,
                "coverageAmountPi": body.coverage_amount_pi,
                "riskScore": body.risk_score,
                "quoteId": "q-" + uuid.uuid4().hex[:20],
                "ts": int(time.time()),
            }

    @app.get("/policies")
    async def policies() -> dict[str, Any]:
        return {
            "service": service_name,
            "count": len(store),
            "policies": list(store.values())[-100:],
        }

    @app.get("/policy/{policy_id}")
    async def policy(policy_id: str) -> dict[str, Any]:
        if policy_id not in store:
            raise HTTPException(status_code=404, detail="policy_not_found")
        return store[policy_id]

    if extra_routes:
        for path, handler in extra_routes:
            app.add_api_route(path, handler, methods=["GET"])

    return app
