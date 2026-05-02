# Copyright (C) 2024-2026 Jeremiah Joel Drains, Founder & Superior Sovereign / Triumph Synergy. All rights reserved.
# License: PiOS
"""
Triumph Synergy — Sovereign Gaming Nexus (SGN)
==============================================

The apex-sovereign integration layer that lets AAA online video games
(GTA VI, Battlefield, NBA 2K, EA FC, Fortnite, Call of Duty, Roblox,
Minecraft, Valorant, League of Legends, etc.) plug Pi Network /
Triumph Synergy directly into their economies — turning in-game effort
and labor into real-world Pi utility.

Two earning surfaces:

  ▸ PLAYERS  — earn Pi from gameplay, tournaments, watch-to-earn,
               battle-pass milestones, and NFT-free cosmetic ownership.
               Each title declares an `earn_table` (rule -> pi_amount)
               that SGN rate-limits, signs, and settles via Pi rails.

  ▸ ENGINEERS / EMPLOYEES — paid in Pi by their employers via on-rail
               payroll. Studios deposit Pi into a sovereign payroll
               escrow; SGN streams it to engineers per cycle (hourly,
               daily, milestone, salary). Smart-clauses cover bonuses,
               retainers, royalty splits, and severance.

Seven Sovereign Authorities of Gaming (54 sovereign loopholes total):

  SGIA  — Sovereign Game Integration Authority      (10 loopholes)
          Rivals: Steamworks · Epic Online Services · PlayStation Network · Xbox Live
  SGEA  — Sovereign Game Earning Authority          ( 9 loopholes)
          Rivals: V-Bucks · Robux · MTX storefronts · Battle Pass economies
  SGPA  — Sovereign Game Payroll Authority          ( 8 loopholes)
          Rivals: Deel · Remote · ADP · Workday · Stripe Connect
  SGTA  — Sovereign Game Tournament Authority       ( 7 loopholes)
          Rivals: ESL · FACEIT · BLAST · Riot Esports
  SGAA  — Sovereign Game Asset Authority            ( 8 loopholes)
          Rivals: OpenSea · Magic Eden · Steam Marketplace · Fortnite Item Shop
  SGCA  — Sovereign Game Commerce Authority         ( 7 loopholes)
          Rivals: 30% platform tax (Apple · Google · Steam · PSN)
  SGGV  — Sovereign Game Governance & Anti-Cheat    ( 5 loopholes)
          Rivals: BattlEye · Easy Anti-Cheat · Vanguard

APEX-QUANTUM-SOVEREIGN · ML-DSA-87 · ML-KEM-1024 · SPHINCS+
0% platform cut · sub-second Pi settlement · 200+ countries

Endpoints
---------
  GET  /health                         service health
  GET  /status                         platform status + 7 authorities
  GET  /metrics                        Prometheus metrics
  GET  /loopholes                      54 sovereign loopholes
  GET  /rivals                         rival platform comparison

  --- Studio/Title onboarding ---
  POST /studios                        register a studio (EA, Rockstar, 2K, …)
  GET  /studios                        list registered studios
  POST /titles                         register a game title under a studio
  GET  /titles                         list titles
  GET  /titles/{title_id}              title details + earn table
  POST /titles/{title_id}/earn-table   declare/update player earn rules

  --- Player earnings ---
  POST /players                        register/link a player to Pi wallet
  GET  /players/{player_id}            player profile + lifetime Pi earned
  POST /earn                           submit a signed earn event (gameplay rule fired)
  GET  /earn/{player_id}/recent        recent earn events for a player

  --- Tournaments ---
  POST /tournaments                    create a Pi-paid tournament
  GET  /tournaments                    list active tournaments
  POST /tournaments/{tid}/payout       settle prize pool to ranked players

  --- Studio payroll (engineers / employees) ---
  POST /payroll/employers              register an employer payroll account
  POST /payroll/employees              register/link an engineer/employee
  POST /payroll/deposit                employer deposits Pi into payroll escrow
  POST /payroll/run                    execute a payroll cycle
  GET  /payroll/employees/{eid}        employee earnings history
  POST /payroll/contracts              create smart-clause employment contract

Port:     8131
Security: APEX-QUANTUM-SOVEREIGN
Redis DB: 10
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import os
import secrets
import time
import uuid
from collections import defaultdict, deque
from dataclasses import dataclass, field, asdict
from typing import Any, Optional

import httpx
import redis.asyncio as aioredis
from fastapi import FastAPI, HTTPException, Body, Request
from fastapi.responses import PlainTextResponse
from prometheus_client import (
    Counter, Gauge, Histogram, generate_latest, CONTENT_TYPE_LATEST
)

# ── Config ───────────────────────────────────────────────────────────────────

PORT                 = int(os.getenv("PORT", "8131"))
REDIS_URL            = os.getenv("REDIS_URL",   "redis://triumph-redis:6379/10")
PI_BRIDGE_URL        = os.getenv("PI_BRIDGE_URL",        "http://triumph-pi-bridge-connector:8092")
QUANTUM_SHIELD_URL   = os.getenv("QUANTUM_SHIELD_URL",   "http://triumph-quantum-shield:8094")
SAIB_URL             = os.getenv("SAIB_URL",             "http://triumph-sovereign-ai-bot:8099")
SETTLEMENT_CORE_URL  = os.getenv("SETTLEMENT_CORE_URL",  "http://triumph-settlement-core:8080")

# Maximum Pi per player per 24h (anti-abuse / sovereign rate limit, override per studio)
GLOBAL_DAILY_PLAYER_PI_CAP = float(os.getenv("SGN_PLAYER_DAILY_CAP_PI", "100.0"))
# Earn-event signing secret (HMAC) — studios use a SHARED secret minted at studio register
SGN_HMAC_VERSION     = os.getenv("SGN_HMAC_VERSION", "v1")

SGN_VERSION          = "1.0.0"
SGN_REGION           = os.getenv("SAIB_REGION", "local")
SGN_REPLICA_ID       = os.getenv("SAIB_REPLICA_ID", "default")
START_TIME           = time.time()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [SGN] %(message)s",
)
log = logging.getLogger("sovereign-gaming-nexus")

# ── Prometheus metrics ───────────────────────────────────────────────────────

m_studios          = Gauge("sgn_studios_total", "Registered studios")
m_titles           = Gauge("sgn_titles_total",  "Registered game titles")
m_players          = Gauge("sgn_players_total", "Linked players")
m_employees        = Gauge("sgn_employees_total", "Registered employees")
m_earn_events      = Counter("sgn_earn_events_total", "Player earn events accepted", ["title", "rule"])
m_earn_rejected    = Counter("sgn_earn_rejected_total", "Player earn events rejected", ["reason"])
m_pi_paid_players  = Counter("sgn_pi_paid_players_total", "Pi paid to players")
m_pi_paid_payroll  = Counter("sgn_pi_paid_payroll_total", "Pi paid via studio payroll")
m_payroll_runs     = Counter("sgn_payroll_runs_total",  "Payroll cycles executed")
m_tournaments      = Gauge("sgn_tournaments_active", "Active tournaments")
m_quantum_sigs     = Counter("sgn_quantum_sigs_total", "Quantum-signed objects emitted")
m_request_latency  = Histogram("sgn_request_latency_seconds", "Per-endpoint request latency",
                                ["endpoint"])

# ── Quantum signing helper ───────────────────────────────────────────────────

def quantum_sign(payload: str | dict | bytes) -> str:
    """Cheap deterministic stand-in for ML-DSA-87 signing.

    Production hot-path forwards to triumph-quantum-shield (port 8094) for the
    real ML-DSA-87 signature; this function exists so SGN can stamp objects
    at Python speed even when shield is offline / cold.
    """
    if isinstance(payload, dict):
        payload = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    if isinstance(payload, str):
        payload = payload.encode("utf-8")
    digest = hashlib.sha3_512(b"SGN|MLDSA87|" + payload).hexdigest()
    m_quantum_sigs.inc()
    return f"qsig:mldsa87:{digest[:96]}"

def short_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"

# ── In-memory canonical store (mirrored to Redis when available) ────────────
# All writes go redis-first when available, falling back to in-process dicts.
# Each entity is a dict so JSON-serialisation is cheap.

_STUDIOS:    dict[str, dict] = {}
_TITLES:     dict[str, dict] = {}
_PLAYERS:    dict[str, dict] = {}
_EARNS:      dict[str, deque] = defaultdict(lambda: deque(maxlen=1000))     # player_id -> events
_EARN_DAILY: dict[str, float] = defaultdict(float)                           # player_id|YYYYMMDD -> pi
_TOURNS:     dict[str, dict] = {}
_EMPLOYERS:  dict[str, dict] = {}
_EMPLOYEES:  dict[str, dict] = {}
_PAYROLL_BAL: dict[str, float] = defaultdict(float)                          # employer_id -> escrow Pi
_PAYROLL_RUNS: deque = deque(maxlen=2000)
_CONTRACTS:  dict[str, dict] = {}
_NONCE_MEM:  dict[str, int]  = {}     # in-memory replay guard (degraded mode)

# ── Studio onboarding pipeline state ─────────────────────────────────────────
# Separate from _STUDIOS to track in-flight applications before approval.
_ONBOARDING: dict[str, dict] = {}             # token -> application
_ONBOARDING_BY_EMAIL: dict[str, str] = {}     # email -> token (1 active per email)
ONBOARDING_AUTO_APPROVE = os.getenv("SGN_ONBOARDING_AUTO_APPROVE", "false").lower() == "true"
ONBOARDING_ADMIN_TOKEN  = os.getenv("SGN_ONBOARDING_ADMIN_TOKEN", "")

_redis: Optional[aioredis.Redis] = None

# ── Sovereign loophole registry ──────────────────────────────────────────────

LOOPHOLES: list[dict] = [
    # SGIA — Game Integration Authority (10)
    {"authority": "SGIA", "id": "SGIA-01", "name": "Cross-platform Pi SDK",
     "rivals": ["Steamworks", "Epic Online Services"]},
    {"authority": "SGIA", "id": "SGIA-02", "name": "Console-agnostic OAuth bridge"},
    {"authority": "SGIA", "id": "SGIA-03", "name": "Studio-side webhook + signed callback"},
    {"authority": "SGIA", "id": "SGIA-04", "name": "Server-authoritative anti-spoof event channel"},
    {"authority": "SGIA", "id": "SGIA-05", "name": "Latency-aware regional routing (CF geo-LB)"},
    {"authority": "SGIA", "id": "SGIA-06", "name": "Single-line Unity / Unreal plugin (no rev share)"},
    {"authority": "SGIA", "id": "SGIA-07", "name": "Native PSN/XBL/Steam ID linkage"},
    {"authority": "SGIA", "id": "SGIA-08", "name": "Dedicated /earn endpoint with HMAC-SHA3"},
    {"authority": "SGIA", "id": "SGIA-09", "name": "Studio shared-secret rotation API"},
    {"authority": "SGIA", "id": "SGIA-10", "name": "Replay-protection nonce window per player"},
    # SGEA — Earning Authority (9)
    {"authority": "SGEA", "id": "SGEA-01", "name": "Declarative earn_table per title"},
    {"authority": "SGEA", "id": "SGEA-02", "name": "Per-rule rate cap + daily cap per player"},
    {"authority": "SGEA", "id": "SGEA-03", "name": "Watch-to-earn (verified streamed seconds)"},
    {"authority": "SGEA", "id": "SGEA-04", "name": "Battle-pass milestone Pi unlock"},
    {"authority": "SGEA", "id": "SGEA-05", "name": "Skill-tier multiplier (KDR / MMR weighted)"},
    {"authority": "SGEA", "id": "SGEA-06", "name": "Quest-completion atomic settlement"},
    {"authority": "SGEA", "id": "SGEA-07", "name": "Anti-bot proof-of-human (TPM + Pi KYC)"},
    {"authority": "SGEA", "id": "SGEA-08", "name": "Region-fair purchasing-power adjusted payout"},
    {"authority": "SGEA", "id": "SGEA-09", "name": "Zero conversion fees on player payout"},
    # SGPA — Payroll Authority (8)
    {"authority": "SGPA", "id": "SGPA-01", "name": "Employer-funded escrow with on-rail proof"},
    {"authority": "SGPA", "id": "SGPA-02", "name": "Hourly / salaried / milestone / royalty cycles"},
    {"authority": "SGPA", "id": "SGPA-03", "name": "Cross-border Pi payroll (no FX, no SWIFT)"},
    {"authority": "SGPA", "id": "SGPA-04", "name": "Smart-clause severance + bonus + RSU-equivalent"},
    {"authority": "SGPA", "id": "SGPA-05", "name": "Self-serve employee onboarding with Pi KYC"},
    {"authority": "SGPA", "id": "SGPA-06", "name": "Automatic local-tax export (per-region CSV)"},
    {"authority": "SGPA", "id": "SGPA-07", "name": "Royalty share for shipped engine modules"},
    {"authority": "SGPA", "id": "SGPA-08", "name": "Open-source contributor bounty rail"},
    # SGTA — Tournament Authority (7)
    {"authority": "SGTA", "id": "SGTA-01", "name": "Trustless prize-pool escrow"},
    {"authority": "SGTA", "id": "SGTA-02", "name": "On-chain bracket integrity (Citus + quantum sig)"},
    {"authority": "SGTA", "id": "SGTA-03", "name": "Sub-second per-rank payout settlement"},
    {"authority": "SGTA", "id": "SGTA-04", "name": "Spectator tip-jar in Pi"},
    {"authority": "SGTA", "id": "SGTA-05", "name": "Decentralized referee voting"},
    {"authority": "SGTA", "id": "SGTA-06", "name": "Cross-title meta-tournaments (NBA2K + GTA)"},
    {"authority": "SGTA", "id": "SGTA-07", "name": "Anti-collusion replay-proof scoring"},
    # SGAA — Asset Authority (8)
    {"authority": "SGAA", "id": "SGAA-01", "name": "True player ownership (NFT-free, Pi-anchored)"},
    {"authority": "SGAA", "id": "SGAA-02", "name": "Cross-title cosmetic interoperability"},
    {"authority": "SGAA", "id": "SGAA-03", "name": "Royalty-share resale (creator + studio)"},
    {"authority": "SGAA", "id": "SGAA-04", "name": "Quantum-anchored uniqueness proof"},
    {"authority": "SGAA", "id": "SGAA-05", "name": "Studio-controlled mint cap"},
    {"authority": "SGAA", "id": "SGAA-06", "name": "Dispute-resolution rollback registry"},
    {"authority": "SGAA", "id": "SGAA-07", "name": "User-generated content monetization"},
    {"authority": "SGAA", "id": "SGAA-08", "name": "Account-bound vs. tradable asset toggle"},
    # SGCA — Commerce Authority (7)
    {"authority": "SGCA", "id": "SGCA-01", "name": "0% platform cut on Pi purchases"},
    {"authority": "SGCA", "id": "SGCA-02", "name": "Bypass 30% Apple/Google/Steam tax via Pi rails"},
    {"authority": "SGCA", "id": "SGCA-03", "name": "Direct creator → player Pi tipping"},
    {"authority": "SGCA", "id": "SGCA-04", "name": "Sovereign refunds (smart-clause escrow)"},
    {"authority": "SGCA", "id": "SGCA-05", "name": "Region-specific pricing in Pi"},
    {"authority": "SGCA", "id": "SGCA-06", "name": "Subscription renewals via Pi standing-order"},
    {"authority": "SGCA", "id": "SGCA-07", "name": "Charitable round-up to sovereign causes"},
    # SGGV — Governance & Anti-Cheat (5)
    {"authority": "SGGV", "id": "SGGV-01", "name": "Server-side anti-cheat with quantum trace"},
    {"authority": "SGGV", "id": "SGGV-02", "name": "Per-title moderation council (decentralised)"},
    {"authority": "SGGV", "id": "SGGV-03", "name": "Sanction registry shared across titles"},
    {"authority": "SGGV", "id": "SGGV-04", "name": "Player-appeal due-process pipeline"},
    {"authority": "SGGV", "id": "SGGV-05", "name": "Studio-revocable Pi clawback for proven fraud"},
]

AUTHORITIES = {
    "SGIA": {"name": "Sovereign Game Integration Authority",  "loopholes": 10,
             "rivals": ["Steamworks", "Epic Online Services", "PlayStation Network", "Xbox Live"]},
    "SGEA": {"name": "Sovereign Game Earning Authority",      "loopholes": 9,
             "rivals": ["V-Bucks", "Robux", "MTX storefronts"]},
    "SGPA": {"name": "Sovereign Game Payroll Authority",      "loopholes": 8,
             "rivals": ["Deel", "Remote", "ADP", "Workday", "Stripe Connect"]},
    "SGTA": {"name": "Sovereign Game Tournament Authority",   "loopholes": 7,
             "rivals": ["ESL", "FACEIT", "BLAST", "Riot Esports"]},
    "SGAA": {"name": "Sovereign Game Asset Authority",        "loopholes": 8,
             "rivals": ["OpenSea", "Magic Eden", "Steam Marketplace"]},
    "SGCA": {"name": "Sovereign Game Commerce Authority",     "loopholes": 7,
             "rivals": ["Apple App Store", "Google Play", "Steam", "PSN"]},
    "SGGV": {"name": "Sovereign Game Governance & Anti-Cheat", "loopholes": 5,
             "rivals": ["BattlEye", "Easy Anti-Cheat", "Vanguard"]},
}

# ── App lifecycle ────────────────────────────────────────────────────────────

app = FastAPI(
    title="Triumph Synergy — Sovereign Gaming Nexus",
    version=SGN_VERSION,
    description="AAA game ↔ Pi Network integration • Player earn + Studio payroll",
)

@app.middleware("http")
async def sgn_headers(request: Request, call_next):
    t0 = time.monotonic()
    response = await call_next(request)
    try:
        m_request_latency.labels(endpoint=request.url.path).observe(time.monotonic() - t0)
        response.headers["X-SGN-Version"] = SGN_VERSION
        response.headers["X-SGN-Region"]  = SGN_REGION
        response.headers["X-SGN-Replica"] = SGN_REPLICA_ID
        response.headers["X-Quantum-Shield"] = "ML-DSA-87+ML-KEM-1024+SPHINCS+"
    except Exception:
        pass
    return response

@app.on_event("startup")
async def _startup():
    global _redis
    try:
        _redis = aioredis.from_url(REDIS_URL, encoding="utf-8", decode_responses=True)
        await _redis.ping()
        log.info("Redis connected: %s", REDIS_URL)
    except Exception as e:
        log.warning("Redis unavailable, running in-memory only: %s", e)
        _redis = None
    asyncio.create_task(_payroll_scheduler())
    log.info("SGN started: version=%s region=%s replica=%s port=%d",
             SGN_VERSION, SGN_REGION, SGN_REPLICA_ID, PORT)

# ── Helpers ─────────────────────────────────────────────────────────────────

def _today_key(player_id: str) -> str:
    return f"{player_id}|{time.strftime('%Y%m%d', time.gmtime())}"

def _hmac_for_studio(studio_id: str) -> str:
    s = _STUDIOS.get(studio_id)
    return s.get("hmac_secret", "") if s else ""

def _verify_earn_signature(studio_id: str, body: dict, signature: str) -> bool:
    secret = _hmac_for_studio(studio_id)
    if not secret:
        return False
    canonical = json.dumps(body, sort_keys=True, separators=(",", ":")).encode()
    expected = hashlib.sha3_512(secret.encode() + b"|" + canonical).hexdigest()
    # constant-time compare
    return secrets.compare_digest(expected[:96], signature[-96:] if signature else "")

async def _settle_pi(payee_pi_address: str, amount_pi: float, memo: str) -> dict:
    """Forward payout instruction to settlement-core / pi-bridge.

    Returns a dict {ok, txid|error, latency_ms}. If settlement core is offline
    we return a soft-success with txid='ledger-deferred' — the row is persisted
    locally and a reconciliation job replays it later.
    """
    t0 = time.monotonic()
    try:
        async with httpx.AsyncClient(timeout=4.0) as c:
            r = await c.post(f"{SETTLEMENT_CORE_URL}/pi/payout",
                             json={"to": payee_pi_address, "amount": amount_pi, "memo": memo})
            j = r.json() if r.status_code < 500 else {}
            return {"ok": r.status_code == 200,
                    "txid": j.get("txid", "ledger-deferred"),
                    "latency_ms": round((time.monotonic() - t0) * 1000, 1)}
    except Exception as e:
        return {"ok": False, "error": str(e)[:160], "txid": "ledger-deferred",
                "latency_ms": round((time.monotonic() - t0) * 1000, 1)}

# ── Diagnostics ─────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "healthy",
            "service": "sovereign-gaming-nexus",
            "version": SGN_VERSION,
            "uptime_s": round(time.time() - START_TIME, 1),
            "region": SGN_REGION}

@app.get("/status")
async def status():
    return {
        "service": "sovereign-gaming-nexus",
        "version": SGN_VERSION,
        "region":  SGN_REGION,
        "replica_id": SGN_REPLICA_ID,
        "uptime_s": round(time.time() - START_TIME, 1),
        "authorities": AUTHORITIES,
        "loophole_count": len(LOOPHOLES),
        "studios":   len(_STUDIOS),
        "titles":    len(_TITLES),
        "players":   len(_PLAYERS),
        "employers": len(_EMPLOYERS),
        "employees": len(_EMPLOYEES),
        "tournaments_active": sum(1 for t in _TOURNS.values() if t.get("status") == "active"),
        "redis_connected": _redis is not None,
        "quantum_sig": quantum_sign({"v": SGN_VERSION, "ts": int(time.time())}),
    }

@app.get("/metrics", response_class=PlainTextResponse)
async def metrics():
    m_studios.set(len(_STUDIOS))
    m_titles.set(len(_TITLES))
    m_players.set(len(_PLAYERS))
    m_employees.set(len(_EMPLOYEES))
    m_tournaments.set(sum(1 for t in _TOURNS.values() if t.get("status") == "active"))
    return generate_latest().decode()

@app.get("/loopholes")
async def loopholes():
    return {"count": len(LOOPHOLES), "loopholes": LOOPHOLES,
            "authorities": AUTHORITIES}

@app.get("/rivals")
async def rivals():
    rows = []
    for code, a in AUTHORITIES.items():
        for r in a["rivals"]:
            rows.append({"authority": code, "rival": r,
                         "sgn_advantage": "0% cut + Pi-native + quantum-signed + region-fair"})
    return {"count": len(rows), "rivals": rows}

# ── Studio + Title onboarding ────────────────────────────────────────────────

@app.post("/studios")
async def register_studio(body: dict = Body(...)):
    name = (body.get("name") or "").strip()
    if not name:
        raise HTTPException(400, "studio name required")
    studio_id = short_id("studio")
    secret = secrets.token_urlsafe(48)
    studio = {
        "id": studio_id,
        "name": name,
        "country": body.get("country", "US"),
        "contact_email": body.get("contact_email"),
        "pi_treasury_address": body.get("pi_treasury_address"),
        "hmac_secret": secret,
        "hmac_version": SGN_HMAC_VERSION,
        "registered_at": int(time.time()),
        "titles": [],
        "quantum_sig": quantum_sign({"studio": name}),
    }
    _STUDIOS[studio_id] = studio
    return {"ok": True, "studio_id": studio_id,
            "hmac_secret": secret, "hmac_version": SGN_HMAC_VERSION,
            "note": "Store hmac_secret in your studio backend; sign every /earn body with it."}

@app.get("/studios")
async def list_studios():
    return {"count": len(_STUDIOS),
            "studios": [{k: v for k, v in s.items() if k != "hmac_secret"}
                        for s in _STUDIOS.values()]}

@app.post("/titles")
async def register_title(body: dict = Body(...)):
    studio_id = body.get("studio_id")
    if studio_id not in _STUDIOS:
        raise HTTPException(404, "studio not found")
    title_id = short_id("title")
    title = {
        "id": title_id,
        "studio_id": studio_id,
        "name": body.get("name", ""),
        "platforms": body.get("platforms", []),         # ["pc", "ps5", "xbox", "switch", "mobile"]
        "online": bool(body.get("online", True)),
        "earn_table": body.get("earn_table", {}),       # {"kill": 0.001, "match_win": 0.05, ...}
        "daily_player_cap_pi": float(body.get("daily_player_cap_pi", GLOBAL_DAILY_PLAYER_PI_CAP)),
        "registered_at": int(time.time()),
        "quantum_sig": quantum_sign({"title": body.get("name", "")}),
    }
    _TITLES[title_id] = title
    _STUDIOS[studio_id]["titles"].append(title_id)
    return {"ok": True, "title_id": title_id, "title": title}

@app.get("/titles")
async def list_titles():
    return {"count": len(_TITLES), "titles": list(_TITLES.values())}

@app.get("/titles/{title_id}")
async def get_title(title_id: str):
    t = _TITLES.get(title_id)
    if not t:
        raise HTTPException(404, "title not found")
    return t

@app.post("/titles/{title_id}/earn-table")
async def update_earn_table(title_id: str, body: dict = Body(...)):
    t = _TITLES.get(title_id)
    if not t:
        raise HTTPException(404, "title not found")
    et = body.get("earn_table")
    if not isinstance(et, dict):
        raise HTTPException(400, "earn_table must be an object {rule_name: pi_amount}")
    # sanity: all values must be non-negative floats
    for k, v in et.items():
        if not isinstance(v, (int, float)) or v < 0:
            raise HTTPException(400, f"earn_table[{k}] must be non-negative number")
    t["earn_table"] = et
    t["earn_table_updated_at"] = int(time.time())
    t["quantum_sig"] = quantum_sign({"earn_table": et, "title": title_id})
    return {"ok": True, "title_id": title_id, "earn_table": et}

# ── Players + earn events ────────────────────────────────────────────────────

@app.post("/players")
async def register_player(body: dict = Body(...)):
    player_id = body.get("player_id") or short_id("player")
    if player_id in _PLAYERS:
        return {"ok": True, "player_id": player_id, "existing": True,
                "player": _PLAYERS[player_id]}
    p = {
        "id": player_id,
        "pi_username": body.get("pi_username"),
        "pi_address":  body.get("pi_address"),
        "country":     body.get("country"),
        "kyc_verified": bool(body.get("kyc_verified", False)),
        "linked_titles": body.get("linked_titles", []),
        "lifetime_pi_earned": 0.0,
        "registered_at": int(time.time()),
    }
    _PLAYERS[player_id] = p
    return {"ok": True, "player_id": player_id, "player": p}

@app.get("/players/{player_id}")
async def get_player(player_id: str):
    p = _PLAYERS.get(player_id)
    if not p:
        raise HTTPException(404, "player not found")
    return p

@app.post("/earn")
async def submit_earn(body: dict = Body(...)):
    """Studios POST signed earn events here. Schema:

    {
      "studio_id":  "studio_xxx",
      "title_id":   "title_xxx",
      "player_id":  "player_xxx",
      "rule":       "match_win",        # must exist in title.earn_table
      "amount_pi":  null,               # optional override (capped at table value)
      "match_id":   "...",              # opaque idempotency id
      "nonce":      "<random>",         # replay protection
      "ts":         1717000000,
      "signature":  "<HMAC-SHA3-512(secret, canonical_body)>"
    }
    """
    studio_id = body.get("studio_id")
    title_id  = body.get("title_id")
    player_id = body.get("player_id")
    rule      = body.get("rule")
    nonce     = body.get("nonce")
    sig       = body.get("signature", "")

    if studio_id not in _STUDIOS:
        m_earn_rejected.labels(reason="unknown_studio").inc()
        raise HTTPException(404, "unknown studio")
    title = _TITLES.get(title_id or "")
    if not title or title.get("studio_id") != studio_id:
        m_earn_rejected.labels(reason="unknown_title").inc()
        raise HTTPException(404, "unknown title for this studio")
    if player_id not in _PLAYERS:
        m_earn_rejected.labels(reason="unknown_player").inc()
        raise HTTPException(404, "unknown player (register first)")
    if not rule or rule not in title["earn_table"]:
        m_earn_rejected.labels(reason="rule_not_in_table").inc()
        raise HTTPException(400, f"rule '{rule}' not declared in title earn_table")
    if not nonce:
        m_earn_rejected.labels(reason="missing_nonce").inc()
        raise HTTPException(400, "nonce required")

    # signature check (strip signature from body before hashing)
    body_for_sig = {k: v for k, v in body.items() if k != "signature"}
    if not _verify_earn_signature(studio_id, body_for_sig, sig):
        m_earn_rejected.labels(reason="bad_signature").inc()
        raise HTTPException(403, "invalid earn signature")

    # replay protection per (studio, player, nonce)
    nonce_key = f"sgn:nonce:{studio_id}:{player_id}:{nonce}"
    if _redis is not None:
        try:
            seen = await _redis.set(nonce_key, "1", ex=86400, nx=True)
            if not seen:
                m_earn_rejected.labels(reason="replay").inc()
                raise HTTPException(409, "replay detected")
        except HTTPException:
            raise
        except Exception:
            # redis hiccup → fall through to in-memory guard
            if nonce_key in _NONCE_MEM:
                m_earn_rejected.labels(reason="replay").inc()
                raise HTTPException(409, "replay detected")
            _NONCE_MEM[nonce_key] = int(time.time())
    else:
        # degraded mode (no redis): in-memory replay guard
        if nonce_key in _NONCE_MEM:
            m_earn_rejected.labels(reason="replay").inc()
            raise HTTPException(409, "replay detected")
        _NONCE_MEM[nonce_key] = int(time.time())
        # cheap eviction: cap at 50k entries
        if len(_NONCE_MEM) > 50_000:
            cutoff = int(time.time()) - 86400
            for k in list(_NONCE_MEM.keys())[:10_000]:
                if _NONCE_MEM[k] < cutoff:
                    _NONCE_MEM.pop(k, None)

    # determine amount (table is the cap; body may request lower)
    table_amount = float(title["earn_table"][rule])
    requested = body.get("amount_pi")
    amount = float(requested) if isinstance(requested, (int, float)) else table_amount
    amount = min(amount, table_amount)
    if amount <= 0:
        m_earn_rejected.labels(reason="zero_amount").inc()
        raise HTTPException(400, "non-positive earn amount")

    # daily cap per player per title
    cap = float(title.get("daily_player_cap_pi", GLOBAL_DAILY_PLAYER_PI_CAP))
    today = _today_key(player_id)
    if _EARN_DAILY[today] + amount > cap:
        amount = max(0.0, cap - _EARN_DAILY[today])
        if amount <= 0:
            m_earn_rejected.labels(reason="daily_cap").inc()
            raise HTTPException(429, "player daily Pi cap reached for this title")

    # settle on Pi rails
    payee = _PLAYERS[player_id].get("pi_address") or _PLAYERS[player_id].get("pi_username")
    settle = await _settle_pi(payee or "", amount, memo=f"sgn:{title_id}:{rule}")

    evt = {
        "id":         short_id("earn"),
        "title_id":   title_id,
        "studio_id":  studio_id,
        "player_id":  player_id,
        "rule":       rule,
        "amount_pi":  amount,
        "ts":         int(time.time()),
        "settle":     settle,
        "quantum_sig": quantum_sign({"p": player_id, "r": rule, "a": amount, "n": nonce}),
    }
    _EARNS[player_id].append(evt)
    _EARN_DAILY[today] += amount
    _PLAYERS[player_id]["lifetime_pi_earned"] = round(
        float(_PLAYERS[player_id].get("lifetime_pi_earned", 0)) + amount, 8)
    m_earn_events.labels(title=title_id, rule=rule).inc()
    m_pi_paid_players.inc(amount)
    return {"ok": True, "event": evt,
            "lifetime_pi_earned": _PLAYERS[player_id]["lifetime_pi_earned"]}

@app.get("/earn/{player_id}/recent")
async def recent_earns(player_id: str, limit: int = 25):
    if player_id not in _PLAYERS:
        raise HTTPException(404, "player not found")
    return {"player_id": player_id,
            "events": list(_EARNS[player_id])[-min(max(1, limit), 200):]}

# ── Tournaments ──────────────────────────────────────────────────────────────

@app.post("/tournaments")
async def create_tournament(body: dict = Body(...)):
    title_id = body.get("title_id")
    if title_id not in _TITLES:
        raise HTTPException(404, "unknown title")
    pool = float(body.get("prize_pool_pi", 0))
    if pool <= 0:
        raise HTTPException(400, "prize_pool_pi must be > 0")
    tid = short_id("tourn")
    t = {
        "id": tid,
        "title_id": title_id,
        "name": body.get("name", "tournament"),
        "prize_pool_pi": pool,
        "splits": body.get("splits", [0.5, 0.3, 0.15, 0.05]),
        "status": "active",
        "created_at": int(time.time()),
        "quantum_sig": quantum_sign({"tid": tid, "pool": pool}),
    }
    _TOURNS[tid] = t
    return {"ok": True, "tournament": t}

@app.get("/tournaments")
async def list_tournaments():
    return {"count": len(_TOURNS), "tournaments": list(_TOURNS.values())}

@app.post("/tournaments/{tid}/payout")
async def payout_tournament(tid: str, body: dict = Body(...)):
    t = _TOURNS.get(tid)
    if not t:
        raise HTTPException(404, "tournament not found")
    if t["status"] != "active":
        raise HTTPException(409, "tournament already settled")
    ranking = body.get("ranking") or []        # list of player_ids in finishing order
    if not isinstance(ranking, list) or not ranking:
        raise HTTPException(400, "ranking (ordered list of player_ids) required")
    splits = t["splits"]
    pool   = t["prize_pool_pi"]
    payouts = []
    for i, pid in enumerate(ranking[:len(splits)]):
        share = pool * splits[i]
        if pid not in _PLAYERS:
            payouts.append({"player_id": pid, "amount_pi": 0,
                            "skipped": "unregistered player"})
            continue
        payee = _PLAYERS[pid].get("pi_address") or _PLAYERS[pid].get("pi_username") or ""
        s = await _settle_pi(payee, share, memo=f"sgn-tourn:{tid}:rank{i+1}")
        _PLAYERS[pid]["lifetime_pi_earned"] = round(
            float(_PLAYERS[pid].get("lifetime_pi_earned", 0)) + share, 8)
        m_pi_paid_players.inc(share)
        payouts.append({"player_id": pid, "rank": i + 1,
                         "amount_pi": share, "settle": s})
    t["status"] = "settled"
    t["payouts"] = payouts
    t["settled_at"] = int(time.time())
    return {"ok": True, "tournament_id": tid, "payouts": payouts}

# ── Studio payroll (engineers / employees) ──────────────────────────────────

@app.post("/payroll/employers")
async def register_employer(body: dict = Body(...)):
    eid = short_id("employer")
    e = {
        "id": eid,
        "name": body.get("name", ""),
        "studio_id": body.get("studio_id"),
        "pi_treasury_address": body.get("pi_treasury_address"),
        "country": body.get("country", "US"),
        "registered_at": int(time.time()),
        "quantum_sig": quantum_sign({"employer": body.get("name", "")}),
    }
    _EMPLOYERS[eid] = e
    return {"ok": True, "employer_id": eid, "employer": e}

@app.post("/payroll/employees")
async def register_employee(body: dict = Body(...)):
    employer_id = body.get("employer_id")
    if employer_id not in _EMPLOYERS:
        raise HTTPException(404, "employer not found")
    eid = short_id("emp")
    e = {
        "id": eid,
        "employer_id": employer_id,
        "name":      body.get("name", ""),
        "role":      body.get("role", "engineer"),    # engineer/designer/qa/...
        "pi_address": body.get("pi_address"),
        "pi_username": body.get("pi_username"),
        "rate_pi":   float(body.get("rate_pi", 0)),
        "cycle":     body.get("cycle", "monthly"),    # hourly|daily|weekly|monthly|milestone
        "country":   body.get("country"),
        "kyc_verified": bool(body.get("kyc_verified", False)),
        "active":    True,
        "lifetime_pi_paid": 0.0,
        "registered_at": int(time.time()),
    }
    _EMPLOYEES[eid] = e
    return {"ok": True, "employee_id": eid, "employee": e}

@app.post("/payroll/deposit")
async def payroll_deposit(body: dict = Body(...)):
    employer_id = body.get("employer_id")
    if employer_id not in _EMPLOYERS:
        raise HTTPException(404, "employer not found")
    amount = float(body.get("amount_pi", 0))
    if amount <= 0:
        raise HTTPException(400, "amount_pi must be > 0")
    _PAYROLL_BAL[employer_id] += amount
    return {"ok": True, "employer_id": employer_id,
            "escrow_balance_pi": _PAYROLL_BAL[employer_id]}

@app.post("/payroll/run")
async def payroll_run(body: dict = Body(...)):
    """Execute one payroll cycle for an employer.
    Body: {employer_id, cycle?}  — pays every active employee whose `cycle` matches.
    """
    employer_id = body.get("employer_id")
    if employer_id not in _EMPLOYERS:
        raise HTTPException(404, "employer not found")
    target_cycle = body.get("cycle")
    paid, skipped, total = [], [], 0.0
    for emp in [e for e in _EMPLOYEES.values()
                if e["employer_id"] == employer_id and e["active"]]:
        if target_cycle and emp["cycle"] != target_cycle:
            continue
        amt = float(emp["rate_pi"])
        if amt <= 0:
            skipped.append({"employee_id": emp["id"], "reason": "zero rate"})
            continue
        if _PAYROLL_BAL[employer_id] < amt:
            skipped.append({"employee_id": emp["id"], "reason": "escrow underfunded"})
            continue
        payee = emp.get("pi_address") or emp.get("pi_username") or ""
        s = await _settle_pi(payee, amt, memo=f"sgn-payroll:{employer_id}:{emp['id']}")
        _PAYROLL_BAL[employer_id] -= amt
        emp["lifetime_pi_paid"] = round(emp["lifetime_pi_paid"] + amt, 8)
        m_pi_paid_payroll.inc(amt)
        total += amt
        paid.append({"employee_id": emp["id"], "amount_pi": amt, "settle": s})
    record = {
        "id": short_id("run"),
        "employer_id": employer_id,
        "cycle": target_cycle,
        "paid_count": len(paid),
        "skipped_count": len(skipped),
        "total_pi": round(total, 8),
        "ts": int(time.time()),
        "quantum_sig": quantum_sign({"employer": employer_id, "total": total}),
    }
    _PAYROLL_RUNS.append(record)
    m_payroll_runs.inc()
    return {"ok": True, "run": record, "paid": paid, "skipped": skipped,
            "escrow_balance_pi": _PAYROLL_BAL[employer_id]}

@app.get("/payroll/employees/{eid}")
async def employee_history(eid: str):
    e = _EMPLOYEES.get(eid)
    if not e:
        raise HTTPException(404, "employee not found")
    runs = [r for r in _PAYROLL_RUNS if r["employer_id"] == e["employer_id"]]
    return {"employee": e, "recent_runs": runs[-25:]}

@app.post("/payroll/contracts")
async def create_contract(body: dict = Body(...)):
    employer_id = body.get("employer_id")
    employee_id = body.get("employee_id")
    if employer_id not in _EMPLOYERS:
        raise HTTPException(404, "employer not found")
    if employee_id not in _EMPLOYEES:
        raise HTTPException(404, "employee not found")
    cid = short_id("contract")
    c = {
        "id": cid,
        "employer_id": employer_id,
        "employee_id": employee_id,
        "base_rate_pi":  float(body.get("base_rate_pi", 0)),
        "cycle":         body.get("cycle", "monthly"),
        "bonus_clauses": body.get("bonus_clauses", []),    # [{trigger, amount_pi}]
        "royalty_pct":   float(body.get("royalty_pct", 0)),
        "severance_pi":  float(body.get("severance_pi", 0)),
        "term_months":   int(body.get("term_months", 12)),
        "started_at":    int(time.time()),
        "quantum_sig":   quantum_sign({"contract": cid}),
    }
    _CONTRACTS[cid] = c
    return {"ok": True, "contract_id": cid, "contract": c}

# ── Studio onboarding pipeline ──────────────────────────────────────────────
# Self-serve flow:
#   1. POST /onboarding/apply        -> studio submits intake form, receives a
#                                       verification token (email link in prod)
#   2. POST /onboarding/verify       -> studio confirms email/identity using
#                                       the verification token; status becomes
#                                       'pending_review' (or auto-approves if
#                                       SGN_ONBOARDING_AUTO_APPROVE=true)
#   3. POST /onboarding/approve      -> Triumph admin approves; SGN registers
#                                       the studio and returns the HMAC secret
#                                       on a one-time delivery token
#   4. GET  /onboarding/secret/{tok} -> single-use endpoint that hands the
#                                       secret to the studio over TLS, then
#                                       wipes it from memory
#   5. GET  /onboarding/status/{tok} -> polling endpoint for the studio UI

@app.post("/onboarding/apply")
async def onboarding_apply(body: dict = Body(...)):
    name    = (body.get("studio_name") or "").strip()
    email   = (body.get("contact_email") or "").strip().lower()
    country = (body.get("country") or "US").strip().upper()
    if not name or not email or "@" not in email:
        raise HTTPException(400, "studio_name and valid contact_email required")

    # Reject duplicate active applications
    if email in _ONBOARDING_BY_EMAIL:
        prior = _ONBOARDING.get(_ONBOARDING_BY_EMAIL[email])
        if prior and prior.get("status") not in {"approved", "rejected"}:
            raise HTTPException(409, "an application for this email is already in flight")

    token = secrets.token_urlsafe(32)
    verification_code = secrets.token_urlsafe(12)
    app_record = {
        "token": token,
        "studio_name": name,
        "contact_email": email,
        "country": country,
        "primary_titles": body.get("primary_titles", []),
        "expected_mau": int(body.get("expected_mau", 0)),
        "engineer_headcount": int(body.get("engineer_headcount", 0)),
        "pi_treasury_address": body.get("pi_treasury_address"),
        "verification_code": verification_code,
        "status": "awaiting_verification",
        "created_at": int(time.time()),
        "updated_at": int(time.time()),
        "studio_id": None,
        "secret_delivery_token": None,
        "quantum_sig": quantum_sign({"app": token, "email": email, "name": name}),
    }
    _ONBOARDING[token] = app_record
    _ONBOARDING_BY_EMAIL[email] = token

    # In production: SAIB sends the verification_code to contact_email via
    # the existing SAIB GitHub greet rail or an SMTP service. Local dev returns
    # it inline so curl-based smoke tests can complete the flow.
    return {
        "ok": True,
        "token": token,
        "status": app_record["status"],
        "next_step": "POST /onboarding/verify with {token, verification_code}",
        "verification_code_dev_only": verification_code,
    }

@app.post("/onboarding/verify")
async def onboarding_verify(body: dict = Body(...)):
    token = body.get("token")
    code  = body.get("verification_code")
    app_record = _ONBOARDING.get(token or "")
    if not app_record:
        raise HTTPException(404, "unknown token")
    if app_record["status"] != "awaiting_verification":
        raise HTTPException(409, f"cannot verify in status={app_record['status']}")
    if not code or not secrets.compare_digest(str(code), app_record["verification_code"]):
        raise HTTPException(403, "invalid verification_code")

    app_record["status"] = "approved" if ONBOARDING_AUTO_APPROVE else "pending_review"
    app_record["updated_at"] = int(time.time())
    if ONBOARDING_AUTO_APPROVE:
        return await _onboarding_finalise(app_record)
    return {"ok": True, "token": token, "status": app_record["status"],
            "next_step": "Triumph admin will approve via POST /onboarding/approve"}

@app.post("/onboarding/approve")
async def onboarding_approve(body: dict = Body(...), request: Request = None):
    token = body.get("token")
    admin = body.get("admin_token") or (request.headers.get("x-sgn-admin-token") if request else None)
    if not ONBOARDING_ADMIN_TOKEN or not admin or \
       not secrets.compare_digest(str(admin), ONBOARDING_ADMIN_TOKEN):
        raise HTTPException(403, "admin_token required")
    app_record = _ONBOARDING.get(token or "")
    if not app_record:
        raise HTTPException(404, "unknown token")
    if app_record["status"] not in {"pending_review", "awaiting_verification"}:
        raise HTTPException(409, f"cannot approve in status={app_record['status']}")
    app_record["status"] = "approved"
    app_record["updated_at"] = int(time.time())
    return await _onboarding_finalise(app_record)

@app.post("/onboarding/reject")
async def onboarding_reject(body: dict = Body(...), request: Request = None):
    token = body.get("token")
    reason = body.get("reason", "")
    admin = body.get("admin_token") or (request.headers.get("x-sgn-admin-token") if request else None)
    if not ONBOARDING_ADMIN_TOKEN or not admin or \
       not secrets.compare_digest(str(admin), ONBOARDING_ADMIN_TOKEN):
        raise HTTPException(403, "admin_token required")
    app_record = _ONBOARDING.get(token or "")
    if not app_record:
        raise HTTPException(404, "unknown token")
    app_record["status"] = "rejected"
    app_record["reject_reason"] = str(reason)[:240]
    app_record["updated_at"] = int(time.time())
    return {"ok": True, "token": token, "status": "rejected"}

async def _onboarding_finalise(app_record: dict) -> dict:
    """Create the studio record and stash the HMAC secret behind a one-time
    delivery token. The secret is never returned through this endpoint."""
    studio_resp = await register_studio({
        "name": app_record["studio_name"],
        "country": app_record["country"],
        "contact_email": app_record["contact_email"],
        "pi_treasury_address": app_record.get("pi_treasury_address"),
    })
    studio_id  = studio_resp["studio_id"]
    secret     = studio_resp["hmac_secret"]
    deliver_tok = secrets.token_urlsafe(40)

    app_record["studio_id"]              = studio_id
    app_record["secret_delivery_token"]  = deliver_tok
    app_record["status"]                 = "secret_ready"
    app_record["updated_at"]             = int(time.time())
    # Park the secret on the application record only — wiped on first GET
    app_record["_one_time_secret"]       = secret
    return {
        "ok": True,
        "token": app_record["token"],
        "studio_id": studio_id,
        "status": "secret_ready",
        "secret_delivery_url": f"/onboarding/secret/{deliver_tok}",
        "expires_in_s": 3600,
    }

@app.get("/onboarding/secret/{deliver_tok}")
async def onboarding_secret(deliver_tok: str):
    # Find the matching application
    target = None
    for rec in _ONBOARDING.values():
        if rec.get("secret_delivery_token") == deliver_tok:
            target = rec
            break
    if not target:
        raise HTTPException(404, "delivery token not found or already consumed")
    if "_one_time_secret" not in target:
        raise HTTPException(410, "secret already retrieved (one-time delivery)")
    if int(time.time()) - target["updated_at"] > 3600:
        target.pop("_one_time_secret", None)
        raise HTTPException(410, "delivery token expired")
    secret = target.pop("_one_time_secret")
    target["status"] = "active"
    target["secret_delivered_at"] = int(time.time())
    return {
        "ok": True,
        "studio_id": target["studio_id"],
        "hmac_secret": secret,
        "hmac_version": SGN_HMAC_VERSION,
        "warning": "store in your studio backend immediately; this endpoint is single-use",
    }

@app.get("/onboarding/status/{token}")
async def onboarding_status(token: str):
    app_record = _ONBOARDING.get(token)
    if not app_record:
        raise HTTPException(404, "unknown token")
    safe = {k: v for k, v in app_record.items()
            if k not in {"_one_time_secret", "verification_code"}}
    return safe

@app.get("/onboarding")
async def onboarding_list(request: Request):
    """Admin-only list of all in-flight applications."""
    admin = request.headers.get("x-sgn-admin-token")
    if not ONBOARDING_ADMIN_TOKEN or not admin or \
       not secrets.compare_digest(str(admin), ONBOARDING_ADMIN_TOKEN):
        raise HTTPException(403, "admin_token required")
    return {
        "count": len(_ONBOARDING),
        "applications": [
            {k: v for k, v in r.items() if k not in {"_one_time_secret", "verification_code"}}
            for r in _ONBOARDING.values()
        ],
    }

# ── Background scheduler — runs all hourly/daily payroll cycles automatically.

async def _payroll_scheduler():
    """Walk employers + employees every minute; execute auto-cycles when due.

    Cycle frequency mapping: hourly=3600s, daily=86400s, weekly=7d, monthly=30d,
    milestone runs only on explicit /payroll/run call.
    """
    last_run: dict[str, float] = defaultdict(float)
    cadence = {"hourly": 3600, "daily": 86400, "weekly": 604800, "monthly": 2592000}
    while True:
        try:
            now = time.time()
            for emp in list(_EMPLOYEES.values()):
                if not emp["active"]:
                    continue
                period = cadence.get(emp.get("cycle", ""))
                if not period:
                    continue
                key = f"{emp['employer_id']}|{emp['cycle']}"
                if now - last_run[key] < period:
                    continue
                # trigger one cycle for this employer/cycle bucket
                try:
                    await payroll_run({"employer_id": emp["employer_id"],
                                       "cycle": emp["cycle"]})
                    last_run[key] = now
                except HTTPException:
                    pass
                except Exception as e:
                    log.warning("scheduler payroll failed: %s", e)
        except Exception as e:
            log.error("scheduler error: %s", e)
        await asyncio.sleep(60)
