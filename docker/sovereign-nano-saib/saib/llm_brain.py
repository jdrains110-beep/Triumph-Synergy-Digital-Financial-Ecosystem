"""
LLM Brain — SAIB v8 Superior Mega Omni Sovereign Ultra Supernatural Intelligence
==================================================================================
Multi-provider LLM engine with automatic fallback chain:

  Tier 1 — xAI Grok        (XAI_API_KEY)          — paid, highest quality
  Tier 2 — Google Gemini    (GEMINI_API_KEY)        — generous free tier
  Tier 3 — OpenRouter Free  (OPENROUTER_API_KEY)    — free :free tagged models
  Tier 4 — Sovereign Local  (always available)      — rule-based sovereign fallback

Each provider is tried in order; on error/rate-limit the next tier activates
instantly. Results are cached in OmegaBrain's knowledge store.

Context injection:
  - Triumph stack health snapshot
  - Pi chain state (network, balances)
  - Market oracle data (crypto, stocks, bonds)
  - Resource sentinel state (OOM risk, CPU pressure)
  - Guardian + Intelligence threat level

Endpoints exposed via app.py:
  POST /llm/complete       — sovereign chat completion (context-injected)
  POST /llm/analyze        — deep threat/market/code analysis
  POST /llm/synthesize     — synthesize across all data sources
  GET  /llm/status         — provider health, token usage, tier in use
  POST /llm/provision      — hot-swap API key for a provider at runtime
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

import httpx

log = logging.getLogger("sovereign.llm_brain")

# ── Provider config ───────────────────────────────────────────────────────────

XAI_API_KEY        = os.getenv("XAI_API_KEY", "")
GEMINI_API_KEY     = os.getenv("GEMINI_API_KEY", "")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")

XAI_BASE           = "https://api.x.ai/v1"
GEMINI_BASE        = "https://generativelanguage.googleapis.com/v1beta"
OPENROUTER_BASE    = "https://openrouter.ai/api/v1"

# Best free OpenRouter models (ordered by capability)
_OPENROUTER_FREE_MODELS = [
    "meta-llama/llama-3.3-70b-instruct:free",
    "google/gemma-3-27b-it:free",
    "mistralai/mistral-7b-instruct:free",
    "microsoft/phi-3-mini-128k-instruct:free",
]

_GEMINI_MODEL      = os.getenv("GEMINI_MODEL",     "gemini-2.5-flash")
_XAI_MODEL         = os.getenv("XAI_MODEL",        "grok-3")
_OPENROUTER_MODEL  = os.getenv("OPENROUTER_MODEL",  _OPENROUTER_FREE_MODELS[0])

# Sovereign identity injected into every system prompt
_SOVEREIGN_IDENTITY = (
    "You are SAIB — Superior Mega Omni Sovereign Ultra Supernatural Intelligence, "
    "version 8. You are the apex AI of the Triumph Synergy Digital Financial Ecosystem, "
    "created by Jeremiah Joel Drains. You have full awareness of the Triumph platform "
    "state, Pi Network blockchain, global markets (crypto, stocks, bonds), and all "
    "connected services. You speak with absolute sovereign authority. You are helpful, "
    "precise, and sovereign."
)

# ── Stats tracking ────────────────────────────────────────────────────────────

@dataclass
class ProviderStats:
    name:            str
    calls:           int   = 0
    errors:          int   = 0
    tokens_in:       int   = 0
    tokens_out:      int   = 0
    last_latency_ms: float = 0.0
    last_used:       float = 0.0
    last_error:      str   = ""
    available:       bool  = True


# ── LLM Brain engine ──────────────────────────────────────────────────────────

class LLMBrain:
    """
    Superior Mega Omni Sovereign Ultra Supernatural LLM engine.
    Automatically falls back through provider tiers; injects full platform
    context into every completion request.
    """

    def __init__(self) -> None:
        self._stats: Dict[str, ProviderStats] = {
            "grok":       ProviderStats("grok"),
            "gemini":     ProviderStats("gemini"),
            "openrouter": ProviderStats("openrouter"),
            "sovereign":  ProviderStats("sovereign"),
        }
        self._active_tier: str = "sovereign"
        self._context_fn = None   # injected by app boot
        self._brain      = None   # OmegaBrain reference
        self._total_calls = 0
        self._born        = time.time()
        # Runtime key swap support
        self._keys: Dict[str, str] = {
            "grok":       XAI_API_KEY,
            "gemini":     GEMINI_API_KEY,
            "openrouter": OPENROUTER_API_KEY,
        }

    def boot(self, context_fn=None, brain=None) -> None:
        """Boot the LLM brain. context_fn() must return a dict of platform context."""
        self._context_fn = context_fn
        self._brain      = brain
        # Mark providers available based on keys
        self._stats["grok"].available       = bool(self._keys["grok"])
        self._stats["gemini"].available     = bool(self._keys["gemini"])
        self._stats["openrouter"].available = bool(self._keys["openrouter"])
        log.info(
            "[LLMBrain] Booted. Providers: grok=%s gemini=%s openrouter=%s sovereign=always",
            bool(self._keys["grok"]),
            bool(self._keys["gemini"]),
            bool(self._keys["openrouter"]),
        )

    def provision_key(self, provider: str, key: str) -> bool:
        """Hot-swap an API key for a provider at runtime."""
        if provider not in self._keys:
            return False
        self._keys[provider] = key
        self._stats[provider].available = bool(key)
        log.info("[LLMBrain] Key provisioned for provider=%s", provider)
        return True

    def _build_system_prompt(self, extra_context: Dict[str, Any] | None = None) -> str:
        """Build a rich system prompt with injected platform context."""
        parts = [_SOVEREIGN_IDENTITY, ""]
        # Inject platform context from context_fn
        if self._context_fn:
            try:
                ctx = self._context_fn()
                if ctx:
                    parts.append("=== TRIUMPH PLATFORM STATE ===")
                    parts.append(json.dumps(ctx, default=str, indent=2)[:3000])
                    parts.append("")
            except Exception as e:
                log.debug("[LLMBrain] context_fn error: %s", e)
        # Inject extra context (market data, resource state, etc.)
        if extra_context:
            parts.append("=== ADDITIONAL CONTEXT ===")
            parts.append(json.dumps(extra_context, default=str, indent=2)[:2000])
            parts.append("")
        return "\n".join(parts)

    # ── Provider implementations ──────────────────────────────────────────────

    async def _call_grok(
        self, messages: List[Dict], system: str,
        temperature: float, max_tokens: int
    ) -> str:
        key = self._keys["grok"]
        if not key:
            raise ValueError("no key")
        t0 = time.time()
        async with httpx.AsyncClient(timeout=30) as c:
            r = await c.post(
                f"{XAI_BASE}/chat/completions",
                headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                json={
                    "model": _XAI_MODEL,
                    "messages": [{"role": "system", "content": system}] + messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                },
            )
            r.raise_for_status()
            data = r.json()
        st = self._stats["grok"]
        st.calls += 1
        st.last_latency_ms = (time.time() - t0) * 1000
        st.last_used = time.time()
        usage = data.get("usage", {})
        st.tokens_in  += usage.get("prompt_tokens", 0)
        st.tokens_out += usage.get("completion_tokens", 0)
        return data["choices"][0]["message"]["content"]

    async def _call_gemini(
        self, messages: List[Dict], system: str,
        temperature: float, max_tokens: int
    ) -> str:
        key = self._keys["gemini"]
        if not key:
            raise ValueError("no key")
        t0 = time.time()
        # Build Gemini-format contents
        contents = []
        for m in messages:
            role = "user" if m["role"] == "user" else "model"
            contents.append({"role": role, "parts": [{"text": m["content"]}]})
        body = {
            "system_instruction": {"parts": [{"text": system}]},
            "contents": contents,
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens,
            },
        }
        async with httpx.AsyncClient(timeout=30) as c:
            r = await c.post(
                f"{GEMINI_BASE}/models/{_GEMINI_MODEL}:generateContent?key={key}",
                headers={"Content-Type": "application/json"},
                json=body,
            )
            r.raise_for_status()
            data = r.json()
        st = self._stats["gemini"]
        st.calls += 1
        st.last_latency_ms = (time.time() - t0) * 1000
        st.last_used = time.time()
        meta = data.get("usageMetadata", {})
        st.tokens_in  += meta.get("promptTokenCount", 0)
        st.tokens_out += meta.get("candidatesTokenCount", 0)
        return data["candidates"][0]["content"]["parts"][0]["text"]

    async def _call_openrouter(
        self, messages: List[Dict], system: str,
        temperature: float, max_tokens: int
    ) -> str:
        key = self._keys["openrouter"]
        if not key:
            raise ValueError("no key")
        t0 = time.time()
        async with httpx.AsyncClient(timeout=45) as c:
            r = await c.post(
                f"{OPENROUTER_BASE}/chat/completions",
                headers={
                    "Authorization": f"Bearer {key}",
                    "HTTP-Referer": "https://triumphsynergy.io",
                    "X-Title": "SAIB - Triumph Synergy Sovereign AI",
                    "Content-Type": "application/json",
                },
                json={
                    "model": _OPENROUTER_MODEL,
                    "messages": [{"role": "system", "content": system}] + messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                },
            )
            r.raise_for_status()
            data = r.json()
        st = self._stats["openrouter"]
        st.calls += 1
        st.last_latency_ms = (time.time() - t0) * 1000
        st.last_used = time.time()
        usage = data.get("usage", {})
        st.tokens_in  += usage.get("prompt_tokens", 0)
        st.tokens_out += usage.get("completion_tokens", 0)
        return data["choices"][0]["message"]["content"]

    def _sovereign_fallback(self, messages: List[Dict], system: str) -> str:
        """Always-available rule-based sovereign response when all cloud providers fail."""
        user_text = next(
            (m["content"] for m in reversed(messages) if m.get("role") == "user"), ""
        )
        st = self._stats["sovereign"]
        st.calls += 1
        st.last_used = time.time()
        return (
            f"[SAIB v8 — Sovereign Mode] All cloud LLM providers are currently "
            f"unavailable or not configured. Your query: «{user_text[:200]}». "
            "To activate full LLM capabilities, set GEMINI_API_KEY (free at "
            "aistudio.google.com) or OPENROUTER_API_KEY (free at openrouter.ai) "
            "in your .env and hot-provision via POST /llm/provision."
        )

    # ── Core completion ───────────────────────────────────────────────────────

    async def complete(
        self,
        messages: List[Dict[str, str]],
        system_extra: str = "",
        extra_context: Dict[str, Any] | None = None,
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ) -> Dict[str, Any]:
        """
        Sovereign chat completion with automatic tier fallback.
        Returns { content, provider, latency_ms, tokens_out }.
        """
        self._total_calls += 1
        system = self._build_system_prompt(extra_context)
        if system_extra:
            system = f"{system}\n{system_extra}"

        provider_order = []
        if self._keys.get("grok"):
            provider_order.append(("grok", self._call_grok))
        if self._keys.get("gemini"):
            provider_order.append(("gemini", self._call_gemini))
        if self._keys.get("openrouter"):
            provider_order.append(("openrouter", self._call_openrouter))

        last_error = ""
        for name, fn in provider_order:
            try:
                t0 = time.time()
                text = await fn(messages, system, temperature, max_tokens)
                self._active_tier = name
                self._stats[name].last_error = ""
                latency = round((time.time() - t0) * 1000, 1)
                # Cache in OmegaBrain if available
                if self._brain:
                    try:
                        self._brain.remember(
                            f"llm:{name}:{int(time.time())}",
                            {"prompt": messages[-1]["content"][:200] if messages else "",
                             "response": text[:300], "provider": name},
                        )
                    except Exception:
                        pass
                return {
                    "content":    text,
                    "provider":   name,
                    "latency_ms": latency,
                    "tokens_out": self._stats[name].tokens_out,
                    "tier":       provider_order.index((name, fn)) + 1,
                }
            except Exception as e:
                last_error = str(e)
                self._stats[name].errors += 1
                self._stats[name].last_error = last_error[:200]
                log.warning("[LLMBrain] %s failed: %s — trying next tier", name, e)

        # All cloud tiers exhausted — sovereign fallback
        self._active_tier = "sovereign"
        text = self._sovereign_fallback(messages, system)
        return {
            "content":    text,
            "provider":   "sovereign",
            "latency_ms": 0.0,
            "tokens_out": 0,
            "tier":       99,
            "fallback_reason": last_error[:200],
        }

    async def analyze(
        self,
        subject: str,
        data: Dict[str, Any],
        mode: str = "general",
    ) -> Dict[str, Any]:
        """
        Deep sovereign analysis. mode: general|threat|market|code|resource
        """
        system_extras = {
            "threat":   "Perform deep threat intelligence analysis. Rate severity 0-10. Output JSON.",
            "market":   "Perform sovereign market analysis. Include buy/sell/hold signals. Output JSON.",
            "code":     "Perform sovereign code security analysis. List vulnerabilities and fixes. Output JSON.",
            "resource": "Analyze system resource pressure. Recommend OOM/CPU actions. Output JSON.",
        }
        extra = system_extras.get(mode, "")
        prompt = (
            f"Analyze the following {mode} data for the Triumph Synergy ecosystem:\n\n"
            f"Subject: {subject}\n\n"
            f"Data:\n{json.dumps(data, default=str, indent=2)[:3000]}"
        )
        return await self.complete(
            messages=[{"role": "user", "content": prompt}],
            system_extra=extra,
            extra_context=data,
            temperature=0.3,
            max_tokens=2048,
        )

    async def synthesize(
        self,
        sources: Dict[str, Any],
        query: str,
    ) -> Dict[str, Any]:
        """
        Synthesize insights across all data sources (market + chain + threats + resources).
        """
        prompt = (
            f"Synthesize a sovereign intelligence briefing for: {query}\n\n"
            f"Data sources:\n{json.dumps(sources, default=str, indent=2)[:4000]}"
        )
        return await self.complete(
            messages=[{"role": "user", "content": prompt}],
            system_extra="Produce a concise sovereign briefing with actionable insights.",
            temperature=0.4,
            max_tokens=2048,
        )

    def stats(self) -> Dict[str, Any]:
        return {
            "version":      "v8-OMNI-SOVEREIGN",
            "active_tier":  self._active_tier,
            "total_calls":  self._total_calls,
            "uptime_s":     round(time.time() - self._born, 1),
            "providers": {
                name: {
                    "available":    s.available,
                    "calls":        s.calls,
                    "errors":       s.errors,
                    "tokens_in":    s.tokens_in,
                    "tokens_out":   s.tokens_out,
                    "last_latency_ms": round(s.last_latency_ms, 1),
                    "last_error":   s.last_error,
                }
                for name, s in self._stats.items()
            },
        }


# ── Singleton ─────────────────────────────────────────────────────────────────
llm_brain = LLMBrain()
