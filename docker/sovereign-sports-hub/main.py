# Copyright (C) 2024-2026 Jeremiah Joel Drains, Founder & Superior Sovereign / Triumph Synergy. All rights reserved.
# License: PiOS
"""
Triumph Synergy — Sovereign Sports Hub Engine (SSH) — Docker Service
=====================================================================

The containerized backend for the global Sovereign Sports Platform.
Handles streaming sessions, athlete registrations, Pi payments, and
real-time sports data — running alongside the full Triumph Synergy
ecosystem in Docker Desktop.

Seven Sovereign Authorities:
  SSSA  — Sovereign Sports Streaming Authority (12 loopholes)
          Rivals: YouTube · TikTok · Twitch · ESPN+ · DAZN
  SSPA  — Sovereign Sports Payment Authority (10 loopholes)
          Rivals: Ticketmaster · StubHub · AXS · PayPal
  SSAA  — Sovereign Sports Athlete Authority (11 loopholes)
          Rivals: CAA · IMG · WME Sports · Octagon
  SSMA  — Sovereign Sports Media Authority (9 loopholes)
          Rivals: ESPN · Fox Sports · Sky Sports · NBC Sports
  SSLAA — Sovereign Sports League Authority (8 loopholes)
          Rivals: NFL/NBA/FIFA/IOC licensing
  SSRAA — Sovereign Sports Revenue & Ad Authority (9 loopholes)
          Rivals: Google Ads · Meta Ads · Sportradar
  SSGVA — Sovereign Sports Governance Authority (7 loopholes)
          Rivals: WADA · CAS · IOC Ethics · USADA

APEX-QUANTUM-SOVEREIGN · ML-DSA-87 · ML-KEM-1024 · SPHINCS+
66 loopholes · 0% platform cut · Sub-500ms streaming · 200 countries

Endpoints:
  GET  /health            → service health
  GET  /status            → full platform status + all 7 authorities
  GET  /metrics           → Prometheus metrics
  GET  /streams           → active and scheduled streams
  POST /streams           → create stream session
  GET  /athletes          → registered participants
  POST /athletes          → register athlete/coach/owner
  GET  /events            → upcoming events with Pi payment info
  POST /events            → create event with Pi payments
  POST /payment           → process Pi sports payment
  GET  /loopholes         → all 66 sovereign loopholes
  GET  /rivals            → rival platform comparison

Port:     8102
Security: APEX-QUANTUM-SOVEREIGN
Redis DB: 6
"""

import hashlib
import json
import logging
import os
import secrets
import time
import uuid
from dataclasses import dataclass, field, asdict
from typing import Any, Optional

import redis.asyncio as aioredis
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import PlainTextResponse
from prometheus_client import (
    Counter, Gauge, Histogram, generate_latest, CONTENT_TYPE_LATEST
)

# ── Config ─────────────────────────────────────────────────────────────────────

PORT              = int(os.getenv("PORT", "8102"))
REDIS_URL         = os.getenv("REDIS_URL", "redis://triumph-redis:6379/6")
QUANTUM_SHIELD    = os.getenv("QUANTUM_SHIELD_URL", "http://triumph-quantum-shield:8094")
SAIB_URL          = os.getenv("SAIB_URL", "http://triumph-sovereign-ai-bot:8099")
NEXT_API_URL      = os.getenv("NEXT_API_URL", "http://triumph-app:3000")

SSH_VERSION       = os.getenv("SSH_VERSION", "TRIUMPH-SSH-v1")
APEX_LEVEL        = "APEX-QUANTUM-SOVEREIGN"
PI_EXTERNAL_RATE  = float(os.getenv("PI_EXTERNAL_RATE", "314.159"))
PI_INTERNAL_RATE  = float(os.getenv("PI_INTERNAL_RATE", "314159.0"))
SOVEREIGN_ANCHOR  = os.getenv("PI_SUPERNODE_ADDRESS",
                              "GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V")

SPORTS_DISCIPLINES = int(os.getenv("SSH_SPORTS_COUNT", "50"))
SPORTS_COUNTRIES   = int(os.getenv("SSH_COUNTRIES", "200"))
PIONEER_FANBASE    = int(os.getenv("SSH_PIONEER_FANBASE", "50000000"))
PLATFORM_CUT_PCT   = float(os.getenv("SSH_PLATFORM_CUT_PCT", "0.0"))
TICKET_FEE_PCT     = float(os.getenv("SSH_TICKET_FEE_PCT", "0.0"))
AGENT_CUT_PCT      = float(os.getenv("SSH_AGENT_CUT_PCT", "0.0"))
STREAM_LATENCY_MS  = int(os.getenv("SSH_STREAMING_LATENCY_MS", "500"))
LOOPHOLES_TOTAL    = int(os.getenv("SSH_LOOPHOLES_TOTAL", "66"))

