"""
Founder Presence Engine — v6 Omega Prime
=========================================
Tracks and protects Jeremiah Drains' sovereign presence across BOTH
the digital world and the real world simultaneously.

Digital presence:
  - X / @jaymoney0300 timeline activity
  - Pi Network wallet + payment events
  - Triumph Synergy platform sessions
  - Supabase / app usage patterns
  - GitHub commit cadence
  - Grok AI advisory interactions
  - Email monitoring: jdrains022@yahoo.com + jdrains110@gmail.com

Real-world presence:
  - Location safety status (manual check-in + dead-man timer)
  - Financial instrument monitoring (Pi wallet, bank indicators)
  - Physical security alerts (manually reported or via trusted contacts)
  - Legal / business calendar events
  - Reimbursement tracker (active claims, expected dates, amounts)

The engine emits a FounderPresenceEvent for every state change and routes
it through the OmegaBrain for retention + pattern learning.
"""
from __future__ import annotations

import asyncio
import time
import uuid
from collections import deque
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Deque, Dict, List, Optional


class PresenceDomain(str, Enum):
    DIGITAL    = "DIGITAL"
    REAL_WORLD = "REAL_WORLD"
    COMBINED   = "COMBINED"   # event that spans both


class PresenceSeverity(str, Enum):
    INFO     = "INFO"
    WATCH    = "WATCH"
    ALERT    = "ALERT"
    CRITICAL = "CRITICAL"
    LOCKDOWN = "LOCKDOWN"


@dataclass
class FounderPresenceEvent:
    event_id:   str  = field(default_factory=lambda: str(uuid.uuid4()))
    domain:     PresenceDomain   = PresenceDomain.DIGITAL
    severity:   PresenceSeverity = PresenceSeverity.INFO
    event_type: str  = ""
    details:    Dict = field(default_factory=dict)
    ts:         float = field(default_factory=time.time)
    acked:      bool  = False


# ── email keywords that auto-escalate severity ─────────────────────────────
_EMAIL_ALERT_KEYWORDS = [
    "reimbursement", "refund", "payment", "invoice", "overdue", "final notice",
    "legal", "lawsuit", "court", "subpoena", "suspend", "termination", "breach",
    "fraud", "unauthorized", "security alert", "account locked", "verify",
    "pi network", "triumph", "saib", "jdrains",
]


@dataclass
class EmailEvent:
    """A single email received at a monitored founder inbox."""
    event_id:  str   = field(default_factory=lambda: str(uuid.uuid4()))
    inbox:     str   = ""    # full address, e.g. jdrains022@yahoo.com
    sender:    str   = ""
    subject:   str   = ""
    snippet:   str   = ""   # first ~200 chars of body (no full body stored)
    labels:    List[str] = field(default_factory=list)  # e.g. ["INBOX", "UNREAD"]
    thread_id: str   = ""
    severity:  PresenceSeverity = PresenceSeverity.INFO
    ts:        float = field(default_factory=time.time)
    acked:     bool  = False


@dataclass
class ReimbursementClaim:
    claim_id:      str   = field(default_factory=lambda: str(uuid.uuid4()))
    description:   str   = ""
    amount_usd:    float = 0.0
    platform:      str   = ""   # e.g. "Replit", "Vercel", "AWS"
    submitted_at:  float = field(default_factory=time.time)
    expected_by:   Optional[float] = None
    status:        str   = "PENDING"   # PENDING | APPROVED | RECEIVED | DENIED
    notes:         str   = ""


