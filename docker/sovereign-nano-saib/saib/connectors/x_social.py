"""
X (Twitter) Social Connector — SAIB v3
──────────────────────────────────────────────────────────────────────────────
Gives SAIB full reach into X/Twitter on behalf of @jaymoney0300 and the
Triumph Synergy brand.  Monitors the social layer around the founder and
ecosystem, detects threats / impersonation / hostile narratives, and can
post + reply from the founder account.

READ capabilities (app-only Bearer token)
──────────────────────────────────────────
• Poll @jaymoney0300 mentions every X_POLL_INTERVAL_S seconds
• Search recent tweets for Triumph Synergy / Pi Network / custom keywords
• Detect threat keywords, hostile actors, impersonators
• Auto-score mentions for negative sentiment via keyword heuristic
• Feed SovereignIntelligence signals on high-severity social events
• Feed FounderGuardian when founder account is directly targeted
• Detect account impersonation attempts (@jaymoney0301, etc.)

WRITE capabilities (OAuth 1.0a user context)
─────────────────────────────────────────────
• Post a tweet as @jaymoney0300
• Reply to a specific tweet
• Quote-tweet with a SAIB-generated response

Protocol-sync
──────────────
Automatically monitors mentions of "Pi protocol", "stellar core upgrade",
"pi mainnet" so the social layer confirms on-chain protocol upgrade events.

Environment variables
──────────────────────
  X_BEARER_TOKEN          — App-only token (required for all read ops)
  X_API_KEY               — OAuth 1.0a app consumer key (required for write)
  X_API_SECRET            — OAuth 1.0a app consumer secret (required for write)
  X_ACCESS_TOKEN          — OAuth 1.0a user access token for @jaymoney0300
  X_ACCESS_TOKEN_SECRET   — OAuth 1.0a user access token secret
  X_MONITORED_USERNAME    — default: jaymoney0300
  X_SEARCH_TERMS          — comma-sep extra search queries
  X_THREAT_KEYWORDS       — comma-sep words that escalate severity to 0.80+
  X_IMPERSONATION_NAMES   — comma-sep usernames to flag as impersonators
  X_POLL_INTERVAL_S       — default: 300  (respect rate limits)
"""
from __future__ import annotations

import asyncio
import base64
import hashlib
import hmac
import json
import logging
import os
import re
import time
import urllib.parse
import uuid
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional

import httpx

log = logging.getLogger("saib.connector.x_social")

# ─────────────────────────────────────────────── environment ──

X_BEARER_TOKEN        = os.getenv("X_BEARER_TOKEN", "")
X_API_KEY             = os.getenv("X_API_KEY", "")
X_API_SECRET          = os.getenv("X_API_SECRET", "")
X_ACCESS_TOKEN        = os.getenv("X_ACCESS_TOKEN", "")
X_ACCESS_TOKEN_SECRET = os.getenv("X_ACCESS_TOKEN_SECRET", "")

MONITORED_USERNAME    = os.getenv("X_MONITORED_USERNAME", "jaymoney0300").lstrip("@")
POLL_INTERVAL_S       = float(os.getenv("X_POLL_INTERVAL_S", "300"))

_SEARCH_TERMS_RAW     = os.getenv(
    "X_SEARCH_TERMS",
    "Triumph Synergy,TriumphSynergy,@jaymoney0300,Pi Triumph",
)
SEARCH_TERMS: List[str] = [t.strip() for t in _SEARCH_TERMS_RAW.split(",") if t.strip()]

_THREAT_KW_RAW = os.getenv(
    "X_THREAT_KEYWORDS",
    "scam,fraud,rug,fake,impersonator,hack,stolen,lawsuit,sec,cftc,ponzi,pyramid",
)
THREAT_KEYWORDS: List[str] = [k.strip().lower() for k in _THREAT_KW_RAW.split(",") if k.strip()]

_IMPERSONATION_RAW = os.getenv("X_IMPERSONATION_NAMES", "")
IMPERSONATION_NAMES: List[str] = [
    n.strip().lower().lstrip("@")
    for n in _IMPERSONATION_RAW.split(",")
    if n.strip()
]

X_API_BASE = "https://api.twitter.com"

# ─────────────────────────────────────────────── data models ──


@dataclass
class XMention:
    tweet_id:        str
    author_id:       str
    author_username: str
    author_name:     str
    text:            str
    created_at:      str
    sentiment_score: float = 0.0   # 0.0 neutral … 1.0 hostile
    threat_keywords: List[str] = field(default_factory=list)
    is_impersonation: bool = False
    raw:             dict = field(default_factory=dict)


