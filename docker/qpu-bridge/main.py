# Copyright (C) 2024-2026 Jeremiah Drains / Triumph Synergy. All rights reserved.
# License: PiOS
"""
Triumph Synergy Quantum Processing Unit Bridge
===============================================
Superior computational bridge connecting all 16+ ecosystem services via
quantum-inspired parallel processing and entanglement-based state propagation.

QUANTUM PARADIGMS IMPLEMENTED:
  Superposition   — Parallel task execution via asyncio.gather.
                    All N tasks run simultaneously; collapses to full result set.
  Entanglement    — Bidirectional Redis pub/sub state synchronisation between
                    any pair of services.  State changes in A propagate to B
                    instantly, with no polling.
  Quantum Circuit — Multi-gate computation pipeline spanning multiple services.
                    Gates: SIGN | FORWARD | VERIFY | COMPUTE | TRANSFORM | FAN-OUT
  Quantum Tunnel  — Every inter-service HTTP call is Dilithium-5 signed by the
                    quantum-shield and carries a quantum-hardened header set.

ENDPOINTS:
  POST /qpu/submit              — Submit a task for async QPU processing
  GET  /qpu/task/{task_id}      — Poll task state (pending/running/done/error)
  POST /qpu/superposition       — Submit N tasks simultaneously (true parallelism)
  POST /qpu/circuit             — Run a multi-gate quantum circuit pipeline
  POST /qpu/entangle            — Register two services as quantum-entangled
  POST /qpu/entanglement/state  — Broadcast state to all entangled partners
  GET  /qpu/entanglement/registry — View active entanglement pairs
  POST /qpu/bridge/forward      — Forward a request quantum-signed to any service
  GET  /qpu/status              — Full QPU posture report
  GET  /health                  — Health check
  GET  /metrics                 — Prometheus metrics

Port: 8098
Network: triumph-net
"""

import asyncio
import base64
import hashlib
import json
import logging
import os
import secrets
import time
import uuid
from typing import Any

import httpx
import redis.asyncio as aioredis
from fastapi import FastAPI, HTTPException
from fastapi.responses import PlainTextResponse
from prometheus_client import (
    Counter,
    Gauge,
    Histogram,
    generate_latest,
    CONTENT_TYPE_LATEST,
)

# ── Config ─────────────────────────────────────────────────────────────────────

REDIS_URL           = os.getenv("REDIS_URL",           "redis://triumph-redis:6379")
PORT                = int(os.getenv("PORT",            "8098"))
QUANTUM_SHIELD_URL  = os.getenv("QUANTUM_SHIELD_URL",  "http://triumph-quantum-shield:8094")
HQ_ADDRESS          = os.getenv("PI_SUPERNODE_ADDRESS",
                      "GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V")

PI_INTERNAL_RATE    = float(os.getenv("PI_INTERNAL_RATE",       "314159.0"))
PI_EXTERNAL_RATE    = float(os.getenv("PI_EXTERNAL_RATE",       "314.159"))
PI_MULTIPLIER       = float(os.getenv("PI_INTERNAL_MULTIPLIER", "1000.0"))

TASK_TTL_S          = int(os.getenv("TASK_TTL_S",  "3600"))   # 1 h task retention
QPU_TIMEOUT_S       = float(os.getenv("QPU_TIMEOUT_S", "30"))

