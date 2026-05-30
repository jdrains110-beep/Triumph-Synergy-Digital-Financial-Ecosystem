"""
SAIB Billing Engine — v5
──────────────────────────────────────────────────────────────────────────────
Manages 30-minute free sessions, Pi/USD payment gating, founder revenue split,
and subscription lifecycle for Triumph Synergy's SAIB monetization layer.

Real-world Pi utility:
  • Every Pi payment is a mainnet blockchain transaction
  • SAIB creates verifiable Pi utility through AI diagnostic services
  • Founder receives 15% of every Pi and USD payment (configurable)

Session model:
  FREE_SESSION   → 30 minutes free, no payment required
  PI_PAYGO       → 1 Pi / 4-hour session block
  PI_BASIC       → 5 Pi/month, 50 diagnoses/day
  PI_PRO         → 20 Pi/month, unlimited, GitHub PR delivery, K8s
  PI_ENTERPRISE  → 100 Pi/month, white-label, Grok-3, SLA
  USD_PAYGO      → $0.99 / 4-hour session block
  USD_BASIC      → $9.99/month
  USD_PRO        → $49.99/month
  USD_ENTERPRISE → $199.99/month

Regional USD payment methods (Stripe):
  US/Global: card, link | EU: SEPA, iDEAL | IN: UPI | BR: PIX, Boleto
  MX: OXXO | AU: BECS | MY/SG: GrabPay | NG/KE/ZA: card | JP: konbini
"""
from __future__ import annotations

import json
import logging
import os
import secrets
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

log = logging.getLogger("saib.billing")

# ── config ────────────────────────────────────────────────────────────────────
FREE_SESSION_SECS      = int(os.getenv("SAIB_FREE_SESSION_SECS", "1800"))     # 30 min default
MAX_SESSIONS           = int(os.getenv("SAIB_MAX_SESSIONS", "50000"))
FOUNDER_SPLIT_PCT      = float(os.getenv("SAIB_FOUNDER_SPLIT_PCT", "15.0"))
FOUNDER_USD_EMAIL      = os.getenv("SAIB_FOUNDER_USD_EMAIL", "")
STRIPE_SECRET_KEY      = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET  = os.getenv("STRIPE_WEBHOOK_SECRET", "")
SAIB_BASE_URL          = os.getenv("SAIB_BASE_URL", "https://saib.triumphsynergy.io")
BILLING_DATA_FILE      = os.getenv("SAIB_BILLING_DATA_FILE", "/tmp/saib_billing.json")


# ── enums ─────────────────────────────────────────────────────────────────────

class BillingPlan(str, Enum):
    FREE_SESSION   = "free_session"    # 30-minute free trial
    PI_PAYGO       = "pi_paygo"        # 1 Pi / 4h session
    PI_BASIC       = "pi_basic"        # 5 Pi/month
    PI_PRO         = "pi_pro"          # 20 Pi/month
    PI_ENTERPRISE  = "pi_enterprise"   # 100 Pi/month
    USD_PAYGO      = "usd_paygo"       # $0.99 / 4h session
    USD_BASIC      = "usd_basic"       # $9.99/month
    USD_PRO        = "usd_pro"         # $49.99/month
    USD_ENTERPRISE = "usd_enterprise"  # $199.99/month


class SessionState(str, Enum):
    FREE_ACTIVE  = "free_active"
    FREE_EXPIRED = "free_expired"
    PAID_ACTIVE  = "paid_active"
    PAID_EXPIRED = "paid_expired"
    INVALID      = "invalid"


# ── plan catalog ──────────────────────────────────────────────────────────────

