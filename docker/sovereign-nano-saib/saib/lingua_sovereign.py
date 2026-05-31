"""
Lingua Sovereign — Universal Language Detection & Translation
──────────────────────────────────────────────────────────────────────────────
SAIB speaks every language.  The Lingua Sovereign module ensures that every
user in the world can interact with SAIB in their native tongue.

Capabilities:
  • Language Detection  — detect language from free text, combining Unicode
                          script fingerprinting (fast, zero-API) with
                          Grok AI for disambiguation (97-language coverage)
  • Auto-Translation    — translate any text to/from any language via Grok
  • Entity Language Memory — remember each entity's preferred language across
                            sessions; auto-update from detected language
  • Auto-Respond        — given an entity_id, wrap any response to use that
                          entity's preferred language automatically
  • 52 Languages        — full ISO 639-1 language map covering all major
                          world languages including all African Union languages,
                          all official UN languages, and all Pi Network markets

Architecture:
  LinguaSovereign
    ├── _detect_script()     — fast Unicode-range script fingerprint
    ├── detect_language()    — async script + Grok combined detection
    ├── translate()          — Grok-powered translation
    ├── _profiles            — per-entity language memory (EntityLanguageProfile)
    └── auto_format_response() — wrap any text for an entity's language
"""
from __future__ import annotations

import asyncio
import logging
import re
import time
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

log = logging.getLogger("sovereign.lingua")


# ── 52-language map ──────────────────────────────────────────────────────────

LANGUAGE_MAP: Dict[str, str] = {
    # Major world / UN languages
    "en":    "English",
    "es":    "Spanish",
    "fr":    "French",
    "ar":    "Arabic",
    "zh":    "Chinese (Simplified)",
    "zh-TW": "Chinese (Traditional)",
    "ru":    "Russian",
    "pt":    "Portuguese",
    "de":    "German",
    "ja":    "Japanese",
    "ko":    "Korean",
    # South & South-East Asia (major Pi markets)
    "hi":    "Hindi",
    "id":    "Indonesian",
    "ms":    "Malay",
    "th":    "Thai",
    "vi":    "Vietnamese",
    "tl":    "Filipino",
    "my":    "Burmese",
    "km":    "Khmer",
    "si":    "Sinhala",
    "ne":    "Nepali",
    "bn":    "Bengali",
    "ta":    "Tamil",
    "te":    "Telugu",
    "mr":    "Marathi",
    "ur":    "Urdu",
    "pa":    "Punjabi",
    "gu":    "Gujarati",
    # Middle East / Central Asia
    "fa":    "Persian (Farsi)",
    "tr":    "Turkish",
    "he":    "Hebrew",
    "ps":    "Pashto",
    "kk":    "Kazakh",
    "uz":    "Uzbek",
    # Europe
    "it":    "Italian",
    "pl":    "Polish",
    "nl":    "Dutch",
    "sv":    "Swedish",
    "da":    "Danish",
    "no":    "Norwegian",
    "fi":    "Finnish",
    "ro":    "Romanian",
    "hu":    "Hungarian",
    "cs":    "Czech",
    "uk":    "Ukrainian",
    "el":    "Greek",
    "sk":    "Slovak",
    "hr":    "Croatian",
    "sr":    "Serbian",
    # Africa (AU official + major)
    "sw":    "Swahili",
    "am":    "Amharic",
    "yo":    "Yoruba",
    "ig":    "Igbo",
    "ha":    "Hausa",
    "zu":    "Zulu",
    "af":    "Afrikaans",
    "so":    "Somali",
}

# ── Script fingerprint ranges (Unicode) ──────────────────────────────────────