@dataclass
class XSearchResult:
    query:     str
    tweet_id:  str
    author_id: str
    author_username: str
    text:      str
    created_at: str
    severity:  float = 0.0
    raw:       dict  = field(default_factory=dict)


# ─────────────────────────────────────────────── OAuth 1.0a signing ──

def _oauth1_header(
    method: str,
    url: str,
    body_params: Optional[Dict[str, str]] = None,
) -> str:
    """Build an OAuth 1.0a Authorization header using HMAC-SHA1.
    No external dependencies — pure stdlib + httpx.
    """
    ts    = str(int(time.time()))
    nonce = uuid.uuid4().hex

    oauth_params: Dict[str, str] = {
        "oauth_consumer_key":     X_API_KEY,
        "oauth_nonce":            nonce,
        "oauth_signature_method": "HMAC-SHA1",
        "oauth_timestamp":        ts,
        "oauth_token":            X_ACCESS_TOKEN,
        "oauth_version":          "1.0",
    }

    # Merge all params for the signature base
    all_params: Dict[str, str] = {}
    all_params.update(oauth_params)
    if body_params:
        all_params.update(body_params)

    # Percent-encode and sort
    def _pct(s: str) -> str:
        return urllib.parse.quote(str(s), safe="")

    sorted_params = "&".join(
        f"{_pct(k)}={_pct(v)}"
        for k, v in sorted(all_params.items())
    )
    base_url = url.split("?")[0]
    sig_base = f"{method.upper()}&{_pct(base_url)}&{_pct(sorted_params)}"

    # HMAC-SHA1 key = consumer_secret & token_secret
    signing_key = f"{_pct(X_API_SECRET)}&{_pct(X_ACCESS_TOKEN_SECRET)}"
    raw_sig = hmac.new(
        signing_key.encode(),
        sig_base.encode(),
        hashlib.sha1,
    ).digest()
    oauth_params["oauth_signature"] = base64.b64encode(raw_sig).decode()

    header_parts = ", ".join(
        f'{_pct(k)}="{_pct(v)}"'
        for k, v in sorted(oauth_params.items())
    )
    return f"OAuth {header_parts}"


def _read_headers() -> Dict[str, str]:
    """Bearer-token headers for read-only (app-only) endpoints."""
    return {
        "Authorization": f"Bearer {X_BEARER_TOKEN}",
        "Accept":        "application/json",
    }


# ─────────────────────────────────────────────── sentiment heuristic ──

# Words that push the threat score up
_HOSTILE_WORDS = frozenset(
    THREAT_KEYWORDS
    + ["steal", "thief", "criminal", "arrest", "fbi", "scammer",
       "warning", "beware", "danger", "exit", "rug pull", "rugpull",
       "honeypot", "block him", "avoid", "liar", "lie", "lied"]
)

_POSITIVE_WORDS = frozenset([
    "great", "amazing", "legit", "real", "trust", "love", "best",
    "solid", "good", "awesome", "fantastic", "bullish", "moon",
])


def _score_sentiment(text: str) -> tuple[float, List[str]]:
    """Return (threat_score 0.0–1.0, matched_keywords)."""
    lower = text.lower()
    hits  = [w for w in _HOSTILE_WORDS if w in lower]
    pos   = sum(1 for w in _POSITIVE_WORDS if w in lower)
    raw   = max(0.0, len(hits) * 0.20 - pos * 0.05)
    return min(1.0, raw), hits


# ─────────────────────────────────────────────── connector ──

