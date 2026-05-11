# Copyright (C) 2024-2026 Jeremiah Joel Drains, Founder & Superior Sovereign / Triumph Synergy. All rights reserved.
# License: PiOS
"""
Pi Dual-Value Engine — triumph-synergy
=======================================
Separates Pi Network's two distinct value dimensions:

  INTERNAL VALUE (Sovereign / Mined)
  ─────────────────────────────────────
  The utility-backed intrinsic worth of Pi within the ecosystem.
  Derived from: ML utility index, KYC status, wallet age, network
  activity, transaction velocity, SCP participation, and Pi's
  fundamental protocol parameters. This represents what Pi is WORTH
  as money-of-account inside the Triumph Synergy digital world.

  EXTERNAL VALUE (Market / Traded)
  ─────────────────────────────────
  The price Pi fetches when exchanged for USD/fiat in the open market.
  Derived from: ML Ridge price model, DEX order book, market-data
  service, and live Horizon fee stats. This represents what Pi TRADES
  FOR in the physical world.

  DUAL-VALUE SPREAD
  ─────────────────
  spread = external / internal
  > 1.0  → Pi is market-overvalued  (sell signal / premium)
  < 1.0  → Pi is market-undervalued (buy signal  / discount)
  = 1.0  → Fair value equilibrium

Port: 8093
Networks: triumph-net
"""

# Copyright (C) 2024-2026 Jeremiah Joel Drains, Founder & Superior Sovereign / Triumph Synergy. All rights reserved.
# License: PiOS
# Copyright (C) 2024-2026 Jeremiah Joel Drains, Founder & Superior Sovereign / Triumph Synergy. All rights reserved.
# License: PiOS


import asyncio
import json
import logging
import os
import time
from typing import Any

import httpx
import redis.asyncio as aioredis
from fastapi import FastAPI, HTTPException
from fastapi.responses import PlainTextResponse
from prometheus_client import (
    Counter, Gauge, Histogram, generate_latest, CONTENT_TYPE_LATEST
)

# ── Config ─────────────────────────────────────────────────────────────────────

ML_ENGINE_URL    = os.getenv("ML_ENGINE_URL",    "http://triumph-ml-engine:8090")
MARKET_DATA_URL  = os.getenv("MARKET_DATA_URL",  "http://triumph-market-data:8085")
BRIDGE_URL       = os.getenv("PI_BRIDGE_URL",    "http://triumph-pi-bridge-connector:8092")
CREDIT_URL       = os.getenv("CREDIT_ENGINE_URL","http://triumph-credit-engine:8091")
REDIS_URL        = os.getenv("REDIS_URL",        "redis://triumph-redis:6379")
PORT             = int(os.getenv("PORT", "8093"))
REFRESH_INTERVAL = float(os.getenv("REFRESH_INTERVAL_S", "15"))

# CANONICAL Pi Dual-Value constants — source: lib/pios/pios-integration.ts
# Internally mined/contributed Pi is 1000x more valuable than external market Pi
PI_INTERNAL_RATE       = float(os.getenv("PI_INTERNAL_RATE",       "314159.0"))  # $314,159/Pi — sovereign/mined
PI_EXTERNAL_RATE       = float(os.getenv("PI_EXTERNAL_RATE",       "314.159"))   # $314.159/Pi — market/traded
PI_INTERNAL_MULTIPLIER = float(os.getenv("PI_INTERNAL_MULTIPLIER", "1000.0"))    # 1000x internal:external
KYC_PREMIUM_PCT        = float(os.getenv("KYC_PREMIUM_PCT",        "0.05"))      # 5% KYC bonus on sovereign base
PIONEER_PREMIUM_PCT    = float(os.getenv("PIONEER_PREMIUM_PCT",    "0.03"))      # 3% long-term holder bonus

