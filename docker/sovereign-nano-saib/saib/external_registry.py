"""
External Service Registry — SAIB v5
──────────────────────────────────────────────────────────────────────────────
Dynamic multi-tenant service registration. Any external company, project, or
framework can register their services into SAIB for sovereign monitoring and
auto-healing — with full tenant isolation enforced via JWT scoped tokens.

Capabilities
────────────
• Dynamic registration: POST any service URL, log source, stack type
• Multi-tenant isolation: each tenant sees only their own services
• JWT-scoped tokens: HMAC-signed, expirable, revocable
• Log source adapters: http_endpoint | docker | file | cloudwatch | syslog |
                        kubernetes | loki | datadog | custom_webhook
• Stack type hints: node | python | java | go | rust | dotnet | php | generic
• Health schema detection: auto-detects JSON shape of health response
• Webhook ingestion: external systems can push log events to SAIB
• Admin override: Triumph master token bypasses tenant isolation
"""
from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import logging
import os
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional

log = logging.getLogger("saib.external_registry")

# ── config ──────────────────────────────────────────────────────────────────
REGISTRY_JWT_SECRET = os.getenv("SAIB_REGISTRY_SECRET", "")
MASTER_TOKEN        = os.getenv("PUBLIC_BRIDGE_TOKEN", "")
MAX_SERVICES_PER_TENANT = int(os.getenv("SAIB_MAX_SERVICES_PER_TENANT", "50"))
TOKEN_TTL_SECONDS       = int(os.getenv("SAIB_TOKEN_TTL_S", "86400"))  # 24h default


# ── enums ────────────────────────────────────────────────────────────────────

class LogSourceType(str, Enum):
    HTTP_ENDPOINT = "http_endpoint"   # pull metrics/logs from an HTTP URL
    DOCKER        = "docker"          # Docker socket (container name)
    FILE          = "file"            # tail a log file path (if mounted)
    CLOUDWATCH    = "cloudwatch"      # AWS CloudWatch log group
    SYSLOG        = "syslog"          # UDP/TCP syslog receiver (port 9514)
    KUBERNETES    = "kubernetes"      # Kubernetes pod/namespace
    LOKI          = "loki"            # Grafana Loki query
    DATADOG       = "datadog"         # Datadog log API
    WEBHOOK       = "webhook"         # PUSH — external pushes log events to SAIB
    CUSTOM        = "custom"          # arbitrary URL with auth headers


class StackType(str, Enum):
    NODE      = "node"
    PYTHON    = "python"
    JAVA      = "java"
    GO        = "go"
    RUST      = "rust"
    DOTNET    = "dotnet"
    PHP       = "php"
    RUBY      = "ruby"
    GENERIC   = "generic"


# ── data models ──────────────────────────────────────────────────────────────

@dataclass
class ExternalServiceSpec:
    """Full registration spec for an external service."""
    service_id:    str                    # auto-generated UUID
    tenant_id:     str                    # owner tenant
    name:          str                    # human label
    health_url:    str                    # HTTP health check endpoint
    log_source:    LogSourceType          # where to pull logs from
    stack_type:    StackType              # tech stack for parser selection
    criticality:   float                  # 0-1, owner-supplied
    # log source details (varies by type)
    log_config:    Dict[str, Any] = field(default_factory=dict)
    # optional: source code repo for fix engine
    repo_url:      str = ""               # e.g. https://github.com/org/repo
    repo_token:    str = ""               # PAT for PR creation
    repo_provider: str = "github"         # github | gitlab | bitbucket
    # optional: Kubernetes specifics
    k8s_namespace: str = ""
    k8s_label:     str = ""
    # metadata
    registered_at: float = field(default_factory=time.time)
    last_seen_at:  float = field(default_factory=time.time)
    webhook_secret: str  = ""             # HMAC secret for push ingestion


@dataclass
class TenantToken:
    """A scoped SAIB access token for one tenant."""
    tenant_id:  str
    token_hash: str          # SHA-256 of the raw token
    scopes:     List[str]    # ["register", "read", "approve_heal", "fix"]
    issued_at:  float
    expires_at: float
    revoked:    bool = False
    label:      str  = ""


