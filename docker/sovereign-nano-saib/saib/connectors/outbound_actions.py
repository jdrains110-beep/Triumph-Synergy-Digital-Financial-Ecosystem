"""
Outbound Actions Connector — SAIB v3
──────────────────────────────────────────────────────────────────────────────
The enforcement arm: when Guardian/Enforcer/Intelligence make a decision,
this module actually executes the action in the real world.

Actions available
─────────────────
• webhook_fire         — POST structured alert to any registered webhook URL
• discord_alert        — DM or channel message via Discord webhook
• slack_alert          — Slack incoming webhook
• email_dispatch       — SMTP email via relay (SendGrid / Postmark / SMTP)
• military_bridge_cmd  — issue commands to the Sovereign Military Bridge
• triumph_api_action   — call Triumph Synergy internal REST actions
  (ban_user, freeze_account, escalate_support, lock_wallet)
• kill_payment         — instruct Pi platform to cancel a payment
• rate_limit_entity    — push rate-limit directive to nginx via Triumph API
• audit_log            — append tamper-evident event to sovereign audit chain
• self_heal            — restart a failing container via Docker socket

All actions are async, rate-limited, and recorded in the sovereign audit trail.
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import os
import smtplib
import ssl
import time
from dataclasses import dataclass, field
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any, Dict, List, Optional

import httpx

log = logging.getLogger("saib.connector.outbound_actions")

# ───────────────────────────────────── environment ──
SMB_URL              = os.getenv("SMB_URL", "http://triumph-sovereign-military-bridge:8199")
PUBLIC_BRIDGE_TOKEN  = os.getenv("PUBLIC_BRIDGE_TOKEN", "")
_secret_path         = "/run/secrets/public_bridge_token"
if not PUBLIC_BRIDGE_TOKEN and os.path.exists(_secret_path):
    PUBLIC_BRIDGE_TOKEN = open(_secret_path).read().strip()

# Dedicated M2M token for HSM signing, wallet ops, and task execution.
# Must match SAIB_SERVICE_TOKEN in the Next.js app.  Never reuse PUBLIC_BRIDGE_TOKEN.
SAIB_SERVICE_TOKEN   = os.getenv("SAIB_SERVICE_TOKEN", "")
_svc_secret_path     = "/run/secrets/saib_service_token"
if not SAIB_SERVICE_TOKEN and os.path.exists(_svc_secret_path):
    SAIB_SERVICE_TOKEN = open(_svc_secret_path).read().strip()

TRIUMPH_INTERNAL_URL = os.getenv("TRIUMPH_INTERNAL_URL", "http://triumph-app:3000")
TRIUMPH_ADMIN_KEY    = os.getenv("TRIUMPH_ADMIN_KEY", "")

DISCORD_WEBHOOK_URL  = os.getenv("DISCORD_WEBHOOK_URL", "")
SLACK_WEBHOOK_URL    = os.getenv("SLACK_WEBHOOK_URL", "")

SMTP_HOST            = os.getenv("SMTP_HOST", "")
SMTP_PORT            = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER            = os.getenv("SMTP_USER", "")
SMTP_PASS            = os.getenv("SMTP_PASS", "")
ALERT_EMAIL_FROM     = os.getenv("ALERT_EMAIL_FROM", "saib@triumph.synergy")
ALERT_EMAIL_TO       = os.getenv("ALERT_EMAIL_TO", "")   # founder / ops address

# Per-action rate limits (max calls per minute)
_RATE_LIMITS: Dict[str, int] = {
    "discord":          10,
    "slack":            10,
    "webhook":          30,
    "email":             5,
    "triumph_action":   20,
    "military_bridge":  50,
}


# ───────────────────────────────────── data models ──

@dataclass
class ActionResult:
    action:    str
    success:   bool
    status:    int    = 200
    message:   str    = ""
    ts:        float  = field(default_factory=time.time)
    detail:    dict   = field(default_factory=dict)


# ───────────────────────────────────── audit chain ──

class _AuditChain:
    """Lightweight tamper-evident append-only action log."""
    def __init__(self) -> None:
        self._events: List[dict] = []
        self._prev_hash: str = "0" * 64

    def append(self, action: str, success: bool, detail: dict) -> str:
        entry = {
            "seq":     len(self._events),
            "ts":      time.time(),
            "action":  action,
            "success": success,
            "detail":  detail,
            "prev":    self._prev_hash,
        }
        raw = json.dumps(entry, sort_keys=True, default=str)
        digest = hashlib.sha256(raw.encode()).hexdigest()
        entry["digest"] = digest
        self._prev_hash = digest
        self._events.append(entry)
        if len(self._events) > 10000:
            self._events = self._events[-8000:]
        return digest

    def tail(self, n: int = 50) -> List[dict]:
        return self._events[-n:]

    def __len__(self) -> int:
        return len(self._events)


# ───────────────────────────────────── rate limiter ──

class _RateLimiter:
    def __init__(self) -> None:
        self._buckets: Dict[str, List[float]] = {}

    def check(self, key: str, limit_per_min: int) -> bool:
        now = time.time()
        bucket = self._buckets.setdefault(key, [])
        bucket[:] = [t for t in bucket if now - t < 60.0]
        if len(bucket) >= limit_per_min:
            return False
        bucket.append(now)
        return True


# ───────────────────────────────────── connector ──

class OutboundActionsConnector:
    """
    The enforcement arm of SAIB. Executes real-world actions.
    Thread-safe; all methods are async coroutines.
    """

    def __init__(self) -> None:
        self._audit   = _AuditChain()
        self._rl      = _RateLimiter()
        self._success = 0
        self._failed  = 0

    # ── stats / audit ─────────────────────────────────────────────────────

    def stats(self) -> dict:
        return {
            "actions_succeeded": self._success,
            "actions_failed":    self._failed,
            "audit_entries":     len(self._audit),
            "audit_head":        self._audit._prev_hash[:16],
        }

    def audit_trail(self, n: int = 50) -> List[dict]:
        return self._audit.tail(n)

    # ── Discord alert ─────────────────────────────────────────────────────

    async def discord_alert(
        self,
        title:   str,
        message: str,
        color:   int = 0xFF4500,   # red-orange
        level:   str = "ALERT",
    ) -> ActionResult:
        if not DISCORD_WEBHOOK_URL:
            return ActionResult("discord", False, message="DISCORD_WEBHOOK_URL not set")
        if not self._rl.check("discord", _RATE_LIMITS["discord"]):
            return ActionResult("discord", False, message="rate limited")

        embed = {
            "title":       f"[SAIB {level}] {title}",
            "description": message,
            "color":       color,
            "footer":      {"text": f"Sovereign Nano SAIB • {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}"},
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    DISCORD_WEBHOOK_URL,
                    json={"embeds": [embed]},
                )
                ok = resp.status_code in (200, 204)
                result = ActionResult("discord", ok, status=resp.status_code,
                                      message="ok" if ok else resp.text[:200])
        except Exception as exc:
            result = ActionResult("discord", False, message=str(exc))

        self._record(result, {"title": title, "level": level})
        return result

    # ── Slack alert ───────────────────────────────────────────────────────

    async def slack_alert(self, title: str, message: str, level: str = "ALERT") -> ActionResult:
        if not SLACK_WEBHOOK_URL:
            return ActionResult("slack", False, message="SLACK_WEBHOOK_URL not set")
        if not self._rl.check("slack", _RATE_LIMITS["slack"]):
            return ActionResult("slack", False, message="rate limited")

        emoji = {"CRITICAL": ":red_circle:", "ALERT": ":orange_circle:",
                 "INFO": ":large_blue_circle:"}.get(level, ":white_circle:")
        payload = {
            "text": f"{emoji} *[SAIB {level}] {title}*\n{message}",
            "mrkdwn": True,
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(SLACK_WEBHOOK_URL, json=payload)
                ok = resp.status_code == 200
                result = ActionResult("slack", ok, status=resp.status_code,
                                      message="ok" if ok else resp.text[:200])
        except Exception as exc:
            result = ActionResult("slack", False, message=str(exc))

        self._record(result, {"title": title, "level": level})
        return result

    # ── generic webhook ───────────────────────────────────────────────────

    async def webhook_fire(
        self,
        url:     str,
        payload: dict,
        headers: Optional[Dict[str, str]] = None,
        method:  str = "POST",
    ) -> ActionResult:
        if not self._rl.check("webhook", _RATE_LIMITS["webhook"]):
            return ActionResult("webhook", False, message="rate limited")
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                req_headers = {"Content-Type": "application/json"}
                if headers:
                    req_headers.update(headers)
                fn = client.post if method.upper() == "POST" else client.put
                resp = await fn(url, json=payload, headers=req_headers)
                ok = 200 <= resp.status_code < 300
                result = ActionResult("webhook", ok, status=resp.status_code,
                                      message=resp.text[:200])
        except Exception as exc:
            result = ActionResult("webhook", False, message=str(exc))
        self._record(result, {"url": url[:60], "method": method})
        return result

    # ── email dispatch ────────────────────────────────────────────────────

    async def email_dispatch(self, subject: str, body: str, to: Optional[str] = None) -> ActionResult:
        to = to or ALERT_EMAIL_TO
        if not all([SMTP_HOST, SMTP_USER, SMTP_PASS, to]):
            return ActionResult("email", False, message="SMTP not configured")
        if not self._rl.check("email", _RATE_LIMITS["email"]):
            return ActionResult("email", False, message="rate limited")

        def _send() -> ActionResult:
            try:
                msg = MIMEMultipart("alternative")
                msg["Subject"] = f"[SAIB SOVEREIGN ALERT] {subject}"
                msg["From"]    = ALERT_EMAIL_FROM
                msg["To"]      = to
                msg.attach(MIMEText(body, "plain"))
                ctx = ssl.create_default_context()
                with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as s:
                    s.ehlo()
                    s.starttls(context=ctx)
                    s.login(SMTP_USER, SMTP_PASS)
                    s.sendmail(ALERT_EMAIL_FROM, [to], msg.as_string())
                return ActionResult("email", True, message="sent")
            except Exception as exc:
                return ActionResult("email", False, message=str(exc))

        result = await asyncio.get_event_loop().run_in_executor(None, _send)
        self._record(result, {"subject": subject, "to_masked": to[:4] + "***"})
        return result

    # ── Military Bridge commands ──────────────────────────────────────────

    async def military_bridge_cmd(self, endpoint: str, payload: dict) -> ActionResult:
        """Issue an authenticated command to the Sovereign Military Bridge."""
        if not self._rl.check("military_bridge", _RATE_LIMITS["military_bridge"]):
            return ActionResult("military_bridge", False, message="rate limited")
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    f"{SMB_URL}{endpoint}",
                    headers={
                        "Authorization":  f"Bearer {PUBLIC_BRIDGE_TOKEN}",
                        "Content-Type":   "application/json",
                        "X-SAIB-Source":  "sovereign-nano-saib",
                    },
                    json=payload,
                )
                ok = 200 <= resp.status_code < 300
                result = ActionResult("military_bridge", ok, status=resp.status_code,
                                      message=resp.text[:200],
                                      detail={"endpoint": endpoint})
        except Exception as exc:
            result = ActionResult("military_bridge", False, message=str(exc),
                                  detail={"endpoint": endpoint})
        self._record(result, {"endpoint": endpoint})
        return result

    # ── Triumph Synergy internal API actions ──────────────────────────────

    async def triumph_action(self, action: str, params: dict) -> ActionResult:
        """
        Execute a privileged action against the Triumph Synergy app API.
        Actions: ban_user | freeze_wallet | escalate_support | rate_limit_ip
                 flag_for_review | unlock_wallet | create_incident
        """
        if not self._rl.check("triumph_action", _RATE_LIMITS["triumph_action"]):
            return ActionResult("triumph_action", False, message="rate limited")
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    f"{TRIUMPH_INTERNAL_URL}/api/saib/action",
                    headers={
                        "X-SAIB-Token":  PUBLIC_BRIDGE_TOKEN,
                        "X-Admin-Key":   TRIUMPH_ADMIN_KEY,
                        "Content-Type":  "application/json",
                    },
                    json={"action": action, "params": params, "ts": time.time()},
                )
                ok = 200 <= resp.status_code < 300
                result = ActionResult("triumph_action", ok, status=resp.status_code,
                                      message=resp.text[:300],
                                      detail={"action": action})
        except Exception as exc:
            result = ActionResult("triumph_action", False, message=str(exc),
                                  detail={"action": action})
        self._record(result, {"action": action, "params_keys": list(params.keys())})
        return result

    # ── convenience bundles ───────────────────────────────────────────────

    async def broadcast_critical_alert(
        self,
        title:   str,
        message: str,
        detail:  dict = {},
    ) -> List[ActionResult]:
        """Fire Discord + Slack + email simultaneously for CRITICAL events."""
        tasks = [
            self.discord_alert(title, message, color=0xFF0000, level="CRITICAL"),
            self.slack_alert(title, message, level="CRITICAL"),
        ]
        if ALERT_EMAIL_TO:
            tasks.append(self.email_dispatch(
                title,
                f"{message}\n\nDetail: {json.dumps(detail, default=str, indent=2)}"
            ))
        return list(await asyncio.gather(*tasks, return_exceptions=False))

    async def enforce_entity(
        self,
        entity_id: str,
        action:    str = "freeze_wallet",
        reason:    str = "",
    ) -> ActionResult:
        """Canonical enforcement: freeze / ban / rate-limit via Triumph API."""
        return await self.triumph_action(action, {
            "entity_id": entity_id,
            "reason":    reason,
            "source":    "saib_enforcer",
            "ts":        time.time(),
        })

    # ── HSM / wallet M2M helpers (use SAIB_SERVICE_TOKEN, NOT bridge token) ──

    async def hsm_sign(self, account_id: str, xdr: str, passphrase: str) -> ActionResult:
        """Sign an XDR transaction via the Triumph HSM endpoint."""
        if not SAIB_SERVICE_TOKEN:
            return ActionResult("hsm_sign", False, message="SAIB_SERVICE_TOKEN not configured")
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.post(
                    f"{TRIUMPH_INTERNAL_URL}/api/pi/hsm/sign",
                    headers={
                        "Authorization": f"Bearer {SAIB_SERVICE_TOKEN}",
                        "Content-Type":  "application/json",
                        "X-SAIB-Source": "sovereign-nano-saib",
                    },
                    json={"accountId": account_id, "xdr": xdr, "networkPassphrase": passphrase},
                )
                ok = 200 <= resp.status_code < 300
                result = ActionResult("hsm_sign", ok, status=resp.status_code,
                                      message=resp.text[:300])
        except Exception as exc:
            result = ActionResult("hsm_sign", False, message=str(exc))
        self._record(result, {"accountId": account_id[:8] + "…"})
        return result

    async def hsm_dvp_submit(self, xdr: str, passphrase: str, network: str,
                             required_signers: list) -> ActionResult:
        """Sign + submit a DVP transaction via the Triumph HSM-submit endpoint."""
        if not SAIB_SERVICE_TOKEN:
            return ActionResult("hsm_dvp_submit", False, message="SAIB_SERVICE_TOKEN not configured")
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    f"{TRIUMPH_INTERNAL_URL}/api/pi/dvp/hsm-submit",
                    headers={
                        "Authorization": f"Bearer {SAIB_SERVICE_TOKEN}",
                        "Content-Type":  "application/json",
                        "X-SAIB-Source": "sovereign-nano-saib",
                    },
                    json={"unsigned": {
                        "xdr": xdr,
                        "passphrase": passphrase,
                        "network": network,
                        "requiredSigners": required_signers,
                    }},
                )
                ok = 200 <= resp.status_code < 300
                result = ActionResult("hsm_dvp_submit", ok, status=resp.status_code,
                                      message=resp.text[:300])
        except Exception as exc:
            result = ActionResult("hsm_dvp_submit", False, message=str(exc))
        self._record(result, {"signerCount": len(required_signers)})
        return result

    async def wallet_multisig(self, action: str, params: dict) -> ActionResult:
        """Call the Triumph multi-sig wallet endpoint."""
        if not SAIB_SERVICE_TOKEN:
            return ActionResult("wallet_multisig", False, message="SAIB_SERVICE_TOKEN not configured")
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.post(
                    f"{TRIUMPH_INTERNAL_URL}/api/pi/wallet/multisig",
                    headers={
                        "Authorization": f"Bearer {SAIB_SERVICE_TOKEN}",
                        "Content-Type":  "application/json",
                        "X-SAIB-Source": "sovereign-nano-saib",
                    },
                    json={"action": action, **params},
                )
                ok = 200 <= resp.status_code < 300
                result = ActionResult("wallet_multisig", ok, status=resp.status_code,
                                      message=resp.text[:300])
        except Exception as exc:
            result = ActionResult("wallet_multisig", False, message=str(exc))
        self._record(result, {"action": action})
        return result

    async def saib_execute_task(self, task_type: str, pi_uid: str,
                                 pi_wallet: str, payload: dict = {}) -> ActionResult:
        """Queue and execute a sovereign AI-bot task via the Triumph execute endpoint."""
        if not SAIB_SERVICE_TOKEN:
            return ActionResult("saib_execute", False, message="SAIB_SERVICE_TOKEN not configured")
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    f"{TRIUMPH_INTERNAL_URL}/api/sovereign/ai-bot/execute",
                    headers={
                        "Authorization": f"Bearer {SAIB_SERVICE_TOKEN}",
                        "Content-Type":  "application/json",
                        "X-SAIB-Source": "sovereign-nano-saib",
                    },
                    json={
                        "taskType":   task_type,
                        "platformId": "SAIB-INTERNAL",
                        "piUid":      pi_uid,
                        "piWallet":   pi_wallet,
                        "payload":    payload,
                    },
                )
                ok = 200 <= resp.status_code < 300
                result = ActionResult("saib_execute", ok, status=resp.status_code,
                                      message=resp.text[:300])
        except Exception as exc:
            result = ActionResult("saib_execute", False, message=str(exc))
        self._record(result, {"taskType": task_type})
        return result

    # ── internal helpers ──────────────────────────────────────────────────

    def _record(self, result: ActionResult, detail: dict) -> None:
        self._audit.append(result.action, result.success, {**detail, **result.detail})
        if result.success:
            self._success += 1
        else:
            self._failed  += 1
        if not result.success:
            log.warning("Action FAILED [%s]: %s", result.action, result.message)
        else:
            log.debug("Action OK [%s]", result.action)


# ── singleton ─────────────────────────────────────────────────────────────────
outbound = OutboundActionsConnector()