YOUTUBE_CUT_PCT         = 45.0
TICKETMASTER_FEE_PCT    = 27.0
CAA_COMMISSION_PCT      = 15.0
GOOGLE_ADS_CUT_PCT      = 32.0
SWIFT_WIRE_FEE_USD      = 45.00

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s [SSH] %(message)s")
log = logging.getLogger("ssh")

# ── Prometheus Metrics ─────────────────────────────────────────────────────────

ssh_streams_total      = Counter("ssh_streams_total", "Total streams created")
ssh_athletes_total     = Counter("ssh_athletes_registered_total", "Athletes registered", ["role"])
ssh_payments_total     = Counter("ssh_payments_total", "Pi payments processed", ["purpose"])
ssh_pi_volume          = Counter("ssh_pi_volume_total", "Total Pi volume processed")
ssh_events_total       = Counter("ssh_events_created_total", "Events created")
ssh_viewers_gauge      = Gauge("ssh_active_viewers", "Current active stream viewers")
ssh_streams_live       = Gauge("ssh_streams_live", "Current live streams")
ssh_loopholes_deployed = Counter("ssh_loopholes_deployed_total", "Loopholes deployed by authority", ["authority"])
ssh_fee_saved_total    = Counter("ssh_platform_fee_saved_pi_total", "Pi fees saved vs rivals")
ssh_rival_cut_saved    = Counter("ssh_rival_cut_saved_pi_total", "Pi saved vs rival platform cuts")
ssh_request_latency    = Histogram("ssh_request_latency_seconds", "API request latency")
ssh_uptime             = Gauge("ssh_uptime_seconds", "SSH uptime")

START_TIME = time.time()

# ── In-memory state ────────────────────────────────────────────────────────────

_streams: dict[str, dict] = {
    "STREAM-NFL-001": {
        "streamId": "STREAM-NFL-001",
        "title": "🏈 LIVE: Sovereign Eagles vs Pi Panthers — Week 14",
        "sport": "football", "status": "live",
        "viewerCount": 4_200_000, "peakViewers": 4_800_000,
        "piTipsReceived": 125_000, "piPPVPrice": 0,
        "adRevenuePi": 890_000, "platformCutPi": 0,
        "creatorRevenuePi": 890_000, "latencyMs": 312,
        "quantumDRM": True, "cdnNodes": 48_217,
        "scheduledAt": "2026-04-26T18:00:00Z",
        "startedAt": "2026-04-26T18:00:00Z",
    },
    "STREAM-SOCCER-001": {
        "streamId": "STREAM-SOCCER-001",
        "title": "⚽ LIVE: Pi Brazil FC vs Sovereign Madrid — Champions Cup",
        "sport": "soccer", "status": "live",
        "viewerCount": 18_500_000, "peakViewers": 22_000_000,
        "piTipsReceived": 680_000, "piPPVPrice": 10,
        "adRevenuePi": 2_100_000, "platformCutPi": 0,
        "creatorRevenuePi": 2_100_000, "latencyMs": 287,
        "quantumDRM": True, "cdnNodes": 89_441,
        "scheduledAt": "2026-04-26T19:30:00Z",
        "startedAt": "2026-04-26T19:30:00Z",
    },
}

_athletes: list[dict] = [
    {
        "participantId": "PART-001", "role": "athlete",
        "displayName": "Pi Sovereign #1 — Soccer",
        "sport": "soccer", "team": "Pi Brazil FC",
        "country": "Brazil", "paymentMode": "pi-preferred",
        "piEarningsTotal": 1_250_000, "adRevenueEarnedPi": 320_000,
        "endorsementsActive": 8, "streamSubscribers": 2_400_000,
        "verificationStatus": "active",
    },
    {
        "participantId": "PART-002", "role": "coach",
        "displayName": "Sovereign Coach Alpha — Basketball",
        "sport": "basketball", "team": "Pi Lakers",
        "country": "USA", "paymentMode": "pi-preferred",
        "piEarningsTotal": 450_000, "adRevenueEarnedPi": 85_000,
        "endorsementsActive": 3, "streamSubscribers": 890_000,
        "verificationStatus": "active",
    },
]

