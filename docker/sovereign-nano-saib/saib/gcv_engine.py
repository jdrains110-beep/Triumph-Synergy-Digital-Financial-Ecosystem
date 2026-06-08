"""
GCV Enforcement Engine — SAIB v9
──────────────────────────────────────────────────────────────────────────────
Enforces the Pi Network Global Consensus Value (GCV) of $314,159 per Pi coin.
The GCV is the community-validated baseline for peer-to-peer barter within
the Pi Network ecosystem, anchoring every transaction to the mathematical
constant π × 100,000.

Components:
  1. GCVMathEngine      — 36 sig-fig Decimal precision math
  2. GCVEnforcementGraph — LangGraph state machine (Oracle → Shield → Executor)
  3. GCVLedger          — asyncpg-backed peer_nodes + gcv_transactions tables

Enforcement Matrix:
  [Barter Request]
         ↓
  OracleCalculator  → compute required Pi from item USD value
         ↓
  EnforcerShield    → APPROVE if gcv_delivered ≥ item_value, else REJECT
         ↓
  Executor          → settle / block + dispatch audit log
         ↓
  [Ledger Write]    → upsert peer reputation + insert transaction record

GCV Constants:
  PI_GCV_USD = $314,159.00  (1 Pi = $314,159)
  PI_NANO    = 0.00000001   (smallest Pi unit — 8 decimal places)
"""
from __future__ import annotations

import asyncio
import logging
import os
import time
import uuid
from decimal import ROUND_DOWN, Decimal, getcontext
from typing import Any, Dict, List, Optional, TypedDict

log = logging.getLogger("sovereign.gcv_engine")

# ── Precision ─────────────────────────────────────────────────────────────────
getcontext().prec = 36   # handles quadrillion-dollar caps and nano-Pi fractions

# ── GCV Constants ─────────────────────────────────────────────────────────────
PI_GCV_USD = Decimal("314159.00")   # $314,159 per Pi — honouring π
PI_NANO    = Decimal("0.00000001")  # 1 nano-Pi (8 decimal places)

# ── 30-Year Sustainability Constants ──────────────────────────────────────────
# Pi must outlast multiple generations; spend cadence is paced over the full
# horizon so a single wallet (or the network as a whole) can never burn its
# treasury inside a few months. All values env-overridable.
SUSTAINABILITY_HORIZON_YEARS = int(os.getenv("GCV_SUSTAINABILITY_YEARS", "30"))
SUSTAINABILITY_PER_TX_PCT    = Decimal(os.getenv("GCV_PER_TX_MAX_PCT", "0.005"))   # 0.5% of yearly budget per single tx
SUSTAINABILITY_DAILY_PCT     = Decimal(os.getenv("GCV_DAILY_MAX_PCT",  "0.01"))    # 1% of yearly budget per day
SECONDS_PER_YEAR             = Decimal("31557600")     # 365.25 d
SECONDS_PER_DAY              = Decimal("86400")

try:
    from langgraph.graph import StateGraph, END as GRAPH_END
    _LANGGRAPH = True
except ImportError:
    _LANGGRAPH = False


# ── GCV Math Engine ───────────────────────────────────────────────────────────
class GCVMathEngine:
    """
    High-precision GCV maths — 36 sig-fig Decimal.
    Covers everything from nano-Pi coffee purchases to multi-Pi real estate.
    """

    def __init__(self, gcv_peg: Decimal = PI_GCV_USD) -> None:
        self.gcv_peg      = gcv_peg
        self.min_fraction = PI_NANO

    def calculate_required_pi(self, item_usd_value: str) -> Decimal:
        """Returns the exact Pi required for a given USD item price."""
        usd = Decimal(str(item_usd_value))
        return (usd / self.gcv_peg).quantize(self.min_fraction, rounding=ROUND_DOWN)

    def verify_transaction(
        self,
        item_usd_value: str,
        offered_pi: str,
    ) -> Dict[str, Any]:
        """Verifies whether offered Pi covers the item's GCV-adjusted price."""
        usd_value     = Decimal(str(item_usd_value))
        pi_offered    = Decimal(str(offered_pi))
        gcv_delivered = pi_offered * self.gcv_peg
        required_pi   = self.calculate_required_pi(item_usd_value)
        surplus       = gcv_delivered - usd_value
        return {
            "is_valid":            bool(gcv_delivered >= usd_value),
            "required_pi":         str(required_pi),
            "offered_pi":          str(pi_offered),
            "gcv_value_delivered": f"${gcv_delivered:,.2f}",
            "item_usd_value":      f"${usd_value:,.2f}",
            "surplus_deficit":     f"${surplus:,.2f}",
            "gcv_peg":             f"${self.gcv_peg:,.2f}",
        }

    def pi_to_usd(self, pi_amount: str) -> str:
        val = Decimal(str(pi_amount)) * self.gcv_peg
        return f"${val:,.2f}"

    def usd_to_pi(self, usd_amount: str) -> str:
        val = Decimal(str(usd_amount)) / self.gcv_peg
        return str(val.quantize(self.min_fraction, rounding=ROUND_DOWN))