HQ_ADDRESS = os.getenv(
    "PI_SUPERNODE_ADDRESS",
    "GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V"
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("dual-value-engine")

# ── Prometheus ─────────────────────────────────────────────────────────────────

internal_value_gauge   = Gauge("pi_internal_value_usd", "Pi internal (utility) value in USD")
external_value_gauge   = Gauge("pi_external_value_usd", "Pi external (market) value in USD")
spread_gauge           = Gauge("pi_dual_value_spread", "External/internal value spread ratio")
refresh_duration       = Histogram("pi_dual_value_refresh_seconds", "Dual-value refresh duration")
refresh_errors         = Counter("pi_dual_value_refresh_errors_total", "Refresh cycle errors")
assessments_total      = Counter("pi_dual_value_assessments_total", "Address assessments served")

# ── State ──────────────────────────────────────────────────────────────────────

state: dict[str, Any] = {
    # Internal value components
    "utility_index":         0.0,   # 0–100 from ML engine
    "network_ledger_seq":    0,
    "network_tx_rate":       0.0,
    "protocol_version":      20,
    "base_fee_pi":           0.01,

    # External value components
    "ml_price_usd":          314.159,  # Ridge model prediction
    "market_data_price":     None,
    "bridge_ledger_seq":     0,
    "bridge_network":        "Pi Network",

    # Computed dual values — canonical Pi rates from lib/pios/pios-integration.ts
    "internal_value_usd":    314159.0,   # PI_INTERNAL_RATE: sovereign/mined (1000x)
    "external_value_usd":    314.159,    # PI_EXTERNAL_RATE: market/traded
    "spread_ratio":          1.0,
    "spread_label":          "EQUILIBRIUM",
    "arbitrage_signal":      "HOLD",

    # Meta
    "last_refreshed":        None,
    "refresh_count":         0,
    "started_at":            time.time(),
    "ml_reachable":          False,
    "market_reachable":      False,
    "bridge_reachable":      False,
}

app = FastAPI(title="Pi Dual-Value Engine", version="1.0.0")
redis_client: aioredis.Redis | None = None


# ── HTTP helpers ───────────────────────────────────────────────────────────────

def _client() -> httpx.AsyncClient:
    return httpx.AsyncClient(timeout=6.0, follow_redirects=True)


# ── Internal Value Calculator ──────────────────────────────────────────────────

def _compute_internal_value(
    is_kyc: bool = True,
    wallet_age_days: int = 365,
    hq_multiplier: float = 1.0,
) -> dict[str, float]:
    """
    Compute the INTERNAL (sovereign / mined) value of 1 Pi in USD.

    Anchored to the canonical constant from lib/pios/pios-integration.ts:
      PI_INTERNAL_RATE = $314,159 per Pi  (1000x the external market rate of $314.159)

    Bonuses applied on top of the canonical base:
      kyc_bonus    = PI_INTERNAL_RATE * KYC_PREMIUM_PCT        if is_kyc
      tenure_bonus = PI_INTERNAL_RATE * min(age/730, 1.0) * PIONEER_PREMIUM_PCT
    """
    kyc_bonus    = PI_INTERNAL_RATE * KYC_PREMIUM_PCT if is_kyc else 0.0
    tenure_ratio = min(wallet_age_days / 730.0, 1.0)
    tenure_bonus = PI_INTERNAL_RATE * tenure_ratio * PIONEER_PREMIUM_PCT
    internal     = (PI_INTERNAL_RATE + kyc_bonus + tenure_bonus) * hq_multiplier

    return {
        "canonical_base":    round(PI_INTERNAL_RATE,       4),
        "multiplier":        round(PI_INTERNAL_MULTIPLIER, 1),
        "kyc_bonus":         round(kyc_bonus,    4),
        "tenure_bonus":      round(tenure_bonus, 4),
        "hq_multiplier":     round(hq_multiplier, 4),
        "internal_value_usd":round(internal,     4),
    }


def _interpret_spread(spread: float) -> tuple[str, str]:
    """Return (spread_label, arbitrage_signal)."""
    if spread > 2.0:   return "EXTREME_PREMIUM",    "STRONG_SELL"
    if spread > 1.3:   return "MARKET_PREMIUM",     "SELL"
    if spread > 1.05:  return "SLIGHT_PREMIUM",     "HOLD_SELL"
    if spread > 0.95:  return "EQUILIBRIUM",        "HOLD"
    if spread > 0.70:  return "SLIGHT_DISCOUNT",    "BUY"
    if spread > 0.40:  return "MARKET_DISCOUNT",    "STRONG_BUY"
    return               "EXTREME_DISCOUNT",        "ACCUMULATE"


# ── Background refresh ─────────────────────────────────────────────────────────

async def _refresh() -> None:
    """Fetch all upstream data and recompute both Pi value dimensions."""
    global redis_client

    with refresh_duration.time():
        async with _client() as c:
            # 1. ML engine — utility index + Ridge price
            try:
                r = await c.get(f"{ML_ENGINE_URL}/health")
                if r.status_code == 200:
                    d = r.json()
                    state["ml_reachable"]  = True
                    state["ml_price_usd"]  = d.get("piPriceUsd", state["ml_price_usd"])

                    # Get utility index if available
                    ru = await c.get(f"{ML_ENGINE_URL}/api/ml/utility-index",
                                     params={"address": HQ_ADDRESS})
                    if ru.status_code == 200:
                        du = ru.json()
                        state["utility_index"] = float(du.get("utilityIndex", 0) or 0)
            except Exception as e:
                state["ml_reachable"] = False
                log.debug(f"ML engine: {e}")

            # 2. Market data — live Pi price + bridge ledger
            try:
                rm = await c.get(f"{MARKET_DATA_URL}/api/market")
                if rm.status_code == 200:
                    dm = rm.json()
                    state["market_reachable"]  = True
                    state["network_ledger_seq"] = int(dm.get("ledger_seq") or 0)
                    state["network_tx_rate"]    = float(dm.get("tx_count")  or 0)
                    state["base_fee_pi"]        = float(dm.get("base_fee_pi") or 0.01)
                    if dm.get("pi_price_usd"):
                        state["market_data_price"] = float(dm["pi_price_usd"])
                    if dm.get("bridge_ledger_seq"):
                        state["bridge_ledger_seq"] = int(dm["bridge_ledger_seq"])
                    if dm.get("bridge_network"):
                        state["bridge_network"] = dm["bridge_network"]
            except Exception as e:
                state["market_reachable"] = False
                log.debug(f"Market data: {e}")

            # 3. Pi bridge — latest ledger sequence for protocol maturity
            try:
                rb = await c.get(f"{BRIDGE_URL}/pi-node/status")
                if rb.status_code == 200:
                    db = rb.json()
                    state["bridge_reachable"]   = True
                    state["bridge_ledger_seq"]  = int(db.get("latest_ledger_seq") or 0)
                    state["protocol_version"]   = int(db.get("protocol_version") or 20)
                    state["bridge_network"]     = db.get("network_passphrase", state["bridge_network"])
            except Exception as e:
                state["bridge_reachable"] = False
                log.debug(f"Pi bridge: {e}")

    # Compute internal value
    internal_components = _compute_internal_value(
        is_kyc          = True,
        wallet_age_days = 730,
        hq_multiplier   = 1.10,  # HQ entity 10% sovereign premium
    )
    internal_usd = internal_components["internal_value_usd"]

    # External value = best available market price
    external_usd = (
        state["market_data_price"] or
        state["ml_price_usd"] or
        314.159
    )

    spread = round(external_usd / internal_usd, 6) if internal_usd > 0 else 1.0
    label, signal = _interpret_spread(spread)

    state.update({
        "internal_value_usd":      internal_usd,
        "external_value_usd":      external_usd,
        "internal_components":     internal_components,
        "spread_ratio":            spread,
        "spread_label":            label,
        "arbitrage_signal":        signal,
        "last_refreshed":          time.time(),
        "refresh_count":           state["refresh_count"] + 1,
    })

    internal_value_gauge.set(internal_usd)
    external_value_gauge.set(external_usd)
    spread_gauge.set(spread)

    # Publish to Redis
    if redis_client:
        payload = json.dumps({
            "type":             "dual_value_update",
            "internal_usd":     internal_usd,
            "external_usd":     external_usd,
            "spread":           spread,
            "signal":           signal,
            "label":            label,
            "network":          state["bridge_network"],
            "updated_at":       time.time(),
        })
        await redis_client.publish("pi:dual_value", payload)
        await redis_client.set("pi:internal_value_usd", str(internal_usd), ex=120)
        await redis_client.set("pi:external_value_usd", str(external_usd), ex=120)
        await redis_client.set("pi:value_spread",       str(spread),       ex=120)
        log.info(f"[dual-value] internal=${internal_usd:.4f} external=${external_usd:.4f} spread={spread:.4f} → {label}")


async def _background_loop() -> None:
    global redis_client
    try:
        redis_client = await aioredis.from_url(REDIS_URL, decode_responses=True)
        log.info(f"[dual-value] Redis connected: {REDIS_URL}")
    except Exception as e:
        log.warning(f"[dual-value] Redis unavailable: {e}")

    log.info(f"[dual-value] Starting refresh loop (interval={REFRESH_INTERVAL}s)")
    while True:
        try:
            await _refresh()
        except Exception as e:
            refresh_errors.inc()
            log.error(f"[dual-value] Refresh error: {e}")
        await asyncio.sleep(REFRESH_INTERVAL)


@app.on_event("startup")
async def _startup() -> None:
    asyncio.create_task(_background_loop())


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status":               "healthy",
        "internal_value_usd":   state["internal_value_usd"],
        "external_value_usd":   state["external_value_usd"],
        "spread_ratio":         state["spread_ratio"],
        "spread_label":         state["spread_label"],
        "arbitrage_signal":     state["arbitrage_signal"],
        "ml_reachable":         state["ml_reachable"],
        "market_reachable":     state["market_reachable"],
        "bridge_reachable":     state["bridge_reachable"],
        "network":              state["bridge_network"],
        "uptime_seconds":       round(time.time() - state["started_at"], 1),
    }


