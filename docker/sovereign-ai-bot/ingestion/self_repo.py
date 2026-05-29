# Copyright (C) 2024-2026 Jeremiah Joel Drains / Triumph Synergy. License: PiOS.
"""SAIB Nano Sovereign Self-Awareness — self-repository ingestion source.

Walks the codebase mounted at /workspace (read-only) and feeds every relevant
source / doc / config file into the RAG store so SAIB can answer questions
about its own frontend-to-backend implementation and reason about what each
piece does. Heavy directories (node_modules, .git, .next, dist, build,
coverage, secrets, lockfiles, binaries) are skipped.

Re-runs are content-hash idempotent: unchanged files are silently skipped so
pgvector embedding cost stays near zero on subsequent passes.
"""
from __future__ import annotations

import hashlib
import logging
import os
import time
from pathlib import Path
from typing import Iterable

from .base import IngestionSource, IngestedItem, _hash

log = logging.getLogger("saib.ingest.self_repo")

# Source-tree extensions SAIB should learn from. Anything else (images,
# fonts, archives, compiled artefacts, lockfiles) is ignored.
_TEXT_EXTS = {
    ".py", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
    ".md", ".mdx", ".txt", ".rst",
    ".yml", ".yaml", ".toml", ".ini", ".cfg", ".conf",
    ".json", ".jsonc",
    ".sql", ".sh", ".bash", ".zsh",
    ".html", ".css", ".scss",
    ".dockerfile", ".env.example",
    ".rs", ".go", ".java", ".kt", ".swift",
}

_SKIP_DIRS = {
    "node_modules", ".git", ".next", ".turbo", ".cache", ".pytest_cache",
    "dist", "build", "out", "coverage", ".coverage", ".venv", "venv",
    "__pycache__", ".mypy_cache", ".ruff_cache", ".vscode", ".idea",
    "secrets", "saib-secrets", "certs", ".docker",
    "playwright-report", "test-results",
}

_SKIP_FILE_NAMES = {
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "poetry.lock",
    "Cargo.lock", "uv.lock", "bun.lockb",
}

_LANG_MAP = {
    ".py": "python", ".ts": "typescript", ".tsx": "tsx",
    ".js": "javascript", ".jsx": "jsx", ".mjs": "javascript", ".cjs": "javascript",
    ".md": "markdown", ".mdx": "mdx",
    ".yml": "yaml", ".yaml": "yaml", ".toml": "toml",
    ".json": "json", ".jsonc": "jsonc",
    ".sql": "sql", ".sh": "shell", ".bash": "shell", ".zsh": "shell",
    ".html": "html", ".css": "css", ".scss": "scss",
    ".rs": "rust", ".go": "go",
}


def _looks_text(path: Path, peek_bytes: int = 4096) -> bool:
    try:
        with path.open("rb") as f:
            chunk = f.read(peek_bytes)
        # Reject anything with a NUL byte — binary.
        return b"\x00" not in chunk
    except Exception:
        return False


def _walk(root: Path, max_files: int, max_file_bytes: int) -> Iterable[Path]:
    count = 0
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in _SKIP_DIRS and not d.startswith(".")]
        for fn in filenames:
            if fn in _SKIP_FILE_NAMES:
                continue
            p = Path(dirpath) / fn
            ext = p.suffix.lower()
            if ext not in _TEXT_EXTS and fn.lower() not in {"dockerfile", "makefile", "readme"}:
                continue
            try:
                st = p.stat()
            except Exception:
                continue
            if st.st_size == 0 or st.st_size > max_file_bytes:
                continue
            if not _looks_text(p):
                continue
            yield p
            count += 1
            if count >= max_files:
                return


def _chunk(text: str, chunk_chars: int, overlap: int) -> list[str]:
    if len(text) <= chunk_chars:
        return [text]
    chunks: list[str] = []
    start = 0
    n = len(text)
    while start < n:
        end = min(start + chunk_chars, n)
        chunks.append(text[start:end])
        if end == n:
            break
        start = max(end - overlap, start + 1)
    return chunks


class SelfRepoSource(IngestionSource):
    """Walk /workspace and feed every code/doc/config file into pgvector RAG."""

    name = "self_repo"
    default_interval_s = 21600  # 6 h
    default_enabled = True

    def __init__(self) -> None:
        super().__init__()
        self.root = Path(os.getenv("SAIB_SELF_REPO_ROOT", "/workspace"))
        self.max_files = int(os.getenv("SAIB_SELF_REPO_MAX_FILES", "3000"))
        self.max_file_bytes = int(os.getenv("SAIB_SELF_REPO_MAX_FILE_BYTES", "120000"))
        self.chunk_chars = int(os.getenv("SAIB_SELF_REPO_CHUNK_CHARS", "3500"))
        self.chunk_overlap = int(os.getenv("SAIB_SELF_REPO_CHUNK_OVERLAP", "200"))
        # Per-file content hashes so unchanged files are skipped between polls.
        self._file_hash: dict[str, str] = {}

    async def poll(self) -> list[IngestedItem]:
        if not self.root.exists():
            log.warning("[self_repo] root %s missing — workspace mount?", self.root)
            return []
        items: list[IngestedItem] = []
        now = time.time()
        scanned = 0
        unchanged = 0
        for p in _walk(self.root, self.max_files, self.max_file_bytes):
            scanned += 1
            try:
                raw = p.read_bytes()
            except Exception:
                continue
            try:
                text = raw.decode("utf-8", errors="replace")
            except Exception:
                continue
            rel = str(p.relative_to(self.root))
            content_hash = hashlib.sha256(raw).hexdigest()[:16]
            if self._file_hash.get(rel) == content_hash:
                unchanged += 1
                continue
            self._file_hash[rel] = content_hash
            ext = p.suffix.lower()
            language = _LANG_MAP.get(ext, ext.lstrip(".") or "text")
            mtime = p.stat().st_mtime
            chunks = _chunk(text, self.chunk_chars, self.chunk_overlap)
            total = len(chunks)
            for i, body in enumerate(chunks):
                # Prefix each chunk with the path so embeddings carry locality.
                content = f"// FILE: {rel} (chunk {i + 1}/{total}, lang={language})\n{body}"
                items.append(IngestedItem(
                    source=self.name,
                    external_id=f"{rel}#{content_hash}#{i}",
                    timestamp=now,
                    content=content,
                    author_hash=_hash(rel),
                    raw_url=f"workspace://{rel}",
                    domain="codebase",
                    metadata={
                        "path": rel,
                        "language": language,
                        "bytes": len(raw),
                        "mtime": mtime,
                        "content_hash": content_hash,
                        "chunk_index": i,
                        "chunk_total": total,
                    },
                ))
        if scanned:
            log.info("[self_repo] scanned=%d unchanged=%d new_chunks=%d", scanned, unchanged, len(items))
        return items