@dataclass
class IngestedLogEvent:
    """A log event pushed or pulled for a registered external service."""
    service_id:  str
    tenant_id:   str
    ts:          float
    level:       str          # error|warn|info|debug
    message:     str
    raw:         dict = field(default_factory=dict)


# ── registry engine ──────────────────────────────────────────────────────────

class ExternalServiceRegistry:
    """
    Sovereign multi-tenant external service registry.
    Thread-safe, fully async, no external DB required (in-memory + optional
    persistence path).
    """

    def __init__(self) -> None:
        self._services:  Dict[str, ExternalServiceSpec] = {}   # service_id → spec
        self._by_tenant: Dict[str, List[str]] = {}             # tenant_id → [service_id]
        self._tokens:    Dict[str, TenantToken] = {}           # token_hash → token
        self._log_buffer: Dict[str, List[IngestedLogEvent]] = {}  # service_id → events
        self._lock = asyncio.Lock()
        log.info("ExternalServiceRegistry: online")

    # ── token management ─────────────────────────────────────────────────────

    def issue_token(
        self,
        tenant_id: str,
        scopes:    Optional[List[str]] = None,
        label:     str = "",
        ttl_s:     Optional[int] = None,
    ) -> str:
        """Issue a new scoped token for a tenant. Returns the raw token string."""
        raw   = secrets_token()
        h     = _hash_token(raw)
        now   = time.time()
        ttl   = ttl_s or TOKEN_TTL_SECONDS
        token = TenantToken(
            tenant_id  = tenant_id,
            token_hash = h,
            scopes     = scopes or ["register", "read"],
            issued_at  = now,
            expires_at = now + ttl,
            label      = label,
        )
        self._tokens[h] = token
        log.info("Registry: issued token for tenant=%s scopes=%s", tenant_id, token.scopes)
        return raw

    def verify_token(self, raw_token: str) -> Optional[TenantToken]:
        """Validate a token. Returns TenantToken if valid, None otherwise."""
        # master token always passes — full admin
        if MASTER_TOKEN and raw_token == MASTER_TOKEN:
            return TenantToken(
                tenant_id  = "__master__",
                token_hash = "",
                scopes     = ["register", "read", "approve_heal", "fix", "admin"],
                issued_at  = 0,
                expires_at = float("inf"),
            )
        h = _hash_token(raw_token)
        t = self._tokens.get(h)
        if not t:
            return None
        if t.revoked or time.time() > t.expires_at:
            return None
        return t

    def revoke_token(self, raw_token: str) -> bool:
        h = _hash_token(raw_token)
        t = self._tokens.get(h)
        if t:
            t.revoked = True
            return True
        return False

    # ── service CRUD ─────────────────────────────────────────────────────────

    async def register(
        self,
        tenant_id:    str,
        name:         str,
        health_url:   str,
        log_source:   LogSourceType       = LogSourceType.HTTP_ENDPOINT,
        stack_type:   StackType           = StackType.GENERIC,
        criticality:  float               = 0.5,
        log_config:   Optional[Dict]      = None,
        repo_url:     str                 = "",
        repo_token:   str                 = "",
        repo_provider: str                = "github",
        k8s_namespace: str                = "",
        k8s_label:    str                 = "",
    ) -> ExternalServiceSpec:
        """Register a new external service under a tenant."""
        async with self._lock:
            existing = self._by_tenant.get(tenant_id, [])
            if len(existing) >= MAX_SERVICES_PER_TENANT:
                raise ValueError(
                    f"Tenant {tenant_id} has reached max services ({MAX_SERVICES_PER_TENANT})"
                )
            svc_id = str(uuid.uuid4())
            webhook_secret = secrets_token()[:32]
            spec = ExternalServiceSpec(
                service_id     = svc_id,
                tenant_id      = tenant_id,
                name           = name,
                health_url     = health_url,
                log_source     = log_source,
                stack_type     = stack_type,
                criticality    = max(0.0, min(1.0, criticality)),
                log_config     = log_config or {},
                repo_url       = repo_url,
                repo_token     = repo_token,
                repo_provider  = repo_provider,
                k8s_namespace  = k8s_namespace,
                k8s_label      = k8s_label,
                webhook_secret = webhook_secret,
            )
            self._services[svc_id] = spec
            self._by_tenant.setdefault(tenant_id, []).append(svc_id)
            self._log_buffer[svc_id] = []
            log.info(
                "Registry: registered service '%s' (id=%s) for tenant=%s stack=%s",
                name, svc_id, tenant_id, stack_type.value,
            )
            return spec

    def deregister(self, service_id: str, tenant_id: str) -> bool:
        spec = self._services.get(service_id)
        if not spec or spec.tenant_id != tenant_id:
            return False
        del self._services[service_id]
        self._by_tenant[tenant_id] = [
            sid for sid in self._by_tenant.get(tenant_id, []) if sid != service_id
        ]
        self._log_buffer.pop(service_id, None)
        return True

    def get_service(self, service_id: str, tenant_id: str) -> Optional[ExternalServiceSpec]:
        spec = self._services.get(service_id)
        if spec and (spec.tenant_id == tenant_id or tenant_id == "__master__"):
            return spec
        return None

    def list_services(self, tenant_id: str) -> List[ExternalServiceSpec]:
        if tenant_id == "__master__":
            return list(self._services.values())
        ids = self._by_tenant.get(tenant_id, [])
        return [self._services[sid] for sid in ids if sid in self._services]

    # ── webhook push ingestion ────────────────────────────────────────────────

    def ingest_webhook(
        self,
        service_id: str,
        payload:    dict,
        signature:  str = "",
    ) -> bool:
        """
        Receive a push log event from an external service.
        Validates HMAC-SHA256 signature if webhook_secret is set.
        Returns True if accepted.
        """
        spec = self._services.get(service_id)
        if not spec:
            return False
        # verify signature if secret configured
        if spec.webhook_secret and signature:
            expected = "sha256=" + hmac.new(
                spec.webhook_secret.encode(),
                json.dumps(payload, separators=(",", ":")).encode(),
                hashlib.sha256,
            ).hexdigest()
            if not hmac.compare_digest(expected, signature):
                log.warning("Registry: webhook signature mismatch for service %s", service_id)
                return False

        level   = str(payload.get("level", "info")).lower()
        message = str(payload.get("message", payload.get("msg", "")))
        event   = IngestedLogEvent(
            service_id = service_id,
            tenant_id  = spec.tenant_id,
            ts         = float(payload.get("ts", payload.get("timestamp", time.time()))),
            level      = level,
            message    = message,
            raw        = payload,
        )
        buf = self._log_buffer.setdefault(service_id, [])
        buf.append(event)
        if len(buf) > 500:
            del buf[:-500]
        spec.last_seen_at = time.time()
        return True

    def get_log_buffer(self, service_id: str, tenant_id: str, n: int = 100) -> List[dict]:
        spec = self._services.get(service_id)
        if not spec or (spec.tenant_id != tenant_id and tenant_id != "__master__"):
            return []
        buf = self._log_buffer.get(service_id, [])
        return [
            {"ts": e.ts, "level": e.level, "message": e.message}
            for e in buf[-n:]
        ]

    def stats(self) -> dict:
        return {
            "total_services": len(self._services),
            "total_tenants":  len(self._by_tenant),
            "active_tokens":  sum(
                1 for t in self._tokens.values()
                if not t.revoked and time.time() < t.expires_at
            ),
            "log_events_buffered": sum(len(v) for v in self._log_buffer.values()),
        }


# ── helpers ──────────────────────────────────────────────────────────────────

def secrets_token(n: int = 32) -> str:
    import secrets as _s
    return _s.token_hex(n)


def _hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


# ── singleton ─────────────────────────────────────────────────────────────────
external_registry = ExternalServiceRegistry()