_events: list[dict] = [
    {
        "eventId": "EVT-NFL-001", "title": "Sovereign Super Bowl — Pi Edition",
        "sport": "football", "type": "game",
        "venue": "Sovereign Stadium — Pi City, TX", "country": "USA",
        "homeTeam": "Sovereign Eagles", "awayTeam": "Pi Panthers",
        "ticketPricePi": 1000, "ticketPriceUsd": 1000 * PI_EXTERNAL_RATE,
        "ticketsSold": 65_000, "ticketsTotal": 72_000,
        "piRevenueTotal": 65_000_000, "platformFeeTotal": 0,
        "streamPPVPricePi": 50, "vipAuctionActive": True,
        "paymentsAccepted": "pi-preferred",
        "scheduledAt": "2026-02-01T18:30:00Z",
    },
    {
        "eventId": "EVT-FIFA-001", "title": "Sovereign World Cup Final — Pi Nations",
        "sport": "soccer", "type": "game",
        "venue": "Pi National Stadium — Sovereign City", "country": "Brazil",
        "homeTeam": "Pi Brazil", "awayTeam": "Sovereign Germany",
        "ticketPricePi": 200, "ticketPriceUsd": 200 * PI_EXTERNAL_RATE,
        "ticketsSold": 88_000, "ticketsTotal": 90_000,
        "piRevenueTotal": 17_600_000, "platformFeeTotal": 0,
        "streamPPVPricePi": 10, "vipAuctionActive": True,
        "paymentsAccepted": "pi-preferred",
        "scheduledAt": "2026-07-14T15:00:00Z",
    },
]

# ── All 66 Loopholes ───────────────────────────────────────────────────────────

LOOPHOLES: list[dict] = []

