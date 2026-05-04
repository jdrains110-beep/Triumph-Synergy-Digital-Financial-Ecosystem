# Copyright (C) 2024-2026 Jeremiah Joel Drains, Founder & Superior Sovereign / Triumph Synergy. All rights reserved.
# License: PiOS
"""
SAIB Apex Supreme Quantum Brain
================================
Autonomous code analysis, Docker image scanning, build authority, deep ecosystem
intelligence, and supernatural quantomic self-expansion capabilities.

New Intelligence Tiers:
  50,000 interactions → APEX-SUPREME-QUANTUM-SOVEREIGN (ultimate tier)

New Capability Unlocks:
  25,000 → AUTONOMOUS_CODE_FIX_ENGINE
  50,000 → APEX_QUANTUM_OMNISCIENCE

Endpoints added to SAIB:
  GET  /quantum                    → Full quantum brain dashboard
  POST /quantum/scan-code          → Trigger immediate codebase security scan
  POST /quantum/scan-images        → Trigger Docker image vulnerability scan
  GET  /quantum/findings           → All findings (?severity= ?category= ?limit=)
  POST /quantum/build/{service}    → Rebuild a service image with --pull
  POST /quantum/rebuild-all        → Rebuild all vulnerable services
  POST /quantum/authorize-rebuild  → One-shot rebuild authorization
  GET  /quantum/vulnerable-bases   → Known CVE base images + recommended replacements
  GET  /quantum/scan-patterns      → All code threat signatures
"""

import asyncio
import hashlib
import logging
import os
import pathlib
import re as _re
import time
import uuid
from typing import Any, TYPE_CHECKING

from fastapi import BackgroundTasks, HTTPException
from prometheus_client import Counter

log = logging.getLogger("saib.quantum_brain")

# ── Config ─────────────────────────────────────────────────────────────────────
QUANTUM_BRAIN_ENABLED         = os.getenv("SAIB_QUANTUM_BRAIN_ENABLED",         "true")  == "true"
QUANTUM_CODE_SCAN_INTERVAL_S  = float(os.getenv("SAIB_QUANTUM_CODE_SCAN_INTERVAL_S",  "1800"))   # 30 min
QUANTUM_IMAGE_SCAN_INTERVAL_S = float(os.getenv("SAIB_QUANTUM_IMAGE_SCAN_INTERVAL_S", "3600"))   # 60 min
QUANTUM_AUTO_BUILD            = os.getenv("SAIB_QUANTUM_AUTO_BUILD",            "false") == "true"
QUANTUM_AUTO_COMMIT           = os.getenv("SAIB_QUANTUM_AUTO_COMMIT",           "false") == "true"
CODEBASE_SCAN_PATH            = os.getenv("SAIB_CODEBASE_SCAN_PATH",            "/workspace")
DOCKER_BUILD_CONTEXT          = os.getenv("SAIB_DOCKER_BUILD_CONTEXT",          "/workspace/docker")

