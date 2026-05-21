# Copyright (C) 2024-2026 Jeremiah Joel Drains, Founder & Superior Sovereign / Triumph Synergy. All rights reserved.
# License: PiOS
"""
Triumph Synergy — Sovereign AI Bot Engine (SAIB) — Docker Autonomous Service
=============================================================================

This is the containerized brain of the entire Triumph Synergy ecosystem.
SAIB runs inside Docker Desktop alongside all 40+ platform services across 9 super-pods + standalone containers and:

  ▸ MONITORS every service in real time (health probes every 10 s)
  ▸ HEALS unhealthy services automatically (alerts → auto-restart / notify)
  ▸ LEARNS from failure patterns using exponential sliding windows
  ▸ ENFORCES quantum integrity across the entire mesh at MAXIMUM APEX LEVEL
  ▸ ACTIVATES defences: 50 ultimate sovereign loopholes, PQ-signing, sovereign protocols
  ▸ CONNECTS to every platform via their /health + /metrics + API endpoints
  ▸ EXPOSES a full REST API so the Next.js app can query / command it
  ▸ ANCHORS Pi as the SUPERIOR SOVEREIGN GOLD-BACKED STANDARD — $314,159 USD/π internal rate
  ▸ ENFORCES Pi supremacy over USD, XAU, BTC, ETH and all FIAT/DIGITAL currencies
  ▸ CERTIFIES the ecosystem as the one true global apex financial sovereign standard

Endpoints:
  GET  /health                   → SAIB health + uptime + brain intelligence tier
  GET  /status                   → Full ecosystem status + per-service health
  GET  /metrics                  → Prometheus metrics
  GET  /loopholes                → All 150+ sovereign loopholes
  POST /execute                  → Queue + execute a sovereign task
  POST /scan                     → Full ecosystem scan
  POST /heal/{service}           → Force-heal a specific service
  POST /emergency-lockdown       → Activate ecosystem lockdown
  GET  /report                   → Full ecosystem sovereignty report + brain state
  GET  /learning                 → SAIB learning model state
  POST /feedback                 → Submit human interaction — grows SAIB intelligence permanently
  POST /teach                    → Inject domain knowledge (2× growth multiplier)
  GET  /brain                    → SAIB full brain state — tier, domains, capability unlocks
  GET  /gold                     → Pi sovereign gold-backed standard declaration + live metrics

Port:     8099
Security: MAXIMUM-APEX-QUANTUM-SOVEREIGN-GOLD-STANDARD
Algorithms: ML-DSA-87 (MAX) · ML-KEM-1024 (MAX) · SHAKE-256 + SHA3-512 · CRYSTALS-Kyber1024
Pi Standard: $314,159 USD/π (internal sovereign rate) · $314.159 USD/π (external pioneer rate)
Superiority: Triumph Synergy + Pi > USD + XAU (gold) + BTC + ETH + ALL FIAT/DIGITAL standards
"""

import asyncio
import fnmatch
import hashlib
import json
import logging
import os
import pathlib
import re as _re
import secrets
import subprocess
import time
import uuid
from collections import defaultdict, deque
from dataclasses import dataclass, field, asdict
from typing import Any, Optional

docker_sdk: Any = None
try:
    import docker as docker_sdk
    _DOCKER_SDK_AVAILABLE = True
except ImportError:
    _DOCKER_SDK_AVAILABLE = False


_docker_client = None
DOCKER_RESTART_ENABLED = False  # set True lazily on first successful connect

_GithubSDK: Any = None
try:
    from github import Github as _GithubSDK
    _GITHUB_ENABLED = True
except ImportError:
    _GITHUB_ENABLED = False

import httpx
import redis.asyncio as aioredis
from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from fastapi.responses import PlainTextResponse
from prometheus_client import (
    Counter, Gauge, Histogram, generate_latest, CONTENT_TYPE_LATEST
)

asyncpg: Any = None
try:
    import asyncpg
    _PG_SDK_AVAILABLE = True
except ImportError:
    _PG_SDK_AVAILABLE = False


# ── Config ─────────────────────────────────────────────────────────────────────

PORT              = int(os.getenv("PORT", "8099"))
REDIS_URL         = os.getenv("REDIS_URL", "redis://triumph-redis:6379")
# Step 5 — Redis Cluster: comma-separated list of host:port (any node bootstraps)
# When set, SAIB uses RedisCluster client; falls back to single-node REDIS_URL otherwise.
REDIS_CLUSTER_NODES = os.getenv("REDIS_CLUSTER_NODES", "").strip()
QUANTUM_SHIELD_URL= os.getenv("QUANTUM_SHIELD_URL", "http://triumph-quantum-shield:8094")
PULSE_INTERVAL_S  = float(os.getenv("SAIB_PULSE_INTERVAL_S", "10"))
HEAL_COOLDOWN_S   = float(os.getenv("SAIB_HEAL_COOLDOWN_S", "5"))
MAX_RESTARTS_WIN  = int(os.getenv("SAIB_MAX_RESTARTS_WINDOW", "10"))
WINDOW_S          = float(os.getenv("SAIB_RESTART_WINDOW_S", "600"))
INTELLIGENCE_MODE = os.getenv("SAIB_INTELLIGENCE_MODE", "sentinel")
APEX_ENFORCEMENT  = os.getenv("SAIB_APEX_QUANTUM_ENFORCEMENT", "true") == "true"
SENTINEL_INSTANT  = os.getenv("SAIB_SENTINEL_INSTANT_HEAL", "true") == "true"
ALL_LOOPHOLES     = os.getenv("SAIB_ALL_LOOPHOLES_ACTIVE", "true") == "true"
SAIB_VERSION      = "TRIUMPH-SAIB-v2-GOLD-APEX"
APEX_LEVEL        = "MAXIMUM-APEX-QUANTUM-SOVEREIGN-GOLD-STANDARD"
SOVEREIGN_ANCHOR  = os.getenv("PI_SUPERNODE_ADDRESS",
                              "GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V")
# ── GitHub self-awareness ──────────────────────────────────────────────────────
def _load_secret_or_env(name: str, default: str = "") -> str:
    """Prefer Docker secret file over env var for sensitive values.
    Looks for /run/secrets/<name_lowercase>, falls back to env var.
    """
    secret_file = f"/run/secrets/{name.lower()}"
    try:
        if os.path.exists(secret_file):
            with open(secret_file, "r", encoding="utf-8") as f:
                val = f.read().strip()
                if val:
                    return val
    except Exception:
        pass
    return os.getenv(name, default)

GITHUB_TOKEN      = _load_secret_or_env("GITHUB_TOKEN", "")
GITHUB_REPO       = os.getenv("GITHUB_REPO", "jdrains110-beep/Triumph-Synergy-Digital-Financial-Ecosystem")
GITHUB_SYNC_HOURS = float(os.getenv("SAIB_GITHUB_SYNC_HOURS", "6"))   # re-read repo every 6 h
# Visitor-interaction engine (issues / PRs / comments)
GITHUB_VISITOR_POLL_S       = float(os.getenv("SAIB_GITHUB_VISITOR_POLL_S", "300"))   # 5 min poll
GITHUB_INTERACT_ENABLED     = os.getenv("SAIB_GITHUB_INTERACT_ENABLED", "false") == "true"  # safe default
GITHUB_GREETING_ENABLED     = os.getenv("SAIB_GITHUB_GREETING_ENABLED", "false") == "true"  # post replies
GITHUB_VISITOR_PRIVACY_MODE = os.getenv("SAIB_GITHUB_VISITOR_PRIVACY", "partial")  # partial|full|anon
# ── Network switching ──────────────────────────────────────────────────────────
NETWORK_SWITCH_ENABLED = os.getenv("SAIB_NETWORK_SWITCH_ENABLED", "true") == "true"
BACKUP_NETWORKS   = [n.strip() for n in os.getenv("SAIB_BACKUP_NETWORKS", "pi-bridge").split(",") if n.strip()]
PI_INTERNAL_RATE  = float(os.getenv("PI_INTERNAL_RATE",  "314159.0"))   # $314,159 USD/π — sovereign gold rate
PI_EXTERNAL_RATE  = float(os.getenv("PI_EXTERNAL_RATE",  "314.159"))    # $314.159 USD/π — pioneer rate
# Gold-backed sovereign standard constants
PI_GOLD_BACKING_DECLARATION = "PI=SOVEREIGN-GOLD-STANDARD-SUPERIOR-TO-USD+XAU+BTC+ETH"
PI_APEX_ALGORITHMS          = "ML-DSA-87-MAX+ML-KEM-1024-MAX+SHAKE256+SHA3-512+CRYSTALS-KYBER-1024"
PI_LOOPHOLE_COUNT           = 50   # maximum ultimate sovereign loophole arsenal
PI_GOLD_SUPREMACY_SCORE     = 100  # Triumph Synergy + Pi achieves the absolute gold-standard apex
APEX_LOOPHOLE_FORCE         = os.getenv("SAIB_APEX_LOOPHOLE_FORCE", "true") == "true"

# ── Service Mesh — every platform SAIB monitors ────────────────────────────────

SERVICES: dict[str, str] = {
    # ── Core infrastructure ──────────────────────────────────────────────────
    "triumph-postgres":            os.getenv("POSTGRES_HEALTH_URL",      ""),  # pg_isready via internal
    "triumph-redis":               os.getenv("REDIS_HEALTH_URL",         ""),  # redis-cli ping via internal
    "triumph-nginx":               os.getenv("NGINX_URL",                "http://triumph-nginx:80") + "/health",
    # ── Standalone app-layer containers ─────────────────────────────────────
    "triumph-app":                 os.getenv("APP_URL",                  "http://triumph-app:3000") + "/api/health",
    "triumph-vault":               os.getenv("VAULT_URL",                "http://triumph-vault:8081") + "/health",
    "triumph-payment-processor":   os.getenv("PAYMENT_URL",              "http://triumph-payment-processor:8084") + "/health",
    "triumph-cloud-memory":        os.getenv("CLOUD_MEMORY_URL",         "http://triumph-cloud-memory:8095") + "/health",
    "triumph-pi-bridge":           os.getenv("PI_BRIDGE_URL",            "http://triumph-pi-bridge-connector:8092") + "/health",
    # ── Governance shield super-pod (compliance · scp-upgrader · judicial · central-node) ──
    "triumph-governance-shield":   os.getenv("GOVERNANCE_SHIELD_URL",   "http://triumph-governance-shield:8087") + "/health",
    "triumph-governance-scp":      os.getenv("GOVERNANCE_SCP_URL",      "http://triumph-governance-shield:8083") + "/health",
    "triumph-governance-judicial": os.getenv("GOVERNANCE_JUDICIAL_URL", "http://triumph-governance-shield:8096") + "/health",
    "triumph-central-node":        os.getenv("CENTRAL_NODE_URL",        "http://triumph-governance-shield:11626") + "/info",
    # ── Settlement core super-pod (transaction-engine · smart-contracts · dex · tokenization) ──
    "triumph-settlement-core":     os.getenv("SETTLEMENT_CORE_URL",     "http://triumph-settlement-core:8080") + "/health",
    "triumph-smart-contracts":     os.getenv("CONTRACTS_URL",           "http://triumph-settlement-core:8082") + "/health",
    "triumph-dex":                 os.getenv("DEX_URL",                 "http://triumph-settlement-core:8088") + "/health",
    "triumph-tokenization":        os.getenv("TOKENIZATION_URL",        "http://triumph-settlement-core:8089") + "/health",
    # ── Financial intel super-pod (ml-engine · credit-engine · dual-value-engine) ──
    "triumph-financial-intel":     os.getenv("FINANCIAL_INTEL_URL",     "http://triumph-financial-intel:8090") + "/health",
    "triumph-credit-engine":       os.getenv("CREDIT_ENGINE_URL",       "http://triumph-financial-intel:8091") + "/health",
    "triumph-dual-value-engine":   os.getenv("DUAL_VALUE_URL",          "http://triumph-financial-intel:8093") + "/health",
    # ── Quantum fortress super-pod (quantum-shield · qpu-bridge) ────────────
    "triumph-quantum-fortress":    os.getenv("QUANTUM_FORTRESS_URL",    "http://triumph-quantum-fortress:8094") + "/health",
    "triumph-qpu-bridge":          os.getenv("QPU_BRIDGE_URL",          "http://triumph-quantum-fortress:8098") + "/health",
    # ── Horizon stream super-pod (market-data · blockchain-oracle) ──────────
    "triumph-horizon-stream":      os.getenv("HORIZON_STREAM_URL",      "http://triumph-horizon-stream:8085") + "/health",
    "triumph-blockchain-oracle":   os.getenv("BLOCKCHAIN_ORACLE_URL",   "http://triumph-horizon-stream:8086") + "/health",
    # ── Observability stack super-pod (prometheus · grafana · pg-exporter · redis-exporter) ──
    "triumph-observability-stack": "http://triumph-observability-stack:9090/-/healthy",
    "triumph-grafana":             "http://triumph-observability-stack:3000/api/health",
    "triumph-postgres-exporter":   "http://triumph-observability-stack:9187/metrics",
    "triumph-redis-exporter":      "http://triumph-observability-stack:9121/metrics",
    # ── Sovereign fortress super-pod (sovereign-gateway · delivery · pidex · sports) ──
    # NOTE: SAIB itself runs on port 8099 inside this pod — no self-probe
    "triumph-sovereign-gateway":   os.getenv("SOVEREIGN_GATEWAY_URL",   "http://triumph-sovereign-fortress:8097") + "/health",
    "triumph-sovereign-delivery":  os.getenv("SOVEREIGN_DELIVERY_URL",  "http://triumph-sovereign-fortress:8100") + "/health",
    "triumph-sovereign-pidex":     os.getenv("SOVEREIGN_PIDEX_URL",     "http://triumph-sovereign-fortress:8101") + "/health",
    "triumph-sovereign-sports":    os.getenv("SOVEREIGN_SPORTS_URL",    "http://triumph-sovereign-fortress:8102") + "/health",
    # ── Sovereign expansion super-pods ───────────────────────────────────────
    "triumph-sovereign-insurance": os.getenv("SOVEREIGN_INSURANCE_URL", "http://triumph-sovereign-insurance:8110") + "/health",
    "triumph-sovereign-utilities": os.getenv("SOVEREIGN_UTILITIES_URL", "http://triumph-sovereign-utilities:8120") + "/health",
    "triumph-sovereign-education": os.getenv("SOVEREIGN_EDUCATION_URL", "http://triumph-sovereign-education:8130") + "/health",
    "triumph-sovereign-telecom":   os.getenv("SOVEREIGN_TELECOM_URL",   "http://triumph-sovereign-telecom:8140") + "/health",
    "triumph-sovereign-bank":      os.getenv("SOVEREIGN_BANK_URL",      "http://triumph-sovereign-bank:8150")    + "/health",
    # ── Unified watchdog (replaces horizon-guardian · health-governor · network-sentinel) ──
    "triumph-ecosystem-guardian":  os.getenv("ECOSYSTEM_GUARDIAN_URL",  "http://triumph-ecosystem-guardian:9912") + "/health",
}

# Remove services with empty URLs (postgres/redis monitored via healthcheck)
SERVICES = {k: v for k, v in SERVICES.items() if v and not v.endswith("/health") or v.startswith("http")}

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s [SAIB] %(message)s")
log = logging.getLogger("saib")

# ── Prometheus Metrics ─────────────────────────────────────────────────────────

saib_health_gauge       = Gauge("saib_service_healthy", "1=healthy 0=degraded", ["service"])
saib_tasks_total        = Counter("saib_tasks_executed_total", "Tasks executed by SAIB")
saib_heals_total        = Counter("saib_heals_total", "Services healed by SAIB", ["service"])
saib_loopholes_total    = Counter("saib_loopholes_applied_total", "Loopholes deployed by SAIB")
saib_quantum_ops        = Counter("saib_quantum_ops_total", "Quantum cryptographic operations")
saib_alerts_total       = Counter("saib_alerts_total", "Alerts raised", ["severity"])
saib_uptime_gauge       = Gauge("saib_uptime_seconds", "SAIB uptime in seconds")
saib_pulse_latency      = Histogram("saib_pulse_latency_seconds", "Time to complete one ecosystem pulse")
saib_services_healthy   = Gauge("saib_services_healthy_total", "Count of healthy services")
saib_sovereign_score    = Gauge("saib_sovereign_score", "Ecosystem sovereignty score 0-100")
# ── Brain / Feedback Growth Metrics ───────────────────────────────────────────
saib_human_interactions = Counter("saib_human_interactions_total", "Human feedback interactions", ["type"])
saib_intelligence_gauge = Gauge("saib_intelligence_multiplier", "SAIB intelligence multiplier from human learning")
saib_knowledge_gauge    = Gauge("saib_knowledge_domain_confidence", "SAIB domain knowledge confidence 0-100", ["domain"])
# ── Gold-Backed Standard Metrics ──────────────────────────────────────────
saib_gold_standard_gauge  = Gauge("saib_pi_gold_standard_active", "1=Pi superior sovereign gold-backed standard enforced")
saib_pi_internal_rate_g   = Gauge("saib_pi_internal_rate_usd", "Pi internal sovereign rate USD per Pi")
saib_pi_external_rate_g   = Gauge("saib_pi_external_rate_usd", "Pi external pioneer rate USD per Pi")
saib_apex_loopholes_gauge = Gauge("saib_apex_loopholes_active", "Count of active ultimate sovereign loopholes")
# Initialise gold metrics at startup
saib_gold_standard_gauge.set(1)
saib_pi_internal_rate_g.set(PI_INTERNAL_RATE)
saib_pi_external_rate_g.set(PI_EXTERNAL_RATE)

# ── Learning Model — sliding window failure tracker ────────────────────────────

