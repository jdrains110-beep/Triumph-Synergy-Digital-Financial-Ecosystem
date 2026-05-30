"""
Sovereign Connector Orchestrator — SAIB v3
──────────────────────────────────────────────────────────────────────────────
Single entry point that boots all connectors, wires their callbacks into the
v2 SAIB engines, and exposes a unified status + control interface.

Boot order
──────────
1.  OutboundActions       — always first (others depend on it for alerts)
2.  PiNetworkConnector    — start blockchain monitoring
3.  TriumphDBConnector    — start Supabase surveillance
4.  KnowledgeFeedConnector— start external intel polling
5.  FounderWatchConnector — inject Pi + DB + Actions, start watch
6.  AutonomousDecisions   — inject all engines + connectors, start loop

Cross-wiring (callbacks)
────────────────────────
Pi transaction      → SovereignIntelligence (ingest_signal)
Pi transaction      → FounderGuardian (ingest)
Pi balance change   → FounderWatch (handled internally)
DB anomaly          → SovereignIntelligence (ingest_signal)
DB anomaly          → FounderGuardian (ingest)
DB large tx         → SovereignIntelligence
Knowledge new fact  → SovereignIntelligence (ingest_signal for high-sev)
Knowledge new fact  → AutonomousDecisions (via normal observe loop)
Guardian alert      → AutonomousDecisions (via observe loop)
FounderWatch event  → AutonomousDecisions (via observe loop)
Enforcer evaluate   → AutonomousDecisions (via observe loop)
"""
from __future__ import annotations

import asyncio
import logging
import time
from typing import Any

log = logging.getLogger("saib.connectors.orchestrator")


