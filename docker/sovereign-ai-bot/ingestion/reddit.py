# Copyright (C) 2024-2026 Jeremiah Joel Drains / Triumph Synergy. License: PiOS.
"""Reddit ingestion — anonymous `.json` endpoints (no OAuth needed for read)."""
from __future__ import annotations

import os
import time

import httpx

from .base import IngestionSource, IngestedItem, _hash


class RedditSource(IngestionSource):
    name = "reddit"
    default_interval_s = 900  # 15 min
    default_enabled = True

    def __init__(self) -> None:
        super().__init__()
        subs = os.getenv("SAIB_REDDIT_SUBREDDITS", "PiNetwork,Stellar,CryptoCurrency,fastapi,nextjs")
        self.subs = [s.strip() for s in subs.split(",") if s.strip()]
        self.limit = int(os.getenv("SAIB_REDDIT_LIMIT", "25"))
        self.user_agent = os.getenv("SAIB_REDDIT_UA", "TriumphSAIB/1.0 (+https://triumph-synergy.replit.app)")
        kw = os.getenv("SAIB_REDDIT_KEYWORDS", "")
        self.keywords = [k.strip().lower() for k in kw.split(",") if k.strip()]

    def _matches(self, text: str) -> bool:
        if not self.keywords:
            return True
        low = text.lower()
        return any(k in low for k in self.keywords)

    async def poll(self) -> list[IngestedItem]:
        items: list[IngestedItem] = []
        headers = {"User-Agent": self.user_agent}
        async with httpx.AsyncClient(timeout=15.0, headers=headers, follow_redirects=True) as client:
            for sub in self.subs:
                url = f"https://www.reddit.com/r/{sub}/new.json?limit={self.limit}"
                try:
                    r = await client.get(url)
                    if r.status_code != 200:
                        continue
                    data = r.json()
                except Exception:
                    continue
                for child in data.get("data", {}).get("children", []):
                    d = child.get("data", {})
                    title = d.get("title", "") or ""
                    selftext = d.get("selftext", "") or ""
                    text = f"{title}\n\n{selftext}".strip()
                    if not text or not self._matches(text):
                        continue
                    items.append(IngestedItem(
                        source=self.name,
                        external_id=f"r/{sub}:{d.get('id','')}",
                        timestamp=float(d.get("created_utc", time.time())),
                        content=text,
                        author_hash=_hash(str(d.get("author", "anon"))),
                        raw_url=f"https://reddit.com{d.get('permalink','')}",
                        domain="social-community",
                        metadata={
                            "subreddit": sub,
                            "score": d.get("score", 0),
                            "num_comments": d.get("num_comments", 0),
                        },
                    ))
        return items