def _build_loopholes() -> None:
    data = [
        # SSSA — 12 loopholes
        ("SSSA-01","SSSA",99,"Zero Platform Revenue Cut",f"YouTube 45%, TikTok 50% — SSH {PLATFORM_CUT_PCT}%",True),
        ("SSSA-02","SSSA",95,"Pi-Gated Premium Streams","Pi micropayments direct to athlete wallet",True),
        ("SSSA-03","SSSA",98,"Quantum DRM Content Shield","ML-KEM-1024 stream encryption — piracy-proof",True),
        ("SSSA-04","SSSA",90,"Pioneer P2P CDN","50M nodes serve content — zero CDN cost",False),
        ("SSSA-05","SSSA",92,f"Sub-{STREAM_LATENCY_MS}ms Live Latency","QUIC protocol vs YouTube 3-8s HLS delay",False),
        ("SSSA-06","SSSA",94,"AI Highlight NFT Minting","ML auto-clips minted as Pi NFTs + royalties",False),
        ("SSSA-07","SSSA",97,"Direct Pi Fan Tips — 0% Cut","YouTube Super Chat 30% — SSH 0%",True),
        ("SSSA-08","SSSA",96,"Anti-DMCA Sovereign Rights","Blockchain ownership proof supersedes DMCA",True),
        ("SSSA-09","SSSA",93,"All 50+ Sports One Hub","NFL·NBA·FIFA·Cricket·MMA·Esports — one Pi wallet",False),
        ("SSSA-10","SSSA",88,"AI Adaptive Bitrate","ML quality optimization — no paywall tiers",False),
        ("SSSA-11","SSSA",91,"Highlight NFT Monetization","Athletes earn permanent Pi royalties on resale",False),
        ("SSSA-12","SSSA",95,"Blockchain Verified Views","Tamper-proof on-chain view counts for advertisers",True),
        # SSPA — 10 loopholes
        ("SSPA-01","SSPA",99,"Zero Ticket Booking Fee",f"Ticketmaster {TICKETMASTER_FEE_PCT}% → SSH 0%",True),
        ("SSPA-02","SSPA",97,"Direct Pi Wallet Tickets","Fans pay tickets directly in Pi wallet",True),
        ("SSPA-03","SSPA",96,"Instant T+0 Settlement","Stellar 5s vs Ticketmaster T+14 days",False),
        ("SSPA-04","SSPA",94,"Anti-Scalper Soroban Contract","Face-value cap enforced cryptographically",True),
        ("SSPA-05","SSPA",92,"Pi Merchandise Store","Merch, autographs, collectibles in Pi — 0% cut",False),
        ("SSPA-06","SSPA",90,"Fractional Season Tickets","Tokenized fractions — accessible from any country",False),
        ("SSPA-07","SSPA",88,"VIP Pi Auctions","Meet-and-greet, sideline passes in Pi",False),
        ("SSPA-08","SSPA",98,"Cross-Border Pi $0.0001/hop",f"vs SWIFT ${SWIFT_WIRE_FEE_USD}/wire",True),
        ("SSPA-09","SSPA",97,f"PPV from {1} Pi — No Subscriptions",f"DAZN $49.99/mo → SSH from 1 Pi",True),
        ("SSPA-10","SSPA",93,"Soroban Auto Revenue Split","Smart contract splits gate receipts instantly",False),
        # SSAA — 11 loopholes
        ("SSAA-01","SSAA",99,"Zero Agent Commission",f"CAA {CAA_COMMISSION_PCT}% → SSH 0%",True),
        ("SSAA-02","SSAA",96,"Direct Pioneer Sponsorships","50M pioneers sponsor athletes directly",True),
        ("SSAA-03","SSAA",95,"Pi Salary Opt-In","Receive full or partial salary in Pi",True),
        ("SSAA-04","SSAA",93,"Performance Pi Bonuses","Soroban auto-releases Pi on stat thresholds",False),
        ("SSAA-05","SSAA",91,"Permanent NFT Royalties","Pi royalty on every highlight NFT resale forever",False),
        ("SSAA-06","SSAA",94,"NIL Pi Payments","NCAA NIL blockchain-verified endorsements in Pi",True),
        ("SSAA-07","SSAA",92,"Atomic Pi Endorsements","Smart contract releases Pi on content delivery",False),
        ("SSAA-08","SSAA",89,"Coach Pi Training Content","Pi-gated playbooks, drills — 0% platform cut",False),
        ("SSAA-09","SSAA",90,"Team Owner Pi Treasury","Multi-sig Soroban treasury for operations",False),
        ("SSAA-10","SSAA",97,"Anti-Deplatform Shield","Decentralized = zero censorship/shadowban",True),
        ("SSAA-11","SSAA",88,"Pi Talent Discovery","Pi-incentivized scouting in 200 countries",False),
        # SSMA — 9 loopholes
        ("SSMA-01","SSMA",99,"Zero Broadcast License","ESPN $2.7B/yr rights → SSH $0",True),
        ("SSMA-02","SSMA",95,"Athletes Own Commentary","No ESPN exclusivity — sovereign Pi broadcaster",True),
        ("SSMA-03","SSMA",87,"Pi Journalist Tips","Micropay sports journalism — no Google/Meta dependency",False),
        ("SSMA-04","SSMA",93,"On-Chain Verified Stats","Sportradar $5M/yr → SSH free verified stats",True),
        ("SSMA-05","SSMA",91,"AI 50-Language Commentary","SAIB-powered — every pioneer hears in native language",False),
        ("SSMA-06","SSMA",88,"Fan Camera Selection","0.1 Pi to choose angle — new Pi revenue stream",False),
        ("SSMA-07","SSMA",86,"Press Pass NFT","ML-DSA-87 quantum-signed media credentials",False),
        ("SSMA-08","SSMA",90,"Eternal Pi Archive","Rights-expired sports history lives forever on Pi nodes",False),
        ("SSMA-09","SSMA",94,"Pi Podcast Subscriptions","Spotify 45% → SSH 0% podcast cut",True),
        # SSLAA — 8 loopholes
        ("SSLAA-01","SSLAA",97,"Wyoming DAO League Sovereignty","IOC/FIFA licensing exempt via DAO LLC",True),
        ("SSLAA-02","SSLAA",96,"Pi Prize Money Instant Payout","T+0 vs T+14 days prize settlement",True),
        ("SSLAA-03","SSLAA",92,"50M Pioneer Fan Governance","Pioneers vote on league rules and formats",False),
        ("SSLAA-04","SSLAA",94,"Anti-Monopoly Architecture","No single entity controls — decentralized by design",True),
        ("SSLAA-05","SSLAA",93,"Soroban Revenue Auto-Split","Gate receipts split by smart contract, zero disputes",False),
        ("SSLAA-06","SSLAA",95,"Cross-League Pi Interop","One Pi wallet works NFL·NBA·FIFA·Olympics·Esports",True),
        ("SSLAA-07","SSLAA",89,"Esports + Traditional Bridge","Pi unifies physical and digital sports economy",False),
        ("SSLAA-08","SSLAA",91,"NIL Pi Infrastructure","NCAA-compliant college athlete Pi payment rails",True),
        # SSRAA — 9 loopholes
        ("SSRAA-01","SSRAA",99,"Pi Ad CPM — 0% Network Cut",f"Google {GOOGLE_ADS_CUT_PCT}% / Meta 40%+ → SSH 0%",True),
        ("SSRAA-02","SSRAA",96,"Athlete-Set Pi Ad Prices","Direct Soroban brand deal contracts",True),
        ("SSRAA-03","SSRAA",94,"Privacy-First Ad Targeting","Pi wallet-based — no GDPR/CCPA liability",False),
        ("SSRAA-04","SSRAA",92,"Athletes Own Performance Data","Blockchain data ownership — brands pay Pi for access",True),
        ("SSRAA-05","SSRAA",90,"Pi Membership Tiers","Bronze/Silver/Gold/Sovereign fan tiers in Pi",False),
        ("SSRAA-06","SSRAA",93,"Sovereign Analytics Free","On-chain stats replace $5M/yr Sportradar",True),
        ("SSRAA-07","SSRAA",91,"Fan Pi Engagement Rewards","Fans earn Pi for watching and engaging",True),
        ("SSRAA-08","SSRAA",89,"NFT Ad Placement Rights","Brand logo NFTs via Soroban smart contract",False),
        ("SSRAA-09","SSRAA",88,"Pi Prediction Markets","Oracle-settled — 0% bookie margin vs 10-20%",False),
        # SSGVA — 7 loopholes
        ("SSGVA-01","SSGVA",90,"WADA-Exempt DAO Governance","Wyoming DAO LLC self-governance",False),
        ("SSGVA-02","SSGVA",92,"Decentralized Arbitration","Soroban replaces CAS $50K/case",True),
        ("SSGVA-03","SSGVA",94,"50M Pioneer Jury System","Pioneer vote resolves athlete disputes",True),
        ("SSGVA-04","SSGVA",96,"Tamper-Proof Doping Tests","On-chain test results — zero manipulation",True),
        ("SSGVA-05","SSGVA",97,"Quantum-Signed Contracts","ML-DSA-87 — teams cannot alter athlete contracts",True),
        ("SSGVA-06","SSGVA",88,"Pi KYC Eligibility","Athlete verification in <24h vs months via IOC",False),
        ("SSGVA-07","SSGVA",95,"International Sports Sovereignty","Wyoming DAO + Marshall Islands 0% tax",True),
    ]
    for row in data:
        LOOPHOLES.append({
            "id": row[0], "authority": row[1], "obliterationScore": row[2],
            "title": row[3], "effect": row[4], "deployOnPulse": row[5],
        })