# ── Module-level math instance (used by LangGraph nodes) ─────────────────────
_math = GCVMathEngine()


# ── 30-Year Sustainability Calculator ────────────────────────────────────────
class SustainabilityCalculator:
    """
    Paces Pi spending across a multi-decade horizon so the treasury — for a
    single wallet, a tenant, or the network as a whole — survives at least
    `horizon_years` (default 30) before its principal is exhausted.

    All quantities are expressed in Pi (not USD) so the calculator is peg-stable
    even if GCV is later revalued. Convert at the boundary using GCVMathEngine.
    """

    def __init__(
        self,
        horizon_years:  int     = SUSTAINABILITY_HORIZON_YEARS,
        per_tx_max_pct: Decimal = SUSTAINABILITY_PER_TX_PCT,
        daily_max_pct:  Decimal = SUSTAINABILITY_DAILY_PCT,
    ) -> None:
        self.horizon_years  = max(1, horizon_years)
        self.per_tx_max_pct = per_tx_max_pct
        self.daily_max_pct  = daily_max_pct

    # ── Budget breakdown ─────────────────────────────────────────────────────
    def compute_budget(self, total_pi: str) -> Dict[str, Any]:
        principal = Decimal(str(total_pi))
        per_year  = (principal / Decimal(self.horizon_years)).quantize(PI_NANO, rounding=ROUND_DOWN)
        per_month = (per_year / Decimal(12)).quantize(PI_NANO, rounding=ROUND_DOWN)
        per_day   = (per_year / Decimal("365.25")).quantize(PI_NANO, rounding=ROUND_DOWN)
        per_tx    = (per_year * self.per_tx_max_pct).quantize(PI_NANO, rounding=ROUND_DOWN)
        daily_cap = (per_year * self.daily_max_pct).quantize(PI_NANO, rounding=ROUND_DOWN)
        return {
            "principal_pi":        str(principal),
            "principal_usd":       _math.pi_to_usd(str(principal)),
            "horizon_years":       self.horizon_years,
            "per_year_pi":         str(per_year),
            "per_year_usd":        _math.pi_to_usd(str(per_year)),
            "per_month_pi":        str(per_month),
            "per_day_pi":          str(per_day),
            "per_tx_max_pi":       str(per_tx),
            "per_tx_max_usd":      _math.pi_to_usd(str(per_tx)),
            "daily_cap_pi":        str(daily_cap),
            "per_tx_max_pct":      str(self.per_tx_max_pct),
            "daily_max_pct":       str(self.daily_max_pct),
        }

    # ── Pace check — is the wallet on track to last `horizon_years`? ────────
    def check_pace(self, total_pi: str, spent_pi: str, age_seconds: float) -> Dict[str, Any]:
        principal = Decimal(str(total_pi))
        spent     = Decimal(str(spent_pi))
        age_yrs   = max(Decimal("0.0001"), Decimal(str(age_seconds)) / SECONDS_PER_YEAR)
        expected  = (principal / Decimal(self.horizon_years) * age_yrs).quantize(PI_NANO, rounding=ROUND_DOWN)
        delta     = (spent - expected).quantize(PI_NANO, rounding=ROUND_DOWN)
        if expected == 0:
            pct_used = Decimal("0")
        else:
            pct_used = (spent / expected * Decimal("100")).quantize(Decimal("0.01"))
        if spent > principal:
            status = "exhausted"
        elif delta > expected:                          # >2x expected pace
            status = "burning"
        elif delta > 0:
            status = "over_pace"
        elif delta < -expected:                         # <0x — saving heavily
            status = "savings"
        else:
            status = "on_pace"
        remaining = principal - spent
        if spent == 0 or age_seconds <= 0:
            projected_yrs = Decimal(self.horizon_years)
        else:
            burn_per_sec  = spent / Decimal(str(age_seconds))
            projected_yrs = (remaining / burn_per_sec / SECONDS_PER_YEAR).quantize(Decimal("0.01"))
        return {
            "status":                  status,
            "principal_pi":            str(principal),
            "spent_pi":                str(spent),
            "remaining_pi":            str(remaining),
            "expected_spend_pi":       str(expected),
            "delta_pi":                str(delta),
            "pct_of_expected":         str(pct_used),
            "horizon_years":           self.horizon_years,
            "projected_lifetime_yrs":  str(projected_yrs),
            "meets_30yr_vision":       bool(projected_yrs >= Decimal(self.horizon_years)),
        }

    # ── Per-transaction gate — used by hyper-mesh cortex + chat actions ─────
    def check_transaction(
        self,
        total_pi:       str,
        spent_pi:       str,
        spent_today_pi: str,
        offered_pi:     str,
    ) -> Dict[str, Any]:
        budget    = self.compute_budget(total_pi)
        per_tx    = Decimal(budget["per_tx_max_pi"])
        daily_cap = Decimal(budget["daily_cap_pi"])
        offered   = Decimal(str(offered_pi))
        spent_d   = Decimal(str(spent_today_pi))
        reasons: List[str] = []
        if offered > per_tx:
            reasons.append(f"single-tx {offered} Pi exceeds per-tx cap {per_tx} Pi")
        if (spent_d + offered) > daily_cap:
            reasons.append(f"daily total {spent_d + offered} Pi would exceed daily cap {daily_cap} Pi")
        principal_left = Decimal(str(total_pi)) - Decimal(str(spent_pi))
        if offered > principal_left:
            reasons.append(f"offered {offered} Pi exceeds remaining principal {principal_left} Pi")
        approved = len(reasons) == 0
        return {
            "approved":           approved,
            "reasons":            reasons,
            "offered_pi":         str(offered),
            "offered_usd":        _math.pi_to_usd(str(offered)),
            "per_tx_max_pi":      str(per_tx),
            "daily_cap_pi":       str(daily_cap),
            "spent_today_after":  str(spent_d + offered) if approved else str(spent_d),
            "principal_left":     str(principal_left),
            "recommendation":     "approve" if approved else "split-into-smaller-installments",
        }


