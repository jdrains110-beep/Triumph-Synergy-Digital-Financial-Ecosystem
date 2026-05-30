"""
External Log Ingestion Engine — SAIB v5
──────────────────────────────────────────────────────────────────────────────
Pulls or receives log streams from any external system and normalises them into
a unified event model for the Sovereign Healer and Code Analyzer.

Adapters
────────
  HTTP_ENDPOINT — GET /logs or /metrics from any URL with custom auth headers
  DOCKER        — Docker socket container log pull (existing Triumph services)
  FILE          — Tail a mounted log file path
  CLOUDWATCH    — AWS CloudWatch Logs GetLogEvents (requires boto3 creds)
  SYSLOG        — UDP/TCP syslog RFC5424/RFC3164 receiver on port 9514
  KUBERNETES    — kubectl logs via K8s API server
  LOKI          — Grafana Loki query API (/loki/api/v1/query_range)
  DATADOG       — Datadog Logs API v2 list endpoint
  WEBHOOK       — Push model: events arrive via POST (handled by registry)
  CUSTOM        — Arbitrary URL with configurable method, headers, JSONPath

All adapters produce a unified NormalisedLogEvent stream consumed by the
healer's _collect_layers_v5() method.
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import socketserver
import threading
import time
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional

import aiohttp

log = logging.getLogger("saib.log_ingestion")


# ── unified event model ──────────────────────────────────────────────────────

@dataclass
class NormalisedLogEvent:
    service_id: str
    ts:         float
    level:      str           # error | warn | info | debug | unknown
    message:    str
    stack_trace: str = ""     # extracted stack trace if present
    file_ref:    str = ""     # "filename.py:42" if parseable
    raw:         str = ""     # original log line


# ── level normalisation map ──────────────────────────────────────────────────
_LEVEL_MAP = {
    "error": "error", "err": "error", "critical": "error", "fatal": "error",
    "crit": "error", "emerg": "error", "alert": "error",
    "warning": "warn", "warn": "warn",
    "info": "info", "information": "info", "notice": "info",
    "debug": "debug", "trace": "debug", "verbose": "debug",
}


def _norm_level(raw: str) -> str:
    return _LEVEL_MAP.get(raw.lower().strip(), "unknown")


# ── HTTP adapter ─────────────────────────────────────────────────────────────

async def pull_http_logs(
    service_id: str,
    url: str,
    headers: Optional[Dict[str, str]] = None,
    jsonpath: str = "",        # dot-path to log array in response, e.g. "data.logs"
    tail: int = 100,
    timeout_s: float = 10.0,
) -> List[NormalisedLogEvent]:
    events: List[NormalisedLogEvent] = []
    try:
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=timeout_s)) as sess:
            async with sess.get(url, headers=headers or {}) as resp:
                if resp.status != 200:
                    return events
                body = await resp.text()
                # try JSON
                try:
                    data = json.loads(body)
                    # navigate jsonpath
                    if jsonpath:
                        for key in jsonpath.split("."):
                            if isinstance(data, dict):
                                data = data.get(key, [])
                    if isinstance(data, list):
                        for item in data[-tail:]:
                            if isinstance(item, str):
                                events.append(_line_to_event(service_id, item))
                            elif isinstance(item, dict):
                                events.append(_dict_to_event(service_id, item))
                    else:
                        # treat whole body as plain text
                        for line in body.splitlines()[-tail:]:
                            events.append(_line_to_event(service_id, line))
                except json.JSONDecodeError:
                    for line in body.splitlines()[-tail:]:
                        events.append(_line_to_event(service_id, line))
    except Exception as exc:
        log.debug("HTTP log pull %s: %s", url, exc)
    return events


# ── Docker socket adapter ────────────────────────────────────────────────────

async def pull_docker_logs(
    service_id:      str,
    container_name:  str,
    tail:            int = 100,
    docker_socket:   str = "/var/run/docker.sock",
) -> List[NormalisedLogEvent]:
    events: List[NormalisedLogEvent] = []
    if not os.path.exists(docker_socket):
        return events
    try:
        connector = aiohttp.UnixConnector(path=docker_socket)
        async with aiohttp.ClientSession(
            connector=connector,
            timeout=aiohttp.ClientTimeout(total=8),
        ) as sess:
            url = (
                f"http://localhost/containers/{container_name}"
                f"/logs?stdout=1&stderr=1&tail={tail}&timestamps=1"
            )
            async with sess.get(url) as resp:
                if resp.status != 200:
                    return events
                raw = await resp.read()
                lines = _decode_docker_stream(raw)
                for line in lines:
                    events.append(_line_to_event(service_id, line))
    except Exception as exc:
        log.debug("Docker log pull %s: %s", container_name, exc)
    return events


# ── File tail adapter ────────────────────────────────────────────────────────

async def pull_file_logs(
    service_id: str,
    file_path:  str,
    tail:       int = 200,
) -> List[NormalisedLogEvent]:
    events: List[NormalisedLogEvent] = []
    if not os.path.exists(file_path):
        return events
    try:
        loop = asyncio.get_event_loop()

        def _read() -> List[str]:
            with open(file_path, "r", errors="replace") as f:
                lines = f.readlines()
            return [l.rstrip() for l in lines[-tail:]]

        lines = await loop.run_in_executor(None, _read)
        for line in lines:
            events.append(_line_to_event(service_id, line))
    except Exception as exc:
        log.debug("File log pull %s: %s", file_path, exc)
    return events


# ── Loki adapter ─────────────────────────────────────────────────────────────

async def pull_loki_logs(
    service_id:   str,
    loki_url:     str,          # e.g. http://loki:3100
    query:        str,          # LogQL query e.g. '{app="myservice"}'
    minutes_back: int   = 30,
    limit:        int   = 200,
    headers:      Optional[Dict[str, str]] = None,
) -> List[NormalisedLogEvent]:
    events: List[NormalisedLogEvent] = []
    now_ns    = int(time.time() * 1e9)
    start_ns  = int((time.time() - minutes_back * 60) * 1e9)
    params    = {
        "query": query,
        "start": str(start_ns),
        "end":   str(now_ns),
        "limit": str(limit),
        "direction": "backward",
    }
    try:
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=10)) as sess:
            async with sess.get(
                f"{loki_url}/loki/api/v1/query_range",
                params=params,
                headers=headers or {},
            ) as resp:
                if resp.status != 200:
                    return events
                data = await resp.json()
                for stream in data.get("data", {}).get("result", []):
                    for ts_ns, line in stream.get("values", []):
                        ev = _line_to_event(service_id, line)
                        ev.ts = int(ts_ns) / 1e9
                        events.append(ev)
    except Exception as exc:
        log.debug("Loki pull: %s", exc)
    return events


# ── Kubernetes adapter ───────────────────────────────────────────────────────

async def pull_k8s_logs(
    service_id:   str,
    api_server:   str,          # e.g. https://kubernetes.default.svc
    namespace:    str,
    pod_label:    str,          # e.g. "app=myservice"
    token:        str,          # Bearer token
    tail:         int = 200,
    container:    str = "",
) -> List[NormalisedLogEvent]:
    events: List[NormalisedLogEvent] = []
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
    }
    try:
        async with aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=15),
            connector=aiohttp.TCPConnector(ssl=False),  # skip TLS verify in-cluster
        ) as sess:
            # list pods matching label
            pods_url = (
                f"{api_server}/api/v1/namespaces/{namespace}/pods"
                f"?labelSelector={pod_label}"
            )
            async with sess.get(pods_url, headers=headers) as resp:
                if resp.status != 200:
                    return events
                pod_data = await resp.json()
                pods = [
                    item["metadata"]["name"]
                    for item in pod_data.get("items", [])
                ][:3]  # check up to 3 pods

            for pod in pods:
                log_url = (
                    f"{api_server}/api/v1/namespaces/{namespace}"
                    f"/pods/{pod}/log?tailLines={tail}"
                    + (f"&container={container}" if container else "")
                )
                async with sess.get(log_url, headers=headers) as resp:
                    if resp.status == 200:
                        text = await resp.text()
                        for line in text.splitlines():
                            ev = _line_to_event(service_id, line)
                            events.append(ev)
    except Exception as exc:
        log.debug("K8s log pull ns=%s label=%s: %s", namespace, pod_label, exc)
    return events


# ── Syslog receiver ──────────────────────────────────────────────────────────

class _SyslogHandler(socketserver.BaseRequestHandler):
    def handle(self) -> None:
        data = self.request[0].strip()
        try:
            line = data.decode("utf-8", errors="replace")
        except Exception:
            return
        # push into the shared buffer
        _syslog_buffer.append(line)
        if len(_syslog_buffer) > 2000:
            del _syslog_buffer[:-2000]


_syslog_buffer: List[str] = []
_syslog_server: Optional[socketserver.UDPServer] = None


def start_syslog_receiver(port: int = 9514) -> None:
    """Start a UDP syslog receiver on the given port (background thread)."""
    global _syslog_server
    try:
        _syslog_server = socketserver.UDPServer(("0.0.0.0", port), _SyslogHandler)
        t = threading.Thread(target=_syslog_server.serve_forever, daemon=True)
        t.start()
        log.info("Syslog receiver: UDP port %d ready", port)
    except Exception as exc:
        log.warning("Syslog receiver failed to start: %s", exc)


def drain_syslog_buffer(service_id: str, n: int = 200) -> List[NormalisedLogEvent]:
    events = []
    batch = _syslog_buffer[-n:]
    for line in batch:
        events.append(_line_to_event(service_id, line))
    return events


# ── unified pull dispatcher ───────────────────────────────────────────────────

async def pull_logs_for_service(
    spec: Any,  # ExternalServiceSpec from external_registry
    tail: int = 200,
) -> List[NormalisedLogEvent]:
    """
    Dispatch log pull to the correct adapter based on spec.log_source.
    Returns a normalised list of events.
    """
    from .external_registry import LogSourceType
    sid = spec.service_id
    cfg = spec.log_config or {}
    src = spec.log_source

    if src == LogSourceType.HTTP_ENDPOINT:
        return await pull_http_logs(
            service_id = sid,
            url        = cfg.get("url", spec.health_url),
            headers    = cfg.get("headers"),
            jsonpath   = cfg.get("jsonpath", ""),
            tail       = tail,
        )

    elif src == LogSourceType.DOCKER:
        return await pull_docker_logs(
            service_id     = sid,
            container_name = cfg.get("container", spec.name),
            tail           = tail,
        )

    elif src == LogSourceType.FILE:
        return await pull_file_logs(
            service_id = sid,
            file_path  = cfg.get("path", ""),
            tail       = tail,
        )

    elif src == LogSourceType.LOKI:
        return await pull_loki_logs(
            service_id   = sid,
            loki_url     = cfg.get("loki_url", "http://loki:3100"),
            query        = cfg.get("query", f'{{service="{spec.name}"}}'),
            minutes_back = int(cfg.get("minutes_back", 30)),
            limit        = tail,
            headers      = cfg.get("headers"),
        )

    elif src == LogSourceType.KUBERNETES:
        return await pull_k8s_logs(
            service_id  = sid,
            api_server  = cfg.get("api_server", "https://kubernetes.default.svc"),
            namespace   = spec.k8s_namespace or cfg.get("namespace", "default"),
            pod_label   = spec.k8s_label or cfg.get("label", f"app={spec.name}"),
            token       = cfg.get("token", ""),
            tail        = tail,
            container   = cfg.get("container", ""),
        )

    elif src == LogSourceType.SYSLOG:
        return drain_syslog_buffer(sid, n=tail)

    elif src == LogSourceType.WEBHOOK:
        # webhook events arrive via push — return the buffer from registry
        from .external_registry import external_registry
        raw = external_registry.get_log_buffer(sid, spec.tenant_id, n=tail)
        return [
            NormalisedLogEvent(
                service_id  = sid,
                ts          = e["ts"],
                level       = _norm_level(e.get("level", "info")),
                message     = e["message"],
            )
            for e in raw
        ]

    elif src == LogSourceType.CUSTOM:
        return await pull_http_logs(
            service_id = sid,
            url        = cfg.get("url", spec.health_url),
            headers    = cfg.get("headers"),
            jsonpath   = cfg.get("jsonpath", ""),
            tail       = tail,
        )

    return []


# ── internal helpers ──────────────────────────────────────────────────────────

def _decode_docker_stream(raw: bytes) -> List[str]:
    """Strip Docker multiplexed stream 8-byte frame headers."""
    lines = []
    offset = 0
    while offset < len(raw):
        if offset + 8 > len(raw):
            break
        size = int.from_bytes(raw[offset + 4:offset + 8], "big")
        offset += 8
        if size > 0 and offset + size <= len(raw):
            lines.append(raw[offset:offset + size].decode("utf-8", errors="replace").rstrip())
        offset += size
    return lines


def _line_to_event(service_id: str, line: str) -> NormalisedLogEvent:
    """Parse a raw log line into a NormalisedLogEvent."""
    line = line.strip()
    if not line:
        return NormalisedLogEvent(service_id=service_id, ts=time.time(),
                                  level="info", message="", raw=line)
    # try JSON
    if line.startswith("{"):
        try:
            return _dict_to_event(service_id, json.loads(line))
        except json.JSONDecodeError:
            pass

    # detect level from common patterns
    level = "info"
    ul = line.upper()
    for kw in ("CRITICAL", "FATAL", "ERROR", "WARN", "WARNING", "DEBUG", "INFO", "TRACE"):
        if kw in ul:
            level = _norm_level(kw)
            break

    # extract file ref (e.g.  File "foo.py", line 42)
    file_ref = ""
    m = re.search(r'(?:File\s+"(.+?)",\s+line\s+(\d+)|(\w+\.\w+):(\d+))', line)
    if m:
        if m.group(1):
            file_ref = f"{m.group(1)}:{m.group(2)}"
        else:
            file_ref = f"{m.group(3)}:{m.group(4)}"

    return NormalisedLogEvent(
        service_id  = service_id,
        ts          = time.time(),
        level       = level,
        message     = line,
        file_ref    = file_ref,
        raw         = line,
    )


def _dict_to_event(service_id: str, d: dict) -> NormalisedLogEvent:
    """Convert a structured JSON log dict to a NormalisedLogEvent."""
    msg = (
        d.get("message") or d.get("msg") or d.get("text") or
        d.get("log") or d.get("body") or str(d)
    )
    raw_level = (
        d.get("level") or d.get("severity") or d.get("lvl") or "info"
    )
    ts = (
        d.get("ts") or d.get("time") or d.get("timestamp") or time.time()
    )
    if isinstance(ts, str):
        try:
            import datetime
            ts = datetime.datetime.fromisoformat(ts.replace("Z", "+00:00")).timestamp()
        except Exception:
            ts = time.time()
    return NormalisedLogEvent(
        service_id = service_id,
        ts         = float(ts),
        level      = _norm_level(str(raw_level)),
        message    = str(msg)[:1000],
        raw        = json.dumps(d)[:500],
    )
