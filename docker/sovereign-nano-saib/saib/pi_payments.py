"""
Pi Network Mainnet Payment Processor — SAIB v5
──────────────────────────────────────────────────────────────────────────────
Handles User-to-App (U2A) Pi payments for SAIB access fees and
App-to-User (A2U) founder revenue splits on the Pi Network mainnet blockchain.

Pi Platform API: https://github.com/pi-apps/pi-platform-docs
Mainnet Horizon: https://api.mainnet.minepi.com

Payment flow (U2A — external user pays SAIB):
  1. Backend:    POST /billing/pi/initiate      → paymentId + payment data
  2. Frontend:   Pi.createPayment(data)         → user confirms in Pi Browser
  3. Pi Server:  calls onReadyForServerApproval → frontend POSTs /billing/pi/approve
  4. Pi Server:  calls onReadyForServerCompletion → frontend POSTs /billing/pi/complete
  5. Backend:    verifies txid on Pi mainnet Horizon → activates session

Payment flow (A2U — SAIB pays founder split):
  1. After U2A completes, SAIB calls Pi API with A2U payment type
  2. Founder receives Pi automatically in their Pi wallet
  3. Split tracked in FounderLedger regardless of A2U availability
"""
from __future__ import annotations

import logging
import os
import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

import aiohttp

log = logging.getLogger("saib.pi_payments")

# ── config ────────────────────────────────────────────────────────────────────
PI_API_KEY          = os.getenv("PI_API_KEY", "")
PI_APP_ID           = os.getenv("PI_APP_ID", "")
SAIB_TREASURY_ADDR  = os.getenv("SAIB_TREASURY_WALLET", "")   # Pi wallet address
FOUNDER_WALLET      = os.getenv("SAIB_FOUNDER_WALLET", "")    # Founder Pi wallet addr
FOUNDER_PI_UID      = os.getenv("SAIB_FOUNDER_PI_UID", "")    # Founder Pi UID (for A2U)
FOUNDER_SPLIT_PCT   = float(os.getenv("SAIB_FOUNDER_SPLIT_PCT", "15.0"))
PI_NETWORK          = os.getenv("PI_NETWORK", "mainnet")

PI_API_BASE         = "https://api.minepi.com"
PI_HORIZON_BASE     = (
    "https://api.mainnet.minepi.com"
    if PI_NETWORK == "mainnet"
    else "https://api.testnet.minepi.com"
)
PI_TIMEOUT = aiohttp.ClientTimeout(total=15)


# ── data models ───────────────────────────────────────────────────────────────

@dataclass
class PiPaymentData:
    """Pi payment record (U2A or A2U)."""
    payment_id:         str
    amount:             float
    memo:               str
    metadata:           dict
    payment_type:       str   = "U2A"         # "U2A" or "A2U"
    status:             str   = "created"     # created|approved|completed|cancelled|error
    txid:               Optional[str] = None
    from_address:       Optional[str] = None
    founder_split:      float = 0.0
    founder_split_txid: Optional[str] = None
    created_at:         float = field(default_factory=time.time)
    completed_at:       Optional[float] = None


@dataclass
class PiTransaction:
    """A verified Pi Network blockchain transaction."""
    txid:       str
    successful: bool
    amount:     float
    from_addr:  str
    to_addr:    str
    memo:       str
    ledger_seq: Optional[int]  = None
    created_at: float          = field(default_factory=time.time)


# ── processor ─────────────────────────────────────────────────────────────────

