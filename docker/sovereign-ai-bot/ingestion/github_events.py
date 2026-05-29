# Copyright (C) 2024-2026 Jeremiah Joel Drains / Triumph Synergy. License: PiOS.
"""GitHub events ingestion — Triumph Synergy repo interactions.

Polls the configured repo's public events feed (stars / forks / watchers /
issues / PRs / pushes / releases) plus current stargazer + subscriber lists,
so SAIB learns about every community interaction with our project. Sponsorships
are only available via the GraphQL API and require a token with the
`read:user` + `read:org` scopes — they are polled best-effort and silently
skipped when the token lacks scope.

Configuration:
  SAIB_GITHUB_EVENTS_ENABLED=true|false      (default: true)
  SAIB_GITHUB_REPO=owner/repo                (default: jdrains110-beep/Triumph-Synergy-Digital-Financial-Ecosystem)
  SAIB_GITHUB_EXTRA_REPOS=owner/r1,owner/r2  (optional, additional repos)
  SAIB_GITHUB_OWNERS=user1,org1              (optional, followers per owner)
  SAIB_GITHUB_INTERVAL_S=300                 (default 5 min — public events feed cadence)
  GITHUB_TOKEN / SAIB_GITHUB_TOKEN           (optional; anon 60/hr -> 5000/hr with token)
  /run/saib-secrets/github_token             (file-mount fallback)
"""
from __future__ import annotations

import os
import time
from pathlib import Path

import httpx

from .base import IngestionSource, IngestedItem, _hash

_GH = "https://api.github.com"
_DEFAULT_REPO = "jdrains110-beep/Triumph-Synergy-Digital-Financial-Ecosystem"


def _load_token() -> str:
    tok = os.getenv("SAIB_GITHUB_TOKEN") or os.getenv("GITHUB_TOKEN") or ""
    if tok:
        return tok.strip()
    for p in ("/run/saib-secrets/github_token", "/run/secrets/github_token"):
        try:
            t = Path(p).read_text().strip()
            if t:
                return t
        except Exception:
            continue
    return ""