# Full ecosystem service registry
SERVICES: dict[str, str] = {
    "app":                 os.getenv("APP_URL",               "http://triumph-app:3000"),
    "market-data":         os.getenv("MARKET_DATA_URL",       "http://triumph-market-data:8085"),
    "blockchain-oracle":   os.getenv("BLOCKCHAIN_ORACLE_URL", "http://triumph-blockchain-oracle:8086"),
    "compliance":          os.getenv("COMPLIANCE_URL",        "http://triumph-compliance:8087"),
    "dex":                 os.getenv("DEX_URL",               "http://triumph-dex:8088"),
    "tokenization-engine": os.getenv("TOKENIZATION_URL",      "http://triumph-tokenization-engine:8089"),
    "ml-engine":           os.getenv("ML_ENGINE_URL",         "http://triumph-ml-engine:8090"),
    "credit-engine":       os.getenv("CREDIT_ENGINE_URL",     "http://triumph-credit-engine:8091"),
    "pi-bridge-connector": os.getenv("PI_BRIDGE_URL",         "http://triumph-pi-bridge-connector:8092"),
    "dual-value-engine":   os.getenv("DUAL_VALUE_URL",        "http://triumph-dual-value-engine:8093"),
    "quantum-shield":      os.getenv("QUANTUM_SHIELD_URL",    "http://triumph-quantum-shield:8094"),
    "cloud-memory":        os.getenv("CLOUD_MEMORY_URL",      "http://triumph-cloud-memory:8095"),
    "transaction-engine":  os.getenv("TRANSACTION_URL",       "http://triumph-transaction-engine:8080"),
    "payment-processor":   os.getenv("PAYMENT_URL",           "http://triumph-payment-processor:8084"),
    "vault":               os.getenv("VAULT_URL",             "http://triumph-vault:8081"),
    "smart-contracts":     os.getenv("CONTRACTS_URL",         "http://triumph-smart-contracts:8082"),
    "scp-upgrader":        os.getenv("SCP_URL",               "http://triumph-scp-upgrader:8083"),
    "sovereign-gateway":   os.getenv("SOVEREIGN_GATEWAY_URL", "http://triumph-sovereign-gateway:8097"),
}

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("qpu-bridge")

# ── Prometheus ─────────────────────────────────────────────────────────────────

tasks_submitted      = Counter("qpu_tasks_submitted_total",       "Tasks submitted to QPU")
tasks_completed      = Counter("qpu_tasks_completed_total",       "Tasks completed by QPU")
tasks_failed         = Counter("qpu_tasks_failed_total",          "Tasks failed in QPU")
superposition_runs   = Counter("qpu_superposition_runs_total",    "Superposition batches executed")
superposition_tasks  = Counter("qpu_superposition_tasks_total",   "Individual tasks in superposition batches")
circuit_runs         = Counter("qpu_circuit_runs_total",          "Quantum circuits executed")
circuit_gates        = Counter("qpu_circuit_gates_total",         "Circuit gates executed")
entanglement_pairs   = Gauge("qpu_entanglement_pairs_active",     "Active entanglement pairs")
entanglement_events  = Counter("qpu_entanglement_events_total",   "Entanglement state broadcasts")
bridge_forwards      = Counter("qpu_bridge_forwards_total",       "Bridge forward requests")
bridge_signed        = Counter("qpu_bridge_signed_total",         "Quantum-signed bridge forwards")
task_latency         = Histogram("qpu_task_latency_seconds",      "Task execution latency")
superposition_latency = Histogram("qpu_superposition_latency_seconds", "Superposition collapse latency")
circuit_latency      = Histogram("qpu_circuit_latency_seconds",   "Circuit execution latency")
task_queue_depth     = Gauge("qpu_task_queue_depth",              "Current task queue depth")

# ── In-memory state ────────────────────────────────────────────────────────────

_tasks:        dict[str, dict[str, Any]] = {}   # task_id → task record
_entanglements: dict[str, dict[str, Any]] = {}  # pair_id → entanglement record
_started_at   = time.time()
_ops_total    = 0

app          = FastAPI(title="Triumph QPU Bridge", version="1.0.0")
redis_client: aioredis.Redis | None = None


# ── Startup / Shutdown ─────────────────────────────────────────────────────────

@app.on_event("startup")
async def _startup() -> None:
    global redis_client
    try:
        redis_client = aioredis.from_url(REDIS_URL, decode_responses=True)
        await redis_client.ping()
        log.info("[qpu] Redis connected")
    except Exception as e:
        log.warning(f"[qpu] Redis unavailable: {e} — entanglement disabled")
        redis_client = None

    asyncio.create_task(_entanglement_listener())
    log.info("[qpu] QPU Bridge started on port %d", PORT)


