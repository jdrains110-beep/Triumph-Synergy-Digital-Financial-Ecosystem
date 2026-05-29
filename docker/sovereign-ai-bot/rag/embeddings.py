# Copyright (C) 2024-2026 Jeremiah Joel Drains / Triumph Synergy. License: PiOS.
"""Pluggable text embeddings.

Order of preference:
  1. `sentence-transformers` `all-MiniLM-L6-v2` (free, local, 384-dim)
  2. OpenAI-compatible `text-embedding-3-small` if `OPENAI_API_KEY` set
  3. Deterministic hash-bucket fallback (no external deps, 384-dim)

The fallback exists so RAG storage never crashes when no model is installed —
results are obviously degraded but the pipeline keeps running.
"""
from __future__ import annotations

import hashlib
import logging
import math
import os
from typing import Optional

log = logging.getLogger("saib.rag.embed")

EMBED_DIM = int(os.getenv("SAIB_EMBED_DIM", "384"))
_MODEL_NAME = os.getenv("SAIB_EMBED_MODEL", "all-MiniLM-L6-v2")
_OPENAI_KEY = os.getenv("OPENAI_API_KEY", "").strip()
_OPENAI_BASE = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
_OPENAI_MODEL = os.getenv("OPENAI_EMBED_MODEL", "text-embedding-3-small")

_st_model = None
_st_attempted = False


def _try_local() -> bool:
    global _st_model, _st_attempted
    if _st_attempted:
        return _st_model is not None
    _st_attempted = True
    try:
        from sentence_transformers import SentenceTransformer  # type: ignore
        _st_model = SentenceTransformer(_MODEL_NAME)
        log.info("[rag.embed] loaded local model %s", _MODEL_NAME)
        return True
    except Exception as e:
        log.info("[rag.embed] local model unavailable (%s) — falling back", type(e).__name__)
        _st_model = None
        return False


def _hash_embed(text: str) -> list[float]:
    """Deterministic bag-of-hash-buckets, L2-normalized."""
    vec = [0.0] * EMBED_DIM
    for tok in text.lower().split():
        h = int.from_bytes(hashlib.sha256(tok.encode()).digest()[:4], "big")
        vec[h % EMBED_DIM] += 1.0
    norm = math.sqrt(sum(x * x for x in vec)) or 1.0
    return [x / norm for x in vec]


async def _openai_embed(text: str) -> Optional[list[float]]:
    if not _OPENAI_KEY:
        return None
    try:
        import httpx
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.post(
                f"{_OPENAI_BASE}/embeddings",
                headers={"Authorization": f"Bearer {_OPENAI_KEY}"},
                json={"input": text[:8000], "model": _OPENAI_MODEL},
            )
            if r.status_code != 200:
                return None
            data = r.json()
            return data["data"][0]["embedding"]
    except Exception:
        return None


async def embed(text: str) -> list[float]:
    if not text:
        return [0.0] * EMBED_DIM
    if _try_local():
        try:
            v = _st_model.encode(text[:4000], normalize_embeddings=True).tolist()  # type: ignore
            if len(v) != EMBED_DIM:
                # Pad or truncate to declared dim
                v = (v + [0.0] * EMBED_DIM)[:EMBED_DIM]
            return v
        except Exception:
            pass
    v = await _openai_embed(text)
    if v:
        return (v + [0.0] * EMBED_DIM)[:EMBED_DIM]
    return _hash_embed(text)


def backend_name() -> str:
    if _st_model is not None:
        return f"local:{_MODEL_NAME}"
    if _OPENAI_KEY:
        return f"openai:{_OPENAI_MODEL}"
    return "hash-fallback"
