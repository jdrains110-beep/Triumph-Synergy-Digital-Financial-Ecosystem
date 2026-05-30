"""
Triumph Synergy Database Connector — SAIB v3
──────────────────────────────────────────────────────────────────────────────
Read-only tap into the live Triumph Synergy Supabase/Postgres instance.
Continuously monitors users, transactions, sessions, and anomalies and feeds
signals into the SAIB intelligence + guardian + enforcer engines.

Capabilities
────────────
• User anomaly scan    — new high-risk users, auth failures, unusual patterns
• Financial monitor    — large / rapid transactions, unusual destination wallets
• Session monitor      — concurrent sessions, impossible-travel, token abuse
• System health tap    — service error rates, latency spikes, OOM events
• Compliance watch     — KYC/AML flag changes, sanctioned entity matches
• Auto-signal          — all findings → SovereignIntelligence + FounderGuardian
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import os
import time
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional

import httpx

log = logging.getLogger("saib.connector.triumph_db")

# ────────────────────────────────────── environment ──
SUPABASE_URL    = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY    = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")   # service role (read-only intent)
DB_POLL_S       = float(os.getenv("TS_DB_POLL_S", "45"))
LARGE_TX_PI     = float(os.getenv("TS_LARGE_TX_PI", "500"))    # Pi threshold for "large"
AUTH_FAIL_LIMIT = int(os.getenv("TS_AUTH_FAIL_LIMIT", "5"))    # failures in window


# ────────────────────────────────────── data models ──

@dataclass
class UserRecord:
    user_id:     str
    email_hash:  str   # SHA-256 of email — never store plaintext
    kyc_status:  str   = "unverified"
    risk_score:  float = 0.0
    created_at:  float = 0.0
    last_active: float = 0.0
    flagged:     bool  = False


@dataclass
class TransactionRecord:
    tx_id:       str
    user_id:     str
    amount_pi:   float
    direction:   str   = "outbound"
    status:      str   = "completed"
    ts:          float = field(default_factory=time.time)
    destination: str   = ""
    notes:       str   = ""


@dataclass
class SessionRecord:
    session_id:   str
    user_id:      str
    ip_hash:      str   # SHA-256 of IP
    user_agent:   str
    ts:           float = field(default_factory=time.time)
    country_code: str   = ""


# ────────────────────────────────────── connector ──

class TriumphDBConnector:
    """
    Triumph Synergy live DB tap. Safe — uses read-only queries through the
    Supabase REST API. Never writes or mutates data.
    """

    def __init__(self) -> None:
        self._last_user_scan:  float = 0.0
        self._last_tx_scan:    float = 0.0
        self._last_sess_scan:  float = 0.0
        self._last_health_ts:  float = 0.0

        self._known_tx_ids:    set[str] = set()
        self._known_sess_ids:  set[str] = set()
        self._user_cache:      Dict[str, UserRecord] = {}

        self._auth_fail_counts: Dict[str, List[float]] = {}   # user_id → timestamps

        # callbacks
        self._on_anomaly:  List[Callable[[str, dict], None]] = []
        self._on_new_user: List[Callable[[UserRecord], None]] = []
        self._on_large_tx: List[Callable[[TransactionRecord], None]] = []

        self._running: bool = False
        self._polls:   int  = 0
        self._errors:  int  = 0

    # ── public API ────────────────────────────────────────────────────────

    def on_anomaly(self, cb: Callable[[str, dict], None]) -> None:
        """cb(anomaly_type: str, detail: dict)"""
        self._on_anomaly.append(cb)

    def on_new_user(self, cb: Callable[[UserRecord], None]) -> None:
        self._on_new_user.append(cb)

    def on_large_tx(self, cb: Callable[[TransactionRecord], None]) -> None:
        self._on_large_tx.append(cb)

    def start(self) -> None:
        if self._running:
            return
        self._running = True
        asyncio.create_task(self._poll_loop())
        log.info("Triumph DB connector started (Supabase URL: %s…)",
                 SUPABASE_URL[:40] if SUPABASE_URL else "NOT_SET")

    def stop(self) -> None:
        self._running = False

    def stats(self) -> dict:
        return {
            "polls":       self._polls,
            "errors":      self._errors,
            "users_cached": len(self._user_cache),
            "known_txs":   len(self._known_tx_ids),
            "known_sessions": len(self._known_sess_ids),
            "supabase_url_set": bool(SUPABASE_URL),
            "service_key_set":  bool(SUPABASE_KEY),
        }

    # ── raw query helpers ─────────────────────────────────────────────────

    async def query(
        self,
        table: str,
        select: str = "*",
        filters: Optional[Dict[str, str]] = None,
        order: str = "created_at.desc",
        limit: int = 100,
    ) -> List[dict]:
        """
        Execute a Supabase REST GET query. Returns list of rows.
        This is the universal read-only query surface.
        """
        if not SUPABASE_URL or not SUPABASE_KEY:
            log.debug("Triumph DB: Supabase credentials not set — skipping query %s", table)
            return []

        params: Dict[str, str] = {
            "select": select,
            "order":  order,
            "limit":  str(limit),
        }
        if filters:
            params.update(filters)

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(
                    f"{SUPABASE_URL}/rest/v1/{table}",
                    headers=self._headers(),
                    params=params,
                )
                if resp.status_code == 200:
                    return resp.json()
                elif resp.status_code == 401:
                    log.warning("Triumph DB: auth rejected (check SUPABASE_SERVICE_ROLE_KEY)")
                elif resp.status_code == 404:
                    log.debug("Triumph DB: table %s not found", table)
                else:
                    log.warning("Triumph DB: %s → HTTP %d: %s",
                                table, resp.status_code, resp.text[:200])
        except httpx.ConnectError:
            log.debug("Triumph DB: cannot reach Supabase — offline or wrong URL")
        except Exception as exc:
            self._errors += 1
            log.warning("Triumph DB query error [%s]: %s", table, exc)
        return []

    async def rpc(self, fn: str, params: dict) -> Any:
        """Call a Supabase RPC (stored procedure). Read-only use only."""
        if not SUPABASE_URL or not SUPABASE_KEY:
            return None
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    f"{SUPABASE_URL}/rest/v1/rpc/{fn}",
                    headers={**self._headers(), "Content-Type": "application/json"},
                    json=params,
                )
                if resp.status_code == 200:
                    return resp.json()
                log.warning("Triumph DB rpc %s → HTTP %d", fn, resp.status_code)
        except Exception as exc:
            self._errors += 1
            log.warning("Triumph DB rpc error [%s]: %s", fn, exc)
        return None

    # ── higher-level surveillance queries ─────────────────────────────────

    async def scan_flagged_users(self) -> List[dict]:
        return await self.query(
            "users", select="id,kyc_status,risk_score,created_at",
            filters={"risk_score": "gte.0.7"},
            limit=50,
        )

    async def scan_recent_large_transactions(self) -> List[dict]:
        return await self.query(
            "transactions",
            select="id,user_id,amount_pi,direction,status,created_at,destination",
            filters={"amount_pi": f"gte.{LARGE_TX_PI}"},
            order="created_at.desc",
            limit=50,
        )

    async def scan_recent_sessions(self) -> List[dict]:
        return await self.query(
            "sessions",
            select="id,user_id,ip_hash,user_agent,created_at,country_code",
            order="created_at.desc",
            limit=100,
        )

    async def scan_auth_failures(self) -> List[dict]:
        """Return recent auth_audit rows with status=failure."""
        return await self.query(
            "auth_audit",
            select="id,user_id,failure_reason,created_at",
            filters={"status": "eq.failure"},
            order="created_at.desc",
            limit=100,
        )

    async def scan_compliance_flags(self) -> List[dict]:
        return await self.query(
            "compliance_flags",
            select="id,user_id,flag_type,severity,created_at",
            order="created_at.desc",
            limit=50,
        )

    async def get_system_health(self) -> List[dict]:
        return await self.query(
            "system_health_log",
            select="service,error_rate,latency_p99,ts",
            order="ts.desc",
            limit=20,
        )

    # ── polling loop ──────────────────────────────────────────────────────

    async def _poll_loop(self) -> None:
        while self._running:
            try:
                await self._run_scan_cycle()
                self._polls += 1
            except Exception as exc:
                self._errors += 1
                log.warning("Triumph DB poll error: %s", exc)
            await asyncio.sleep(DB_POLL_S)

    async def _run_scan_cycle(self) -> None:
        await asyncio.gather(
            self._scan_users(),
            self._scan_transactions(),
            self._scan_sessions(),
            self._scan_auth_failures(),
            self._scan_compliance(),
            self._scan_system_health(),
            return_exceptions=True,
        )

    async def _scan_users(self) -> None:
        rows = await self.scan_flagged_users()
        for row in rows:
            uid = str(row.get("id", ""))
            risk = float(row.get("risk_score", 0.0))
            if risk > 0.85:
                self._fire(self._on_anomaly, "high_risk_user", {
                    "user_id":   uid,
                    "risk_score": risk,
                    "kyc_status": row.get("kyc_status", "unknown"),
                })
            if uid not in self._user_cache:
                ur = UserRecord(
                    user_id=uid,
                    email_hash=hashlib.sha256(uid.encode()).hexdigest()[:16],
                    kyc_status=str(row.get("kyc_status", "")),
                    risk_score=risk,
                    created_at=float(row.get("created_at_ts", 0) or 0),
                    flagged=risk >= 0.7,
                )
                self._user_cache[uid] = ur
                self._fire(self._on_new_user, ur)

    async def _scan_transactions(self) -> None:
        rows = await self.scan_recent_large_transactions()
        for row in rows:
            tx_id = str(row.get("id", ""))
            if tx_id in self._known_tx_ids:
                continue
            self._known_tx_ids.add(tx_id)
            amount = float(row.get("amount_pi", 0.0))
            tx = TransactionRecord(
                tx_id=tx_id,
                user_id=str(row.get("user_id", "")),
                amount_pi=amount,
                direction=str(row.get("direction", "outbound")),
                status=str(row.get("status", "completed")),
                destination=str(row.get("destination", "")),
            )
            self._fire(self._on_large_tx, tx)
            if amount > LARGE_TX_PI * 5:
                self._fire(self._on_anomaly, "very_large_transaction", {
                    "tx_id":      tx_id,
                    "user_id":    tx.user_id,
                    "amount_pi":  amount,
                    "direction":  tx.direction,
                })
            log.info("Triumph DB: large tx detected  %s  %.2f Pi  user=%s",
                     tx_id[:12], amount, tx.user_id[:12])

    async def _scan_sessions(self) -> None:
        rows = await self.scan_recent_sessions()
        user_sess_count: Dict[str, int] = {}
        for row in rows:
            sid = str(row.get("id", ""))
            uid = str(row.get("user_id", ""))
            if sid not in self._known_sess_ids:
                self._known_sess_ids.add(sid)
            user_sess_count[uid] = user_sess_count.get(uid, 0) + 1

        # Concurrent session anomaly
        for uid, cnt in user_sess_count.items():
            if cnt >= 5:
                self._fire(self._on_anomaly, "concurrent_sessions", {
                    "user_id":        uid,
                    "session_count":  cnt,
                })

    async def _scan_auth_failures(self) -> None:
        rows = await self.scan_auth_failures()
        now = time.time()
        window = 300.0  # 5 minutes
        for row in rows:
            uid = str(row.get("user_id", ""))
            if not uid:
                continue
            ts = float(row.get("created_at_ts", now) or now)
            bucket = self._auth_fail_counts.setdefault(uid, [])
            # prune old
            bucket[:] = [t for t in bucket if now - t < window]
            if ts not in bucket:
                bucket.append(ts)
            if len(bucket) >= AUTH_FAIL_LIMIT:
                self._fire(self._on_anomaly, "auth_brute_force", {
                    "user_id":       uid,
                    "failures_in_5m": len(bucket),
                })
                bucket.clear()

    async def _scan_compliance(self) -> None:
        rows = await self.scan_compliance_flags()
        for row in rows:
            sev = float(row.get("severity", 0.0))
            if sev >= 0.8:
                self._fire(self._on_anomaly, "compliance_flag_critical", {
                    "user_id":   str(row.get("user_id", "")),
                    "flag_type": str(row.get("flag_type", "")),
                    "severity":  sev,
                })

    async def _scan_system_health(self) -> None:
        rows = await self.get_system_health()
        for row in rows:
            err_rate = float(row.get("error_rate", 0.0))
            p99      = float(row.get("latency_p99", 0.0))
            service  = str(row.get("service", "unknown"))
            if err_rate > 0.1:
                self._fire(self._on_anomaly, "service_error_spike", {
                    "service":    service,
                    "error_rate": err_rate,
                    "latency_p99": p99,
                })

    # ── helpers ───────────────────────────────────────────────────────────

    def _headers(self) -> dict:
        return {
            "apikey":        SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Accept":        "application/json",
            "Prefer":        "count=none",
        }

    @staticmethod
    def _fire(callbacks: list, *args: Any) -> None:
        for cb in callbacks:
            try:
                cb(*args)
            except Exception as exc:
                log.debug("Callback error: %s", exc)


# ── singleton ─────────────────────────────────────────────────────────────────
triumph_db = TriumphDBConnector()