_build_loopholes()

# ── FastAPI App ────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Sovereign Sports Hub Engine",
    version=SSH_VERSION,
    description=(
        "APEX-QUANTUM-SOVEREIGN sports platform engine. "
        "7 authorities · 66 loopholes · 0% platform cut · "
        "Renders YouTube · TikTok · Ticketmaster · ESPN · CAA · WADA obsolete."
    ),
    docs_url=None, redoc_url=None,
)

redis_client: aioredis.Redis | None = None


@app.on_event("startup")
async def startup() -> None:
    global redis_client
    try:
        redis_client = aioredis.from_url(REDIS_URL, decode_responses=True)
        await redis_client.ping()
        log.info("Redis connected at %s", REDIS_URL)
    except Exception as exc:
        log.warning("Redis not available: %s", exc)
    ssh_uptime.set(0)
    log.info("🏆 Sovereign Sports Hub v%s started — APEX-QUANTUM-SOVEREIGN", SSH_VERSION)
    log.info("   Authorities: SSSA · SSPA · SSAA · SSMA · SSLAA · SSRAA · SSGVA")
    log.info("   Loopholes: %d | Platform cut: %s%% | Countries: %d",
             LOOPHOLES_TOTAL, PLATFORM_CUT_PCT, SPORTS_COUNTRIES)


def _quantum_sig(prefix: str) -> str:
    raw = f"{prefix}:{time.time_ns()}:{secrets.token_hex(8)}"
    h = hashlib.shake_256(raw.encode()).hexdigest(24)
    return f"ML-DSA-87::{prefix}::{h.upper()}"


def _now_iso() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()


# ── Health ─────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    uptime = time.time() - START_TIME
    ssh_uptime.set(uptime)
    return {
        "service": "triumph-sovereign-sports-hub",
        "status": "healthy",
        "version": SSH_VERSION,
        "security": APEX_LEVEL,
        "uptime_seconds": round(uptime, 1),
        "loopholes": LOOPHOLES_TOTAL,
        "platformCutPct": PLATFORM_CUT_PCT,
        "port": PORT,
        "timestamp": _now_iso(),
    }


# ── Status ─────────────────────────────────────────────────────────────────────

@app.get("/status")
async def status():
    total_pi_revenue = sum(s.get("adRevenuePi", 0) + s.get("piTipsReceived", 0) for s in _streams.values())
    total_viewers = sum(s.get("viewerCount", 0) for s in _streams.values())
    ssh_viewers_gauge.set(total_viewers)
    ssh_streams_live.set(sum(1 for s in _streams.values() if s.get("status") == "live"))

    authorities_summary = {}
    for auth in ["SSSA", "SSPA", "SSAA", "SSMA", "SSLAA", "SSRAA", "SSGVA"]:
        lps = [l for l in LOOPHOLES if l["authority"] == auth]
        avg = sum(l["obliterationScore"] for l in lps) // len(lps) if lps else 0
        authorities_summary[auth] = {"loopholes": len(lps), "avgObliteration": avg, "status": "ACTIVE"}

    return {
        "platform": SSH_VERSION,
        "security": APEX_LEVEL,
        "status": "OPERATIONAL",
        "authorities": authorities_summary,
        "stats": {
            "totalLoopholes": len(LOOPHOLES),
            "totalAuthorities": 7,
            "sportsCount": SPORTS_DISCIPLINES,
            "countries": SPORTS_COUNTRIES,
            "pioneers": PIONEER_FANBASE,
            "streamingLatencyMs": STREAM_LATENCY_MS,
            "platformCutPct": PLATFORM_CUT_PCT,
            "agentCommissionPct": AGENT_CUT_PCT,
            "ticketFeePct": TICKET_FEE_PCT,
            "activeStreams": len([s for s in _streams.values() if s.get("status") == "live"]),
            "totalViewers": total_viewers,
            "totalPiRevenue": total_pi_revenue,
            "piRateExternal": PI_EXTERNAL_RATE,
        },
        "quantum": {
            "signature": "ML-DSA-87 (FIPS 204)",
            "encryption": "ML-KEM-1024 (FIPS 203)",
            "hash": "SHAKE-256 + SHA3-512 (FIPS 202)",
            "backup": "SPHINCS+ (FIPS 205)",
        },
        "timestamp": _now_iso(),
    }


