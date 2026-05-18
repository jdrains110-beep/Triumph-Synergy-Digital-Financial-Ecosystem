# Copyright (C) 2024-2026 Jeremiah Drains / Triumph Synergy. All rights reserved.
# License: PiOS
"""
Public Bridge — outbound link between Docker Desktop and the public sites
========================================================================

Lets the local Docker Desktop stack talk to:
  - https://triumphsynergyab2099.pinet.com   (Pi Network primary)
  - https://Triumph-Synergy.replit.app       (Replit staging)

Direction A — Docker -> Public:
  Periodic HTTPS POST of ledger + node state to /api/bridge/ingest on
  each public site, authenticated with a shared bearer token.

Direction B — Public -> Docker:
  A long-lived SSE GET against /api/bridge/stream on each public site;
  commands the site enqueues are streamed back to the local stack.

No inbound port is required — both directions are initiated from Docker,
so this works behind any NAT/CGNAT (Starlink, mobile hotspot, etc.).

Failure mode: each endpoint runs in its own task with exponential backoff;
a down site is logged but never blocks the other site or the main bridge
poll loop.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import time
from typing import Any, Awaitable, Callable, Iterable

import httpx

log = logging.getLogger("pi-bridge-connector.public")

# ── Config ────────────────────────────────────────────────────────────────────

# Comma-separated list of public site base URLs. Empty = bridge disabled.
_DEFAULT_PUBLIC_URLS = (
    "https://triumphsynergyab2099.pinet.com,"
    "https://Triumph-Synergy.replit.app"
)
PUBLIC_BRIDGE_URLS = [
    u.strip().rstrip("/")
    for u in os.getenv("PUBLIC_BRIDGE_URLS", _DEFAULT_PUBLIC_URLS).split(",")
    if u.strip()
]
PUBLIC_BRIDGE_TOKEN = os.getenv("PUBLIC_BRIDGE_TOKEN", "").strip()
PUBLIC_BRIDGE_PUSH_INTERVAL_S = float(os.getenv("PUBLIC_BRIDGE_PUSH_INTERVAL_S", "10"))
PUBLIC_BRIDGE_PUSH_TIMEOUT_S = float(os.getenv("PUBLIC_BRIDGE_PUSH_TIMEOUT_S", "10"))
PUBLIC_BRIDGE_SSE_TIMEOUT_S = float(os.getenv("PUBLIC_BRIDGE_SSE_TIMEOUT_S", "60"))
PUBLIC_BRIDGE_RECONNECT_MIN_S = float(os.getenv("PUBLIC_BRIDGE_RECONNECT_MIN_S", "2"))
PUBLIC_BRIDGE_RECONNECT_MAX_S = float(os.getenv("PUBLIC_BRIDGE_RECONNECT_MAX_S", "60"))
PUBLIC_BRIDGE_NODE_ID = os.getenv("PUBLIC_BRIDGE_NODE_ID", "docker-desktop-primary")


def is_enabled() -> bool:
    return bool(PUBLIC_BRIDGE_URLS) and bool(PUBLIC_BRIDGE_TOKEN)


def _auth_headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {PUBLIC_BRIDGE_TOKEN}",
        "X-Triumph-Node-Id": PUBLIC_BRIDGE_NODE_ID,
        "Content-Type": "application/json",
    }


# ── Outbound publisher (Docker -> Public) ─────────────────────────────────────

async def _push_once(client: httpx.AsyncClient, base_url: str, payload: dict[str, Any]) -> None:
    url = f"{base_url}/api/bridge/ingest"
    try:
        resp = await client.post(
            url,
            json=payload,
            headers=_auth_headers(),
            timeout=PUBLIC_BRIDGE_PUSH_TIMEOUT_S,
        )
        if resp.status_code >= 400:
            log.warning(
                "[public-bridge] push to %s rejected: HTTP %s %s",
                base_url, resp.status_code, resp.text[:200],
            )
        else:
            log.debug("[public-bridge] push -> %s OK (seq=%s)",
                      base_url, payload.get("latest_ledger_seq"))
    except Exception as e:
        log.warning("[public-bridge] push to %s failed: %s", base_url, e)


async def push_state_to_public_sites(snapshot: dict[str, Any]) -> None:
    """Fire-and-forget POST of the current bridge snapshot to every public site."""
    if not is_enabled():
        return
    payload = {
        "node_id": PUBLIC_BRIDGE_NODE_ID,
        "ts": time.time(),
        **snapshot,
    }
    limits = httpx.Limits(max_connections=4, max_keepalive_connections=0)
    async with httpx.AsyncClient(limits=limits) as client:
        await asyncio.gather(
            *[_push_once(client, base, payload) for base in PUBLIC_BRIDGE_URLS],
            return_exceptions=True,
        )


async def public_bridge_push_loop(snapshot_fn: Callable[[], dict[str, Any]]) -> None:
    """Background task: push snapshot() to public sites on a fixed cadence."""
    if not is_enabled():
        log.info("[public-bridge] push loop disabled (PUBLIC_BRIDGE_TOKEN unset)")
        return
    log.info(
        "[public-bridge] push loop -> %s every %.1fs",
        ", ".join(PUBLIC_BRIDGE_URLS), PUBLIC_BRIDGE_PUSH_INTERVAL_S,
    )
    while True:
        try:
            await push_state_to_public_sites(snapshot_fn())
        except Exception as e:
            log.warning("[public-bridge] push loop iteration error: %s", e)
        await asyncio.sleep(PUBLIC_BRIDGE_PUSH_INTERVAL_S)


# ── Inbound subscriber (Public -> Docker via SSE) ─────────────────────────────

async def _consume_sse(
    base_url: str,
    handler: Callable[[dict[str, Any]], Awaitable[None]],
) -> None:
    """Connect to /api/bridge/stream and dispatch each SSE event to handler.

    The endpoint must emit `event: command` frames with JSON `data:` payloads.
    """
    url = f"{base_url}/api/bridge/stream"
    backoff = PUBLIC_BRIDGE_RECONNECT_MIN_S
    while True:
        try:
            log.info("[public-bridge] SSE connecting -> %s", url)
            timeout = httpx.Timeout(
                connect=10.0,
                read=PUBLIC_BRIDGE_SSE_TIMEOUT_S,
                write=10.0,
                pool=10.0,
            )
            async with httpx.AsyncClient(timeout=timeout) as client:
                async with client.stream(
                    "GET",
                    url,
                    headers={
                        **_auth_headers(),
                        "Accept": "text/event-stream",
                        "Cache-Control": "no-cache",
                    },
                ) as resp:
                    if resp.status_code != 200:
                        body = await resp.aread()
                        raise RuntimeError(
                            f"SSE handshake HTTP {resp.status_code}: {body[:200]!r}"
                        )
                    backoff = PUBLIC_BRIDGE_RECONNECT_MIN_S
                    event_name = "message"
                    data_buf: list[str] = []
                    async for raw_line in resp.aiter_lines():
                        line = raw_line.rstrip("\r")
                        if line == "":
                            if data_buf:
                                payload_str = "\n".join(data_buf)
                                data_buf = []
                                try:
                                    payload = json.loads(payload_str)
                                except json.JSONDecodeError:
                                    payload = {"raw": payload_str}
                                try:
                                    await handler({
                                        "event": event_name,
                                        "source": base_url,
                                        "data": payload,
                                    })
                                except Exception as he:
                                    log.warning(
                                        "[public-bridge] handler error from %s: %s",
                                        base_url, he,
                                    )
                                event_name = "message"
                            continue
                        if line.startswith(":"):
                            continue  # SSE comment / keep-alive
                        if line.startswith("event:"):
                            event_name = line[6:].strip() or "message"
                        elif line.startswith("data:"):
                            data_buf.append(line[5:].lstrip())
                        # other SSE fields (id:, retry:) ignored
        except asyncio.CancelledError:
            raise
        except Exception as e:
            log.warning(
                "[public-bridge] SSE %s disconnected: %s — retry in %.1fs",
                base_url, e, backoff,
            )
            await asyncio.sleep(backoff)
            backoff = min(backoff * 2, PUBLIC_BRIDGE_RECONNECT_MAX_S)


async def public_bridge_stream_loop(
    handler: Callable[[dict[str, Any]], Awaitable[None]],
    urls: Iterable[str] | None = None,
) -> None:
    """Run one SSE consumer task per public site, in parallel forever."""
    if not is_enabled():
        log.info("[public-bridge] stream loop disabled (PUBLIC_BRIDGE_TOKEN unset)")
        return
    targets = list(urls) if urls is not None else list(PUBLIC_BRIDGE_URLS)
    if not targets:
        return
    await asyncio.gather(
        *[_consume_sse(base, handler) for base in targets],
        return_exceptions=True,
    )