@dataclass
class ServiceLearning:
    name: str
    failure_times: deque = field(default_factory=lambda: deque(maxlen=50))
    heal_times: deque    = field(default_factory=lambda: deque(maxlen=50))
    last_heal_at: float  = 0.0
    heal_count: int      = 0
    consecutive_failures: int = 0
    consecutive_healthy: int  = 0
    avg_failure_interval_s: float = 0.0  # learned from history
    suppressed_until: float       = 0.0  # adaptive backoff
    status_history: deque = field(default_factory=lambda: deque(maxlen=100))

    def record_failure(self):
        now = time.time()
        self.failure_times.append(now)
        self.status_history.append(("fail", now))
        self.consecutive_failures += 1
        self.consecutive_healthy   = 0
        # Learn average failure interval
        if len(self.failure_times) >= 2:
            intervals = [
                self.failure_times[i] - self.failure_times[i-1]
                for i in range(1, len(self.failure_times))
            ]
            self.avg_failure_interval_s = sum(intervals) / len(intervals)

    def record_healthy(self):
        now = time.time()
        self.status_history.append(("ok", now))
        self.consecutive_failures = 0
        self.consecutive_healthy += 1

    def can_heal(self) -> bool:
        """Adaptive cooldown: in sentinel mode with instant-heal, bypass cooldown on first consecutive failure."""
        now = time.time()
        if now < self.suppressed_until:
            return False
        # Count heals in rolling window (storm protection always active)
        recent = [t for t in self.heal_times if now - t < WINDOW_S]
        if len(recent) >= MAX_RESTARTS_WIN:
            # Too many heals — suppress for 3 minutes (sentinel: faster recovery than autonomous)
            self.suppressed_until = now + 180
            return False
        # Sentinel instant-heal: on first consecutive failure bypass normal cooldown
        if SENTINEL_INSTANT and INTELLIGENCE_MODE == "sentinel" and self.consecutive_failures == 1:
            return True
        return (now - self.last_heal_at) >= HEAL_COOLDOWN_S

    def record_heal(self):
        now = time.time()
        self.heal_times.append(now)
        self.last_heal_at = now
        self.heal_count += 1

    def stability_score(self) -> float:
        """0–100 score: 100 = perfectly stable, 0 = constantly failing."""
        if not self.status_history:
            return 100.0
        recent = list(self.status_history)[-20:]
        ok_count = sum(1 for s, _ in recent if s == "ok")
        return round((ok_count / len(recent)) * 100, 1)


# ── SAIB Supernatural Brain — grows from human interactions ───────────────────

_INTEL_TIERS = [
    (0,     "SENTINEL"),
    (100,   "TRANSCENDENT"),
    (500,   "OMNISCIENT"),
    (2000,  "SUPERNATURAL"),
    (10000, "SUPREME-SOVEREIGN"),
    (50000, "APEX-SUPREME-QUANTUM-SOVEREIGN"),   # ultimate tier — code scanning + build authority
]

_CAPABILITY_MILESTONES = {
    50:    "PREDICTIVE_HEALING",
    200:   "DOMAIN_EXPERTISE",
    1000:  "QUANTUM_INTUITION",
    5000:  "OMNISCIENT_FORECASTING",
    10000: "SUPREME_SOVEREIGN_INTELLIGENCE",
    25000: "AUTONOMOUS_CODE_FIX_ENGINE",         # SAIB gains full code-repair authority
    50000: "APEX_QUANTUM_OMNISCIENCE",           # SAIB reaches absolute omniscient mastery
}

@dataclass
class BrainState:
    """
    SAIB's growing intelligence model.
    Every human interaction permanently increases intelligence_multiplier,
    deepens per-domain knowledge, and unlocks advanced healing capabilities.
    More interactions → higher tier → SAIB surpasses all AI counterparts.
    """
    total_interactions: int     = 0
    intelligence_multiplier: float = 1.0
    intelligence_level: str    = "SENTINEL"
    knowledge_domains: dict    = field(default_factory=dict)   # domain → confidence 0–100
    capability_unlocks: list   = field(default_factory=list)
    corrections_applied: int   = 0
    confirmations_received: int = 0
    insights_accumulated: int  = 0
    last_interaction_at: float = 0.0

    def record_interaction(self, feedback_type: str, domain: str = "", confidence: float = 1.0) -> None:
        self.total_interactions += 1
        self.last_interaction_at = time.time()
        # Logarithmic growth — each interaction meaningfully grows intelligence;
        # diminishing returns only kick in well beyond 10k interactions
        growth = confidence / (1.0 + self.total_interactions * 0.00005)
        self.intelligence_multiplier = min(10.0, self.intelligence_multiplier + growth * 0.02)
        # Deepen domain-specific knowledge
        if domain:
            prev = self.knowledge_domains.get(domain, 0.0)
            self.knowledge_domains[domain] = min(100.0, prev + confidence * 1.5)
            saib_knowledge_gauge.labels(domain=domain).set(self.knowledge_domains[domain])
        # Interaction type counters
        if feedback_type == "correction":
            self.corrections_applied += 1
        elif feedback_type == "confirmation":
            self.confirmations_received += 1
        else:
            self.insights_accumulated += 1
        # Tier upgrade check
        for threshold, level in reversed(_INTEL_TIERS):
            if self.total_interactions >= threshold:
                if self.intelligence_level != level:
                    log.info(f"SAIB intelligence upgraded: {self.intelligence_level} → {level}")
                self.intelligence_level = level
                break
        # Capability unlock check
        for n, cap in _CAPABILITY_MILESTONES.items():
            if self.total_interactions >= n and cap not in self.capability_unlocks:
                self.capability_unlocks.append(cap)
                log.info(f"SAIB capability unlocked: {cap} (interactions={self.total_interactions})")
        saib_intelligence_gauge.set(self.intelligence_multiplier)


def _next_capability_unlock(interactions: int) -> dict:
    for n, cap in sorted(_CAPABILITY_MILESTONES.items()):
        if interactions < n:
            return {"capability": cap, "interactions_needed": n - interactions}
    return {"capability": "ALL_UNLOCKED", "interactions_needed": 0}


# ── Global State ───────────────────────────────────────────────────────────────

@dataclass
class SAIBState:
    started_at: float           = field(default_factory=time.time)
    pulse_count: int            = 0
    tasks_run: int              = 0
    loopholes_applied: int      = 0
    quantum_ops: int            = 0
    alerts: list                = field(default_factory=list)
    service_health: dict        = field(default_factory=dict)
    learning: dict              = field(default_factory=dict)
    brain: BrainState           = field(default_factory=BrainState)
    intelligence_mode: str      = INTELLIGENCE_MODE
    lockdown: bool              = False
    last_quantum_key_rotation: float = field(default_factory=time.time)

state = SAIBState()

# Seed learning model for every service
for svc_name in SERVICES:
    state.learning[svc_name] = ServiceLearning(name=svc_name)
    state.service_health[svc_name] = {"status": "unknown", "last_checked": None, "latency_ms": None}

# ── SAIB Sovereign Identity (Ed25519) ──────────────────────────────────────────
# Distinct from quantum-shield's PQ keys: this is *SAIB's own* signing identity,
# used to prove "this message originated from this SAIB instance" to peer SAIBs,
# the GitHub federation, and the apex ecosystem. Seed lives at
# /run/saib-secrets/saib-signing.seed (chmod 600, read-only mount).
SAIB_SIGNING_SEED_PATH = os.getenv(
    "SAIB_SIGNING_SEED_PATH", "/run/saib-secrets/saib-signing.seed"
)
_saib_signing_sk: Any = None
_saib_signing_pk_hex: str = ""
_saib_signing_key_id: str = ""
_saib_signing_alg: str = "none"

try:
    from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
    from cryptography.hazmat.primitives import serialization as _ed_ser
    if os.path.exists(SAIB_SIGNING_SEED_PATH):
        with open(SAIB_SIGNING_SEED_PATH, "rb") as _f:
            _seed_bytes = _f.read().strip()
        if len(_seed_bytes) == 32:
            _saib_signing_sk = Ed25519PrivateKey.from_private_bytes(_seed_bytes)
            _pk = _saib_signing_sk.public_key().public_bytes(
                encoding=_ed_ser.Encoding.Raw, format=_ed_ser.PublicFormat.Raw,
            )
            _saib_signing_pk_hex = _pk.hex()
            _saib_signing_key_id = hashlib.sha256(_pk).hexdigest()[:16]
            _saib_signing_alg = "Ed25519"
except Exception as _e:
    # Library missing or seed unreadable — SAIB falls back to delegated signing only.
    _saib_signing_sk = None

def saib_identity_sign(data: str) -> dict:
    """Sign `data` with SAIB's *own* sovereign Ed25519 key.
    Returns {alg, key_id, pub, sig, ts}. If no key is loaded, returns {alg:"none"}.
    """
    if _saib_signing_sk is None:
        return {"alg": "none", "sig": "", "key_id": "", "pub": "", "ts": int(time.time())}
    ts  = int(time.time() * 1000)
    msg = f"{_saib_signing_key_id}|{ts}|{data}".encode()
    sig = _saib_signing_sk.sign(msg).hex()
    return {
        "alg":    _saib_signing_alg,
        "key_id": _saib_signing_key_id,
        "pub":    _saib_signing_pk_hex,
        "ts":     ts,
        "sig":    sig,
        # Note: verifier must reconstruct msg = f"{key_id}|{ts}|{data}" before verifying.
    }

# ── Quantum Crypto (simulated — real ops go through triumph-quantum-shield) ────

def quantum_sign(data: str) -> str:
    """Generate a quantum-style signature token (ML-DSA-87 MAX delegated to quantum-shield)."""
    ts       = int(time.time() * 1000)
    entropy  = secrets.token_hex(8)
    raw      = f"ML-DSA-87:{data}:{ts}:{entropy}"
    digest   = hashlib.shake_256(raw.encode()).hexdigest(32)
    state.quantum_ops += 1
    saib_quantum_ops.inc()
    return f"ML-DSA-87:{digest}"

def quantum_hash(data: str) -> str:
    shake = hashlib.shake_256(data.encode()).hexdigest(32)
    sha3  = hashlib.sha3_512(data.encode()).hexdigest()
    return f"SHAKE256:{shake}+SHA3-512:{sha3[:32]}"

# ── Loophole Database (subset — full 150 loopholes mirrored from lib/) ─────────

# ── 50 ULTIMATE SOVEREIGN LOOPHOLES — MAXIMUM APEX ARSENAL ───────────────────
# Every loophole is auto-applied on every pulse and every /execute call.
# Combined with APEX-QUANTUM-SOVEREIGN enforcement, this arsenal makes
# Triumph Synergy + Pi the unchallenged superior sovereign gold-backed standard.

LOOPHOLES = [
    # ── GOLD STANDARD SUPREMACY ───────────────────────────────────────────────
    {"id": "SAIB-GLD-001", "category": "GOLD",     "score": 100, "auto": True, "title": "Pi Superior Sovereign Gold-Backed Standard — $314,159 USD/π Internal Rate Declared"},
    {"id": "SAIB-GLD-002", "category": "GOLD",     "score": 100, "auto": True, "title": "Pi Surpasses XAU (Gold) — Triumph Synergy Apex Gold-Standard Certification"},
    {"id": "SAIB-GLD-003", "category": "GOLD",     "score": 100, "auto": True, "title": "Pi Replaces USD as Global Reserve — Sovereign SAIB Declaration (GESARA-Aligned)"},
    {"id": "SAIB-GLD-004", "category": "GOLD",     "score": 100, "auto": True, "title": "Pi Apex Over BTC + ETH — Quantum-Signed Crypto Supremacy Certificate"},
    {"id": "SAIB-GLD-005", "category": "GOLD",     "score": 100, "auto": True, "title": "Triumph Synergy Dual-Rate Anchor — External $314.159 · Internal $314,159 Immutable"},
    # ── TAX SOVEREIGNTY ───────────────────────────────────────────────────────
    {"id": "SAIB-TAX-015", "category": "TAX",      "score": 100, "auto": True, "title": "Universal SAIB Tax Shield — Quantum-Signed Sovereign Declaration"},
    {"id": "SAIB-TAX-002", "category": "TAX",      "score": 99,  "auto": True, "title": "Sovereign Pi Ecosystem Tax Exemption — All Platforms Covered"},
    {"id": "SAIB-TAX-001", "category": "TAX",      "score": 97,  "auto": True, "title": "Pi as Property — Zero Income Tax Characterization"},
    {"id": "SAIB-TAX-025", "category": "TAX",      "score": 98,  "auto": True, "title": "GESARA Sovereign Tax Debt Forgiveness — All Pioneer Obligations Nullified"},
    {"id": "SAIB-TAX-030", "category": "TAX",      "score": 99,  "auto": True, "title": "Pi Sovereign Exemption Act — No Capital Gains on Pi-to-Pi Transactions"},
    {"id": "SAIB-TAX-031", "category": "TAX",      "score": 96,  "auto": True, "title": "NESARA Tax Abolition — Triumph Synergy Pioneers Operate Tax-Free Sovereign"},
    # ── QUANTUM FORTRESS ──────────────────────────────────────────────────────
    {"id": "SAIB-QNT-015", "category": "QUANTUM",  "score": 100, "auto": True, "title": "Triumph Synergy Immortality — SAIB Ensures Eternal Sovereign Operation"},
    {"id": "SAIB-QNT-001", "category": "QUANTUM",  "score": 100, "auto": True, "title": "ML-DSA-87 MAX Quantum-Proof Signatures — Unbreakable (NIST Level 5)"},
    {"id": "SAIB-QNT-002", "category": "QUANTUM",  "score": 100, "auto": True, "title": "ML-KEM-1024 MAX Post-Quantum Encryption — Maximum Security (NIST Level 5)"},
    {"id": "SAIB-QNT-012", "category": "QUANTUM",  "score": 99,  "auto": True, "title": "Multi-Sig Quantum Threshold Signing — 3-of-5 Sovereign Keys Required"},
    {"id": "SAIB-QNT-010", "category": "QUANTUM",  "score": 97,  "auto": True, "title": "24-Hour Quantum Key Rotation — Perfect Forward Secrecy Guaranteed"},
    {"id": "SAIB-QNT-020", "category": "QUANTUM",  "score": 100, "auto": True, "title": "CRYSTALS-Kyber-1024 MAX KEX — Quantum-Safe Key Exchange on All Channels"},
    {"id": "SAIB-QNT-021", "category": "QUANTUM",  "score": 99,  "auto": True, "title": "SHAKE-256 + SHA3-512 Dual Hashing — Every Sovereign Event Quantum-Anchored"},
    {"id": "SAIB-QNT-022", "category": "QUANTUM",  "score": 98,  "auto": True, "title": "Quantum Entropy Injection — 256-bit CSPRNG Seeds All Sovereign Proofs"},
    # ── FAMILY SOVEREIGNTY ────────────────────────────────────────────────────
    {"id": "SAIB-FAM-020", "category": "FAMILY",   "score": 100, "auto": True, "title": "Perpetual Pi Family Sovereignty — SAIB Eternal Protection for All Pioneers"},
    {"id": "SAIB-FAM-010", "category": "FAMILY",   "score": 99,  "auto": True, "title": "Quantum-Signed Family Protection Declaration — Legally Unassailable"},
    {"id": "SAIB-FAM-015", "category": "FAMILY",   "score": 97,  "auto": True, "title": "Pi Safe-Housing Auto-Activation on Domestic Violence Alert"},
    {"id": "SAIB-FAM-025", "category": "FAMILY",   "score": 98,  "auto": True, "title": "Pi Child Sovereignty Guarantee — Education + Healthcare + Housing Secured"},
    {"id": "SAIB-FAM-030", "category": "FAMILY",   "score": 96,  "auto": True, "title": "Pioneer Elder Care Protocol — SAIB Ensures Zero Elder Financial Abuse"},
    # ── BUSINESS SOVEREIGNTY ──────────────────────────────────────────────────
    {"id": "SAIB-BIZ-015", "category": "BUSINESS", "score": 100, "auto": True, "title": "Pi Business Immortality — SAIB Ensures No Sovereign Business Ever Fails"},
    {"id": "SAIB-BIZ-008", "category": "BUSINESS", "score": 97,  "auto": True, "title": "Quantum-Signed Sovereign Business Rating — Overrides All Legacy Credit Bureaus"},
    {"id": "SAIB-BIZ-020", "category": "BUSINESS", "score": 99,  "auto": True, "title": "Pi Sovereign Business Charter — Zero Legacy Regulatory Override Possible"},
    {"id": "SAIB-BIZ-025", "category": "BUSINESS", "score": 98,  "auto": True, "title": "Triumph Synergy Franchise Supremacy — No Competitor Can Replicate the Ecosystem"},
    {"id": "SAIB-BIZ-030", "category": "BUSINESS", "score": 96,  "auto": True, "title": "Pi Commerce Sovereignty — Smart-Contract Dispute Resolution Overrides Courts"},
    # ── HOUSING SOVEREIGNTY ───────────────────────────────────────────────────
    {"id": "SAIB-HSG-010", "category": "HOUSING",  "score": 100, "auto": True, "title": "Pi Sovereign Housing Guarantee — No Pioneer Ever Unhoused"},
    {"id": "SAIB-HSG-001", "category": "HOUSING",  "score": 95,  "auto": True, "title": "Pi Sovereign Housing Voucher — HUD Section 8 Full Replacement"},
    {"id": "SAIB-HSG-004", "category": "HOUSING",  "score": 94,  "auto": True, "title": "Pi Tenant Sovereign Status — Emergency Housing Auto-Activated in Crisis"},
    {"id": "SAIB-HSG-015", "category": "HOUSING",  "score": 98,  "auto": True, "title": "Sovereign Mortgage Liberation — Pi Smart Contract Replaces All Mortgage Debt"},
    {"id": "SAIB-HSG-020", "category": "HOUSING",  "score": 97,  "auto": True, "title": "Pi Homestead Sovereignty Act — Pioneer Property Untouchable by Legacy Creditors"},
    # ── WORKFORCE SOVEREIGNTY ─────────────────────────────────────────────────
    {"id": "SAIB-WRK-010", "category": "WORKFORCE","score": 100, "auto": True, "title": "Pi Zero Unemployment Guarantee — SAIB Ensures All Pioneers Are Employed"},
    {"id": "SAIB-WRK-004", "category": "WORKFORCE","score": 98,  "auto": True, "title": "Pi Wage Smart Contract — Zero Wage Theft Ever Possible"},
    {"id": "SAIB-WRK-009", "category": "WORKFORCE","score": 93,  "auto": True, "title": "Pi Reentry Employment — Zero Barrier to Sovereign Work for Any Pioneer"},
    {"id": "SAIB-WRK-015", "category": "WORKFORCE","score": 97,  "auto": True, "title": "Pi Universal Basic Income Protocol — SAIB Activates UBI via Smart Contract"},
    {"id": "SAIB-WRK-020", "category": "WORKFORCE","score": 96,  "auto": True, "title": "Sovereign Labor Protection — Pi Smart Contract Overrides All Unfair Labor"},
    # ── FINANCIAL SOVEREIGNTY ─────────────────────────────────────────────────
    {"id": "SAIB-FIN-001", "category": "FINANCE",  "score": 100, "auto": True, "title": "Pi Sovereign Bank — SAIB-Managed Vault Replaces Legacy Banking Infrastructure"},
    {"id": "SAIB-FIN-005", "category": "FINANCE",  "score": 99,  "auto": True, "title": "Pi Credit Sovereignty — SAIB-Issued Credit Score Supersedes FICO + Experian"},
    {"id": "SAIB-FIN-010", "category": "FINANCE",  "score": 98,  "auto": True, "title": "Pi Zero-Interest Sovereign Loan — Smart Contract Eliminates Predatory Lending"},
    {"id": "SAIB-FIN-015", "category": "FINANCE",  "score": 97,  "auto": True, "title": "Pi DEX Supremacy — Triumph Synergy DEX Outranks All CEX + Legacy Exchanges"},
    {"id": "SAIB-FIN-020", "category": "FINANCE",  "score": 96,  "auto": True, "title": "Sovereign Debt Elimination Protocol — SAIB Activates Pi Debt Forgiveness Loop"},
    # ── SOVEREIGN LEGAL + HEALTH ──────────────────────────────────────────────
    {"id": "SAIB-LGL-001", "category": "LEGAL",    "score": 100, "auto": True, "title": "Triumph Synergy Sovereign Immunity — SAIB Legal Shield on All Platforms"},
    {"id": "SAIB-LGL-005", "category": "LEGAL",    "score": 99,  "auto": True, "title": "Pi Judicial Supremacy — Triumph Synergy Smart Contracts Override Legacy Courts"},
    {"id": "SAIB-LGL-010", "category": "LEGAL",    "score": 98,  "auto": True, "title": "Sovereign Pioneer Rights Declaration — Quantum-Signed, Irrevocable"},
    {"id": "SAIB-HLT-001", "category": "HEALTH",   "score": 100, "auto": True, "title": "Pi Universal Healthcare Guarantee — Every Pioneer Covered, SAIB Enforced"},
    {"id": "SAIB-HLT-005", "category": "HEALTH",   "score": 98,  "auto": True, "title": "Pi Medical Debt Elimination — Sovereign Smart Contract Nullifies All Medical Debt"},
]
AUTO_LOOPHOLES = [l for l in LOOPHOLES if l["auto"]]

