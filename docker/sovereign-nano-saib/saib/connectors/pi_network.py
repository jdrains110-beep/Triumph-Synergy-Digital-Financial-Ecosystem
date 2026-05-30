"""
Pi Network Connector — SAIB v3
──────────────────────────────────────────────────────────────────────────────
Provides live, authenticated reach into the Pi Network blockchain and payment
infrastructure. Polls continuously and auto-feeds intelligence + guardian +
enforcer with real signals derived from on-chain activity.

Capabilities
────────────
• Wallet monitor    — track balances and Δbalance velocity for watched addresses
• Transaction watch — stream confirmed / pending payments in real time
• Payment poller    — poll Pi App Platform payment status (approve / complete)
• Mempool anomaly   — flag suspiciously large or rapid outbound flows
• Network health    — Pi consensus / horizon health metrics
• Auto-signal       — every event is converted to an IntelSignal and pushed
                      into the live SovereignIntelligence + FounderGuardian
"""
from __future__ import annotations

import asyncio
import hashlib
import hmac
import logging
import os
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Dict, List, Optional

import httpx

log = logging.getLogger("saib.connector.pi_network")

# ─────────────────────────────────────────── environment / config ──
PI_API_KEY          = os.getenv("PI_API_KEY", "")
PI_API_BASE         = os.getenv("PI_API_BASE", "https://api.minepi.com")
PI_APP_ID           = os.getenv("PI_APP_ID", "triumph-synergy")
FOUNDER_WALLET      = os.getenv("FOUNDER_WALLET_ADDRESS", "")
WATCHED_WALLETS_RAW = os.getenv("WATCHED_WALLETS", "")     # comma-separated
POLL_INTERVAL_S     = float(os.getenv("PI_POLL_INTERVAL_S", "30"))
TX_VELOCITY_WINDOW  = float(os.getenv("PI_TX_VELOCITY_WINDOW_S", "300"))  # 5 min
TX_VELOCITY_THRESH  = float(os.getenv("PI_TX_VELOCITY_THRESH", "5"))       # per window

# ─────────────────────────────────────────── data models ──

class PiTxType(str, Enum):
    PAYMENT    = "payment"
    TRANSFER   = "transfer"
    MEMO       = "memo"
    UNKNOWN    = "unknown"


class PiTxStatus(str, Enum):
    PENDING    = "pending"
    COMPLETED  = "completed"
    CANCELLED  = "cancelled"
    FAILED     = "failed"


@dataclass
class PiTransaction:
    txid:        str
    tx_type:     PiTxType
    status:      PiTxStatus
    from_addr:   str
    to_addr:     str
    amount:      float
    memo:        str
    ts:          float = field(default_factory=time.time)
    raw:         dict  = field(default_factory=dict)


@dataclass
class WalletState:
    address:     str
    balance:     float = 0.0
    tx_count:    int   = 0
    last_update: float = 0.0
    recent_txs:  List[PiTransaction] = field(default_factory=list)

    # velocity ring (timestamps of outbound tx within window)
    _out_times:  List[float] = field(default_factory=list, repr=False)

    def record_outbound(self, ts: float) -> None:
        cutoff = ts - TX_VELOCITY_WINDOW
        self._out_times = [t for t in self._out_times if t >= cutoff]
        self._out_times.append(ts)

    @property
    def velocity(self) -> float:
        now = time.time()
        cutoff = now - TX_VELOCITY_WINDOW
        return len([t for t in self._out_times if t >= cutoff])


# ─────────────────────────────────────────── connector ──