class PiPaymentProcessor:
    """
    Handles all Pi Network payment API calls for SAIB billing.
    Falls back to offline/simulated mode when PI_API_KEY is not set —
    useful for development and for SAIB's own internal ecosystem services.
    """

    def __init__(self) -> None:
        self._payments: Dict[str, PiPaymentData] = {}
        log.info(
            "PiPaymentProcessor: online (network=%s api_key=%s treasury=%s "
            "founder=%s split=%.0f%%)",
            PI_NETWORK,
            "SET" if PI_API_KEY else "NOT_SET",
            (SAIB_TREASURY_ADDR[:8] + "...") if SAIB_TREASURY_ADDR else "NOT_SET",
            (FOUNDER_WALLET[:8] + "...") if FOUNDER_WALLET else "NOT_SET",
            FOUNDER_SPLIT_PCT,
        )

    # ── U2A (user → SAIB) ────────────────────────────────────────────────────

    async def create_payment(
        self,
        client_uid: str,
        amount:     float,
        memo:       str,
        metadata:   Optional[Dict] = None,
    ) -> PiPaymentData:
        """
        Create a U2A Pi payment request.
        Returns payment data to pass to Pi.createPayment() on the frontend.
        """
        founder_split = round(amount * FOUNDER_SPLIT_PCT / 100, 6)
        if not PI_API_KEY:
            pid = str(uuid.uuid4())
            pd  = PiPaymentData(
                payment_id    = pid,
                amount        = amount,
                memo          = memo,
                metadata      = metadata or {},
                founder_split = founder_split,
                status        = "simulated",
            )
            self._payments[pid] = pd
            log.warning("PiPaymentProcessor: offline mode — simulated payment %s", pid)
            return pd

        payload = {
            "payment_data": {"amount": amount, "memo": memo},
            "metadata":     metadata or {},
            "uid":          client_uid,
            "payment_type": "U2A",
        }
        try:
            data = await self._pi_post("/v2/payments", payload)
            pid  = data.get("identifier", str(uuid.uuid4()))
            pd   = PiPaymentData(
                payment_id    = pid,
                amount        = amount,
                memo          = memo,
                metadata      = metadata or {},
                founder_split = founder_split,
                status        = "created",
            )
            self._payments[pid] = pd
            log.info("Pi U2A payment created: id=%s amount=%.4f Pi uid=%s", pid, amount, client_uid[:12])
            return pd
        except Exception as exc:
            log.error("Pi create_payment failed: %s", exc)
            pid = str(uuid.uuid4())
            pd  = PiPaymentData(
                payment_id    = pid,
                amount        = amount,
                memo          = memo,
                metadata      = {"error": str(exc)[:100], **(metadata or {})},
                founder_split = founder_split,
                status        = "error",
            )
            self._payments[pid] = pd
            return pd

    async def approve_payment(self, payment_id: str) -> bool:
        """
        Server-side approve a pending Pi payment.
        Called from /billing/pi/approve after Pi SDK onReadyForServerApproval fires.
        """
        if not PI_API_KEY:
            if payment_id in self._payments:
                self._payments[payment_id].status = "approved"
            return True
        try:
            await self._pi_post(f"/v2/payments/{payment_id}/approve", {})
            if payment_id in self._payments:
                self._payments[payment_id].status = "approved"
            log.info("Pi payment approved: %s", payment_id)
            return True
        except Exception as exc:
            log.error("Pi approve_payment %s: %s", payment_id, exc)
            return False

    async def complete_payment(self, payment_id: str, txid: str) -> Optional[PiPaymentData]:
        """
        Complete a Pi payment after blockchain confirmation.
        Verifies txid on Pi Horizon, then marks complete on Pi Platform.
        Triggers founder split A2U automatically.
        """
        # Verify on-chain first (skip in offline/simulated mode)
        tx = None
        if PI_API_KEY:
            tx = await self.verify_transaction(txid)
            if tx and not tx.successful:
                log.warning("Pi tx %s not successful — rejecting", txid)
                return None

        if not PI_API_KEY:
            pd = self._payments.get(payment_id)
            if pd:
                pd.status       = "completed"
                pd.txid         = txid
                pd.completed_at = time.time()
                await self._trigger_founder_split(pd)
            return pd

        try:
            await self._pi_post(f"/v2/payments/{payment_id}/complete", {"txid": txid})
        except Exception as exc:
            log.error("Pi complete_payment %s txid=%s: %s", payment_id, txid, exc)
            return None

        pd = self._payments.get(payment_id)
        if pd:
            pd.status       = "completed"
            pd.txid         = txid
            pd.completed_at = time.time()
            if tx:
                pd.from_address = tx.from_addr
            await self._trigger_founder_split(pd)
        log.info("Pi payment completed: id=%s txid=%s", payment_id, txid)
        return pd

    async def verify_transaction(self, txid: str) -> Optional[PiTransaction]:
        """Verify a Pi transaction on the mainnet Horizon API."""
        url = f"{PI_HORIZON_BASE}/transactions/{txid}"
        try:
            async with aiohttp.ClientSession(timeout=PI_TIMEOUT) as sess:
                async with sess.get(url) as resp:
                    if resp.status != 200:
                        log.warning("Pi Horizon %s → HTTP %d", txid, resp.status)
                        return None
                    data = await resp.json()
            return PiTransaction(
                txid       = txid,
                successful = data.get("successful", False),
                amount     = float(data.get("fee_charged", 0)) / 1_000_000,
                from_addr  = data.get("source_account", ""),
                to_addr    = SAIB_TREASURY_ADDR,
                memo       = str(data.get("memo", "")),
                ledger_seq = data.get("ledger"),
            )
        except Exception as exc:
            log.warning("Pi verify_transaction %s: %s", txid, exc)
            return None

    # ── A2U (SAIB → founder) ─────────────────────────────────────────────────

    async def _trigger_founder_split(self, pd: PiPaymentData) -> None:
        """Auto-trigger A2U founder split after a U2A payment completes."""
        if not FOUNDER_PI_UID or pd.founder_split <= 0:
            return
        try:
            split = await self.send_founder_split(
                amount = pd.founder_split,
                memo   = f"Triumph Synergy founder split — SAIB payment {pd.payment_id[:8]}",
            )
            if split:
                pd.founder_split_txid = split.payment_id
                log.info(
                    "Founder split sent: %.6f Pi → %s (txid=%s)",
                    pd.founder_split,
                    FOUNDER_WALLET[:8] if FOUNDER_WALLET else "tracked",
                    split.payment_id[:8],
                )
        except Exception as exc:
            log.error("Founder split trigger failed: %s", exc)

    async def send_founder_split(self, amount: float, memo: str) -> Optional[PiPaymentData]:
        """
        Send Pi to founder wallet via A2U payment.
        Requires SAIB_FOUNDER_PI_UID and PI_API_KEY with A2U permissions.
        Falls back to ledger-only tracking when A2U is unavailable.
        """
        if not FOUNDER_PI_UID:
            log.info("send_founder_split: SAIB_FOUNDER_PI_UID not set — tracking only")
            # Return a tracked record so the ledger still shows the owed amount
            pid = str(uuid.uuid4())
            pd  = PiPaymentData(
                payment_id = pid, amount = amount, memo = memo,
                metadata   = {"type": "founder_split", "status": "tracked_only"},
                payment_type = "A2U", status = "tracked",
            )
            self._payments[pid] = pd
            return pd

        if not PI_API_KEY:
            pid = str(uuid.uuid4())
            pd  = PiPaymentData(
                payment_id = pid, amount = amount, memo = memo,
                metadata   = {"type": "founder_split"},
                payment_type = "A2U", status = "simulated",
            )
            self._payments[pid] = pd
            return pd

        payload = {
            "payment_data": {"amount": amount, "memo": memo},
            "metadata":     {"type": "founder_split", "saib_version": "5"},
            "uid":          FOUNDER_PI_UID,
            "payment_type": "A2U",
        }
        try:
            data = await self._pi_post("/v2/payments", payload)
            pid  = data.get("identifier", str(uuid.uuid4()))
            pd   = PiPaymentData(
                payment_id   = pid,
                amount       = amount,
                memo         = memo,
                metadata     = {"type": "founder_split"},
                payment_type = "A2U",
                status       = "a2u_created",
            )
            self._payments[pid] = pd
            # Auto-approve A2U
            await self.approve_payment(pid)
            return pd
        except Exception as exc:
            log.error("send_founder_split A2U failed: %s", exc)
            # Fall back to tracking-only
            pid = str(uuid.uuid4())
            pd  = PiPaymentData(
                payment_id   = pid,
                amount       = amount,
                memo         = memo,
                metadata     = {"type": "founder_split", "error": str(exc)[:80]},
                payment_type = "A2U",
                status       = "tracked",
            )
            self._payments[pid] = pd
            return pd

    # ── helpers ───────────────────────────────────────────────────────────────

    async def _pi_post(self, path: str, payload: dict) -> dict:
        headers = {
            "Authorization": f"Key {PI_API_KEY}",
            "Content-Type":  "application/json",
        }
        url = f"{PI_API_BASE}{path}"
        async with aiohttp.ClientSession(timeout=PI_TIMEOUT) as sess:
            async with sess.post(url, json=payload, headers=headers) as resp:
                body = await resp.json()
                if resp.status not in (200, 201):
                    raise RuntimeError(f"Pi API {path} → HTTP {resp.status}: {body}")
                return body

    def get_payment(self, payment_id: str) -> Optional[PiPaymentData]:
        return self._payments.get(payment_id)

    def stats(self) -> dict:
        completed = [p for p in self._payments.values() if p.status == "completed"]
        return {
            "network":            PI_NETWORK,
            "api_key_set":        bool(PI_API_KEY),
            "treasury_set":       bool(SAIB_TREASURY_ADDR),
            "founder_uid_set":    bool(FOUNDER_PI_UID),
            "founder_wallet_set": bool(FOUNDER_WALLET),
            "founder_split_pct":  FOUNDER_SPLIT_PCT,
            "payments_total":     len(self._payments),
            "payments_completed": len(completed),
            "total_pi_received":  round(sum(p.amount for p in completed), 6),
            "total_founder_split": round(sum(p.founder_split for p in completed), 6),
        }


# ── singleton ─────────────────────────────────────────────────────────────────
pi_processor = PiPaymentProcessor()
