"""
SAIB External Remediation
=========================

When external probes detect a degraded platform SAIB cannot directly
restart (Replit deployment, PiNet host, Pi mainnet API), this module
takes the action of last resort:

  • github-issue : open an auto-tracked issue on the repo so the
    operator (and Copilot agents) can investigate and trigger a
    Replit redeploy.
  • alert-only   : raise a Prometheus counter — no automated change.

Throttling: each (target, action) pair is rate-limited so SAIB doesn't
flood GitHub during a long outage.
"""

from __future__ import annotations

import os
import time
import logging
from dataclasses import dataclass

log = logging.getLogger("saib.remediation")

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "").strip()
GITHUB_REPO = os.getenv(
    "GITHUB_REPO",
    "jdrains110-beep/Triumph-Synergy-Digital-Financial-Ecosystem",
)
REMEDIATION_COOLDOWN_S = float(os.getenv("SAIB_REMEDIATION_COOLDOWN_S", "86400"))  # 24h
DEDUP_LOOKBACK_S = float(os.getenv("SAIB_REMEDIATION_DEDUP_LOOKBACK_S", "604800"))  # 7d
ISSUE_LABEL = "saib-auto"
COOLDOWN_STATE_PATH = os.getenv("SAIB_REMEDIATION_STATE_PATH", "/data/saib/remediation_cooldown.json")


@dataclass
class RemediationOutcome:
    target: str
    action: str
    ok: bool
    detail: str
    skipped: bool = False


class _RateLimiter:
    def __init__(self) -> None:
        self._last: dict[tuple[str, str], float] = {}
        self._load()

    def _load(self) -> None:
        try:
            import json
            with open(COOLDOWN_STATE_PATH, "r", encoding="utf-8") as fh:
                raw = json.load(fh)
            for k, v in raw.items():
                target, _, action = k.partition("|")
                if target and action:
                    self._last[(target, action)] = float(v)
        except (OSError, ValueError):
            pass

    def _save(self) -> None:
        try:
            import json
            os.makedirs(os.path.dirname(COOLDOWN_STATE_PATH), exist_ok=True)
            data = {f"{t}|{a}": ts for (t, a), ts in self._last.items()}
            with open(COOLDOWN_STATE_PATH, "w", encoding="utf-8") as fh:
                json.dump(data, fh)
        except OSError as exc:
            log.debug("[SAIB-REMEDIATION] cooldown save failed: %s", exc)

    def allow(self, target: str, action: str) -> bool:
        key = (target, action)
        now = time.time()
        last = self._last.get(key, 0.0)
        if now - last < REMEDIATION_COOLDOWN_S:
            return False
        self._last[key] = now
        self._save()
        return True


_limiter = _RateLimiter()


async def remediate(client, target_name: str, action: str, reason: str) -> RemediationOutcome:
    """Dispatch the configured remediation for a degraded external target."""
    if not _limiter.allow(target_name, action):
        return RemediationOutcome(
            target=target_name,
            action=action,
            ok=True,
            detail="rate-limited (cooldown active)",
            skipped=True,
        )

    if action == "github-issue":
        return await _github_open_issue(client, target_name, reason)
    return RemediationOutcome(
        target=target_name,
        action="alert-only",
        ok=True,
        detail="metric raised; no remote change applied",
    )


async def _github_open_issue(client, target_name: str, reason: str) -> RemediationOutcome:
    if not GITHUB_TOKEN:
        return RemediationOutcome(
            target=target_name, action="github-issue", ok=False,
            detail="GITHUB_TOKEN not configured", skipped=True,
        )

    title = f"[SAIB] external target degraded: {target_name}"
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json",
    }

    # DEDUP: bail out if an issue with the same title was opened (open OR
    # recently closed) so SAIB doesn't refile right after an operator closes.
    try:
        list_url = (
            f"https://api.github.com/repos/{GITHUB_REPO}/issues"
            f"?state=all&labels={ISSUE_LABEL}&per_page=100&sort=created&direction=desc"
        )
        lresp = await client.get(list_url, headers=headers, timeout=15.0)
        if lresp.status_code == 200:
            cutoff = time.time() - DEDUP_LOOKBACK_S
            for it in lresp.json():
                if it.get("title") != title:
                    continue
                # parse created_at
                created = it.get("created_at", "")
                try:
                    from datetime import datetime, timezone
                    ts = datetime.strptime(created, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc).timestamp()
                except ValueError:
                    ts = time.time()
                if it.get("state") == "open" or ts >= cutoff:
                    return RemediationOutcome(
                        target=target_name, action="github-issue", ok=True,
                        detail=f"dedup: matching issue #{it.get('number')} state={it.get('state')}",
                        skipped=True,
                    )
    except Exception as exc:  # noqa: BLE001
        log.warning("[SAIB-REMEDIATION] dedup list failed for %s: %s", target_name, exc)

    body = (
        "SAIB external probe flagged a degraded mainnet platform.\n\n"
        f"- target: `{target_name}`\n"
        f"- reason: `{reason}`\n"
        f"- detected_at_utc: `{time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}`\n\n"
        "This issue was opened automatically. SAIB will close/edit it once the "
        "platform recovers. Mainnet-only mandate: validation-key-testnet route is "
        "the sole permitted testnet artifact and is unaffected by this alert."
    )
    url = f"https://api.github.com/repos/{GITHUB_REPO}/issues"
    payload = {"title": title, "body": body, "labels": [ISSUE_LABEL]}
    try:
        resp = await client.post(url, headers=headers, json=payload, timeout=15.0)
        if resp.status_code in (200, 201):
            number = resp.json().get("number")
            log.info("[SAIB-REMEDIATION] GitHub issue #%s opened for %s", number, target_name)
            return RemediationOutcome(
                target=target_name, action="github-issue", ok=True,
                detail=f"issue #{number} opened",
            )
        return RemediationOutcome(
            target=target_name, action="github-issue", ok=False,
            detail=f"HTTP {resp.status_code}: {resp.text[:200]}",
        )
    except Exception as exc:  # noqa: BLE001
        return RemediationOutcome(
            target=target_name, action="github-issue", ok=False,
            detail=f"exception: {exc}"[:300],
        )
