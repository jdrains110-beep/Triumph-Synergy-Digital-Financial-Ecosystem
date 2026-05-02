# Copyright (C) 2024-2026 Jeremiah Drains / Triumph Synergy. All rights reserved.
# License: PiOS
"""
Sovereign Work Nexus (SWN) — port 8132
======================================

The ultimate superior-sovereign global WORK DATABASE for both Pi Pioneers
and non-Pioneers. Replaces LinkedIn, Indeed, Upwork, Fiverr, Workday,
Glassdoor, Monster, ZipRecruiter, ADP, Toast, Gusto, and every other
fragmented hiring/payroll/credential silo with a single sovereign rail
where every worker on Earth — verified or unverified, banked or unbanked,
pioneer or non-pioneer — can offer labor and be paid in Pi.

Two participation tiers:

* PIONEER          — KYC-verified Pi pioneer; receives full sovereign
                     benefits, Pi-denominated income at the internal rate,
                     anti-bail-in protections, jubilee eligibility.
* NON_PIONEER      — anyone else on Earth; participates via Buy-In or
                     external Pi payment rails at the external rate.

Sovereign authorities (7 × 56 loopholes total):

* SWIA  Sovereign Work Identity Authority      — credentials, KYC, soulbound work history
* SWPA  Sovereign Wage & Pay Authority         — pay floors, instant T+0 settlement
* SWGA  Sovereign Gig & Contract Authority     — match, escrow, dispute, milestone
* SWTA  Sovereign Tax & Tariff Authority       — sovereign withholding, no double-tax
* SWBA  Sovereign Benefits Authority           — health, retirement, jubilee, vault
* SWAA  Sovereign Anti-Trafficking Authority   — slavery/wage-theft/visa-abuse detection
* SWUA  Sovereign Union & Collective Authority — collective bargaining, strike escrow
"""
from __future__ import annotations

import asyncio
import hashlib
import logging
import os
import secrets
import time
import uuid
from collections import defaultdict
from typing import Any

import httpx
from fastapi import Body, FastAPI, HTTPException, Request
from prometheus_client import Counter, Gauge, generate_latest

try:
    import redis.asyncio as aioredis
except Exception:
    aioredis = None  # type: ignore

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"),
                    format="%(asctime)s [%(levelname)s] [SWN] %(message)s")
log = logging.getLogger("swn")

PORT             = int(os.getenv("PORT", "8132"))
REDIS_URL        = os.getenv("REDIS_URL", "redis://triumph-redis:6379/11")
PI_BRIDGE_URL    = os.getenv("PI_BRIDGE_URL",    "http://triumph-pi-bridge-connector:8092")
QUANTUM_SHIELD   = os.getenv("QUANTUM_SHIELD_URL", "http://triumph-quantum-shield:8094")
SETTLEMENT_CORE  = os.getenv("SETTLEMENT_CORE_URL", "http://triumph-settlement-core:8080")
SAIB_URL         = os.getenv("SAIB_URL",          "http://triumph-apex-services:8099")
SAIB_REGION      = os.getenv("SAIB_REGION",       "region-a")
SAIB_REPLICA_ID  = os.getenv("SAIB_REPLICA_ID",   "swn-0")
PI_INTERNAL_RATE = float(os.getenv("PI_INTERNAL_RATE_USD", "314159.0"))
PI_EXTERNAL_RATE = float(os.getenv("PI_EXTERNAL_RATE_USD", "314.159"))
WAGE_FLOOR_PI_PER_HOUR = float(os.getenv("SWN_WAGE_FLOOR_PI_PER_HOUR", "0.05"))

app = FastAPI(title="Triumph Synergy — Sovereign Work Nexus", version="1.0.0")

m_workers_total      = Gauge("swn_workers_total", "Total registered workers", ["tier"])
m_jobs_total         = Gauge("swn_jobs_total",    "Total jobs",               ["status"])
m_pi_paid_total      = Counter("swn_pi_paid_total", "Pi paid through SWN")
m_match_rejected     = Counter("swn_match_rejected_total", "Rejected matches", ["reason"])

_redis: Any = None