PLAN_CATALOG: Dict[BillingPlan, Dict[str, Any]] = {
    BillingPlan.FREE_SESSION: {
        "name":               "Free Trial",
        "description":        "30-minute free access — no payment required",
        "pi_price":           None,
        "usd_price":          None,
        "duration_s":         FREE_SESSION_SECS,
        "diagnoses_per_day":  10,
        "fix_pr":             False,
        "k8s":                False,
        "mcp_tools":          3,
    },
    BillingPlan.PI_PAYGO: {
        "name":               "Pi Pay-as-you-go",
        "description":        "1 Pi per 4-hour session — flexible Pi utility",
        "pi_price":           1.0,
        "usd_price":          None,
        "duration_s":         4 * 3600,
        "diagnoses_per_day":  50,
        "fix_pr":             False,
        "k8s":                False,
        "mcp_tools":          5,
    },
    BillingPlan.PI_BASIC: {
        "name":               "Pi Basic",
        "description":        "5 Pi/month — 50 diagnoses/day, sovereign monitoring",
        "pi_price":           5.0,
        "usd_price":          None,
        "duration_s":         30 * 24 * 3600,
        "diagnoses_per_day":  50,
        "fix_pr":             False,
        "k8s":                False,
        "mcp_tools":          7,
    },
    BillingPlan.PI_PRO: {
        "name":               "Pi Pro",
        "description":        "20 Pi/month — unlimited diagnoses, GitHub PR delivery, K8s",
        "pi_price":           20.0,
        "usd_price":          None,
        "duration_s":         30 * 24 * 3600,
        "diagnoses_per_day":  -1,
        "fix_pr":             True,
        "k8s":                True,
        "mcp_tools":          10,
    },
    BillingPlan.PI_ENTERPRISE: {
        "name":               "Pi Enterprise",
        "description":        "100 Pi/month — white-label, dedicated support, Grok-3 priority",
        "pi_price":           100.0,
        "usd_price":          None,
        "duration_s":         30 * 24 * 3600,
        "diagnoses_per_day":  -1,
        "fix_pr":             True,
        "k8s":                True,
        "mcp_tools":          10,
    },
    BillingPlan.USD_PAYGO: {
        "name":               "USD Pay-as-you-go",
        "description":        "$0.99 per 4-hour session — card, UPI, PIX, SEPA, M-Pesa & more",
        "pi_price":           None,
        "usd_price":          0.99,
        "duration_s":         4 * 3600,
        "diagnoses_per_day":  50,
        "fix_pr":             False,
        "k8s":                False,
        "mcp_tools":          5,
    },
    BillingPlan.USD_BASIC: {
        "name":               "USD Basic",
        "description":        "$9.99/month — 50 diagnoses/day, global payment methods",
        "pi_price":           None,
        "usd_price":          9.99,
        "duration_s":         30 * 24 * 3600,
        "diagnoses_per_day":  50,
        "fix_pr":             False,
        "k8s":                False,
        "mcp_tools":          7,
    },
    BillingPlan.USD_PRO: {
        "name":               "USD Pro",
        "description":        "$49.99/month — unlimited, PR delivery, K8s, all regions",
        "pi_price":           None,
        "usd_price":          49.99,
        "duration_s":         30 * 24 * 3600,
        "diagnoses_per_day":  -1,
        "fix_pr":             True,
        "k8s":                True,
        "mcp_tools":          10,
    },
    BillingPlan.USD_ENTERPRISE: {
        "name":               "USD Enterprise",
        "description":        "$199.99/month — white-label, dedicated, Grok-3, SLA",
        "pi_price":           None,
        "usd_price":          199.99,
        "duration_s":         30 * 24 * 3600,
        "diagnoses_per_day":  -1,
        "fix_pr":             True,
        "k8s":                True,
        "mcp_tools":          10,
    },
}

# Regional Stripe payment methods (auto-selected based on caller's region code)
REGIONAL_METHODS: Dict[str, List[str]] = {
    "global": ["card", "link"],
    "US":     ["card", "link", "us_bank_account"],
    "EU":     ["card", "sepa_debit", "ideal", "bancontact", "sofort"],
    "UK":     ["card", "bacs_debit"],
    "IN":     ["card", "upi"],
    "BR":     ["card", "boleto", "pix"],
    "MX":     ["card", "oxxo"],
    "AU":     ["card", "au_becs_debit"],
    "SG":     ["card", "grabpay", "paynow"],
    "MY":     ["card", "grabpay", "fpx"],
    "NG":     ["card"],
    "KE":     ["card"],
    "ZA":     ["card"],
    "JP":     ["card", "konbini"],
    "KR":     ["card"],
}


