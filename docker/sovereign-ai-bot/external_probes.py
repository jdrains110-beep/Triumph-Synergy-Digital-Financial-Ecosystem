"""
SAIB External Probe Registry
============================

Extends SAIB's monitoring beyond local Docker into the wider ecosystem:

  • triumphsynergy.com production    (Cloudflare + VPS)
  • PiNet mainnet apps              (triumphsynergy.com)
  • Pi Network mainnet API          (api.mainnet.minepi.com)
  • Stellar Protocol 24 horizon     (api.mainnet.minepi.com/ledgers)

These targets cannot be `docker restart`'d — they're external. So each
probe records availability, raises a Prometheus signal, and (when wired
to remediation) opens a GitHub issue instead of attempting a container
restart. SAIB therefore *sees* every platform in the ecosystem even
when it can't directly fix them.

Mainnet-only mandate: no testnet probes are emitted from this registry.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field


@dataclass(frozen=True)
class ExternalTarget:
    """One externally hosted endpoint SAIB watches but doesn't own."""

    name: str
    url: str
    kind: str            # "replit" | "pinet" | "pi-mainnet" | "stellar-mainnet"
    remediation: str     # "github-issue" | "alert-only"
    timeout_s: float = 10.0
    expect_status: tuple[int, ...] = (200, 204)


def _env_csv(name: str, default: str) -> list[str]:
    raw = os.getenv(name, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


def build_external_targets() -> list[ExternalTarget]:
    """Return the canonical list of external targets SAIB watches."""

    replit_hosts = _env_csv(
        "SAIB_REPLIT_HOSTS",
        "triumphsynergy.com",
    )
    pinet_hosts = _env_csv(
        "SAIB_PINET_HOSTS",
        "triumphsynergyab2099.pinet.com",
    )

    targets: list[ExternalTarget] = []

    for host in replit_hosts:
        targets.append(
            ExternalTarget(
                name=f"replit:{host}",
                url=f"https://{host}/api/health",
                kind="replit",
                remediation="github-issue",
            )
        )

    for host in pinet_hosts:
        targets.append(
            ExternalTarget(
                name=f"pinet:{host}",
                url=f"https://{host}/api/health",
                kind="pinet",
                remediation="github-issue",
            )
        )

    targets.append(
        ExternalTarget(
            name="pi-mainnet:api",
            url="https://api.mainnet.minepi.com",
            kind="pi-mainnet",
            remediation="alert-only",
            expect_status=(200, 301, 302, 404),  # root may 404 — connectivity-only
        )
    )
    targets.append(
        ExternalTarget(
            name="stellar-mainnet:ledgers",
            url="https://api.mainnet.minepi.com/ledgers?order=desc&limit=1",
            kind="stellar-mainnet",
            remediation="alert-only",
        )
    )

    return targets


@dataclass
class ExternalProbeResult:
    target: ExternalTarget
    healthy: bool
    status_code: int | None = None
    error: str | None = None
    latency_ms: float = 0.0
    extras: dict[str, object] = field(default_factory=dict)


async def probe_external(client, target: ExternalTarget) -> ExternalProbeResult:
    """Probe a single external target. `client` is an httpx.AsyncClient."""
    import time

    started = time.perf_counter()
    try:
        resp = await client.get(target.url, timeout=target.timeout_s)
        latency_ms = (time.perf_counter() - started) * 1000.0
        healthy = resp.status_code in target.expect_status
        extras: dict[str, object] = {}
        # For stellar horizon, capture protocol_version when present
        if target.kind == "stellar-mainnet" and healthy:
            try:
                payload = resp.json()
                records = payload.get("_embedded", {}).get("records", [])
                if records:
                    extras["protocol_version"] = records[0].get("protocol_version")
                    extras["sequence"] = records[0].get("sequence")
            except Exception:  # noqa: BLE001
                pass
        return ExternalProbeResult(
            target=target,
            healthy=healthy,
            status_code=resp.status_code,
            latency_ms=latency_ms,
            extras=extras,
        )
    except Exception as exc:  # noqa: BLE001
        latency_ms = (time.perf_counter() - started) * 1000.0
        return ExternalProbeResult(
            target=target,
            healthy=False,
            error=str(exc)[:200],
            latency_ms=latency_ms,
        )