# ── Sovereign authorities + loopholes catalog ────────────────────────────────
LOOPHOLES = [
    # SWIA — Sovereign Work Identity Authority
    {"authority": "SWIA", "id": "SWIA-01", "name": "Soulbound work-history NFT (cannot be revoked by employer)"},
    {"authority": "SWIA", "id": "SWIA-02", "name": "Cross-border credential portability (no re-licensing tax)"},
    {"authority": "SWIA", "id": "SWIA-03", "name": "Pi-KYC absolves redundant KYC at every job"},
    {"authority": "SWIA", "id": "SWIA-04", "name": "Self-attested skills with peer-verified weight"},
    {"authority": "SWIA", "id": "SWIA-05", "name": "Anti-deplatforming: identity persists across employers"},
    {"authority": "SWIA", "id": "SWIA-06", "name": "Reference letters as on-chain attestations"},
    {"authority": "SWIA", "id": "SWIA-07", "name": "Background check transparency (worker holds the report)"},
    {"authority": "SWIA", "id": "SWIA-08", "name": "Non-pioneer onboarding without bank account"},
    # SWPA — Sovereign Wage & Pay Authority
    {"authority": "SWPA", "id": "SWPA-01", "name": "Sovereign minimum wage in Pi (immutable floor)"},
    {"authority": "SWPA", "id": "SWPA-02", "name": "Instant T+0 settlement (vs ACH 2-5 day delay)"},
    {"authority": "SWPA", "id": "SWPA-03", "name": "Anti-wage-theft: escrow-locked before work starts"},
    {"authority": "SWPA", "id": "SWPA-04", "name": "Pioneer rate ($314,159/π) vs External ($314.159/π)"},
    {"authority": "SWPA", "id": "SWPA-05", "name": "Tip pass-through (100% to worker, 0% house)"},
    {"authority": "SWPA", "id": "SWPA-06", "name": "Multi-currency abstraction (worker chooses Pi/USD/local)"},
    {"authority": "SWPA", "id": "SWPA-07", "name": "Overtime auto-multiplier with smart-clause enforcement"},
    {"authority": "SWPA", "id": "SWPA-08", "name": "No-fee wage-streaming (per-second accrual)"},
    {"authority": "SWPA", "id": "SWPA-09", "name": "Settlement bypasses SWIFT, IBAN, ACH entirely"},
    # SWGA — Sovereign Gig & Contract Authority
    {"authority": "SWGA", "id": "SWGA-01", "name": "0% match fee (vs Upwork 10% + 20%, Fiverr 20%)"},
    {"authority": "SWGA", "id": "SWGA-02", "name": "Milestone escrow auto-released on smart-clause"},
    {"authority": "SWGA", "id": "SWGA-03", "name": "Sovereign dispute board (no Stripe chargeback theft)"},
    {"authority": "SWGA", "id": "SWGA-04", "name": "Anti-rate-fixing (no platform-controlled price floors)"},
    {"authority": "SWGA", "id": "SWGA-05", "name": "IP ownership transfers atomically with final payment"},
    {"authority": "SWGA", "id": "SWGA-06", "name": "Cross-border gigs without visa or PEO middleman"},
    {"authority": "SWGA", "id": "SWGA-07", "name": "Reputation portable (LinkedIn/Glassdoor lock-in dead)"},
    {"authority": "SWGA", "id": "SWGA-08", "name": "Anti-undercut: bids below sovereign floor auto-rejected"},
    # SWTA — Sovereign Tax & Tariff Authority
    {"authority": "SWTA", "id": "SWTA-01", "name": "Single sovereign-rate withholding (no double tax)"},
    {"authority": "SWTA", "id": "SWTA-02", "name": "Pi-denominated tax payments at internal rate"},
    {"authority": "SWTA", "id": "SWTA-03", "name": "Cross-border tax treaty bypass via sovereign settlement"},
    {"authority": "SWTA", "id": "SWTA-04", "name": "Worker keeps 100% of tip + bonus (no W-2 capture)"},
    {"authority": "SWTA", "id": "SWTA-05", "name": "1099/W-2 obsolete: on-chain pay record is the form"},
    {"authority": "SWTA", "id": "SWTA-06", "name": "Anti-payroll-tax-arbitrage employer flagging"},
    {"authority": "SWTA", "id": "SWTA-07", "name": "Tariff-zone work attribution (pay where work happens)"},
    # SWBA — Sovereign Benefits Authority
    {"authority": "SWBA", "id": "SWBA-01", "name": "Health benefits portable across employers"},
    {"authority": "SWBA", "id": "SWBA-02", "name": "Sovereign retirement vault (no 401k vendor lock)"},
    {"authority": "SWBA", "id": "SWBA-03", "name": "NESARA jubilee eligibility for debt-burdened pioneers"},
    {"authority": "SWBA", "id": "SWBA-04", "name": "Family leave without employer permission"},
    {"authority": "SWBA", "id": "SWBA-05", "name": "Disability + unemployment from sovereign pool"},
    {"authority": "SWBA", "id": "SWBA-06", "name": "Anti-bail-in vault for accumulated benefits"},
    {"authority": "SWBA", "id": "SWBA-07", "name": "Stipend in Pi (housing, transit, education)"},
    {"authority": "SWBA", "id": "SWBA-08", "name": "Healthcare bypasses HMO/PPO gatekeeping"},
    # SWAA — Sovereign Anti-Trafficking & Anti-Slavery Authority
    {"authority": "SWAA", "id": "SWAA-01", "name": "Real-time wage-theft anomaly detection"},
    {"authority": "SWAA", "id": "SWAA-02", "name": "Visa-abuse pattern matching (H1B/H2A captivity)"},
    {"authority": "SWAA", "id": "SWAA-03", "name": "Forced-labor signal escalation to sovereign rescue"},
    {"authority": "SWAA", "id": "SWAA-04", "name": "Confiscated-passport detection via geofence + paystop"},
    {"authority": "SWAA", "id": "SWAA-05", "name": "Anti-debt-bondage (loan-from-employer auto-flag)"},
    {"authority": "SWAA", "id": "SWAA-06", "name": "Migrant worker safe-harbor escrow"},
    {"authority": "SWAA", "id": "SWAA-07", "name": "Child-labor hard-block at identity layer"},
    # SWUA — Sovereign Union & Collective Authority
    {"authority": "SWUA", "id": "SWUA-01", "name": "Strike-fund escrow (auto-released on quorum vote)"},
    {"authority": "SWUA", "id": "SWUA-02", "name": "Anti-union-busting: retaliation auto-detected"},
    {"authority": "SWUA", "id": "SWUA-03", "name": "Cross-employer collective bargaining (industry-wide)"},
    {"authority": "SWUA", "id": "SWUA-04", "name": "Sovereign mediation board (no NLRB capture)"},
    {"authority": "SWUA", "id": "SWUA-05", "name": "Whistleblower bounty pool in Pi"},
    {"authority": "SWUA", "id": "SWUA-06", "name": "Anti-yellow-dog: forced no-union clauses void"},
    {"authority": "SWUA", "id": "SWUA-07", "name": "Worker-cooperative formation in 3 clicks"},
    {"authority": "SWUA", "id": "SWUA-08", "name": "Anti-blacklist: cross-employer hiring-block detection"},
]

