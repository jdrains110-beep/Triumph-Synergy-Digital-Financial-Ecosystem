# Copyright (C) 2024-2026 Jeremiah Joel Drains / Triumph Synergy. License: PiOS.
"""Discord ingestion — dormant unless DISCORD_BOT_TOKEN + DISCORD_GUILD_IDS set.

discord.py runs its own asyncio loop; we host it in a background task launched
on first poll. Messages are buffered into `_buffer` and drained per cycle.
"""
from __future__ import annotations

import asyncio
import os
import time

from .base import IngestionSource, IngestedItem, _hash

try:
    import discord  # type: ignore
    _DISCORD = True
except Exception:
    _DISCORD = False


class DiscordSource(IngestionSource):
    name = "discord"
    default_interval_s = 60  # drain buffer every minute
    default_enabled = False  # opt-in via env

    def __init__(self) -> None:
        super().__init__()
        self.token = os.getenv("DISCORD_BOT_TOKEN", "").strip()
        self.guild_ids = [g.strip() for g in os.getenv("DISCORD_GUILD_IDS", "").split(",") if g.strip()]
        self._buffer: list[IngestedItem] = []
        self._client_started = False
        self._client: object = None

    def _is_enabled(self) -> bool:
        return _DISCORD and bool(os.getenv("DISCORD_BOT_TOKEN", "").strip())

    async def _ensure_started(self) -> None:
        if self._client_started or not _DISCORD or not self.token:
            return
        intents = discord.Intents.default()
        intents.message_content = True
        client = discord.Client(intents=intents)

        @client.event
        async def on_message(message):  # type: ignore
            try:
                if self.guild_ids and str(getattr(message.guild, "id", "")) not in self.guild_ids:
                    return
                if not message.content:
                    return
                self._buffer.append(IngestedItem(
                    source=self.name,
                    external_id=f"msg:{message.id}",
                    timestamp=time.time(),
                    content=message.content[:4000],
                    author_hash=_hash(str(message.author.id)),
                    raw_url="",
                    domain="chat-community",
                    metadata={
                        "guild_id": str(getattr(message.guild, "id", "")),
                        "channel_id": str(getattr(message.channel, "id", "")),
                    },
                ))
            except Exception:
                pass

        self._client = client
        self._client_started = True
        asyncio.create_task(client.start(self.token))

    async def poll(self) -> list[IngestedItem]:
        await self._ensure_started()
        drained, self._buffer = self._buffer, []
        return drained
