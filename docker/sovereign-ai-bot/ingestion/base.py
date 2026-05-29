# Copyright (C) 2024-2026 Jeremiah Joel Drains / Triumph Synergy. License: PiOS.
"""Base classes & helpers for SAIB's external-knowledge ingestion sources."""
from __future__ import annotations

import asyncio
import hashlib
import logging
import os
import time
from dataclasses import dataclass, field, asdict
from typing import Any, Optional

import httpx

log = logging.getLogger("saib.ingest")

SAIB_LOCAL_URL = os.getenv("SAIB_LOCAL_URL", "http://localhost:8099")
DEFAULT_DOMAIN = os.getenv("SAIB_DEFAULT_DOMAIN", "community")


def _hash(value: str) -> str:
    return hashlib.shake_256(value.encode("utf-8", errors="ignore")).hexdigest(8)


@dataclass
class IngestedItem:
    source: str
    external_id: str
    timestamp: float
    content: str
    author_hash: str = ""
    lang: str = "en"
    raw_url: str = ""
    domain: str = DEFAULT_DOMAIN
    metadata: dict[str, Any] = field(default_factory=dict)

    def fingerprint(self) -> str:
        return f"{self.source}:{self.external_id or _hash(self.content)}"

    def to_feedback(self) -> dict[str, Any]:
        return {
            "type": "insight",
            "content": self.content[:4000],
            "domain": self.domain,
            "confidence": 0.4,
            "source": f"ingest:{self.source}",
        }


class IngestionSource:
    """Abstract base. Subclasses set `name` + implement `poll()`."""

    name: str = "abstract"
    default_interval_s: int = 600
    default_enabled: bool = False

    def __init__(self) -> None:
        self.poll_interval_s = int(os.getenv(
            f"SAIB_{self.name.upper()}_INTERVAL_S",
            str(self.default_interval_s),
        ))
        self.enabled = self._is_enabled()
        self.last_poll_at: float = 0.0
        self.last_count: int = 0
        self.total_ingested: int = 0
        self.last_error: str = ""
        self._seen: set[str] = set()

    def _is_enabled(self) -> bool:
        flag = os.getenv(f"SAIB_{self.name.upper()}_ENABLED")
        if flag is not None:
            return flag.lower() in ("1", "true", "yes", "on")
        return self.default_enabled

    async def poll(self) -> list[IngestedItem]:
        raise NotImplementedError

    def dedupe(self, items: list[IngestedItem]) -> list[IngestedItem]:
        out: list[IngestedItem] = []
        for it in items:
            fp = it.fingerprint()
            if fp in self._seen:
                continue
            self._seen.add(fp)
            out.append(it)
        if len(self._seen) > 10000:
            # Drop oldest half to cap memory
            self._seen = set(list(self._seen)[-5000:])
        return out

    def status(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "enabled": self.enabled,
            "poll_interval_s": self.poll_interval_s,
            "last_poll_at": self.last_poll_at,
            "last_count": self.last_count,
            "total_ingested": self.total_ingested,
            "last_error": self.last_error,
        }


async def push_to_brain(items: list[IngestedItem]) -> int:
    """POST each item to SAIB's local /feedback endpoint. Returns success count."""
    if not items:
        return 0
    ok = 0
    async with httpx.AsyncClient(timeout=10.0) as client:
        for it in items:
            try:
                r = await client.post(f"{SAIB_LOCAL_URL}/feedback", json=it.to_feedback())
                if r.status_code < 400:
                    ok += 1
                else:
                    log.debug("[ingest:%s] feedback rejected %s: %s", it.source, r.status_code, r.text[:120])
            except Exception as e:
                log.debug("[ingest:%s] feedback error: %s", it.source, e)
    return ok


async def push_to_rag(items: list[IngestedItem]) -> int:
    """Forward items into the RAG store. Returns indexed count."""
    if not items:
        return 0
    try:
        from rag import store as rag_store  # local import to avoid cycle
    except Exception:
        return 0
    n = 0
    for it in items:
        try:
            ok = await rag_store.upsert_chunk(
                source=it.source,
                external_id=it.fingerprint(),
                content=it.content,
                metadata={
                    "domain": it.domain,
                    "author_hash": it.author_hash,
                    "raw_url": it.raw_url,
                    "ts": it.timestamp,
                    **it.metadata,
                },
            )
            if ok:
                n += 1
        except Exception as e:
            log.debug("[rag] upsert failed for %s: %s", it.fingerprint(), e)
    return n


async def run_source_loop(src: IngestionSource) -> None:
    """Generic poll loop. Skips dormant sources but still surfaces their status."""
    if not src.enabled:
        log.info("[ingest:%s] dormant (no credentials / disabled)", src.name)
        return
    log.info("[ingest:%s] active — interval=%ss", src.name, src.poll_interval_s)
    # Stagger boot so we don't hammer every source at once
    await asyncio.sleep(15 + (hash(src.name) % 30))
    while True:
        try:
            items = await src.poll()
            items = src.dedupe(items)
            src.last_poll_at = time.time()
            src.last_count = len(items)
            src.total_ingested += len(items)
            src.last_error = ""
            if items:
                await push_to_brain(items)
                await push_to_rag(items)
                log.info("[ingest:%s] +%d items (total %d)", src.name, len(items), src.total_ingested)
        except Exception as e:
            src.last_error = str(e)[:200]
            log.warning("[ingest:%s] poll error: %s", src.name, e)
        await asyncio.sleep(src.poll_interval_s)
