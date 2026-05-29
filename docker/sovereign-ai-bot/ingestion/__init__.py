"""SAIB external-learning ingestion framework.

Each module exposes an `IngestionSource` subclass whose `poll()` returns a list
of normalized `IngestedItem`s. The registry below lists every source SAIB
attempts to start at boot. Sources that lack credentials remain dormant and
report `enabled=False` from `/ingest/sources` rather than crashing.
"""
from .base import IngestionSource, IngestedItem, push_to_brain, push_to_rag
from .stackoverflow import StackOverflowSource
from .reddit import RedditSource
from .web_crawler import WebCrawlerSource
from .discord_src import DiscordSource
from .x_twitter import XTwitterSource
from .github_events import GitHubEventsSource
from .self_repo import SelfRepoSource

REGISTRY: list[type[IngestionSource]] = [
    StackOverflowSource,
    RedditSource,
    WebCrawlerSource,
    GitHubEventsSource,
    SelfRepoSource,
    DiscordSource,
    XTwitterSource,
]

__all__ = [
    "IngestionSource",
    "IngestedItem",
    "push_to_brain",
    "push_to_rag",
    "REGISTRY",
]