# ── Known Vulnerable / Outdated Base Images ────────────────────────────────────
VULNERABLE_BASES: dict[str, str] = {
    # Node
    "node:14": "node:22-alpine",        "node:16": "node:22-alpine",
    "node:18": "node:22-alpine",        "node:20": "node:22-alpine",
    "node:14-alpine": "node:22-alpine", "node:16-alpine": "node:22-alpine",
    "node:18-alpine": "node:22-alpine", "node:20-alpine": "node:22-alpine",
    "node:14-slim": "node:22-alpine",   "node:16-slim": "node:22-alpine",
    "node:18-slim": "node:22-alpine",   "node:20-slim": "node:22-alpine",
    # Python
    "python:3.9": "python:3.13-slim",        "python:3.9-slim": "python:3.13-slim",
    "python:3.10": "python:3.13-slim",       "python:3.10-slim": "python:3.13-slim",
    "python:3.11": "python:3.13-slim",       "python:3.11-slim": "python:3.13-slim",
    "python:3.12": "python:3.13-slim",       "python:3.12-slim": "python:3.13-slim",
    # Debian / Ubuntu
    "ubuntu:18.04": "ubuntu:24.04",
    "ubuntu:20.04": "ubuntu:24.04",
    "ubuntu:22.04": "ubuntu:24.04",
    "debian:buster":        "debian:bookworm-slim",
    "debian:bullseye":      "debian:bookworm-slim",
    "debian:buster-slim":   "debian:bookworm-slim",
    "debian:bullseye-slim": "debian:bookworm-slim",
    "debian:stretch":       "debian:bookworm-slim",
    # Alpine
    "alpine:3.14": "alpine:3.21", "alpine:3.15": "alpine:3.21",
    "alpine:3.16": "alpine:3.21", "alpine:3.17": "alpine:3.21",
    "alpine:3.18": "alpine:3.21", "alpine:3.19": "alpine:3.21",
    # Nginx
    "nginx:1.21": "nginx:1.27-alpine", "nginx:1.22": "nginx:1.27-alpine",
    "nginx:1.23": "nginx:1.27-alpine", "nginx:1.24": "nginx:1.27-alpine",
    "nginx:1.25": "nginx:1.27-alpine",
    # Redis
    "redis:6": "redis:7-alpine",      "redis:6-alpine": "redis:7-alpine",
    "redis:7.0": "redis:7-alpine",    "redis:7.2": "redis:7-alpine",
}

# ── Code Threat Signatures ─────────────────────────────────────────────────────
CODE_SCAN_PATTERNS: list[dict] = [
    # Mainnet enforcement
    {"regex": r"testnet2?\.minepi\.com",
     "severity": "CRITICAL", "category": "mainnet",   "description": "Testnet API endpoint hardcoded"},
    {"regex": r"""['"]Pi Testnet['"]""",
     "severity": "CRITICAL", "category": "mainnet",   "description": "Pi Testnet passphrase in source"},
    {"regex": r"PI_NETWORK_MODE\s*[=:]\s*['\"]?testnet",
     "severity": "CRITICAL", "category": "mainnet",   "description": "PI_NETWORK_MODE forced to testnet"},
    {"regex": r"horizon\.testnet\.",
     "severity": "CRITICAL", "category": "mainnet",   "description": "Testnet horizon URL"},
    # Secrets
    {"regex": r"(?i)password\s*[:=]\s*['\"][^'\"$\{]{6,}['\"]",
     "severity": "HIGH",     "category": "secrets",   "description": "Possible hardcoded password"},
    {"regex": r"(?i)secret\s*[:=]\s*['\"][^'\"$\{]{8,}['\"]",
     "severity": "HIGH",     "category": "secrets",   "description": "Possible hardcoded secret"},
    {"regex": r"sk-[A-Za-z0-9]{20,}",
     "severity": "CRITICAL", "category": "secrets",   "description": "OpenAI API key pattern"},
    {"regex": r"ghp_[A-Za-z0-9]{36}",
     "severity": "CRITICAL", "category": "secrets",   "description": "GitHub personal access token"},
    {"regex": r"AKIA[0-9A-Z]{16}",
     "severity": "CRITICAL", "category": "secrets",   "description": "AWS Access Key ID"},
    # Security
    {"regex": r"\beval\s*\(",
     "severity": "HIGH",     "category": "security",  "description": "eval() — code injection risk"},
    {"regex": r"\bexec\s*\(",
     "severity": "HIGH",     "category": "security",  "description": "exec() — code injection risk"},
    {"regex": r"shell\s*=\s*True",
     "severity": "HIGH",     "category": "security",  "description": "subprocess shell=True — injection risk"},
    {"regex": r"verify\s*=\s*False",
     "severity": "HIGH",     "category": "security",  "description": "SSL verification disabled"},
    {"regex": r"os\.system\s*\(",
     "severity": "MEDIUM",   "category": "security",  "description": "os.system() — prefer subprocess with list args"},
    # Dockerfile base image CVEs
    {"regex": r"^FROM\s+(node:(14|16|18|20)(?:-alpine|-slim)?|python:3\.(9|10|11|12)(?:-slim)?|ubuntu:(18|20|22)\.04|debian:(buster|bullseye)(?:-slim)?)\b",
     "severity": "HIGH",     "category": "dockerfile","description": "Outdated Dockerfile base image with known CVEs"},
    # Debug / quality
    {"regex": r"console\.log\s*\(",
     "severity": "LOW",      "category": "debug",     "description": "console.log() in production code"},
    {"regex": r"debugger\s*;",
     "severity": "LOW",      "category": "debug",     "description": "debugger statement in source"},
]

