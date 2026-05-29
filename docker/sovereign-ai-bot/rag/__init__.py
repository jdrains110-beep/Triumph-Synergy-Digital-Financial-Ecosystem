"""SAIB Retrieval-Augmented-Generation layer.

`store` provides pgvector-backed CRUD + similarity search.
`embeddings` provides pluggable text-to-vector encoding (local MiniLM by
default, OpenAI-compatible fallback if OPENAI_API_KEY is set).
"""
from . import embeddings, store

__all__ = ["embeddings", "store"]
