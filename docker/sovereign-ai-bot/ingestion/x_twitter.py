# Copyright (C) 2024-2026 Jeremiah Joel Drains / Triumph Synergy. License: PiOS.
"""X (Twitter) ingestion — dormant unless X_BEARER_TOKEN is set.

Uses the public /2/tweets/search/recent endpoint via httpx (no tweepy dependency
required). Free tier is rate-limited; default poll interval is conservative.
"""
from __future__ import annotations

import os
import time

import httpx

from .base import IngestionSource, IngestedItem, _hash

_X_SEARCH = "https://api.twitter.com/2/tweets/search/recent"


class XTwitterSource(IngestionSource):
    name = "x_twitter"
    default_interval_s = 1800  # 30 min — free tier safety
    default_enabled = False

    def __init__(self) -> None:
        super().__init__()
        self.bearer = os.getenv("X_BEARER_TOKEN", "").strip()
        q = os.getenv(
            "SAIB_X_QUERY",
            "(#TriumphSynergy OR #PiNetwork OR @TriumphSynergy) -is:retweet lang:en",
        )
        self.query = q
        self.max_results = int(os.getenv("SAIB_X_MAX_RESULTS", "25"))

    def _is_enabled(self) -> bool:
        return bool(os.getenv("X_BEARER_TOKEN", "").strip())

    async def poll(self) -> list[IngestedItem]:
        if not self.bearer:
            return []
        headers = {"Authorization": f"Bearer {self.bearer}"}
        params = {
            "query": self.query,
            "max_results": min(max(self.max_results, 10), 100),
            "tweet.fields": "created_at,author_id,lang,public_metrics",
        }
        items: list[IngestedItem] = []
        async with httpx.AsyncClient(timeout=15.0, headers=headers) as client:
            try:
                r = await client.get(_X_SEARCH, params=params)
                if r.status_code != 200:
                    return []
                data = r.json()
            except Exception:
                return []
            for t in data.get("data", []):
                tid = str(t.get("id", ""))
                text = t.get("text", "") or ""
                if not text:
                    continue
                items.append(IngestedItem(
                    source=self.name,
                    external_id=f"tweet:{tid}",
                    timestamp=time.time(),
                    content=text,
                    author_hash=_hash(str(t.get("author_id", "anon"))),
                    lang=t.get("lang", "en"),
                    raw_url=f"https://x.com/i/status/{tid}",
                    domain="social-community",
                    metadata={"public_metrics": t.get("public_metrics", {})},
                ))
        return items
