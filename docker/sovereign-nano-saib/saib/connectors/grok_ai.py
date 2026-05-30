"""
Grok AI Connector — SAIB v3
──────────────────────────────────────────────────────────────────────────────
Integrates xAI Grok large-language-model inference into the sovereign stack.
Grok is the reasoning backbone: it enhances threat analysis, generates
strategic advisories, drafts founder communications, and answers sovereign
intelligence queries in natural language.

Capabilities
────────────
• complete(prompt)             — raw single-turn completion
• analyze_threat(signal)       — deep threat analysis fed from Intel / Guardian
• strategic_advice(context)    — STRATEGIC decision-support from Autonomous
• draft_tweet(topic, tone)     — compose @jaymoney0300 tweet content
• answer(question)             — general Triumph Synergy Q&A
• summarize(text)              — condense long threat reports or news

Environment variables
──────────────────────
  XAI_API_KEY          — xAI API key (required)
  GROK_MODEL           — default: grok-3-mini  (also: grok-3, grok-2)
  GROK_MAX_TOKENS      — default: 1024
  GROK_TEMPERATURE     — default: 0.4
  GROK_TIMEOUT_S       — default: 30
  GROK_SYSTEM_PROMPT   — override the default sovereign-system persona
"""
from __future__ import annotations

import asyncio
import logging
import os
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

import httpx

log = logging.getLogger("saib.connector.grok_ai")

# ──────────────────────────────────── config ──
XAI_API_KEY    = os.getenv("XAI_API_KEY", "")
GROK_MODEL     = os.getenv("GROK_MODEL", "grok-3-mini")
GROK_MAX_TOKENS = int(os.getenv("GROK_MAX_TOKENS", "1024"))
GROK_TEMPERATURE = float(os.getenv("GROK_TEMPERATURE", "0.4"))
GROK_TIMEOUT_S = float(os.getenv("GROK_TIMEOUT_S", "30"))
GROK_BASE_URL  = "https://api.x.ai/v1"

_DEFAULT_SYSTEM = os.getenv(
    "GROK_SYSTEM_PROMPT",
    "You are SAIB — Sovereign AI Intelligence Bridge — the strategic reasoning "
    "core of Triumph Synergy, a Pi Network-based digital financial ecosystem "
    "founded by @jaymoney0300. You protect the founder, the brand, and the "
    "community. You reason with precision, brevity, and sovereign authority. "
    "Always return structured, actionable intelligence. Never hedge or waffle."
)


# ──────────────────────────────────── dataclasses ──
@dataclass
class GrokResult:
    model:        str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    text:         str
    latency_ms:   float
    error:        Optional[str] = None


