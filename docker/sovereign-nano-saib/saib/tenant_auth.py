"""
Multi-Tenant Auth Manager — SAIB v5
──────────────────────────────────────────────────────────────────────────────
Enterprise-grade multi-tenant isolation for external SAIB clients.

Tenant plans
────────────
  FREE       — 5 services, no PR delivery, no K8s, 7-day log retention
  PRO        — 50 services, PR/MR delivery, basic K8s, 30-day retention
  ENTERPRISE — unlimited services, PR delivery, full K8s, 90-day retention,
                custom heal schedules, dedicated Grok model selection

Auth flow
─────────
  1. Admin calls POST /v5/tenants/create  → receives tenant_id + api_key
  2. Tenant signs every API request with:
       X-Tenant-Token: <api_key>
     OR JWT Bearer (issued via POST /v5/tenants/token for short-lived sessions)
  3. All service registry, log, fix operations are scoped to tenant_id

Security
────────
  • Constant-time token comparison (hmac.compare_digest)
  • Per-tenant rate limiting (requests/min by plan)
  • Admin endpoints require the master bridge token
  • API keys are SHA-256 hashed at rest (never stored in plaintext)
  • JWT signed with per-tenant secret (HMAC-SHA256)
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
import os
import secrets
import time
import uuid
from dataclasses import dataclass, field
from typing import Dict, List, Optional

log = logging.getLogger("saib.tenant_auth")

MASTER_TOKEN = os.getenv("PUBLIC_BRIDGE_TOKEN", "")
JWT_ALGO     = "HS256"

# ── plan definitions ──────────────────────────────────────────────────────────

PLANS: Dict[str, dict] = {
    "free": {
        "max_services":     5,
        "pr_delivery":      False,
        "k8s_enabled":      False,
        "log_retention_d":  7,
        "req_per_min":      30,
        "grok_model":       "grok-3-mini",
        "custom_schedule":  False,
    },
    "pro": {
        "max_services":     50,
        "pr_delivery":      True,
        "k8s_enabled":      True,
        "log_retention_d":  30,
        "req_per_min":      300,
        "grok_model":       "grok-3-mini",
        "custom_schedule":  False,
    },
    "enterprise": {
        "max_services":     9999,
        "pr_delivery":      True,
        "k8s_enabled":      True,
        "log_retention_d":  90,
        "req_per_min":      9999,
        "grok_model":       "grok-3",
        "custom_schedule":  True,
    },
}


# ── data models ──────────────────────────────────────────────────────────────

@dataclass
class TenantCredentials:
    """Returned to the caller when a tenant is created."""
    tenant_id:  str
    api_key:    str     # raw — show ONCE, then discard
    plan:       str


@dataclass
class Tenant:
    """Persistent tenant record (api_key stored as hash)."""
    tenant_id:    str
    name:         str
    plan:         str
    api_key_hash: str
    jwt_secret:   str
    created_at:   float  = field(default_factory=time.time)
    active:       bool   = True
    # rate limiting
    _req_timestamps: List[float] = field(default_factory=list)


@dataclass
class TenantContext:
    """Resolved tenant context from a validated token."""
    tenant_id:   str
    name:        str
    plan:        str
    permissions: List[str]
    # plan flags — pre-resolved for fast checks
    max_services:    int
    pr_delivery:     bool
    k8s_enabled:     bool
    grok_model:      str


# ── manager ──────────────────────────────────────────────────────────────────

class TenantAuthManager:
    """
    SAIB multi-tenant authentication and plan enforcement manager.
    Stores tenants in-memory; no external DB required.
    """

    def __init__(self) -> None:
        self._tenants:   Dict[str, Tenant] = {}      # tenant_id → Tenant
        self._key_index: Dict[str, str]    = {}      # api_key_hash → tenant_id
        log.info("TenantAuthManager: online")

    # ── tenant lifecycle ──────────────────────────────────────────────────────

    def create_tenant(
        self,
        name:  str,
        plan:  str = "free",
        admin_token: str = "",
    ) -> TenantCredentials:
        """
        Create a new tenant. Requires the master admin token.
        Returns TenantCredentials including the raw api_key (shown once).
        """
        if MASTER_TOKEN and not _compare(admin_token, MASTER_TOKEN):
            raise PermissionError("Admin token required to create tenants")

        plan = plan.lower()
        if plan not in PLANS:
            raise ValueError(f"Unknown plan: {plan}. Choose: {', '.join(PLANS)}")

        tenant_id  = str(uuid.uuid4())
        api_key    = secrets.token_hex(32)      # 256-bit random
        jwt_secret = secrets.token_hex(32)
        key_hash   = _hash(api_key)

        tenant = Tenant(
            tenant_id    = tenant_id,
            name         = name,
            plan         = plan,
            api_key_hash = key_hash,
            jwt_secret   = jwt_secret,
        )
        self._tenants[tenant_id]    = tenant
        self._key_index[key_hash]   = tenant_id

        log.info("TenantAuthManager: created tenant '%s' (id=%s plan=%s)", name, tenant_id, plan)
        return TenantCredentials(tenant_id=tenant_id, api_key=api_key, plan=plan)

    def deactivate_tenant(self, tenant_id: str, admin_token: str = "") -> bool:
        if MASTER_TOKEN and not _compare(admin_token, MASTER_TOKEN):
            return False
        tenant = self._tenants.get(tenant_id)
        if not tenant:
            return False
        tenant.active = False
        return True

    def upgrade_plan(
        self,
        tenant_id:   str,
        new_plan:    str,
        admin_token: str = "",
    ) -> bool:
        if MASTER_TOKEN and not _compare(admin_token, MASTER_TOKEN):
            return False
        tenant = self._tenants.get(tenant_id)
        if not tenant or new_plan not in PLANS:
            return False
        tenant.plan = new_plan
        log.info("TenantAuthManager: tenant %s upgraded to %s", tenant_id, new_plan)
        return True

    # ── token validation ──────────────────────────────────────────────────────

    def validate_api_key(self, raw_key: str) -> Optional[TenantContext]:
        """Validate a raw API key. Returns TenantContext or None."""
        # master token → admin context (bypasses all tenant isolation)
        if MASTER_TOKEN and _compare(raw_key, MASTER_TOKEN):
            return TenantContext(
                tenant_id    = "__master__",
                name         = "Triumph Master",
                plan         = "enterprise",
                permissions  = ["all"],
                max_services = 9999,
                pr_delivery  = True,
                k8s_enabled  = True,
                grok_model   = "grok-3",
            )
        h  = _hash(raw_key)
        tid = self._key_index.get(h)
        if not tid:
            return None
        tenant = self._tenants.get(tid)
        if not tenant or not tenant.active:
            return None
        if not _rate_check(tenant):
            log.warning("Rate limit hit for tenant %s", tid)
            return None
        return _build_ctx(tenant)

    def issue_jwt(self, tenant_id: str, raw_key: str, ttl_s: int = 3600) -> Optional[str]:
        """Issue a short-lived JWT for a tenant (validated by API key first)."""
        ctx = self.validate_api_key(raw_key)
        if not ctx or ctx.tenant_id != tenant_id:
            return None
        tenant = self._tenants.get(tenant_id)
        if not tenant:
            return None

        header  = _b64url(json.dumps({"alg": JWT_ALGO, "typ": "JWT"}))
        payload = _b64url(json.dumps({
            "sub": tenant_id,
            "iat": int(time.time()),
            "exp": int(time.time()) + ttl_s,
            "pln": tenant.plan,
        }))
        sig = _b64url(
            hmac.new(
                tenant.jwt_secret.encode(),
                f"{header}.{payload}".encode(),
                hashlib.sha256,
            ).digest()
        )
        return f"{header}.{payload}.{sig}"

    def validate_jwt(self, token: str) -> Optional[TenantContext]:
        """Validate a JWT. Returns TenantContext or None."""
        try:
            parts = token.split(".")
            if len(parts) != 3:
                return None
            header_b64, payload_b64, sig_b64 = parts
            payload = json.loads(_b64url_decode(payload_b64))
            tid     = payload.get("sub", "")
            exp     = payload.get("exp", 0)
            if time.time() > exp:
                return None
            tenant = self._tenants.get(tid)
            if not tenant or not tenant.active:
                return None
            # verify signature
            expected_sig = _b64url(
                hmac.new(
                    tenant.jwt_secret.encode(),
                    f"{header_b64}.{payload_b64}".encode(),
                    hashlib.sha256,
                ).digest()
            )
            if not hmac.compare_digest(expected_sig, sig_b64):
                return None
            return _build_ctx(tenant)
        except Exception:
            return None

    def validate_any_token(self, token: str) -> Optional[TenantContext]:
        """Try API key first, then JWT. Returns TenantContext or None."""
        ctx = self.validate_api_key(token)
        if ctx:
            return ctx
        return self.validate_jwt(token)

    # ── plan enforcement helpers ──────────────────────────────────────────────

    def enforce_pr_delivery(self, ctx: TenantContext) -> bool:
        return ctx.pr_delivery

    def enforce_k8s(self, ctx: TenantContext) -> bool:
        return ctx.k8s_enabled

    def get_max_services(self, ctx: TenantContext) -> int:
        return ctx.max_services

    def list_tenants(self, admin_token: str = "") -> List[dict]:
        """Admin-only: list all tenants (no sensitive data)."""
        if MASTER_TOKEN and not _compare(admin_token, MASTER_TOKEN):
            return []
        return [
            {
                "tenant_id":  t.tenant_id,
                "name":       t.name,
                "plan":       t.plan,
                "active":     t.active,
                "created_at": t.created_at,
            }
            for t in self._tenants.values()
        ]

    def stats(self) -> dict:
        return {
            "total_tenants":  len(self._tenants),
            "active_tenants": sum(1 for t in self._tenants.values() if t.active),
            "by_plan": {
                plan: sum(1 for t in self._tenants.values() if t.plan == plan)
                for plan in PLANS
            },
        }


# ── helpers ──────────────────────────────────────────────────────────────────

def _hash(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def _compare(a: str, b: str) -> bool:
    return hmac.compare_digest(
        a.encode("utf-8"),
        b.encode("utf-8"),
    )


def _rate_check(tenant: Tenant) -> bool:
    """Simple sliding-window rate limiter. Returns True if within limit."""
    plan_cfg = PLANS.get(tenant.plan, PLANS["free"])
    limit    = plan_cfg["req_per_min"]
    now      = time.time()
    # keep only last 60s
    tenant._req_timestamps = [t for t in tenant._req_timestamps if now - t < 60]
    if len(tenant._req_timestamps) >= limit:
        return False
    tenant._req_timestamps.append(now)
    return True


def _build_ctx(tenant: Tenant) -> TenantContext:
    plan_cfg = PLANS.get(tenant.plan, PLANS["free"])
    perms    = ["read", "register"]
    if plan_cfg["pr_delivery"]:
        perms.append("pr_delivery")
    if plan_cfg["k8s_enabled"]:
        perms.append("k8s")
    return TenantContext(
        tenant_id    = tenant.tenant_id,
        name         = tenant.name,
        plan         = tenant.plan,
        permissions  = perms,
        max_services = plan_cfg["max_services"],
        pr_delivery  = plan_cfg["pr_delivery"],
        k8s_enabled  = plan_cfg["k8s_enabled"],
        grok_model   = plan_cfg["grok_model"],
    )


def _b64url(data: bytes | str) -> str:
    import base64 as _b
    if isinstance(data, str):
        data = data.encode()
    return _b.urlsafe_b64encode(data).rstrip(b"=").decode()


def _b64url_decode(s: str) -> bytes:
    import base64 as _b
    padding = 4 - len(s) % 4
    if padding < 4:
        s += "=" * padding
    return _b.urlsafe_b64decode(s)


# ── singleton ─────────────────────────────────────────────────────────────────
tenant_auth = TenantAuthManager()