class SovereignConnectorOrchestrator:
    """Boots and wires all connectors + engines into a unified sovereign mesh."""

    def __init__(self) -> None:
        self._started_at:  float = 0.0
        self._is_running:  bool  = False

        # these are set during boot
        self.pi:         Any = None
        self.db:         Any = None
        self.actions:    Any = None
        self.knowledge:  Any = None
        self.founder:    Any = None
        self.autonomous: Any = None

    # ── boot ──────────────────────────────────────────────────────────────

    def boot(
        self,
        *,
        intel,
        guardian,
        enforcer,
        brainstorm,
        warp,
        mesh,
    ) -> None:
        """
        Call once in FastAPI lifespan, after all v2 engines are instantiated.
        Parameters are the live v2 engine singletons from app.py.
        """
        if self._is_running:
            log.warning("Orchestrator already running — skipping re-boot")
            return

        self._started_at = time.time()

        # ── import connectors ─────────────────────────────────────────────
        from .outbound_actions    import outbound         as _actions
        from .pi_network          import pi_connector     as _pi
        from .triumph_db          import triumph_db       as _db
        from .knowledge_feed      import knowledge_feed   as _knowledge
        from .founder_watch       import founder_watch    as _founder
        from .autonomous_decisions import autonomous      as _autonomous

        self.pi         = _pi
        self.db         = _db
        self.actions    = _actions
        self.knowledge  = _knowledge
        self.founder    = _founder
        self.autonomous = _autonomous

        # ── wire Pi callbacks ─────────────────────────────────────────────
        _pi.on_transaction(lambda tx: asyncio.create_task(
            self._pi_tx_to_intel(intel, guardian, tx)
        ))
        _pi.on_balance_change(lambda ws, delta: asyncio.create_task(
            self._pi_balance_to_guardian(guardian, ws, delta)
        ))
        _pi.on_payment_update(lambda pmt: asyncio.create_task(
            self._pi_payment_to_intel(intel, pmt)
        ))        # Protocol upgrade — entire sovereign stack reacts immediately
        _pi.on_protocol_upgrade(lambda info: asyncio.create_task(
            self._pi_protocol_upgrade_to_all(
                intel, guardian, _actions, _autonomous, info
            )
        ))
        # ── wire DB callbacks ─────────────────────────────────────────────
        _db.on_anomaly(lambda atype, detail: asyncio.create_task(
            self._db_anomaly_to_intel(intel, guardian, atype, detail)
        ))
        _db.on_large_tx(lambda tx: asyncio.create_task(
            self._db_tx_to_intel(intel, tx)
        ))
        _db.on_new_user(lambda ur: asyncio.create_task(
            self._db_user_to_intel(intel, ur)
        ))

        # ── wire Knowledge callbacks ──────────────────────────────────────
        _knowledge.on_new_fact(lambda fact: asyncio.create_task(
            self._fact_to_intel(intel, fact)
        ))

        # ── inject into FounderWatch ──────────────────────────────────────
        _founder.inject(
            db_connector     = _db,
            pi_connector     = _pi,
            action_connector = _actions,
        )

        # ── inject everything into AutonomousDecisions ────────────────────
        _autonomous.inject(
            guardian   = guardian,
            enforcer   = enforcer,
            brainstorm = brainstorm,
            intel      = intel,
            warp       = warp,
            mesh       = mesh,
            founder    = _founder,
            actions    = _actions,
            pi         = _pi,
            db         = _db,
            knowledge  = _knowledge,
        )

        # ── wire FounderWatch events → Guardian ──────────────────────────
        _founder.on_event(lambda ev: asyncio.create_task(
            self._founder_event_to_guardian(guardian, ev)
        ))

        # ── start all connectors ──────────────────────────────────────────
        _actions   # stateless — no start needed
        _pi.start()
        _db.start()
        _knowledge.start()
        _founder.start()
        _autonomous.start()

        self._is_running = True
        log.info(
            "Sovereign Connector Orchestrator ONLINE\n"
            "Connectors: PiNetwork | TriumphDB | OutboundActions | "
            "KnowledgeFeed | FounderWatch | AutonomousDecisions\n"
            "Cross-wiring: Pi→Intel | Pi→Guardian | Pi→ProtocolUpgrade | "
            "DB→Intel | DB→Guardian | Knowledge→Intel | "
            "FounderWatch→Guardian | Autonomous→All"
        )

    # ── status ────────────────────────────────────────────────────────────

    def status(self) -> dict:
        return {
            "running":     self._is_running,
            "uptime_s":    round(time.time() - self._started_at, 1) if self._started_at else 0,
            "connectors": {
                "pi_network":          self.pi.stats()         if self.pi         else None,
                "triumph_db":          self.db.stats()         if self.db         else None,
                "outbound_actions":    self.actions.stats()    if self.actions    else None,
                "knowledge_feed":      self.knowledge.stats()  if self.knowledge  else None,
                "founder_watch":       self.founder.stats()    if self.founder    else None,
                "autonomous_decisions": self.autonomous.stats() if self.autonomous else None,
            },
        }

    # ── callback implementations ──────────────────────────────────────────

    @staticmethod
    async def _pi_tx_to_intel(intel, guardian, tx) -> None:
        try:
            from ..intelligence import Signal as IntelSignal
            severity = min(1.0, tx.amount / 5000.0)
            sig = IntelSignal(
                source="pi_network",
                entity_id=tx.from_addr or tx.to_addr,
                signal_type="transaction",
                value=severity,
                confidence=0.95,
                metadata={
                    "txid":      tx.txid,
                    "amount":    tx.amount,
                    "direction": tx.tx_type.value,
                    "to":        tx.to_addr,
                },
            )
            intel.ingest_signal(sig)
        except Exception as exc:
            log.debug("Pi tx → intel error: %s", exc)

        try:
            if tx.amount > 500:
                from ..guardian import ThreatIndicator, ProtectionCategory
                ind = ThreatIndicator(
                    source="pi_network",
                    category=ProtectionCategory.FINANCIAL_INTEGRITY,
                    severity=min(1.0, tx.amount / 2000.0),
                    description=f"Large Pi transaction: {tx.amount:.2f} Pi  txid={tx.txid[:16]}",
                    metadata={"txid": tx.txid, "amount": tx.amount},
                )
                guardian.ingest(ind)
        except Exception as exc:
            log.debug("Pi tx → guardian error: %s", exc)

    @staticmethod
    async def _pi_balance_to_guardian(guardian, ws, delta) -> None:
        try:
            if delta < -50:
                from ..guardian import ThreatIndicator, ProtectionCategory
                ind = ThreatIndicator(
                    source="pi_network",
                    category=ProtectionCategory.FINANCIAL_INTEGRITY,
                    severity=min(1.0, abs(delta) / 500.0),
                    description=f"Pi balance dropped {abs(delta):.2f}  new={ws.balance:.4f}",
                    metadata={"delta": delta, "balance": ws.balance, "wallet": ws.address[:12]},
                )
                guardian.ingest(ind)
        except Exception as exc:
            log.debug("Pi balance → guardian error: %s", exc)

    @staticmethod
    async def _pi_payment_to_intel(intel, pmt) -> None:
        try:
            from ..intelligence import Signal as IntelSignal
            sig = IntelSignal(
                source="pi_platform",
                entity_id=pmt.get("user_uid", pmt.get("identifier", "unknown")),
                signal_type="payment",
                value=min(1.0, float(pmt.get("amount", 0)) / 1000.0),
                confidence=0.90,
                metadata=pmt,
            )
            intel.ingest_signal(sig)
        except Exception as exc:
            log.debug("Pi payment → intel error: %s", exc)

    @staticmethod
    async def _db_anomaly_to_intel(intel, guardian, atype, detail) -> None:
        severity_map = {
            "auth_brute_force":        0.80,
            "concurrent_sessions":     0.55,
            "high_risk_user":          0.70,
            "very_large_transaction":  0.75,
            "compliance_flag_critical": 0.90,
            "service_error_spike":     0.50,
        }
        sev = severity_map.get(atype, 0.50)
        try:
            from ..intelligence import Signal as IntelSignal
            sig = IntelSignal(
                source="triumph_db",
                entity_id=detail.get("user_id", atype),
                signal_type="anomaly",
                value=sev,
                confidence=0.85,
                metadata={"anomaly_type": atype, **detail},
            )
            intel.ingest_signal(sig)
        except Exception as exc:
            log.debug("DB anomaly → intel error: %s", exc)

        try:
            from ..guardian import ThreatIndicator, ProtectionCategory
            cat_map = {
                "auth_brute_force":        ProtectionCategory.DIGITAL_INTRUSION,
                "concurrent_sessions":     ProtectionCategory.OPERATIONAL_SECURITY,
                "high_risk_user":          ProtectionCategory.FINANCIAL_INTEGRITY,
                "very_large_transaction":  ProtectionCategory.FINANCIAL_INTEGRITY,
                "compliance_flag_critical": ProtectionCategory.FINANCIAL_INTEGRITY,
                "service_error_spike":     ProtectionCategory.INFRASTRUCTURE,
            }
            cat = cat_map.get(atype, ProtectionCategory.DIGITAL_INTRUSION)
            ind = ThreatIndicator(
                source="triumph_db",
                category=cat,
                severity=sev,
                description=f"DB anomaly: {atype}",
                metadata=detail,
            )
            guardian.ingest(ind)
        except Exception as exc:
            log.debug("DB anomaly → guardian error: %s", exc)

    @staticmethod
    async def _db_tx_to_intel(intel, tx) -> None:
        try:
            from ..intelligence import Signal as IntelSignal
            sig = IntelSignal(
                source="triumph_db",
                entity_id=tx.user_id,
                signal_type="financial",
                value=min(1.0, tx.amount_pi / 2000.0),
                confidence=0.88,
                metadata={
                    "tx_id":    tx.tx_id,
                    "amount":   tx.amount_pi,
                    "direction": tx.direction,
                },
            )
            intel.ingest_signal(sig)
        except Exception as exc:
            log.debug("DB tx → intel error: %s", exc)

    @staticmethod
    async def _db_user_to_intel(intel, ur) -> None:
        try:
            if ur.risk_score >= 0.5:
                from ..intelligence import Signal as IntelSignal
                sig = IntelSignal(
                    source="triumph_db",
                    entity_id=ur.user_id,
                    signal_type="user_risk",
                    value=ur.risk_score,
                    confidence=0.80,
                    metadata={"kyc_status": ur.kyc_status, "flagged": ur.flagged},
                )
                intel.ingest_signal(sig)
        except Exception as exc:
            log.debug("DB user → intel error: %s", exc)

    @staticmethod
    async def _fact_to_intel(intel, fact) -> None:
        try:
            if fact.severity >= 0.6:
                from ..intelligence import Signal as IntelSignal
                sig = IntelSignal(
                    source=f"knowledge:{fact.source}",
                    entity_id=fact.fact_id,
                    signal_type=fact.domain,
                    value=fact.severity,
                    confidence=fact.confidence,
                    metadata={
                        "title": fact.title[:100],
                        "tags":  fact.tags,
                    },
                )
                intel.ingest_signal(sig)
        except Exception as exc:
            log.debug("Fact → intel error: %s", exc)

    @staticmethod
    async def _founder_event_to_guardian(guardian, event) -> None:
        try:
            from ..guardian import ThreatIndicator, ProtectionCategory
            from .founder_watch import FounderAlertLevel
            sev = min(1.0, event.level / 5.0)
            ind = ThreatIndicator(
                source="founder_watch",
                category=ProtectionCategory.FOUNDER_SAFETY,
                severity=sev,
                description=event.description,
                metadata=event.evidence,
            )
            guardian.ingest(ind)
        except Exception as exc:
            log.debug("FounderWatch → guardian error: %s", exc)

    @staticmethod
    async def _pi_protocol_upgrade_to_all(
        intel, guardian, actions, autonomous, info: dict
    ) -> None:
        """
        Fired whenever Pi Network upgrades its stellar-core, Horizon, or
        ledger protocol version.  Propagates a HIGH-severity signal to
        every layer of the sovereign stack so the ecosystem reacts in sync.
        """
        changes   = info.get("changes", {})
        prev      = info.get("previous", {})
        net_proto = info.get("network_protocol", 0)
        core_ver  = info.get("core_version", "")
        horizon_v = info.get("horizon_version", "")

        # Build a human-readable summary of what changed
        parts: list[str] = []
        if "core" in changes:
            c = changes["core"]
            parts.append(f"stellar-core {c['from']}→{c['to']}")
        if "horizon" in changes:
            c = changes["horizon"]
            parts.append(f"Horizon {c['from']}→{c['to']}")
        if "network_protocol" in changes:
            c = changes["network_protocol"]
            parts.append(f"ledger-protocol {c['from']}→{c['to']}")
        summary = "Pi Network protocol upgraded: " + " | ".join(parts) if parts else "Pi Network version change"

        log.warning("[PROTOCOL UPGRADE] %s", summary)

        # 1. Intel — infrastructure-class signal, severity 0.95
        try:
            from ..intelligence import Signal as IntelSignal
            sig = IntelSignal(
                source="pi_network",
                entity_id="pi_mainnet_protocol",
                signal_type="protocol_upgrade",
                value=0.95,
                confidence=1.0,
                metadata={
                    "summary":          summary,
                    "changes":          changes,
                    "core_version":     core_ver,
                    "horizon_version":  horizon_v,
                    "network_protocol": net_proto,
                    "previous":         prev,
                },
            )
            intel.ingest_signal(sig)
        except Exception as exc:
            log.debug("Protocol upgrade → intel error: %s", exc)

        # 2. Guardian — INFRASTRUCTURE category, threshold-crossing alert
        try:
            from ..guardian import ThreatIndicator, ProtectionCategory
            ind = ThreatIndicator(
                source="pi_network",
                category=ProtectionCategory.INFRASTRUCTURE,
                severity=0.90,
                description=summary,
                metadata=info,
            )
            guardian.ingest(ind)
        except Exception as exc:
            log.debug("Protocol upgrade → guardian error: %s", exc)

        # 3. Outbound — broadcast critical alert to Discord / Slack
        try:
            await actions.broadcast_critical_alert(
                source="pi_network",
                title="[PI MAINNET] Protocol Upgrade Detected",
                body=summary,
                metadata={
                    "changes":  changes,
                    "previous": prev,
                    "network_protocol": net_proto,
                },
            )
        except Exception as exc:
            log.debug("Protocol upgrade → broadcast error: %s", exc)

        # 4. Autonomous decisions — inject as high-urgency strategic signal
        try:
            autonomous.inject(
                source="pi_protocol_upgrade",
                decision_type="STRATEGIC",
                title=f"Pi Mainnet Protocol Upgrade: {summary}",
                confidence=0.95,
                urgency=0.90,
                risk=0.70,
                metadata=info,
            )
        except Exception as exc:
            log.debug("Protocol upgrade → autonomous error: %s", exc)


# ── singleton ─────────────────────────────────────────────────────────────────
orchestrator = SovereignConnectorOrchestrator()