# Module-level instance — cortex + app endpoints share this singleton
_sustain = SustainabilityCalculator()


# ── Enforcement State ─────────────────────────────────────────────────────────
class GCVEnforcementState(TypedDict):
    tx_id:                    str
    item_name:                str
    item_market_value_usd:    str   # str to preserve Decimal precision across node hops
    offered_pi_tokens:        str
    calculated_gcv_value_usd: str
    enforcement_status:       str   # pending | passed | rejected
    action_logs:              str
    sender_node_id:           str
    receiver_node_id:         str


# ── LangGraph sync nodes (run in executor to avoid blocking event loop) ───────
def _gcv_oracle(state: GCVEnforcementState) -> GCVEnforcementState:
    """Oracle node: compute GCV math and annotate state."""
    result = _math.verify_transaction(
        state["item_market_value_usd"], state["offered_pi_tokens"]
    )
    log.info(
        "[GCVOracle] item=%s usd=%s offered_pi=%s delivered=%s valid=%s",
        state["item_name"], state["item_market_value_usd"],
        state["offered_pi_tokens"], result["gcv_value_delivered"], result["is_valid"],
    )
    return {
        **state,
        "calculated_gcv_value_usd": result["gcv_value_delivered"],
        "action_logs": (
            f"Oracle: item_value={result['item_usd_value']} "
            f"offered_pi={result['offered_pi']} "
            f"gcv_delivered={result['gcv_value_delivered']} "
            f"required_pi={result['required_pi']}"
        ),
    }


def _gcv_enforcer_shield(state: GCVEnforcementState) -> GCVEnforcementState:
    """Enforcer Shield: approve or reject based on GCV maths."""
    result = _math.verify_transaction(
        state["item_market_value_usd"], state["offered_pi_tokens"]
    )
    if result["is_valid"]:
        return {
            **state,
            "enforcement_status": "passed",
            "action_logs": state["action_logs"] + (
                f"\nShield: APPROVED — {result['offered_pi']} Pi "
                f"covers {result['item_usd_value']} at GCV $314,159. "
                f"Surplus: {result['surplus_deficit']}"
            ),
        }
    return {
        **state,
        "enforcement_status": "rejected",
        "action_logs": state["action_logs"] + (
            f"\nShield: REJECTED — Devaluation blocked! "
            f"Offered {result['gcv_value_delivered']} but item costs {result['item_usd_value']}. "
            f"Deficit: {result['surplus_deficit']}. Wallet flagged for GCV audit."
        ),
    }


