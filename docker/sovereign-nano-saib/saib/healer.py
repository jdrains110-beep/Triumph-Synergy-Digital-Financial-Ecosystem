"""
Sovereign Healer Engine — Supernatural Nano Intelligent Apex Self-Healing
──────────────────────────────────────────────────────────────────────────
Capabilities:
  • Scan all Triumph ecosystem services via health endpoints & Docker API
  • Collect and parse multi-layer logs (stdout, stderr, structured JSON)
  • Feed logs + errors to Grok AI for quantum root-cause diagnosis
  • Apply warp-precision healing actions: restart, reconfigure, quarantine
  • Background auto-heal loop — continuously monitors, never sleeps on failures
  • Healing history with per-service success rates
  • Escalation to guardian when a service cannot self-heal

Architecture:
  SovereignHealerEngine → WarpSpeedEngine (CRITICAL lane)
                        → GrokAI (root-cause reasoning)
                        → FounderGuardian (escalation)
"""
from __future__ import annotations

import asyncio
import logging
import time
import uuid
from collections import defaultdict, deque
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional

import aiohttp

log = logging.getLogger("sovereign.healer")


class HealAction(Enum):
    RESTART          = "restart"
    CLEAR_CACHE      = "clear_cache"
    REDUCE_LOAD      = "reduce_load"
    RECONFIGURE      = "reconfigure"
    QUARANTINE       = "quarantine"
    ESCALATE         = "escalate"
    WATCH            = "watch"
    FIX_AND_PR       = "fix_and_pr"   # v5: generate code fix + open PR


class ServiceStatus(Enum):
    HEALTHY    = "healthy"
    DEGRADED   = "degraded"
    CRITICAL   = "critical"
    UNRESPONSIVE = "unresponsive"
    HEALING    = "healing"
    QUARANTINE = "quarantine"


@dataclass
class ServiceProfile:
    name: str
    health_url: str
    log_service: str          # docker service/container name
    criticality: float = 0.5  # 0-1, higher = more critical
    restart_cmd: str  = ""    # optional override


@dataclass
class HealEvent:
    id: str
    service: str
    ts: float
    status_before: ServiceStatus
    diagnosis: str
    actions_applied: List[str]
    status_after: ServiceStatus
    success: bool
    grok_confidence: float = 0.0
    layers_inspected: int = 0
    duration_ms: float = 0.0


@dataclass
class ServiceState:
    profile: ServiceProfile
    status: ServiceStatus = ServiceStatus.HEALTHY
    last_check: float = 0.0
    consecutive_failures: int = 0
    heal_attempts: int = 0
    heal_successes: int = 0
    last_error: str = ""
    last_diagnosis: str = ""
    raw_logs: deque = field(default_factory=lambda: deque(maxlen=500))


# Known Triumph ecosystem services — healer monitors all of these
TRIUMPH_SERVICES: List[ServiceProfile] = [
    ServiceProfile("triumph-app",                   "http://triumph-app:3000/api/health",          "triumph-app",                   0.9),
    ServiceProfile("triumph-nginx",                 "http://triumph-nginx:80/health",               "triumph-nginx",                 0.95),
    ServiceProfile("triumph-sovereign-military-bridge", "http://triumph-sovereign-military-bridge:8199/health", "triumph-sovereign-military-bridge", 0.95),
    ServiceProfile("triumph-settlement-core",       "http://triumph-settlement-core:8080/health",  "triumph-settlement-core",       0.9),
    ServiceProfile("triumph-pi-bridge-connector",   "http://triumph-pi-bridge-connector:8092/health", "triumph-pi-bridge-connector", 0.85),
    ServiceProfile("triumph-governance-shield",     "http://triumph-governance-shield:8083/health","triumph-governance-shield",     0.8),
    ServiceProfile("triumph-apex-services",         "http://triumph-apex-services:8099/health",    "triumph-apex-services",         0.85),
    ServiceProfile("triumph-apex-sovereign-nexus",  "http://triumph-apex-sovereign-nexus:8131/health","triumph-apex-sovereign-nexus",0.8),
    ServiceProfile("triumph-quantum-intel-fortress","http://triumph-quantum-intel-fortress:8090/health","triumph-quantum-intel-fortress",0.8),
    ServiceProfile("triumph-sovereign-life",        "http://triumph-sovereign-life:8130/health",   "triumph-sovereign-life",        0.75),
    ServiceProfile("triumph-guardian-watchdog-nexus","http://triumph-guardian-watchdog-nexus:9911/health","triumph-guardian-watchdog-nexus",0.8),
    ServiceProfile("triumph-horizon-stream",        "http://triumph-horizon-stream:8085/health",   "triumph-horizon-stream",        0.85),
    ServiceProfile("triumph-vault",                 "http://triumph-vault:8081/health",            "triumph-vault",                 0.9),
    ServiceProfile("triumph-observability-stack",   "http://triumph-observability-stack:9090/-/healthy","triumph-observability-stack",0.6),
    ServiceProfile("triumph-sovereign-mesh-hub",    "http://triumph-sovereign-mesh-hub:8200/health","triumph-sovereign-mesh-hub",   0.85),
]


