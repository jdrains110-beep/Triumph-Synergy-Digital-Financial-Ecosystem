"""
SAIB MCP Server — SAIB v5
──────────────────────────────────────────────────────────────────────────────
Exposes SAIB as a Model Context Protocol (MCP) tool server so any MCP-aware AI
client (Claude, GitHub Copilot, Cursor, Open Interpreter, etc.) can call SAIB
as a live sovereign infrastructure diagnostic agent — using the standard
JSON-RPC 2.0 over HTTP transport.

MCP Spec implemented
────────────────────
  POST /mcp             — JSON-RPC 2.0 entry point
  GET  /mcp/tools/list  — enumerate available tools (MCP discovery)

Tools exposed
─────────────
  diagnose_service      — Run full Grok + healer analysis on a named service
  get_logs              — Fetch recent log events for a registered service
  analyze_code          — Analyze a code snippet or stack trace via Grok
  propose_fix           — Generate a code fix from a CodeContext
  register_service      — Register an external service for monitoring
  deregister_service    — Remove a service from monitoring
  list_services         — List all services for a tenant
  get_ecosystem_health  — Full health scan across all Triumph services
  run_heal_cycle        — Trigger one sovereign heal cycle immediately
  get_fix_proposals     — Retrieve recent fix proposals for a tenant

Each tool is defined as a standard MCP ToolDefinition with JSON Schema for
its inputSchema and an async handler that returns a content block.

Usage example (from an MCP client)
──────────────────────────────────
  {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "diagnose_service",
      "arguments": {"service_id": "abc123", "tenant_token": "..."}
    }
  }
"""
from __future__ import annotations

import json
import logging
import time
from typing import Any, Callable, Dict, List, Optional

log = logging.getLogger("saib.mcp_server")


# ── MCP protocol constants ────────────────────────────────────────────────────

JSONRPC   = "2.0"
MCP_VER   = "2025-03-26"   # official MCP protocol version

# ── error codes (JSON-RPC + MCP extension) ───────────────────────────────────
ERR_PARSE          = -32700
ERR_INVALID_REQ    = -32600
ERR_METHOD_NOT_FOUND = -32601
ERR_INVALID_PARAMS = -32602
ERR_INTERNAL       = -32603
ERR_UNAUTHORIZED   = -32001
ERR_NOT_FOUND      = -32002


# ── tool registry ─────────────────────────────────────────────────────────────

class MCPTool:
    """One MCP tool definition."""
    def __init__(
        self,
        name:         str,
        description:  str,
        input_schema: dict,
        handler:      Callable,
    ) -> None:
        self.name         = name
        self.description  = description
        self.input_schema = input_schema
        self.handler      = handler

    def to_dict(self) -> dict:
        return {
            "name":        self.name,
            "description": self.description,
            "inputSchema": self.input_schema,
        }


# ── main MCP server class ─────────────────────────────────────────────────────

