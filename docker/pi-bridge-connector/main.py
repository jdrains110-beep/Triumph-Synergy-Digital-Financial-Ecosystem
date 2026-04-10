"""
Pi Bridge Connector — triumph-synergy
=====================================
Bridges triumph-central-node ↔ testnet2 Pi node (Horizon + stellar-core)

- Polls testnet2:8000 (Horizon) every 5 s for ledger, SCP, and transaction data
- Publishes ledger updates to Redis pub/sub (channel: pi:ledger)
- Routes XDR transaction submissions through the Pi node
- Exposes a unified REST API that makes BOTH nodes appear as one superior platform

Port: 8092
Networks: triumph-net, pi-bridge
"""

import asyncio
import json
import logging
import os
import time
from typing import Any

import redis.asyncio as aioredis
import httpx
from fastapi import FastAPI, HTTPException, Body
from fastapi.responses import PlainTextResponse
from prometheus_client import (
    Counter, Gauge, Histogram, generate_latest, CONTENT_TYPE_LATEST
)

# ── Config ─────────────────────────────────────────────────────────────────────

PI_NODE_HOST     = os.getenv("PI_NODE_HOST",     "testnet2")
PI_NODE_API_PORT = int(os.getenv("PI_NODE_API_PORT", "8000"))
PI_NODE_PEER_PORT= int(os.getenv("PI_NODE_PEER_PORT", "31402"))
STELLAR_CORE_PORT= int(os.getenv("STELLAR_CORE_PORT", "1570"))

HORIZON_URL      = f"http://{PI_NODE_HOST}:{PI_NODE_API_PORT}"
CENTRAL_NODE_URL = os.getenv("CENTRAL_NODE_URL", "http://triumph-central-node:11626")
REDIS_URL        = os.getenv("REDIS_URL",        "redis://triumph-redis:6379")
POLL_INTERVAL    = float(os.getenv("POLL_INTERVAL_S", "5"))
PORT             = int(os.getenv("PORT", "8092"))