def _gcv_executor(state: GCVEnforcementState) -> GCVEnforcementState:
    """Executor: finalise settlement or trigger countermeasures."""
    if state["enforcement_status"] == "passed":
        log.info("[GCVExecutor] APPROVED — tx_id=%s", state["tx_id"])
        return {
            **state,
            "action_logs": state["action_logs"]
            + "\nExecutor: Funds cleared. Settlement pipeline dispatched.",
        }
    log.warning("[GCVExecutor] REJECTED — tx_id=%s", state["tx_id"])
    return {
        **state,
        "action_logs": state["action_logs"]
        + "\nExecutor: Session closed. Node logged for GCV integrity audit.",
    }


# ── GCV Engine ────────────────────────────────────────────────────────────────
class GCVEngine:
    """
    Sovereign GCV Enforcement Engine (v9).

    Validates Pi Network peer-to-peer trades against the $314,159 GCV peg.
    Records every decision to the gcv_transactions ledger with peer reputation.
    """

    def __init__(self) -> None:
        self.math         = GCVMathEngine()
        self.sustain      = SustainabilityCalculator()
        self._graph: Any  = None
        self._pool: Any   = None
        self._tx_count    = 0
        self._pass_count  = 0
        self._fail_count  = 0
        self._running     = False

    def boot(self) -> None:
        self._running = True
        if _LANGGRAPH:
            self._graph = self._compile()
            log.info("[GCVEngine] LangGraph enforcement graph compiled — ONLINE")
        else:
            log.info("[GCVEngine] Sequential enforcement ONLINE (langgraph unavailable)")
        log.info(
            "[GCVEngine] GCV Peg=$%s per Pi | Nano-Pi=%s | Precision=36 sig-figs",
            PI_GCV_USD, PI_NANO,
        )

    def _compile(self) -> Any:
        g = StateGraph(GCVEnforcementState)
        g.add_node("OracleCalculate", _gcv_oracle)
        g.add_node("EnforcerShield",  _gcv_enforcer_shield)
        g.add_node("Executor",        _gcv_executor)
        g.set_entry_point("OracleCalculate")
        g.add_edge("OracleCalculate", "EnforcerShield")
        g.add_edge("EnforcerShield",  "Executor")
        g.add_edge("Executor",        GRAPH_END)
        return g.compile()

    async def _ensure_pool(self) -> None:
        if self._pool is not None:
            return
        try:
            import asyncpg
            db_url = os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL")
            if db_url:
                self._pool = await asyncpg.create_pool(db_url, min_size=1, max_size=5)
                log.info("[GCVEngine] asyncpg pool connected")
        except Exception as exc:
            log.debug("[GCVEngine] DB pool unavailable: %s (ledger writes disabled)", exc)

    async def enforce(
        self,
        item_name: str,
        item_usd_value: str,
        offered_pi: str,
        sender_node_id: str = "anonymous",
        receiver_node_id: str = "system",
    ) -> Dict[str, Any]:
        tx_id = str(uuid.uuid4())
        self._tx_count += 1

        state: GCVEnforcementState = {
            "tx_id":                    tx_id,
            "item_name":                item_name,
            "item_market_value_usd":    item_usd_value,
            "offered_pi_tokens":        offered_pi,
            "calculated_gcv_value_usd": "0",
            "enforcement_status":       "pending",
            "action_logs":              "",
            "sender_node_id":           sender_node_id,
            "receiver_node_id":         receiver_node_id,
        }

        try:
            if self._graph:
                # Run sync nodes in executor so we don't block the event loop
                loop = asyncio.get_event_loop()
                result = await loop.run_in_executor(None, self._graph.invoke, state)
            else:
                result = _gcv_oracle(state)
                result = _gcv_enforcer_shield(result)
                result = _gcv_executor(result)
        except Exception as exc:
            log.error("[GCVEngine] enforce error: %s", exc)
            result = {**state, "enforcement_status": "error", "action_logs": str(exc)}

        es = result.get("enforcement_status", "error")
        if es == "passed":
            self._pass_count += 1
        elif es == "rejected":
            self._fail_count += 1

        # Persist to ledger asynchronously (best-effort)
        asyncio.ensure_future(self._record_transaction(result))

        return {
            "tx_id":              tx_id,
            "enforcement_status": es,
            "action_logs":        result.get("action_logs", ""),
            "math":               self.math.verify_transaction(item_usd_value, offered_pi),
        }

    async def _record_transaction(self, state: GCVEnforcementState) -> None:
        await self._ensure_pool()
        if not self._pool:
            return
        try:
            async with self._pool.acquire() as conn:
                # Upsert sender peer node
                await conn.execute(
                    """
                    INSERT INTO gcv_peer_nodes (node_id, last_seen_timestamp)
                    VALUES ($1, NOW())
                    ON CONFLICT (node_id) DO UPDATE SET last_seen_timestamp = NOW()
                    """,
                    state["sender_node_id"],
                )
                # Insert transaction record
                await conn.execute(
                    """
                    INSERT INTO gcv_transactions
                      (transaction_id, sender_node_id, receiver_node_id,
                       item_description, fiat_value_usd, pi_amount, status)
                    VALUES ($1,$2,$3,$4,$5,$6,$7)
                    """,
                    state["tx_id"],
                    state["sender_node_id"],
                    state["receiver_node_id"],
                    state.get("item_name", ""),
                    state["item_market_value_usd"],
                    state["offered_pi_tokens"],
                    state["enforcement_status"].upper(),
                )
                # Update peer reputation score
                if state["enforcement_status"] == "passed":
                    await conn.execute(
                        """
                        UPDATE gcv_peer_nodes
                        SET total_completed_trades = total_completed_trades + 1,
                            reputation_score = LEAST(100.00, reputation_score + 0.5)
                        WHERE node_id = $1
                        """,
                        state["sender_node_id"],
                    )
                elif state["enforcement_status"] == "rejected":
                    await conn.execute(
                        """
                        UPDATE gcv_peer_nodes
                        SET total_rejected_trades = total_rejected_trades + 1,
                            reputation_score = GREATEST(0.00, reputation_score - 2.0)
                        WHERE node_id = $1
                        """,
                        state["sender_node_id"],
                    )
        except Exception as exc:
            log.debug("[GCVEngine] ledger write error: %s", exc)

    async def get_peers(self, limit: int = 50) -> List[Dict[str, Any]]:
        await self._ensure_pool()
        if not self._pool:
            return []
        try:
            async with self._pool.acquire() as conn:
                rows = await conn.fetch(
                    """
                    SELECT node_id, reputation_score, total_completed_trades,
                           total_rejected_trades, is_blacklisted, last_seen_timestamp
                    FROM gcv_peer_nodes
                    ORDER BY reputation_score DESC
                    LIMIT $1
                    """,
                    limit,
                )
                return [dict(r) for r in rows]
        except Exception as exc:
            log.debug("[GCVEngine] get_peers error: %s", exc)
            return []

    async def get_transactions(
        self,
        limit: int = 100,
        status: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        await self._ensure_pool()
        if not self._pool:
            return []
        try:
            async with self._pool.acquire() as conn:
                if status:
                    rows = await conn.fetch(
                        """
                        SELECT * FROM gcv_transactions
                        WHERE status = $1
                        ORDER BY created_at DESC
                        LIMIT $2
                        """,
                        status.upper(), limit,
                    )
                else:
                    rows = await conn.fetch(
                        """
                        SELECT * FROM gcv_transactions
                        ORDER BY created_at DESC
                        LIMIT $1
                        """,
                        limit,
                    )
                return [dict(r) for r in rows]
        except Exception as exc:
            log.debug("[GCVEngine] get_transactions error: %s", exc)
            return []

    def stats(self) -> Dict[str, Any]:
        return {
            "running":      self._running,
            "gcv_peg_usd":  str(PI_GCV_USD),
            "gcv_nano_pi":  str(PI_NANO),
            "tx_count":     self._tx_count,
            "pass_count":   self._pass_count,
            "fail_count":   self._fail_count,
            "db_connected": self._pool is not None,
            "graph_engine": "langgraph" if self._graph else "sequential",
            "sustainability": {
                "horizon_years":  self.sustain.horizon_years,
                "per_tx_max_pct": str(self.sustain.per_tx_max_pct),
                "daily_max_pct":  str(self.sustain.daily_max_pct),
            },
        }


# ── singleton ─────────────────────────────────────────────────────────────────
gcv_engine = GCVEngine()
