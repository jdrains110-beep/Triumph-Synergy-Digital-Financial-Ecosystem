# Copyright (C) 2024-2026 Jeremiah Joel Drains / Triumph Synergy. License: PiOS.
"""pgvector-backed RAG store for SAIB.

Falls back to a no-op in-process store if asyncpg or pgvector is unavailable —
the ingestion pipeline must never crash because of optional RAG plumbing.
"""
from __future__ import annotations

import json
import logging
import os
import time
from typing import Any, Optional

from . import embeddings

log = logging.getLogger("saib.rag.store")

try:
    import asyncpg  # type: ignore
    _PG = True
except Exception:
    _PG = False

DSN = (
    os.getenv("SAIB_RAG_DSN")
    or os.getenv("DATABASE_URL")
    or os.getenv("POSTGRES_DSN")
    or ""
)
TABLE = os.getenv("SAIB_RAG_TABLE", "saib_knowledge_chunks")
RAG_ENABLED = os.getenv("SAIB_RAG_ENABLED", "true").lower() in ("1", "true", "yes")

_pool: Optional[Any] = None
_inited = False
_in_memory: list[dict[str, Any]] = []
_mem_cap = int(os.getenv("SAIB_RAG_MEM_CAP", "2000"))


def _vec_literal(v: list[float]) -> str:
    return "[" + ",".join(f"{x:.6f}" for x in v) + "]"


async def _init() -> None:
    global _pool, _inited
    if _inited:
        return
    _inited = True
    if not (RAG_ENABLED and _PG and DSN):
        log.info("[rag.store] using in-memory fallback (PG=%s DSN=%s enabled=%s)",
                 _PG, bool(DSN), RAG_ENABLED)
        return
    try:
        _pool = await asyncpg.create_pool(dsn=DSN, min_size=1, max_size=4, timeout=10)
        async with _pool.acquire() as conn:
            try:
                await conn.execute("CREATE EXTENSION IF NOT EXISTS vector")
            except Exception as e:
                log.warning("[rag.store] could not create pgvector extension (%s) — using JSONB", e)
            await conn.execute(f"""
                CREATE TABLE IF NOT EXISTS {TABLE} (
                    id BIGSERIAL PRIMARY KEY,
                    source TEXT NOT NULL,
                    external_id TEXT NOT NULL,
                    content TEXT NOT NULL,
                    embedding vector({embeddings.EMBED_DIM}),
                    metadata JSONB DEFAULT '{{}}'::jsonb,
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    UNIQUE (source, external_id)
                )
            """)
        log.info("[rag.store] pgvector table %s ready (dim=%d)", TABLE, embeddings.EMBED_DIM)
    except Exception as e:
        log.warning("[rag.store] pgvector init failed (%s) — using in-memory fallback", e)
        _pool = None


async def upsert_chunk(*, source: str, external_id: str, content: str, metadata: dict[str, Any]) -> bool:
    await _init()
    if not content:
        return False
    vec = await embeddings.embed(content)
    if _pool is None:
        _in_memory.append({
            "source": source, "external_id": external_id,
            "content": content, "embedding": vec, "metadata": metadata,
            "created_at": time.time(),
        })
        if len(_in_memory) > _mem_cap:
            del _in_memory[: len(_in_memory) - _mem_cap]
        return True
    try:
        async with _pool.acquire() as conn:
            await conn.execute(
                f"""INSERT INTO {TABLE} (source, external_id, content, embedding, metadata)
                    VALUES ($1, $2, $3, $4::vector, $5::jsonb)
                    ON CONFLICT (source, external_id) DO UPDATE
                    SET content = EXCLUDED.content,
                        embedding = EXCLUDED.embedding,
                        metadata = EXCLUDED.metadata""",
                source, external_id, content[:8000], _vec_literal(vec), json.dumps(metadata),
            )
        return True
    except Exception as e:
        log.debug("[rag.store] upsert failed: %s", e)
        return False


def _cosine(a: list[float], b: list[float]) -> float:
    if len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    return dot  # both are L2-normalized when produced by embed()


async def similarity_search(query: str, top_k: int = 5) -> list[dict[str, Any]]:
    await _init()
    qv = await embeddings.embed(query)
    if _pool is None:
        scored = [(_cosine(qv, r["embedding"]), r) for r in _in_memory]
        scored.sort(key=lambda x: x[0], reverse=True)
        return [
            {"score": float(s), "source": r["source"], "external_id": r["external_id"],
             "content": r["content"][:1000], "metadata": r["metadata"]}
            for s, r in scored[:top_k]
        ]
    try:
        async with _pool.acquire() as conn:
            rows = await conn.fetch(
                f"""SELECT source, external_id, content, metadata,
                           1 - (embedding <=> $1::vector) AS score
                    FROM {TABLE}
                    ORDER BY embedding <=> $1::vector
                    LIMIT $2""",
                _vec_literal(qv), top_k,
            )
        return [
            {"score": float(r["score"]), "source": r["source"], "external_id": r["external_id"],
             "content": r["content"][:1000], "metadata": dict(r["metadata"] or {})}
            for r in rows
        ]
    except Exception as e:
        log.debug("[rag.store] search failed: %s", e)
        return []


async def stats() -> dict[str, Any]:
    await _init()
    if _pool is None:
        return {
            "backend": "in-memory",
            "embedding_backend": embeddings.backend_name(),
            "embedding_dim": embeddings.EMBED_DIM,
            "chunk_count": len(_in_memory),
        }
    try:
        async with _pool.acquire() as conn:
            total = await conn.fetchval(f"SELECT COUNT(*) FROM {TABLE}")
            by_src = await conn.fetch(f"SELECT source, COUNT(*) AS n FROM {TABLE} GROUP BY source")
        return {
            "backend": f"pgvector:{TABLE}",
            "embedding_backend": embeddings.backend_name(),
            "embedding_dim": embeddings.EMBED_DIM,
            "chunk_count": int(total or 0),
            "by_source": {r["source"]: int(r["n"]) for r in by_src},
        }
    except Exception as e:
        return {"backend": "error", "error": str(e)}