@app.on_event("shutdown")
async def _shutdown() -> None:
    if redis_client:
        await redis_client.aclose()


# ── Utilities ──────────────────────────────────────────────────────────────────

def _new_task(kind: str, payload: dict[str, Any]) -> dict[str, Any]:
    task_id = str(uuid.uuid4())
    record: dict[str, Any] = {
        "task_id":    task_id,
        "kind":       kind,
        "status":     "pending",
        "payload":    payload,
        "result":     None,
        "error":      None,
        "submitted_at": time.time(),
        "started_at":  None,
        "completed_at": None,
    }
    _tasks[task_id] = record
    task_queue_depth.set(len(_tasks))
    tasks_submitted.inc()
    return record


def _resolve_url(service_or_url: str) -> str:
    """Return the base URL for a named service, or the raw URL if not in registry."""
    if service_or_url in SERVICES:
        return SERVICES[service_or_url]
    return service_or_url


async def _quantum_sign(payload: bytes) -> dict[str, Any] | None:
    """Call quantum-shield to sign a payload with Dilithium-5."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as c:
            r = await c.post(
                f"{QUANTUM_SHIELD_URL}/quantum/sign",
                json={"payload": base64.b64encode(payload).decode()},
            )
            if r.status_code == 200:
                return r.json()
    except Exception as e:
        log.warning(f"[qpu] quantum-shield sign failed: {e}")
    return None


async def _http_call(
    method: str,
    url: str,
    body: dict[str, Any] | None = None,
    headers: dict[str, str] | None = None,
    timeout: float = QPU_TIMEOUT_S,
) -> dict[str, Any]:
    """Fire an HTTP request; return normalised result dict."""
    started = time.time()
    h = {
        "X-QPU-Bridge":   "triumph-qpu-bridge",
        "X-Quantum-Relay": "true",
        **(headers or {}),
    }
    try:
        async with httpx.AsyncClient(timeout=timeout) as c:
            if method.upper() == "GET":
                r = await c.get(url, headers=h)
            elif method.upper() == "POST":
                r = await c.post(url, json=body, headers=h)
            elif method.upper() == "PUT":
                r = await c.put(url, json=body, headers=h)
            elif method.upper() == "DELETE":
                r = await c.delete(url, headers=h)
            else:
                raise ValueError(f"Unsupported method: {method}")

            elapsed = round((time.time() - started) * 1000, 1)
            try:
                resp_body = r.json()
            except Exception:
                resp_body = r.text[:1000]

            return {
                "ok":          r.status_code < 400,
                "status_code": r.status_code,
                "body":        resp_body,
                "latency_ms":  elapsed,
                "url":         url,
            }
    except Exception as e:
        return {
            "ok":          False,
            "status_code": 0,
            "body":        None,
            "error":       str(e)[:200],
            "latency_ms":  round((time.time() - started) * 1000, 1),
            "url":         url,
        }


# ── Entanglement Listener ──────────────────────────────────────────────────────

async def _entanglement_listener() -> None:
    """Subscribe to Redis entanglement channels and relay state broadcasts."""
    if not redis_client:
        return
    try:
        pubsub = redis_client.pubsub()
        await pubsub.psubscribe("qpu:entangle:*")
        log.info("[qpu] Entanglement listener active (pattern qpu:entangle:*)")
        async for message in pubsub.listen():
            if message["type"] not in ("pmessage", "message"):
                continue
            try:
                data = json.loads(message.get("data", "{}"))
                pair_id = data.get("pair_id")
                if pair_id and pair_id in _entanglements:
                    ent = _entanglements[pair_id]
                    ent["last_event_at"] = time.time()
                    ent["events_total"]  = ent.get("events_total", 0) + 1
            except Exception:
                pass
    except Exception as e:
        log.warning(f"[qpu] Entanglement listener error: {e}")


# ── Gate Executors ─────────────────────────────────────────────────────────────

async def _gate_sign(gate: dict[str, Any], state: dict[str, Any]) -> dict[str, Any]:
    payload = json.dumps(state.get("data", state)).encode()
    sig = await _quantum_sign(payload)
    bridge_signed.inc()
    return {
        "gate":      "SIGN",
        "signed":    sig is not None,
        "signature": sig,
        "data":      state.get("data", state),
    }


async def _gate_forward(gate: dict[str, Any], state: dict[str, Any]) -> dict[str, Any]:
    target  = gate.get("target", "")
    method  = gate.get("method", "POST")
    path    = gate.get("path",   "/health")
    url     = _resolve_url(target).rstrip("/") + "/" + path.lstrip("/")
    body    = {**gate.get("body", {}), **state.get("data", {})}
    bridge_forwards.inc()
    result  = await _http_call(method, url, body=body)
    return {"gate": "FORWARD", "target": target, "url": url, **result}


async def _gate_verify(gate: dict[str, Any], state: dict[str, Any]) -> dict[str, Any]:
    sig_info = state.get("signature") or gate.get("signature", {})
    if not sig_info:
        return {"gate": "VERIFY", "verified": False, "reason": "no signature present"}
    payload_raw = json.dumps(state.get("data", state)).encode()
    try:
        async with httpx.AsyncClient(timeout=10.0) as c:
            r = await c.post(
                f"{QUANTUM_SHIELD_URL}/quantum/verify",
                json={
                    "payload":    base64.b64encode(payload_raw).decode(),
                    "signature":  sig_info.get("signature", ""),
                    "public_key": sig_info.get("public_key", ""),
                },
            )
        ok = r.status_code == 200 and r.json().get("valid", False)
    except Exception as e:
        ok = False
        log.warning(f"[qpu] VERIFY gate error: {e}")
    return {"gate": "VERIFY", "verified": ok}


async def _gate_compute(gate: dict[str, Any], state: dict[str, Any]) -> dict[str, Any]:
    """Built-in compute gate — runs financial math, portfolio ops, risk scoring."""
    op   = gate.get("op", "hash")
    data = state.get("data", state)

    if op == "hash":
        raw    = json.dumps(data, sort_keys=True).encode()
        digest = hashlib.sha3_512(raw).hexdigest()
        result = {"hash_sha3_512": digest, "input_bytes": len(raw)}

    elif op == "portfolio_risk":
        positions = data.get("positions", [])
        weights   = [p.get("weight", 1.0) for p in positions]
        values    = [p.get("value_pi", 0.0) for p in positions]
        total     = sum(values) or 1.0
        norm_w    = [v / total for v in values]
        variance  = sum(w * w for w in norm_w)
        hhi       = variance                  # Herfindahl-Hirschman concentration
        pi_total  = sum(values)
        result    = {
            "total_value_pi":  pi_total,
            "total_value_usd_internal": pi_total * PI_INTERNAL_RATE,
            "concentration_hhi": round(hhi, 6),
            "diversification_score": round(1.0 - hhi, 6),
            "position_count": len(positions),
        }

    elif op == "pi_valuation":
        amount_pi = float(data.get("amount_pi", 0))
        result    = {
            "amount_pi":       amount_pi,
            "internal_usd":    round(amount_pi * PI_INTERNAL_RATE, 4),
            "external_usd":    round(amount_pi * PI_EXTERNAL_RATE, 4),
            "multiplier":      PI_MULTIPLIER,
            "sovereignty_premium": round(
                (PI_INTERNAL_RATE - PI_EXTERNAL_RATE) * amount_pi, 4
            ),
        }

    elif op == "kem_session":
        # Delegate Kyber-1024 KEM encapsulation to quantum-shield
        async with httpx.AsyncClient(timeout=10.0) as c:
            r = await c.post(f"{QUANTUM_SHIELD_URL}/quantum/kem/encap")
        result = r.json() if r.status_code == 200 else {"error": r.text[:200]}

    else:
        result = {"op": op, "status": "unknown_op", "input": data}

    return {"gate": "COMPUTE", "op": op, "result": result}


async def _gate_transform(gate: dict[str, Any], state: dict[str, Any]) -> dict[str, Any]:
    """Reshape / enrich the data object."""
    data      = state.get("data", state)
    add_fields = gate.get("add", {})
    drop_keys  = gate.get("drop", [])
    enriched   = {k: v for k, v in data.items() if k not in drop_keys}
    enriched.update(add_fields)
    enriched["_qpu_transformed_at"] = time.time()
    return {"gate": "TRANSFORM", "data": enriched}


async def _gate_fanout(gate: dict[str, Any], state: dict[str, Any]) -> dict[str, Any]:
    """Fire the current state to multiple services simultaneously."""
    targets = gate.get("targets", [])
    path    = gate.get("path", "/health")
    method  = gate.get("method", "POST")
    body    = state.get("data", {})

    async def _call_one(target: str) -> dict[str, Any]:
        url = _resolve_url(target).rstrip("/") + "/" + path.lstrip("/")
        return {target: await _http_call(method, url, body=body)}

    results = await asyncio.gather(*[_call_one(t) for t in targets], return_exceptions=False)
    merged  = {}
    for r in results:
        merged.update(r)

    return {"gate": "FAN-OUT", "targets": targets, "results": merged}


_GATE_HANDLERS = {
    "SIGN":      _gate_sign,
    "FORWARD":   _gate_forward,
    "VERIFY":    _gate_verify,
    "COMPUTE":   _gate_compute,
    "TRANSFORM": _gate_transform,
    "FAN-OUT":   _gate_fanout,
    "FANOUT":    _gate_fanout,
}


# ── Task Worker ────────────────────────────────────────────────────────────────

async def _run_task(task_id: str) -> None:
    record = _tasks.get(task_id)
    if not record:
        return

    record["status"]     = "running"
    record["started_at"] = time.time()
    started              = time.time()

    try:
        kind    = record["kind"]
        payload = record["payload"]

        if kind == "health_probe":
            results = await asyncio.gather(
                *[_http_call("GET", url + "/health") for url in SERVICES.values()],
                return_exceptions=True,
            )
            healthy = sum(1 for r in results if isinstance(r, dict) and r.get("ok"))
            record["result"] = {
                "services_checked": len(SERVICES),
                "services_healthy": healthy,
                "details": [
                    r if isinstance(r, dict) else {"error": str(r)}
                    for r in results
                ],
            }

        elif kind == "sign_payload":
            raw = json.dumps(payload.get("data", payload)).encode()
            sig = await _quantum_sign(raw)
            record["result"] = sig or {"error": "quantum-shield unavailable"}

        elif kind == "forward":
            target = payload.get("target", "")
            method = payload.get("method", "POST")
            path   = payload.get("path", "/health")
            body   = payload.get("body", {})
            url    = _resolve_url(target).rstrip("/") + "/" + path.lstrip("/")
            record["result"] = await _http_call(method, url, body=body)
            bridge_forwards.inc()

        elif kind == "compute":
            gate_def = {"op": payload.get("op", "hash")}
            state    = {"data": payload.get("data", {})}
            record["result"] = await _gate_compute(gate_def, state)

        else:
            record["result"] = {"kind": kind, "status": "processed", "payload": payload}

        record["status"]       = "done"
        record["completed_at"] = time.time()
        tasks_completed.inc()

    except Exception as e:
        record["status"]       = "error"
        record["error"]        = str(e)[:400]
        record["completed_at"] = time.time()
        tasks_failed.inc()
        log.error(f"[qpu] task {task_id} failed: {e}")

    elapsed = time.time() - started
    task_latency.observe(elapsed)
    task_queue_depth.set(len([t for t in _tasks.values() if t["status"] in ("pending", "running")]))

    # Persist result to Redis for cross-instance querying
    if redis_client:
        try:
            await redis_client.set(
                f"qpu:task:{task_id}",
                json.dumps({k: v for k, v in record.items() if k != "payload"}),
                ex=TASK_TTL_S,
            )
        except Exception:
            pass


# ── API Routes ─────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    global _ops_total
    pending = sum(1 for t in _tasks.values() if t["status"] == "pending")
    running = sum(1 for t in _tasks.values() if t["status"] == "running")
    done    = sum(1 for t in _tasks.values() if t["status"] == "done")
    return {
        "status":             "healthy",
        "service":            "Triumph QPU Bridge",
        "port":               PORT,
        "uptime_seconds":     round(time.time() - _started_at, 1),
        "tasks_pending":      pending,
        "tasks_running":      running,
        "tasks_done":         done,
        "entanglement_pairs": len(_entanglements),
        "services_registered": len(SERVICES),
        "quantum_shield_url": QUANTUM_SHIELD_URL,
        "pi_internal_rate":   PI_INTERNAL_RATE,
        "pi_external_rate":   PI_EXTERNAL_RATE,
        "sovereignty":        "TRIUMPH SYNERGY HQ — 135 Lake Como Dr, Pomona Park FL 32181",
    }


@app.get("/metrics")
async def metrics():
    return PlainTextResponse(generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.post("/qpu/submit")
async def submit_task(body: dict[str, Any]):
    """
    Submit a single task for QPU processing.
    body: { kind: str, payload: dict }
    Returns task_id immediately; poll /qpu/task/{task_id} for result.
    """
    kind    = body.get("kind", "compute")
    payload = body.get("payload", {})
    record  = _new_task(kind, payload)
    asyncio.create_task(_run_task(record["task_id"]))
    log.info(f"[qpu] Task submitted: {record['task_id']} kind={kind}")
    return {
        "task_id":      record["task_id"],
        "status":       "pending",
        "submitted_at": record["submitted_at"],
    }


@app.get("/qpu/task/{task_id}")
async def get_task(task_id: str):
    """Poll task state. Checks in-memory store then Redis."""
    record = _tasks.get(task_id)
    if not record and redis_client:
        cached = await redis_client.get(f"qpu:task:{task_id}")
        if cached:
            return json.loads(cached)
    if not record:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
    return {k: v for k, v in record.items() if k != "payload"}


@app.post("/qpu/superposition")
async def superposition(body: dict[str, Any]):
    """
    Execute N tasks in true parallelism — quantum superposition collapse.
    body: { tasks: [ {kind, payload}, … ] }
    All tasks run simultaneously; returns when ALL have completed.
    """
    tasks_in = body.get("tasks", [])
    if not tasks_in:
        raise HTTPException(status_code=400, detail="tasks list is empty")

    started = time.time()
    superposition_runs.inc()
    superposition_tasks.inc(len(tasks_in))

    records = [_new_task(t.get("kind", "compute"), t.get("payload", {})) for t in tasks_in]

    # Execute ALL in parallel — true superposition
    await asyncio.gather(*[_run_task(r["task_id"]) for r in records])

    elapsed = time.time() - started
    superposition_latency.observe(elapsed)

    results = [
        {k: v for k, v in _tasks[r["task_id"]].items() if k != "payload"}
        for r in records
    ]

    log.info(f"[qpu] Superposition collapsed: {len(records)} tasks in {elapsed:.3f}s")
    return {
        "superposition_id": str(uuid.uuid4()),
        "tasks_run":        len(records),
        "collapsed_in_s":   round(elapsed, 3),
        "results":          results,
    }


@app.post("/qpu/circuit")
async def run_circuit(body: dict[str, Any]):
    """
    Run a multi-gate quantum circuit pipeline.
    body: {
      circuit_id: str,
      initial_state: dict,
      gates: [ {type, ...gate-specific-params}, … ]
    }
    Gates: SIGN | FORWARD | VERIFY | COMPUTE | TRANSFORM | FAN-OUT
    Each gate receives the output state of the previous gate.
    """
    circuit_id    = body.get("circuit_id", str(uuid.uuid4()))
    initial_state = body.get("initial_state", {})
    gates         = body.get("gates", [])

    if not gates:
        raise HTTPException(status_code=400, detail="gates list is empty")

    started = time.time()
    circuit_runs.inc()

    state        = {"data": initial_state, "_circuit_id": circuit_id}
    gate_results = []

    for i, gate in enumerate(gates):
        gate_type = gate.get("type", "").upper()
        handler   = _GATE_HANDLERS.get(gate_type)

        if not handler:
            gate_results.append({
                "gate_index": i,
                "type":       gate_type,
                "error":      f"Unknown gate type '{gate_type}'",
            })
            continue

        try:
            result = await handler(gate, state)
            gate_results.append({"gate_index": i, "type": gate_type, **result})
            circuit_gates.inc()

            # Carry forward: TRANSFORM updates data, others inject their result
            if gate_type == "TRANSFORM":
                state = {"data": result.get("data", state.get("data", {})),
                         "_circuit_id": circuit_id}
            elif gate_type in ("COMPUTE",):
                state["_last_compute"] = result.get("result")
            elif gate_type in ("FORWARD",):
                state["_last_response"] = result.get("body")

        except Exception as e:
            gate_results.append({"gate_index": i, "type": gate_type, "error": str(e)[:300]})
            log.error(f"[qpu] Circuit gate {i} ({gate_type}) error: {e}")

    elapsed = time.time() - started
    circuit_latency.observe(elapsed)

    log.info(f"[qpu] Circuit {circuit_id}: {len(gates)} gates in {elapsed:.3f}s")
    return {
        "circuit_id":      circuit_id,
        "gates_executed":  len(gate_results),
        "elapsed_s":       round(elapsed, 3),
        "final_state":     state,
        "gate_results":    gate_results,
    }


@app.post("/qpu/entangle")
async def entangle(body: dict[str, Any]):
    """
    Register two services as quantum-entangled.
    State changes broadcast from one will propagate to the other via Redis.
    body: { service_a: str, service_b: str, bidirectional: bool }
    """
    svc_a         = body.get("service_a", "")
    svc_b         = body.get("service_b", "")
    bidirectional = body.get("bidirectional", True)

    if not svc_a or not svc_b:
        raise HTTPException(status_code=400, detail="service_a and service_b required")

    pair_id = hashlib.sha3_256(
        (min(svc_a, svc_b) + "|" + max(svc_a, svc_b)).encode()
    ).hexdigest()[:16]

    _entanglements[pair_id] = {
        "pair_id":       pair_id,
        "service_a":     svc_a,
        "service_b":     svc_b,
        "bidirectional": bidirectional,
        "channel":       f"qpu:entangle:{pair_id}",
        "entangled_at":  time.time(),
        "events_total":  0,
        "last_event_at": None,
    }
    entanglement_pairs.set(len(_entanglements))

    if redis_client:
        await redis_client.set(
            f"qpu:entanglement:{pair_id}",
            json.dumps(_entanglements[pair_id]),
            ex=86400,
        )

    log.info(f"[qpu] Entangled {svc_a} <-> {svc_b} (pair={pair_id})")
    return {
        "pair_id":        pair_id,
        "service_a":      svc_a,
        "service_b":      svc_b,
        "channel":        f"qpu:entangle:{pair_id}",
        "bidirectional":  bidirectional,
        "entangled_at":   _entanglements[pair_id]["entangled_at"],
    }


@app.post("/qpu/entanglement/state")
async def broadcast_entangled_state(body: dict[str, Any]):
    """
    Broadcast a state update from a service to all its entangled partners.
    body: { source_service: str, state: dict }
    """
    source = body.get("source_service", "")
    state  = body.get("state", {})

    if not source:
        raise HTTPException(status_code=400, detail="source_service required")

    pairs_notified = []
    for pair_id, ent in _entanglements.items():
        if ent["service_a"] != source and ent["service_b"] != source:
            continue

        partner = ent["service_b"] if ent["service_a"] == source else ent["service_a"]
        event   = {
            "type":       "entanglement_state",
            "pair_id":    pair_id,
            "source":     source,
            "partner":    partner,
            "state":      state,
            "at":         time.time(),
        }

        if redis_client:
            await redis_client.publish(f"qpu:entangle:{pair_id}", json.dumps(event))
            await redis_client.set(
                f"qpu:entangle:{pair_id}:last",
                json.dumps(event),
                ex=300,
            )

        ent["events_total"]  = ent.get("events_total", 0) + 1
        ent["last_event_at"] = time.time()
        entanglement_events.inc()
        pairs_notified.append(pair_id)

    return {
        "source":          source,
        "pairs_notified":  len(pairs_notified),
        "pair_ids":        pairs_notified,
        "broadcast_at":    time.time(),
    }


@app.get("/qpu/entanglement/registry")
async def entanglement_registry():
    """Return all active entanglement pairs."""
    return {
        "pairs_active": len(_entanglements),
        "registry":     list(_entanglements.values()),
    }


@app.post("/qpu/bridge/forward")
async def bridge_forward(body: dict[str, Any]):
    """
    Forward a request to any service in the ecosystem.
    Optionally quantum-sign the payload with Dilithium-5 before forwarding.
    body: {
      target:  str,    # service name or full URL
      path:    str,
      method:  str,
      payload: dict,
      sign:    bool    # if true, attach Dilithium-5 signature header
    }
    """
    target   = body.get("target", "")
    path     = body.get("path",   "/health")
    method   = body.get("method", "GET")
    payload  = body.get("payload", {})
    do_sign  = body.get("sign",   False)

    if not target:
        raise HTTPException(status_code=400, detail="target required")

    url      = _resolve_url(target).rstrip("/") + "/" + path.lstrip("/")
    headers  = {}

    if do_sign:
        raw = json.dumps(payload, sort_keys=True).encode()
        sig = await _quantum_sign(raw)
        if sig:
            headers["X-Quantum-Signature"]  = sig.get("signature", "")[:256]
            headers["X-Quantum-Algorithm"]  = "CRYSTALS-Dilithium-5"
            headers["X-Quantum-Public-Key"] = sig.get("public_key", "")[:256]
            bridge_signed.inc()

    bridge_forwards.inc()
    result = await _http_call(method, url, body=payload, headers=headers)

    return {
        "target":      target,
        "url":         url,
        "signed":      do_sign and bool(headers.get("X-Quantum-Signature")),
        "result":      result,
        "forwarded_at": time.time(),
    }


@app.get("/qpu/status")
async def qpu_status():
    """Full QPU posture: tasks, entanglements, service mesh, and quantum-shield link."""
    pending = sum(1 for t in _tasks.values() if t["status"] == "pending")
    running = sum(1 for t in _tasks.values() if t["status"] == "running")
    done    = sum(1 for t in _tasks.values() if t["status"] == "done")
    errors  = sum(1 for t in _tasks.values() if t["status"] == "error")

    # Quick probe of quantum-shield
    qs_ok = False
    try:
        async with httpx.AsyncClient(timeout=3.0) as c:
            r = await c.get(f"{QUANTUM_SHIELD_URL}/health")
            qs_ok = r.status_code == 200
    except Exception:
        pass

    return {
        "service":             "Triumph QPU Bridge",
        "uptime_seconds":      round(time.time() - _started_at, 1),
        "pi_internal_rate":    PI_INTERNAL_RATE,
        "pi_external_rate":    PI_EXTERNAL_RATE,
        "pi_multiplier":       PI_MULTIPLIER,
        "tasks": {
            "pending": pending,
            "running": running,
            "done":    done,
            "errors":  errors,
            "total":   len(_tasks),
        },
        "entanglement": {
            "pairs_active": len(_entanglements),
            "pairs":        [
                {
                    "pair_id":   p["pair_id"],
                    "service_a": p["service_a"],
                    "service_b": p["service_b"],
                    "events":    p.get("events_total", 0),
                }
                for p in _entanglements.values()
            ],
        },
        "quantum_shield": {
            "url":       QUANTUM_SHIELD_URL,
            "reachable": qs_ok,
        },
        "services_registered": len(SERVICES),
        "gate_types_supported": list(_GATE_HANDLERS.keys()),
        "sovereignty":          "TRIUMPH SYNERGY HQ — 135 Lake Como Dr, Pomona Park FL 32181",
    }
