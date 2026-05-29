# Copyright (C) 2024-2026 Jeremiah Joel Drains / Triumph Synergy. License: PiOS.
"""Generic seed-URL web crawler. Polite single-pass per cycle, respects robots-ish."""
from __future__ import annotations

import hashlib
import os
import re
import time

import httpx

from .base import IngestionSource, IngestedItem, _hash

try:
    from bs4 import BeautifulSoup  # type: ignore
    _BS4 = True
except Exception:
    _BS4 = False

_TAG_STRIP = re.compile(r"<[^>]+>")
_WS = re.compile(r"\s+")


def _extract_text(html: str) -> str:
    if _BS4:
        try:
            soup = BeautifulSoup(html, "html.parser")
            for tag in soup(["script", "style", "noscript"]):
                tag.decompose()
            return _WS.sub(" ", soup.get_text(separator=" ")).strip()
        except Exception:
            pass
    return _WS.sub(" ", _TAG_STRIP.sub(" ", html)).strip()


class WebCrawlerSource(IngestionSource):
    name = "web_crawler"
    default_interval_s = 3600  # 1 h
    default_enabled = True

    def __init__(self) -> None:
        super().__init__()
        seeds = os.getenv(
            "SAIB_CRAWLER_SEEDS",
            "https://minepi.com/blog,https://developers.minepi.com,https://stellar.org/blog",
        )
        self.seeds = [s.strip() for s in seeds.split(",") if s.strip().startswith("http")]
        self.max_bytes = int(os.getenv("SAIB_CRAWLER_MAX_BYTES", "200000"))
        self.user_agent = os.getenv(
            "SAIB_CRAWLER_UA",
            "TriumphSAIB-Crawler/1.0 (+https://triumph-synergy.replit.app)",
        )

    async def poll(self) -> list[IngestedItem]:
        items: list[IngestedItem] = []
        headers = {"User-Agent": self.user_agent}
        async with httpx.AsyncClient(timeout=20.0, headers=headers, follow_redirects=True) as client:
            for url in self.seeds:
                try:
                    r = await client.get(url)
                    if r.status_code != 200 or not r.text:
                        continue
                    text = _extract_text(r.text[: self.max_bytes * 4])[: self.max_bytes]
                    if len(text) < 200:
                        continue
                    digest = hashlib.sha256(text.encode("utf-8", errors="ignore")).hexdigest()[:16]
                    items.append(IngestedItem(
                        source=self.name,
                        external_id=f"{url}#{digest}",
                        timestamp=time.time(),
                        content=text,
                        author_hash=_hash(url),
                        raw_url=url,
                        domain="web",
                        metadata={"content_hash": digest, "bytes": len(text)},
                    ))
                except Exception:
                    continue
        return items
