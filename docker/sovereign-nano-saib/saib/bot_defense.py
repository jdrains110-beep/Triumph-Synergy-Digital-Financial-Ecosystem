"""
Bot Defense Engine — Supernatural Apex Scammer & Bot Detection
──────────────────────────────────────────────────────────────
Capabilities:
  • Multi-signal bot scoring: creation date, follower ratio, tweet velocity,
    generic content patterns, impersonation detection, hashtag spam
  • Scammer pattern library: rug pull, pump-and-dump, fake giveaway, impersonation
  • Block hostile/bot accounts via X API (OAuth 1.0a)
  • Report scammer accounts to X Trust & Safety
  • Maintain persistent threat registry with evidence chains
  • Grok AI deep-analysis for ambiguous accounts
  • Background scan of @jaymoney0300 mentions for hostile actors
  • Cannot delete other users' accounts (X API limitation — block/report instead)
"""
from __future__ import annotations

import asyncio
import hashlib
import hmac
import logging
import time
import urllib.parse
import uuid
from collections import deque
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional

import aiohttp

log = logging.getLogger("sovereign.botdefense")


class ThreatClass(Enum):
    CLEAN         = "clean"
    SUSPICIOUS    = "suspicious"
    BOT           = "bot"
    SCAMMER       = "scammer"
    IMPERSONATOR  = "impersonator"
    COORDINATED   = "coordinated_inauthentic"


@dataclass
class AccountThreat:
    account_id: str
    username: str
    threat_class: ThreatClass
    score: float           # 0-1, higher = more dangerous
    signals: List[str]
    grok_analysis: str
    ts: float = field(default_factory=time.time)
    action_taken: str = "none"
    blocked: bool = False
    reported: bool = False


# ── Known scam/bot signal patterns ──────────────────────────────────────────

BOT_SIGNALS = {
    "generic_bio":     ["crypto millionaire", "financial freedom", "dm for collab", "i follow back"],
    "scam_phrases":    ["send pi", "send btc", "double your pi", "guaranteed return", "100x",
                       "free giveaway", "dm to claim", "limited offer", "act now",
                       "pi network support", "official triumph", "recovery specialist",
                       "hacked wallet", "restore wallet"],
    "impersonation":   ["jaymoney", "triumph synergy official", "triumphsynergy", "pi triumph",
                       "triumph_official", "jaymoney0300 official"],
    "rug_patterns":    ["presale", "whitelist", "early access", "liquidity locked", "audited contract",
                       "100% safu", "dev doxxed"],
    "threat_keywords": ["scam", "fraud", "rug", "fake", "impersonator", "hack", "stolen",
                       "lawsuit", "sec investigation", "cftc"],
}

IMPERSONATION_TARGETS = ["jaymoney0300", "triumphsynergy", "triumph synergy", "triumph_synergy"]