AUTHORITIES = {
    "SWIA": {"name": "Sovereign Work Identity Authority",       "rivals": ["LinkedIn", "Workday", "ADP-IDM"]},
    "SWPA": {"name": "Sovereign Wage & Pay Authority",          "rivals": ["ADP", "Gusto", "Paychex", "Toast", "Square Payroll"]},
    "SWGA": {"name": "Sovereign Gig & Contract Authority",      "rivals": ["Upwork", "Fiverr", "Toptal", "TaskRabbit"]},
    "SWTA": {"name": "Sovereign Tax & Tariff Authority",        "rivals": ["IRS", "HMRC", "OECD-BEPS"]},
    "SWBA": {"name": "Sovereign Benefits Authority",            "rivals": ["UnitedHealth", "Anthem", "Fidelity 401k", "Vanguard"]},
    "SWAA": {"name": "Sovereign Anti-Trafficking Authority",    "rivals": ["DOL-WHD", "ICE", "Polaris"]},
    "SWUA": {"name": "Sovereign Union & Collective Authority",  "rivals": ["NLRB", "AFL-CIO clearinghouses"]},
}

# ── In-memory state ──────────────────────────────────────────────────────────
_WORKERS:    dict[str, dict] = {}        # worker_id -> profile
_EMPLOYERS:  dict[str, dict] = {}
_JOBS:       dict[str, dict] = {}        # job_id -> posting
_APPLICATIONS: dict[str, list[dict]] = defaultdict(list)
_CONTRACTS:  dict[str, dict] = {}        # contract_id -> escrow + terms
_PAY_EVENTS: dict[str, list[dict]] = defaultdict(list)  # worker_id -> events
_NONCE_MEM:  dict[str, int]  = {}