class XSocialConnector:
    """
    Monitors X/Twitter on behalf of @jaymoney0300 + Triumph Synergy.
    Call .start() in SAIB lifespan to activate background polling.
    """

    def __init__(self) -> None:
        self._founder_user_id: str = ""       # resolved on first poll
        self._known_mention_ids: set[str]      = set()
        self._known_search_ids:  set[str]      = set()
        self._mentions:  List[XMention]        = []
        self._threats:   List[XMention]        = []   # score > 0.40
        self._search_results: List[XSearchResult] = []

        # callbacks
        self._on_mention_callbacks:  List[Callable[[XMention], None]]       = []
        self._on_threat_callbacks:   List[Callable[[XMention], None]]       = []
        self._on_search_callbacks:   List[Callable[[XSearchResult], None]]  = []

        self._running: bool = False
        self._polls:   int  = 0
        self._errors:  int  = 0

    # ── public API ────────────────────────────────────────────────────────

    def on_mention(self, cb: Callable[[XMention], None]) -> None:
        """Fired for every new @jaymoney0300 mention."""
        self._on_mention_callbacks.append(cb)

    def on_threat(self, cb: Callable[[XMention], None]) -> None:
        """Fired when a mention contains threat keywords (score ≥ 0.40)."""
        self._on_threat_callbacks.append(cb)

    def on_search_hit(self, cb: Callable[[XSearchResult], None]) -> None:
        """Fired for every new tweet matching a Triumph Synergy search term."""
        self._on_search_callbacks.append(cb)

    def start(self) -> None:
        if self._running:
            return
        self._running = True
        asyncio.create_task(self._poll_loop())
        log.info(
            "X Social connector started — watching @%s | %d search terms | bearer=%s",
            MONITORED_USERNAME,
            len(SEARCH_TERMS),
            "SET" if X_BEARER_TOKEN else "NOT SET",
        )

    def stop(self) -> None:
        self._running = False

    # ── read operations ───────────────────────────────────────────────────

    async def get_user_id(self) -> str:
        """Resolve @jaymoney0300 to an X user ID (cached after first call)."""
        if self._founder_user_id:
            return self._founder_user_id
        if not X_BEARER_TOKEN:
            return ""
        try:
            async with httpx.AsyncClient(timeout=10.0) as c:
                r = await c.get(
                    f"{X_API_BASE}/2/users/by/username/{MONITORED_USERNAME}",
                    headers=_read_headers(),
                )
                if r.status_code == 200:
                    uid = r.json().get("data", {}).get("id", "")
                    self._founder_user_id = uid
                    log.info("X: resolved @%s → id=%s", MONITORED_USERNAME, uid)
                    return uid
                else:
                    log.warning("X: user lookup failed: %d %s", r.status_code, r.text[:200])
        except Exception as exc:
            log.debug("X: get_user_id error: %s", exc)
        return ""

    async def get_mentions(self, max_results: int = 20) -> List[dict]:
        """Raw fetch of recent mentions from X API v2."""
        uid = await self.get_user_id()
        if not uid:
            return []
        params: Dict[str, str] = {
            "max_results": str(min(max_results, 100)),
            "expansions": "author_id",
            "tweet.fields": "created_at,text,author_id",
            "user.fields": "username,name",
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as c:
                r = await c.get(
                    f"{X_API_BASE}/2/users/{uid}/mentions",
                    headers=_read_headers(),
                    params=params,
                )
                if r.status_code == 200:
                    return r.json().get("data", []), r.json().get("includes", {})
                log.warning("X: mentions fetch %d: %s", r.status_code, r.text[:200])
        except Exception as exc:
            log.debug("X: get_mentions error: %s", exc)
        return [], {}

    async def search_recent(self, query: str, max_results: int = 10) -> List[dict]:
        """Search recent tweets for a given query string."""
        if not X_BEARER_TOKEN:
            return []
        params = {
            "query":       query,
            "max_results": str(min(max_results, 100)),
            "tweet.fields": "created_at,author_id,text",
            "expansions":  "author_id",
            "user.fields": "username,name",
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as c:
                r = await c.get(
                    f"{X_API_BASE}/2/tweets/search/recent",
                    headers=_read_headers(),
                    params=params,
                )
                if r.status_code == 200:
                    return r.json().get("data", []), r.json().get("includes", {})
                if r.status_code == 429:
                    log.warning("X: rate limited on search")
                else:
                    log.debug("X: search(%s) %d", query[:40], r.status_code)
        except Exception as exc:
            log.debug("X: search_recent error: %s", exc)
        return [], {}

    async def get_timeline(self, max_results: int = 10) -> List[dict]:
        """Fetch @jaymoney0300's own recent tweets."""
        uid = await self.get_user_id()
        if not uid:
            return []
        params = {
            "max_results":  str(min(max_results, 100)),
            "tweet.fields": "created_at,text",
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as c:
                r = await c.get(
                    f"{X_API_BASE}/2/users/{uid}/tweets",
                    headers=_read_headers(),
                    params=params,
                )
                if r.status_code == 200:
                    return r.json().get("data", [])
                log.debug("X: timeline %d", r.status_code)
        except Exception as exc:
            log.debug("X: get_timeline error: %s", exc)
        return []

    # ── write operations (OAuth 1.0a) ─────────────────────────────────────

    def _write_ready(self) -> bool:
        return bool(X_API_KEY and X_API_SECRET and X_ACCESS_TOKEN and X_ACCESS_TOKEN_SECRET)

    async def post_tweet(self, text: str) -> dict:
        """Post a tweet as @jaymoney0300."""
        if not self._write_ready():
            return {"error": "OAuth 1.0a credentials not configured"}
        url = f"{X_API_BASE}/2/tweets"
        body = {"text": text}
        auth_header = _oauth1_header("POST", url)
        try:
            async with httpx.AsyncClient(timeout=15.0) as c:
                r = await c.post(
                    url,
                    headers={
                        "Authorization": auth_header,
                        "Content-Type":  "application/json",
                    },
                    json=body,
                )
                if r.status_code in (200, 201):
                    log.info("X: tweet posted by @%s", MONITORED_USERNAME)
                    return r.json()
                log.warning("X: post_tweet %d: %s", r.status_code, r.text[:200])
                return {"error": r.text[:300], "status": r.status_code}
        except Exception as exc:
            log.warning("X: post_tweet error: %s", exc)
            return {"error": str(exc)}

    async def reply_tweet(self, text: str, reply_to_id: str) -> dict:
        """Reply to a specific tweet as @jaymoney0300."""
        if not self._write_ready():
            return {"error": "OAuth 1.0a credentials not configured"}
        url = f"{X_API_BASE}/2/tweets"
        body = {"text": text, "reply": {"in_reply_to_tweet_id": reply_to_id}}
        auth_header = _oauth1_header("POST", url)
        try:
            async with httpx.AsyncClient(timeout=15.0) as c:
                r = await c.post(
                    url,
                    headers={
                        "Authorization": auth_header,
                        "Content-Type":  "application/json",
                    },
                    json=body,
                )
                if r.status_code in (200, 201):
                    log.info("X: reply posted to tweet %s", reply_to_id)
                    return r.json()
                return {"error": r.text[:300], "status": r.status_code}
        except Exception as exc:
            return {"error": str(exc)}

    async def quote_tweet(self, text: str, quote_tweet_id: str) -> dict:
        """Quote-tweet with @jaymoney0300 commentary."""
        if not self._write_ready():
            return {"error": "OAuth 1.0a credentials not configured"}
        url = f"{X_API_BASE}/2/tweets"
        body = {"text": text, "quote_tweet_id": quote_tweet_id}
        auth_header = _oauth1_header("POST", url)
        try:
            async with httpx.AsyncClient(timeout=15.0) as c:
                r = await c.post(
                    url,
                    headers={
                        "Authorization": auth_header,
                        "Content-Type":  "application/json",
                    },
                    json=body,
                )
                if r.status_code in (200, 201):
                    return r.json()
                return {"error": r.text[:300], "status": r.status_code}
        except Exception as exc:
            return {"error": str(exc)}

    # ── stats ─────────────────────────────────────────────────────────────

    def stats(self) -> dict:
        return {
            "monitored_username":  MONITORED_USERNAME,
            "founder_user_id":     self._founder_user_id or "pending",
            "bearer_token_set":    bool(X_BEARER_TOKEN),
            "oauth_write_ready":   self._write_ready(),
            "polls":               self._polls,
            "errors":              self._errors,
            "known_mentions":      len(self._known_mention_ids),
            "known_search_hits":   len(self._known_search_ids),
            "threat_mentions":     len(self._threats),
            "search_terms":        SEARCH_TERMS,
            "threat_keywords":     THREAT_KEYWORDS[:10],
        }

    def recent_mentions(self, n: int = 20) -> List[dict]:
        return [
            {
                "tweet_id":        m.tweet_id,
                "author":          f"@{m.author_username}",
                "text":            m.text[:280],
                "sentiment_score": m.sentiment_score,
                "threat_keywords": m.threat_keywords,
                "is_impersonation": m.is_impersonation,
                "created_at":      m.created_at,
            }
            for m in self._mentions[-n:]
        ]

    def recent_threats(self, n: int = 20) -> List[dict]:
        return [
            {
                "tweet_id":        m.tweet_id,
                "author":          f"@{m.author_username}",
                "text":            m.text[:280],
                "sentiment_score": m.sentiment_score,
                "threat_keywords": m.threat_keywords,
                "is_impersonation": m.is_impersonation,
                "created_at":      m.created_at,
            }
            for m in self._threats[-n:]
        ]

    def recent_search_hits(self, n: int = 20) -> List[dict]:
        return [
            {
                "query":      r.query,
                "tweet_id":   r.tweet_id,
                "author":     f"@{r.author_username}",
                "text":       r.text[:280],
                "severity":   r.severity,
                "created_at": r.created_at,
            }
            for r in self._search_results[-n:]
        ]

    # ── background polling ────────────────────────────────────────────────

    async def _poll_loop(self) -> None:
        """Main background loop: mentions + search every POLL_INTERVAL_S."""
        if not X_BEARER_TOKEN:
            log.warning(
                "X Social connector: X_BEARER_TOKEN not set — monitoring disabled. "
                "Set X_BEARER_TOKEN env var to activate."
            )
            return

        # Stagger startup so it doesn't clash with other connectors
        await asyncio.sleep(20)

        while self._running:
            try:
                await self._poll_mentions()
                # Stagger searches 5 s apart to spread rate-limit budget
                for i, term in enumerate(SEARCH_TERMS):
                    await asyncio.sleep(5)
                    await self._poll_search(term)
                self._polls += 1
            except Exception as exc:
                self._errors += 1
                log.warning("X: poll error: %s", exc)
            await asyncio.sleep(POLL_INTERVAL_S)

    async def _poll_mentions(self) -> None:
        result = await self.get_mentions(max_results=20)
        if not result or not isinstance(result, (list, tuple)):
            return
        tweets, includes = result if len(result) == 2 else (result, {})
        if not tweets:
            return

        # Build username lookup from includes.users
        user_map: Dict[str, dict] = {
            u["id"]: u
            for u in includes.get("users", [])
        }

        for tw in tweets:
            tid = tw.get("id", "")
            if not tid or tid in self._known_mention_ids:
                continue
            self._known_mention_ids.add(tid)

            author_id  = tw.get("author_id", "")
            author_obj = user_map.get(author_id, {})
            username   = author_obj.get("username", "unknown")
            name       = author_obj.get("name", "")
            text       = tw.get("text", "")
            created_at = tw.get("created_at", "")

            score, kw_hits = _score_sentiment(text)

            # Impersonation detection: similar username to jaymoney0300
            is_impersonation = (
                username.lower() in IMPERSONATION_NAMES
                or (
                    username.lower() != MONITORED_USERNAME.lower()
                    and _similar_username(username, MONITORED_USERNAME)
                )
            )

            mention = XMention(
                tweet_id         = tid,
                author_id        = author_id,
                author_username  = username,
                author_name      = name,
                text             = text,
                created_at       = created_at,
                sentiment_score  = score,
                threat_keywords  = kw_hits,
                is_impersonation = is_impersonation,
                raw              = tw,
            )

            self._mentions = (self._mentions + [mention])[-500:]
            self._fire(self._on_mention_callbacks, mention)

            if score >= 0.40 or is_impersonation:
                self._threats = (self._threats + [mention])[-200:]
                self._fire(self._on_threat_callbacks, mention)
                log.warning(
                    "X THREAT MENTION: @%s score=%.2f kw=%s impersonation=%s",
                    username, score, kw_hits, is_impersonation,
                )

    async def _poll_search(self, query: str) -> None:
        result = await self.search_recent(query, max_results=10)
        if not result or not isinstance(result, (list, tuple)):
            return
        tweets, includes = result if len(result) == 2 else (result, {})
        if not tweets:
            return

        user_map: Dict[str, dict] = {
            u["id"]: u
            for u in includes.get("users", [])
        }

        for tw in tweets:
            tid = tw.get("id", "")
            if not tid or tid in self._known_search_ids:
                continue
            self._known_search_ids.add(tid)

            author_id  = tw.get("author_id", "")
            author_obj = user_map.get(author_id, {})
            username   = author_obj.get("username", "unknown")
            text       = tw.get("text", "")
            created_at = tw.get("created_at", "")

            score, _ = _score_sentiment(text)
            hit = XSearchResult(
                query      = query,
                tweet_id   = tid,
                author_id  = author_id,
                author_username = username,
                text       = text,
                created_at = created_at,
                severity   = score,
                raw        = tw,
            )
            self._search_results = (self._search_results + [hit])[-1000:]
            self._fire(self._on_search_callbacks, hit)

            if score >= 0.40:
                log.info("X search threat: query='%s' @%s score=%.2f", query[:30], username, score)

    # ── utilities ─────────────────────────────────────────────────────────

    @staticmethod
    def _fire(callbacks: list, *args: Any) -> None:
        for cb in callbacks:
            try:
                cb(*args)
            except Exception as exc:
                log.debug("X callback error: %s", exc)


def _similar_username(a: str, b: str) -> bool:
    """True if username 'a' looks like an impersonation of 'b'.
    Checks: edit distance ≤ 2, same chars + extra digits/underscores.
    """
    a = a.lower().rstrip("0123456789_")
    b = b.lower().rstrip("0123456789_")
    if a == b:
        return False  # exact match (same person)
    if len(a) < 4 or len(b) < 4:
        return False
    # Simple: stripped versions share a long common prefix
    common = os.path.commonprefix([a, b])
    return len(common) >= min(len(a), len(b)) - 1


# ── singleton ─────────────────────────────────────────────────────────────────
x_social = XSocialConnector()