@app.get("/metrics", response_class=PlainTextResponse)
async def metrics():
    return PlainTextResponse(generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.get("/value/internal")
async def get_internal_value():
    """Pi's intrinsic/mined internal utility value."""
    return {
        "value_type":        "INTERNAL",
        "description":       "Pi utility-backed intrinsic value (mined/sovereign)",
        "value_usd":         state["internal_value_usd"],
        "components":        state.get("internal_components", {}),
        "utility_index":     state["utility_index"],
        "network":           state["bridge_network"],
        "ledger_seq":        state["bridge_ledger_seq"],
        "protocol_version":  state["protocol_version"],
        "definition": (
            "Internal value reflects what 1 Pi is WORTH within the Triumph Synergy "
            "digital ecosystem — backed by utility, KYC status, network maturity, "
            "and on-chain activity. Not speculative. Stable. Sovereign."
        ),
        "computed_at": state["last_refreshed"],
    }


@app.get("/value/external")
async def get_external_value():
    """Pi's external/traded market price."""
    return {
        "value_type":        "EXTERNAL",
        "description":       "Pi market/traded value (physical world exchange rate)",
        "value_usd":         state["external_value_usd"],
        "ml_ridge_price":    state["ml_price_usd"],
        "market_data_price": state["market_data_price"],
        "network":           state["bridge_network"],
        "definition": (
            "External value reflects what 1 Pi TRADES FOR in open markets — "
            "driven by supply/demand, speculation, and real-world exchange listings. "
            "Volatile. Market-priced. Physical-world anchor."
        ),
        "computed_at": state["last_refreshed"],
    }


@app.get("/value/spread")
async def get_spread():
    """The quantified gap between internal utility value and external market price."""
    label, signal = _interpret_spread(state["spread_ratio"])
    internal = state["internal_value_usd"]
    external = state["external_value_usd"]
    premium_usd = round(external - internal, 4)
    return {
        "spread_ratio":      state["spread_ratio"],
        "spread_label":      label,
        "arbitrage_signal":  signal,
        "premium_usd":       premium_usd,
        "premium_pct":       round((state["spread_ratio"] - 1.0) * 100, 2),
        "internal_value_usd":internal,
        "external_value_usd":external,
        "interpretation": {
            "EXTREME_PREMIUM":  "Market massively overprices Pi vs utility — reduce exposure",
            "MARKET_PREMIUM":   "Pi trading above intrinsic value — market optimism",
            "SLIGHT_PREMIUM":   "Pi slightly above utility value — near equilibrium",
            "EQUILIBRIUM":      "Market price = utility value — perfect valuation",
            "SLIGHT_DISCOUNT":  "Pi underpriced vs utility — accumulation opportunity",
            "MARKET_DISCOUNT":  "Pi significantly below utility value — strong buy signal",
            "EXTREME_DISCOUNT": "Pi deeply undervalued — maximum accumulation signal",
        }.get(label, "Unknown"),
        "computed_at": state["last_refreshed"],
    }


@app.get("/value/report")
async def get_full_report():
    """Full dual-value report — combines internal, external, spread, and thesis."""
    internal = state["internal_value_usd"]
    external = state["external_value_usd"]
    spread   = state["spread_ratio"]
    label, signal = _interpret_spread(spread)

    return {
        "title":         "Pi Network Dual-Value Analysis — Triumph Synergy",
        "network":       state["bridge_network"],
        "ledger_seq":    state["bridge_ledger_seq"],

        "internal": {
            "value_usd":    internal,
            "label":        "SOVEREIGN / MINED",
            "description":  "Utility-backed, stable, ecosystem-native value",
            "components":   state.get("internal_components", {}),
        },
        "external": {
            "value_usd":    external,
            "label":        "MARKET / TRADED",
            "description":  "Open-market exchange price, speculative element",
            "ml_price":     state["ml_price_usd"],
            "market_price": state["market_data_price"],
        },
        "spread": {
            "ratio":        spread,
            "label":        label,
            "signal":       signal,
            "premium_usd":  round(external - internal, 4),
            "premium_pct":  round((spread - 1.0) * 100, 2),
        },
        "thesis": (
            "Pi Network creates a unique dual-value monetary system: "
            "an internal economy anchored to utility and sovereign ownership (mined Pi) "
            "and an external economy exposed to global market dynamics (traded Pi). "
            "Triumph Synergy bridges both — providing pioneers with a superior platform "
            "that recognizes Pi's full intrinsic worth while connecting to the physical world."
        ),
        "generated_at": time.time(),
    }


@app.get("/value/address/{address}")
async def assess_address(address: str, wallet_age_days: int = 365, is_kyc: bool = True):
    """Per-address dual-value assessment using on-chain data."""
    assessments_total.inc()

    # Try to get real on-chain data from the bridge
    tx_count = 0
    balance_pi = 0.0
    on_chain = False
    error = None

    async with _client() as c:
        try:
            r = await c.get(f"{BRIDGE_URL}/pi-node/account/{address}")
            if r.status_code == 200:
                acct = r.json()
                on_chain = True
                for bal in acct.get("balances", []):
                    if bal.get("asset_type") == "native":
                        balance_pi = float(bal.get("balance", 0))
                        break
                # Approximate age from sequence number
                seq = int(acct.get("sequence", 0) or 0)
                if seq > 0:
                    wallet_age_days = max(wallet_age_days, min(seq // 100, 2000))
        except Exception as e:
            error = str(e)

        # Transaction count
        try:
            rt = await c.get(
                f"{BRIDGE_URL}/pi-node/transactions/account/{address}",
                params={"limit": 1}
            )
            if rt.status_code == 200:
                rt_data = rt.json()
                # Approximate from paging cursor
                recs = rt_data.get("_embedded", {}).get("records", [])
                if recs:
                    tx_count = min(int(recs[0].get("ledger", 0) or 0) // 10, 10000)
        except Exception:
            pass

    # Compute internal value for this specific address
    components = _compute_internal_value(
        is_kyc          = is_kyc,
        wallet_age_days = wallet_age_days,
        hq_multiplier   = 1.0,
    )

    external = state["external_value_usd"]
    internal = components["internal_value_usd"]
    spread   = round(external / internal, 6) if internal > 0 else 1.0
    label, signal = _interpret_spread(spread)

    return {
        "address":            address,
        "on_chain":           on_chain,
        "balance_pi":         balance_pi,
        "wallet_age_days":    wallet_age_days,
        "is_kyc":             is_kyc,
        "tx_count_approx":    tx_count,

        "internal": {
            "value_usd":     internal,
            "label":         "SOVEREIGN / MINED",
            "components":    components,
        },
        "external": {
            "value_usd":     external,
            "label":         "MARKET / TRADED",
        },
        "spread": {
            "ratio":         spread,
            "label":         label,
            "signal":        signal,
            "premium_usd":   round(external - internal, 4),
        },
        "total_internal_value_usd": round(balance_pi * internal, 2) if balance_pi > 0 else None,
        "total_external_value_usd": round(balance_pi * external, 2) if balance_pi > 0 else None,
        "error":   error,
        "network": state["bridge_network"],
    }


@app.get("/value/hq")
async def hq_dual_value():
    """Triumph Synergy HQ dual-value assessment — Jeremiah Joel Drains, Supreme Authority."""
    components = _compute_internal_value(
        is_kyc          = True,
        wallet_age_days = 730,
        hq_multiplier   = 1.20,  # 20% HQ sovereign premium
    )

    external = state["external_value_usd"]
    internal = components["internal_value_usd"]
    spread   = round(external / internal, 6) if internal > 0 else 1.0
    label, signal = _interpret_spread(spread)

    return {
        "entity":      "Triumph Synergy HQ",
        "owner":       "Jeremiah Joel Drains",
        "authority":   "Supreme Authority / Owner-Creator",
        "address":     HQ_ADDRESS,
        "deed":        "AD-TRIUMPH-HQ-001",
        "property":    "135 Lake Como Dr, Pomona Park, FL 32181",
        "title_type":  "ALLODIAL PERFECTED",
        "status":      "DEBT FREE | NO ENCUMBRANCES | CREDIT WIPED CLEAN",

        "internal": {
            "value_usd":    internal,
            "label":        "SOVEREIGN / MINED",
            "premium":      "20% HQ sovereign premium applied",
            "components":   components,
        },
        "external": {
            "value_usd":    external,
            "label":        "MARKET / TRADED",
        },
        "spread": {
            "ratio":        spread,
            "label":        label,
            "signal":       signal,
        },
        "network":     state["bridge_network"],
        "generated_at": time.time(),
    }