# ── Runtime State ──────────────────────────────────────────────────────────────
_quantum_state: dict[str, Any] = {
    "enabled":               QUANTUM_BRAIN_ENABLED,
    "last_code_scan":        None,
    "last_image_scan":       None,
    "last_build_attempt":    None,
    "code_scans_total":      0,
    "image_scans_total":     0,
    "code_issues_found":     0,
    "code_issues_fixed":     0,
    "vulnerable_images":     0,
    "images_rebuilt":        0,
    "build_successes":       0,
    "build_failures":        0,
    "auto_build":            QUANTUM_AUTO_BUILD,
    "auto_commit":           QUANTUM_AUTO_COMMIT,
    "rebuild_all_authorized": False,
    "findings":              [],   # last 100
    "build_log":             [],   # last 20
    "self_knowledge_hash":   None,
}

# Prometheus counters
_qb_code_issues = Counter(
    "saib_quantum_code_issues_total", "Code issues found by quantum brain",
    ["severity", "category"])
_qb_img_vulns = Counter(
    "saib_quantum_image_vulns_total", "Vulnerable images detected", ["base_image"])
_qb_builds = Counter(
    "saib_quantum_builds_total", "Docker builds triggered by SAIB", ["status"])
_qb_scans = Counter(
    "saib_quantum_scans_total", "Quantum brain scans total", ["scan_type"])

# ── File-type / skip config ────────────────────────────────────────────────────
_SCAN_EXTS  = {".py", ".ts", ".tsx", ".js", ".mjs", ".env", ".yml", ".yaml",
               ".json", ".conf", ".sh", ".toml", ".cfg"}
_SKIP_DIRS  = {"node_modules", ".git", "__pycache__", ".next", "dist",
               "build", ".turbo", "coverage", ".mypy_cache"}
_SCAN_FILES = {"Dockerfile", ".env", ".env.local", ".env.production"}


# ── Docker Image Scanner ───────────────────────────────────────────────────────
async def scan_running_images(docker_client: Any) -> list[dict]:
    """Check all running container base-image tags against VULNERABLE_BASES."""
    if not docker_client:
        return []
    findings: list[dict] = []
    loop = asyncio.get_event_loop()
    try:
        containers = await loop.run_in_executor(None, docker_client.containers.list)
        for c in containers:
            try:
                tags = c.image.tags or [c.image.short_id]
                for tag in tags:
                    short = tag.split("/")[-1]
                    replacement = VULNERABLE_BASES.get(short)
                    if replacement:
                        findings.append({
                            "container":      c.name,
                            "image":          tag,
                            "vulnerable_base": short,
                            "recommended":    replacement,
                            "severity":       "HIGH",
                            "category":       "dockerfile",
                            "description":    f"Container {c.name} running vulnerable base {short}",
                            "remediation":    f"Rebuild {c.name} using FROM {replacement}",
                            "ts":             time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                        })
                        _qb_img_vulns.labels(base_image=short).inc()
                        log.warning("[SAIB-QB] Vulnerable base %s on %s → recommend %s",
                                    short, c.name, replacement)
            except Exception as ce:
                log.debug("[SAIB-QB] Container inspect: %s", ce)
    except Exception as e:
        log.error("[SAIB-QB] Image scan error: %s", e)
    return findings