class SAIBMCPServer:
    """
    SAIB Model Context Protocol server.
    Wired into FastAPI app as a POST /mcp endpoint.
    """

    def __init__(self) -> None:
        self._tools:    Dict[str, MCPTool] = {}
        self._healer    = None
        self._registry  = None
        self._grok      = None
        self._fix_proposals: List[dict] = []
        log.info("SAIBMCPServer: initialised")

    def boot(
        self,
        healer:    Any,
        registry:  Any,
        grok:      Any,
    ) -> None:
        self._healer   = healer
        self._registry = registry
        self._grok     = grok
        self._register_tools()
        log.info("SAIBMCPServer: booted with %d tools", len(self._tools))

    def _register_tools(self) -> None:
        """Register all SAIB MCP tools."""

        # ── diagnose_service ─────────────────────────────────────────────────
        self._tools["diagnose_service"] = MCPTool(
            name         = "diagnose_service",
            description  = (
                "Run a full sovereign diagnostic analysis on a registered service. "
                "Pulls logs, runs Grok root-cause analysis, and returns diagnosis "
                "including root cause, affected layers, blast radius, and recommended actions."
            ),
            input_schema = {
                "type": "object",
                "properties": {
                    "service_id":    {"type": "string", "description": "Service ID from register_service"},
                    "tenant_token":  {"type": "string", "description": "Tenant API token"},
                    "force":         {"type": "boolean", "description": "Force even if recently scanned"},
                },
                "required": ["service_id", "tenant_token"],
            },
            handler = self._handle_diagnose_service,
        )

        # ── get_logs ─────────────────────────────────────────────────────────
        self._tools["get_logs"] = MCPTool(
            name         = "get_logs",
            description  = "Fetch recent log events for a registered service.",
            input_schema = {
                "type": "object",
                "properties": {
                    "service_id":   {"type": "string"},
                    "tenant_token": {"type": "string"},
                    "tail":         {"type": "integer", "default": 50, "minimum": 1, "maximum": 500},
                    "level_filter": {"type": "string", "enum": ["all", "error", "warn", "info", "debug"], "default": "all"},
                },
                "required": ["service_id", "tenant_token"],
            },
            handler = self._handle_get_logs,
        )

        # ── analyze_code ─────────────────────────────────────────────────────
        self._tools["analyze_code"] = MCPTool(
            name         = "analyze_code",
            description  = (
                "Analyze a code snippet or stack trace for bugs and issues. "
                "Returns root cause, affected file/line, and a fix suggestion."
            ),
            input_schema = {
                "type": "object",
                "properties": {
                    "tenant_token":  {"type": "string"},
                    "code":          {"type": "string", "description": "Source code or stack trace to analyze"},
                    "language":      {"type": "string", "description": "python | node | java | go | rust | generic"},
                    "context":       {"type": "string", "description": "Additional error context or description"},
                },
                "required": ["tenant_token", "code"],
            },
            handler = self._handle_analyze_code,
        )

        # ── propose_fix ───────────────────────────────────────────────────────
        self._tools["propose_fix"] = MCPTool(
            name         = "propose_fix",
            description  = (
                "Generate a code fix proposal from an error context. "
                "Returns original code, fixed code, explanation, diff, and confidence."
            ),
            input_schema = {
                "type": "object",
                "properties": {
                    "tenant_token":  {"type": "string"},
                    "error_type":    {"type": "string"},
                    "error_message": {"type": "string"},
                    "code_snippet":  {"type": "string"},
                    "language":      {"type": "string", "default": "generic"},
                    "root_cause":    {"type": "string", "description": "Optional: known root cause"},
                },
                "required": ["tenant_token", "error_type", "code_snippet"],
            },
            handler = self._handle_propose_fix,
        )

        # ── register_service ─────────────────────────────────────────────────
        self._tools["register_service"] = MCPTool(
            name         = "register_service",
            description  = "Register an external service for SAIB monitoring and auto-healing.",
            input_schema = {
                "type": "object",
                "properties": {
                    "tenant_token":  {"type": "string"},
                    "name":          {"type": "string", "description": "Service display name"},
                    "health_url":    {"type": "string", "description": "HTTP health check URL"},
                    "log_source":    {"type": "string", "description": "http_endpoint | docker | file | cloudwatch | syslog | kubernetes | loki | webhook"},
                    "stack_type":    {"type": "string", "description": "python | node | java | go | rust | generic"},
                    "criticality":   {"type": "number", "minimum": 0, "maximum": 1, "description": "0.0-1.0"},
                    "repo_url":      {"type": "string", "description": "Optional: GitHub/GitLab repo for fix PRs"},
                    "repo_token":    {"type": "string", "description": "Optional: PAT for PR creation"},
                },
                "required": ["tenant_token", "name", "health_url"],
            },
            handler = self._handle_register_service,
        )

        # ── deregister_service ───────────────────────────────────────────────
        self._tools["deregister_service"] = MCPTool(
            name         = "deregister_service",
            description  = "Remove a service from SAIB monitoring.",
            input_schema = {
                "type": "object",
                "properties": {
                    "tenant_token": {"type": "string"},
                    "service_id":   {"type": "string"},
                },
                "required": ["tenant_token", "service_id"],
            },
            handler = self._handle_deregister_service,
        )

        # ── list_services ────────────────────────────────────────────────────
        self._tools["list_services"] = MCPTool(
            name         = "list_services",
            description  = "List all services registered to your tenant.",
            input_schema = {
                "type": "object",
                "properties": {
                    "tenant_token": {"type": "string"},
                },
                "required": ["tenant_token"],
            },
            handler = self._handle_list_services,
        )

        # ── get_ecosystem_health ─────────────────────────────────────────────
        self._tools["get_ecosystem_health"] = MCPTool(
            name         = "get_ecosystem_health",
            description  = "Get full health status across all Triumph ecosystem services.",
            input_schema = {
                "type": "object",
                "properties": {
                    "tenant_token": {"type": "string"},
                },
                "required": ["tenant_token"],
            },
            handler = self._handle_ecosystem_health,
        )

        # ── run_heal_cycle ───────────────────────────────────────────────────
        self._tools["run_heal_cycle"] = MCPTool(
            name         = "run_heal_cycle",
            description  = "Trigger an immediate sovereign heal cycle across all monitored services.",
            input_schema = {
                "type": "object",
                "properties": {
                    "tenant_token": {"type": "string"},
                    "service_ids":  {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Optional: specific service IDs to heal (all if omitted)",
                    },
                },
                "required": ["tenant_token"],
            },
            handler = self._handle_run_heal_cycle,
        )

        # ── get_fix_proposals ────────────────────────────────────────────────
        self._tools["get_fix_proposals"] = MCPTool(
            name         = "get_fix_proposals",
            description  = "Retrieve recent fix proposals generated by SAIB for your services.",
            input_schema = {
                "type": "object",
                "properties": {
                    "tenant_token": {"type": "string"},
                    "limit":        {"type": "integer", "default": 10, "minimum": 1, "maximum": 50},
                },
                "required": ["tenant_token"],
            },
            handler = self._handle_get_fix_proposals,
        )

    # ── JSON-RPC dispatcher ───────────────────────────────────────────────────

    async def handle_request(self, body: dict) -> dict:
        """
        Main JSON-RPC 2.0 entry point.
        Dispatches to the appropriate MCP method handler.
        """
        req_id = body.get("id")
        method = body.get("method", "")
        params = body.get("params", {})

        try:
            if method == "initialize":
                return _ok(req_id, {
                    "protocolVersion":  MCP_VER,
                    "capabilities": {"tools": {"listChanged": False}},
                    "serverInfo": {"name": "saib-mcp", "version": "5.0.0"},
                })

            elif method == "tools/list":
                return _ok(req_id, {
                    "tools": [t.to_dict() for t in self._tools.values()]
                })

            elif method == "tools/call":
                name      = params.get("name", "")
                arguments = params.get("arguments", {})
                tool      = self._tools.get(name)
                if not tool:
                    return _err(req_id, ERR_METHOD_NOT_FOUND, f"Unknown tool: {name}")
                result = await tool.handler(arguments)
                return _ok(req_id, {"content": [{"type": "text", "text": result}]})

            elif method == "ping":
                return _ok(req_id, {})

            else:
                return _err(req_id, ERR_METHOD_NOT_FOUND, f"Method not found: {method}")

        except Exception as exc:
            log.error("MCP request error method=%s: %s", method, repr(exc))
            return _err(req_id, ERR_INTERNAL, "Internal SAIB error")

    def get_tools_manifest(self) -> dict:
        """Return MCP tools list for GET /mcp/tools/list discovery."""
        return {"tools": [t.to_dict() for t in self._tools.values()]}

    # ── tool handlers ─────────────────────────────────────────────────────────

    async def _handle_diagnose_service(self, args: dict) -> str:
        token      = args.get("tenant_token", "")
        service_id = args.get("service_id", "")
        tenant     = _verify_registry_token(token, self._registry)
        if not tenant:
            return "Unauthorized: invalid tenant token"
        spec = self._registry.get_service(service_id, tenant.tenant_id)
        if not spec:
            return f"Service not found: {service_id}"
        # ask healer for a targeted diagnosis
        if self._healer and hasattr(self._healer, "diagnose_single"):
            result = await self._healer.diagnose_single(spec)
            return json.dumps(result, indent=2, default=str)
        return json.dumps({
            "service_id":  service_id,
            "name":        spec.name,
            "health_url":  spec.health_url,
            "stack_type":  spec.stack_type,
            "criticality": spec.criticality,
            "note":        "Healer not available in this context — register via POST /v5/analyze/logs",
        }, indent=2)

    async def _handle_get_logs(self, args: dict) -> str:
        token      = args.get("tenant_token", "")
        service_id = args.get("service_id", "")
        tail       = int(args.get("tail", 50))
        level_flt  = args.get("level_filter", "all")
        tenant     = _verify_registry_token(token, self._registry)
        if not tenant:
            return "Unauthorized"
        events = self._registry.get_log_buffer(service_id, tenant.tenant_id, n=tail)
        if level_flt != "all":
            events = [e for e in events if e.get("level") == level_flt]
        return json.dumps(events, indent=2, default=str)

    async def _handle_analyze_code(self, args: dict) -> str:
        token   = args.get("tenant_token", "")
        code    = args.get("code", "")
        lang    = args.get("language", "generic")
        context = args.get("context", "")
        tenant  = _verify_registry_token(token, self._registry)
        if not tenant:
            return "Unauthorized"
        if not self._grok:
            return "Grok AI connector not available"
        prompt = (
            f"Analyze the following {lang} code / stack trace for bugs and errors.\n"
            f"Context: {context}\n\n"
            f"Code:\n{code[:3000]}\n\n"
            "Return: root_cause, affected_file_line, fix_suggestion, confidence (0-1)."
        )
        result = await self._grok.complete(prompt, temperature=0.3, max_tokens=800)
        return result.text if hasattr(result, "text") else str(result)

    async def _handle_propose_fix(self, args: dict) -> str:
        token      = args.get("tenant_token", "")
        tenant     = _verify_registry_token(token, self._registry)
        if not tenant:
            return "Unauthorized"
        if not self._grok:
            return "Grok AI connector not available"
        from .code_analyzer import CodeContext, StackFrame
        from .fix_engine    import generate_fix

        # build a minimal CodeContext from the provided args
        mock_frame = StackFrame(
            file   = "unknown",
            line   = 0,
            symbol = args.get("error_type", ""),
        )
        mock_ctx = CodeContext(
            service_id           = tenant.tenant_id,
            stack_frames         = [mock_frame],
            primary_frame        = mock_frame,
            file_path            = "unknown",
            start_line           = 0,
            end_line             = 0,
            language             = args.get("language", "generic"),
            snippet              = args.get("code_snippet", ""),
            error_type           = args.get("error_type", "unknown"),
            error_message        = args.get("error_message", ""),
            full_trace           = args.get("code_snippet", ""),
            grok_prompt_fragment = (
                f"Stack type: {args.get('language','generic')}\n"
                f"Error: {args.get('error_type','unknown')}: {args.get('error_message','')}\n"
                f"Code:\n{args.get('code_snippet','')[:2000]}"
            ),
        )
        fix = await generate_fix(
            grok       = self._grok,
            code_ctx   = mock_ctx,
            root_cause = args.get("root_cause", ""),
        )
        if not fix:
            return "Fix generation failed"
        self._fix_proposals.append({
            "id":           fix.id,
            "tenant_id":    tenant.tenant_id,
            "service_id":   fix.service_id,
            "error_type":   fix.error_type,
            "explanation":  fix.explanation,
            "confidence":   fix.confidence,
            "created_at":   fix.created_at,
        })
        return json.dumps({
            "fix_id":          fix.id,
            "original_code":   fix.original_code,
            "fixed_code":      fix.fixed_code,
            "explanation":     fix.explanation,
            "diff":            fix.diff,
            "confidence":      fix.confidence,
        }, indent=2)

    async def _handle_register_service(self, args: dict) -> str:
        token   = args.get("tenant_token", "")
        tenant  = _verify_registry_token(token, self._registry)
        if not tenant:
            return "Unauthorized"
        from .external_registry import LogSourceType, StackType
        try:
            spec = await self._registry.register(
                tenant_id    = tenant.tenant_id,
                name         = args["name"],
                health_url   = args["health_url"],
                log_source   = LogSourceType(args.get("log_source", "http_endpoint")),
                stack_type   = StackType(args.get("stack_type", "generic")),
                criticality  = float(args.get("criticality", 0.5)),
                repo_url     = args.get("repo_url", ""),
                repo_token   = args.get("repo_token", ""),
            )
            return json.dumps({
                "service_id":     spec.service_id,
                "name":           spec.name,
                "webhook_secret": spec.webhook_secret,
                "log_push_url":   f"/v5/logs/ingest?service_id={spec.service_id}",
                "note":           "Push logs to log_push_url with X-SAIB-Signature header",
            }, indent=2)
        except ValueError as e:
            return f"Registration failed: {e}"

    async def _handle_deregister_service(self, args: dict) -> str:
        token      = args.get("tenant_token", "")
        service_id = args.get("service_id", "")
        tenant     = _verify_registry_token(token, self._registry)
        if not tenant:
            return "Unauthorized"
        ok = self._registry.deregister(service_id, tenant.tenant_id)
        return "deregistered" if ok else "not found or not owned by this tenant"

    async def _handle_list_services(self, args: dict) -> str:
        token  = args.get("tenant_token", "")
        tenant = _verify_registry_token(token, self._registry)
        if not tenant:
            return "Unauthorized"
        svcs = self._registry.list_services(tenant.tenant_id)
        return json.dumps([
            {
                "service_id": s.service_id,
                "name":       s.name,
                "health_url": s.health_url,
                "stack_type": s.stack_type,
                "criticality": s.criticality,
                "registered_at": s.registered_at,
            }
            for s in svcs
        ], indent=2, default=str)

    async def _handle_ecosystem_health(self, args: dict) -> str:
        token  = args.get("tenant_token", "")
        tenant = _verify_registry_token(token, self._registry)
        if not tenant:
            return "Unauthorized"
        stats = self._registry.stats()
        return json.dumps({
            "saib_version":   "5.0.0",
            "registry_stats": stats,
            "timestamp":      time.time(),
            "note":           "For full Triumph ecosystem health, call GET /health/deep",
        }, indent=2)

    async def _handle_run_heal_cycle(self, args: dict) -> str:
        token  = args.get("tenant_token", "")
        tenant = _verify_registry_token(token, self._registry)
        if not tenant:
            return "Unauthorized"
        if self._healer and hasattr(self._healer, "trigger_once"):
            await self._healer.trigger_once()
            return "Heal cycle triggered"
        return "Heal cycle queued (healer will process on next interval)"

    async def _handle_get_fix_proposals(self, args: dict) -> str:
        token  = args.get("tenant_token", "")
        limit  = int(args.get("limit", 10))
        tenant = _verify_registry_token(token, self._registry)
        if not tenant:
            return "Unauthorized"
        proposals = [
            p for p in self._fix_proposals
            if p["tenant_id"] == tenant.tenant_id
        ][-limit:]
        return json.dumps(proposals, indent=2, default=str)


# ── helpers ──────────────────────────────────────────────────────────────────

def _ok(req_id: Any, result: dict) -> dict:
    return {"jsonrpc": JSONRPC, "id": req_id, "result": result}


def _err(req_id: Any, code: int, message: str) -> dict:
    return {
        "jsonrpc": JSONRPC,
        "id":      req_id,
        "error":   {"code": code, "message": message},
    }


def _verify_registry_token(raw_token: str, registry: Any) -> Any:
    """Verify a raw tenant token against the registry. Returns TenantToken or None."""
    if not registry:
        return None
    return registry.verify_token(raw_token)


# ── singleton ─────────────────────────────────────────────────────────────────
mcp_server = SAIBMCPServer()