_SCRIPT_RANGES: List[Tuple[int, int, str]] = [
    (0x0600, 0x06FF, "arabic"),
    (0x0750, 0x077F, "arabic"),          # Arabic Supplement
    (0x4E00, 0x9FFF, "cjk"),
    (0x3400, 0x4DBF, "cjk"),             # CJK Extension A
    (0xF900, 0xFAFF, "cjk"),             # CJK Compatibility Ideographs
    (0x3040, 0x309F, "hiragana"),
    (0x30A0, 0x30FF, "katakana"),
    (0xAC00, 0xD7AF, "hangul"),
    (0x0400, 0x04FF, "cyrillic"),
    (0x0500, 0x052F, "cyrillic"),
    (0x0900, 0x097F, "devanagari"),
    (0x0980, 0x09FF, "bengali"),
    (0x0A80, 0x0AFF, "gujarati"),
    (0x0B00, 0x0B7F, "oriya"),
    (0x0B80, 0x0BFF, "tamil"),
    (0x0C00, 0x0C7F, "telugu"),
    (0x0C80, 0x0CFF, "kannada"),
    (0x0D00, 0x0D7F, "malayalam"),
    (0x0D80, 0x0DFF, "sinhala"),
    (0x0E00, 0x0E7F, "thai"),
    (0x0E80, 0x0EFF, "lao"),
    (0x1000, 0x109F, "burmese"),
    (0x1780, 0x17FF, "khmer"),
    (0x0590, 0x05FF, "hebrew"),
    (0x0900, 0x097F, "devanagari"),
    (0x0A00, 0x0A7F, "gurmukhi"),         # Punjabi
    (0x0600, 0x06FF, "arabic"),            # Arabic / Urdu / Pashto / Persian share block
    (0x1200, 0x137F, "ethiopic"),          # Amharic
    (0x10D0, 0x10FF, "georgian"),
    (0x0530, 0x058F, "armenian"),
]

_SCRIPT_TO_LANG: Dict[str, str] = {
    "arabic":      "ar",
    "cjk":         "zh",         # could be zh, ja, ko — will call Grok to disambiguate
    "hiragana":    "ja",
    "katakana":    "ja",
    "hangul":      "ko",
    "cyrillic":    "ru",         # could be ru, uk, sr, bg etc — Grok for precision
    "devanagari":  "hi",         # could be hi, mr, ne — Grok for precision
    "bengali":     "bn",
    "gujarati":    "gu",
    "tamil":       "ta",
    "telugu":      "te",
    "thai":        "th",
    "burmese":     "my",
    "khmer":       "km",
    "sinhala":     "si",
    "hebrew":      "he",
    "ethiopic":    "am",
    "gurmukhi":    "pa",
}

# Languages that use Latin script and need Grok to distinguish
_LATIN_AMBIGUOUS = True


# ── Entity language profile ───────────────────────────────────────────────────

@dataclass
class EntityLanguageProfile:
    entity_id:        str
    primary_lang:     str   = "en"
    detected_langs:   List[str] = field(default_factory=list)
    auto_translate:   bool  = True
    confidence:       float = 0.5
    last_updated:     float = field(default_factory=time.time)


# ── Lingua Sovereign ──────────────────────────────────────────────────────────