class GitHubEventsSource(IngestionSource):
    name = "github_events"
    default_interval_s = 300  # 5 min
    default_enabled = True

    def __init__(self) -> None:
        super().__init__()
        repos = [os.getenv("SAIB_GITHUB_REPO", _DEFAULT_REPO).strip()]
        extra = os.getenv("SAIB_GITHUB_EXTRA_REPOS", "")
        repos += [r.strip() for r in extra.split(",") if r.strip()]
        self.repos = [r for r in repos if "/" in r]
        self.owners = [o.strip() for o in os.getenv("SAIB_GITHUB_OWNERS", "jdrains110-beep").split(",") if o.strip()]
        self.token = _load_token()
        self._seen_stargazers: dict[str, set[str]] = {r: set() for r in self.repos}
        self._seen_watchers: dict[str, set[str]] = {r: set() for r in self.repos}
        self._seen_followers: dict[str, set[str]] = {o: set() for o in self.owners}
        self._first_pass = True

    def _headers(self) -> dict[str, str]:
        h = {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "TriumphSynergy-SAIB/1.0",
        }
        if self.token:
            h["Authorization"] = f"Bearer {self.token}"
        return h

    async def _events(self, client: httpx.AsyncClient, repo: str) -> list[IngestedItem]:
        items: list[IngestedItem] = []
        try:
            r = await client.get(f"{_GH}/repos/{repo}/events", headers=self._headers(), params={"per_page": 50})
            if r.status_code != 200:
                return items
            for ev in r.json():
                ev_id = str(ev.get("id", ""))
                ev_type = ev.get("type", "Unknown")
                actor = ev.get("actor", {}).get("login", "anon")
                created = ev.get("created_at", "")
                payload = ev.get("payload", {}) or {}
                summary = self._summarize(ev_type, actor, repo, payload)
                items.append(IngestedItem(
                    source=self.name,
                    external_id=f"{repo}:event:{ev_id}",
                    timestamp=time.time(),
                    content=summary,
                    author_hash=_hash(actor),
                    raw_url=f"https://github.com/{repo}",
                    domain="github-community",
                    metadata={
                        "repo": repo,
                        "event_type": ev_type,
                        "actor": actor,
                        "created_at": created,
                    },
                ))
        except Exception as e:
            self.last_error = f"events:{repo}: {e}"[:200]
        return items

    @staticmethod
    def _summarize(ev_type: str, actor: str, repo: str, payload: dict) -> str:
        if ev_type == "WatchEvent":
            return f"[github] @{actor} starred {repo} — community signal: project gaining traction"
        if ev_type == "ForkEvent":
            forkee = payload.get("forkee", {}).get("full_name", "?")
            return f"[github] @{actor} forked {repo} → {forkee} — developer interest"
        if ev_type == "IssuesEvent":
            action = payload.get("action", "?")
            issue = payload.get("issue", {})
            return f"[github] @{actor} {action} issue #{issue.get('number','?')} on {repo}: {issue.get('title','')}\n\n{(issue.get('body') or '')[:1500]}"
        if ev_type == "IssueCommentEvent":
            issue = payload.get("issue", {})
            comment = payload.get("comment", {})
            return f"[github] @{actor} commented on issue #{issue.get('number','?')} ({repo}): {(comment.get('body') or '')[:1500]}"
        if ev_type == "PullRequestEvent":
            action = payload.get("action", "?")
            pr = payload.get("pull_request", {})
            return f"[github] @{actor} {action} PR #{pr.get('number','?')} on {repo}: {pr.get('title','')}\n\n{(pr.get('body') or '')[:1500]}"
        if ev_type == "PullRequestReviewCommentEvent":
            comment = payload.get("comment", {})
            return f"[github] @{actor} reviewed code on {repo}: {(comment.get('body') or '')[:1500]}"
        if ev_type == "PushEvent":
            commits = payload.get("commits", []) or []
            msgs = "; ".join(c.get("message", "")[:140] for c in commits[:5])
            return f"[github] @{actor} pushed {len(commits)} commit(s) to {repo}: {msgs}"
        if ev_type == "ReleaseEvent":
            rel = payload.get("release", {})
            return f"[github] @{actor} {payload.get('action','?')} release {rel.get('tag_name','')} on {repo}: {rel.get('name','')}\n\n{(rel.get('body') or '')[:1500]}"
        if ev_type == "CreateEvent":
            return f"[github] @{actor} created {payload.get('ref_type','?')} {payload.get('ref','')} on {repo}"
        if ev_type == "DeleteEvent":
            return f"[github] @{actor} deleted {payload.get('ref_type','?')} {payload.get('ref','')} on {repo}"
        if ev_type == "MemberEvent":
            return f"[github] @{actor} {payload.get('action','?')} collaborator on {repo}"
        if ev_type == "PublicEvent":
            return f"[github] {repo} made public by @{actor}"
        return f"[github] @{actor} {ev_type} on {repo}"

    async def _stargazer_delta(self, client: httpx.AsyncClient, repo: str) -> list[IngestedItem]:
        items: list[IngestedItem] = []
        try:
            r = await client.get(f"{_GH}/repos/{repo}/stargazers", headers=self._headers(), params={"per_page": 100})
            if r.status_code != 200:
                return items
            seen = self._seen_stargazers[repo]
            for u in r.json():
                login = u.get("login", "")
                if not login or login in seen:
                    continue
                seen.add(login)
                if self._first_pass:
                    continue  # don't blast SAIB with every existing star on boot
                items.append(IngestedItem(
                    source=self.name,
                    external_id=f"{repo}:star:{login}",
                    timestamp=time.time(),
                    content=f"[github] NEW STAR — @{login} starred {repo}. Community is growing.",
                    author_hash=_hash(login),
                    raw_url=f"https://github.com/{login}",
                    domain="github-community",
                    metadata={"repo": repo, "event_type": "NewStargazer", "actor": login},
                ))
        except Exception as e:
            self.last_error = f"stars:{repo}: {e}"[:200]
        return items

    async def _watcher_delta(self, client: httpx.AsyncClient, repo: str) -> list[IngestedItem]:
        items: list[IngestedItem] = []
        try:
            r = await client.get(f"{_GH}/repos/{repo}/subscribers", headers=self._headers(), params={"per_page": 100})
            if r.status_code != 200:
                return items
            seen = self._seen_watchers[repo]
            for u in r.json():
                login = u.get("login", "")
                if not login or login in seen:
                    continue
                seen.add(login)
                if self._first_pass:
                    continue
                items.append(IngestedItem(
                    source=self.name,
                    external_id=f"{repo}:watch:{login}",
                    timestamp=time.time(),
                    content=f"[github] NEW WATCHER — @{login} is watching {repo} for updates.",
                    author_hash=_hash(login),
                    raw_url=f"https://github.com/{login}",
                    domain="github-community",
                    metadata={"repo": repo, "event_type": "NewWatcher", "actor": login},
                ))
        except Exception as e:
            self.last_error = f"watchers:{repo}: {e}"[:200]
        return items

    async def _follower_delta(self, client: httpx.AsyncClient, owner: str) -> list[IngestedItem]:
        items: list[IngestedItem] = []
        try:
            r = await client.get(f"{_GH}/users/{owner}/followers", headers=self._headers(), params={"per_page": 100})
            if r.status_code != 200:
                return items
            seen = self._seen_followers[owner]
            for u in r.json():
                login = u.get("login", "")
                if not login or login in seen:
                    continue
                seen.add(login)
                if self._first_pass:
                    continue
                items.append(IngestedItem(
                    source=self.name,
                    external_id=f"{owner}:follower:{login}",
                    timestamp=time.time(),
                    content=f"[github] NEW FOLLOWER — @{login} is now following @{owner}. Personal-brand signal.",
                    author_hash=_hash(login),
                    raw_url=f"https://github.com/{login}",
                    domain="github-community",
                    metadata={"owner": owner, "event_type": "NewFollower", "actor": login},
                ))
        except Exception as e:
            self.last_error = f"followers:{owner}: {e}"[:200]
        return items

    async def _sponsors(self, client: httpx.AsyncClient, owner: str) -> list[IngestedItem]:
        """Sponsorship events via GraphQL. Silently no-ops without a token + read:user scope."""
        if not self.token:
            return []
        items: list[IngestedItem] = []
        query = """
        query($login: String!) {
          user(login: $login) {
            sponsorshipsAsMaintainer(first: 50, orderBy: {field: CREATED_AT, direction: DESC}) {
              nodes {
                createdAt
                sponsorEntity { ... on User { login } ... on Organization { login } }
                tier { monthlyPriceInDollars name }
              }
            }
          }
        }
        """
        try:
            r = await client.post(
                "https://api.github.com/graphql",
                headers={**self._headers(), "Content-Type": "application/json"},
                json={"query": query, "variables": {"login": owner}},
            )
            if r.status_code != 200:
                return items
            nodes = (((r.json().get("data") or {}).get("user") or {}).get("sponsorshipsAsMaintainer") or {}).get("nodes") or []
            for n in nodes:
                sponsor = (n.get("sponsorEntity") or {}).get("login", "anon")
                tier = (n.get("tier") or {}).get("name", "?")
                price = (n.get("tier") or {}).get("monthlyPriceInDollars", 0)
                created = n.get("createdAt", "")
                items.append(IngestedItem(
                    source=self.name,
                    external_id=f"{owner}:sponsor:{sponsor}:{created}",
                    timestamp=time.time(),
                    content=f"[github] SPONSORSHIP — @{sponsor} is sponsoring @{owner} at tier '{tier}' (${price}/mo). High-value supporter — engage personally.",
                    author_hash=_hash(sponsor),
                    raw_url=f"https://github.com/sponsors/{owner}",
                    domain="github-community",
                    metadata={"owner": owner, "event_type": "Sponsorship", "actor": sponsor, "tier": tier, "monthly_usd": price},
                ))
        except Exception:
            pass  # GraphQL scope errors are normal for fine-grained tokens
        return items

    async def poll(self) -> list[IngestedItem]:
        items: list[IngestedItem] = []
        async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
            for repo in self.repos:
                items += await self._events(client, repo)
                items += await self._stargazer_delta(client, repo)
                items += await self._watcher_delta(client, repo)
            for owner in self.owners:
                items += await self._follower_delta(client, owner)
                items += await self._sponsors(client, owner)
        self._first_pass = False
        return items
