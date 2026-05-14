"""
SAIB External Remediation
=========================

When external probes detect a degraded platform SAIB cannot directly
restart (Vercel deployment, PiNet host, Pi mainnet API), this module
takes the action of last resort:

  • vercel-redeploy : POST a redeploy via the Vercel API using the
    most recent deployment of the project (requires VERCEL_TOKEN +
    VERCEL_PROJECT_ID).
  • github-issue   : open an auto-tracked issue on the repo so the
    operator (and Copilot agents) can investigate.
  • alert-only    : raise a Prometheus counter — no automated change.

Throttling: each (target, action) pair is rate-limited so SAIB doesn't
flood Vercel / GitHub during a long outage.
"""

from __future__ import annotations

import os
import time
import logging
from dataclasses import dataclass

log = logging.getLogger("saib.remediation")

VERCEL_TOKEN = os.getenv("VERCEL_TOKEN", "").strip()
VERCEL_PROJECT_ID = os.getenv("VERCEL_PROJECT_ID", "").strip()
VERCEL_TEAM_ID = os.getenv("VERCEL_TEAM_ID", "").strip()
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "").strip()
GITHUB_REPO = os.getenv(
    "GITHUB_REPO",
    "jdrains110-beep/Triumph-Synergy-Digital-Financial-Ecosystem",
)
REMEDIATION_COOLDOWN_S = float(os.getenv("SAIB_REMEDIATION_COOLDOWN_S", "900"))  # 15 min
ISSUE_LABEL = "saib-auto"


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

    def allow(self, target: str, action: str) -> bool:
        key = (target, action)
        now = time.time()
        last = self._last.get(key, 0.0)
        if now - last < REMEDIATION_COOLDOWN_S:
            return False
        self._last[key] = now
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

    if action == "vercel-redeploy":
        return await _vercel_redeploy(client, target_name, reason)
    if action == "github-issue":
        return await _github_open_issue(client, target_name, reason)
    return RemediationOutcome(
        target=target_name,
        action="alert-only",
        ok=True,
        detail="metric raised; no remote change applied",
    )


async def _vercel_redeploy(client, target_name: str, reason: str) -> RemediationOutcome:
    if not VERCEL_TOKEN or not VERCEL_PROJECT_ID:
        return RemediationOutcome(
            target=target_name,
            action="vercel-redeploy",
            ok=False,
            detail="VERCEL_TOKEN or VERCEL_PROJECT_ID not configured",
            skipped=True,
        )

    list_url = f"https://api.vercel.com/v6/deployments?projectId={VERCEL_PROJECT_ID}&limit=1&state=READY"
    if VERCEL_TEAM_ID:
        list_url += f"&teamId={VERCEL_TEAM_ID}"
    headers = {"Authorization": f"Bearer {VERCEL_TOKEN}"}

    try:
        resp = await client.get(list_url, headers=headers, timeout=15.0)
        if resp.status_code != 200:
            return RemediationOutcome(
                target=target_name, action="vercel-redeploy", ok=False,
                detail=f"list deployments HTTP {resp.status_code}",
            )
        body = resp.json()
        deployments = body.get("deployments", [])
        if not deployments:
            return RemediationOutcome(
                target=target_name, action="vercel-redeploy", ok=False,
                detail="no prior READY deployment to redeploy",
            )
        last = deployments[0]
        deploy_id = last.get("uid")

        post_url = "https://api.vercel.com/v13/deployments"
        if VERCEL_TEAM_ID:
            post_url += f"?teamId={VERCEL_TEAM_ID}"
        payload = {
            "name": last.get("name", "triumph-synergy"),
            "deploymentId": deploy_id,
            "target": "production",
            "meta": {"saib_reason": reason[:200]},
        }
        post_resp = await client.post(
            post_url, headers=headers, json=payload, timeout=20.0,
        )
        if post_resp.status_code in (200, 201):
            new_id = post_resp.json().get("id", "<unknown>")
            log.info("[SAIB-REMEDIATION] Vercel redeploy queued: %s -> %s", deploy_id, new_id)
            return RemediationOutcome(
                target=target_name, action="vercel-redeploy", ok=True,
                detail=f"redeploy {new_id} queued from {deploy_id}",
            )
        return RemediationOutcome(
            target=target_name, action="vercel-redeploy", ok=False,
            detail=f"redeploy POST HTTP {post_resp.status_code}: {post_resp.text[:200]}",
        )
    except Exception as exc:  # noqa: BLE001
        return RemediationOutcome(
            target=target_name, action="vercel-redeploy", ok=False,
            detail=f"exception: {exc}"[:300],
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

    # DEDUP: bail out if an open issue with the same title already exists.
    # Survives SAIB restart unlike the in-memory cooldown.
    try:
        owner_repo = GITHUB_REPO
        search_q = f'repo:{owner_repo} is:issue is:open in:title "{title}"'
        search_url = f"https://api.github.com/search/issues?q={search_q}"
        sresp = await client.get(search_url, headers=headers, timeout=15.0)
        if sresp.status_code == 200:
            items = sresp.json().get("items", [])
            for it in items:
                if it.get("title") == title:
                    return RemediationOutcome(
                        target=target_name, action="github-issue", ok=True,
                        detail=f"existing open issue #{it.get('number')} (dedup)",
                        skipped=True,
                    )
    except Exception as exc:  # noqa: BLE001
        log.warning("[SAIB-REMEDIATION] dedup search failed for %s: %s", target_name, exc)

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
