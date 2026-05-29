# Copyright (C) 2024-2026 Jeremiah Joel Drains / Triumph Synergy. License: PiOS.
"""Stack Exchange (Stack Overflow) ingestion — anonymous, no API key needed."""
from __future__ import annotations

import os
import time

import httpx

from .base import IngestionSource, IngestedItem, _hash

_SE_BASE = "https://api.stackexchange.com/2.3"


class StackOverflowSource(IngestionSource):
    name = "stackoverflow"
    default_interval_s = 1800  # 30 min — be polite to the free anon quota
    default_enabled = True

    def __init__(self) -> None:
        super().__init__()
        tags = os.getenv("SAIB_SO_TAGS", "pi-network,stellar,blockchain,fastapi,nextjs")
        self.tags = [t.strip() for t in tags.split(",") if t.strip()]
        self.sites = [s.strip() for s in os.getenv("SAIB_SO_SITES", "stackoverflow").split(",") if s.strip()]
        self.pagesize = int(os.getenv("SAIB_SO_PAGESIZE", "30"))

    async def poll(self) -> list[IngestedItem]:
        items: list[IngestedItem] = []
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            for site in self.sites:
                for tag in self.tags:
                    params = {
                        "order": "desc",
                        "sort": "creation",
                        "tagged": tag,
                        "site": site,
                        "pagesize": self.pagesize,
                        "filter": "withbody",
                    }
                    try:
                        r = await client.get(f"{_SE_BASE}/questions", params=params)
                        if r.status_code != 200:
                            continue
                        data = r.json()
                    except Exception:
                        continue
                    for q in data.get("items", []):
                        qid = str(q.get("question_id", ""))
                        body = q.get("body", "") or q.get("title", "")
                        if not body:
                            continue
                        items.append(IngestedItem(
                            source=self.name,
                            external_id=f"{site}:{qid}",
                            timestamp=float(q.get("creation_date", time.time())),
                            content=f"[{tag}] {q.get('title','')}\n\n{body}",
                            author_hash=_hash(str(q.get("owner", {}).get("user_id", "anon"))),
                            raw_url=q.get("link", ""),
                            domain="developer-community",
                            metadata={"tag": tag, "site": site, "score": q.get("score", 0)},
                        ))
        return items