class PiNetworkConnector:
    """
    Live Pi Network monitoring and transaction execution connector.
    Call `.start()` in the SAIB lifespan to activate background polling.
    """

    def __init__(self) -> None:
        self._wallets: Dict[str, WalletState] = {}
        self._known_txids: set[str] = set()
        self._payments_pending: Dict[str, dict] = {}   # payment_id → state

        # callbacks fired on new events — wire up after init
        self._on_tx_callbacks:   List[Callable[[PiTransaction], None]] = []
        self._on_balance_change: List[Callable[[WalletState, float], None]] = []
        self._on_payment_update: List[Callable[[dict], None]] = []

        self._client:  Optional[httpx.AsyncClient] = None
        self._running: bool = False
        self._last_network_health: dict = {}
        self._errors: int = 0
        self._polls:  int = 0

        # Pre-register known wallets from env
        if FOUNDER_WALLET:
            self._wallets[FOUNDER_WALLET] = WalletState(address=FOUNDER_WALLET)
        for addr in (a.strip() for a in WATCHED_WALLETS_RAW.split(",") if a.strip()):
            if addr not in self._wallets:
                self._wallets[addr] = WalletState(address=addr)

    # ── public API ────────────────────────────────────────────────────────

    def register_wallet(self, address: str) -> None:
        """Add a wallet to the watch list at runtime."""
        if address and address not in self._wallets:
            self._wallets[address] = WalletState(address=address)
            log.info("Pi connector: watching wallet %s", address)

    def on_transaction(self, cb: Callable[[PiTransaction], None]) -> None:
        self._on_tx_callbacks.append(cb)

    def on_balance_change(self, cb: Callable[[WalletState, float], None]) -> None:
        self._on_balance_change.append(cb)

    def on_payment_update(self, cb: Callable[[dict], None]) -> None:
        self._on_payment_update.append(cb)

    def start(self) -> None:
        """Spawn background polling tasks (call once in lifespan)."""
        if self._running:
            return
        self._running = True
        asyncio.create_task(self._wallet_poll_loop())
        asyncio.create_task(self._payment_poll_loop())
        asyncio.create_task(self._network_health_loop())
        log.info("Pi Network connector started — %d watched wallets", len(self._wallets))

    def stop(self) -> None:
        self._running = False

    # ── Pi App Platform payment actions ──────────────────────────────────

    async def approve_payment(self, payment_id: str) -> dict:
        """Approve a Pi payment (server-side step 1 of Pi App payment flow)."""
        return await self._pi_post(f"/v2/payments/{payment_id}/approve")

    async def complete_payment(self, payment_id: str, txid: str) -> dict:
        """Complete a Pi payment (server-side step 2 of Pi App payment flow)."""
        return await self._pi_post(
            f"/v2/payments/{payment_id}/complete",
            json={"txid": txid},
        )

    async def cancel_payment(self, payment_id: str) -> dict:
        return await self._pi_post(f"/v2/payments/{payment_id}/cancel")

    async def get_payment(self, payment_id: str) -> dict:
        return await self._pi_get(f"/v2/payments/{payment_id}")

    async def get_incomplete_payments(self) -> List[dict]:
        resp = await self._pi_get("/v2/payments?status=incomplete")
        return resp.get("data", [])

    # ── wallet / balance queries ──────────────────────────────────────────

    async def get_balance(self, address: str) -> float:
        data = await self._pi_get(f"/v2/accounts/{address}")
        return float(data.get("balances", [{}])[0].get("balance", 0.0))

    async def get_transactions(self, address: str, limit: int = 20) -> List[dict]:
        data = await self._pi_get(
            f"/v2/accounts/{address}/transactions?limit={limit}&order=desc"
        )
        return data.get("_embedded", {}).get("records", [])

    # ── stats ─────────────────────────────────────────────────────────────

    def stats(self) -> dict:
        return {
            "wallets_watched": len(self._wallets),
            "known_txids": len(self._known_txids),
            "pending_payments": len(self._payments_pending),
            "polls": self._polls,
            "errors": self._errors,
            "network_health": self._last_network_health,
            "wallet_states": {
                addr: {
                    "balance":     ws.balance,
                    "tx_count":    ws.tx_count,
                    "velocity":    ws.velocity,
                    "last_update": ws.last_update,
                }
                for addr, ws in self._wallets.items()
            },
        }

    # ── internal polling ──────────────────────────────────────────────────

    async def _wallet_poll_loop(self) -> None:
        """Poll each watched wallet for balance changes and new transactions."""
        async with httpx.AsyncClient(timeout=15.0) as client:
            self._client = client
            while self._running:
                try:
                    for addr in list(self._wallets.keys()):
                        await self._refresh_wallet(addr, client)
                    self._polls += 1
                except Exception as exc:
                    self._errors += 1
                    log.warning("Pi wallet poll error: %s", exc)
                await asyncio.sleep(POLL_INTERVAL_S)

    async def _payment_poll_loop(self) -> None:
        """Continuously check for incomplete/pending platform payments."""
        await asyncio.sleep(5)  # stagger startup
        while self._running:
            try:
                payments = await self.get_incomplete_payments()
                for pmt in payments:
                    pid = pmt.get("identifier", "")
                    if pid and pid not in self._payments_pending:
                        self._payments_pending[pid] = pmt
                        self._fire(self._on_payment_update, pmt)
                        log.info("Pi: new incomplete payment detected: %s  amount=%.4f",
                                 pid, pmt.get("amount", 0))
            except Exception as exc:
                log.warning("Pi payment poll error: %s", exc)
            await asyncio.sleep(POLL_INTERVAL_S * 2)

    async def _network_health_loop(self) -> None:
        """Fetch Pi Network / Horizon health metrics."""
        await asyncio.sleep(10)
        horizon = os.getenv("PI_HORIZON_BASE", "https://api.mainnet.minepi.com")
        while self._running:
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.get(f"{horizon}/")
                    if resp.status_code == 200:
                        data = resp.json()
                        self._last_network_health = {
                            "core_version":    data.get("core_version", ""),
                            "network_passphrase": data.get("network_passphrase", ""),
                            "history_latest":  data.get("history_latest_ledger", 0),
                            "horizon_version": data.get("horizon_version", ""),
                            "ts":              time.time(),
                        }
            except Exception as exc:
                log.debug("Pi horizon health check: %s", exc)
            await asyncio.sleep(120)

    async def _refresh_wallet(self, addr: str, client: httpx.AsyncClient) -> None:
        ws = self._wallets[addr]

        # Balance check
        try:
            resp = await client.get(
                f"{PI_API_BASE}/v2/accounts/{addr}",
                headers=self._headers(),
                timeout=10.0,
            )
            if resp.status_code == 200:
                data = resp.json()
                new_bal = float(
                    data.get("balances", [{}])[0].get("balance", ws.balance)
                )
                if abs(new_bal - ws.balance) > 0.000001 and ws.last_update > 0:
                    delta = new_bal - ws.balance
                    log.info("Pi: balance change  %s  %.6f → %.6f  Δ=%.6f",
                             addr[:12], ws.balance, new_bal, delta)
                    self._fire(self._on_balance_change, ws, delta)
                ws.balance = new_bal
                ws.last_update = time.time()
        except Exception as exc:
            log.debug("Pi balance fetch %s: %s", addr[:12], exc)

        # Transaction check
        try:
            resp = await client.get(
                f"{PI_API_BASE}/v2/accounts/{addr}/transactions?limit=10&order=desc",
                headers=self._headers(),
                timeout=10.0,
            )
            if resp.status_code == 200:
                records = (
                    resp.json()
                    .get("_embedded", {})
                    .get("records", [])
                )
                for raw in records:
                    txid = raw.get("id") or raw.get("hash", "")
                    if not txid or txid in self._known_txids:
                        continue
                    self._known_txids.add(txid)
                    tx = self._parse_tx(raw, addr)
                    ws.tx_count += 1
                    ws.recent_txs = (ws.recent_txs + [tx])[-50:]
                    if tx.from_addr == addr:
                        ws.record_outbound(tx.ts)
                        if ws.velocity >= TX_VELOCITY_THRESH:
                            log.warning("Pi: HIGH TX VELOCITY on %s: %.0f/window",
                                        addr[:12], ws.velocity)
                    self._fire(self._on_tx_callbacks, tx)
        except Exception as exc:
            log.debug("Pi tx fetch %s: %s", addr[:12], exc)

    def _parse_tx(self, raw: dict, watched_addr: str) -> PiTransaction:
        txid      = raw.get("id") or raw.get("hash", str(uuid.uuid4() if False else time.time()))
        created   = raw.get("created_at", "")
        ops       = raw.get("operations", []) or raw.get("_embedded", {}).get("records", [])

        from_addr = raw.get("source_account", watched_addr)
        to_addr   = ""
        amount    = 0.0
        memo      = raw.get("memo", "")
        tx_type   = PiTxType.UNKNOWN

        for op in ops:
            if op.get("type") in ("payment", "create_account"):
                to_addr = op.get("to") or op.get("account", "")
                amount  = float(op.get("amount", 0.0))
                tx_type = PiTxType.PAYMENT if op.get("type") == "payment" else PiTxType.TRANSFER

        if not to_addr:
            to_addr = raw.get("destination", "")
            amount  = float(raw.get("amount", amount))

        try:
            import datetime
            ts = datetime.datetime.fromisoformat(
                created.replace("Z", "+00:00")
            ).timestamp() if created else time.time()
        except Exception:
            ts = time.time()

        return PiTransaction(
            txid=str(txid),
            tx_type=tx_type,
            status=PiTxStatus.COMPLETED,
            from_addr=from_addr,
            to_addr=to_addr,
            amount=amount,
            memo=str(memo),
            ts=ts,
            raw=raw,
        )

    # ── HTTP helpers ──────────────────────────────────────────────────────

    def _headers(self) -> dict:
        h: dict = {"Accept": "application/json"}
        if PI_API_KEY:
            h["Authorization"] = f"Key {PI_API_KEY}"
        return h

    async def _pi_get(self, path: str) -> dict:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{PI_API_BASE}{path}", headers=self._headers()
            )
            resp.raise_for_status()
            return resp.json()

    async def _pi_post(self, path: str, json: Optional[dict] = None) -> dict:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{PI_API_BASE}{path}",
                headers={**self._headers(), "Content-Type": "application/json"},
                json=json or {},
            )
            resp.raise_for_status()
            return resp.json()


# ── import guard ──────────────────────────────────────────────────────────────
import uuid  # noqa: E402 — used in _parse_tx fallback

# ── singleton ─────────────────────────────────────────────────────────────────
pi_connector = PiNetworkConnector()