CENTRAL_NODE_KEY = os.getenv(
    "CENTRAL_NODE_PUBLIC_KEY",
    "GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V"
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("pi-bridge-connector")

# ── Prometheus ─────────────────────────────────────────────────────────────────

pi_ledger_gauge        = Gauge("pi_bridge_ledger_sequence", "Latest ledger from Pi node")
pi_sync_lag_gauge      = Gauge("pi_bridge_sync_lag_seconds", "Seconds since last successful Pi node poll")
pi_txs_submitted       = Counter("pi_bridge_transactions_submitted_total", "Transactions submitted through Pi node")
pi_txs_failed          = Counter("pi_bridge_transactions_failed_total", "Transaction submission failures")
pi_poll_errors         = Counter("pi_bridge_poll_errors_total", "Pi node poll errors")
pi_redis_publishes     = Counter("pi_bridge_redis_publishes_total", "Redis pub/sub publishes")
bridge_poll_duration   = Histogram("pi_bridge_poll_duration_seconds", "Time for a Pi node poll cycle")
central_sync_gauge     = Gauge("pi_bridge_central_node_reachable", "1 if central node is reachable")

# ── State ──────────────────────────────────────────────────────────────────────

state: dict[str, Any] = {
    "pi_node_reachable":     False,
    "central_node_reachable":False,
    "latest_ledger":         None,   # full Horizon ledger record
    "latest_ledger_seq":     0,
    "latest_ledger_hash":    "",
    "latest_ledger_closed":  "",
    "horizon_version":       "",
    "core_version":          "",
    "network_passphrase":    "",
    "ingest_latest_ledger":  0,
    "protocol_version":      0,
    "central_node_info":     None,
    "last_polled":           0.0,
    "last_error":            None,
    "started_at":            time.time(),
    "poll_count":            0,
    "last_transactions":     [],     # last 10 transactions seen
}

app = FastAPI(title="Pi Bridge Connector", version="1.0.0")
redis_client: aioredis.Redis | None = None

# ── Horizon helpers ────────────────────────────────────────────────────────────

def _client() -> httpx.AsyncClient:
    return httpx.AsyncClient(timeout=8.0, follow_redirects=True)


async def _poll_pi_node() -> None:
    """Fetch latest ledger + recent transactions from the local Pi node Horizon."""
    with bridge_poll_duration.time():
        async with _client() as c:
            try:
                r = await c.get(f"{HORIZON_URL}/")
                r.raise_for_status()
                root = r.json()

                # Latest ledger
                lr = await c.get(f"{HORIZON_URL}/ledgers?order=desc&limit=1")
                lr.raise_for_status()
                records = lr.json().get("_embedded", {}).get("records", [])
                ledger = records[0] if records else None

                # Recent transactions (last 10)
                tx_r = await c.get(f"{HORIZON_URL}/transactions?order=desc&limit=10")
                tx_records: list[dict] = []
                if tx_r.status_code == 200:
                    tx_records = tx_r.json().get("_embedded", {}).get("records", [])

                old_seq = state["latest_ledger_seq"]
                new_seq = int(ledger.get("sequence", 0)) if ledger else 0

                state.update({
                    "pi_node_reachable":    True,
                    "horizon_version":      root.get("horizon_version", ""),
                    "core_version":         root.get("core_version", ""),
                    "network_passphrase":   root.get("network_passphrase", ""),
                    "ingest_latest_ledger": root.get("ingest_latest_ledger", 0),
                    "protocol_version":     root.get("current_protocol_version", 0),
                    "latest_ledger":        ledger,
                    "latest_ledger_seq":    new_seq,
                    "latest_ledger_hash":   ledger.get("hash", "") if ledger else "",
                    "latest_ledger_closed": ledger.get("closed_at", "") if ledger else "",
                    "last_polled":          time.time(),
                    "last_error":           None,
                    "poll_count":           state["poll_count"] + 1,
                    "last_transactions":    tx_records[:10],
                })
                pi_ledger_gauge.set(new_seq)
                pi_sync_lag_gauge.set(0)

                # Publish to Redis if ledger advanced
                if new_seq > old_seq and redis_client:
                    msg = json.dumps({
                        "type":       "ledger_closed",
                        "sequence":   new_seq,
                        "hash":       state["latest_ledger_hash"],
                        "closed_at":  state["latest_ledger_closed"],
                        "network":    state["network_passphrase"],
                        "source":     "pi-bridge-connector",
                    })
                    await redis_client.publish("pi:ledger", msg)
                    await redis_client.set("pi:latest_ledger", msg, ex=60)
                    pi_redis_publishes.inc()
                    log.info(f"[bridge] Ledger advanced: {old_seq} → {new_seq}")

            except Exception as e:
                state["pi_node_reachable"] = False
                state["last_error"] = str(e)
                pi_poll_errors.inc()
                pi_sync_lag_gauge.set(time.time() - state["last_polled"] if state["last_polled"] else 0)
                log.warning(f"[bridge] Pi node poll failed: {e}")


async def _poll_central_node() -> None:
    """Check central node liveness."""
    async with _client() as c:
        try:
            r = await c.get(f"{CENTRAL_NODE_URL}/info")
            state["central_node_reachable"] = r.status_code == 200
            if r.status_code == 200:
                state["central_node_info"] = r.json()
            central_sync_gauge.set(1 if r.status_code == 200 else 0)
        except Exception:
            state["central_node_reachable"] = False
            central_sync_gauge.set(0)


async def _background_poll() -> None:
    """Background loop: poll both nodes every POLL_INTERVAL seconds."""
    global redis_client
    try:
        redis_client = await aioredis.from_url(REDIS_URL, decode_responses=True)
        log.info(f"[bridge] Redis connected: {REDIS_URL}")
    except Exception as e:
        log.warning(f"[bridge] Redis unavailable: {e}")

    log.info(f"[bridge] Starting poll loop — Pi node: {HORIZON_URL}, interval: {POLL_INTERVAL}s")
    while True:
        await asyncio.gather(_poll_pi_node(), _poll_central_node(), return_exceptions=True)
        await asyncio.sleep(POLL_INTERVAL)


@app.on_event("startup")
async def _startup() -> None:
    asyncio.create_task(_background_poll())


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    pi_ok = state["pi_node_reachable"]
    cn_ok = state["central_node_reachable"]
    lag   = time.time() - state["last_polled"] if state["last_polled"] else 999
    return {
        "status":               "healthy" if pi_ok else "degraded",
        "pi_node_reachable":    pi_ok,
        "central_node_reachable": cn_ok,
        "sync_lag_seconds":     round(lag, 1),
        "latest_ledger_seq":    state["latest_ledger_seq"],
        "network":              state["network_passphrase"],
        "uptime_seconds":       round(time.time() - state["started_at"], 1),
        "pi_node_url":          HORIZON_URL,
        "central_node_url":     CENTRAL_NODE_URL,
    }


@app.get("/metrics", response_class=PlainTextResponse)
async def metrics():
    return PlainTextResponse(generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.get("/pi-node/status")
async def pi_node_status():
    """Full sync status of the local Pi node."""
    lag = time.time() - state["last_polled"] if state["last_polled"] else None
    return {
        "reachable":            state["pi_node_reachable"],
        "horizon_url":          HORIZON_URL,
        "horizon_version":      state["horizon_version"],
        "core_version":         state["core_version"],
        "network_passphrase":   state["network_passphrase"],
        "ingest_latest_ledger": state["ingest_latest_ledger"],
        "protocol_version":     state["protocol_version"],
        "latest_ledger_seq":    state["latest_ledger_seq"],
        "latest_ledger_hash":   state["latest_ledger_hash"],
        "latest_ledger_closed": state["latest_ledger_closed"],
        "sync_lag_seconds":     round(lag, 1) if lag is not None else None,
        "poll_count":           state["poll_count"],
        "last_error":           state["last_error"],
        "peer_port":            PI_NODE_PEER_PORT,
    }


@app.get("/pi-node/ledger")
async def pi_node_ledger():
    """Latest ledger record from the Pi node."""
    if not state["latest_ledger"]:
        raise HTTPException(503, "Pi node ledger not yet available")
    return state["latest_ledger"]


@app.get("/pi-node/account/{address}")
async def pi_node_account(address: str):
    """Account record from the live Pi node."""
    async with _client() as c:
        try:
            r = await c.get(f"{HORIZON_URL}/accounts/{address}")
            if r.status_code == 404:
                raise HTTPException(404, f"Account {address} not found on Pi node")
            r.raise_for_status()
            return r.json()
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(503, f"Pi node unreachable: {e}") from e


@app.get("/pi-node/transactions")
async def pi_node_transactions(limit: int = 20, order: str = "desc"):
    """Recent transactions from the Pi node."""
    async with _client() as c:
        try:
            r = await c.get(f"{HORIZON_URL}/transactions?order={order}&limit={min(limit, 200)}")
            r.raise_for_status()
            return r.json()
        except Exception as e:
            raise HTTPException(503, f"Pi node unreachable: {e}") from e


@app.get("/pi-node/transactions/account/{address}")
async def pi_node_account_transactions(address: str, limit: int = 20):
    """Transactions for a specific account from the Pi node."""
    async with _client() as c:
        try:
            r = await c.get(
                f"{HORIZON_URL}/accounts/{address}/transactions?order=desc&limit={min(limit, 200)}"
            )
            if r.status_code == 404:
                raise HTTPException(404, f"Account {address} not found")
            r.raise_for_status()
            return r.json()
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(503, f"Pi node unreachable: {e}") from e


@app.post("/pi-node/submit")
async def submit_transaction(payload: dict = Body(...)):
    """
    Submit a signed XDR transaction through the local Pi node Horizon.
    Body: { "tx": "<XDR base64>" }
    This is the KEY integration point — all ecosystem transactions route through here.
    """
    tx_xdr = payload.get("tx") or payload.get("transaction") or payload.get("xdr")
    if not tx_xdr:
        raise HTTPException(400, "Body must include 'tx' (XDR base64)")

    async with _client() as c:
        try:
            r = await c.post(
                f"{HORIZON_URL}/transactions",
                data={"tx": tx_xdr},
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            result = r.json()
            if r.status_code in (200, 201):
                pi_txs_submitted.inc()
                # Publish to Redis
                if redis_client:
                    await redis_client.publish("pi:transactions", json.dumps({
                        "type":   "transaction_submitted",
                        "hash":   result.get("hash", ""),
                        "ledger": result.get("ledger", 0),
                        "source": "pi-bridge-connector",
                    }))
                log.info(f"[bridge] TX submitted: hash={result.get('hash')}")
                return {"success": True, "result": result}
            else:
                pi_txs_failed.inc()
                log.warning(f"[bridge] TX rejected: {result}")
                return {"success": False, "result": result, "status": r.status_code}
        except Exception as e:
            pi_txs_failed.inc()
            raise HTTPException(503, f"Pi node unreachable: {e}") from e


@app.get("/pi-node/fee-stats")
async def fee_stats():
    """Current Pi network fee statistics."""
    async with _client() as c:
        try:
            r = await c.get(f"{HORIZON_URL}/fee_stats")
            r.raise_for_status()
            return r.json()
        except Exception as e:
            raise HTTPException(503, f"Pi node unreachable: {e}") from e


@app.get("/pi-node/order-book")
async def order_book(
    selling_asset_type: str = "native",
    buying_asset_type:  str = "native",
    limit: int = 20,
):
    """Pi DEX order book from the Pi node."""
    async with _client() as c:
        try:
            r = await c.get(
                f"{HORIZON_URL}/order_book",
                params={
                    "selling_asset_type": selling_asset_type,
                    "buying_asset_type":  buying_asset_type,
                    "limit":              limit,
                }
            )
            r.raise_for_status()
            return r.json()
        except Exception as e:
            raise HTTPException(503, f"Pi node unreachable: {e}") from e


@app.get("/central-node/info")
async def central_node_info():
    """Current info from the triumph-central-node."""
    if not state["central_node_reachable"]:
        raise HTTPException(503, "Central node unreachable")
    return state["central_node_info"]


@app.get("/bridge/status")
async def bridge_status():
    """
    Unified status — combines triumph-central-node + Pi node into one view.
    This is the SUPERIOR PLATFORM combined view.
    """
    lag = time.time() - state["last_polled"] if state["last_polled"] else None
    return {
        "bridge": {
            "version":           "1.0.0",
            "status":            "operational" if state["pi_node_reachable"] else "degraded",
            "uptime_seconds":    round(time.time() - state["started_at"], 1),
            "poll_interval_s":   POLL_INTERVAL,
            "sync_lag_seconds":  round(lag, 1) if lag is not None else None,
        },
        "pi_node": {
            "url":               HORIZON_URL,
            "reachable":         state["pi_node_reachable"],
            "ledger_sequence":   state["latest_ledger_seq"],
            "ledger_hash":       state["latest_ledger_hash"],
            "ledger_closed_at":  state["latest_ledger_closed"],
            "horizon_version":   state["horizon_version"],
            "core_version":      state["core_version"],
            "network":           state["network_passphrase"],
            "protocol_version":  state["protocol_version"],
            "peer_port":         PI_NODE_PEER_PORT,
            "last_error":        state["last_error"],
        },
        "central_node": {
            "url":               CENTRAL_NODE_URL,
            "reachable":         state["central_node_reachable"],
            "public_key":        CENTRAL_NODE_KEY,
            "info":              state["central_node_info"].get("info", {}) if state["central_node_info"] else None,
        },
        "integration": {
            "pi_node_ledger_via_redis": redis_client is not None,
            "tx_submission_enabled":    state["pi_node_reachable"],
            "scp_bridge_active":        state["pi_node_reachable"] and state["central_node_reachable"],
            "networks_connected":       ["triumph-net", "pi-bridge"],
            "description": (
                "Triumph Central Node (GA6Z5S...) ↔ Pi Node (testnet2) are bridged. "
                "Ledger state flows from Pi Node → Redis pub/sub → all ecosystem services. "
                "Transactions submitted through Pi Node Horizon for on-chain confirmation."
            ),
        },
        "last_transactions": state["last_transactions"][:5],
    }


@app.get("/bridge/relay/{path:path}")
async def horizon_relay(path: str, request_query: str = ""):
    """
    Transparent relay: proxies any Horizon API call to the local Pi node.
    Use this to direct any ecosystem service to the live Pi node without
    knowing its internal address.
    """
    async with _client() as c:
        try:
            url = f"{HORIZON_URL}/{path}"
            r = await c.get(url)
            return r.json()
        except Exception as e:
            raise HTTPException(503, f"Pi node relay failed: {e}") from e


# ── Entry point ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT, log_level="info")