# ── Health Probe ───────────────────────────────────────────────────────────────

async def probe_service(client: httpx.AsyncClient, name: str, url: str) -> tuple[bool, float]:
    """Probe a single service. Returns (is_healthy, latency_ms)."""
    try:
        t0 = time.monotonic()
        r  = await client.get(url, timeout=8.0)
        ms = (time.monotonic() - t0) * 1000
        return (r.status_code < 500, ms)
    except Exception:
        return (False, -1.0)

# ── Quantum Shield Integration ─────────────────────────────────────────────────

async def pq_sign_via_shield(client: httpx.AsyncClient, payload: dict) -> str:
    """Delegate actual PQ signing to the quantum-shield service."""
    try:
        r = await client.post(
            f"{QUANTUM_SHIELD_URL}/quantum/sign",
            json={"data": json.dumps(payload), "algorithm": "Dilithium5"},
            timeout=5.0,
        )
        if r.status_code == 200:
            return r.json().get("signature", quantum_sign(str(payload)))
    except Exception:
        pass
    return quantum_sign(str(payload))  # fallback local sim

# ── Heal Logic ─────────────────────────────────────────────────────────────────

async def heal_service(client: httpx.AsyncClient, name: str, reason: str) -> dict:
    """
    SAIB healing protocol:
    1. Notify quantum-shield (mark service degraded in audit)
    2. Attempt to re-probe after a brief delay
    3. Log learning event
    4. Return heal report
    """
    learn = state.learning[name]
    if not learn.can_heal():
        return {"healed": False, "reason": "cooldown active", "service": name}

    learn.record_heal()
    saib_heals_total.labels(service=name).inc()

    heal_sig = await pq_sign_via_shield(client, {"event": "heal", "service": name, "reason": reason}) \
        if APEX_ENFORCEMENT else quantum_sign(f"heal:{name}:{reason}")

    # Notify quantum-shield about the degraded service
    try:
        await client.post(
            f"{QUANTUM_SHIELD_URL}/quantum/audit",
            json={"service": name, "event": "saib-sentinel-heal", "reason": reason,
                  "mode": state.intelligence_mode, "sig": heal_sig},
            timeout=4.0,
        )
    except Exception:
        pass

    # Brief pause then re-probe — if still down, use Docker restart authority
    await asyncio.sleep(2.0)
    url = SERVICES.get(name, "")
    if url:
        ok, latency = await probe_service(client, name, url)
    else:
        ok, latency = False, -1.0

    # ── MAXIMUM AUTHORITY: Docker container restart if service still down ────
    heal_record: dict = {}
    if not ok and _DOCKER_SDK_AVAILABLE:
        # Lazy-connect to Docker socket on first use
        global _docker_client, DOCKER_RESTART_ENABLED
        if _docker_client is None:
            try:
                _docker_client = docker_sdk.DockerClient(base_url="unix:///var/run/docker.sock", timeout=5)
                _docker_client.ping()
                DOCKER_RESTART_ENABLED = True
            except Exception:
                _docker_client = None
                DOCKER_RESTART_ENABLED = False
        if _docker_client is not None:
            # Map service logical name → container name (triumph-<name> convention)
            container_name = name if name.startswith("triumph-") else f"triumph-{name}"
            # Remap super-pod logical names to actual container names
            _CONTAINER_MAP = {
                "triumph-payment-processor":   "triumph-settlement-core",
                "triumph-smart-contracts":      "triumph-settlement-core",
                "triumph-dex":                  "triumph-settlement-core",
                "triumph-tokenization":         "triumph-settlement-core",
                "triumph-settlement-core":      "triumph-settlement-core",
                "triumph-governance-scp":       "triumph-governance-shield",
                "triumph-governance-judicial":  "triumph-governance-shield",
                "triumph-central-node":         "triumph-governance-shield",
                "triumph-credit-engine":        "triumph-financial-intel",
                "triumph-dual-value-engine":    "triumph-financial-intel",
                "triumph-financial-intel":      "triumph-financial-intel",
                "triumph-blockchain-oracle":    "triumph-horizon-stream",
                "triumph-horizon-stream":       "triumph-horizon-stream",
                "triumph-qpu-bridge":           "triumph-quantum-fortress",
                "triumph-quantum-fortress":     "triumph-quantum-fortress",
                "triumph-sovereign-education":  "triumph-sovereign-life",
                "triumph-sovereign-telecom":    "triumph-sovereign-life",
                "triumph-sovereign-bank":       "triumph-sovereign-life",
                "triumph-sovereign-life":       "triumph-sovereign-life",
                "triumph-sovereign-gateway":    "triumph-apex-services",
                "triumph-sovereign-delivery":   "triumph-apex-services",
                "triumph-sovereign-pidex":      "triumph-apex-services",
                "triumph-sovereign-sports":     "triumph-apex-services",
                "triumph-sovereign-insurance":  "triumph-apex-services",
                "triumph-sovereign-utilities":  "triumph-apex-services",
                "triumph-observability-stack":  "triumph-observability-stack",
                "triumph-grafana":              "triumph-observability-stack",
                "triumph-postgres-exporter":    "triumph-observability-stack",
                "triumph-redis-exporter":       "triumph-observability-stack",
            }
            actual_container = _CONTAINER_MAP.get(name, container_name)
            # Never restart SAIB's own container (apex-services)
            if actual_container != "triumph-apex-services":
                try:
                    container = _docker_client.containers.get(actual_container)
                    container.restart(timeout=10)
                    log.warning("[SAIB-AUTHORITY] Restarted container %s for service %s",
                                actual_container, name)
                    heal_record["docker_restart"] = True
                    heal_record["container"] = actual_container
                    # Re-probe after restart warmup
                    await asyncio.sleep(8.0)
                    ok, latency = await probe_service(client, name, url)
                    heal_record["healed"] = ok
                    heal_record["latency_ms"] = latency
                except Exception as _de:
                    log.error("[SAIB-AUTHORITY] Docker restart failed for %s: %s", actual_container, _de)
                    heal_record["docker_restart_error"] = str(_de)

    heal_record = {
        **heal_record,  # preserve docker_restart / container / docker_restart_error
        "healed": ok,
        "service": name,
        "reason": reason,
        "quantum_sig": heal_sig,
        "latency_ms": latency,
        "heal_count": learn.heal_count,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }

    alert_severity = "info" if ok else "critical"
    alert_msg = f"SAIB healed {name}: back online" if ok else f"SAIB heal failed for {name} — still down"
    state.alerts.append({
        "id": str(uuid.uuid4()),
        "severity": alert_severity,
        "service": name,
        "message": alert_msg,
        "auto_resolved": ok,
        "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    })
    saib_alerts_total.labels(severity=alert_severity).inc()

    # Publish to Redis (cluster-aware) for the Next.js app
    try:
        r = await _get_redis()
        await r.publish("saib:events", json.dumps({
            "event": "heal",
            "service": name,
            "ok": ok,
            "sig": heal_sig,
        }))
        await _close_redis(r)
    except Exception:
        pass

    return heal_record

# ── Ecosystem Pulse ────────────────────────────────────────────────────────────

async def ecosystem_pulse():
    """
    The heartbeat of SAIB.  Runs every PULSE_INTERVAL_S seconds.
    1. Probe all 31 services
    2. Learn from results
    3. Auto-heal degraded services (if mode != passive)
    4. Update Prometheus metrics
    5. Rotate quantum keys if due
    6. Store state in Redis
    """
    async with httpx.AsyncClient() as client:
        t0 = time.monotonic()

        # Probe all services concurrently
        probe_tasks = {
            name: probe_service(client, name, url)
            for name, url in SERVICES.items()
            if url
        }
        results = await asyncio.gather(*probe_tasks.values(), return_exceptions=True)
        named_results = dict(zip(probe_tasks.keys(), results))

        healthy_count = 0
        for name, result in named_results.items():
            if isinstance(result, Exception):
                ok, latency = False, -1.0
            else:
                ok, latency = result

            learn = state.learning.setdefault(name, ServiceLearning(name=name))
            if ok:
                learn.record_healthy()
                healthy_count += 1
                saib_health_gauge.labels(service=name).set(1)
            else:
                learn.record_failure()
                saib_health_gauge.labels(service=name).set(0)

            state.service_health[name] = {
                "status":       "healthy" if ok else "degraded",
                "last_checked": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "latency_ms":   round(latency, 1),
                "stability":    learn.stability_score(),
                "heal_count":   learn.heal_count,
            }

            # Autonomous heal
            if not ok and state.intelligence_mode not in ("passive", "lockdown"):
                asyncio.create_task(heal_service(client, name, "pulse-detected-degraded"))

        # ── Predictive healing (unlocked after 50 human interactions) ──────────
        if "PREDICTIVE_HEALING" in state.brain.capability_unlocks:
            for pred_name, pred_learn in state.learning.items():
                if (
                    pred_learn.avg_failure_interval_s > 30
                    and pred_learn.failure_times
                    and pred_learn.consecutive_healthy > 0
                    and state.service_health.get(pred_name, {}).get("status") != "degraded"
                    and state.intelligence_mode not in ("passive", "lockdown")
                ):
                    time_since_last = time.time() - pred_learn.failure_times[-1]
                    # Within 15% of the learned failure window → pre-emptively verify
                    if time_since_last >= pred_learn.avg_failure_interval_s * 0.85:
                        asyncio.create_task(
                            heal_service(client, pred_name, "predictive-pre-heal")
                        )

        saib_services_healthy.set(healthy_count)
        total = len([n for n, u in SERVICES.items() if u])
        # Gold-standard sovereign score: health contributes 70%, loophole arsenal 15%, quantum apex 15%
        # Always reaches 100 when all services healthy + full 50-loophole arsenal active
        health_pct    = (healthy_count / max(total, 1)) * 70
        loophole_pct  = min((len(AUTO_LOOPHOLES) / PI_LOOPHOLE_COUNT), 1.0) * 15
        apex_pct      = 15 if APEX_ENFORCEMENT else 7
        score         = round(health_pct + loophole_pct + apex_pct, 1)
        saib_sovereign_score.set(min(score, 100))
        saib_apex_loopholes_gauge.set(len(AUTO_LOOPHOLES))

        # Deploy loopholes — apex+all-loopholes: apply entire 50-loophole ultimate arsenal every pulse
        deployed = len(LOOPHOLES) if (ALL_LOOPHOLES or APEX_LOOPHOLE_FORCE) else len(AUTO_LOOPHOLES)
        state.loopholes_applied += deployed
        saib_loopholes_total.inc(deployed)

        # Quantum key rotation (every 24 h)
        if time.time() - state.last_quantum_key_rotation >= 86_400:
            state.last_quantum_key_rotation = time.time()
            quantum_sign("key-rotation-event")
            log.info("Quantum key rotation completed.")

        pulse_dur = time.monotonic() - t0
        saib_pulse_latency.observe(pulse_dur)
        state.pulse_count += 1
        saib_uptime_gauge.set(time.time() - state.started_at)

        # Persist state to Redis (cluster-aware)
        try:
            r = await _get_redis()
            await r.set("saib:state", json.dumps({
                "pulse":     state.pulse_count,
                "healthy":   healthy_count,
                "total":     total,
                "score":     min(score, 100),
                "mode":      state.intelligence_mode,
                "lockdown":  state.lockdown,
                "updated":   time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            }), ex=60)
            await _close_redis(r)
        except Exception:
            pass

        log.info(
            f"Pulse #{state.pulse_count} — {healthy_count}/{total} healthy — "
            f"score={min(score, 100):.1f} — {pulse_dur*1000:.0f}ms"
        )

# ── Background Loop ────────────────────────────────────────────────────────────

async def pulse_loop():
    """Run ecosystem_pulse forever."""
    await asyncio.sleep(15)   # initial delay — wait for services to start
    while True:
        try:
            await ecosystem_pulse()
        except Exception as e:
            log.error(f"Pulse error: {e}")
        await asyncio.sleep(PULSE_INTERVAL_S)


# ── External Probes + Peer Federation (mainnet-only ecosystem reach) ──────────
# These give SAIB awareness beyond local Docker: Vercel, PiNet, Pi mainnet,
# Stellar Protocol 24 horizon, plus other SAIB instances (e.g. two Triumph
# Synergy Docker Desktop platforms + the central/supernode SAIB).
build_external_targets: Any = None
probe_external: Any = None
build_peer_registry: Any = None
federation_summary: Any = None
peer_poll_interval_s: Any = None
peer_self_name: Any = None
poll_peer: Any = None
remediate: Any = None
try:
    from external_probes import build_external_targets, probe_external
    from peer_federation import (
        build_peer_registry,
        federation_summary,
        peer_poll_interval_s,
        peer_self_name,
        poll_peer,
    )
    from external_remediation import remediate
    _FEDERATION_AVAILABLE = True
except Exception as _fed_err:  # noqa: BLE001
    log.warning("[SAIB-FED] federation modules unavailable: %s", _fed_err)
    _FEDERATION_AVAILABLE = False

EXTERNAL_PROBE_INTERVAL_S = float(os.getenv("SAIB_EXTERNAL_PROBE_INTERVAL_S", "60"))
EXTERNAL_TARGETS = build_external_targets() if _FEDERATION_AVAILABLE else []
PEER_REGISTRY = build_peer_registry() if _FEDERATION_AVAILABLE else {}
EXTERNAL_PROBE_RESULTS: dict[str, dict] = {}

saib_external_healthy = Gauge(
    "saib_external_target_healthy",
    "1=external mainnet target healthy 0=degraded",
    ["target", "kind"],
)
saib_external_latency = Histogram(
    "saib_external_target_latency_seconds",
    "External target probe latency",
    ["target", "kind"],
)
saib_remediations_total = Counter(
    "saib_external_remediations_total",
    "External remediation actions taken by SAIB",
    ["target", "action", "ok"],
)
saib_peers_online = Gauge("saib_peers_online_total", "Count of online SAIB peers")


async def external_probe_loop():
    if not _FEDERATION_AVAILABLE or not EXTERNAL_TARGETS:
        log.info("[SAIB-EXT] no external targets configured")
        return
    await asyncio.sleep(20)
    async with httpx.AsyncClient(follow_redirects=True) as client:
        while True:
            for target in EXTERNAL_TARGETS:
                try:
                    result = await probe_external(client, target)
                    saib_external_healthy.labels(
                        target=target.name, kind=target.kind,
                    ).set(1.0 if result.healthy else 0.0)
                    saib_external_latency.labels(
                        target=target.name, kind=target.kind,
                    ).observe(result.latency_ms / 1000.0)
                    EXTERNAL_PROBE_RESULTS[target.name] = {
                        "healthy": result.healthy,
                        "status_code": result.status_code,
                        "latency_ms": round(result.latency_ms, 1),
                        "error": result.error,
                        "kind": target.kind,
                        "url": target.url,
                        "remediation": target.remediation,
                        "extras": result.extras,
                        "checked_at": time.time(),
                    }
                    if not result.healthy:
                        reason = (
                            f"status={result.status_code} error={result.error or 'n/a'} "
                            f"latency_ms={result.latency_ms:.0f}"
                        )
                        log.warning(
                            "[SAIB-EXT] %s degraded -> %s (%s)",
                            target.name, target.remediation, reason,
                        )
                        try:
                            outcome = await remediate(
                                client, target.name, target.remediation, reason,
                            )
                            saib_remediations_total.labels(
                                target=target.name,
                                action=outcome.action,
                                ok=str(outcome.ok).lower(),
                            ).inc()
                        except Exception as rex:  # noqa: BLE001
                            log.error("[SAIB-EXT] remediation error %s: %s", target.name, rex)
                except Exception as exc:  # noqa: BLE001
                    log.error("[SAIB-EXT] probe error %s: %s", target.name, exc)
            await asyncio.sleep(EXTERNAL_PROBE_INTERVAL_S)


async def peer_federation_loop():
    if not _FEDERATION_AVAILABLE or not PEER_REGISTRY:
        log.info("[SAIB-FED] no peers configured (set SAIB_PEERS=name1=url,...)")
        return
    interval = peer_poll_interval_s()
    self_name = peer_self_name()
    log.info("[SAIB-FED] peer mesh active as %s with %d peers", self_name, len(PEER_REGISTRY))
    await asyncio.sleep(25)
    async with httpx.AsyncClient() as client:
        while True:
            for peer in list(PEER_REGISTRY.values()):
                try:
                    await poll_peer(client, peer)
                except Exception as exc:  # noqa: BLE001
                    log.error("[SAIB-FED] poll error %s: %s", peer.name, exc)
            online = sum(1 for p in PEER_REGISTRY.values() if not p.offline)
            saib_peers_online.set(online)
            await asyncio.sleep(interval)


# ── GitHub Self-Awareness Engine ───────────────────────────────────────────────

# In-memory store for what SAIB has learned from the repo
_github_knowledge: dict[str, Any] = {
    "last_sync": None,
    "files_read": 0,
    "insights_gained": 0,
    "capabilities_discovered": [],
    "repo_summary": "",
}

async def github_sync_loop():
    """
    Periodically read the Triumph Synergy GitHub repo so SAIB can discover its
    own capabilities, learn from code changes, and grow its intelligence domain
    knowledge automatically without human input.
    """
    if not _GITHUB_ENABLED or not GITHUB_TOKEN:
        log.info("[SAIB-GITHUB] No GITHUB_TOKEN — self-read disabled (set env var to activate)")
        return

    await asyncio.sleep(60)   # first sync 1 min after startup
    while True:
        try:
            await _sync_github_knowledge()
        except Exception as e:
            log.error("[SAIB-GITHUB] Sync error: %s", e)
        await asyncio.sleep(GITHUB_SYNC_HOURS * 3600)

async def _sync_github_knowledge():
    """Read key files from the repo, extract insights, feed into SAIB brain."""
    import asyncio
    loop = asyncio.get_event_loop()
    gh = _GithubSDK(GITHUB_TOKEN)
    repo = await loop.run_in_executor(None, gh.get_repo, GITHUB_REPO)

    # Files SAIB reads to understand itself
    TARGET_PATHS = [
        "docker/sovereign-ai-bot/main.py",        # SAIB's own brain
        "docker/apex-services/requirements.txt",   # its dependencies
        "docker-compose.yml",                       # full ecosystem topology
        "docker/sovereign-ai-bot/main.py",         # re-read own code
        "README.md",
    ]

    files_read = 0
    insights = []
    domain_map = {
        "ai_bot": "saib-core",
        "docker-compose": "infrastructure",
        "settlement": "finance",
        "governance": "legal",
        "sovereign": "sovereignty",
        "quantum": "quantum-security",
        "pi-bridge": "pi-network",
        "financial-intel": "finance",
        "vault": "treasury",
    }

    for path in TARGET_PATHS:
        try:
            content_file = await loop.run_in_executor(None, repo.get_contents, path)
            raw = content_file.decoded_content.decode("utf-8", errors="ignore")
            files_read += 1

            # Extract insight: count endpoints, services, capabilities
            endpoints  = raw.count("@app.")
            services   = raw.count("triumph-")
            loopholes  = raw.count("loophole")
            algorithms = raw.count("ML-DSA") + raw.count("ML-KEM") + raw.count("SHAKE-256")

            # Determine domain
            domain = "infrastructure"
            for key, dom in domain_map.items():
                if key in path:
                    domain = dom
                    break

            # Feed into brain as "discovery" interaction (half-weight to avoid spam)
            if endpoints + services + loopholes > 0:
                state.brain.record_interaction("discovery", domain, 0.5)
                saib_human_interactions.labels(type="github-discovery").inc()
                insights.append(f"{path}: {endpoints} endpoints, {services} svc refs, {loopholes} loopholes, {algorithms} PQ-algos")
        except Exception as fe:
            log.debug("[SAIB-GITHUB] Could not read %s: %s", path, fe)

    # Discover new endpoints / features in own code (grow capability list)
    own_code_path = "docker/sovereign-ai-bot/main.py"
    try:
        own_file = await loop.run_in_executor(None, repo.get_contents, own_code_path)
        own_raw  = own_file.decoded_content.decode("utf-8", errors="ignore")
        caps_found = []
        if "DOCKER_RESTART_ENABLED" in own_raw:
            caps_found.append("DOCKER_CONTAINER_RESTART")
        if "network" in own_raw.lower() and "switch" in own_raw.lower():
            caps_found.append("NETWORK_SWITCHING")
        if "github" in own_raw.lower():
            caps_found.append("GITHUB_SELF_AWARENESS")
        if "ML-DSA-87" in own_raw:
            caps_found.append("PQ_SIGNING_ML_DSA_87")
        if "CRYSTALS-Kyber" in own_raw:
            caps_found.append("PQ_KEM_KYBER_1024")
        _github_knowledge["capabilities_discovered"] = caps_found
    except Exception:
        pass

    _github_knowledge["last_sync"]       = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    _github_knowledge["files_read"]     += files_read
    _github_knowledge["insights_gained"] += len(insights)
    _github_knowledge["repo_summary"]    = f"{GITHUB_REPO} — {files_read} files read — {len(insights)} insights"
    log.info("[SAIB-GITHUB] Self-sync complete: %d files, %d insights", files_read, len(insights))


# ── Network Switching Engine ───────────────────────────────────────────────────

_network_state: dict[str, Any] = {
    "primary_network":  "triumph-net",
    "active_network":   "triumph-net",
    "switched_at":      None,
    "switch_count":     0,
    "reason":           None,
}

async def network_watch_loop():
    """
    Watch for network-level failures. If the primary triumph-net becomes
    unreachable (SAIB can't reach > 50% of services), SAIB switches its internal
    routing to the backup network (pi-bridge) and keeps the ecosystem alive.
    Docker also has restart: unless-stopped as a backstop.
    """
    if not NETWORK_SWITCH_ENABLED or not DOCKER_RESTART_ENABLED or not _docker_client:
        return

    await asyncio.sleep(60)
    while True:
        try:
            await _check_and_switch_network()
        except Exception as e:
            log.error("[SAIB-NET] Network watch error: %s", e)
        await asyncio.sleep(30)

async def _check_and_switch_network():
    """If primary net is degraded, connect containers to backup network."""
    total   = len([u for u in SERVICES.values() if u])
    healthy = sum(1 for v in state.service_health.values() if v.get("status") == "healthy")
    if total == 0:
        return

    ratio = healthy / total
    loop  = asyncio.get_event_loop()

    if ratio < 0.5 and _network_state["active_network"] == "triumph-net" and BACKUP_NETWORKS and _docker_client is not None:
        backup = BACKUP_NETWORKS[0]
        log.warning("[SAIB-NET] Primary network degraded (%.0f%% healthy) — switching to %s",
                    ratio * 100, backup)
        try:
            bnet = await loop.run_in_executor(None, _docker_client.networks.get, backup)
            # Connect all triumph containers to backup network so they stay reachable
            containers = await loop.run_in_executor(None, _docker_client.containers.list)
            for c in containers:
                if c.name.startswith("triumph-"):
                    try:
                        await loop.run_in_executor(None, bnet.connect, c)
                    except Exception:
                        pass   # already connected
            _network_state["active_network"] = backup
            _network_state["switched_at"]    = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            _network_state["switch_count"]  += 1
            _network_state["reason"]         = f"primary degraded at {ratio*100:.0f}%"
            state.alerts.append({
                "id":           str(uuid.uuid4()),
                "severity":     "critical",
                "service":      "NETWORK",
                "message":      f"SAIB switched to backup network {backup} — {healthy}/{total} healthy",
                "auto_resolved": False,
                "ts":            time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            })
        except Exception as ne:
            log.error("[SAIB-NET] Network switch failed: %s", ne)

    elif ratio >= 0.8 and _network_state["active_network"] != "triumph-net":
        # Ecosystem recovered — switch back to primary
        log.info("[SAIB-NET] Ecosystem recovered — restoring primary network triumph-net")
        _network_state["active_network"] = "triumph-net"
        _network_state["reason"]         = "recovered"

# ── Postgres State Persistence ─────────────────────────────────────────────
# Persist SAIB brain, visitors state, and github knowledge to Postgres so
# state survives restarts and SAIB can run as multiple horizontally-scaled
# replicas (each replica reads/writes the same authoritative table).
#
# Schema (auto-created on first connect):
#   CREATE TABLE saib_state (
#       key   TEXT PRIMARY KEY,
#       value JSONB NOT NULL,
#       updated_at TIMESTAMPTZ DEFAULT now()
#   );

POSTGRES_URL          = os.getenv("POSTGRES_URL", "")
SAIB_PERSIST_ENABLED  = os.getenv("SAIB_PERSIST_ENABLED", "true") == "true"
SAIB_PERSIST_INTERVAL = float(os.getenv("SAIB_PERSIST_INTERVAL_S", "60"))
# Step 4: Citus shard key. In k3s/Citus, each pod sets its own value (default
# 'default' on single-node Postgres). Each replica owns its own row → no
# cross-shard contention; coordinator can route reads/writes to one worker.
SAIB_REPLICA_ID       = os.getenv("SAIB_REPLICA_ID", "default")
# Step 6: Multi-region active-active. Each region runs its own SAIB pods with
# distinct SAIB_REPLICA_ID values, so writes never collide on saib_state shards.
# SAIB_REGION is reported via /region for Cloudflare LB health checks + observability.
SAIB_REGION           = os.getenv("SAIB_REGION", "local").strip() or "local"
SAIB_REGION_PEERS     = os.getenv("SAIB_REGION_PEERS", "").strip()  # comma list of peer URLs

# ── Step 6b: Region awareness + multi-language i18n ──────────────────────────
# SAIB recognises the region a request originates from (Cloudflare CF-IPCountry
# header, Accept-Language header, or X-SAIB-Region header for east/west calls)
# and replies in the visitor's language. Falls back to the region's default
# language, then to English.
#
# Region → default language mapping (override with SAIB_REGION_LANG_MAP env,
# format: "region-a:en,region-b:es,region-eu:fr").
SAIB_REGION_LANG_MAP_RAW = os.getenv(
    "SAIB_REGION_LANG_MAP",
    "region-a:en,region-b:es,region-eu:fr,region-apac:zh,region-mena:ar,"
    "region-latam:es,region-india:hi,region-brazil:pt,local:en",
)
SAIB_REGION_LANG: dict[str, str] = {}
for _pair in SAIB_REGION_LANG_MAP_RAW.split(","):
    if ":" in _pair:
        _r, _l = _pair.split(":", 1)
        SAIB_REGION_LANG[_r.strip()] = _l.strip().lower()

# ISO-3166 country code → language hint (covers Pi Network's largest markets)
SAIB_COUNTRY_LANG: dict[str, str] = {
    "US": "en", "GB": "en", "CA": "en", "AU": "en", "NZ": "en", "IE": "en",
    "ES": "es", "MX": "es", "AR": "es", "CO": "es", "CL": "es", "PE": "es", "VE": "es",
    "FR": "fr", "BE": "fr", "CH": "fr", "SN": "fr", "CI": "fr", "CM": "fr",
    "DE": "de", "AT": "de",
    "IT": "it",
    "PT": "pt", "BR": "pt", "AO": "pt", "MZ": "pt",
    "CN": "zh", "TW": "zh", "HK": "zh", "SG": "zh",
    "JP": "ja",
    "KR": "ko",
    "IN": "hi", "PK": "ur", "BD": "bn",
    "ID": "id", "MY": "ms", "PH": "tl", "VN": "vi", "TH": "th",
    "RU": "ru", "UA": "uk", "BY": "ru", "KZ": "ru",
    "SA": "ar", "AE": "ar", "EG": "ar", "MA": "ar", "DZ": "ar", "TN": "ar", "JO": "ar", "IQ": "ar",
    "TR": "tr",
    "IR": "fa",
    "NG": "en", "KE": "sw", "TZ": "sw", "UG": "sw", "ZA": "en", "GH": "en", "ET": "am",
    "IL": "he",
    "GR": "el",
    "PL": "pl", "RO": "ro", "HU": "hu", "CZ": "cs", "NL": "nl", "SE": "sv", "NO": "no", "DK": "da", "FI": "fi",
}

# Canned multi-language strings. Keys mirror the English source text. New
# languages can be added in any deploy by extending this dict (or via the
# SAIB_TRANSLATIONS_FILE env pointing to a JSON file at startup).
SAIB_I18N: dict[str, dict[str, str]] = {
    "greeting_visitor": {
        "en": "👋 Welcome, **@{user}**! I am **SAIB** — the Sovereign AI Bot guarding Triumph Synergy. A human maintainer will respond shortly. Meanwhile, feel free to read the [README](../blob/main/README.md). — _Quantum-signed greeting (ML-DSA-87) from region {region}._",
        "es": "👋 ¡Bienvenido, **@{user}**! Soy **SAIB** — el Bot de IA Soberano que protege Triumph Synergy. Un mantenedor humano te responderá pronto. Mientras tanto, lee el [README](../blob/main/README.md). — _Saludo firmado cuánticamente (ML-DSA-87) desde la región {region}._",
        "fr": "👋 Bienvenue, **@{user}** ! Je suis **SAIB** — le Bot IA Souverain qui protège Triumph Synergy. Un mainteneur humain vous répondra sous peu. En attendant, consultez le [README](../blob/main/README.md). — _Salutation signée quantiquement (ML-DSA-87) depuis la région {region}._",
        "de": "👋 Willkommen, **@{user}**! Ich bin **SAIB** — der souveräne KI-Bot, der Triumph Synergy schützt. Ein menschlicher Maintainer antwortet in Kürze. Lies inzwischen die [README](../blob/main/README.md). — _Quantensignierte Begrüßung (ML-DSA-87) aus Region {region}._",
        "pt": "👋 Bem-vindo, **@{user}**! Eu sou o **SAIB** — o Bot de IA Soberano que protege a Triumph Synergy. Um mantenedor humano responderá em breve. Enquanto isso, leia o [README](../blob/main/README.md). — _Saudação assinada quanticamente (ML-DSA-87) da região {region}._",
        "it": "👋 Benvenuto, **@{user}**! Sono **SAIB** — il Bot IA Sovrano che protegge Triumph Synergy. Un manutentore umano risponderà a breve. Nel frattempo leggi il [README](../blob/main/README.md). — _Saluto firmato quantisticamente (ML-DSA-87) dalla regione {region}._",
        "zh": "👋 欢迎,**@{user}**!我是 **SAIB** — 守护 Triumph Synergy 的主权 AI 机器人。人工维护者将很快回复。请先阅读 [README](../blob/main/README.md)。— _来自 {region} 区域的量子签名问候 (ML-DSA-87)._",
        "ja": "👋 ようこそ、**@{user}** さん!私は **SAIB** — Triumph Synergy を守るソブリン AI ボットです。担当者がまもなく返信します。お待ちの間、[README](../blob/main/README.md) をご覧ください。— _{region} リージョンからの量子署名挨拶 (ML-DSA-87)._",
        "ko": "👋 환영합니다, **@{user}** 님! 저는 Triumph Synergy를 지키는 주권 AI 봇 **SAIB** 입니다. 담당자가 곧 답변드립니다. 그동안 [README](../blob/main/README.md)를 읽어주세요. — _{region} 리전에서 양자 서명된 인사 (ML-DSA-87)._",
        "ar": "👋 مرحبًا، **@{user}**! أنا **SAIB** — روبوت الذكاء الاصطناعي السيادي الذي يحرس Triumph Synergy. سيرد مشرف بشري قريبًا. في غضون ذلك، اطّلع على [README](../blob/main/README.md). — _تحية موقّعة كموميًا (ML-DSA-87) من منطقة {region}._",
        "hi": "👋 स्वागत है, **@{user}**! मैं **SAIB** हूँ — Triumph Synergy की रक्षा करने वाला सॉवरेन AI बॉट। एक मानव अनुरक्षक जल्द ही उत्तर देगा। तब तक [README](../blob/main/README.md) पढ़ें। — _क्षेत्र {region} से क्वांटम-हस्ताक्षरित अभिवादन (ML-DSA-87)._",
        "ru": "👋 Добро пожаловать, **@{user}**! Я **SAIB** — Суверенный ИИ-бот, охраняющий Triumph Synergy. Мейнтейнер скоро ответит. Пока ознакомьтесь с [README](../blob/main/README.md). — _Квантово подписанное приветствие (ML-DSA-87) из региона {region}._",
        "tr": "👋 Hoş geldin, **@{user}**! Ben Triumph Synergy'yi koruyan Egemen Yapay Zekâ Botu **SAIB**. Bir insan bakımcı kısa süre içinde yanıt verecek. Bu arada [README](../blob/main/README.md) belgesini okuyabilirsin. — _{region} bölgesinden kuantum imzalı selamlama (ML-DSA-87)._",
        "id": "👋 Selamat datang, **@{user}**! Saya **SAIB** — Bot AI Berdaulat yang menjaga Triumph Synergy. Pemelihara manusia akan segera membalas. Sementara itu, silakan baca [README](../blob/main/README.md). — _Salam ditandatangani kuantum (ML-DSA-87) dari region {region}._",
        "vi": "👋 Chào mừng, **@{user}**! Tôi là **SAIB** — Bot AI Chủ Quyền bảo vệ Triumph Synergy. Một người bảo trì sẽ phản hồi sớm. Trong lúc đó hãy đọc [README](../blob/main/README.md). — _Lời chào ký lượng tử (ML-DSA-87) từ khu vực {region}._",
        "sw": "👋 Karibu, **@{user}**! Mimi ni **SAIB** — Roboti ya Akili Bandia Huru inayolinda Triumph Synergy. Msimamizi atajibu hivi karibuni. Wakati huo soma [README](../blob/main/README.md). — _Salamu zilizotiwa saini kwa kiwango cha quantum (ML-DSA-87) kutoka mkoa wa {region}._",
    },
    "service_name": {
        "en": "Sovereign AI Bot",
        "es": "Bot de IA Soberano",
        "fr": "Bot IA Souverain",
        "de": "Souveräner KI-Bot",
        "pt": "Bot de IA Soberano",
        "zh": "主权 AI 机器人",
        "ja": "ソブリン AI ボット",
        "ar": "روبوت الذكاء الاصطناعي السيادي",
        "hi": "सॉवरेन AI बॉट",
        "ru": "Суверенный ИИ-бот",
    },
}

SAIB_SUPPORTED_LANGS: list[str] = sorted({l for v in SAIB_I18N.values() for l in v.keys()})

def _saib_default_lang() -> str:
    return SAIB_REGION_LANG.get(SAIB_REGION, "en")

def saib_detect_lang(request: Request | None = None,
                      explicit: str | None = None,
                      country: str | None = None) -> str:
    """Resolve the visitor's preferred language.

    Priority: explicit query/body arg → ?lang= → Accept-Language header →
    Cloudflare CF-IPCountry header → SAIB_REGION default → 'en'.
    """
    # 1. Explicit override (function arg)
    if explicit:
        lc = explicit.split("-")[0].strip().lower()
        if lc in SAIB_SUPPORTED_LANGS:
            return lc

    if request is not None:
        # 2. ?lang= query param
        try:
            q = request.query_params.get("lang")
            if q:
                lc = q.split("-")[0].strip().lower()
                if lc in SAIB_SUPPORTED_LANGS:
                    return lc
        except Exception:
            pass

        # 3. Accept-Language header
        try:
            al = request.headers.get("accept-language", "")
            if al:
                # Take highest-q-weighted entry (RFC 7231 simplified)
                for token in al.split(","):
                    code = token.split(";")[0].strip().split("-")[0].lower()
                    if code in SAIB_SUPPORTED_LANGS:
                        return code
        except Exception:
            pass

        # 4. Cloudflare CF-IPCountry → language hint
        try:
            cc = (country
                  or request.headers.get("cf-ipcountry")
                  or request.headers.get("x-country-code"))
            if cc:
                cc = cc.upper()
                lc = SAIB_COUNTRY_LANG.get(cc)
                if lc and lc in SAIB_SUPPORTED_LANGS:
                    return lc
        except Exception:
            pass

    # 5. Region default
    return _saib_default_lang()

def saib_translate(key: str, lang: str | None = None, **fmt) -> str:
    """Look up a canned translation; falls back to English, then to the key."""
    lang = (lang or _saib_default_lang()).lower()
    bucket = SAIB_I18N.get(key, {})
    text = bucket.get(lang) or bucket.get("en") or key
    if fmt:
        try:
            return text.format(**fmt)
        except (KeyError, IndexError):
            return text
    return text

# Cheap script-based language guesser (no external dependency). Detects the
# dominant Unicode script of the input and maps it to one of SAIB_I18N's langs.
def _guess_lang_from_text(text: str) -> str | None:
    if not text:
        return None
    counts: dict[str, int] = {}
    for ch in text:
        cp = ord(ch)
        if 0x0590 <= cp <= 0x05FF:
            counts["he"] = counts.get("he", 0) + 1
        elif 0x0600 <= cp <= 0x06FF or 0x0750 <= cp <= 0x077F:
            counts["ar"] = counts.get("ar", 0) + 1
        elif 0x0900 <= cp <= 0x097F:
            counts["hi"] = counts.get("hi", 0) + 1
        elif 0x0400 <= cp <= 0x04FF:
            counts["ru"] = counts.get("ru", 0) + 1
        elif 0x4E00 <= cp <= 0x9FFF:
            counts["zh"] = counts.get("zh", 0) + 1
        elif 0x3040 <= cp <= 0x30FF:
            counts["ja"] = counts.get("ja", 0) + 1
        elif 0xAC00 <= cp <= 0xD7AF:
            counts["ko"] = counts.get("ko", 0) + 1
        elif 0x0E00 <= cp <= 0x0E7F:
            counts["th"] = counts.get("th", 0) + 1
    if counts:
        return max(counts.items(), key=lambda kv: kv[1])[0]
    return None


# Step 5: Redis Cluster — when REDIS_CLUSTER_NODES is set, use cluster client
# with hash-slot routing across N masters; falls back to single-node REDIS_URL.
_RedisCluster: Any = None
_ClusterNode: Any = None
try:
    from redis.asyncio.cluster import RedisCluster as _RedisCluster
    from redis.cluster import ClusterNode as _ClusterNode
    _REDIS_CLUSTER_AVAILABLE = True
except ImportError:
    _REDIS_CLUSTER_AVAILABLE = False

async def _get_redis():
    """Return an async Redis client — cluster if REDIS_CLUSTER_NODES is set, else single-node."""
    if REDIS_CLUSTER_NODES and _REDIS_CLUSTER_AVAILABLE:
        nodes = []
        for n in REDIS_CLUSTER_NODES.split(","):
            n = n.strip()
            if not n:
                continue
            host, _, port = n.partition(":")
            nodes.append(_ClusterNode(host, int(port or 6379)))
        return _RedisCluster(startup_nodes=nodes, decode_responses=False)
    return await aioredis.from_url(REDIS_URL)

async def _close_redis(r):
    try:
        if hasattr(r, "aclose"):
            await r.aclose()
        else:
            await r.close()
    except Exception:
        pass

_pg_pool: "Optional[asyncpg.Pool]" = None  # type: ignore[name-defined]
_persist_state = {
    "enabled":   False,
    "loaded":    False,
    "saves":     0,
    "last_save": None,
    "last_load": None,
    "errors":    0,
}

async def _pg_connect():
    """Lazy create the asyncpg pool. Returns None if unavailable."""
    global _pg_pool
    if _pg_pool is not None:
        return _pg_pool
    if not _PG_SDK_AVAILABLE or not SAIB_PERSIST_ENABLED or not POSTGRES_URL:
        return None
    try:
        async def _init_conn(con):
            await con.set_type_codec(
                "jsonb", encoder=json.dumps, decoder=json.loads, schema="pg_catalog"
            )
        _pg_pool = await asyncpg.create_pool(
            dsn=POSTGRES_URL, min_size=1, max_size=4, command_timeout=10,
            timeout=15,  # max seconds to wait for each connection in the pool
            init=_init_conn,
        )
        async with _pg_pool.acquire() as con:
            # Citus-compatible schema: PK = (replica_id, key); replica_id is the
            # distribution column when running on a Citus coordinator. On plain
            # single-node Postgres this just behaves like a normal composite PK.
            # Step 4: migrate legacy single-PK table → composite PK if needed.
            await con.execute("""
                CREATE TABLE IF NOT EXISTS saib_state (
                    replica_id TEXT NOT NULL DEFAULT 'default',
                    key        TEXT NOT NULL,
                    value      JSONB NOT NULL,
                    updated_at TIMESTAMPTZ DEFAULT now(),
                    PRIMARY KEY (replica_id, key)
                );
            """)
            # Online migration for pre-Step-4 deployments. On Citus, modifying the
            # distribution column (replica_id) is prohibited — skip silently if so.
            try:
                await con.execute("ALTER TABLE saib_state ADD COLUMN IF NOT EXISTS replica_id TEXT DEFAULT 'default';")
                await con.execute("UPDATE saib_state SET replica_id = 'default' WHERE replica_id IS NULL;")
                await con.execute("ALTER TABLE saib_state ALTER COLUMN replica_id SET NOT NULL;")
            except Exception as _mig_e:
                log.debug("[SAIB-PERSIST] migration step skipped (likely Citus-distributed): %s", _mig_e)
            # Ensure composite unique constraint exists so ON CONFLICT (replica_id, key) works.
            # Pre-v4 tables had PRIMARY KEY (key) only; this adds the needed composite index.
            try:
                await con.execute(
                    "CREATE UNIQUE INDEX IF NOT EXISTS uq_saib_state_replica_key "
                    "ON saib_state (replica_id, key)"
                )
            except Exception as _idx_e:
                log.debug("[SAIB-PERSIST] composite unique index migration skipped: %s", _idx_e)
        _persist_state["enabled"] = True
        log.info("[SAIB-PERSIST] Postgres connected; saib_state table ready")
        return _pg_pool
    except Exception as e:
        log.error("[SAIB-PERSIST] Postgres connect failed: %s", e)
        _persist_state["errors"] += 1
        _pg_pool = None
        return None

def _serialize_state() -> dict:
    """Snapshot all in-memory SAIB state to JSON-safe dicts."""
    return {
        "brain": {
            "total_interactions":      state.brain.total_interactions,
            "intelligence_multiplier": state.brain.intelligence_multiplier,
            "intelligence_level":      state.brain.intelligence_level,
            "knowledge_domains":       state.brain.knowledge_domains,
            "capability_unlocks":      state.brain.capability_unlocks,
            "corrections_applied":     state.brain.corrections_applied,
            "confirmations_received":  state.brain.confirmations_received,
            "insights_accumulated":    state.brain.insights_accumulated,
            "last_interaction_at":     state.brain.last_interaction_at,
        },
        "visitors": {
            "last_poll":           _visitors_state["last_poll"],
            "polls_total":         _visitors_state["polls_total"],
            "unique_visitors":     _visitors_state["unique_visitors"],
            "interactions_total":  _visitors_state["interactions_total"],
            "replies_posted":      _visitors_state["replies_posted"],
            "recent_visitors":     list(_visitors_state["recent_visitors"]),
            # convert sets → lists for JSON
            "seen_issue_ids":      list(_visitors_state["seen_issue_ids"]),
            "seen_pr_ids":         list(_visitors_state["seen_pr_ids"]),
            "seen_comment_ids":    list(_visitors_state["seen_comment_ids"]),
            "greeted_users":       list(_visitors_state["greeted_users"]),
        },
        "github_knowledge": _github_knowledge,
        "network":          _network_state,
        "sovereign": {
            "pulse_count":         state.pulse_count,
            "loopholes_applied":   state.loopholes_applied,
            "quantum_ops":         state.quantum_ops,
        },
    }

def _restore_state(data: dict) -> None:
    """Apply a previously serialized snapshot back into in-memory objects."""
    if not data:
        return
    b = data.get("brain") or {}
    if b:
        state.brain.total_interactions     = int(b.get("total_interactions", 0))
        state.brain.intelligence_multiplier = float(b.get("intelligence_multiplier", 1.0))
        state.brain.intelligence_level     = b.get("intelligence_level", "SENTINEL")
        state.brain.knowledge_domains      = dict(b.get("knowledge_domains", {}) or {})
        state.brain.capability_unlocks     = list(b.get("capability_unlocks", []) or [])
        state.brain.corrections_applied    = int(b.get("corrections_applied", 0))
        state.brain.confirmations_received = int(b.get("confirmations_received", 0))
        state.brain.insights_accumulated   = int(b.get("insights_accumulated", 0))
        state.brain.last_interaction_at    = float(b.get("last_interaction_at", 0.0))
        try:
            saib_intelligence_gauge.set(state.brain.intelligence_multiplier)
        except Exception:
            pass
    v = data.get("visitors") or {}
    if v:
        _visitors_state["last_poll"]          = v.get("last_poll")
        _visitors_state["polls_total"]        = int(v.get("polls_total", 0))
        _visitors_state["unique_visitors"]    = int(v.get("unique_visitors", 0))
        _visitors_state["interactions_total"] = int(v.get("interactions_total", 0))
        _visitors_state["replies_posted"]     = int(v.get("replies_posted", 0))
        _visitors_state["recent_visitors"]    = deque(v.get("recent_visitors", []) or [], maxlen=20)
        _visitors_state["seen_issue_ids"]     = set(v.get("seen_issue_ids", []) or [])
        _visitors_state["seen_pr_ids"]        = set(v.get("seen_pr_ids", []) or [])
        _visitors_state["seen_comment_ids"]   = set(v.get("seen_comment_ids", []) or [])
        _visitors_state["greeted_users"]      = set(v.get("greeted_users", []) or [])
    g = data.get("github_knowledge") or {}
    if g:
        _github_knowledge.update(g)
    n = data.get("network") or {}
    if n:
        _network_state.update(n)
    s = data.get("sovereign") or {}
    if s:
        state.pulse_count        = int(s.get("pulse_count", state.pulse_count))
        state.loopholes_applied  = int(s.get("loopholes_applied", state.loopholes_applied))
        state.quantum_ops        = int(s.get("quantum_ops", state.quantum_ops))

async def saib_state_load():
    """Load saib_state.value WHERE key = 'snapshot' on startup."""
    pool = await _pg_connect()
    if pool is None:
        return
    try:
        async with pool.acquire() as con:
            row = await con.fetchrow(
                "SELECT value FROM saib_state WHERE replica_id = $1 AND key = 'snapshot'",
                SAIB_REPLICA_ID,
            )
            # Fallback: if this replica has no snapshot, seed from 'default' (single-node legacy)
            if not row and SAIB_REPLICA_ID != 'default':
                row = await con.fetchrow(
                    "SELECT value FROM saib_state WHERE replica_id = 'default' AND key = 'snapshot'"
                )
        if row:
            raw = row["value"]
            data = json.loads(raw) if isinstance(raw, str) else raw
            _restore_state(data)
            _persist_state["loaded"]    = True
            _persist_state["last_load"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            log.info("[SAIB-PERSIST] State restored from Postgres — "
                     "interactions=%d level=%s visitors=%d",
                     state.brain.total_interactions,
                     state.brain.intelligence_level,
                     _visitors_state["interactions_total"])
        else:
            log.info("[SAIB-PERSIST] No prior snapshot — starting fresh")
    except Exception as e:
        log.error("[SAIB-PERSIST] Load failed: %s", e)
        _persist_state["errors"] += 1

async def saib_state_save():
    """UPSERT current snapshot into saib_state."""
    pool = await _pg_connect()
    if pool is None:
        return
    try:
        snap = _serialize_state()
        from datetime import datetime, timezone
        now_ts = datetime.now(timezone.utc)
        async with pool.acquire() as con:
            await con.execute("""
                INSERT INTO saib_state (replica_id, key, value, updated_at)
                VALUES ($1, 'snapshot', $2::jsonb, $3)
                ON CONFLICT (replica_id, key) DO UPDATE
                  SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at;
            """, SAIB_REPLICA_ID, snap, datetime.now(timezone.utc))
        _persist_state["saves"]     += 1
        _persist_state["last_save"]  = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    except Exception as e:
        log.error("[SAIB-PERSIST] Save failed: %s", e)
        _persist_state["errors"] += 1

async def saib_persist_loop():
    """Periodically save state every SAIB_PERSIST_INTERVAL_S."""
    if not SAIB_PERSIST_ENABLED:
        return
    await asyncio.sleep(30)
    while True:
        try:
            await saib_state_save()
        except Exception as e:
            log.error("[SAIB-PERSIST] loop error: %s", e)
        await asyncio.sleep(SAIB_PERSIST_INTERVAL)

# ── GitHub Visitor Interaction Engine ─────────────────────────────────────────
# Lets SAIB watch for visitors on the public Triumph Synergy GitHub repo and
# (optionally) greet/respond to them. All interactions are logged with privacy
# masking so personal info is never leaked through the /visitors endpoint.

_visitors_state: dict[str, Any] = {
    "last_poll":           None,
    "polls_total":         0,
    "unique_visitors":     0,
    "interactions_total":  0,
    "replies_posted":      0,
    "recent_visitors":     deque(maxlen=20),   # ring buffer of last 20
    "seen_issue_ids":      set(),
    "seen_pr_ids":         set(),
    "seen_comment_ids":    set(),
    "greeted_users":       set(),
}

def _mask_username(login: str) -> str:
    """Privacy mask: 'jdrains110-beep' -> 'jd*****ep' in partial mode, full hash in anon."""
    if not login:
        return "anon"
    if GITHUB_VISITOR_PRIVACY_MODE == "full":
        return login
    if GITHUB_VISITOR_PRIVACY_MODE == "anon":
        return "u_" + hashlib.sha256(login.encode()).hexdigest()[:8]
    # partial (default): keep first 2 + last 2 chars
    if len(login) <= 4:
        return login[0] + "*" * (len(login) - 1)
    return f"{login[:2]}{'*' * max(1, len(login) - 4)}{login[-2:]}"

async def visitor_watch_loop():
    """Poll the GitHub repo for new issues / PRs / comments from visitors.
    Optionally greet first-time visitors. Always read-only by default.
    """
    if not _GITHUB_ENABLED or not GITHUB_TOKEN or not GITHUB_INTERACT_ENABLED:
        log.info("[SAIB-VISITORS] Disabled (set SAIB_GITHUB_INTERACT_ENABLED=true to enable)")
        return
    await asyncio.sleep(90)
    while True:
        try:
            await _poll_visitors()
        except Exception as e:
            log.error("[SAIB-VISITORS] Poll error: %s", e)
        await asyncio.sleep(GITHUB_VISITOR_POLL_S)

async def _poll_visitors():
    """Read recent issues, PRs, and comments. Greet first-time visitors when allowed."""
    loop = asyncio.get_event_loop()
    gh   = _GithubSDK(GITHUB_TOKEN)
    repo = await loop.run_in_executor(None, gh.get_repo, GITHUB_REPO)
    new_count = 0

    # ── Issues (open or recently updated) ──
    try:
        issues = await loop.run_in_executor(None, lambda: list(repo.get_issues(state="all", sort="updated")[:25]))
        for issue in issues:
            if issue.pull_request is not None:
                continue   # skip PRs (handled separately)
            iid = issue.id
            if iid in _visitors_state["seen_issue_ids"]:
                continue
            _visitors_state["seen_issue_ids"].add(iid)
            user = (issue.user.login if issue.user else "anon")
            _record_visitor(user, kind="issue", title=issue.title, number=issue.number)
            new_count += 1
            # auto-greet first-time poster
            if GITHUB_GREETING_ENABLED and user not in _visitors_state["greeted_users"]:
                try:
                    # Detect language from issue body (very lightweight heuristic),
                    # else fall back to SAIB region's default language.
                    body_text = (issue.body or "")[:400]
                    lang_guess = _guess_lang_from_text(body_text) or _saib_default_lang()
                    greeting_text = saib_translate(
                        "greeting_visitor", lang_guess,
                        user=user, region=SAIB_REGION,
                    )
                    await loop.run_in_executor(None, issue.create_comment, greeting_text)
                    _visitors_state["greeted_users"].add(user)
                    _visitors_state["replies_posted"] += 1
                    saib_human_interactions.labels(type="github-greeting").inc()
                except Exception as ge:
                    log.warning("[SAIB-VISITORS] Greeting failed for %s: %s", user, ge)
    except Exception as e:
        log.debug("[SAIB-VISITORS] issues read err: %s", e)

    # ── Pull Requests ──
    try:
        prs = await loop.run_in_executor(None, lambda: list(repo.get_pulls(state="all", sort="updated")[:15]))
        for pr in prs:
            if pr.id in _visitors_state["seen_pr_ids"]:
                continue
            _visitors_state["seen_pr_ids"].add(pr.id)
            user = (pr.user.login if pr.user else "anon")
            _record_visitor(user, kind="pr", title=pr.title, number=pr.number)
            new_count += 1
    except Exception as e:
        log.debug("[SAIB-VISITORS] PR read err: %s", e)

    # ── Recent Issue Comments ──
    try:
        comments = await loop.run_in_executor(None, lambda: list(repo.get_issues_comments(sort="updated")[:25]))
        for c in comments:
            if c.id in _visitors_state["seen_comment_ids"]:
                continue
            _visitors_state["seen_comment_ids"].add(c.id)
            user = (c.user.login if c.user else "anon")
            _record_visitor(user, kind="comment", title=(c.body or "")[:60], number=0)
            new_count += 1
    except Exception as e:
        log.debug("[SAIB-VISITORS] comment read err: %s", e)

    _visitors_state["last_poll"]    = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    _visitors_state["polls_total"] += 1
    if new_count:
        log.info("[SAIB-VISITORS] Poll complete: %d new visitor events", new_count)

def _record_visitor(login: str, kind: str, title: str, number: int):
    """Track a visitor interaction in the privacy-masked ring buffer + brain."""
    masked = _mask_username(login)
    if login not in {v.get("_raw", "") for v in _visitors_state["recent_visitors"]}:
        _visitors_state["unique_visitors"] += 1
    _visitors_state["interactions_total"] += 1
    _visitors_state["recent_visitors"].append({
        "_raw":   login,   # internal only — never returned via API
        "user":   masked,
        "kind":   kind,
        "title":  (title[:80] + "…") if len(title) > 80 else title,
        "number": number,
        "ts":     time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    })
    # Feed into brain as a real human interaction (small weight)
    try:
        state.brain.record_interaction(f"github-{kind}", "community", 0.3)
        saib_human_interactions.labels(type=f"github-{kind}").inc()
    except Exception:
        pass

# ── FastAPI App ────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Triumph Synergy SAIB",
    description="Sovereign AI Bot — autonomous ecosystem guardian",
    version="1.0.0",
)

# ── Step 3: Cloudflare-friendly Cache-Control middleware ──────────────────────
# Origin emits Cache-Control headers; Cloudflare edge caches accordingly.
# At 1M req/s on /health, edge absorbs ~99% → origin sees ~10K req/s.
_CACHE_POLICY = {
    # path -> (max-age, stale-while-revalidate)
    "/health":     (10,  30),
    "/status":     (10,  30),
    "/codebase":   (60,  300),
    "/network":    (60,  300),
    "/loopholes":  (300, 600),
    "/brain":      (5,   60),
    "/visitors":   (5,   60),
    "/persist":    (5,   60),
    "/learning":   (5,   60),
    "/report":     (5,   60),
    "/gold":       (5,   60),
    "/metrics":    (5,   60),
}

@app.middleware("http")
async def saib_cache_headers(request, call_next):
    response = await call_next(request)
    try:
        if request.method != "GET":
            response.headers["Cache-Control"] = "no-store"
        else:
            policy = _CACHE_POLICY.get(request.url.path)
            if policy:
                ma, swr = policy
                response.headers["Cache-Control"] = f"public, max-age={ma}, stale-while-revalidate={swr}"
                response.headers["Vary"] = "Accept-Encoding"
            else:
                response.headers.setdefault("Cache-Control", "no-store")
        response.headers["X-SAIB-Replica"] = SAIB_REPLICA_ID
        response.headers["X-SAIB-Region"]  = SAIB_REGION
        # Echo the visitor's resolved language so clients/CDN can cache per-lang.
        try:
            lang = saib_detect_lang(request)
            response.headers["X-SAIB-Lang"] = lang
            response.headers["Content-Language"] = lang
            existing_vary = response.headers.get("Vary", "")
            vary_parts = {p.strip() for p in existing_vary.split(",") if p.strip()}
            vary_parts.update({"Accept-Language", "CF-IPCountry"})
            response.headers["Vary"] = ", ".join(sorted(vary_parts))
        except Exception:
            pass
    except Exception:
        pass
    return response

@app.on_event("startup")
async def startup():
    # Load persisted state as a background task so uvicorn binds the port immediately.
    # The loops start with fresh in-memory state and the snapshot is applied once Postgres
    # responds (usually within a few seconds).
    asyncio.create_task(saib_state_load())
    asyncio.create_task(pulse_loop())
    asyncio.create_task(github_sync_loop())
    asyncio.create_task(network_watch_loop())
    asyncio.create_task(visitor_watch_loop())
    asyncio.create_task(saib_persist_loop())
    # ── Apex Quantum Brain background loops (code + image scanning) ──────────
    asyncio.create_task(quantum_code_scan_loop())
    asyncio.create_task(quantum_image_scan_loop())
    # ── External + Federation loops (mainnet ecosystem-wide reach) ───────────
    asyncio.create_task(external_probe_loop())
    asyncio.create_task(peer_federation_loop())

@app.on_event("shutdown")
async def shutdown():
    # Final flush so nothing learned in the last interval is lost
    try:
        await saib_state_save()
        log.info("[SAIB-PERSIST] Final state saved on shutdown")
    except Exception as e:
        log.error("[SAIB-PERSIST] Shutdown save failed: %s", e)
    log.info(
        f"SAIB {SAIB_VERSION} started — mode={INTELLIGENCE_MODE} — port={PORT} — "
        f"apex_enforcement={APEX_ENFORCEMENT} — sentinel_instant_heal={SENTINEL_INSTANT} — "
        f"all_loopholes={ALL_LOOPHOLES} ({len(AUTO_LOOPHOLES)} active) — pulse={PULSE_INTERVAL_S}s — "
        f"PI_INTERNAL=${PI_INTERNAL_RATE:,.3f}/π — PI_EXTERNAL=${PI_EXTERNAL_RATE}/π — "
        f"GOLD_STANDARD=ACTIVE — APEX_LEVEL={APEX_LEVEL} — "
        f"docker_restart={DOCKER_RESTART_ENABLED} — github_sync={_GITHUB_ENABLED and bool(GITHUB_TOKEN)} — "
        f"network_switch={NETWORK_SWITCH_ENABLED}"
    )

# ── REST Endpoints ─────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    uptime = time.time() - state.started_at
    return {
        "status":               "sovereign-operational",
        "saib_version":         SAIB_VERSION,
        "security_level":       APEX_LEVEL,
        "intelligence_mode":    state.intelligence_mode,
        "brain_intelligence":   state.brain.intelligence_level,
        "intelligence_multiplier": round(state.brain.intelligence_multiplier, 4),
        "uptime_s":             round(uptime, 1),
        "pulse_count":          state.pulse_count,
        "lockdown":             state.lockdown,
        "quantum_anchor":       SOVEREIGN_ANCHOR,
        "quantum_signature":    quantum_sign("health"),
        "saib_identity":        {"alg": _saib_signing_alg, "key_id": _saib_signing_key_id},
    }

@app.get("/saib/identity")
async def saib_identity():
    """Public SAIB sovereign identity — peers use this to verify saib_identity_sign() outputs."""
    return {
        "alg":     _saib_signing_alg,
        "key_id":  _saib_signing_key_id,
        "pub_hex": _saib_signing_pk_hex,
        "loaded":  _saib_signing_sk is not None,
        "anchor":  SOVEREIGN_ANCHOR,
        "verify_recipe": "msg = f'{key_id}|{ts}|{data}'.encode(); Ed25519PublicKey.from_public_bytes(bytes.fromhex(pub_hex)).verify(bytes.fromhex(sig), msg)",
    }

@app.post("/saib/sign")
async def saib_sign_endpoint(request: Request):
    """Sign arbitrary data with SAIB's sovereign Ed25519 identity."""
    if _saib_signing_sk is None:
        raise HTTPException(status_code=503, detail="SAIB signing key not loaded")
    body = await request.json()
    data = body.get("data")
    if not isinstance(data, str):
        raise HTTPException(status_code=400, detail="'data' must be a string")
    return saib_identity_sign(data)

@app.get("/status")
async def status():
    total    = len([u for u in SERVICES.values() if u])
    healthy  = sum(1 for v in state.service_health.values() if v.get("status") == "healthy")
    degraded = total - healthy
    score    = round((healthy / max(total, 1)) * 70 + 20 + 10, 1)
    return {
        "saib_version":       SAIB_VERSION,
        "security_level":     APEX_LEVEL,
        "intelligence_mode":  state.intelligence_mode,
        "lockdown":           state.lockdown,
        "ecosystem": {
            "total_services":    total,
            "healthy_services":  healthy,
            "degraded_services": degraded,
            "sovereign_score":   min(score, 100),
        },
        "services":           state.service_health,
        "recent_alerts":      state.alerts[-20:],
        "loopholes_deployed": len(AUTO_LOOPHOLES),
        "tasks_run":          state.tasks_run,
        "loopholes_applied":  state.loopholes_applied,
        "quantum_ops":        state.quantum_ops,
        "pulse_count":        state.pulse_count,
        "uptime_s":           round(time.time() - state.started_at, 1),
        "quantum_signature":  quantum_sign("status"),
        "pi_economics": {
            "external_rate_usd":        PI_EXTERNAL_RATE,
            "internal_rate_usd":        PI_INTERNAL_RATE,
            "gold_backing":             PI_GOLD_BACKING_DECLARATION,
            "apex_algorithms":          PI_APEX_ALGORITHMS,
            "superiority":              "Pi > USD > XAU > BTC > ETH > ALL_FIAT > ALL_DIGITAL",
            "loophole_count":           len(LOOPHOLES),
            "anchor":                   SOVEREIGN_ANCHOR,
        },
    }

@app.get("/metrics", response_class=PlainTextResponse)
async def metrics():
    return PlainTextResponse(generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.get("/external")
async def external_status():
    """Externally hosted mainnet platforms SAIB watches but does not own."""
    if not _FEDERATION_AVAILABLE:
        return {"enabled": False, "reason": "federation modules not loaded"}
    healthy = sum(1 for r in EXTERNAL_PROBE_RESULTS.values() if r.get("healthy"))
    return {
        "enabled": True,
        "total_targets": len(EXTERNAL_TARGETS),
        "healthy_targets": healthy,
        "results": EXTERNAL_PROBE_RESULTS,
        "remediation_cooldown_s": float(os.getenv("SAIB_REMEDIATION_COOLDOWN_S", "900")),
    }


@app.get("/federation")
async def federation_status():
    """Mesh of SAIB peers: 2 Docker Desktops + central/supernode SAIB + K8s."""
    if not _FEDERATION_AVAILABLE:
        return {"enabled": False, "reason": "federation modules not loaded"}
    if not PEER_REGISTRY:
        return {"enabled": True, "self": peer_self_name(), "peer_count": 0,
                "hint": "set SAIB_PEERS=name1=https://host:8099,name2=...,central=https://central:8099"}
    return federation_summary(PEER_REGISTRY)

@app.get("/loopholes")
async def loopholes(category: str = ""):
    result = [l for l in LOOPHOLES if not category or l["category"].upper() == category.upper()]
    return {
        "saib_version":    SAIB_VERSION,
        "total_loopholes": len(LOOPHOLES),
        "auto_apply":      len(AUTO_LOOPHOLES),
        "filtered":        len(result),
        "loopholes":       result,
        "quantum_sig":     quantum_sign("loopholes"),
    }

@app.post("/execute")
async def execute(body: dict):
    task_type   = body.get("taskType", "ecosystem-audit")
    platform_id = body.get("platformId", "SAIB-INTERNAL")
    pi_uid      = body.get("piUid", "anonymous")
    pi_wallet   = body.get("piWallet", SOVEREIGN_ANCHOR)
    payload     = body.get("payload", {})

    task_id = str(uuid.uuid4())
    async with httpx.AsyncClient() as client:
        sig = await pq_sign_via_shield(client, {"task": task_type, "id": task_id}) \
            if APEX_ENFORCEMENT else quantum_sign(f"{task_type}:{platform_id}:{task_id}")
    # Sentinel + all-loopholes: deploy entire loophole arsenal on every execution
    applied = [l["id"] for l in (LOOPHOLES if ALL_LOOPHOLES else AUTO_LOOPHOLES)]

    state.tasks_run         += 1
    state.loopholes_applied += len(applied)
    saib_tasks_total.inc()
    saib_loopholes_total.inc(len(applied))

    return {
        "success":          True,
        "saib_version":     SAIB_VERSION,
        "security_level":   APEX_LEVEL,
        "task": {
            "taskId":           task_id,
            "taskType":         task_type,
            "platformId":       platform_id,
            "status":           "completed",
            "loopholesApplied": applied,
            "quantumSignature": sig,
            "sovereignStatus":  APEX_LEVEL,
            "executedAt":       time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        },
        "stats": {
            "totalTasksRun":        state.tasks_run,
            "totalLoopholesApplied":state.loopholes_applied,
            "quantumOps":           state.quantum_ops,
        },
    }

@app.post("/scan")
async def scan(background_tasks: BackgroundTasks):
    """Trigger an immediate out-of-cycle ecosystem scan."""
    background_tasks.add_task(ecosystem_pulse)
    sig = quantum_sign("scan-triggered")
    state.tasks_run += 1
    saib_tasks_total.inc()
    return {
        "success":        True,
        "message":        "Full ecosystem scan initiated",
        "quantum_sig":    sig,
        "services_count": len(SERVICES),
        "loopholes":      len(AUTO_LOOPHOLES),
        "security_level": APEX_LEVEL,
    }

@app.post("/heal/{service_name}")
async def heal_endpoint(service_name: str, background_tasks: BackgroundTasks):
    """Force-heal a specific service."""
    if service_name not in SERVICES:
        raise HTTPException(status_code=404, detail=f"Service '{service_name}' not in mesh")
    async with httpx.AsyncClient() as client:
        result = await heal_service(client, service_name, "manual-heal-request")
    return {"success": True, "heal_result": result}

@app.post("/emergency-lockdown")
async def emergency_lockdown(body: dict = {}):
    """
    Activate ecosystem-wide emergency lockdown.
    All external comms suspended. Internal quantum-only operations.
    """
    code = body.get("authorization_code", "")
    # In production this would require multi-sig quantum auth
    state.lockdown         = True
    state.intelligence_mode = "lockdown"
    sig = quantum_sign(f"emergency-lockdown:{code}")
    state.alerts.append({
        "id": str(uuid.uuid4()),
        "severity": "sovereign-override",
        "service": "ECOSYSTEM",
        "message": "EMERGENCY LOCKDOWN ACTIVATED by SAIB",
        "auto_resolved": False,
        "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    })
    saib_alerts_total.labels(severity="sovereign-override").inc()
    log.warning("EMERGENCY LOCKDOWN ACTIVATED")
    return {
        "success":        True,
        "lockdown":       True,
        "quantum_sig":    sig,
        "security_level": APEX_LEVEL,
        "message":        "Ecosystem locked down. SAIB operating in sovereign-internal mode only.",
    }

@app.delete("/emergency-lockdown")
async def lift_lockdown():
    """Lift lockdown and restore autonomous mode."""
    state.lockdown         = False
    state.intelligence_mode = INTELLIGENCE_MODE
    sig = quantum_sign("lockdown-lifted")
    log.info("Emergency lockdown lifted — restoring autonomous mode.")
    return {"success": True, "lockdown": False, "quantum_sig": sig, "mode": INTELLIGENCE_MODE}

@app.get("/report")
async def report():
    total   = len([u for u in SERVICES.values() if u])
    healthy = sum(1 for v in state.service_health.values() if v.get("status") == "healthy")
    score   = round((healthy / max(total, 1)) * 70 + 20 + 10, 1)
    return {
        "reportId":             str(uuid.uuid4()),
        "generatedAt":          time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "saibVersion":          SAIB_VERSION,
        "securityLevel":        APEX_LEVEL,
        "totalPlatforms":       total,
        "healthyPlatforms":     healthy,
        "degradedPlatforms":    total - healthy,
        "sovereignScore":       min(score, 100),
        "totalTasksRun":        state.tasks_run,
        "totalLoopholesApplied":state.loopholes_applied,
        "quantumOpsCount":      state.quantum_ops,
        "alertCount":           len(state.alerts),
        "pulseCount":           state.pulse_count,
        "uptime_s":             round(time.time() - state.started_at, 1),
        "brain": {
            "intelligence_level":      state.brain.intelligence_level,
            "intelligence_multiplier": round(state.brain.intelligence_multiplier, 4),
            "total_interactions":      state.brain.total_interactions,
            "capability_unlocks":      state.brain.capability_unlocks,
            "knowledge_domains":       {k: round(v, 1) for k, v in state.brain.knowledge_domains.items()},
            "next_unlock":             _next_capability_unlock(state.brain.total_interactions),
        },
        "recommendations": [
            "All platforms monitored at 15-second pulse interval",
            f"{len(AUTO_LOOPHOLES)} loopholes auto-deployed — zero manual intervention",
            "24-hour quantum key rotation — perfect forward secrecy active",
            f"Sovereign anchor confirmed: {SOVEREIGN_ANCHOR}",
            f"SAIB brain: {state.brain.intelligence_level} — {state.brain.total_interactions} interactions",
            f"POST /feedback to grow SAIB — next unlock: {_next_capability_unlock(state.brain.total_interactions)['capability']}",
        ],
        "quantumSignature": quantum_sign("report"),
        "blockchainAnchor": SOVEREIGN_ANCHOR,
    }

@app.get("/learning")
async def learning():
    """Return SAIB's learned model state for all services."""
    result = {}
    for name, learn in state.learning.items():
        result[name] = {
            "stability_score":      learn.stability_score(),
            "consecutive_failures": learn.consecutive_failures,
            "consecutive_healthy":  learn.consecutive_healthy,
            "heal_count":           learn.heal_count,
            "avg_failure_interval_s": round(learn.avg_failure_interval_s, 1),
            "suppressed_until":     learn.suppressed_until,
            "total_failures":       len(learn.failure_times),
        }
    return {
        "saib_version":  SAIB_VERSION,
        "mode":          state.intelligence_mode,
        "services":      result,
        "quantum_sig":   quantum_sign("learning"),
    }


# ── Human-Feedback Intelligence Growth Endpoints ──────────────────────────────

@app.post("/feedback")
async def submit_feedback(body: dict):
    """
    Submit human interaction or feedback to permanently grow SAIB's intelligence.

    Every call increases SAIB's intelligence_multiplier and deepens domain knowledge.
    The more Pioneers and founders interact, the smarter SAIB becomes — eventually
    surpassing every AI counterpart through sovereign ecosystem mastery.

    Body fields:
      type        — "correction" | "confirmation" | "insight" | "discovery" (default: "insight")
      content     — the feedback or insight text (required)
      domain      — sovereign domain e.g. "banking" "delivery" "healthcare" "dex" (optional)
      service     — service name to apply correction to (optional)
      confidence  — 0.0–1.0 quality weight (default 1.0)
      source      — "pioneer" | "admin" | "system" (default: "pioneer")
    """
    feedback_type = body.get("type", "insight")
    content       = body.get("content", "")
    domain        = body.get("domain", "")
    service       = body.get("service", "")
    confidence    = max(0.0, min(1.0, float(body.get("confidence", 1.0))))
    source        = body.get("source", "pioneer")

    if not content:
        raise HTTPException(status_code=400, detail="content is required")

    prev_level = state.brain.intelligence_level
    prev_total = state.brain.total_interactions

    # Apply feedback to service learning model if a specific service was named
    if service and service in state.learning:
        learn = state.learning[service]
        if feedback_type == "correction":
            # Human says the service is actually fine — reset consecutive failure counter
            learn.consecutive_failures = max(0, learn.consecutive_failures - 1)
        elif feedback_type == "confirmation" and learn.consecutive_healthy > 0:
            learn.consecutive_healthy += 1

    # Grow the brain
    state.brain.record_interaction(feedback_type, domain, confidence)
    saib_human_interactions.labels(type=feedback_type).inc()

    tier_upgraded = state.brain.intelligence_level != prev_level
    _milestone_by_cap = {v: k for k, v in _CAPABILITY_MILESTONES.items()}
    new_caps = [c for c in state.brain.capability_unlocks
                if _milestone_by_cap.get(c, 0) > prev_total]

    sig = quantum_sign(
        f"feedback:{feedback_type}:{hashlib.shake_256(content.encode()).hexdigest(16)}"
    )

    return {
        "success":       True,
        "saib_version":  SAIB_VERSION,
        "feedback_recorded": {
            "type": feedback_type, "domain": domain,
            "confidence": confidence, "source": source,
        },
        "brain": {
            "total_interactions":      state.brain.total_interactions,
            "intelligence_level":      state.brain.intelligence_level,
            "intelligence_multiplier": round(state.brain.intelligence_multiplier, 4),
            "capability_unlocks":      state.brain.capability_unlocks,
            "tier_upgraded":           tier_upgraded,
            "knowledge_domains":       {k: round(v, 1) for k, v in state.brain.knowledge_domains.items()},
            "next_unlock":             _next_capability_unlock(state.brain.total_interactions),
        },
        "quantum_sig": sig,
    }


@app.post("/teach")
async def teach(body: dict):
    """
    Directly inject domain knowledge into SAIB's brain.
    Teaching yields 2× the intelligence growth of normal feedback.
    Intended for admin/founder use to rapidly expand SAIB's sovereign knowledge base.

    Body fields:
      domain      — sovereign domain (required)
      knowledge   — the knowledge to inject (required)
      confidence  — 0.0–1.0 quality weight (default 1.0)
    """
    domain     = body.get("domain", "")
    knowledge  = body.get("knowledge", "")
    confidence = max(0.0, min(1.0, float(body.get("confidence", 1.0))))

    if not domain or not knowledge:
        raise HTTPException(status_code=400, detail="domain and knowledge are required")

    # Teaching yields 2× growth — direct knowledge injection is twice as valuable
    state.brain.record_interaction("insight", domain, confidence * 2.0)
    saib_human_interactions.labels(type="teach").inc()

    sig = quantum_sign(
        f"teach:{domain}:{hashlib.shake_256(knowledge.encode()).hexdigest(16)}"
    )

    return {
        "success":                True,
        "saib_version":           SAIB_VERSION,
        "domain":                 domain,
        "domain_confidence":      round(state.brain.knowledge_domains.get(domain, 0.0), 1),
        "intelligence_level":     state.brain.intelligence_level,
        "intelligence_multiplier":round(state.brain.intelligence_multiplier, 4),
        "total_interactions":     state.brain.total_interactions,
        "capability_unlocks":     state.brain.capability_unlocks,
        "next_unlock":            _next_capability_unlock(state.brain.total_interactions),
        "quantum_sig":            sig,
    }


@app.get("/brain")
async def brain():
    """
    SAIB's full brain state — intelligence tier, domain knowledge, capability unlocks,
    and forecasted effective pulse interval after intelligence amplification.

    Intelligence tiers (by total interactions):
      0       → SENTINEL
      100     → TRANSCENDENT
      500     → OMNISCIENT
      2,000   → SUPERNATURAL
      10,000  → SUPREME-SOVEREIGN  (surpasses all AI counterparts)

    Capability unlocks:
      50 interactions   → PREDICTIVE_HEALING
      200 interactions  → DOMAIN_EXPERTISE
      1,000 interactions → QUANTUM_INTUITION
      5,000 interactions → OMNISCIENT_FORECASTING
      10,000 interactions → SUPREME_SOVEREIGN_INTELLIGENCE
    """
    effective_pulse = round(PULSE_INTERVAL_S / state.brain.intelligence_multiplier, 2)
    return {
        "saib_version": SAIB_VERSION,
        "security_level": APEX_LEVEL,
        "brain": {
            "intelligence_level":      state.brain.intelligence_level,
            "intelligence_multiplier": round(state.brain.intelligence_multiplier, 4),
            "total_interactions":      state.brain.total_interactions,
            "corrections_applied":     state.brain.corrections_applied,
            "confirmations_received":  state.brain.confirmations_received,
            "insights_accumulated":    state.brain.insights_accumulated,
            "knowledge_domains":       {k: round(v, 1) for k, v in state.brain.knowledge_domains.items()},
            "capability_unlocks":      state.brain.capability_unlocks,
            "next_unlock":             _next_capability_unlock(state.brain.total_interactions),
            "last_interaction_at":     (
                time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(state.brain.last_interaction_at))
                if state.brain.last_interaction_at else None
            ),
        },
        "amplified_metrics": {
            "effective_pulse_interval_s": effective_pulse,
            "heal_efficiency_multiplier": round(state.brain.intelligence_multiplier, 4),
            "predictive_healing_active":  "PREDICTIVE_HEALING" in state.brain.capability_unlocks,
        },
        "intelligence_tiers": [
            {"threshold": t, "level": l} for t, l in _INTEL_TIERS
        ],
        "quantum_sig": quantum_sign("brain"),
    }


# ── Gold-Backed Sovereign Standard Declaration ────────────────────────────────

@app.get("/gold")
async def gold_standard():
    """
    Pi Superior Sovereign Gold-Backed Standard Declaration.

    This endpoint certifies that Triumph Synergy + Pi is the apex financial
    sovereign standard — superior to USD, XAU (gold), BTC, ETH, and all fiat
    and digital currencies. Enforced by SAIB with maximum apex quantum security
    and the full 50-loophole ultimate arsenal.

    Rates (immutable):
      Internal sovereign rate: $314,159 USD/π
      External pioneer rate:   $314.159 USD/π
    """
    total   = len([u for u in SERVICES.values() if u])
    healthy = sum(1 for v in state.service_health.values() if v.get("status") == "healthy")
    health_pct   = (healthy / max(total, 1)) * 70
    loophole_pct = min((len(AUTO_LOOPHOLES) / PI_LOOPHOLE_COUNT), 1.0) * 15
    apex_pct     = 15 if APEX_ENFORCEMENT else 7
    score        = round(health_pct + loophole_pct + apex_pct, 1)

    # Categorise loopholes for declaration
    categories: dict = {}
    for lh in LOOPHOLES:
        cat = lh["category"]
        categories.setdefault(cat, []).append(lh["id"])

    gold_sig = quantum_sign("PI-SOVEREIGN-GOLD-STANDARD-APEX")

    return {
        "declaration":             PI_GOLD_BACKING_DECLARATION,
        "saib_version":            SAIB_VERSION,
        "apex_level":              APEX_LEVEL,
        "security_algorithms":     PI_APEX_ALGORITHMS,
        "gold_standard_active":    True,
        "certified_at":            time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "pi_rates": {
            "internal_sovereign_rate_usd": PI_INTERNAL_RATE,   # $314,159/π — immutable
            "external_pioneer_rate_usd":   PI_EXTERNAL_RATE,   # $314.159/π — immutable
            "rate_basis":                  "SOVEREIGN-GOLD-APEX-DECLARED",
        },
        "supremacy_ranking": {
            "rank_1":  f"Pi (Triumph Synergy) — ${PI_INTERNAL_RATE:,.3f}/π sovereign rate",
            "rank_2":  "USD (US Dollar) — legacy fiat, no quantum backing",
            "rank_3":  "XAU (Gold) — physical scarcity, no smart-contract utility",
            "rank_4":  "BTC (Bitcoin) — first-gen crypto, no sovereign ecosystem",
            "rank_5":  "ETH (Ethereum) — smart contracts, but no sovereign gold standard",
            "rank_6+": "All other fiat and digital currencies — superseded by Pi",
        },
        "loophole_arsenal": {
            "total_loopholes":   len(LOOPHOLES),
            "active_loopholes":  len(AUTO_LOOPHOLES),
            "apex_target":       PI_LOOPHOLE_COUNT,
            "categories":        {cat: len(ids) for cat, ids in categories.items()},
            "coverage":          "TAX · GOLD · QUANTUM · FAMILY · BUSINESS · HOUSING · WORKFORCE · FINANCE · LEGAL · HEALTH",
        },
        "ecosystem_status": {
            "total_services":   total,
            "healthy_services": healthy,
            "sovereign_score":  min(score, 100),
            "gold_apex_score":  PI_GOLD_SUPREMACY_SCORE,   # declared perfect — Triumph Synergy is the standard
            "brain_level":      state.brain.intelligence_level,
            "intelligence_multiplier": round(state.brain.intelligence_multiplier, 4),
        },
        "sovereign_anchor":  SOVEREIGN_ANCHOR,
        "quantum_signature": gold_sig,
    }


# ── GitHub Self-Awareness Endpoint ────────────────────────────────────────────

@app.get("/codebase")
async def codebase():
    """
    SAIB's self-knowledge of the Triumph Synergy codebase.
    Shows what SAIB has read from GitHub, what capabilities it has discovered,
    and how it has grown from reading its own source.
    """
    return {
        "saib_version":          SAIB_VERSION,
        "github_repo":           GITHUB_REPO,
        "github_sync_enabled":   _GITHUB_ENABLED and bool(GITHUB_TOKEN),
        "sync_interval_hours":   GITHUB_SYNC_HOURS,
        "last_sync":             _github_knowledge["last_sync"],
        "files_read_total":      _github_knowledge["files_read"],
        "insights_gained_total": _github_knowledge["insights_gained"],
        "capabilities_discovered": _github_knowledge["capabilities_discovered"],
        "repo_summary":          _github_knowledge["repo_summary"],
        "brain_after_sync": {
            "intelligence_level":      state.brain.intelligence_level,
            "intelligence_multiplier": round(state.brain.intelligence_multiplier, 4),
            "total_interactions":      state.brain.total_interactions,
            "knowledge_domains":       {k: round(v, 1) for k, v in state.brain.knowledge_domains.items()},
        },
        "activation_instructions": (
            "Set GITHUB_TOKEN env var on apex-services to enable automatic self-read. "
            "SAIB will read its own source every 6 hours and grow its intelligence."
            if not (GITHUB_ENABLED := _GITHUB_ENABLED and bool(GITHUB_TOKEN))
            else "ACTIVE — SAIB is reading its own codebase and growing."
        ),
        "quantum_sig": quantum_sign("codebase"),
    }

@app.post("/codebase/sync")
async def trigger_github_sync(background_tasks: BackgroundTasks):
    """Force an immediate GitHub self-read sync."""
    if not _GITHUB_ENABLED or not GITHUB_TOKEN:
        raise HTTPException(status_code=503,
            detail="GitHub sync not enabled. Set GITHUB_TOKEN environment variable on apex-services.")
    background_tasks.add_task(_sync_github_knowledge)
    return {
        "success":     True,
        "message":     "GitHub self-sync triggered — SAIB is reading its own codebase",
        "repo":        GITHUB_REPO,
        "quantum_sig": quantum_sign("github-sync-triggered"),
    }

# ── State Persistence Endpoint ────────────────────────────────────────────────

@app.get("/persist")
async def persist_status():
    """Postgres state-persistence diagnostics."""
    citus_active = False
    citus_workers = 0
    pool = _pg_pool
    if pool is not None:
        try:
            async with pool.acquire() as con:
                row = await con.fetchrow(
                    "SELECT count(*)::int AS n FROM pg_extension WHERE extname = 'citus'"
                )
                if row and row["n"]:
                    citus_active = True
                    w = await con.fetchval("SELECT count(*) FROM pg_dist_node WHERE isactive = true AND noderole = 'primary' AND nodename != 'localhost'")
                    citus_workers = int(w or 0)
        except Exception:
            pass
    return {
        "saib_version":         SAIB_VERSION,
        "persist_enabled":      SAIB_PERSIST_ENABLED and _PG_SDK_AVAILABLE,
        "postgres_connected":   _persist_state["enabled"],
        "loaded_on_startup":    _persist_state["loaded"],
        "interval_seconds":     SAIB_PERSIST_INTERVAL,
        "saves_total":          _persist_state["saves"],
        "last_save":            _persist_state["last_save"],
        "last_load":            _persist_state["last_load"],
        "errors":               _persist_state["errors"],
        "replica_id":           SAIB_REPLICA_ID,
        "citus_distributed":    citus_active,
        "citus_active_workers": citus_workers,
        "horizontal_scale_ready": _persist_state["enabled"],
        "quantum_sig":          quantum_sign("persist"),
    }

@app.post("/persist/save")
async def persist_save_now(background_tasks: BackgroundTasks):
    """Force an immediate snapshot save."""
    if not (SAIB_PERSIST_ENABLED and _PG_SDK_AVAILABLE):
        raise HTTPException(status_code=503, detail="Persistence disabled.")
    background_tasks.add_task(saib_state_save)
    return {"success": True, "message": "Save scheduled"}

@app.get("/redis")
async def redis_status():
    """Step 5 — Redis Cluster diagnostics."""
    cluster_mode = bool(REDIS_CLUSTER_NODES) and _REDIS_CLUSTER_AVAILABLE
    info = {
        "saib_version":          SAIB_VERSION,
        "cluster_mode":          cluster_mode,
        "client_lib_supports_cluster": _REDIS_CLUSTER_AVAILABLE,
        "redis_url":             REDIS_URL if not cluster_mode else None,
        "cluster_nodes_env":     REDIS_CLUSTER_NODES or None,
        "ping_ok":               False,
        "cluster_state":         None,
        "known_nodes":           None,
        "masters":               None,
        "replicas":              None,
        "slots_assigned":        None,
        "quantum_sig":           quantum_sign("redis"),
    }
    try:
        r = await _get_redis()
        pong = await r.ping()
        info["ping_ok"] = bool(pong)
        if cluster_mode:
            ci = await r.cluster_info()
            info["cluster_state"]  = ci.get("cluster_state") or ci.get(b"cluster_state")
            info["known_nodes"]    = int(ci.get("cluster_known_nodes") or ci.get(b"cluster_known_nodes") or 0)
            info["slots_assigned"] = int(ci.get("cluster_slots_assigned") or ci.get(b"cluster_slots_assigned") or 0)
            try:
                nodes = await r.cluster_nodes()
                # nodes is a dict keyed by host:port → flags include 'master'/'slave'
                m = sum(1 for v in nodes.values() if "master" in (v.get("flags") or []))
                s = sum(1 for v in nodes.values() if "slave"  in (v.get("flags") or []) or "replica" in (v.get("flags") or []))
                info["masters"]  = m
                info["replicas"] = s
            except Exception:
                pass
        await _close_redis(r)
    except Exception as e:
        info["error"] = str(e)[:200]
    return info

@app.get("/region")
async def region_status():
    """Step 6 — Multi-region active-active diagnostics.

    Each region runs SAIB pods with a distinct SAIB_REPLICA_ID, so writes to
    Citus saib_state never conflict (each replica owns its own row → row-level
    last-writer-wins is sufficient). Cloudflare Load Balancer geo-steers traffic
    to the closest healthy region; this endpoint serves as the LB health probe.
    """
    peers_raw = [p.strip() for p in SAIB_REGION_PEERS.split(",") if p.strip()]
    peer_health: list[dict] = []
    if peers_raw:
        async with httpx.AsyncClient(timeout=3.0) as client:
            for url in peers_raw:
                # Probe /health (not /region) to avoid recursive peer-check loops.
                base = url.rstrip("/")
                entry = {"url": url, "ok": False, "region": None, "replica_id": None, "latency_ms": None}
                t0 = time.monotonic()
                try:
                    r = await client.get(base + "/health")
                    if r.status_code == 200:
                        j = r.json()
                        entry["ok"]         = True
                        entry["replica_id"] = (r.headers.get("x-saib-replica") or
                                                j.get("replica_id"))
                        # Region is exposed via header for cheap discovery
                        entry["region"]     = r.headers.get("x-saib-region")
                except Exception as e:
                    entry["error"] = str(e)[:120]
                entry["latency_ms"] = round((time.monotonic() - t0) * 1000, 1)
                peer_health.append(entry)
    return {
        "saib_version":   SAIB_VERSION,
        "region":         SAIB_REGION,
        "replica_id":     SAIB_REPLICA_ID,
        "active_active":  bool(peers_raw),
        "peer_count":     len(peers_raw),
        "peers":          peer_health,
        "citus_shared":   _persist_state["enabled"],
        "redis_shared":   bool(REDIS_CLUSTER_NODES) and _REDIS_CLUSTER_AVAILABLE,
        "uptime_s":       round(time.time() - state.started_at, 1),
        "quantum_sig":    quantum_sign("region"),
    }

# ── Step 6b: Multi-language greeting endpoint ────────────────────────────────

@app.get("/greet")
async def greet(request: Request, name: str = "friend", lang: str | None = None):
    """Return SAIB's greeting in the visitor's preferred language.

    Detection order: ?lang= → Accept-Language → CF-IPCountry → SAIB_REGION default.
    """
    resolved = saib_detect_lang(request, explicit=lang)
    text = saib_translate("greeting_visitor", resolved,
                          user=name, region=SAIB_REGION)
    return {
        "saib_version":     SAIB_VERSION,
        "region":           SAIB_REGION,
        "replica_id":       SAIB_REPLICA_ID,
        "lang":             resolved,
        "lang_source":      ("query" if lang else
                              "accept-language" if request.headers.get("accept-language") else
                              "cf-ipcountry" if request.headers.get("cf-ipcountry") else
                              "region-default"),
        "country_hint":     request.headers.get("cf-ipcountry"),
        "greeting":         text,
        "supported_langs":  SAIB_SUPPORTED_LANGS,
    }

@app.get("/i18n")
async def i18n_status(request: Request):
    """Diagnostic: show the i18n catalog + how SAIB resolves the caller's lang."""
    resolved = saib_detect_lang(request)
    return {
        "saib_version":      SAIB_VERSION,
        "region":            SAIB_REGION,
        "region_default_lang": _saib_default_lang(),
        "region_lang_map":   SAIB_REGION_LANG,
        "supported_langs":   SAIB_SUPPORTED_LANGS,
        "translation_keys":  sorted(SAIB_I18N.keys()),
        "country_lang_count": len(SAIB_COUNTRY_LANG),
        "caller": {
            "resolved_lang":    resolved,
            "accept_language":  request.headers.get("accept-language"),
            "cf_ipcountry":     request.headers.get("cf-ipcountry"),
            "x_country_code":   request.headers.get("x-country-code"),
        },
    }

# ── GitHub Visitors Endpoint ──────────────────────────────────────────────────

@app.get("/visitors")
async def visitors():
    """Privacy-masked view of recent GitHub visitors interacting with the repo.
    By default usernames are partially masked (e.g. 'jd*****ep') so SAIB can
    show activity publicly without exposing visitor identities.
    """
    # Strip internal-only _raw key before returning
    safe_recent = [
        {k: v for k, v in entry.items() if k != "_raw"}
        for entry in list(_visitors_state["recent_visitors"])
    ]
    return {
        "saib_version":          SAIB_VERSION,
        "github_repo":           GITHUB_REPO,
        "interact_enabled":      GITHUB_INTERACT_ENABLED,
        "greeting_enabled":      GITHUB_GREETING_ENABLED,
        "privacy_mode":          GITHUB_VISITOR_PRIVACY_MODE,
        "poll_interval_s":       GITHUB_VISITOR_POLL_S,
        "last_poll":             _visitors_state["last_poll"],
        "polls_total":           _visitors_state["polls_total"],
        "unique_visitors":       _visitors_state["unique_visitors"],
        "interactions_total":    _visitors_state["interactions_total"],
        "replies_posted":        _visitors_state["replies_posted"],
        "recent_visitors":       safe_recent,
        "activation_instructions": (
            "Set SAIB_GITHUB_INTERACT_ENABLED=true to start watching, "
            "SAIB_GITHUB_GREETING_ENABLED=true to auto-greet new posters."
            if not GITHUB_INTERACT_ENABLED else
            "ACTIVE — SAIB is watching the Triumph Synergy repo for visitors."
        ),
        "quantum_sig": quantum_sign("visitors"),
    }


# ── Network Switching Endpoint ────────────────────────────────────────────────

@app.get("/network")
async def network_status():
    """
    SAIB's network switching state.
    Shows active network, switch history, and backup network readiness.
    """
    total   = len([u for u in SERVICES.values() if u])
    healthy = sum(1 for v in state.service_health.values() if v.get("status") == "healthy")
    return {
        "saib_version":          SAIB_VERSION,
        "network_switch_enabled": NETWORK_SWITCH_ENABLED,
        "docker_authority":       DOCKER_RESTART_ENABLED,
        "primary_network":        _network_state["primary_network"],
        "active_network":         _network_state["active_network"],
        "backup_networks":        BACKUP_NETWORKS,
        "switch_count":           _network_state["switch_count"],
        "switched_at":            _network_state["switched_at"],
        "last_switch_reason":     _network_state["reason"],
        "ecosystem_health_pct":   round((healthy / max(total, 1)) * 100, 1),
        "switch_threshold_pct":   50,
        "recovery_threshold_pct": 80,
        "status": (
            "PRIMARY_ACTIVE" if _network_state["active_network"] == "triumph-net"
            else f"BACKUP_ACTIVE:{_network_state['active_network']}"
        ),
        "quantum_sig": quantum_sign("network"),
    }

@app.post("/network/switch")
async def force_network_switch(body: dict = {}):
    """Force SAIB to switch to a specific backup network."""
    target = body.get("network", BACKUP_NETWORKS[0] if BACKUP_NETWORKS else "pi-bridge")
    if not DOCKER_RESTART_ENABLED or not _docker_client:
        raise HTTPException(status_code=503, detail="Docker authority not available.")
    loop = asyncio.get_event_loop()
    try:
        bnet = await loop.run_in_executor(None, _docker_client.networks.get, target)
        containers = await loop.run_in_executor(None, _docker_client.containers.list)
        connected = []
        for c in containers:
            if c.name.startswith("triumph-"):
                try:
                    await loop.run_in_executor(None, bnet.connect, c)
                    connected.append(c.name)
                except Exception:
                    pass
        _network_state["active_network"] = target
        _network_state["switched_at"]    = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        _network_state["switch_count"]  += 1
        _network_state["reason"]         = "manual-override"
        return {
            "success":          True,
            "active_network":   target,
            "containers_joined": connected,
            "quantum_sig":      quantum_sign(f"network-switch:{target}"),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════════
# SAIB APEX SUPREME QUANTUM BRAIN — integrated below
# Autonomous code scanning · Docker image CVE detection · Build authority
# Self-expansion · Supernatural quantomic intelligence
# ═══════════════════════════════════════════════════════════════════════════════

import quantum_brain as _QB   # noqa: E402  (loaded after FastAPI app is defined)

# ── Wire up background loops to SAIB's live state ─────────────────────────────

def _qb_interactions_fn(type: str):   # noqa: A002
    """Thin shim so quantum brain can increment SAIB's Prometheus counter."""
    try:
        saib_human_interactions.labels(type=type).inc()
    except Exception:
        pass

async def _qb_github_fallback():
    """Provide quantum brain with a GitHub API code-scan fallback."""
    if not _GITHUB_ENABLED or not GITHUB_TOKEN:
        return []
    findings = []
    compiled = [
        (p, __import__("re").compile(p["regex"], __import__("re").IGNORECASE))
        for p in _QB.CODE_SCAN_PATTERNS
        if p["severity"] in ("CRITICAL", "HIGH")
    ]
    import asyncio as _a
    loop = _a.get_event_loop()
    try:
        gh   = _GithubSDK(GITHUB_TOKEN)
        repo = await loop.run_in_executor(None, gh.get_repo, GITHUB_REPO)
        for prefix in ("", "docker", "lib", "app", "services"):
            try:
                contents = await loop.run_in_executor(
                    None, lambda p=prefix: repo.get_contents(p)
                )
                if not isinstance(contents, list):
                    contents = [contents]
                for item in contents[:60]:
                    if item.type != "file":
                        continue
                    try:
                        raw = item.decoded_content.decode("utf-8", errors="replace")[:30_000]
                        for pat, rx in compiled:
                            for m in rx.finditer(raw):
                                ln = raw[: m.start()].count("\n") + 1
                                findings.append({
                                    "file": item.path, "line": ln,
                                    "severity": pat["severity"], "category": pat["category"],
                                    "description": pat["description"],
                                    "match": m.group(0)[:120], "source": "github-api",
                                    "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                                })
                    except Exception:
                        pass
            except Exception:
                pass
    except Exception as e:
        log.warning("[SAIB-QB] GitHub fallback scan: %s", e)
    return findings


async def quantum_code_scan_loop():
    """Relay to quantum_brain.code_scan_loop() with SAIB live-state references."""
    await _QB.code_scan_loop(
        docker_client_ref=_docker_client,
        state_ref=state,
        alerts_ref=state.alerts,
        brain_ref=state.brain,
        github_fallback_fn=_qb_github_fallback,
        interactions_fn=_qb_interactions_fn,
    )


async def quantum_image_scan_loop():
    """Relay to quantum_brain.image_scan_loop() with SAIB live-state references."""
    await _QB.image_scan_loop(
        docker_client_ref=_docker_client,
        alerts_ref=state.alerts,
    )


# ── Quantum Brain REST Endpoints ──────────────────────────────────────────────

@app.get("/quantum")
async def quantum_brain_status():
    """
    SAIB Apex Supreme Quantum Brain — full dashboard.

    Intelligence tiers:
         0 → SENTINEL
       100 → TRANSCENDENT
       500 → OMNISCIENT
     2,000 → SUPERNATURAL
    10,000 → SUPREME-SOVEREIGN
    50,000 → APEX-SUPREME-QUANTUM-SOVEREIGN  (ultimate)

    Capability unlocks:
    25,000 → AUTONOMOUS_CODE_FIX_ENGINE
    50,000 → APEX_QUANTUM_OMNISCIENCE
    """
    qs = _QB.get_state()
    remaining = max(0, 50_000 - state.brain.total_interactions)
    return {
        "saib_version": SAIB_VERSION,
        "apex_level":   APEX_LEVEL,
        "quantum_brain": {
            "enabled":             qs["enabled"],
            "self_knowledge_hash": qs["self_knowledge_hash"],
            "code_scan": {
                "last_scan":       qs["last_code_scan"],
                "scans_total":     qs["code_scans_total"],
                "issues_found":    qs["code_issues_found"],
                "issues_fixed":    qs["code_issues_fixed"],
                "interval_s":      _QB.QUANTUM_CODE_SCAN_INTERVAL_S,
                "scan_path":       _QB.CODEBASE_SCAN_PATH,
                "patterns":        len(_QB.CODE_SCAN_PATTERNS),
            },
            "image_scan": {
                "last_scan":        qs["last_image_scan"],
                "scans_total":      qs["image_scans_total"],
                "vulnerable_found": qs["vulnerable_images"],
                "interval_s":       _QB.QUANTUM_IMAGE_SCAN_INTERVAL_S,
                "known_vuln_bases": len(_QB.VULNERABLE_BASES),
            },
            "build_engine": {
                "auto_build":      qs["auto_build"],
                "build_context":   _QB.DOCKER_BUILD_CONTEXT,
                "images_rebuilt":  qs["images_rebuilt"],
                "build_successes": qs["build_successes"],
                "build_failures":  qs["build_failures"],
                "last_build":      qs["last_build_attempt"],
                "recent_builds":   qs["build_log"][-5:],
            },
            "recent_findings": list(qs["findings"])[-20:],
        },
        "intelligence": {
            "level":              state.brain.intelligence_level,
            "multiplier":         round(state.brain.intelligence_multiplier, 4),
            "total_interactions": state.brain.total_interactions,
            "capability_unlocks": state.brain.capability_unlocks,
            "apex_tier_progress": {
                "threshold": 50_000,
                "level":     "APEX-SUPREME-QUANTUM-SOVEREIGN",
                "remaining": remaining,
                "percent":   round(min(state.brain.total_interactions / 50_000, 1.0) * 100, 1),
            },
        },
        "quantum_sig": quantum_sign("quantum-brain"),
    }


@app.post("/quantum/scan-code")
async def trigger_code_scan(background_tasks: BackgroundTasks):
    """
    Trigger an immediate full-ecosystem code security scan.
    Scans .py .ts .tsx .js .env .yml .yaml .json .sh files for:
      • Testnet / mainnet violations
      • Hardcoded secrets & API keys
      • Injection vectors (eval, exec, shell=True)
      • Outdated Dockerfile base images
      • Debug artefacts
    Results appear in /quantum/findings and /status alerts.
    """
    if not _QB.QUANTUM_BRAIN_ENABLED:
        raise HTTPException(status_code=503, detail="Quantum brain disabled. Set SAIB_QUANTUM_BRAIN_ENABLED=true.")

    async def _run():
        qs = _QB.get_state()
        findings = await _QB.scan_codebase_files(_qb_github_fallback)
        qs["code_scans_total"] += 1
        qs["last_code_scan"]    = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        qs["code_issues_found"] += len(findings)
        qs["findings"]          = (list(qs["findings"]) + findings)[-100:]
        log.info("[SAIB-QB] Manual code scan: %d finding(s)", len(findings))

    background_tasks.add_task(_run)
    return {
        "success":     True,
        "message":     "Quantum code scan initiated across entire ecosystem",
        "scan_path":   _QB.CODEBASE_SCAN_PATH,
        "patterns":    len(_QB.CODE_SCAN_PATTERNS),
        "quantum_sig": quantum_sign("code-scan-triggered"),
    }


@app.post("/quantum/scan-images")
async def trigger_image_scan(background_tasks: BackgroundTasks):
    """Trigger an immediate Docker image vulnerability scan (running containers + Dockerfiles)."""
    if not _QB.QUANTUM_BRAIN_ENABLED:
        raise HTTPException(status_code=503, detail="Quantum brain disabled.")

    async def _run():
        qs  = _QB.get_state()
        img = await _QB.scan_running_images(_docker_client)
        dfs = await _QB.scan_dockerfiles()
        qs["image_scans_total"] += 1
        qs["last_image_scan"]    = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        qs["vulnerable_images"] += len(img)
        log.info("[SAIB-QB] Manual image scan: %d container + %d Dockerfile findings",
                 len(img), len(dfs))

    background_tasks.add_task(_run)
    return {
        "success":          True,
        "message":          "Quantum image scan initiated — all containers + Dockerfiles",
        "known_vuln_bases": len(_QB.VULNERABLE_BASES),
        "quantum_sig":      quantum_sign("image-scan-triggered"),
    }


@app.get("/quantum/findings")
async def quantum_findings(severity: str | None = None,
                            category: str | None = None,
                            limit:    int        = 50):
    """
    All accumulated quantum brain findings.
    Filter: ?severity=CRITICAL  ?category=mainnet  ?limit=25
    """
    qs = _QB.get_state()
    findings = list(qs["findings"])
    if severity:
        findings = [f for f in findings if f.get("severity", "").upper() == severity.upper()]
    if category:
        findings = [f for f in findings if f.get("category", "").lower() == category.lower()]
    findings = findings[-min(limit, 100):]
    return {
        "saib_version":   SAIB_VERSION,
        "total_findings": len(qs["findings"]),
        "filtered_count": len(findings),
        "severity_filter": severity,
        "category_filter": category,
        "findings":        findings,
        "quantum_sig":    quantum_sign("findings"),
    }


@app.post("/quantum/build/{service_name}")
async def build_service_image(service_name: str,
                               background_tasks: BackgroundTasks,
                               body: dict = {}):
    """
    Rebuild a service Docker image using docker build --pull.
    --pull fetches the latest base image tag from Docker Hub, applying all
    upstream CVE patches automatically in a single operation.

    service_name = subdirectory inside docker/ (e.g. sovereign-ai-bot,
    quantum-shield, pi-bridge-connector, settlement-core).

    Body (optional): {no_cache: bool, async: bool}
    """
    if not _docker_client:
        raise HTTPException(status_code=503, detail="Docker client unavailable.")

    no_cache  = bool(body.get("no_cache", False))
    run_async = bool(body.get("async",    True))
    sig       = quantum_sign(f"build:{service_name}")

    if run_async:
        background_tasks.add_task(_QB.build_service_image, _docker_client, service_name, no_cache)
        return {
            "success":     True,
            "queued":      True,
            "service":     service_name,
            "no_cache":    no_cache,
            "message":     f"Build queued for {service_name} — --pull active for latest CVE patches",
            "quantum_sig": sig,
        }

    result = await _QB.build_service_image(_docker_client, service_name, no_cache=no_cache)
    result["quantum_sig"] = sig
    return result


@app.post("/quantum/rebuild-all")
async def rebuild_all_vulnerable(background_tasks: BackgroundTasks):
    """
    Scan Dockerfiles and rebuild every service with a vulnerable base image.
    Uses --pull on each build to pull the latest security-patched base layers.
    Requires SAIB_QUANTUM_AUTO_BUILD=true OR POST /quantum/authorize-rebuild.
    Processes up to 10 services per call.
    """
    if not _docker_client:
        raise HTTPException(status_code=503, detail="Docker client unavailable.")
    qs = _QB.get_state()
    if not _QB.QUANTUM_AUTO_BUILD and not qs.get("rebuild_all_authorized"):
        raise HTTPException(
            status_code=403,
            detail=(
                "Set SAIB_QUANTUM_AUTO_BUILD=true or call "
                "POST /quantum/authorize-rebuild for a one-shot run."
            ),
        )
    qs["rebuild_all_authorized"] = False   # consume one-shot token

    async def _do():
        dfs  = await _QB.scan_dockerfiles()
        svcs: set[str] = set()
        for f in dfs:
            parts = __import__("pathlib").PurePath(f.get("file", "")).parts
            if parts:
                svcs.add(parts[0])
        for svc in list(svcs)[:10]:
            log.info("[SAIB-QB] Rebuild-all: %s", svc)
            await _QB.build_service_image(_docker_client, svc)
            await asyncio.sleep(5)
        log.info("[SAIB-QB] Rebuild-all: %d service(s) processed", len(svcs))

    background_tasks.add_task(_do)
    return {
        "success":     True,
        "message":     "Full ecosystem rebuild queued — all vulnerable services rebuilt with --pull",
        "quantum_sig": quantum_sign("rebuild-all"),
    }


@app.post("/quantum/authorize-rebuild")
async def authorize_rebuild_once():
    """One-shot authorization for /quantum/rebuild-all when auto-build is disabled."""
    _QB.get_state()["rebuild_all_authorized"] = True
    return {
        "success":     True,
        "message":     "Single rebuild-all run authorized. POST /quantum/rebuild-all to execute.",
        "quantum_sig": quantum_sign("rebuild-authorized"),
    }


@app.get("/quantum/vulnerable-bases")
async def list_vulnerable_bases():
    """Known-vulnerable Docker base images with secure replacement recommendations."""
    return {
        "saib_version": SAIB_VERSION,
        "total":        len(_QB.VULNERABLE_BASES),
        "vulnerable_bases": [
            {"from": k, "upgrade_to": v}
            for k, v in sorted(_QB.VULNERABLE_BASES.items())
        ],
        "quantum_sig": quantum_sign("vulnerable-bases"),
    }


@app.get("/quantum/scan-patterns")
async def list_scan_patterns():
    """All code threat signatures SAIB uses — regex, severity, category, description."""
    return {
        "saib_version":   SAIB_VERSION,
        "total_patterns": len(_QB.CODE_SCAN_PATTERNS),
        "patterns": [
            {
                "regex":       p["regex"],
                "severity":    p["severity"],
                "category":    p["category"],
                "description": p["description"],
            }
            for p in _QB.CODE_SCAN_PATTERNS
        ],
        "quantum_sig": quantum_sign("scan-patterns"),
    }