# ── data models ───────────────────────────────────────────────────────────────

@dataclass
class SAIBSession:
    session_token:   str
    client_id:       str           # tenant_id, user_id, or anonymous UUID
    ip:              str
    created_at:      float = field(default_factory=time.time)
    free_expires_at: float = 0.0
    paid_expires_at: float = 0.0
    plan:            BillingPlan = BillingPlan.FREE_SESSION
    pi_uid:          Optional[str] = None
    total_paid_pi:   float = 0.0
    total_paid_usd:  float = 0.0
    payment_ids:     List[str] = field(default_factory=list)


@dataclass
class PaymentRecord:
    payment_id:        str
    session_token:     str
    client_id:         str
    amount:            float
    currency:          str           # "PI" or "USD"
    plan:              BillingPlan
    method:            str           # "pi" | "stripe_card" | "stripe_upi" | etc.
    status:            str           # pending | completed | failed | refunded
    txid:              Optional[str] = None
    stripe_session_id: Optional[str] = None
    founder_split:     float = 0.0
    founder_paid:      bool  = False
    region:            str   = "global"
    created_at:        float = field(default_factory=time.time)
    completed_at:      Optional[float] = None


@dataclass
class FounderLedgerEntry:
    entry_id:   str
    payment_id: str
    amount:     float
    currency:   str            # "PI" or "USD"
    split_pct:  float
    status:     str            # pending | sent | tracked
    pi_txid:    Optional[str] = None
    created_at: float         = field(default_factory=time.time)


# ── billing engine ────────────────────────────────────────────────────────────

