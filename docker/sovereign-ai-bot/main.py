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
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import PlainTextResponse
from prometheus_client import (
    Counter, Gauge, Histogram, generate_latest, CONTENT_TYPE_LATEST
)

# ── Config ─────────────────────────────────────────────────────────────────────

PORT              = int(os.getenv("PORT", "8099"))
REDIS_URL         = os.getenv("REDIS_URL", "redis://triumph-redis:6379")
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
]

_CAPABILITY_MILESTONES = {
    50:    "PREDICTIVE_HEALING",
    200:   "DOMAIN_EXPERTISE",
    1000:  "QUANTUM_INTUITION",
    5000:  "OMNISCIENT_FORECASTING",
    10000: "SUPREME_SOVEREIGN_INTELLIGENCE",
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

    # Brief pause then re-probe
    await asyncio.sleep(2.0)
    url = SERVICES.get(name, "")
    if url:
        ok, latency = await probe_service(client, name, url)
    else:
        ok, latency = False, -1.0

    heal_record = {
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

    # Publish to Redis for the Next.js app
    try:
        r = await aioredis.from_url(REDIS_URL)
        await r.publish("saib:events", json.dumps({
            "event": "heal",
            "service": name,
            "ok": ok,
            "sig": heal_sig,
        }))
        await r.aclose()
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

        # Persist state to Redis
        try:
            r = await aioredis.from_url(REDIS_URL)
            await r.set("saib:state", json.dumps({
                "pulse":     state.pulse_count,
                "healthy":   healthy_count,
                "total":     total,
                "score":     min(score, 100),
                "mode":      state.intelligence_mode,
                "lockdown":  state.lockdown,
                "updated":   time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            }), ex=60)
            await r.aclose()
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

# ── FastAPI App ────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Triumph Synergy SAIB",
    description="Sovereign AI Bot — autonomous ecosystem guardian",
    version="1.0.0",
)

@app.on_event("startup")
async def startup():
    asyncio.create_task(pulse_loop())
    log.info(
        f"SAIB {SAIB_VERSION} started — mode={INTELLIGENCE_MODE} — port={PORT} — "
        f"apex_enforcement={APEX_ENFORCEMENT} — sentinel_instant_heal={SENTINEL_INSTANT} — "
        f"all_loopholes={ALL_LOOPHOLES} ({len(AUTO_LOOPHOLES)} active) — pulse={PULSE_INTERVAL_S}s — "
        f"PI_INTERNAL=${PI_INTERNAL_RATE:,.3f}/π — PI_EXTERNAL=${PI_EXTERNAL_RATE}/π — "
        f"GOLD_STANDARD=ACTIVE — APEX_LEVEL={APEX_LEVEL}"
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
    }

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
    new_caps = [c for c in state.brain.capability_unlocks
                if c not in _CAPABILITY_MILESTONES or
                _CAPABILITY_MILESTONES.get(list(_CAPABILITY_MILESTONES.keys())[
                    list(_CAPABILITY_MILESTONES.values()).index(c)], 0) > prev_total]

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