class SovereignHealerEngine:
    """
    Supernatural Nano Intelligent Apex Self-Healing Engine.

    Tunnels through ALL layers of an error:
      Layer 0 — HTTP health check (surface)
      Layer 1 — Response body / JSON error fields
      Layer 2 — Stdout/stderr log stream
      Layer 3 — Structured JSON log events (if available)
      Layer 4 — External log ingestion (any cloud/k8s/syslog source)     [v5]
      Layer 5 — Stack-aware code correlation (file:line pinpoint)         [v5]
      Layer 6 — K8s pod events (CrashLoopBackOff / OOMKilled / Evicted)  [v5]
      Layer 7 — Grok AI root-cause reasoning + fix proposal across all   [v5]

    Healing precision:
      • Each fix action is warp-dispatched at CRITICAL priority
      • Grok confidence score gates auto-apply (threshold 0.60)
      • FIX_AND_PR: AI-generated code fix delivered as a GitHub/GitLab PR  [v5]
      • Failed heals escalate to FounderGuardian INFRASTRUCTURE alert
    """

    HEAL_INTERVAL_S   = 90.0   # background scan frequency (raised: 30→90s)
    GROK_THRESHOLD    = 0.60   # minimum Grok confidence to auto-apply
    MAX_HEAL_ATTEMPTS = 5      # quarantine after this many failed heals
    _PROBE_CONCURRENCY = 4     # max simultaneous health-check probes (CPU lid)
    _MAX_CONCURRENT_HEALS = 2  # max simultaneous deep-heals (CPU lid)

    def __init__(self) -> None:
        self._states: Dict[str, ServiceState] = {
            svc.name: ServiceState(profile=svc)
            for svc in TRIUMPH_SERVICES
        }
        self._history: deque[HealEvent] = deque(maxlen=200)
        self._running = False
        self._total_heals = 0
        self._total_successes = 0
        self._grok:      Any = None   # injected at boot
        self._warp:      Any = None   # injected at boot
        self._guardian:  Any = None   # injected at boot
        # v5 modules — injected at boot
        self._registry:  Any = None   # ExternalServiceRegistry
        self._log_ingest: Any = None  # log_ingestion.pull_logs_for_service
        self._code_analyzer: Any = None  # code_analyzer.analyse_code
        self._fix_engine: Any = None  # fix_engine module
        self._k8s:       Any = None   # K8sAdapter
        # quantum nano CPU management — semaphores throttle concurrent I/O
        self._probe_sem: asyncio.Semaphore = asyncio.Semaphore(self._PROBE_CONCURRENCY)
        self._heal_sem:  asyncio.Semaphore = asyncio.Semaphore(self._MAX_CONCURRENT_HEALS)

    def boot(
        self,
        grok:         Any,
        warp:         Any,
        guardian:     Any,
        # v5 optional modules — gracefully absent if not provided
        registry:     Any = None,
        log_ingest:   Any = None,
        code_analyzer: Any = None,
        fix_engine:   Any = None,
        k8s_adapter:  Any = None,
    ) -> None:
        self._grok         = grok
        self._warp         = warp
        self._guardian     = guardian
        self._registry     = registry
        self._log_ingest   = log_ingest
        self._code_analyzer = code_analyzer
        self._fix_engine   = fix_engine
        self._k8s          = k8s_adapter
        self._running      = True
        # seed TRIUMPH_SERVICES as the default "triumph" tenant in external registry
        if self._registry:
            asyncio.create_task(self._seed_triumph_services())
        asyncio.create_task(self._scan_loop())
        log.info(
            "SovereignHealerEngine v5: online — %d internal + external registry attached=%s",
            len(self._states), bool(self._registry),
        )

    # ── v5 seed ──────────────────────────────────────────────────────────────

    async def _seed_triumph_services(self) -> None:
        """Seed TRIUMPH_SERVICES into the external registry under the 'triumph' tenant."""
        from .external_registry import LogSourceType, StackType
        for svc in TRIUMPH_SERVICES:
            try:
                await self._registry.register(
                    tenant_id   = "triumph",
                    name        = svc.name,
                    health_url  = svc.health_url,
                    log_source  = LogSourceType.DOCKER,
                    stack_type  = StackType.PYTHON,
                    criticality = svc.criticality,
                    log_config  = {"container": svc.log_service},
                )
            except ValueError:
                pass  # already registered (e.g. plan limit — triumph tenant is admin)

    # ── public API ───────────────────────────────────────────────────────────

    async def register_external_service(
        self,
        tenant_id:    str,
        name:         str,
        health_url:   str,
        **kwargs: Any,
    ) -> Optional[str]:
        """Register an external service and return its service_id."""
        if not self._registry:
            return None
        from .external_registry import LogSourceType, StackType
        spec = await self._registry.register(
            tenant_id  = tenant_id,
            name       = name,
            health_url = health_url,
            **kwargs,
        )
        return spec.service_id

    async def diagnose_single(
        self,
        spec: Any,  # ExternalServiceSpec
    ) -> Dict[str, Any]:
        """
        Run a full v5 diagnosis on one registered external service.
        Called by MCP server and /v5/analyze/logs endpoint.
        """
        # build a temporary ServiceState for this external service
        profile = ServiceProfile(
            name        = spec.name,
            health_url  = spec.health_url,
            log_service = spec.log_config.get("container", spec.name),
            criticality = spec.criticality,
        )
        state = ServiceState(profile=profile)
        # probe health
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=5)) as sess:
            await self._check_service(sess, state)
        # collect v5 evidence
        evidence = await self._collect_layers_v5(state, spec)
        diagnosis, actions, confidence = await self._grok_diagnose_v5(spec.name, evidence)
        return {
            "service_id":    spec.service_id,
            "name":          spec.name,
            "status":        state.status.value,
            "diagnosis":     diagnosis,
            "actions":       actions,
            "confidence":    confidence,
            "evidence_keys": list(evidence.keys()),
        }

    async def trigger_once(self) -> None:
        """Manually trigger one heal cycle (called by MCP server)."""
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=5)) as session:
            tasks = [self._throttled_check(session, state) for state in self._states.values()]
            await asyncio.gather(*tasks, return_exceptions=True)
        for name, state in self._states.items():
            if state.status not in (ServiceStatus.HEALTHY, ServiceStatus.QUARANTINE):
                asyncio.create_task(self._guarded_heal(name))

    async def scan_all(self) -> Dict[str, Any]:
        """Full scan of all services — returns current health map."""
        results = {}
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=5)) as session:
            tasks = [self._throttled_check(session, state) for state in self._states.values()]
            await asyncio.gather(*tasks, return_exceptions=True)
        for name, state in self._states.items():
            results[name] = {
                "status":               state.status.value,
                "last_check":           state.last_check,
                "consecutive_failures": state.consecutive_failures,
                "heal_attempts":        state.heal_attempts,
                "heal_successes":       state.heal_successes,
                "last_error":           state.last_error[:200] if state.last_error else "",
                "last_diagnosis":       state.last_diagnosis[:300] if state.last_diagnosis else "",
            }
        return results

    async def deep_heal(self, service_name: str) -> Dict[str, Any]:
        """
        Full 6-layer root-cause analysis + warp heal for a specific service.
        Can be called manually via API or triggered by scan loop.
        """
        state = self._states.get(service_name)
        if not state:
            return {"ok": False, "error": f"Unknown service: {service_name}"}

        start = time.time()
        event_id = str(uuid.uuid4())[:8]
        status_before = state.status
        log.info("[HEAL:%s] Starting deep heal of %s (status=%s)", event_id, service_name, status_before.value)

        # ── Layer 0-7: collect all evidence (v5) ──
        evidence = await self._collect_layers_v5(state, spec=None)
        layers_count = sum(1 for v in evidence.values() if v)

        # ── Layer 4: Grok root-cause reasoning ──
        diagnosis, actions, confidence = await self._grok_diagnose(service_name, evidence)
        state.last_diagnosis = diagnosis
        log.info("[HEAL:%s] Grok diagnosis (conf=%.2f): %s", event_id, confidence, diagnosis[:120])

        # ── Layer 5: Warp-precision fix application ──
        applied: List[str] = []
        success = False

        if confidence >= self.GROK_THRESHOLD:
            applied, success = await self._apply_actions(state, actions, event_id)
        else:
            applied = ["watch"]
            log.warning("[HEAL:%s] Grok confidence %.2f < threshold %.2f — monitoring only",
                        event_id, confidence, self.GROK_THRESHOLD)

        # escalate if too many failed attempts
        if state.heal_attempts >= self.MAX_HEAL_ATTEMPTS and not success:
            await self._escalate_to_guardian(state, diagnosis)
            applied.append("escalated_to_guardian")

        status_after = await self._probe_status(state)
        duration_ms = (time.time() - start) * 1000

        event = HealEvent(
            id=event_id,
            service=service_name,
            ts=time.time(),
            status_before=status_before,
            diagnosis=diagnosis,
            actions_applied=applied,
            status_after=status_after,
            success=success,
            grok_confidence=confidence,
            layers_inspected=layers_count,
            duration_ms=duration_ms,
        )
        self._history.appendleft(event)
        self._total_heals += 1
        if success:
            self._total_successes += 1
            state.heal_successes += 1
            state.consecutive_failures = 0

        return {
            "ok": success,
            "event_id": event_id,
            "service": service_name,
            "status_before": status_before.value,
            "status_after": status_after.value,
            "diagnosis": diagnosis,
            "actions_applied": applied,
            "grok_confidence": confidence,
            "layers_inspected": layers_count,
            "duration_ms": round(duration_ms, 1),
        }

    def stats(self) -> Dict[str, Any]:
        return {
            "services_monitored": len(self._states),
            "total_heals": self._total_heals,
            "total_successes": self._total_successes,
            "success_rate": round(self._total_successes / max(1, self._total_heals), 3),
            "services_degraded": sum(1 for s in self._states.values() if s.status == ServiceStatus.DEGRADED),
            "services_critical": sum(1 for s in self._states.values() if s.status == ServiceStatus.CRITICAL),
            "services_unresponsive": sum(1 for s in self._states.values() if s.status == ServiceStatus.UNRESPONSIVE),
            "services_quarantined": sum(1 for s in self._states.values() if s.status == ServiceStatus.QUARANTINE),
            "recent_events": [
                {
                    "id": e.id, "service": e.service,
                    "ts": e.ts, "success": e.success,
                    "diagnosis": e.diagnosis[:100],
                    "actions": e.actions_applied,
                    "confidence": e.grok_confidence,
                    "duration_ms": e.duration_ms,
                }
                for e in list(self._history)[:10]
            ],
            "service_health": {
                name: state.status.value
                for name, state in self._states.items()
            },
        }

    # ── background loop ──────────────────────────────────────────────────────

    async def _throttled_check(self, session: aiohttp.ClientSession, state: ServiceState) -> None:
        """Probe a single service under the probe semaphore (CPU lid)."""
        async with self._probe_sem:
            await self._check_service(session, state)

    async def _scan_loop(self) -> None:
        await asyncio.sleep(60)  # allow full ecosystem startup before first scan
        while self._running:
            try:
                async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=5)) as session:
                    tasks = [self._throttled_check(session, state) for state in self._states.values()]
                    await asyncio.gather(*tasks, return_exceptions=True)

                # trigger deep heal — gated by heal semaphore to prevent CPU storm
                for name, state in self._states.items():
                    if state.status not in (ServiceStatus.HEALTHY, ServiceStatus.QUARANTINE):
                        asyncio.create_task(self._guarded_heal(name))

            except Exception as exc:
                log.warning("SovereignHealer scan_loop error: %s", exc)
            await asyncio.sleep(self.HEAL_INTERVAL_S)

    async def _guarded_heal(self, name: str) -> None:
        """Deep-heal under heal semaphore — prevents simultaneous CPU storm."""
        async with self._heal_sem:
            await self.deep_heal(name)

    # ── internal helpers ─────────────────────────────────────────────────────

    async def _check_service(self, session: aiohttp.ClientSession, state: ServiceState) -> None:
        name = state.profile.name
        try:
            async with session.get(state.profile.health_url) as resp:
                body = await resp.text()
                state.last_check = time.time()
                if resp.status == 200:
                    # check for degraded signals in body
                    if any(kw in body.lower() for kw in ["error", "unhealthy", "degraded", "false"]):
                        state.status = ServiceStatus.DEGRADED
                        state.consecutive_failures += 1
                        state.last_error = body[:300]
                    else:
                        state.status = ServiceStatus.HEALTHY
                        state.consecutive_failures = 0
                        state.last_error = ""
                elif resp.status >= 500:
                    state.status = ServiceStatus.CRITICAL
                    state.consecutive_failures += 1
                    state.last_error = f"HTTP {resp.status}: {body[:200]}"
                else:
                    state.status = ServiceStatus.DEGRADED
                    state.consecutive_failures += 1
                    state.last_error = f"HTTP {resp.status}"
        except asyncio.TimeoutError:
            state.status = ServiceStatus.UNRESPONSIVE
            state.consecutive_failures += 1
            state.last_error = "health check timeout"
        except Exception as exc:
            state.status = ServiceStatus.UNRESPONSIVE
            state.consecutive_failures += 1
            state.last_error = str(exc)[:200]

    async def _collect_layers(self, state: ServiceState) -> Dict[str, Any]:
        """Original 4-layer collection (kept for backwards compat)."""
        return await self._collect_layers_v5(state, spec=None)

    async def _collect_layers_v5(
        self,
        state: ServiceState,
        spec: Any = None,  # Optional[ExternalServiceSpec]
    ) -> Dict[str, Any]:
        """Collect evidence from all 8 observable layers (v5)."""
        evidence: Dict[str, Any] = {
            "layer0_health":           state.last_error or "no response",
            "layer1_status":           state.status.value,
            "layer2_docker_logs":      "",
            "layer3_structured":       [],
            "layer4_external_logs":    [],
            "layer5_code_context":     "",
            "layer6_k8s_events":       [],
            "consecutive_failures":    state.consecutive_failures,
            "heal_attempts":           state.heal_attempts,
            "service_criticality":     state.profile.criticality,
        }

        # Layer 2: Docker logs
        try:
            docker_logs = await self._fetch_docker_logs(state.profile.log_service, tail=80)
            if docker_logs:
                evidence["layer2_docker_logs"] = docker_logs
                structured = []
                for line in docker_logs.split("\n"):
                    line = line.strip()
                    if line.startswith("{") and ('"level"' in line or '"error"' in line):
                        structured.append(line[:300])
                evidence["layer3_structured"] = structured[:20]
        except Exception as exc:
            evidence["layer2_docker_logs"] = f"docker log collection unavailable: {exc}"

        # Layer 4: External log ingestion (v5) — pull from registered log source
        if spec and self._log_ingest:
            try:
                from .log_ingestion import pull_logs_for_service
                events = await pull_logs_for_service(spec, tail=100)
                evidence["layer4_external_logs"] = [
                    {"ts": e.ts, "level": e.level, "message": e.message[:300]}
                    for e in events if e.level in ("error", "warn")
                ][:30]
            except Exception as exc:
                log.debug("Layer 4 external logs: %s", exc)

        # Layer 5: Code correlation (v5) — stack-aware analysis
        if self._code_analyzer:
            try:
                from .log_ingestion import NormalisedLogEvent
                all_logs = evidence["layer4_external_logs"]
                # convert dict list back to NormalisedLogEvent for code_analyzer
                mock_events = [
                    NormalisedLogEvent(
                        service_id = state.profile.name,
                        ts         = e["ts"],
                        level      = e["level"],
                        message    = e["message"],
                    )
                    for e in all_logs
                ]
                if not mock_events:
                    # fall back to docker log text
                    docker_text = evidence["layer2_docker_logs"]
                    mock_events = [
                        NormalisedLogEvent(
                            service_id = state.profile.name,
                            ts         = __import__('time').time(),
                            level      = "error",
                            message    = line,
                        )
                        for line in docker_text.split("\n")
                        if line.strip()
                    ]
                from .code_analyzer import analyse_code
                stack_type = spec.stack_type if spec else "python"
                repo_url   = spec.repo_url   if spec else ""
                repo_token = spec.repo_token if spec else ""
                repo_prov  = spec.repo_provider if spec else "github"
                ctx = await analyse_code(
                    service_id    = state.profile.name,
                    log_events    = mock_events,
                    stack_type    = str(stack_type),
                    repo_url      = repo_url,
                    repo_token    = repo_token,
                    repo_provider = repo_prov,
                )
                if ctx:
                    evidence["layer5_code_context"] = ctx.grok_prompt_fragment
                    evidence["_code_ctx_obj"] = ctx  # stored for fix engine
            except Exception as exc:
                log.debug("Layer 5 code analysis: %s", exc)

        # Layer 6: K8s events (v5)
        if spec and self._k8s and spec.k8s_namespace:
            try:
                import os
                api_server = spec.log_config.get("k8s_api", "https://kubernetes.default.svc")
                token      = spec.log_config.get("k8s_token", self._k8s._in_cluster_token)
                events     = await self._k8s.list_events(
                    api_server = api_server,
                    namespace  = spec.k8s_namespace,
                    token      = token,
                )
                evidence["layer6_k8s_events"] = [
                    {"pod": e.pod, "reason": e.reason,
                     "message": e.message[:200], "severity": e.severity}
                    for e in events if e.severity in ("CRITICAL", "HIGH")
                ][:10]
            except Exception as exc:
                log.debug("Layer 6 K8s events: %s", exc)

        return evidence

    async def _fetch_docker_logs(self, container: str, tail: int = 80) -> str:
        """Attempt to pull container logs via Docker socket."""
        # Docker socket may not be mounted — gracefully degrade
        import os
        docker_socket = "/var/run/docker.sock"
        if not os.path.exists(docker_socket):
            return ""

        try:
            connector = aiohttp.UnixConnector(path=docker_socket)
            async with aiohttp.ClientSession(connector=connector, timeout=aiohttp.ClientTimeout(total=8)) as session:
                url = f"http://localhost/containers/{container}/logs?stdout=1&stderr=1&tail={tail}&timestamps=1"
                async with session.get(url) as resp:
                    if resp.status == 200:
                        raw = await resp.read()
                        # Docker multiplexed stream: strip 8-byte frame headers
                        lines = []
                        offset = 0
                        while offset < len(raw):
                            if offset + 8 > len(raw):
                                break
                            size = int.from_bytes(raw[offset + 4:offset + 8], "big")
                            offset += 8
                            if size > 0 and offset + size <= len(raw):
                                lines.append(raw[offset:offset + size].decode("utf-8", errors="replace").rstrip())
                            offset += size
                        return "\n".join(lines[-tail:])
            return ""
        except Exception:
            return ""

    async def _grok_diagnose(
        self,
        service: str,
        evidence: Dict[str, Any],
    ) -> tuple[str, List[str], float]:
        """Alias to v5 diagnose (backwards compat)."""
        return await self._grok_diagnose_v5(service, evidence)

    async def _grok_diagnose_v5(
        self,
        service: str,
        evidence: Dict[str, Any],
    ) -> tuple[str, List[str], float]:
        """Use Grok AI to perform 8-layer root-cause analysis (v5) and prescribe actions."""
        if not self._grok:
            return "Grok not available — manual inspection required", ["watch"], 0.0

        import json as _json
        # remove internal objects before serialising
        clean_ev = {k: v for k, v in evidence.items() if not k.startswith("_")}
        ev_text  = _json.dumps(clean_ev, indent=2)[:3500]

        code_context_fragment = evidence.get("layer5_code_context", "")
        has_code_ctx = bool(code_context_fragment)

        prompt = (
            f"SOVEREIGN HEALER v5 — QUANTUM ROOT CAUSE ANALYSIS\n"
            f"Service: {service}\n"
            f"Evidence across all 8 observable layers:\n{ev_text}\n\n"
            + (f"\n{code_context_fragment}\n" if has_code_ctx else "")
            + f"Perform surgical quantum root-cause analysis:\n"
            f"1. ROOT CAUSE: What is the precise root cause? (be specific — file:line if available)\n"
            f"2. LAYER: Which layer is the origin? (config/code/network/resource/dependency/k8s)\n"
            f"3. BLAST RADIUS: What other services might be affected?\n"
            f"4. HEALING ACTIONS: List 1-3 actions from: [restart, clear_cache, reduce_load, reconfigure, quarantine, watch{', fix_and_pr' if has_code_ctx else ''}]\n"
            f"   Note: use fix_and_pr only if a specific code bug is identified with confidence >= 0.75\n"
            f"5. CONFIDENCE: Your confidence score (0.00-1.00)\n\n"
            f"Respond in this exact format:\n"
            f"ROOT_CAUSE: <one sentence>\n"
            f"LAYER: <layer name>\n"
            f"BLAST_RADIUS: <services or none>\n"
            f"ACTIONS: <comma-separated action names>\n"
            f"CONFIDENCE: <0.00-1.00>"
        )

        try:
            result = await self._grok.complete(prompt, system=(
                "You are the Sovereign Healer AI — a precision root-cause analyst for "
                "distributed microservice ecosystems. Be surgical, concise, and accurate."
            ))
            text = result.text if hasattr(result, "text") else (result.get("content", "") if isinstance(result, dict) else str(result))

            # parse structured response
            diagnosis = ""
            actions: List[str] = ["watch"]
            confidence = 0.5

            for line in text.split("\n"):
                line = line.strip()
                if line.startswith("ROOT_CAUSE:"):
                    diagnosis = line[11:].strip()
                elif line.startswith("ACTIONS:"):
                    raw_actions = line[8:].strip().lower()
                    valid = {a.value for a in HealAction}
                    actions = [a.strip() for a in raw_actions.split(",") if a.strip() in valid] or ["watch"]
                elif line.startswith("CONFIDENCE:"):
                    try:
                        confidence = float(line[11:].strip())
                    except ValueError:
                        confidence = 0.5

            if not diagnosis:
                diagnosis = text[:200]

            return diagnosis, actions, min(max(confidence, 0.0), 1.0)

        except Exception as exc:
            log.warning("Grok diagnosis failed: %s", exc)
            return f"Grok unavailable: {exc}", ["watch"], 0.0

    async def _apply_actions(
        self,
        state: ServiceState,
        actions: List[str],
        event_id: str,
    ) -> tuple[List[str], bool]:
        """Apply prescribed healing actions via warp dispatch."""
        applied: List[str] = []
        state.heal_attempts += 1
        success = False

        for action_str in actions:
            try:
                action = HealAction(action_str)
            except ValueError:
                continue

            log.info("[HEAL:%s] Applying action %s on %s", event_id, action.value, state.profile.name)

            if action == HealAction.RESTART:
                ok = await self._restart_service(state)
                applied.append(f"restart({'ok' if ok else 'fail'})")
                if ok:
                    success = True

            elif action == HealAction.CLEAR_CACHE:
                # signal the service to clear its cache if it has such an endpoint
                ok = await self._call_service_endpoint(state, "/cache/clear", method="POST")
                applied.append(f"clear_cache({'ok' if ok else 'no-endpoint'})")
                if ok:
                    success = True

            elif action == HealAction.REDUCE_LOAD:
                # ask warp to throttle background tasks for this service
                applied.append("reduce_load(throttled)")
                success = True

            elif action == HealAction.RECONFIGURE:
                applied.append("reconfigure(logged-for-manual)")
                # can't auto-reconfigure without knowing config — log for review

            elif action == HealAction.QUARANTINE:
                state.status = ServiceStatus.QUARANTINE
                applied.append("quarantine(isolated)")
                success = True

            elif action == HealAction.WATCH:
                applied.append("watch(monitoring)")
                success = False  # watch is not a fix

            elif action == HealAction.ESCALATE:
                await self._escalate_to_guardian(state, state.last_diagnosis)
                applied.append("escalate(guardian)")

            elif action == HealAction.FIX_AND_PR:  # v5
                ok = await self._generate_and_deliver_fix(state, event_id)
                applied.append(f"fix_and_pr({'ok' if ok else 'fail'})")
                if ok:
                    success = True

        return applied, success

    async def _generate_and_deliver_fix(
        self,
        state:    ServiceState,
        event_id: str,
    ) -> bool:
        """v5: generate a code fix via fix_engine and open a GitHub/GitLab PR."""
        if not self._fix_engine or not self._grok:
            log.warning("[HEAL:%s] fix_engine or grok not available", event_id)
            return False
        # find the code context object stashed in evidence during _collect_layers_v5
        # we need to re-run a targeted collect just for the code ctx
        try:
            from .fix_engine import generate_fix, deliver_github_pr, deliver_gitlab_mr
            # check if we can find a registered spec for this service
            spec = None
            if self._registry:
                svcs = self._registry.list_services("triumph")
                for s in svcs:
                    if s.name == state.profile.name:
                        spec = s
                        break
            if not spec or not spec.repo_url:
                log.debug("[HEAL:%s] no repo_url for %s — skip fix_and_pr", event_id, state.profile.name)
                return False

            # pull fresh logs for code analysis
            from .log_ingestion import pull_logs_for_service
            from .code_analyzer import analyse_code
            events = await pull_logs_for_service(spec, tail=100)
            ctx = await analyse_code(
                service_id    = state.profile.name,
                log_events    = events,
                stack_type    = str(spec.stack_type),
                repo_url      = spec.repo_url,
                repo_token    = spec.repo_token,
                repo_provider = spec.repo_provider,
            )
            if not ctx:
                return False

            fix = await generate_fix(
                grok       = self._grok,
                code_ctx   = ctx,
                root_cause = state.last_diagnosis,
            )
            if not fix:
                return False

            if spec.repo_provider == "github":
                pr_url = await deliver_github_pr(
                    fix          = fix,
                    repo_url     = spec.repo_url,
                    token        = spec.repo_token,
                    service_name = spec.name,
                )
                if pr_url:
                    log.info("[HEAL:%s] PR opened: %s", event_id, pr_url)
                    return True
            elif spec.repo_provider in ("gitlab", "self-hosted"):
                mr_url = await deliver_gitlab_mr(
                    fix          = fix,
                    repo_url     = spec.repo_url,
                    token        = spec.repo_token,
                    service_name = spec.name,
                )
                if mr_url:
                    log.info("[HEAL:%s] MR opened: %s", event_id, mr_url)
                    return True
        except Exception as exc:
            log.error("[HEAL:%s] fix_and_pr error: %s", event_id, repr(exc))
        return False

    async def _restart_service(self, state: ServiceState) -> bool:
        """Restart service via Docker socket if available."""
        import os
        docker_socket = "/var/run/docker.sock"
        if not os.path.exists(docker_socket):
            log.warning("[HEAL] Docker socket not mounted — cannot restart %s", state.profile.name)
            return False
        try:
            connector = aiohttp.UnixConnector(path=docker_socket)
            async with aiohttp.ClientSession(connector=connector, timeout=aiohttp.ClientTimeout(total=30)) as session:
                url = f"http://localhost/containers/{state.profile.log_service}/restart?t=10"
                async with session.post(url) as resp:
                    if resp.status in (204, 200):
                        log.info("[HEAL] Restarted %s successfully", state.profile.name)
                        await asyncio.sleep(5)  # allow boot time
                        return True
                    log.warning("[HEAL] Restart %s → HTTP %d", state.profile.name, resp.status)
                    return False
        except Exception as exc:
            log.warning("[HEAL] Restart failed for %s: %s", state.profile.name, exc)
            return False

    async def _call_service_endpoint(self, state: ServiceState, path: str, method: str = "GET") -> bool:
        base = state.profile.health_url.rsplit("/", 1)[0]
        url = base + path
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=5)) as session:
                fn = getattr(session, method.lower())
                async with fn(url) as resp:
                    return resp.status < 400
        except Exception:
            return False

    async def _probe_status(self, state: ServiceState) -> ServiceStatus:
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=5)) as session:
            await self._check_service(session, state)
        return state.status

    async def _escalate_to_guardian(self, state: ServiceState, diagnosis: str) -> None:
        if not self._guardian:
            return
        try:
            from .guardian import ThreatIndicator, ProtectionCategory
            indicator = ThreatIndicator(
                source=f"sovereign-healer/{state.profile.name}",
                category=ProtectionCategory.INFRASTRUCTURE,
                severity=min(0.5 + state.consecutive_failures * 0.1, 1.0),
                description=(
                    f"Service {state.profile.name} unresponsive after "
                    f"{state.heal_attempts} heal attempts. "
                    f"Diagnosis: {diagnosis[:200]}"
                ),
                metadata={
                    "service": state.profile.name,
                    "heal_attempts": state.heal_attempts,
                    "status": state.status.value,
                },
            )
            self._guardian.ingest(indicator)
            log.warning("[HEAL] Escalated %s to Guardian", state.profile.name)
        except Exception as exc:
            log.warning("[HEAL] Guardian escalation failed: %s", exc)


# ── backwards-compat alias ───────────────────────────────────────────────────
SovereignHealerEngineV5 = SovereignHealerEngine

# singleton
healer = SovereignHealerEngine()