class BotDefenseEngine:
    """
    Supernatural Apex Bot & Scammer Detection Engine.

    Scoring model (0-1):
      0.0 - 0.29 → CLEAN
      0.30 - 0.49 → SUSPICIOUS (watch)
      0.50 - 0.69 → BOT (auto-block)
      0.70 - 0.84 → SCAMMER (block + report)
      0.85 - 1.00 → IMPERSONATOR/COORDINATED (block + report + guardian alert)

    Block threshold: 0.50  (configurable)
    Report threshold: 0.70 (configurable)
    """

    BLOCK_THRESHOLD  = 0.50
    REPORT_THRESHOLD = 0.70
    SCAN_INTERVAL_S  = 120.0

    def __init__(self) -> None:
        self._registry: Dict[str, AccountThreat] = {}
        self._history:  deque[AccountThreat]      = deque(maxlen=500)
        self._blocklist: set[str]                  = set()
        self._whitelist: set[str]                  = {"jaymoney0300"}
        self._total_scanned    = 0
        self._total_blocked    = 0
        self._total_reported   = 0
        self._running          = False
        self._grok: Any  = None
        self._x_social: Any = None
        self._guardian: Any = None

    def boot(self, grok: Any, x_social: Any, guardian: Any) -> None:
        self._grok     = grok
        self._x_social = x_social
        self._guardian = guardian
        self._running  = True
        asyncio.create_task(self._scan_loop())
        log.info("BotDefenseEngine: online")

    # ── public API ────────────────────────────────────────────────────────────

    async def assess(self, account_data: Dict[str, Any]) -> AccountThreat:
        """
        Full multi-signal assessment of an X account.
        Feeds through Grok AI if score is in ambiguous range (0.35-0.65).
        """
        account_id = str(account_data.get("id", ""))
        username   = str(account_data.get("username", "")).lower()

        if username in self._whitelist:
            t = AccountThreat(account_id=account_id, username=username,
                              threat_class=ThreatClass.CLEAN, score=0.0,
                              signals=["whitelisted"], grok_analysis="")
            return t

        self._total_scanned += 1
        signals: List[str] = []
        score = 0.0

        # ── Signal 1: account age ──────────────────────────────────────────
        created = account_data.get("created_at", "")
        if created:
            try:
                import datetime
                created_dt = datetime.datetime.fromisoformat(created.replace("Z", "+00:00"))
                age_days = (datetime.datetime.now(datetime.timezone.utc) - created_dt).days
                if age_days < 7:
                    score += 0.25; signals.append("account_age<7d")
                elif age_days < 30:
                    score += 0.15; signals.append("account_age<30d")
                elif age_days < 90:
                    score += 0.05; signals.append("account_age<90d")
            except Exception:
                pass

        # ── Signal 2: follower/following ratio ─────────────────────────────
        followers = account_data.get("public_metrics", {}).get("followers_count", 0)
        following = account_data.get("public_metrics", {}).get("following_count", 1)
        ratio = following / max(followers, 1)
        if ratio > 50:
            score += 0.20; signals.append(f"follower_ratio>{ratio:.0f}x")
        elif ratio > 10:
            score += 0.10; signals.append(f"follower_ratio>{ratio:.0f}x")

        # ── Signal 3: tweet count vs account age ──────────────────────────
        tweet_count = account_data.get("public_metrics", {}).get("tweet_count", 0)
        if tweet_count > 5000 and (age_days if 'age_days' in dir() else 365) < 90:
            score += 0.15; signals.append("high_velocity_tweets")

        # ── Signal 4: no profile image / default bio ───────────────────────
        if not account_data.get("profile_image_url") or "default_profile" in str(account_data.get("profile_image_url", "")):
            score += 0.10; signals.append("no_profile_image")

        # ── Signal 5: scam phrases in bio / name ──────────────────────────
        bio  = (account_data.get("description") or "").lower()
        name = (account_data.get("name") or "").lower()
        combined_text = f"{bio} {name} {username}"

        for phrase in BOT_SIGNALS["generic_bio"]:
            if phrase in combined_text:
                score += 0.08; signals.append(f"bio_phrase:{phrase[:20]}")
                break

        for phrase in BOT_SIGNALS["scam_phrases"]:
            if phrase in combined_text:
                score += 0.20; signals.append(f"scam_phrase:{phrase[:20]}")

        # ── Signal 6: impersonation detection ─────────────────────────────
        for target in IMPERSONATION_TARGETS:
            if target in username and username != target:
                score += 0.40; signals.append(f"impersonates:{target}")
            elif target in name.lower() and username != "jaymoney0300":
                score += 0.30; signals.append(f"name_impersonates:{target}")

        # ── Signal 7: tweet content analysis ──────────────────────────────
        recent_tweets = account_data.get("recent_tweets", [])
        for tweet in recent_tweets[:10]:
            text = tweet.get("text", "").lower()
            for phrase in BOT_SIGNALS["scam_phrases"] + BOT_SIGNALS["rug_patterns"]:
                if phrase in text:
                    score += 0.12; signals.append(f"tweet_scam:{phrase[:20]}")
                    break

        score = min(score, 1.0)

        # ── Grok deep analysis for ambiguous range ─────────────────────────
        grok_analysis = ""
        if 0.35 <= score <= 0.65 and self._grok:
            grok_analysis, grok_adjustment = await self._grok_assess(account_data, signals, score)
            score = min(score + grok_adjustment, 1.0)
            signals.append(f"grok_adj:{grok_adjustment:+.2f}")

        # ── Classify ───────────────────────────────────────────────────────
        if score < 0.30:
            threat_class = ThreatClass.CLEAN
        elif score < 0.50:
            threat_class = ThreatClass.SUSPICIOUS
        elif score < 0.70:
            threat_class = ThreatClass.BOT
        elif score < 0.85:
            threat_class = ThreatClass.SCAMMER
        else:
            # check if impersonation
            if any("impersonates" in s for s in signals):
                threat_class = ThreatClass.IMPERSONATOR
            else:
                threat_class = ThreatClass.COORDINATED

        threat = AccountThreat(
            account_id=account_id,
            username=username,
            threat_class=threat_class,
            score=round(score, 3),
            signals=signals,
            grok_analysis=grok_analysis,
        )
        self._registry[account_id] = threat
        self._history.appendleft(threat)

        # auto-action based on score
        if score >= self.BLOCK_THRESHOLD and account_id:
            await self._take_action(threat)

        return threat

    async def force_assess(self, username: str) -> Dict[str, Any]:
        """Manually trigger assessment of a specific X username."""
        if not self._x_social:
            return {"ok": False, "error": "X social connector not available"}
        try:
            user_data = await self._x_social.get_user_by_username(username)
            if not user_data:
                return {"ok": False, "error": f"User @{username} not found"}
            threat = await self.assess(user_data)
            return {
                "ok": True,
                "username": threat.username,
                "threat_class": threat.threat_class.value,
                "score": threat.score,
                "signals": threat.signals,
                "grok_analysis": threat.grok_analysis,
                "action_taken": threat.action_taken,
                "blocked": threat.blocked,
                "reported": threat.reported,
            }
        except Exception as exc:
            return {"ok": False, "error": str(exc)}

    def stats(self) -> Dict[str, Any]:
        class_counts: Dict[str, int] = {}
        for t in self._registry.values():
            class_counts[t.threat_class.value] = class_counts.get(t.threat_class.value, 0) + 1

        return {
            "total_scanned":    self._total_scanned,
            "total_blocked":    self._total_blocked,
            "total_reported":   self._total_reported,
            "registry_size":    len(self._registry),
            "blocklist_size":   len(self._blocklist),
            "by_threat_class":  class_counts,
            "block_threshold":  self.BLOCK_THRESHOLD,
            "report_threshold": self.REPORT_THRESHOLD,
            "recent_threats": [
                {
                    "username":     t.username,
                    "threat_class": t.threat_class.value,
                    "score":        t.score,
                    "signals":      t.signals[:5],
                    "action":       t.action_taken,
                    "ts":           t.ts,
                }
                for t in list(self._history)[:20]
                if t.threat_class != ThreatClass.CLEAN
            ],
        }

    # ── background scan ───────────────────────────────────────────────────────

    async def _scan_loop(self) -> None:
        await asyncio.sleep(30)
        while self._running:
            try:
                await self._scan_mentions()
            except Exception as exc:
                log.warning("BotDefense scan_loop: %s", exc)
            await asyncio.sleep(self.SCAN_INTERVAL_S)

    async def _scan_mentions(self) -> None:
        """Scan recent mentions of @jaymoney0300 for hostile actors."""
        if not self._x_social:
            return
        try:
            mentions = await self._x_social.get_mentions(max_results=50)
            for mention in mentions:
                author = mention.get("author", {})
                if not author:
                    continue
                account_id = str(author.get("id", ""))
                if account_id in self._blocklist:
                    continue
                if account_id in self._registry:
                    existing = self._registry[account_id]
                    if existing.threat_class == ThreatClass.CLEAN:
                        continue
                # build enriched account data from mention context
                account_data = {**author, "recent_tweets": [{"text": mention.get("text", "")}]}
                await self.assess(account_data)
        except Exception as exc:
            log.debug("BotDefense mention scan: %s", exc)

    # ── actions ───────────────────────────────────────────────────────────────

    async def _take_action(self, threat: AccountThreat) -> None:
        """Apply block/report actions based on threat score."""
        if threat.account_id in self._blocklist:
            return

        actions_taken = []

        if threat.score >= self.BLOCK_THRESHOLD and not threat.blocked:
            ok = await self._block_account(threat.account_id)
            if ok:
                threat.blocked = True
                self._blocklist.add(threat.account_id)
                self._total_blocked += 1
                actions_taken.append("blocked")

        if threat.score >= self.REPORT_THRESHOLD and not threat.reported:
            ok = await self._report_account(threat.account_id, threat.threat_class)
            if ok:
                threat.reported = True
                self._total_reported += 1
                actions_taken.append("reported")

        if threat.threat_class in (ThreatClass.IMPERSONATOR, ThreatClass.COORDINATED):
            await self._escalate_to_guardian(threat)
            actions_taken.append("guardian_alert")

        threat.action_taken = ",".join(actions_taken) or "none"
        if actions_taken:
            log.warning("[BOTDEF] @%s → %s (score=%.2f) actions=%s",
                        threat.username, threat.threat_class.value,
                        threat.score, threat.action_taken)

    async def _block_account(self, account_id: str) -> bool:
        """Block account via X API v2 (requires OAuth 1.0a)."""
        if not self._x_social:
            return False
        try:
            return await self._x_social.block_user(account_id)
        except Exception as exc:
            log.debug("Block failed for %s: %s", account_id, exc)
            return False

    async def _report_account(self, account_id: str, threat_class: ThreatClass) -> bool:
        """Report account to X Trust & Safety via API v2."""
        if not self._x_social:
            return False
        try:
            category_map = {
                ThreatClass.SCAMMER:       "spam",
                ThreatClass.IMPERSONATOR:  "impersonation",
                ThreatClass.BOT:           "spam",
                ThreatClass.COORDINATED:   "spam",
            }
            category = category_map.get(threat_class, "spam")
            return await self._x_social.report_user(account_id, category)
        except Exception as exc:
            log.debug("Report failed for %s: %s", account_id, exc)
            return False

    async def _escalate_to_guardian(self, threat: AccountThreat) -> None:
        if not self._guardian:
            return
        try:
            from .guardian import ThreatIndicator, ProtectionCategory
            indicator = ThreatIndicator(
                source=f"bot-defense/@{threat.username}",
                category=ProtectionCategory.FOUNDER_SAFETY,
                severity=threat.score,
                description=(
                    f"{threat.threat_class.value.upper()} detected: @{threat.username} "
                    f"(score={threat.score:.2f}). Signals: {', '.join(threat.signals[:5])}"
                ),
                metadata={
                    "account_id":   threat.account_id,
                    "username":     threat.username,
                    "threat_class": threat.threat_class.value,
                    "score":        threat.score,
                    "signals":      threat.signals,
                },
            )
            self._guardian.ingest(indicator)
        except Exception as exc:
            log.debug("Guardian escalation: %s", exc)

    # ── Grok analysis ─────────────────────────────────────────────────────────

    async def _grok_assess(
        self,
        account_data: Dict[str, Any],
        signals: List[str],
        initial_score: float,
    ) -> tuple[str, float]:
        """Grok deep analysis for ambiguous accounts. Returns (analysis_text, score_adjustment)."""
        import json as _json
        data_text = _json.dumps({
            "username":    account_data.get("username"),
            "name":        account_data.get("name"),
            "bio":         account_data.get("description", "")[:300],
            "followers":   account_data.get("public_metrics", {}).get("followers_count", 0),
            "following":   account_data.get("public_metrics", {}).get("following_count", 0),
            "tweets":      account_data.get("public_metrics", {}).get("tweet_count", 0),
            "created_at":  account_data.get("created_at", ""),
            "recent_tweets": [t.get("text", "")[:100] for t in account_data.get("recent_tweets", [])[:5]],
        }, indent=2)

        prompt = (
            f"BOT/SCAMMER ASSESSMENT\n"
            f"Initial signals detected: {signals}\n"
            f"Initial score: {initial_score:.2f}\n"
            f"Account data:\n{data_text}\n\n"
            f"Is this a bot, scammer, or impersonator targeting Triumph Synergy / @jaymoney0300?\n"
            f"Respond in this format:\n"
            f"VERDICT: <bot|scammer|impersonator|suspicious|clean>\n"
            f"REASONING: <1-2 sentences>\n"
            f"SCORE_ADJUSTMENT: <-0.30 to +0.30>"
        )
        try:
            result = await self._grok.complete(prompt, system=(
                "You are a sovereign bot detection expert. Protect @jaymoney0300 and "
                "Triumph Synergy from scammers, impersonators, and coordinated bot attacks."
            ))
            text = result.get("content", "") if isinstance(result, dict) else str(result)
            analysis = ""
            adjustment = 0.0
            for line in text.split("\n"):
                line = line.strip()
                if line.startswith("REASONING:"):
                    analysis = line[10:].strip()
                elif line.startswith("SCORE_ADJUSTMENT:"):
                    try:
                        adjustment = float(line[17:].strip())
                    except ValueError:
                        pass
            return analysis, max(-0.30, min(adjustment, 0.30))
        except Exception:
            return "", 0.0


# singleton
bot_defense = BotDefenseEngine()