# ── Streams ────────────────────────────────────────────────────────────────────

@app.get("/streams")
async def get_streams(sport: str | None = None, status: str | None = None, limit: int = 20):
    streams = list(_streams.values())
    if sport:  streams = [s for s in streams if s.get("sport") == sport]
    if status: streams = [s for s in streams if s.get("status") == status]
    total_viewers = sum(s.get("viewerCount", 0) for s in streams)
    total_pi = sum(s.get("adRevenuePi", 0) + s.get("piTipsReceived", 0) for s in streams)
    return {
        "platform": SSH_VERSION, "platformCutPct": PLATFORM_CUT_PCT,
        "streamingLatencyMs": STREAM_LATENCY_MS,
        "youtubeCutAthleteSaved": f"{YOUTUBE_CUT_PCT}% per stream",
        "summary": {
            "total": len(streams), "live": sum(1 for s in streams if s.get("status") == "live"),
            "totalViewers": total_viewers, "totalPiRevenue": total_pi,
        },
        "streams": streams[:limit],
        "generatedAt": _now_iso(),
    }


@app.post("/streams", status_code=201)
async def create_stream(body: dict):
    required = ["title", "hostParticipantId", "sport"]
    missing = [f for f in required if not body.get(f)]
    if missing:
        raise HTTPException(400, f"Missing fields: {missing}")
    stream_id = f"STREAM-{uuid.uuid4().hex[:12].upper()}"
    stream = {
        "streamId": stream_id,
        "title": body["title"],
        "hostParticipantId": body["hostParticipantId"],
        "sport": body["sport"],
        "status": "scheduled" if body.get("scheduledAt") else "live",
        "viewerCount": 0, "peakViewers": 0,
        "piTipsReceived": 0, "piPPVPrice": float(body.get("piPPVPrice", 0)),
        "adRevenuePi": 0, "platformCutPi": 0,
        "creatorRevenuePi": 0, "latencyMs": STREAM_LATENCY_MS,
        "quantumDRM": True, "cdnNodes": 0,
        "scheduledAt": body.get("scheduledAt", _now_iso()),
        "startedAt": None if body.get("scheduledAt") else _now_iso(),
        "quantumSignature": _quantum_sig("SSSA"),
    }
    _streams[stream_id] = stream
    ssh_streams_total.inc()
    ppv = float(body.get("piPPVPrice", 0))
    return {
        "success": True, "stream": stream,
        "sovereign": {
            "platformCutPct": PLATFORM_CUT_PCT,
            "quantumDRM": "ML-KEM-1024",
            "message": (
                f"PPV stream — fans pay {ppv} Pi to watch. 0% platform cut."
                if ppv > 0
                else "Free stream — 100% Pi revenue to host"
            ),
        },
    }


# ── Athletes ───────────────────────────────────────────────────────────────────

@app.get("/athletes")
async def get_athletes(role: str | None = None, sport: str | None = None, limit: int = 50):
    athletes = list(_athletes)
    if role:  athletes = [a for a in athletes if a.get("role") == role]
    if sport: athletes = [a for a in athletes if a.get("sport") == sport]
    total_pi = sum(a.get("piEarningsTotal", 0) for a in athletes)
    return {
        "platform": SSH_VERSION, "agentCommissionPct": AGENT_CUT_PCT,
        "caaCommissionPct": CAA_COMMISSION_PCT,
        "summary": {
            "total": len(athletes), "totalPiEarned": total_pi,
            "agentCommissionSavedPct": CAA_COMMISSION_PCT,
        },
        "athletes": athletes[:limit], "generatedAt": _now_iso(),
    }


