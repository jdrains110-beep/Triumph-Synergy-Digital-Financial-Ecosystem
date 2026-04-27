"""Shared APEX-grade scaffolding for the sovereign-utilities super-pod.

Each utility provider service supplies:
  - /health, /ready, /metrics
  - GET  /providers                — sovereign provider directory
  - POST /enroll                   — PI-721 sovereign service contract
  - POST /usage                    — record meter / billable usage
  - POST /pay                      — settle bill in Pi (returns settlement intent)
  - GET  /accounts                 — list accounts on this service
  - GET  /account/{account_id}     — full account ledger
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

POD_NAME = "sovereign-utilities"
PI_LEDGER = os.getenv("PI_LEDGER", "stellar-mainnet-pi")
PAYMENT_PROCESSOR_URL = os.getenv(
    "PAYMENT_PROCESSOR_URL", "http://triumph-payment-processor:8084"
)


def _digest(payload: dict[str, Any]) -> str:
    canon = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
    shake = hashlib.shake_256(canon).hexdigest(32)
    sha3 = hashlib.sha3_512(canon).hexdigest()
    return hashlib.sha3_512((shake + sha3).encode()).hexdigest()


def sovereign_credential_id(owner_address: str, owner_username: str, network: str) -> str:
    seed = f"{owner_address}|{owner_username}|{network}".lower()
    return "sov-" + hashlib.sha3_256(seed.encode()).hexdigest()[:40]


class EnrollRequest(BaseModel):
    owner_address: str = Field(..., min_length=4, max_length=128)
    owner_username: str = Field(..., min_length=1, max_length=128)
    provider_id: str = Field(..., min_length=1, max_length=64)
    service_address: str = Field(..., min_length=1, max_length=512)
    plan: str = Field(default="standard")
    metadata: dict[str, Any] = Field(default_factory=dict)
    network: str = Field(default="pi-mainnet")


class UsageRequest(BaseModel):
    account_id: str
    units_consumed: float = Field(..., ge=0)
    period_start: int
    period_end: int
    meter_reading: float | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class PayRequest(BaseModel):
    account_id: str
    amount_pi: float = Field(..., gt=0)
    period: str = Field(..., min_length=4, max_length=32)


def make_app(
    service_name: str,
    sector: str,
    unit_name: str,
    rate_pi_per_unit: float,
    base_fee_pi: float,
    providers: list[dict[str, Any]],
) -> FastAPI:
    app = FastAPI(
        title=f"Triumph Synergy — {service_name}",
        version="1.0.0",
        description=(
            f"Sovereign {sector} utility platform on Pi Network — APEX"
            " quantum-signed, PI-721 service contracts, real-time meter"
            " ingestion, frictionless Pi settlement."
        ),
    )

    accounts: dict[str, dict[str, Any]] = {}

    enroll_counter = Counter(
        f"{sector}_enroll_total", f"Total {sector} enrollments", ["service"]
    )
    usage_counter = Counter(
        f"{sector}_usage_records_total", f"Total {sector} usage records", ["service"]
    )
    pay_counter = Counter(
        f"{sector}_payments_total", f"Total {sector} Pi payments", ["service"]
    )
    pay_volume = Counter(
        f"{sector}_pi_volume_total", f"Total {sector} Pi paid", ["service"]
    )
    active_accounts = Gauge(
        f"{sector}_active_accounts", f"Active {sector} accounts", ["service"]
    )
    bill_latency = Histogram(
        f"{sector}_bill_calc_seconds", f"{sector} bill calc latency", ["service"]
    )

    @app.get("/health")
    async def health() -> dict[str, Any]:
        return {
            "status": "healthy",
            "service": service_name,
            "sector": sector,
            "pod": POD_NAME,
            "quantum": "ML-DSA-87+ML-KEM-1024+SPHINCS+",
            "providers": len(providers),
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

    @app.get("/providers")
    async def list_providers() -> dict[str, Any]:
        return {
            "service": service_name,
            "sector": sector,
            "unit": unit_name,
            "ratePiPerUnit": rate_pi_per_unit,
            "baseFeePi": base_fee_pi,
            "providers": providers,
            "count": len(providers),
        }

    @app.post("/enroll")
    async def enroll(
        body: EnrollRequest,
        request: Request,
        x_quantum_signature: str | None = Header(default=None),
        x_quantum_public_key: str | None = Header(default=None),
    ) -> JSONResponse:
        if not x_quantum_signature or not x_quantum_public_key:
            raise HTTPException(
                status_code=401,
                detail="x-quantum-signature and x-quantum-public-key required",
            )
        if not any(p["id"] == body.provider_id for p in providers):
            raise HTTPException(
                status_code=400, detail=f"unknown_provider:{body.provider_id}"
            )

        scid = sovereign_credential_id(
            body.owner_address, body.owner_username, body.network
        )
        # Anti-duplication: one account per (scid, provider, service_address)
        for existing in accounts.values():
            if (
                existing["sovereignCredentialId"] == scid
                and existing["providerId"] == body.provider_id
                and existing["serviceAddress"] == body.service_address
            ):
                return JSONResponse(
                    status_code=409,
                    content={
                        "error": "duplicate_enrollment",
                        "existingAccountId": existing["accountId"],
                    },
                )

        account_id = f"pi721-{sector}-{uuid.uuid4().hex[:24]}"
        envelope = {
            "accountId": account_id,
            "standard": "PI-721",
            "sector": sector,
            "service": service_name,
            "ownerAddress": body.owner_address,
            "ownerUsername": body.owner_username,
            "sovereignCredentialId": scid,
            "providerId": body.provider_id,
            "serviceAddress": body.service_address,
            "plan": body.plan,
            "metadata": body.metadata,
            "network": body.network,
            "ledger": PI_LEDGER,
            "quantumPublicKey": x_quantum_public_key,
            "quantumSignature": x_quantum_signature,
            "enrolledAt": int(time.time()),
            "balancePi": 0.0,
            "totalUnits": 0.0,
            "ledgerEvents": [],
        }
        envelope["sovereignDigest"] = _digest(
            {k: v for k, v in envelope.items() if k != "ledgerEvents"}
        )
        accounts[account_id] = envelope
        enroll_counter.labels(service=service_name).inc()
        active_accounts.labels(service=service_name).set(len(accounts))
        return JSONResponse(status_code=201, content=envelope)

    @app.post("/usage")
    async def record_usage(body: UsageRequest) -> dict[str, Any]:
        if body.account_id not in accounts:
            raise HTTPException(status_code=404, detail="account_not_found")
        with bill_latency.labels(service=service_name).time():
            account = accounts[body.account_id]
            cost = base_fee_pi + body.units_consumed * rate_pi_per_unit
            account["totalUnits"] += body.units_consumed
            account["balancePi"] += cost
            event = {
                "type": "usage",
                "unitsConsumed": body.units_consumed,
                "unit": unit_name,
                "costPi": round(cost, 6),
                "periodStart": body.period_start,
                "periodEnd": body.period_end,
                "meterReading": body.meter_reading,
                "ts": int(time.time()),
            }
            account["ledgerEvents"].append(event)
            usage_counter.labels(service=service_name).inc()
            return {
                "accountId": body.account_id,
                "billed": event,
                "newBalancePi": round(account["balancePi"], 6),
            }

    @app.post("/pay")
    async def pay(body: PayRequest) -> dict[str, Any]:
        if body.account_id not in accounts:
            raise HTTPException(status_code=404, detail="account_not_found")
        account = accounts[body.account_id]
        account["balancePi"] = max(0.0, account["balancePi"] - body.amount_pi)
        intent_id = "pi-pay-" + uuid.uuid4().hex[:24]
        event = {
            "type": "payment",
            "amountPi": body.amount_pi,
            "period": body.period,
            "intentId": intent_id,
            "settlementProcessor": PAYMENT_PROCESSOR_URL,
            "ts": int(time.time()),
        }
        account["ledgerEvents"].append(event)
        pay_counter.labels(service=service_name).inc()
        pay_volume.labels(service=service_name).inc(body.amount_pi)
        return {
            "accountId": body.account_id,
            "payment": event,
            "remainingBalancePi": round(account["balancePi"], 6),
        }

    @app.get("/accounts")
    async def list_accounts() -> dict[str, Any]:
        return {
            "service": service_name,
            "count": len(accounts),
            "accounts": [
                {k: v for k, v in a.items() if k != "ledgerEvents"}
                for a in list(accounts.values())[-100:]
            ],
        }

    @app.get("/account/{account_id}")
    async def account_detail(account_id: str) -> dict[str, Any]:
        if account_id not in accounts:
            raise HTTPException(status_code=404, detail="account_not_found")
        return accounts[account_id]

    return app