class LinguaSovereign:
    """
    Universal language detection, translation, and entity language memory.
    Uses Unicode script fingerprinting for fast detection and Grok AI
    for accurate disambiguation and all translation tasks.
    """

    def __init__(self) -> None:
        self._grok    = None       # set on boot
        self._profiles: Dict[str, EntityLanguageProfile] = {}
        self._running = False
        self._translation_cache: Dict[str, str] = {}  # simple LRU-less cache
        self._cache_max = 500

    def boot(self, grok: Any = None) -> None:
        self._grok    = grok
        self._running = True
        log.info("[LinguaSovereign] Online — %d languages registered, Grok=%s",
                 len(LANGUAGE_MAP), "connected" if grok else "unavailable")

    # ── Script fingerprint ───────────────────────────────────────────────────

    def _detect_script(self, text: str) -> Tuple[str, float]:
        """
        Fast, zero-API Unicode script detection.
        Returns (script_name, confidence) based on character frequency.
        """
        counts: Dict[str, int] = defaultdict(int)
        total = 0
        for c in text[:500]:  # sample first 500 chars
            cp = ord(c)
            if 0x41 <= cp <= 0x7A:  # basic Latin (A-z)
                counts["latin"] += 1
                total += 1
            else:
                for lo, hi, script in _SCRIPT_RANGES:
                    if lo <= cp <= hi:
                        counts[script] += 1
                        total += 1
                        break

        if not counts or total == 0:
            return "unknown", 0.0

        dominant = max(counts, key=counts.get)
        confidence = counts[dominant] / total
        return dominant, round(confidence, 3)

    # ── Language detection ────────────────────────────────────────────────────

    async def detect_language(
        self,
        text: str,
        use_grok: bool = True,
    ) -> Tuple[str, str, float]:
        """
        Detect language of text.
        Returns (lang_code, lang_name, confidence).
        """
        if not text or not text.strip():
            return "en", "English", 0.0

        script, script_confidence = self._detect_script(text)

        # High-confidence non-Latin scripts — return immediately
        if script != "latin" and script != "unknown" and script_confidence >= 0.70:
            lang_code = _SCRIPT_TO_LANG.get(script, "")

            # CJK needs disambiguation (Chinese vs Japanese)
            if script == "cjk":
                hiragana_count = sum(
                    1 for c in text[:200]
                    if 0x3040 <= ord(c) <= 0x309F or 0x30A0 <= ord(c) <= 0x30FF
                )
                if hiragana_count > 3:
                    return "ja", "Japanese", 0.92
                hangul_count = sum(1 for c in text[:200] if 0xAC00 <= ord(c) <= 0xD7AF)
                if hangul_count > 3:
                    return "ko", "Korean", 0.92
                return "zh", "Chinese (Simplified)", 0.88

            if lang_code:
                return lang_code, LANGUAGE_MAP.get(lang_code, lang_code), script_confidence

        # For Latin-script text or low-confidence, use Grok if available
        if use_grok and self._grok:
            try:
                result = await self._grok_detect(text)
                if result:
                    return result
            except Exception as exc:
                log.debug("[LinguaSovereign] Grok detect error: %s", exc)

        # Fallback: basic Latin language heuristics
        lang_code = self._latin_heuristic(text)
        return lang_code, LANGUAGE_MAP.get(lang_code, "English"), 0.55

    def _latin_heuristic(self, text: str) -> str:
        """Very basic Latin-script language detection using common word patterns."""
        lower = text.lower()
        patterns: List[Tuple[str, List[str]]] = [
            ("es", ["el", "la", "los", "las", "que", "por", "con", " y ", " de ", " en ", " es ", " un ", " una "]),
            ("fr", ["le", "la", "les", "des", "que", "qui", " et ", " de ", " en ", " un ", " une ", "est", "pas"]),
            ("pt", ["para", " de ", " em ", " do ", " da ", "que", "não", "também", "uma", "por"]),
            ("de", ["und", "der", "die", "das", "ist", "den", "ein", "eine", "nicht", "auch"]),
            ("it", ["della", "questo", "questa", "che", " di ", " in ", " il ", " la ", " lo ", " le "]),
            ("nl", ["van", "het", "een", "niet", "maar", "voor", "met", "zijn", "dat", "ook"]),
            ("pl", ["jest", "się", "nie", "jako", "przez", "może", "tego", "jego", "tak"]),
            ("tr", ["bir", "bu", "için", "ile", "olan", "daha", "gibi", "kadar", "ise"]),
            ("id", ["yang", "dan", "ini", "itu", "tidak", "ada", "akan", "bisa", "juga"]),
            ("ms", ["yang", "dan", "ini", "itu", "tidak", "ada", "akan", "boleh", "juga"]),
            ("vi", ["và", "của", "là", "có", "không", "được", "để", "cho", "với", "một"]),
            ("sw", ["na", "ya", "wa", "la", "za", "kwa", "ni", "katika", "pia", "hii"]),
        ]

        # Count pattern hits per language
        scores: Dict[str, int] = defaultdict(int)
        words = set(re.findall(r'\b\w+\b', lower))
        for lang, markers in patterns:
            for marker in markers:
                if marker.strip() in words or marker in lower:
                    scores[lang] += 1

        if scores:
            best = max(scores, key=scores.get)
            if scores[best] >= 2:
                return best

        return "en"

    async def _grok_detect(self, text: str) -> Optional[Tuple[str, str, float]]:
        """Ask Grok AI to detect the language."""
        sample = text[:200]
        prompt = (
            f"Identify the language of this text. "
            f"Reply with ONLY a JSON object: {{\"code\": \"<ISO 639-1 code>\", \"name\": \"<English name>\", \"confidence\": <0.0-1.0>}}\n"
            f"Text: {sample}"
        )
        try:
            response = await self._grok.ask(prompt)
            import json
            # extract JSON from response
            match = re.search(r'\{[^}]+\}', response or "")
            if match:
                data = json.loads(match.group())
                code = data.get("code", "en")
                name = data.get("name", LANGUAGE_MAP.get(code, "English"))
                conf = float(data.get("confidence", 0.8))
                return code, name, conf
        except Exception:
            pass
        return None

    # ── Translation ───────────────────────────────────────────────────────────

    async def translate(
        self,
        text:        str,
        target_lang: str,
        source_lang: Optional[str] = None,
    ) -> str:
        """
        Translate text to target language using Grok AI.
        Falls back to passthrough if Grok unavailable.
        """
        if not text or not text.strip():
            return text

        target_name = LANGUAGE_MAP.get(target_lang, target_lang)
        cache_key = f"{source_lang}:{target_lang}:{hash(text)}"
        if cache_key in self._translation_cache:
            return self._translation_cache[cache_key]

        if not self._grok:
            log.debug("[LinguaSovereign] Grok not available — returning original text")
            return text

        source_clause = f" from {LANGUAGE_MAP.get(source_lang, source_lang)}" if source_lang else ""
        prompt = (
            f"Translate the following text{source_clause} to {target_name}. "
            f"Return ONLY the translated text, no explanations.\n\n{text}"
        )

        try:
            translated = await self._grok.ask(prompt)
            if translated:
                result = translated.strip()
                # Cache management
                if len(self._translation_cache) >= self._cache_max:
                    # evict ~10% oldest entries
                    to_evict = list(self._translation_cache.keys())[:50]
                    for k in to_evict:
                        del self._translation_cache[k]
                self._translation_cache[cache_key] = result
                return result
        except Exception as exc:
            log.debug("[LinguaSovereign] Translation error: %s", exc)

        return text  # passthrough on failure

    # ── Entity language profile management ───────────────────────────────────

    def get_entity_language(self, entity_id: str) -> Optional[str]:
        profile = self._profiles.get(entity_id)
        return profile.primary_lang if profile else None

    def set_entity_language(
        self,
        entity_id: str,
        lang_code: str,
        confidence: float = 1.0,
        auto_detected: bool = False,
    ) -> None:
        if lang_code not in LANGUAGE_MAP:
            log.debug("[LinguaSovereign] Unknown lang code: %s — ignoring", lang_code)
            return
        profile = self._profiles.get(entity_id) or EntityLanguageProfile(entity_id=entity_id)
        profile.primary_lang = lang_code
        profile.confidence   = confidence
        profile.last_updated = time.time()
        if lang_code not in profile.detected_langs:
            profile.detected_langs.append(lang_code)
        self._profiles[entity_id] = profile

    def get_profile(self, entity_id: str) -> Optional[Dict[str, Any]]:
        p = self._profiles.get(entity_id)
        if not p:
            return None
        return {
            "entity_id":      p.entity_id,
            "primary_lang":   p.primary_lang,
            "lang_name":      LANGUAGE_MAP.get(p.primary_lang, p.primary_lang),
            "detected_langs": p.detected_langs,
            "auto_translate": p.auto_translate,
            "confidence":     p.confidence,
            "last_updated":   p.last_updated,
        }

    # ── Auto-respond in entity's language ────────────────────────────────────

    async def auto_format_response(
        self,
        text:      str,
        entity_id: str,
        detect_from_input: Optional[str] = None,
    ) -> Tuple[str, str]:
        """
        Format a response in the entity's preferred language.
        If detect_from_input is provided, auto-detect and remember the language.
        Returns (translated_text, lang_code).
        """
        # Update language from incoming text if provided
        if detect_from_input:
            lang_code, _, confidence = await self.detect_language(detect_from_input)
            if confidence >= 0.55:
                self.set_entity_language(entity_id, lang_code, confidence, auto_detected=True)

        target_lang = self.get_entity_language(entity_id) or "en"
        if target_lang == "en":
            return text, "en"  # no translation needed

        translated = await self.translate(text, target_lang)
        return translated, target_lang

    # ── Status ────────────────────────────────────────────────────────────────

    def status(self) -> Dict[str, Any]:
        lang_dist: Dict[str, int] = defaultdict(int)
        for p in self._profiles.values():
            lang_dist[p.primary_lang] += 1

        return {
            "running":              self._running,
            "grok_connected":       self._grok is not None,
            "supported_languages":  len(LANGUAGE_MAP),
            "entity_profiles":      len(self._profiles),
            "translation_cache":    len(self._translation_cache),
            "language_distribution": dict(lang_dist),
        }


# ── singleton ────────────────────────────────────────────────────────────────
lingua_sovereign = LinguaSovereign()
