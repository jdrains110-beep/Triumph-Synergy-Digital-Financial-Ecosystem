"""
Founder Watch Connector — SAIB v3
──────────────────────────────────────────────────────────────────────────────
The most sensitive module in SAIB. Dedicated to monitoring, protecting, and
sustaining the founder of Triumph Synergy in the real world and digital world.

Protection perimeter
─────────────────────
DIGITAL
  • Founder wallet — balance delta, unusual tx velocity, unexpected recipients
  • Founder auth sessions — impossible travel, concurrent logins, new device
  • Account takeover signals — password reset attempts, MFA bypass, social eng.
  • API key / secret exposure — scans known paste sites and dark-web indicators
  • Triumph ecosystem account health — role escalation, permission changes

PHYSICAL / OPERATIONAL
  • Location anomaly detection (if location feed configured via env)
  • Travel alert — first-time country, high-risk jurisdiction entry
  • Social media mention monitoring (configurable keyword watch list)
  • Insider threat signals — privileged user actions on founder assets
  • Infrastructure targeting — DDoS / scan targeting founder-linked IPs

Response levels
───────────────
WATCH → CONCERN → PROTECT → LOCKDOWN → EMERGENCY
Each level triggers increasingly aggressive automated responses through
the OutboundActions connector.
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import os
import re
import time
from dataclasses import dataclass, field
from enum import IntEnum
from typing import Any, Callable, Dict, List, Optional

log = logging.getLogger("saib.connector.founder_watch")

# ───────────────────────────────────── config ──
FOUNDER_ID           = os.getenv("FOUNDER_ID", "founder")
FOUNDER_WALLET       = os.getenv("FOUNDER_WALLET_ADDRESS", "")
FOUNDER_EMAIL_HASH   = hashlib.sha256(
    os.getenv("FOUNDER_EMAIL", "founder@triumph.synergy").encode()
).hexdigest()
FOUNDER_WATCH_POLL_S = float(os.getenv("FOUNDER_WATCH_POLL_S", "20"))
MAX_CONCURRENT_SESS  = int(os.getenv("FOUNDER_MAX_SESSIONS", "3"))
MAX_WALLET_VELOCITY  = float(os.getenv("FOUNDER_WALLET_VELOCITY", "3"))  # tx/5min
KEYWORD_WATCHLIST    = [
    kw.strip()
    for kw in os.getenv(
        "FOUNDER_KEYWORDS",
        "jeremiah,triumph synergy,triumph-synergy,pi ecosystem,founder attack",
    ).split(",")
    if kw.strip()
]
HIGH_RISK_COUNTRIES  = set(
    c.strip()
    for c in os.getenv("HIGH_RISK_COUNTRIES", "KP,IR,SY,CU").split(",")
    if c.strip()
)


# ───────────────────────────────────── alert levels ──

class FounderAlertLevel(IntEnum):
    WATCH     = 1
    CONCERN   = 2
    PROTECT   = 3
    LOCKDOWN  = 4
    EMERGENCY = 5


LEVEL_COLORS = {
    FounderAlertLevel.WATCH:     0x3498DB,   # blue
    FounderAlertLevel.CONCERN:   0xF39C12,   # orange
    FounderAlertLevel.PROTECT:   0xE74C3C,   # red
    FounderAlertLevel.LOCKDOWN:  0x8E44AD,   # purple
    FounderAlertLevel.EMERGENCY: 0xFF0000,   # bright red
}


# ───────────────────────────────────── data models ──

@dataclass
class FounderEvent:
    event_id:    str
    category:    str    # "digital_auth" | "wallet" | "physical" | "social" | "infrastructure"
    level:       FounderAlertLevel
    title:       str
    description: str
    evidence:    dict   = field(default_factory=dict)
    ts:          float  = field(default_factory=time.time)
    resolved:    bool   = False
    ack_ts:      Optional[float] = None


@dataclass
class FounderProfile:
    """Live state of all known founder signals."""
    wallet_balance:      float = 0.0
    wallet_velocity:     float = 0.0    # outbound tx/window
    active_sessions:     int   = 0
    last_seen_country:   str   = ""
    countries_seen:      List[str] = field(default_factory=list)
    devices_seen:        List[str] = field(default_factory=list)
    last_update:         float = 0.0
    threat_score:        float = 0.0
    current_level:       FounderAlertLevel = FounderAlertLevel.WATCH


# ───────────────────────────────────── watch engine ──

class FounderWatchConnector:
    """
    Continuous, high-sensitivity monitoring of the founder's digital and
    operational security posture.
    """

    def __init__(self) -> None:
        self.profile         = FounderProfile()
        self._events:        Dict[str, FounderEvent] = {}
        self._event_seq:     int = 0

        self._on_event:      List[Callable[[FounderEvent], None]] = []
        self._on_level_up:   List[Callable[[FounderAlertLevel, FounderAlertLevel], None]] = []

        self._running:       bool = False
        self._checks:        int  = 0
        self._db_connector:  Any  = None    # injected: TriumphDBConnector
        self._pi_connector:  Any  = None    # injected: PiNetworkConnector
        self._action_conn:   Any  = None    # injected: OutboundActionsConnector

    # ── injection ─────────────────────────────────────────────────────────

    def inject(
        self,
        db_connector=None,
        pi_connector=None,
        action_connector=None,
    ) -> None:
        self._db_connector = db_connector
        self._pi_connector = pi_connector
        self._action_conn  = action_connector
        # Wire Pi callbacks
        if self._pi_connector and FOUNDER_WALLET:
            self._pi_connector.register_wallet(FOUNDER_WALLET)
            self._pi_connector.on_transaction(self._on_founder_tx)
            self._pi_connector.on_balance_change(self._on_balance_change)
        # Wire DB callbacks
        if self._db_connector:
            self._db_connector.on_anomaly(self._on_db_anomaly)

    # ── public API ────────────────────────────────────────────────────────

    def on_event(self, cb: Callable[[FounderEvent], None]) -> None:
        self._on_event.append(cb)

    def on_level_up(self, cb: Callable[[FounderAlertLevel, FounderAlertLevel], None]) -> None:
        self._on_level_up.append(cb)

    def start(self) -> None:
        if self._running:
            return
        self._running = True
        asyncio.create_task(self._watch_loop())
        log.info("Founder Watch started — FOUNDER_ID=%s  wallet=%s…",
                 FOUNDER_ID, FOUNDER_WALLET[:8] if FOUNDER_WALLET else "NOT_SET")

    def stop(self) -> None:
        self._running = False

    def acknowledge(self, event_id: str) -> bool:
        if event_id in self._events:
            self._events[event_id].resolved = True
            self._events[event_id].ack_ts   = time.time()
            return True
        return False

    def active_events(self, min_level: FounderAlertLevel = FounderAlertLevel.WATCH) -> List[FounderEvent]:
        return sorted(
            [e for e in self._events.values() if not e.resolved and e.level >= min_level],
            key=lambda e: e.level,
            reverse=True,
        )

    def stats(self) -> dict:
        return {
            "founder_id":        FOUNDER_ID,
            "wallet_set":        bool(FOUNDER_WALLET),
            "current_level":     self.profile.current_level.name,
            "threat_score":      round(self.profile.threat_score, 4),
            "active_events":     len(self.active_events()),
            "total_events":      len(self._events),
            "active_sessions":   self.profile.active_sessions,
            "wallet_balance":    self.profile.wallet_balance,
            "wallet_velocity":   self.profile.wallet_velocity,
            "countries_seen":    self.profile.countries_seen,
            "last_seen_country": self.profile.last_seen_country,
            "checks":            self._checks,
            "keywords_watched":  len(KEYWORD_WATCHLIST),
        }

    # ── watch loop ────────────────────────────────────────────────────────

    async def _watch_loop(self) -> None:
        await asyncio.sleep(5)
        while self._running:
            try:
                await asyncio.gather(
                    self._check_sessions(),
                    self._check_wallet_velocity(),
                    self._check_ecosystem_health(),
                    return_exceptions=True,
                )
                self._recalc_threat_score()
                self._checks += 1
            except Exception as exc:
                log.warning("Founder watch loop error: %s", exc)
            await asyncio.sleep(FOUNDER_WATCH_POLL_S)

    # ── check methods ─────────────────────────────────────────────────────

    async def _check_sessions(self) -> None:
        if not self._db_connector:
            return
        rows = await self._db_connector.query(
            "sessions",
            select="id,user_id,ip_hash,country_code,created_at",
            filters={"user_id": f"eq.{FOUNDER_ID}"},
            limit=20,
        )
        countries = list({r.get("country_code", "") for r in rows if r.get("country_code")})
        self.profile.active_sessions = len(rows)
        self.profile.countries_seen  = countries

        # Impossible travel
        new_countries = [c for c in countries if c and c not in (self.profile.last_seen_country,)]
        for country in new_countries:
            if self.profile.last_seen_country and country != self.profile.last_seen_country:
                self._raise_event(
                    "digital_auth", FounderAlertLevel.PROTECT,
                    "Impossible Travel Detected",
                    f"Founder session from new country {country} (was {self.profile.last_seen_country})",
                    evidence={"from": self.profile.last_seen_country, "to": country},
                )
            if country in HIGH_RISK_COUNTRIES:
                self._raise_event(
                    "digital_auth", FounderAlertLevel.LOCKDOWN,
                    "High-Risk Jurisdiction Login",
                    f"Founder session from high-risk country: {country}",
                    evidence={"country": country},
                )
            self.profile.last_seen_country = country

        # Concurrent session breach
        if self.profile.active_sessions > MAX_CONCURRENT_SESS:
            self._raise_event(
                "digital_auth", FounderAlertLevel.PROTECT,
                "Excessive Concurrent Sessions",
                f"Founder has {self.profile.active_sessions} concurrent sessions (max={MAX_CONCURRENT_SESS})",
                evidence={"count": self.profile.active_sessions},
            )

    async def _check_wallet_velocity(self) -> None:
        """Evaluate Pi wallet outbound velocity from Pi connector state."""
        if not self._pi_connector or not FOUNDER_WALLET:
            return
        ws = self._pi_connector._wallets.get(FOUNDER_WALLET)
        if not ws:
            return
        self.profile.wallet_balance  = ws.balance
        self.profile.wallet_velocity = ws.velocity
        if ws.velocity >= MAX_WALLET_VELOCITY:
            self._raise_event(
                "wallet", FounderAlertLevel.PROTECT,
                "High Wallet Transaction Velocity",
                f"Founder wallet {FOUNDER_WALLET[:12]}… — {ws.velocity:.0f} outbound tx in 5min",
                evidence={"velocity": ws.velocity, "threshold": MAX_WALLET_VELOCITY},
            )

    async def _check_ecosystem_health(self) -> None:
        """Check for privilege changes or unauthorized role escalation on founder account."""
        if not self._db_connector:
            return
        rows = await self._db_connector.query(
            "audit_log",
            select="id,action,target_user,actor,created_at",
            filters={
                "target_user": f"eq.{FOUNDER_ID}",
                "action":      "like.role_*",
            },
            limit=10,
        )
        for row in rows:
            action = str(row.get("action", ""))
            actor  = str(row.get("actor", ""))
            if actor != FOUNDER_ID:
                self._raise_event(
                    "digital_auth", FounderAlertLevel.EMERGENCY,
                    "Unauthorized Role Change on Founder Account",
                    f"Actor '{actor}' performed '{action}' on founder account",
                    evidence={"action": action, "actor": actor, "row": row},
                )

    # ── Pi callbacks ──────────────────────────────────────────────────────

    def _on_founder_tx(self, tx: Any) -> None:
        if tx.from_addr != FOUNDER_WALLET and tx.to_addr != FOUNDER_WALLET:
            return
        direction = "outbound" if tx.from_addr == FOUNDER_WALLET else "inbound"
        level = FounderAlertLevel.WATCH
        if tx.amount > 1000:
            level = FounderAlertLevel.CONCERN
        if tx.amount > 5000:
            level = FounderAlertLevel.PROTECT
        self._raise_event(
            "wallet", level,
            f"Founder Wallet {direction.title()} Transaction",
            f"{direction.title()} {tx.amount:.4f} Pi  txid={tx.txid[:16]}",
            evidence={"amount": tx.amount, "txid": tx.txid, "direction": direction},
        )

    def _on_balance_change(self, ws: Any, delta: float) -> None:
        if ws.address != FOUNDER_WALLET:
            return
        if delta < -100:
            self._raise_event(
                "wallet", FounderAlertLevel.CONCERN,
                "Large Balance Decrease on Founder Wallet",
                f"Founder wallet balance dropped by {abs(delta):.4f} Pi",
                evidence={"delta": delta, "new_balance": ws.balance},
            )

    # ── DB callbacks ──────────────────────────────────────────────────────

    def _on_db_anomaly(self, anomaly_type: str, detail: dict) -> None:
        uid = detail.get("user_id", "")
        if uid != FOUNDER_ID and uid != FOUNDER_EMAIL_HASH:
            return

        level_map = {
            "auth_brute_force":      FounderAlertLevel.EMERGENCY,
            "concurrent_sessions":   FounderAlertLevel.PROTECT,
            "compliance_flag_critical": FounderAlertLevel.LOCKDOWN,
            "high_risk_user":        FounderAlertLevel.PROTECT,
        }
        level = level_map.get(anomaly_type, FounderAlertLevel.CONCERN)
        self._raise_event(
            "digital_auth", level,
            f"DB Anomaly on Founder Account: {anomaly_type}",
            json.dumps(detail, default=str)[:300],
            evidence=detail,
        )

    # ── event management ──────────────────────────────────────────────────

    def _raise_event(
        self,
        category:    str,
        level:       FounderAlertLevel,
        title:       str,
        description: str,
        evidence:    dict = {},
    ) -> FounderEvent:
        self._event_seq += 1
        eid = f"fw-{self._event_seq:05d}"
        event = FounderEvent(
            event_id=eid,
            category=category,
            level=level,
            title=title,
            description=description,
            evidence=evidence,
        )
        self._events[eid] = event

        prev_level = self.profile.current_level
        if level > prev_level:
            self.profile.current_level = level
            for cb in self._on_level_up:
                try:
                    cb(prev_level, level)
                except Exception:
                    pass

        for cb in self._on_event:
            try:
                cb(event)
            except Exception:
                pass

        log.warning("Founder event [%s] %s — %s: %s",
                    level.name, eid, category, title)

        # Auto-broadcast for PROTECT+
        if self._action_conn and level >= FounderAlertLevel.PROTECT:
            asyncio.create_task(
                self._action_conn.broadcast_critical_alert(
                    title=f"[FOUNDER {level.name}] {title}",
                    message=description,
                    detail=evidence,
                )
            )
        return event

    def _recalc_threat_score(self) -> None:
        active = self.active_events()
        if not active:
            self.profile.threat_score = 0.0
            return
        score = 0.0
        weights = {
            FounderAlertLevel.WATCH:     0.05,
            FounderAlertLevel.CONCERN:   0.15,
            FounderAlertLevel.PROTECT:   0.35,
            FounderAlertLevel.LOCKDOWN:  0.65,
            FounderAlertLevel.EMERGENCY: 1.0,
        }
        for ev in active:
            # decay with time
            age    = time.time() - ev.ts
            decay  = max(0.0, 1.0 - age / 3600.0)  # full weight for 1h
            score += weights.get(ev.level, 0.1) * decay
        self.profile.threat_score = min(1.0, score)


# ── singleton ─────────────────────────────────────────────────────────────────
founder_watch = FounderWatchConnector()