class SAIBBillingEngine:
    """
    Core SAIB monetization engine for Triumph Synergy.

    • 30-minute free session gate — every new client gets 30 min gratis
    • Pi Network mainnet payments — real on-chain transactions, real utility
    • USD payments via Stripe — global + regional methods (15+ countries)
    • Founder revenue split — 15% of every payment to founder wallet
    • Immutable payment + founder ledger — persisted to /tmp/saib_billing.json
    """

    def __init__(self) -> None:
        self._sessions:       Dict[str, SAIBSession]    = {}
        self._payments:       Dict[str, PaymentRecord]  = {}
        self._founder_ledger: List[FounderLedgerEntry]  = []
        self._pi:             Any = None   # PiPaymentProcessor — injected via boot()
        self._stripe_ok:      bool = False
        self._load_persisted()
        log.info(
            "SAIBBillingEngine: online (free_session=%ds founder_split=%.0f%% stripe=%s)",
            FREE_SESSION_SECS, FOUNDER_SPLIT_PCT, "READY" if STRIPE_SECRET_KEY else "NOT_SET",
        )

    def boot(self, pi_processor: Any) -> None:
        """Inject dependencies. Called from app lifespan after all engines are up."""
        self._pi = pi_processor
        if STRIPE_SECRET_KEY:
            try:
                import stripe as _s  # type: ignore
                _s.api_key   = STRIPE_SECRET_KEY
                self._stripe_ok = True
                log.info("SAIBBillingEngine: Stripe configured")
            except ImportError:
                log.warning("SAIBBillingEngine: stripe package missing — pip install stripe>=7.0.0")

    # ── session management ────────────────────────────────────────────────────

    def start_session(
        self,
        client_id: str,
        ip:        str,
        pi_uid:    Optional[str] = None,
    ) -> SAIBSession:
        """
        Create or return an existing active session for a client.
        Every new client gets FREE_SESSION_SECS (30 min) of free access.
        """
        # Return existing active session for this client
        for sess in self._sessions.values():
            if sess.client_id == client_id:
                state = self._state(sess)
                if state in (SessionState.FREE_ACTIVE, SessionState.PAID_ACTIVE):
                    return sess

        # Enforce session cap
        if len(self._sessions) >= MAX_SESSIONS:
            self._evict_expired()

        token = secrets.token_urlsafe(32)
        now   = time.time()
        sess  = SAIBSession(
            session_token   = token,
            client_id       = client_id,
            ip              = ip,
            created_at      = now,
            free_expires_at = now + FREE_SESSION_SECS,
            pi_uid          = pi_uid,
        )
        self._sessions[token] = sess
        log.info("SAIB session started: client=%s free=%ds ip=%s", client_id[:16], FREE_SESSION_SECS, ip)
        return sess

    def validate_session(self, token: str) -> Tuple[SessionState, Optional[SAIBSession]]:
        sess = self._sessions.get(token)
        if not sess:
            return SessionState.INVALID, None
        return self._state(sess), sess

    def check_access(self, token: str) -> Tuple[bool, str]:
        """
        Returns (allowed: bool, reason: str).
        Reason is human-readable and carries session state details.
        """
        state, sess = self.validate_session(token)
        if sess is None:
            return False, "invalid_session"
        now = time.time()
        if state == SessionState.FREE_ACTIVE:
            remaining = int(sess.free_expires_at - now)
            return True, f"free_session:{remaining}s_remaining"
        if state == SessionState.PAID_ACTIVE:
            remaining = int(sess.paid_expires_at - now)
            return True, f"paid:{sess.plan.value}:{remaining}s_remaining"
        if state == SessionState.FREE_EXPIRED:
            return False, "free_session_expired"
        if state == SessionState.PAID_EXPIRED:
            return False, "subscription_expired"
        return False, "invalid_session"

    def _state(self, sess: SAIBSession) -> SessionState:
        now = time.time()
        if sess.paid_expires_at > now:
            return SessionState.PAID_ACTIVE
        if sess.free_expires_at > now:
            return SessionState.FREE_ACTIVE
        if sess.paid_expires_at > 0:
            return SessionState.PAID_EXPIRED
        return SessionState.FREE_EXPIRED

    def _evict_expired(self) -> None:
        expired = [
            t for t, s in self._sessions.items()
            if self._state(s) in (SessionState.FREE_EXPIRED, SessionState.PAID_EXPIRED)
        ]
        for t in expired[:1000]:
            del self._sessions[t]

    # ── Pi payment flow ───────────────────────────────────────────────────────

    async def initiate_pi_payment(
        self,
        session_token: str,
        plan:          BillingPlan,
    ) -> Dict[str, Any]:
        """
        Create a Pi payment for the given plan.
        Returns data to forward to Pi.createPayment() in the Pi SDK frontend.
        """
        sess = self._sessions.get(session_token)
        if not sess:
            raise ValueError("invalid_session_token")
        catalog = PLAN_CATALOG.get(plan)
        if not catalog or catalog["pi_price"] is None:
            raise ValueError(f"plan {plan.value} has no Pi price")

        amount = float(catalog["pi_price"])
        memo   = f"SAIB {catalog['name']} — Triumph Synergy (mainnet)"

        pi_pd = await self._pi.create_payment(
            client_uid = sess.pi_uid or sess.client_id,
            amount     = amount,
            memo       = memo,
            metadata   = {
                "session_prefix": session_token[:8],
                "plan":           plan.value,
                "client_prefix":  sess.client_id[:12],
                "network":        "mainnet",
            },
        )

        rec = PaymentRecord(
            payment_id    = pi_pd.payment_id,
            session_token = session_token,
            client_id     = sess.client_id,
            amount        = amount,
            currency      = "PI",
            plan          = plan,
            method        = "pi",
            status        = "pending",
            founder_split = pi_pd.founder_split,
        )
        self._payments[pi_pd.payment_id] = rec

        return {
            "payment_id":   pi_pd.payment_id,
            "amount":       amount,
            "memo":         memo,
            "pi_network":   "mainnet",
            "founder_split": pi_pd.founder_split,
            "instructions": (
                "Pass payment_id to Pi.createPayment() on your Pi Browser frontend. "
                "On approval call /billing/pi/approve, on completion call /billing/pi/complete."
            ),
        }

    async def approve_pi_payment(self, payment_id: str) -> bool:
        """Approve a Pi payment. Called from /billing/pi/approve."""
        return await self._pi.approve_payment(payment_id)

    async def complete_pi_payment(
        self,
        payment_id: str,
        txid:       str,
    ) -> Optional[PaymentRecord]:
        """
        Complete a Pi payment after blockchain confirmation.
        Activates the subscriber's session and records founder split.
        """
        pi_pd = await self._pi.complete_payment(payment_id, txid)
        if not pi_pd or pi_pd.status not in ("completed", "simulated"):
            log.warning("Pi payment completion failed: %s txid=%s", payment_id, txid)
            return None

        rec = self._payments.get(payment_id)
        if not rec:
            log.warning("Pi payment %s not in billing ledger", payment_id)
            return None

        rec.status       = "completed"
        rec.txid         = txid
        rec.completed_at = time.time()
        rec.founder_paid = bool(pi_pd.founder_split_txid)

        self._founder_ledger.append(FounderLedgerEntry(
            entry_id   = str(uuid.uuid4()),
            payment_id = payment_id,
            amount     = rec.founder_split,
            currency   = "PI",
            split_pct  = FOUNDER_SPLIT_PCT,
            status     = "sent" if pi_pd.founder_split_txid else "pending",
            pi_txid    = pi_pd.founder_split_txid,
        ))

        sess = self._sessions.get(rec.session_token)
        if sess:
            self._upgrade_session(sess, rec.plan, rec.amount, "PI")
            sess.payment_ids.append(payment_id)

        self._persist()
        log.info(
            "Pi payment complete: %.4f Pi plan=%s founder=%.6f Pi",
            rec.amount, rec.plan.value, rec.founder_split,
        )
        return rec

    # ── USD/Stripe payment flow ───────────────────────────────────────────────

    async def create_stripe_session(
        self,
        session_token: str,
        plan:          BillingPlan,
        region:        str = "global",
        success_url:   Optional[str] = None,
        cancel_url:    Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Create a Stripe Checkout session for the given plan.
        Automatically selects regional payment methods based on region code.
        Returns Stripe checkout URL.
        """
        if not self._stripe_ok:
            return {
                "error":   "stripe_not_configured",
                "message": "USD payments unavailable — STRIPE_SECRET_KEY not set",
            }

        sess = self._sessions.get(session_token)
        if not sess:
            raise ValueError("invalid_session_token")

        catalog = PLAN_CATALOG.get(plan)
        if not catalog or catalog["usd_price"] is None:
            raise ValueError(f"plan {plan.value} has no USD price")

        usd_price       = float(catalog["usd_price"])
        usd_cents       = int(usd_price * 100)
        region_upper    = region.upper()
        pay_methods     = REGIONAL_METHODS.get(region_upper, REGIONAL_METHODS["global"])
        is_subscription = catalog["duration_s"] == 30 * 24 * 3600
        founder_usd     = round(usd_price * FOUNDER_SPLIT_PCT / 100, 4)
        s_url           = success_url or f"{SAIB_BASE_URL}/billing/success?session={session_token[:16]}&cid={{CHECKOUT_SESSION_ID}}"
        c_url           = cancel_url  or f"{SAIB_BASE_URL}/billing/cancel"

        try:
            import stripe as _s  # type: ignore
            meta = {
                "saib_session": session_token[:16],
                "plan":         plan.value,
                "client_id":    sess.client_id[:16],
                "region":       region_upper,
            }

            if is_subscription:
                price = _s.Price.create(
                    unit_amount  = usd_cents,
                    currency     = "usd",
                    recurring    = {"interval": "month"},
                    product_data = {"name": f"SAIB {catalog['name']}"},
                )
                checkout = _s.checkout.Session.create(
                    payment_method_types = pay_methods,
                    mode                 = "subscription",
                    line_items           = [{"price": price.id, "quantity": 1}],
                    success_url          = s_url,
                    cancel_url           = c_url,
                    metadata             = meta,
                )
            else:
                checkout = _s.checkout.Session.create(
                    payment_method_types = pay_methods,
                    mode                 = "payment",
                    line_items           = [{
                        "price_data": {
                            "currency":     "usd",
                            "unit_amount":  usd_cents,
                            "product_data": {"name": f"SAIB {catalog['name']}"},
                        },
                        "quantity": 1,
                    }],
                    success_url = s_url,
                    cancel_url  = c_url,
                    metadata    = meta,
                )

            rec = PaymentRecord(
                payment_id        = checkout.id,
                session_token     = session_token,
                client_id         = sess.client_id,
                amount            = usd_price,
                currency          = "USD",
                plan              = plan,
                method            = f"stripe_{pay_methods[0]}",
                status            = "pending",
                stripe_session_id = checkout.id,
                founder_split     = founder_usd,
                region            = region_upper,
            )
            self._payments[checkout.id] = rec

            return {
                "checkout_url":    checkout.url,
                "session_id":      checkout.id,
                "amount_usd":      usd_price,
                "plan":            plan.value,
                "region":          region_upper,
                "payment_methods": pay_methods,
                "founder_split":   founder_usd,
            }

        except Exception as exc:
            log.error("Stripe session creation failed: %s", exc)
            return {"error": "stripe_error", "message": str(exc)[:200]}

    def process_stripe_webhook(
        self,
        payload:    bytes,
        sig_header: str,
    ) -> Optional[PaymentRecord]:
        """
        Validate and process a Stripe webhook event.
        Activates session on checkout.session.completed or payment_intent.succeeded.
        """
        if not self._stripe_ok or not STRIPE_WEBHOOK_SECRET:
            return None

        try:
            import stripe as _s  # type: ignore
            event = _s.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
        except Exception as exc:
            log.warning("Stripe webhook validation failed: %s", exc)
            return None

        evt_type = event.get("type", "")
        if evt_type not in ("checkout.session.completed", "payment_intent.succeeded"):
            return None

        obj        = event["data"]["object"]
        session_id = obj.get("id", "")
        meta       = obj.get("metadata", {})
        amount_usd = obj.get("amount_total", 0) / 100.0
        plan_str   = meta.get("plan", "")
        sess_prefix = meta.get("saib_session", "")

        try:
            plan = BillingPlan(plan_str)
        except ValueError:
            log.warning("Unknown plan in Stripe webhook: %s", plan_str)
            return None

        rec = self._payments.get(session_id)
        if not rec:
            rec = PaymentRecord(
                payment_id    = session_id,
                session_token = sess_prefix,
                client_id     = meta.get("client_id", ""),
                amount        = amount_usd,
                currency      = "USD",
                plan          = plan,
                method        = "stripe",
                status        = "pending",
                founder_split = round(amount_usd * FOUNDER_SPLIT_PCT / 100, 4),
                region        = meta.get("region", "global"),
            )
            self._payments[session_id] = rec

        rec.status       = "completed"
        rec.completed_at = time.time()

        self._founder_ledger.append(FounderLedgerEntry(
            entry_id   = str(uuid.uuid4()),
            payment_id = session_id,
            amount     = rec.founder_split,
            currency   = "USD",
            split_pct  = FOUNDER_SPLIT_PCT,
            status     = "tracked",   # Transferred manually or via Stripe Connect
        ))

        # Match session by prefix stored in metadata
        client_prefix = meta.get("client_id", "")[:16]
        for token, sess in self._sessions.items():
            if (
                token.startswith(sess_prefix)
                or sess.client_id[:16] == client_prefix
            ):
                self._upgrade_session(sess, plan, amount_usd, "USD")
                rec.session_token = token
                sess.payment_ids.append(session_id)
                break

        self._persist()
        log.info(
            "Stripe payment complete: $%.2f plan=%s founder=$%.4f region=%s",
            amount_usd, plan_str, rec.founder_split, rec.region,
        )
        return rec

    # ── session upgrade ───────────────────────────────────────────────────────

    def _upgrade_session(
        self,
        sess:     SAIBSession,
        plan:     BillingPlan,
        amount:   float,
        currency: str,
    ) -> None:
        """Extend session paid_expires_at by plan duration. Stacks on renewal."""
        catalog  = PLAN_CATALOG[plan]
        duration = catalog["duration_s"]
        now      = time.time()
        current  = max(sess.paid_expires_at, now)
        sess.paid_expires_at = current + duration
        sess.plan = plan
        if currency == "PI":
            sess.total_paid_pi  += amount
        else:
            sess.total_paid_usd += amount
        log.info(
            "Session %s upgraded: plan=%s +%dh expires_at=+%ds",
            sess.session_token[:8], plan.value,
            duration // 3600, int(sess.paid_expires_at - now),
        )

    # ── stats & dashboards ────────────────────────────────────────────────────

    def founder_stats(self) -> dict:
        """Founder revenue dashboard — Pi owed/sent + USD tracked."""
        pi_entries  = [e for e in self._founder_ledger if e.currency == "PI"]
        usd_entries = [e for e in self._founder_ledger if e.currency == "USD"]
        completed   = [p for p in self._payments.values() if p.status == "completed"]
        return {
            "founder_wallet":      (FOUNDER_WALLET[:8] + "...") if FOUNDER_WALLET else "NOT_SET",
            "founder_usd_email":   FOUNDER_USD_EMAIL or "NOT_SET",
            "split_pct":           FOUNDER_SPLIT_PCT,
            "pi": {
                "total_owed":  round(sum(e.amount for e in pi_entries), 6),
                "total_sent":  round(sum(e.amount for e in pi_entries if e.status == "sent"), 6),
                "pending":     round(sum(e.amount for e in pi_entries if e.status == "pending"), 6),
                "entry_count": len(pi_entries),
            },
            "usd": {
                "total_owed":    round(sum(e.amount for e in usd_entries), 4),
                "total_tracked": round(sum(e.amount for e in usd_entries if e.status == "tracked"), 4),
                "pending":       round(sum(e.amount for e in usd_entries if e.status == "pending"), 4),
                "entry_count":   len(usd_entries),
            },
            "saib_net_revenue": {
                "pi":  round(sum(p.amount - p.founder_split for p in completed if p.currency == "PI"), 6),
                "usd": round(sum(p.amount - p.founder_split for p in completed if p.currency == "USD"), 4),
            },
            "total_gross_revenue": {
                "pi":  round(sum(p.amount for p in completed if p.currency == "PI"), 6),
                "usd": round(sum(p.amount for p in completed if p.currency == "USD"), 4),
            },
            "recent_entries": [
                {
                    "entry_id": e.entry_id[:8], "amount": e.amount,
                    "currency": e.currency,     "status": e.status,
                    "created":  int(e.created_at),
                }
                for e in self._founder_ledger[-20:]
            ],
        }

    def stats(self) -> dict:
        active  = sum(1 for s in self._sessions.values() if self._state(s) in (SessionState.FREE_ACTIVE, SessionState.PAID_ACTIVE))
        paid    = sum(1 for s in self._sessions.values() if self._state(s) == SessionState.PAID_ACTIVE)
        done    = [p for p in self._payments.values() if p.status == "completed"]
        return {
            "sessions_total":     len(self._sessions),
            "sessions_active":    active,
            "sessions_paid":      paid,
            "payments_total":     len(self._payments),
            "payments_completed": len(done),
            "total_revenue_pi":   round(sum(p.amount for p in done if p.currency == "PI"), 6),
            "total_revenue_usd":  round(sum(p.amount for p in done if p.currency == "USD"), 4),
            "stripe_available":   self._stripe_ok,
            "free_session_secs":  FREE_SESSION_SECS,
            "founder_split_pct":  FOUNDER_SPLIT_PCT,
        }

    def list_plans(self) -> List[dict]:
        return [
            {"plan": plan.value, **catalog}
            for plan, catalog in PLAN_CATALOG.items()
            if plan != BillingPlan.FREE_SESSION
        ]

    def list_plans_brief(self) -> List[dict]:
        return [
            {
                "plan": plan.value,
                "name": catalog["name"],
                "pi_price": catalog["pi_price"],
                "usd_price": catalog["usd_price"],
            }
            for plan, catalog in PLAN_CATALOG.items()
            if plan != BillingPlan.FREE_SESSION
        ]

    # ── persistence ───────────────────────────────────────────────────────────

    def _persist(self) -> None:
        try:
            data = {
                "payments": [
                    {
                        "payment_id":    r.payment_id,
                        "client_id":     r.client_id,
                        "amount":        r.amount,
                        "currency":      r.currency,
                        "plan":          r.plan.value,
                        "method":        r.method,
                        "status":        r.status,
                        "txid":          r.txid,
                        "founder_split": r.founder_split,
                        "founder_paid":  r.founder_paid,
                        "completed_at":  r.completed_at,
                        "region":        r.region,
                    }
                    for r in self._payments.values()
                ],
                "founder_ledger": [
                    {
                        "entry_id":   e.entry_id,
                        "payment_id": e.payment_id,
                        "amount":     e.amount,
                        "currency":   e.currency,
                        "split_pct":  e.split_pct,
                        "status":     e.status,
                        "pi_txid":    e.pi_txid,
                        "created_at": e.created_at,
                    }
                    for e in self._founder_ledger
                ],
            }
            with open(BILLING_DATA_FILE, "w") as fh:
                json.dump(data, fh)
        except Exception as exc:
            log.debug("Billing persist failed (non-fatal): %s", exc)

    def _load_persisted(self) -> None:
        try:
            with open(BILLING_DATA_FILE) as fh:
                data = json.load(fh)
            for r in data.get("payments", []):
                try:
                    self._payments[r["payment_id"]] = PaymentRecord(
                        payment_id    = r["payment_id"],
                        session_token = "",
                        client_id     = r["client_id"],
                        amount        = r["amount"],
                        currency      = r["currency"],
                        plan          = BillingPlan(r["plan"]),
                        method        = r["method"],
                        status        = r["status"],
                        txid          = r.get("txid"),
                        founder_split = r.get("founder_split", 0.0),
                        founder_paid  = r.get("founder_paid", False),
                        completed_at  = r.get("completed_at"),
                        region        = r.get("region", "global"),
                    )
                except Exception:
                    pass
            for e in data.get("founder_ledger", []):
                try:
                    self._founder_ledger.append(FounderLedgerEntry(
                        entry_id   = e["entry_id"],
                        payment_id = e["payment_id"],
                        amount     = e["amount"],
                        currency   = e["currency"],
                        split_pct  = e["split_pct"],
                        status     = e["status"],
                        pi_txid    = e.get("pi_txid"),
                        created_at = e["created_at"],
                    ))
                except Exception:
                    pass
            log.info(
                "Billing: loaded %d payments, %d founder ledger entries",
                len(self._payments), len(self._founder_ledger),
            )
        except FileNotFoundError:
            pass
        except Exception as exc:
            log.warning("Billing load failed (non-fatal): %s", exc)


# ── singleton ─────────────────────────────────────────────────────────────────
billing_engine = SAIBBillingEngine()