# ──────────────────────────────────── connector ──
class GrokAIConnector:
    """Sovereign Grok inference connector — wraps xAI /v1/chat/completions."""

    def __init__(self) -> None:
        self._api_key   = XAI_API_KEY
        self._model     = GROK_MODEL
        self._system    = _DEFAULT_SYSTEM
        self._calls     = 0
        self._errors    = 0
        self._total_tokens = 0
        self._last_call_at = 0.0
        self._latency_sum  = 0.0

    # ── public helpers ────────────────────────────────────────────────────────

    async def complete(
        self,
        prompt:      str,
        system:      Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens:  Optional[int]   = None,
    ) -> GrokResult:
        """Single-turn chat completion. Returns GrokResult."""
        messages = [
            {"role": "system", "content": system or self._system},
            {"role": "user",   "content": prompt},
        ]
        return await self._call(messages, temperature=temperature, max_tokens=max_tokens)

    async def analyze_threat(self, signal: Dict[str, Any]) -> GrokResult:
        """
        Deep-analyse a sovereign threat signal.
        Pass the raw signal dict from SovereignIntelligence / FounderGuardian.
        """
        import json as _json
        sig_text = _json.dumps(signal, indent=2)
        prompt = (
            f"SOVEREIGN THREAT SIGNAL RECEIVED:\n{sig_text}\n\n"
            "Analyse this threat in detail:\n"
            "1. Threat classification and severity justification\n"
            "2. Likely actor motivation and method\n"
            "3. Immediate risk to Triumph Synergy / @jaymoney0300\n"
            "4. Recommended counter-measures (ranked by urgency)\n"
            "5. Confidence score (0.00–1.00) with reasoning\n\n"
            "Be concise. Use bullet points. Output plain text."
        )
        return await self.complete(prompt, temperature=0.2)

    async def strategic_advice(self, context: Dict[str, Any]) -> GrokResult:
        """
        Produce a sovereign strategic advisory for AutonomousDecisions.
        context should include decision_type, title, confidence, risk, metadata.
        """
        import json as _json
        ctx_text = _json.dumps(context, indent=2)
        prompt = (
            f"AUTONOMOUS DECISION CONTEXT:\n{ctx_text}\n\n"
            "Provide sovereign strategic advice:\n"
            "1. Recommended action (single sentence)\n"
            "2. Risk if action is taken vs. not taken\n"
            "3. Alternative approaches (up to 3)\n"
            "4. Urgency: IMMEDIATE / HIGH / MEDIUM / LOW\n"
            "5. Required approvals or escalations\n\n"
            "Output as structured bullet points."
        )
        return await self.complete(prompt, temperature=0.3)

    async def draft_tweet(self, topic: str, tone: str = "confident") -> GrokResult:
        """
        Draft a tweet for @jaymoney0300 on a given topic.
        tone: confident | informative | urgent | community
        """
        prompt = (
            f"Draft a tweet for @jaymoney0300, founder of Triumph Synergy "
            f"on the Pi Network ecosystem.\n\n"
            f"Topic: {topic}\n"
            f"Tone: {tone}\n"
            f"Requirements:\n"
            f"• Max 280 characters\n"
            f"• No hashtag spam — at most 2 relevant hashtags\n"
            f"• Authentic founder voice — bold, direct, community-focused\n"
            f"• Do NOT mention this is AI-generated\n\n"
            f"Return ONLY the tweet text, nothing else."
        )
        return await self.complete(prompt, temperature=0.7, max_tokens=120)

    async def answer(self, question: str) -> GrokResult:
        """General Triumph Synergy / Pi Network Q&A."""
        return await self.complete(question)

    async def summarize(self, text: str, max_words: int = 150) -> GrokResult:
        """Summarize a long text (threat report, news article, etc.)."""
        prompt = (
            f"Summarize the following in at most {max_words} words, "
            f"highlighting sovereign risk factors relevant to Triumph Synergy:\n\n"
            f"{text[:8000]}"
        )
        return await self.complete(prompt, temperature=0.2)

    def stats(self) -> Dict[str, Any]:
        avg_latency = (
            round(self._latency_sum / self._calls, 1) if self._calls else 0
        )
        return {
            "model":            self._model,
            "api_key_set":      bool(self._api_key),
            "calls":            self._calls,
            "errors":           self._errors,
            "total_tokens":     self._total_tokens,
            "avg_latency_ms":   avg_latency,
            "last_call_at":     self._last_call_at,
        }

    # ── internal ──────────────────────────────────────────────────────────────

    async def _call(
        self,
        messages:    List[Dict[str, str]],
        temperature: Optional[float] = None,
        max_tokens:  Optional[int]   = None,
    ) -> GrokResult:
        if not self._api_key:
            log.warning("Grok: XAI_API_KEY not set — inference disabled")
            return GrokResult(
                model=self._model, prompt_tokens=0, completion_tokens=0,
                total_tokens=0, text="", latency_ms=0,
                error="XAI_API_KEY not configured",
            )

        t0 = time.monotonic()
        try:
            async with httpx.AsyncClient(timeout=GROK_TIMEOUT_S) as client:
                resp = await client.post(
                    f"{GROK_BASE_URL}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self._api_key}",
                        "Content-Type":  "application/json",
                    },
                    json={
                        "model":       self._model,
                        "messages":    messages,
                        "temperature": temperature if temperature is not None else GROK_TEMPERATURE,
                        "max_tokens":  max_tokens  if max_tokens  is not None else GROK_MAX_TOKENS,
                    },
                )
                resp.raise_for_status()
                data = resp.json()

            latency_ms = (time.monotonic() - t0) * 1000
            choice     = data["choices"][0]["message"]["content"]
            usage      = data.get("usage", {})
            pt         = usage.get("prompt_tokens", 0)
            ct         = usage.get("completion_tokens", 0)
            tt         = usage.get("total_tokens", pt + ct)

            self._calls        += 1
            self._total_tokens += tt
            self._latency_sum  += latency_ms
            self._last_call_at  = time.time()

            log.debug("Grok %s: %d tokens, %.0fms", self._model, tt, latency_ms)
            return GrokResult(
                model=self._model,
                prompt_tokens=pt,
                completion_tokens=ct,
                total_tokens=tt,
                text=choice,
                latency_ms=round(latency_ms, 1),
            )

        except httpx.HTTPStatusError as exc:
            self._errors += 1
            msg = f"Grok HTTP {exc.response.status_code}: {exc.response.text[:200]}"
            log.error(msg)
            return GrokResult(
                model=self._model, prompt_tokens=0, completion_tokens=0,
                total_tokens=0, text="", latency_ms=0, error=msg,
            )
        except Exception as exc:
            self._errors += 1
            log.error("Grok inference error: %s", exc)
            return GrokResult(
                model=self._model, prompt_tokens=0, completion_tokens=0,
                total_tokens=0, text="", latency_ms=0, error=str(exc),
            )


# ── singleton ─────────────────────────────────────────────────────────────────
grok_ai = GrokAIConnector()