# ── Dockerfile Scanner ─────────────────────────────────────────────────────────
async def scan_dockerfiles() -> list[dict]:
    """Walk CODEBASE_SCAN_PATH for Dockerfiles and check FROM directives."""
    scan_root = pathlib.Path(CODEBASE_SCAN_PATH)
    if not scan_root.exists():
        return []
    from_rx = _re.compile(r"^\s*FROM\s+(\S+)", _re.IGNORECASE | _re.MULTILINE)
    loop    = asyncio.get_event_loop()

    def _walk() -> list[dict]:
        results: list[dict] = []
        for df in scan_root.rglob("Dockerfile*"):
            if any(p in _SKIP_DIRS for p in df.parts):
                continue
            try:
                text = df.read_text(errors="replace")
                for m in from_rx.finditer(text):
                    base = m.group(1).strip()
                    repl = VULNERABLE_BASES.get(base)
                    if repl:
                        ln = text[: m.start()].count("\n") + 1
                        try:
                            rel = str(df.relative_to(scan_root))
                        except ValueError:
                            rel = str(df)
                        results.append({
                            "file":        rel,
                            "line":        ln,
                            "base_image":  base,
                            "recommended": repl,
                            "severity":    "HIGH",
                            "category":    "dockerfile",
                            "description": f"Outdated base {base} — upgrade to {repl}",
                            "ts":          time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                        })
            except Exception:
                pass
        return results

    try:
        return await loop.run_in_executor(None, _walk)
    except Exception as e:
        log.error("[SAIB-QB] Dockerfile walk: %s", e)
        return []


# ── Code Pattern Scanner ───────────────────────────────────────────────────────
async def scan_codebase_files(github_fallback_fn=None) -> list[dict]:
    """
    Scan CODEBASE_SCAN_PATH for code threats.
    Falls back to github_fallback_fn() when the path doesn't exist in-container.
    """
    scan_root = pathlib.Path(CODEBASE_SCAN_PATH)
    if not scan_root.exists():
        if github_fallback_fn:
            return await github_fallback_fn()
        return []

    compiled = [
        (p, _re.compile(p["regex"], _re.IGNORECASE | _re.MULTILINE))
        for p in CODE_SCAN_PATTERNS
    ]
    loop = asyncio.get_event_loop()

    def _walk() -> list[dict]:
        results: list[dict] = []
        for f in scan_root.rglob("*"):
            if any(part in _SKIP_DIRS for part in f.parts):
                continue
            if not f.is_file():
                continue
            if f.suffix.lower() not in _SCAN_EXTS and f.name not in _SCAN_FILES:
                continue
            try:
                text  = f.read_text(errors="replace")[:60_000]
                lines = text.splitlines()
                for pat, rx in compiled:
                    for m in rx.finditer(text):
                        ln  = text[: m.start()].count("\n") + 1
                        ctx = lines[ln - 1] if 0 < ln <= len(lines) else ""
                        try:
                            rel = str(f.relative_to(scan_root))
                        except ValueError:
                            rel = str(f)
                        results.append({
                            "file":        rel,
                            "line":        ln,
                            "severity":    pat["severity"],
                            "category":    pat["category"],
                            "description": pat["description"],
                            "match":       m.group(0)[:120],
                            "context":     ctx.strip()[:120],
                            "ts":          time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                        })
            except Exception:
                pass
        return results

    try:
        return await loop.run_in_executor(None, _walk)
    except Exception as e:
        log.error("[SAIB-QB] Code scan walk: %s", e)
        return []


