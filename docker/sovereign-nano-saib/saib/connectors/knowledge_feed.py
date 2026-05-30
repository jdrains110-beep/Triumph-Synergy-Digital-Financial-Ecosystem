"""
Knowledge Feed Connector — SAIB v3
──────────────────────────────────────────────────────────────────────────────
Continuously increases SAIB's knowledge base by pulling from external
intelligence sources and feeding what it learns into the Intelligence and
Brainstorm engines.

Sources
───────
• Threat intelligence feeds (OSINT CVE / NVD, AbuseIPDB, DShield)
• Pi Network ecosystem news / announcements (RSS / Pi blog)
• Regulatory & compliance feeds (OFAC SDN delta, FinCEN advisories RSS)
• General tech / AI / DeFi trend signals (configurable RSS feeds)
• Internal Triumph Synergy changelog / deployment feed
• Self-reflection: SAIB learns from its own past enforcement outcomes

All knowledge is structured as "facts" with confidence, domain, and TTL.
Facts expire and are re-validated on each poll cycle.
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import os
import re
import time
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional

import httpx

log = logging.getLogger("saib.connector.knowledge_feed")

# ───────────────────────────────────── config ──
KNOWLEDGE_POLL_S  = float(os.getenv("KNOWLEDGE_POLL_S", "300"))   # 5 min
NVD_API_KEY       = os.getenv("NVD_API_KEY", "")
ABUSEIPDB_KEY     = os.getenv("ABUSEIPDB_KEY", "")
DSHIELD_ENABLED   = os.getenv("DSHIELD_ENABLED", "true").lower() == "true"
MAX_FACTS         = int(os.getenv("KNOWLEDGE_MAX_FACTS", "5000"))
FACT_TTL_S        = float(os.getenv("KNOWLEDGE_FACT_TTL_S", "86400"))  # 24h default

RSS_FEEDS: List[str] = [
    url.strip()
    for url in os.getenv(
        "KNOWLEDGE_RSS_FEEDS",
        "https://minepi.com/blog/feed/,"
        "https://nvd.nist.gov/feeds/xml/cve/misc/nvd-rss.xml,"
        "https://feeds.dshield.org/top10-2.xml",
    ).split(",")
    if url.strip()
]


# ───────────────────────────────────── data models ──

@dataclass
class Fact:
    fact_id:     str
    domain:      str           # "threat" | "compliance" | "pi_network" | "tech" | "ecosystem"
    title:       str
    description: str
    source:      str
    confidence:  float = 0.7
    severity:    float = 0.0   # 0–1; 1 = critical
    tags:        List[str] = field(default_factory=list)
    ts:          float = field(default_factory=time.time)
    expires_at:  float = field(default_factory=lambda: time.time() + FACT_TTL_S)
    raw:         dict  = field(default_factory=dict)

    @property
    def expired(self) -> bool:
        return time.time() > self.expires_at

    def to_intel_signal(self) -> dict:
        return {
            "source":      self.source,
            "entity_id":   self.fact_id,
            "signal_type": self.domain,
            "value":       self.severity,
            "confidence":  self.confidence,
            "metadata":    {
                "title":       self.title,
                "description": self.description[:300],
                "tags":        self.tags,
            },
        }


# ───────────────────────────────────── connector ──

class KnowledgeFeedConnector:
    """
    Continuously learns from external sources and pushes knowledge
    into the SAIB intelligence + brainstorm engines.
    """

    def __init__(self) -> None:
        self._facts:    Dict[str, Fact] = {}
        self._on_fact:  List[Callable[[Fact], None]] = []
        self._running:  bool = False
        self._polls:    int  = 0
        self._errors:   int  = 0
        self._new_facts_last_poll: int = 0

    # ── public API ────────────────────────────────────────────────────────

    def on_new_fact(self, cb: Callable[[Fact], None]) -> None:
        """Register callback fired for each new fact ingested."""
        self._on_fact.append(cb)

    def start(self) -> None:
        if self._running:
            return
        self._running = True
        asyncio.create_task(self._poll_loop())
        log.info("Knowledge feed connector started — %d RSS feeds configured", len(RSS_FEEDS))

    def stop(self) -> None:
        self._running = False

    def get_facts(
        self,
        domain:  Optional[str] = None,
        min_sev: float = 0.0,
        limit:   int   = 100,
    ) -> List[Fact]:
        facts = [
            f for f in self._facts.values()
            if not f.expired
            and (domain is None or f.domain == domain)
            and f.severity >= min_sev
        ]
        return sorted(facts, key=lambda f: f.severity, reverse=True)[:limit]

    def top_threats(self, n: int = 10) -> List[Fact]:
        return self.get_facts(domain="threat", min_sev=0.5, limit=n)

    def stats(self) -> dict:
        now = time.time()
        active = sum(1 for f in self._facts.values() if not f.expired)
        domains: Dict[str, int] = {}
        for f in self._facts.values():
            if not f.expired:
                domains[f.domain] = domains.get(f.domain, 0) + 1
        return {
            "total_facts":       len(self._facts),
            "active_facts":      active,
            "domains":           domains,
            "polls":             self._polls,
            "errors":            self._errors,
            "new_last_poll":     self._new_facts_last_poll,
            "rss_feeds":         len(RSS_FEEDS),
            "nvd_key_set":       bool(NVD_API_KEY),
            "abuseipdb_key_set": bool(ABUSEIPDB_KEY),
        }

    # ── polling ───────────────────────────────────────────────────────────

    async def _poll_loop(self) -> None:
        # stagger first poll 15s after start
        await asyncio.sleep(15)
        while self._running:
            new_count = 0
            try:
                results = await asyncio.gather(
                    self._pull_rss_feeds(),
                    self._pull_nvd_cves(),
                    self._pull_abuseipdb_top(),
                    self._pull_ofac_sanctions(),
                    return_exceptions=True,
                )
                for r in results:
                    if isinstance(r, int):
                        new_count += r
                self._new_facts_last_poll = new_count
                self._polls += 1
                self._prune_expired()
                log.info("Knowledge feed: poll %d complete — %d new facts, %d total",
                         self._polls, new_count, len(self._facts))
            except Exception as exc:
                self._errors += 1
                log.warning("Knowledge poll error: %s", exc)
            await asyncio.sleep(KNOWLEDGE_POLL_S)

    async def _pull_rss_feeds(self) -> int:
        new = 0
        async with httpx.AsyncClient(timeout=15.0) as client:
            for url in RSS_FEEDS:
                try:
                    resp = await client.get(url, follow_redirects=True)
                    if resp.status_code == 200:
                        new += self._parse_rss(resp.text, url)
                except Exception as exc:
                    log.debug("RSS %s error: %s", url[:60], exc)
        return new

    def _parse_rss(self, xml_text: str, source_url: str) -> int:
        new = 0
        try:
            root = ET.fromstring(xml_text)
            ns   = {"atom": "http://www.w3.org/2005/Atom"}
            items = root.findall(".//item") or root.findall(".//atom:entry", ns)
            domain = self._infer_domain(source_url)

            for item in items[:20]:
                title = (
                    item.findtext("title")
                    or item.findtext("atom:title", namespaces=ns)
                    or ""
                ).strip()
                desc = (
                    item.findtext("description")
                    or item.findtext("atom:summary", namespaces=ns)
                    or ""
                ).strip()
                link = (
                    item.findtext("link")
                    or item.findtext("atom:link", namespaces=ns)
                    or ""
                ).strip()
                if not title:
                    continue
                fid = "rss_" + hashlib.sha256(f"{source_url}:{title}".encode()).hexdigest()[:16]
                if fid in self._facts and not self._facts[fid].expired:
                    continue
                sev = self._estimate_severity(title + " " + desc, domain)
                fact = Fact(
                    fact_id=fid,
                    domain=domain,
                    title=title[:200],
                    description=desc[:500],
                    source=source_url[:80],
                    confidence=0.75,
                    severity=sev,
                    tags=self._extract_tags(title + " " + desc),
                )
                self._ingest_fact(fact)
                new += 1
        except ET.ParseError as exc:
            log.debug("RSS parse error: %s", exc)
        return new

    async def _pull_nvd_cves(self) -> int:
        """Pull recent high-severity CVEs from the NVD API."""
        new = 0
        try:
            params: dict = {
                "resultsPerPage": "20",
                "cvssV3Severity":  "HIGH",
                "noRejected":      "",
            }
            headers: dict = {}
            if NVD_API_KEY:
                headers["apiKey"] = NVD_API_KEY
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.get(
                    "https://services.nvd.nist.gov/rest/json/cves/2.0",
                    params=params,
                    headers=headers,
                )
                if resp.status_code != 200:
                    return 0
                data = resp.json()
                for vuln in data.get("vulnerabilities", []):
                    cve  = vuln.get("cve", {})
                    cid  = cve.get("id", "")
                    fid  = "nvd_" + cid
                    if fid in self._facts:
                        continue
                    desc_items = (
                        cve.get("descriptions", [{}])
                    )
                    description = next(
                        (d["value"] for d in desc_items if d.get("lang") == "en"), ""
                    )
                    metrics = cve.get("metrics", {})
                    base_score = 0.0
                    for v in ("cvssMetricV31", "cvssMetricV30", "cvssMetricV2"):
                        if metrics.get(v):
                            base_score = float(
                                metrics[v][0].get("cvssData", {}).get("baseScore", 0.0)
                            )
                            break
                    sev = min(1.0, base_score / 10.0)
                    fact = Fact(
                        fact_id=fid,
                        domain="threat",
                        title=f"CVE {cid}",
                        description=description[:500],
                        source="NVD",
                        confidence=0.95,
                        severity=sev,
                        tags=["cve", "vulnerability", cid],
                        expires_at=time.time() + 7 * 86400,
                    )
                    self._ingest_fact(fact)
                    new += 1
        except Exception as exc:
            log.debug("NVD pull error: %s", exc)
        return new

    async def _pull_abuseipdb_top(self) -> int:
        """Fetch the AbuseIPDB top-100 most reported IPs as threat facts."""
        if not ABUSEIPDB_KEY:
            return 0
        new = 0
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.get(
                    "https://api.abuseipdb.com/api/v2/blacklist",
                    headers={"Key": ABUSEIPDB_KEY, "Accept": "application/json"},
                    params={"limit": "100", "confidenceMinimum": "90"},
                )
                if resp.status_code != 200:
                    return 0
                for entry in resp.json().get("data", []):
                    ip   = entry.get("ipAddress", "")
                    conf = float(entry.get("abuseConfidenceScore", 0)) / 100.0
                    fid  = "abuseipdb_" + hashlib.sha256(ip.encode()).hexdigest()[:12]
                    if fid in self._facts and not self._facts[fid].expired:
                        continue
                    fact = Fact(
                        fact_id=fid,
                        domain="threat",
                        title=f"Malicious IP: {ip}",
                        description=f"AbuseIPDB confidence {conf*100:.0f}%  reports={entry.get('totalReports',0)}",
                        source="AbuseIPDB",
                        confidence=conf,
                        severity=min(1.0, conf * 1.1),
                        tags=["ip", "malicious", ip],
                        expires_at=time.time() + 3600 * 6,   # 6h TTL for IPs
                    )
                    self._ingest_fact(fact)
                    new += 1
        except Exception as exc:
            log.debug("AbuseIPDB pull error: %s", exc)
        return new

    async def _pull_ofac_sanctions(self) -> int:
        """Pull OFAC SDN delta feed — simplified check of additions."""
        new = 0
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.get(
                    "https://www.treasury.gov/ofac/downloads/sdn_delta.xml",
                    follow_redirects=True,
                )
                if resp.status_code == 200:
                    root = ET.fromstring(resp.content)
                    for entry in root.findall(".//{urn:us:gov:treasury:ofac:sdn}Record")[:30]:
                        name = entry.findtext(
                            "{urn:us:gov:treasury:ofac:sdn}lastName", ""
                        ) or entry.findtext("{urn:us:gov:treasury:ofac:sdn}firstName", "")
                        uid = entry.findtext(
                            "{urn:us:gov:treasury:ofac:sdn}uid", ""
                        )
                        if not uid:
                            continue
                        fid = "ofac_" + uid
                        if fid in self._facts:
                            continue
                        fact = Fact(
                            fact_id=fid,
                            domain="compliance",
                            title=f"OFAC SDN: {name}",
                            description=f"OFAC Specially Designated National. UID={uid}",
                            source="OFAC",
                            confidence=1.0,
                            severity=0.95,
                            tags=["ofac", "sanctions", "sdn"],
                            expires_at=time.time() + 30 * 86400,
                        )
                        self._ingest_fact(fact)
                        new += 1
        except Exception as exc:
            log.debug("OFAC pull error: %s", exc)
        return new

    # ── fact management ───────────────────────────────────────────────────

    def _ingest_fact(self, fact: Fact) -> None:
        self._facts[fact.fact_id] = fact
        for cb in self._on_fact:
            try:
                cb(fact)
            except Exception as exc:
                log.debug("Fact callback error: %s", exc)
        if fact.severity >= 0.7:
            log.info("High-severity fact [%s] %s: %s",
                     fact.domain, fact.fact_id[:12], fact.title[:80])

    def _prune_expired(self) -> None:
        expired_keys = [k for k, f in self._facts.items() if f.expired]
        for k in expired_keys:
            del self._facts[k]
        if len(self._facts) > MAX_FACTS:
            sorted_ids = sorted(
                self._facts.keys(),
                key=lambda k: self._facts[k].ts
            )
            for k in sorted_ids[:len(self._facts) - MAX_FACTS]:
                del self._facts[k]

    # ── helpers ───────────────────────────────────────────────────────────

    @staticmethod
    def _infer_domain(url: str) -> str:
        url_lower = url.lower()
        if "nvd" in url_lower or "cve" in url_lower or "dshield" in url_lower:
            return "threat"
        if "ofac" in url_lower or "fincen" in url_lower or "compliance" in url_lower:
            return "compliance"
        if "minepi" in url_lower or "pi.app" in url_lower or "pinetwork" in url_lower:
            return "pi_network"
        return "tech"

    @staticmethod
    def _estimate_severity(text: str, domain: str) -> float:
        t = text.lower()
        score = 0.3  # baseline
        HIGH_WORDS = [
            ("critical", 0.4), ("emergency", 0.4), ("breach", 0.35),
            ("exploit", 0.35), ("ransomware", 0.4), ("zero.?day", 0.45),
            ("rce", 0.4), ("sanction", 0.35), ("fraud", 0.3),
            ("high", 0.15), ("vulnerability", 0.15), ("attack", 0.2),
        ]
        for pattern, bump in HIGH_WORDS:
            if re.search(pattern, t):
                score = min(1.0, score + bump)
        if domain in ("compliance", "threat"):
            score = min(1.0, score + 0.1)
        return round(score, 3)

    @staticmethod
    def _extract_tags(text: str) -> List[str]:
        tags: List[str] = []
        patterns = {
            "cve":         r"CVE-\d{4}-\d+",
            "ip":          r"\b\d{1,3}(?:\.\d{1,3}){3}\b",
            "pi_network":  r"\b[Pp]i\s*[Nn]etwork\b",
            "blockchain":  r"\bblockchain\b",
            "wallet":      r"\bwallet\b",
        }
        for tag, pat in patterns.items():
            if re.search(pat, text):
                tags.append(tag)
        return list(set(tags))[:10]


# ── singleton ─────────────────────────────────────────────────────────────────
knowledge_feed = KnowledgeFeedConnector()