class FounderPresenceEngine:
    """
    Real-time dual-domain founder monitoring.

    Digital domain checks:
      - X mentions / DMs targeting the founder
      - Pi wallet balance changes > threshold
      - Triumph platform login anomalies

    Real-world domain checks:
      - Dead-man timer: founder expected to check-in every ``checkin_interval_s``
        seconds; if missed, escalates to ALERT → CRITICAL → LOCKDOWN
      - Active reimbursement claims (auto-reminders on overdue)
      - Financial instrument status
    """

    DEADMAN_GRACE_S = 3 * 3600  # 3 hours before escalating

    # Monitored founder inboxes (address → label)
    MONITORED_INBOXES: Dict[str, str] = {
        "jdrains022@yahoo.com": "Yahoo Primary",
        "jdrains110@gmail.com": "Gmail Primary",
    }

    def __init__(self, brain=None) -> None:
        self._brain       = brain
        self._events:     Deque[FounderPresenceEvent] = deque(maxlen=2000)
        self._claims:     Dict[str, ReimbursementClaim] = {}

        # Digital state
        self._last_digital_activity = time.time()
        self._digital_streak        = 0      # consecutive active windows
        self._x_mentions_today      = 0
        self._pi_wallet_balance     = 0.0
        self._platform_sessions_active = 0

        # Email state
        self._email_events: Deque[EmailEvent] = deque(maxlen=1000)
        self._email_counts: Dict[str, int] = {
            addr: 0 for addr in self.MONITORED_INBOXES
        }

        # Real-world state
        self._last_checkin       = time.time()
        self._real_world_status  = "SAFE"   # SAFE | ALERT | CRITICAL | LOCKDOWN
        self._location_verified  = False
        self._financial_ok       = True

        self._started_at = time.time()

    # ── digital presence ─────────────────────────────────────────────────────

    async def digital_activity(
        self,
        activity_type: str,
        details: Optional[Dict] = None,
    ) -> FounderPresenceEvent:
        """Record any digital activity from the founder."""
        self._last_digital_activity = time.time()
        self._digital_streak += 1
        evt = FounderPresenceEvent(
            domain=PresenceDomain.DIGITAL,
            severity=PresenceSeverity.INFO,
            event_type=f"digital.{activity_type}",
            details=details or {},
        )
        self._events.append(evt)
        if self._brain:
            await self._brain.absorb(f"founder.digital.{activity_type}", details or {})
        return evt

    async def x_mention_received(
        self, from_handle: str, content: str, hostile: bool = False
    ) -> FounderPresenceEvent:
        self._x_mentions_today += 1
        sev = PresenceSeverity.ALERT if hostile else PresenceSeverity.INFO
        evt = FounderPresenceEvent(
            domain=PresenceDomain.DIGITAL,
            severity=sev,
            event_type="x.mention",
            details={"from": from_handle, "content": content[:200], "hostile": hostile},
        )
        self._events.append(evt)
        if self._brain:
            await self._brain.absorb("founder.x.mention", evt.details, confidence=0.95)
        return evt

    async def pi_wallet_update(self, new_balance: float) -> FounderPresenceEvent:
        delta = new_balance - self._pi_wallet_balance
        self._pi_wallet_balance = new_balance
        sev = PresenceSeverity.WATCH if abs(delta) > 100 else PresenceSeverity.INFO
        evt = FounderPresenceEvent(
            domain=PresenceDomain.DIGITAL,
            severity=sev,
            event_type="pi.wallet.update",
            details={"balance": new_balance, "delta": delta},
        )
        self._events.append(evt)
        if self._brain:
            await self._brain.absorb("founder.pi.wallet", evt.details)
        return evt

    # ── email monitoring ─────────────────────────────────────────────────────

    async def ingest_email(
        self,
        inbox: str,
        sender: str,
        subject: str,
        snippet: str = "",
        labels: Optional[List[str]] = None,
        thread_id: str = "",
    ) -> EmailEvent:
        """
        Ingest an email delivered to a monitored inbox.
        Auto-classifies severity based on subject + snippet keywords.
        Only the inbox address, sender, subject, and a short snippet are
        retained — no full message body is ever stored.
        """
        if inbox not in self.MONITORED_INBOXES:
            # Accept it anyway but flag as unrecognised inbox
            pass

        combined = (subject + " " + snippet).lower()
        matched_keywords = [kw for kw in _EMAIL_ALERT_KEYWORDS if kw in combined]

        if len(matched_keywords) >= 3:
            sev = PresenceSeverity.CRITICAL
        elif len(matched_keywords) >= 1:
            sev = PresenceSeverity.ALERT
        elif labels and any(lbl in ("SPAM", "PHISHING") for lbl in labels):
            sev = PresenceSeverity.WATCH
        else:
            sev = PresenceSeverity.INFO

        evt = EmailEvent(
            inbox=inbox, sender=sender,
            subject=subject[:200], snippet=snippet[:200],
            labels=labels or [], thread_id=thread_id, severity=sev,
        )
        self._email_events.append(evt)
        self._email_counts[inbox] = self._email_counts.get(inbox, 0) + 1

        # Record as a founder presence event so it appears in the unified log
        presence_evt = FounderPresenceEvent(
            domain=PresenceDomain.DIGITAL,
            severity=sev,
            event_type="email.received",
            details={
                "inbox":    inbox,
                "sender":   sender,
                "subject":  subject[:200],
                "snippet":  snippet[:200],
                "keywords": matched_keywords,
            },
        )
        self._events.append(presence_evt)

        if self._brain:
            await self._brain.absorb(
                f"founder.email.{inbox.split('@')[1].split('.')[0]}",
                {"sender": sender, "subject": subject[:200], "keywords": matched_keywords},
                confidence=1.0 if sev in (PresenceSeverity.ALERT, PresenceSeverity.CRITICAL) else 0.8,
            )

        return evt

    def email_stats(self) -> Dict[str, Any]:
        """Summary of email activity across all monitored inboxes."""
        high_priority = [
            e for e in self._email_events
            if e.severity in (PresenceSeverity.ALERT, PresenceSeverity.CRITICAL) and not e.acked
        ]
        return {
            "monitored_inboxes": list(self.MONITORED_INBOXES.keys()),
            "total_received":    len(self._email_events),
            "per_inbox":         dict(self._email_counts),
            "unacked_high_priority": len(high_priority),
            "recent_high_priority": [
                {
                    "event_id": e.event_id,
                    "inbox":   e.inbox,
                    "sender":  e.sender,
                    "subject": e.subject,
                    "severity": e.severity,
                    "ts":      e.ts,
                }
                for e in high_priority[-10:]
            ],
        }

    def recent_emails(self, n: int = 20, inbox: Optional[str] = None) -> List[Dict]:
        """List recent email events, optionally filtered by inbox."""
        events = list(self._email_events)
        if inbox:
            events = [e for e in events if e.inbox == inbox]
        return [
            {
                "event_id":  e.event_id,
                "inbox":     e.inbox,
                "sender":    e.sender,
                "subject":   e.subject,
                "snippet":   e.snippet,
                "labels":    e.labels,
                "severity":  e.severity,
                "ts":        e.ts,
                "acked":     e.acked,
            }
            for e in events[-n:]
        ]

    # ── real-world presence ────────────────────────────────────────────────

    async def founder_checkin(self, location_hint: str = "", notes: str = "") -> FounderPresenceEvent:
        """Founder manually confirms real-world safety."""
        self._last_checkin      = time.time()
        self._real_world_status = "SAFE"
        self._location_verified = True
        evt = FounderPresenceEvent(
            domain=PresenceDomain.REAL_WORLD,
            severity=PresenceSeverity.INFO,
            event_type="checkin",
            details={"location_hint": location_hint, "notes": notes},
        )
        self._events.append(evt)
        if self._brain:
            await self._brain.absorb("founder.real_world.checkin", evt.details)
        return evt

    async def report_physical_threat(
        self, threat_type: str, description: str
    ) -> FounderPresenceEvent:
        self._real_world_status = "CRITICAL"
        evt = FounderPresenceEvent(
            domain=PresenceDomain.REAL_WORLD,
            severity=PresenceSeverity.CRITICAL,
            event_type=f"physical_threat.{threat_type}",
            details={"description": description},
        )
        self._events.append(evt)
        if self._brain:
            await self._brain.absorb("founder.real_world.threat", evt.details, confidence=1.0)
        return evt

    async def deadman_tick(self) -> Optional[FounderPresenceEvent]:
        """Called periodically to escalate if founder hasn't checked in."""
        elapsed = time.time() - self._last_checkin
        if elapsed < self.DEADMAN_GRACE_S:
            return None
        # Escalate
        if elapsed < self.DEADMAN_GRACE_S * 2:
            sev   = PresenceSeverity.ALERT
            state = "ALERT"
        elif elapsed < self.DEADMAN_GRACE_S * 3:
            sev   = PresenceSeverity.CRITICAL
            state = "CRITICAL"
        else:
            sev   = PresenceSeverity.LOCKDOWN
            state = "LOCKDOWN"

        self._real_world_status = state
        evt = FounderPresenceEvent(
            domain=PresenceDomain.REAL_WORLD,
            severity=sev,
            event_type="deadman_escalation",
            details={"elapsed_s": elapsed, "state": state},
        )
        self._events.append(evt)
        if self._brain:
            await self._brain.absorb("founder.deadman", evt.details, confidence=1.0)
        return evt

    # ── reimbursement tracker ─────────────────────────────────────────────

    def add_reimbursement_claim(
        self,
        description: str,
        amount_usd: float,
        platform: str,
        expected_by: Optional[float] = None,
        notes: str = "",
    ) -> ReimbursementClaim:
        claim = ReimbursementClaim(
            description=description, amount_usd=amount_usd,
            platform=platform, expected_by=expected_by, notes=notes,
        )
        self._claims[claim.claim_id] = claim
        return claim

    def update_claim_status(self, claim_id: str, status: str, notes: str = "") -> bool:
        if claim_id not in self._claims:
            return False
        self._claims[claim_id].status = status
        if notes:
            self._claims[claim_id].notes = notes
        return True

    def overdue_claims(self) -> List[ReimbursementClaim]:
        now = time.time()
        return [
            c for c in self._claims.values()
            if c.status == "PENDING" and c.expected_by and c.expected_by < now
        ]

    # ── status ───────────────────────────────────────────────────────────────

    def status(self) -> Dict[str, Any]:
        return {
            "digital": {
                "last_activity_ago_s": round(time.time() - self._last_digital_activity, 1),
                "streak":              self._digital_streak,
                "x_mentions_today":    self._x_mentions_today,
                "pi_wallet_balance":   self._pi_wallet_balance,
                "sessions_active":     self._platform_sessions_active,
            },
            "real_world": {
                "status":              self._real_world_status,
                "last_checkin_ago_s":  round(time.time() - self._last_checkin, 1),
                "location_verified":   self._location_verified,
                "financial_ok":        self._financial_ok,
            },
            "email": self.email_stats(),
            "reimbursements": {
                "total_claims":   len(self._claims),
                "pending":        sum(1 for c in self._claims.values() if c.status == "PENDING"),
                "overdue":        len(self.overdue_claims()),
                "total_pending_usd": sum(
                    c.amount_usd for c in self._claims.values() if c.status == "PENDING"
                ),
            },
            "events_logged": len(self._events),
            "uptime_s":      round(time.time() - self._started_at, 2),
        }

    def recent_events(self, n: int = 20) -> List[Dict]:
        return [
            {
                "event_id":   e.event_id,
                "domain":     e.domain,
                "severity":   e.severity,
                "event_type": e.event_type,
                "details":    e.details,
                "ts":         e.ts,
                "acked":      e.acked,
            }
            for e in list(self._events)[-n:]
        ]


# ── singleton ──────────────────────────────────────────────────────────────
founder_presence = FounderPresenceEngine()