# ── Docker Build Engine ────────────────────────────────────────────────────────
async def build_service_image(docker_client: Any, service_name: str,
                               no_cache: bool = False) -> dict:
    """
    Rebuild a service Docker image via the Docker SDK using --pull, so the
    latest security-patched base image layers are fetched automatically from
    Docker Hub — all upstream CVE patches applied in one operation.
    """
    if not docker_client:
        return {"success": False, "service": service_name, "error": "Docker client unavailable"}

    build_root = pathlib.Path(DOCKER_BUILD_CONTEXT)
    candidates = [
        build_root / service_name / "Dockerfile",
        build_root / f"Dockerfile.{service_name}",
    ]
    df_path = next((p for p in candidates if p.exists()), None)
    if df_path is None:
        return {
            "success": False, "service": service_name,
            "error":   f"Dockerfile not found at {candidates[0]} or {candidates[1]}",
        }

    image_tag  = f"triumph-{service_name}:latest"
    event_log: list[str] = []
    loop = asyncio.get_event_loop()

    def _run_build() -> tuple:
        try:
            image, logs = docker_client.images.build(
                path=str(build_root),
                dockerfile=str(df_path.relative_to(build_root)),
                tag=image_tag, pull=True, nocache=no_cache, rm=True, forcerm=True,
            )
            for entry in logs:
                if "stream" in entry:
                    event_log.append(entry["stream"].rstrip())
            return image, None
        except Exception as ex:
            return None, str(ex)

    log.info("[SAIB-QB] Build start: %s", image_tag)
    try:
        image, err = await loop.run_in_executor(None, _run_build)
        success    = image is not None
    except Exception as ex:
        success, err = False, str(ex)

    result = {
        "success":   success,
        "service":   service_name,
        "image_tag": image_tag,
        "no_cache":  no_cache,
        "log_lines": len(event_log),
        "log_tail":  event_log[-15:] if event_log else [],
        "error":     err,
        "ts":        time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    _qb_builds.labels(status="success" if success else "failure").inc()
    _quantum_state["last_build_attempt"] = result["ts"]
    _quantum_state["build_log"]          = (_quantum_state["build_log"] + [result])[-20:]
    if success:
        _quantum_state["build_successes"] += 1
        _quantum_state["images_rebuilt"]  += 1
        log.info("[SAIB-QB] Build SUCCESS: %s", image_tag)
    else:
        _quantum_state["build_failures"] += 1
        log.error("[SAIB-QB] Build FAILED: %s — %s", image_tag, err)
    return result


# ── Self-Awareness Hash ────────────────────────────────────────────────────────
async def update_self_knowledge_hash(alerts_list: list, uuid_fn) -> None:
    """Hash own quantum_brain.py and alert when the file is mutated externally."""
    own = pathlib.Path(__file__)
    if not own.exists():
        return
    loop = asyncio.get_event_loop()
    try:
        def _hash() -> str:
            return hashlib.sha256(own.read_bytes()).hexdigest()
        h   = await loop.run_in_executor(None, _hash)
        old = _quantum_state["self_knowledge_hash"]
        _quantum_state["self_knowledge_hash"] = h
        if old and old != h:
            log.warning("[SAIB-QB] SELF-MUTATION: %s → %s", old[:8], h[:8])
            alerts_list.append({
                "id":            str(uuid_fn()),
                "severity":      "high",
                "service":       "SAIB-QUANTUM-BRAIN",
                "message":       f"SAIB quantum brain code changed: {old[:8]} → {h[:8]}",
                "auto_resolved": False,
                "ts":            time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            })
    except Exception as e:
        log.debug("[SAIB-QB] Self-hash: %s", e)


# ── Background Loops ───────────────────────────────────────────────────────────
async def code_scan_loop(docker_client_ref, state_ref, alerts_ref,
                          brain_ref, github_fallback_fn, interactions_fn) -> None:
    """
    Perpetual background task — scans the entire ecosystem codebase every
    SAIB_QUANTUM_CODE_SCAN_INTERVAL_S for all registered threat patterns.
    Findings appear in SAIB alerts and /quantum/findings.
    """
    if not QUANTUM_BRAIN_ENABLED:
        log.info("[SAIB-QB] Quantum code scanner disabled. Set SAIB_QUANTUM_BRAIN_ENABLED=true.")
        return
    await asyncio.sleep(120)    # startup grace — let all services settle first
    while True:
        try:
            log.info("[SAIB-QB] Code scan start (path=%s)…", CODEBASE_SCAN_PATH)
            await update_self_knowledge_hash(alerts_ref, uuid.uuid4)
            findings = await scan_codebase_files(github_fallback_fn)
            _qb_scans.labels(scan_type="code").inc()
            _quantum_state["code_scans_total"] += 1
            _quantum_state["last_code_scan"]    = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            if findings:
                _quantum_state["code_issues_found"] += len(findings)
                _quantum_state["findings"] = (list(_quantum_state["findings"]) + findings)[-100:]
                log.warning("[SAIB-QB] Code scan: %d issue(s) found", len(findings))
                for f in findings:
                    _qb_code_issues.labels(severity=f["severity"], category=f["category"]).inc()
                    alerts_ref.append({
                        "id":            str(uuid.uuid4()),
                        "severity":      f["severity"].lower(),
                        "service":       "QUANTUM-CODE-SCANNER",
                        "message":       f"[{f['category'].upper()}] {f['description']} — {f.get('file', '?')}:{f.get('line', '?')}",
                        "auto_resolved": False,
                        "ts":            f["ts"],
                    })
                if brain_ref:
                    brain_ref.record_interaction("discovery", "code-security", 0.5)
                if interactions_fn:
                    interactions_fn(type="quantum-code-scan")
            else:
                log.info("[SAIB-QB] Code scan clean — ecosystem secure")
        except Exception as e:
            log.error("[SAIB-QB] Code scan loop: %s", e)
        await asyncio.sleep(QUANTUM_CODE_SCAN_INTERVAL_S)


async def image_scan_loop(docker_client_ref, alerts_ref) -> None:
    """
    Perpetual background task — scans all running containers + Dockerfiles every
    SAIB_QUANTUM_IMAGE_SCAN_INTERVAL_S for CVE-vulnerable base images.
    When SAIB_QUANTUM_AUTO_BUILD=true, auto-triggers docker build --pull.
    """
    if not QUANTUM_BRAIN_ENABLED:
        return
    await asyncio.sleep(180)    # stagger 60 s after code scan loop
    while True:
        try:
            log.info("[SAIB-QB] Image scan start…")
            img_f = await scan_running_images(docker_client_ref)
            df_f  = await scan_dockerfiles()
            all_f = img_f + df_f
            _qb_scans.labels(scan_type="image").inc()
            _quantum_state["image_scans_total"] += 1
            _quantum_state["last_image_scan"]    = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            if all_f:
                _quantum_state["vulnerable_images"] += len(img_f)
                log.warning("[SAIB-QB] Image scan: %d container + %d Dockerfile findings",
                            len(img_f), len(df_f))
                for f in all_f:
                    key = f.get("vulnerable_base") or f.get("base_image") or "unknown"
                    _qb_img_vulns.labels(base_image=key).inc()
                    alerts_ref.append({
                        "id":            str(uuid.uuid4()),
                        "severity":      "high",
                        "service":       "QUANTUM-IMAGE-SCANNER",
                        "message":       (
                            f"Vulnerable base {key!r} → {f.get('recommended', '?')} "
                            f"in {f.get('file', f.get('container', '?'))}"
                        ),
                        "auto_resolved": False,
                        "ts":            f["ts"],
                    })
                if QUANTUM_AUTO_BUILD and docker_client_ref:
                    svcs: set[str] = set()
                    for f in df_f:
                        parts = pathlib.PurePath(f.get("file", "")).parts
                        if parts:
                            svcs.add(parts[0])
                    for svc in list(svcs)[:3]:
                        log.info("[SAIB-QB] Auto-build: %s", svc)
                        await build_service_image(docker_client_ref, svc)
                        await asyncio.sleep(10)
            else:
                log.info("[SAIB-QB] Image scan clean — all base images current")
        except Exception as e:
            log.error("[SAIB-QB] Image scan loop: %s", e)
        await asyncio.sleep(QUANTUM_IMAGE_SCAN_INTERVAL_S)


# ── Public accessors used by main.py endpoints ─────────────────────────────────
def get_state() -> dict[str, Any]:
    """Return the quantum brain runtime state dict."""
    return _quantum_state