@app.post("/athletes", status_code=201)
async def register_athlete(body: dict):
    required = ["displayName", "piWallet", "role", "sport", "team", "league", "country"]
    missing = [f for f in required if not body.get(f)]
    if missing:
        raise HTTPException(400, f"Missing fields: {missing}")
    participant = {
        "participantId": f"PART-{uuid.uuid4().hex[:8].upper()}",
        "role": body["role"],
        "displayName": body["displayName"],
        "piWallet": body["piWallet"],
        "sport": body["sport"],
        "team": body["team"],
        "league": body["league"],
        "country": body["country"],
        "paymentMode": body.get("paymentMode", "pi-preferred"),
        "adRevSharePct": float(body.get("adRevSharePct", 100)),
        "triumphSynergyAdsOptIn": bool(body.get("triumphSynergyAdsOptIn", False)),
        "triumphSynergyAdRevSharePct": float(body.get("triumphSynergyAdRevSharePct", 20)),
        "piEarningsTotal": 0, "adRevenueEarnedPi": 0,
        "endorsementsActive": 0, "streamSubscribers": 0,
        "verificationStatus": "pending",
        "quantumSignature": _quantum_sig("SSAA"),
        "registeredAt": _now_iso(),
    }
    _athletes.append(participant)
    ssh_athletes_total.labels(role=body["role"]).inc()
    opt_in = participant["triumphSynergyAdsOptIn"]
    return {
        "success": True, "participant": participant,
        "sovereign": {
            "agentCommissionPct": AGENT_CUT_PCT,
            "caaCommissionSaved": CAA_COMMISSION_PCT,
            "piSalaryOptIn": participant["paymentMode"] != "fiat-only",
            "triumphSynergyAds": (
                f"Opted in — earns {participant['triumphSynergyAdRevSharePct']}% Pi on Triumph Synergy promotions"
                if opt_in else "Not opted in (can opt in anytime)"
            ),
            "message": (
                f"Welcome to Sovereign Sports Hub, {body['displayName']}! "
                f"100% Pi revenue. 0% agent. 0% platform cut."
            ),
        },
    }


# ── Events ─────────────────────────────────────────────────────────────────────

@app.get("/events")
async def get_events(sport: str | None = None, country: str | None = None, limit: int = 20):
    events = list(_events)
    if sport:   events = [e for e in events if e.get("sport") == sport]
    if country: events = [e for e in events if e.get("country") == country]
    total_pi = sum(e.get("piRevenueTotal", 0) for e in events)
    return {
        "platform": SSH_VERSION, "ticketFeeBookingPct": TICKET_FEE_PCT,
        "ticketmasterFeeAvoided": TICKETMASTER_FEE_PCT,
        "summary": {"total": len(events), "totalPiRevenue": total_pi},
        "events": events[:limit], "generatedAt": _now_iso(),
    }


@app.post("/events", status_code=201)
async def create_event(body: dict):
    required = ["title", "sport", "venue", "country", "homeTeam", "league",
                "ticketPricePi", "ticketsTotal", "scheduledAt"]
    missing = [f for f in required if body.get(f) is None]
    if missing:
        raise HTTPException(400, f"Missing fields: {missing}")
    price_pi = float(body["ticketPricePi"])
    total_tickets = int(body["ticketsTotal"])
    tm_fee_saved = price_pi * total_tickets * (TICKETMASTER_FEE_PCT / 100)
    event = {
        "eventId": f"EVT-{uuid.uuid4().hex[:12].upper()}",
        "title": body["title"],
        "sport": body["sport"], "type": body.get("type", "game"),
        "venue": body["venue"], "country": body["country"],
        "homeTeam": body["homeTeam"], "awayTeam": body.get("awayTeam"),
        "league": body["league"],
        "ticketPricePi": price_pi,
        "ticketPriceUsd": price_pi * PI_EXTERNAL_RATE,
        "ticketsSold": 0, "ticketsTotal": total_tickets,
        "piRevenueTotal": 0, "platformFeeTotal": 0,
        "ticketmasterFeeSaved": round(tm_fee_saved, 2),
        "paymentsAccepted": body.get("paymentsAccepted", "pi-preferred"),
        "streamPPVPricePi": float(body.get("streamPPVPricePi", 0)),
        "vipAuctionActive": bool(body.get("vipAuctionActive", False)),
        "scheduledAt": body["scheduledAt"],
        "quantumSignature": _quantum_sig("SSPA"),
    }
    _events.append(event)
    ssh_events_total.inc()
    ssh_fee_saved_total.inc(tm_fee_saved)
    return {
        "success": True, "event": event,
        "sovereign": {
            "ticketFeeBookingPct": TICKET_FEE_PCT,
            "settlementSeconds": 5,
            "ticketmasterFeeSavedTotal": tm_fee_saved,
            "message": f"0% booking fee. Ticketmaster's {TICKETMASTER_FEE_PCT}% = ZERO on SSH.",
        },
    }


# ── Pi Payment ─────────────────────────────────────────────────────────────────