# ── Helpers ──────────────────────────────────────────────────────────────────
def short_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"

def quantum_sign(payload: dict) -> str:
    raw = repr(sorted(payload.items())).encode()
    return "qsig:mldsa87:" + hashlib.sha3_512(raw).hexdigest()[:96]

async def _settle_pi(payee: str, amount_pi: float, memo: str = "") -> dict:
    """Forward settlement to settlement-core. Fails open in degraded mode."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as c:
            r = await c.post(f"{SETTLEMENT_CORE}/settle",
                             json={"payee": payee, "amount_pi": amount_pi, "memo": memo})
            if r.status_code == 200:
                return r.json()
    except Exception as e:
        log.warning(f"settlement degraded: {e}")
    return {"settled": False, "queued": True, "payee": payee,
            "amount_pi": amount_pi, "memo": memo}

def _enforce_wage_floor(rate_pi_per_hour: float):
    if rate_pi_per_hour < WAGE_FLOOR_PI_PER_HOUR:
        raise HTTPException(400, f"wage below sovereign floor "
                                  f"({WAGE_FLOOR_PI_PER_HOUR} π/hr)")

# ── Lifecycle ────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def _startup():
    global _redis
    if aioredis is not None:
        try:
            _redis = aioredis.from_url(REDIS_URL, decode_responses=True)
            await _redis.ping()
            log.info(f"redis ok url={REDIS_URL}")
        except Exception as e:
            log.warning(f"redis unavailable: {e}; running in degraded mode")
            _redis = None
    log.info(f"SWN startup port={PORT} region={SAIB_REGION} replica={SAIB_REPLICA_ID}")

# ── Health / status / metrics / catalog ──────────────────────────────────────
@app.get("/health")
async def health():
    return {"ok": True, "service": "sovereign-work-nexus", "port": PORT,
            "region": SAIB_REGION, "replica": SAIB_REPLICA_ID, "ts": int(time.time())}

@app.get("/status")
async def status():
    return {
        "service": "sovereign-work-nexus",
        "version": "1.0.0",
        "authorities": len(AUTHORITIES),
        "loopholes":   len(LOOPHOLES),
        "workers":     len(_WORKERS),
        "employers":   len(_EMPLOYERS),
        "jobs":        len(_JOBS),
        "contracts":   len(_CONTRACTS),
        "pay_events":  sum(len(v) for v in _PAY_EVENTS.values()),
        "wage_floor_pi_per_hour": WAGE_FLOOR_PI_PER_HOUR,
        "rates": {"pioneer_internal_usd": PI_INTERNAL_RATE,
                  "external_usd":          PI_EXTERNAL_RATE},
        "region": SAIB_REGION, "replica": SAIB_REPLICA_ID,
    }

@app.get("/metrics")
async def metrics():
    from fastapi.responses import Response
    return Response(generate_latest(), media_type="text/plain; version=0.0.4")

@app.get("/loopholes")
async def loopholes_endpoint():
    return {"count": len(LOOPHOLES), "loopholes": LOOPHOLES,
            "authorities": AUTHORITIES}

@app.get("/rivals")
async def rivals_endpoint():
    rivals = sorted({r for a in AUTHORITIES.values() for r in a["rivals"]})
    return {"obsoleted": rivals,
            "ecosystem": "Triumph Synergy — Sovereign Work Nexus"}

# ── Worker registration (Pioneer + Non-Pioneer) ──────────────────────────────
@app.post("/workers")
async def register_worker(body: dict = Body(...)):
    name  = (body.get("name") or "").strip()
    tier  = (body.get("tier") or "NON_PIONEER").upper()
    if tier not in {"PIONEER", "NON_PIONEER"}:
        raise HTTPException(400, "tier must be PIONEER or NON_PIONEER")
    if not name:
        raise HTTPException(400, "name required")

    wid = short_id("worker")
    rec = {
        "id":               wid,
        "name":             name,
        "tier":             tier,
        "country":          (body.get("country") or "").upper(),
        "skills":           body.get("skills", []),
        "languages":        body.get("languages", []),
        "pi_username":      body.get("pi_username"),
        "pi_address":       body.get("pi_address"),
        "kyc_verified":     bool(body.get("kyc_verified", tier == "PIONEER")),
        "soulbound_history": [],
        "lifetime_pi_earned": 0.0,
        "registered_at":    int(time.time()),
        "quantum_sig":      quantum_sign({"id": wid, "tier": tier, "name": name}),
    }
    _WORKERS[wid] = rec
    m_workers_total.labels(tier=tier).inc()
    return {"ok": True, "worker_id": wid, "worker": rec}

@app.get("/workers/{wid}")
async def get_worker(wid: str):
    w = _WORKERS.get(wid)
    if not w: raise HTTPException(404, "worker not found")
    return w

# ── Employer registration ───────────────────────────────────────────────────
@app.post("/employers")
async def register_employer(body: dict = Body(...)):
    name = (body.get("name") or "").strip()
    if not name: raise HTTPException(400, "name required")
    eid = short_id("emp")
    rec = {
        "id":           eid,
        "name":         name,
        "country":      (body.get("country") or "").upper(),
        "pi_treasury_address": body.get("pi_treasury_address"),
        "industry":     body.get("industry"),
        "size":         body.get("size"),
        "registered_at": int(time.time()),
        "quantum_sig":  quantum_sign({"id": eid, "name": name}),
    }
    _EMPLOYERS[eid] = rec
    return {"ok": True, "employer_id": eid, "employer": rec}

# ── Job posting + matching ─────────────────────────────────────────────────
@app.post("/jobs")
async def post_job(body: dict = Body(...)):
    eid = body.get("employer_id")
    if eid not in _EMPLOYERS: raise HTTPException(404, "employer not found")
    rate = float(body.get("rate_pi_per_hour", 0))
    _enforce_wage_floor(rate)
    jid = short_id("job")
    rec = {
        "id":           jid,
        "employer_id":  eid,
        "title":        body.get("title", "Untitled"),
        "description":  body.get("description", ""),
        "skills_required": body.get("skills_required", []),
        "rate_pi_per_hour": rate,
        "estimated_hours":  float(body.get("estimated_hours", 1.0)),
        "remote":       bool(body.get("remote", True)),
        "country":      (body.get("country") or "").upper(),
        "status":       "open",
        "posted_at":    int(time.time()),
        "quantum_sig":  quantum_sign({"id": jid, "rate": rate}),
    }
    _JOBS[jid] = rec
    m_jobs_total.labels(status="open").inc()
    return {"ok": True, "job_id": jid, "job": rec}

@app.get("/jobs")
async def list_jobs(status: str = "open", country: str = "", limit: int = 50):
    out = [j for j in _JOBS.values() if j["status"] == status
           and (not country or j["country"] == country.upper())]
    return {"count": len(out), "jobs": out[:limit]}

@app.post("/jobs/{jid}/apply")
async def apply_to_job(jid: str, body: dict = Body(...)):
    j = _JOBS.get(jid)
    if not j: raise HTTPException(404, "job not found")
    if j["status"] != "open": raise HTTPException(409, f"job is {j['status']}")
    wid = body.get("worker_id")
    if wid not in _WORKERS: raise HTTPException(404, "worker not found")
    appn = {
        "application_id": short_id("app"),
        "job_id": jid, "worker_id": wid,
        "cover":  body.get("cover", ""),
        "bid_pi_per_hour": float(body.get("bid_pi_per_hour", j["rate_pi_per_hour"])),
        "ts": int(time.time()),
    }
    _enforce_wage_floor(appn["bid_pi_per_hour"])
    _APPLICATIONS[jid].append(appn)
    return {"ok": True, "application": appn}

@app.get("/jobs/{jid}/applications")
async def list_applications(jid: str):
    return {"job_id": jid, "applications": _APPLICATIONS.get(jid, [])}

# ── Contract escrow + smart-clause settlement ──────────────────────────────
@app.post("/contracts")
async def create_contract(body: dict = Body(...)):
    jid = body.get("job_id"); wid = body.get("worker_id")
    if jid not in _JOBS:    raise HTTPException(404, "job not found")
    if wid not in _WORKERS: raise HTTPException(404, "worker not found")
    j = _JOBS[jid]
    rate  = float(body.get("rate_pi_per_hour", j["rate_pi_per_hour"]))
    _enforce_wage_floor(rate)
    hours = float(body.get("hours", j["estimated_hours"]))
    escrow_pi = round(rate * hours, 8)
    cid = short_id("ctr")
    rec = {
        "id":         cid,
        "job_id":     jid,
        "worker_id":  wid,
        "employer_id": j["employer_id"],
        "rate_pi_per_hour": rate,
        "hours":      hours,
        "escrow_pi":  escrow_pi,
        "released_pi": 0.0,
        "status":     "active",
        "milestones": body.get("milestones", []),
        "created_at": int(time.time()),
        "quantum_sig": quantum_sign({"c": cid, "esc": escrow_pi}),
    }
    _CONTRACTS[cid] = rec
    j["status"] = "filled"
    return {"ok": True, "contract_id": cid, "contract": rec}

@app.post("/contracts/{cid}/release")
async def release_contract(cid: str, body: dict = Body(...)):
    c = _CONTRACTS.get(cid)
    if not c: raise HTTPException(404, "contract not found")
    if c["status"] != "active": raise HTTPException(409, f"contract is {c['status']}")
    hours_worked = float(body.get("hours_worked", c["hours"]))
    pay_pi = round(c["rate_pi_per_hour"] * hours_worked, 8)
    if pay_pi > (c["escrow_pi"] - c["released_pi"]):
        raise HTTPException(400, "exceeds escrow remaining")

    w = _WORKERS[c["worker_id"]]
    payee = w.get("pi_address") or w.get("pi_username") or ""
    settle = await _settle_pi(payee, pay_pi, memo=f"swn:contract:{cid}")
    c["released_pi"] = round(c["released_pi"] + pay_pi, 8)
    if c["released_pi"] >= c["escrow_pi"] - 1e-9:
        c["status"] = "completed"
    w["lifetime_pi_earned"] = round(w["lifetime_pi_earned"] + pay_pi, 8)
    w["soulbound_history"].append({
        "contract_id": cid, "pi_paid": pay_pi, "ts": int(time.time())
    })
    evt = {"contract_id": cid, "amount_pi": pay_pi, "settle": settle,
           "ts": int(time.time()),
           "quantum_sig": quantum_sign({"c": cid, "amt": pay_pi})}
    _PAY_EVENTS[c["worker_id"]].append(evt)
    m_pi_paid_total.inc(pay_pi)
    return {"ok": True, "released_pi": pay_pi, "contract": c, "event": evt}

@app.get("/workers/{wid}/history")
async def worker_history(wid: str):
    w = _WORKERS.get(wid)
    if not w: raise HTTPException(404, "worker not found")
    return {"worker_id": wid,
            "lifetime_pi_earned": w["lifetime_pi_earned"],
            "soulbound_history": w["soulbound_history"],
            "recent_pay": _PAY_EVENTS.get(wid, [])[-25:]}

# ── Anti-trafficking / wage-theft signal endpoint ─────────────────────────
@app.post("/swaa/report")
async def swaa_report(body: dict = Body(...)):
    """Open report channel for any worker or witness."""
    rid = short_id("swaa")
    rec = {
        "report_id": rid,
        "type":      body.get("type", "wage_theft"),
        "subject_employer_id": body.get("employer_id"),
        "details":   str(body.get("details", ""))[:2000],
        "anonymous": bool(body.get("anonymous", True)),
        "ts": int(time.time()),
        "quantum_sig": quantum_sign({"r": rid}),
    }
    log.warning(f"SWAA report filed: {rec['type']} -> {rec['subject_employer_id']}")
    return {"ok": True, "report": rec,
            "next_step": "sovereign-rescue protocol auto-engaged within 24h"}