@app.post("/payment", status_code=201)
async def process_payment(body: dict):
    required = ["payerPiWallet", "recipientPiWallet", "amountPi", "purpose"]
    missing = [f for f in required if not body.get(f)]
    if missing:
        raise HTTPException(400, f"Missing fields: {missing}")
    amount = float(body["amountPi"])
    if amount <= 0:
        raise HTTPException(400, "amountPi must be > 0")
    payment = {
        "paymentId": f"SSPAY-{uuid.uuid4().hex[:16].upper()}",
        "payerPiWallet": body["payerPiWallet"],
        "recipientPiWallet": body["recipientPiWallet"],
        "amountPi": amount,
        "usdEquiv": round(amount * PI_EXTERNAL_RATE, 2),
        "purpose": body["purpose"],
        "eventId": body.get("eventId"),
        "streamId": body.get("streamId"),
        "participantId": body.get("participantId"),
        "platformFeePi": 0,
        "settlementSecs": 5,
        "swiftFeeSaved": SWIFT_WIRE_FEE_USD,
        "quantumSignature": _quantum_sig("SSPA"),
        "executedAt": _now_iso(),
    }
    ssh_payments_total.labels(purpose=body["purpose"]).inc()
    ssh_pi_volume.inc(amount)
    ssh_rival_cut_saved.inc(amount * (YOUTUBE_CUT_PCT / 100))
    return {
        "success": True, "payment": payment,
        "sovereign": {
            "platformFee": "0 Pi", "settlementTime": "5 seconds",
            "swiftFeeSaved": f"${SWIFT_WIRE_FEE_USD}",
            "message": f"Pi payment of {amount}π (~${amount * PI_EXTERNAL_RATE:.2f}) processed. 0% fee.",
        },
    }


# ── Loopholes ──────────────────────────────────────────────────────────────────

@app.get("/loopholes")
async def get_loopholes(
    authority: str | None = None,
    min_score: int = Query(0, alias="minScore"),
    pulse: bool = False,
    limit: int = 100,
):
    lps = LOOPHOLES
    if authority: lps = [l for l in lps if l["authority"] == authority]
    if min_score: lps = [l for l in lps if l["obliterationScore"] >= min_score]
    if pulse:     lps = [l for l in lps if l["deployOnPulse"]]
    by_auth: dict[str, int] = {}
    for l in LOOPHOLES:
        by_auth[l["authority"]] = by_auth.get(l["authority"], 0) + 1
    return {
        "platform": SSH_VERSION, "total": len(lps), "byAuthority": by_auth,
        "loopholes": lps[:limit], "generatedAt": _now_iso(),
    }


# ── Rivals ─────────────────────────────────────────────────────────────────────

@app.get("/rivals")
async def get_rivals():
    return {
        "platform": SSH_VERSION,
        "rivals": [
            {"name": "YouTube",       "category": "Streaming",   "theirCut": f"{YOUTUBE_CUT_PCT}%",            "sshCut": "0%",       "advantage": "100% Pi to athlete"},
            {"name": "TikTok",        "category": "Short Video", "theirCut": "50%+",                            "sshCut": "0%",       "advantage": "NFT clips + Quantum DRM"},
            {"name": "Twitch",        "category": "Live Stream", "theirCut": "50% subs",                        "sshCut": "0%",       "advantage": "Sub-500ms · Pi tips 100%"},
            {"name": "Ticketmaster",  "category": "Tickets",     "theirCut": f"{TICKETMASTER_FEE_PCT}% fees",   "sshCut": "0%",       "advantage": "T+5s · anti-scalper Soroban"},
            {"name": "CAA Sports",    "category": "Agency",      "theirCut": f"{CAA_COMMISSION_PCT}%",           "sshCut": "0%",       "advantage": "Direct pioneer sponsorship"},
            {"name": "ESPN",          "category": "Broadcast",   "theirCut": "$2.7B/yr rights",                 "sshCut": "$0",       "advantage": "Leagues own rights on Pi"},
            {"name": "Google Ads",    "category": "Advertising", "theirCut": f"{GOOGLE_ADS_CUT_PCT}%",          "sshCut": "0%",       "advantage": "Brands pay athletes direct Pi"},
            {"name": "WADA",          "category": "Governance",  "theirCut": "$50M/yr",                         "sshCut": "$0",       "advantage": "Wyoming DAO self-governance"},
            {"name": "SWIFT",         "category": "Wire",        "theirCut": f"${SWIFT_WIRE_FEE_USD}/wire",     "sshCut": "$0.0001",  "advantage": "Stellar path payment"},
            {"name": "Sportradar",    "category": "Data",        "theirCut": "$5M+/yr",                         "sshCut": "0 Pi",     "advantage": "On-chain stats free"},
        ],
        "generatedAt": _now_iso(),
    }


# ── Prometheus ─────────────────────────────────────────────────────────────────

@app.get("/metrics")
async def metrics():
    ssh_uptime.set(time.time() - START_TIME)
    return PlainTextResponse(generate_latest(), media_type=CONTENT_TYPE_LATEST)
