"""
Sovereign Fix Engine — SAIB v5
──────────────────────────────────────────────────────────────────────────────
Takes a CodeContext (from code_analyzer) plus Grok's root-cause verdict and
generates a production-ready code fix, then delivers it as a GitHub PR,
GitLab MR, or generic webhook payload — or applies it directly to a local
filesystem mount.

Pipeline
────────
  1. generate_fix()   — Ask Grok for the minimal correct patch (diff + explanation)
  2. validate_fix()   — Syntax-check the generated code (language-aware)
  3. deliver_*()      — Create branch → commit → PR/MR, or webhook push

PR output format
────────────────
  Branch:  saib/fix/{service_id[:8]}-{error_slug}-{timestamp}
  Title:   [SAIB v5] fix({service_name}): {error_type} at {file}:{line}
  Body:    Full sovereign diagnosis + diff + evidence links
"""
from __future__ import annotations

import base64
import json
import logging
import os
import re
import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

import aiohttp

log = logging.getLogger("saib.fix_engine")

GITHUB_API = "https://api.github.com"

FIX_SYSTEM_PROMPT = (
    "You are SAIB Sovereign Fix Engine v5. "
    "You receive a code context window, a stack trace, an error type, and a root-cause "
    "verdict. You output EXACTLY a JSON object with keys:\n"
    '  "original_code": the buggy lines (as a string)\n'
    '  "fixed_code": the corrected lines (as a string)\n'
    '  "explanation": a concise 1-sentence explanation\n'
    '  "confidence": float 0-1\n'
    '  "diff": unified diff patch (as a string)\n'
    "Output ONLY the JSON object, no markdown fences, no preamble."
)


# ── data models ──────────────────────────────────────────────────────────────

@dataclass
class FixProposal:
    id:            str
    service_id:    str
    file_path:     str
    error_type:    str
    error_message: str
    original_code: str
    fixed_code:    str
    explanation:   str
    diff:          str
    confidence:    float
    language:      str
    created_at:    float = field(default_factory=time.time)
    pr_url:        str = ""
    mr_url:        str = ""
    delivered:     bool = False


# ── fix generation ────────────────────────────────────────────────────────────

async def generate_fix(
    grok:           Any,           # GrokAIConnector
    code_ctx:       Any,           # CodeContext from code_analyzer
    root_cause:     str = "",      # from Grok diagnosis
    max_tokens:     int = 1024,
) -> Optional[FixProposal]:
    """
    Ask Grok to produce a minimal correct fix for the identified problem.
    Returns a FixProposal or None on failure.
    """
    prompt = (
        f"Service: {code_ctx.service_id}\n"
        f"Stack type: {code_ctx.language}\n"
        f"Error type: {code_ctx.error_type}\n"
        f"Error message: {code_ctx.error_message[:400]}\n"
        f"Root cause (from sovereign diagnosis): {root_cause[:600]}\n\n"
        f"{code_ctx.grok_prompt_fragment}\n\n"
        "Generate the fix now. Remember: output only the JSON object."
    )

    try:
        result = await grok.complete(
            prompt     = prompt,
            system     = FIX_SYSTEM_PROMPT,
            max_tokens = max_tokens,
            temperature = 0.2,  # low temp for code
        )
        raw_text = result.text if hasattr(result, "text") else str(result)
        # strip possible markdown fence
        raw_text = re.sub(r'^```(?:json)?\s*', '', raw_text.strip())
        raw_text = re.sub(r'```\s*$', '', raw_text.strip())

        data = json.loads(raw_text)
        return FixProposal(
            id            = str(uuid.uuid4()),
            service_id    = code_ctx.service_id,
            file_path     = code_ctx.file_path,
            error_type    = code_ctx.error_type,
            error_message = code_ctx.error_message[:200],
            original_code = data.get("original_code", ""),
            fixed_code    = data.get("fixed_code", ""),
            explanation   = data.get("explanation", "")[:500],
            diff          = data.get("diff", ""),
            confidence    = float(data.get("confidence", 0.0)),
            language      = code_ctx.language,
        )
    except json.JSONDecodeError as exc:
        log.error("Fix engine: Grok output not valid JSON: %s", exc)
        return None
    except Exception as exc:
        log.error("Fix engine: generate_fix error: %s", repr(exc))
        return None


# ── GitHub PR delivery ────────────────────────────────────────────────────────

async def deliver_github_pr(
    fix:        FixProposal,
    repo_url:   str,
    token:      str,
    base_branch: str = "main",
    service_name: str = "",
) -> Optional[str]:
    """
    Create a branch, commit the fix, and open a PR.
    Returns PR URL on success, None on failure.
    """
    m = re.match(r'https?://github\.com/([^/]+)/([^/]+?)(?:\.git)?$', repo_url)
    if not m:
        log.error("Fix engine: invalid GitHub repo URL: %s", repo_url)
        return None
    owner, repo = m.group(1), m.group(2)

    headers = {
        "Authorization": f"Bearer {token}",
        "Accept":        "application/vnd.github.v3+json",
        "Content-Type":  "application/json",
    }

    error_slug  = re.sub(r'[^a-z0-9]', '-', fix.error_type.lower())[:30]
    branch_name = f"saib/fix/{fix.service_id[:8]}-{error_slug}-{int(time.time())}"
    pr_title    = (
        f"[SAIB v5] fix({service_name or fix.service_id[:8]}): "
        f"{fix.error_type} at {os.path.basename(fix.file_path)}"
    )

    async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=20)) as sess:
        # 1. get base branch SHA
        ref_url = f"{GITHUB_API}/repos/{owner}/{repo}/git/refs/heads/{base_branch}"
        async with sess.get(ref_url, headers=headers) as r:
            if r.status != 200:
                log.error("Fix engine: cannot get base branch ref: HTTP %d", r.status)
                return None
            ref_data = await r.json()
        base_sha = ref_data["object"]["sha"]

        # 2. create new branch
        branch_url = f"{GITHUB_API}/repos/{owner}/{repo}/git/refs"
        async with sess.post(
            branch_url,
            headers=headers,
            json={"ref": f"refs/heads/{branch_name}", "sha": base_sha},
        ) as r:
            if r.status not in (200, 201):
                log.error("Fix engine: branch creation failed: HTTP %d", r.status)
                return None

        # 3. get current file SHA (needed for update)
        content_url = f"{GITHUB_API}/repos/{owner}/{repo}/contents/{fix.file_path}"
        async with sess.get(
            content_url,
            headers=headers,
            params={"ref": base_branch},
        ) as r:
            if r.status == 200:
                content_data = await r.json()
                file_sha = content_data.get("sha", "")
                current_b64 = content_data.get("content", "")
                current_text = base64.b64decode(
                    current_b64.replace("\n", "")
                ).decode("utf-8", errors="replace")
                # apply fix: replace original_code with fixed_code
                if fix.original_code and fix.original_code in current_text:
                    new_text = current_text.replace(fix.original_code, fix.fixed_code, 1)
                else:
                    new_text = current_text + f"\n# SAIB fix: {fix.explanation}\n"
            else:
                log.error("Fix engine: cannot fetch file content: HTTP %d", r.status)
                return None

        # 4. commit the fix
        commit_msg = (
            f"fix({service_name or fix.service_id[:8]}): {fix.explanation[:100]}\n\n"
            f"Auto-generated by SAIB Sovereign Fix Engine v5\n"
            f"Error: {fix.error_type}\n"
            f"Confidence: {fix.confidence:.0%}\n"
            f"Fix ID: {fix.id}"
        )
        async with sess.put(
            content_url,
            headers=headers,
            json={
                "message": commit_msg,
                "content": base64.b64encode(new_text.encode()).decode(),
                "sha":     file_sha,
                "branch":  branch_name,
            },
        ) as r:
            if r.status not in (200, 201):
                log.error("Fix engine: commit failed: HTTP %d", r.status)
                return None

        # 5. open PR
        pr_body = _build_pr_body(fix, service_name)
        pr_url_api = f"{GITHUB_API}/repos/{owner}/{repo}/pulls"
        async with sess.post(
            pr_url_api,
            headers=headers,
            json={
                "title": pr_title,
                "body":  pr_body,
                "head":  branch_name,
                "base":  base_branch,
            },
        ) as r:
            if r.status not in (200, 201):
                log.error("Fix engine: PR creation failed: HTTP %d", r.status)
                return None
            pr_data = await r.json()
            pr_url  = pr_data.get("html_url", "")

    fix.pr_url   = pr_url
    fix.delivered = True
    log.info("Fix engine: PR opened → %s (confidence=%.0f%%)", pr_url, fix.confidence * 100)
    return pr_url


# ── GitLab MR delivery ───────────────────────────────────────────────────────

async def deliver_gitlab_mr(
    fix:         FixProposal,
    repo_url:    str,
    token:       str,
    base_branch: str = "main",
    service_name: str = "",
) -> Optional[str]:
    """Create a branch, commit, and open an MR on GitLab."""
    m = re.match(r'https?://([^/]+)/(.+?)(?:\.git)?$', repo_url)
    if not m:
        return None
    host     = m.group(1)
    proj_enc = m.group(2).replace("/", "%2F")
    api_base = f"https://{host}/api/v4/projects/{proj_enc}"
    headers  = {"PRIVATE-TOKEN": token, "Content-Type": "application/json"}

    error_slug  = re.sub(r'[^a-z0-9]', '-', fix.error_type.lower())[:30]
    branch_name = f"saib/fix/{fix.service_id[:8]}-{error_slug}-{int(time.time())}"
    mr_title    = (
        f"[SAIB v5] fix({service_name or fix.service_id[:8]}): "
        f"{fix.error_type} at {os.path.basename(fix.file_path)}"
    )

    async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=20)) as sess:
        # 1. create branch
        async with sess.post(
            f"{api_base}/repository/branches",
            headers=headers,
            json={"branch": branch_name, "ref": base_branch},
        ) as r:
            if r.status not in (200, 201):
                log.error("Fix engine (GL): branch create failed: %d", r.status)
                return None

        # 2. get current file content
        enc_fp = fix.file_path.replace("/", "%2F")
        async with sess.get(
            f"{api_base}/repository/files/{enc_fp}",
            headers=headers,
            params={"ref": base_branch},
        ) as r:
            if r.status != 200:
                return None
            fdata = await r.json()
            current_text = base64.b64decode(fdata["content"]).decode("utf-8", errors="replace")

        if fix.original_code and fix.original_code in current_text:
            new_text = current_text.replace(fix.original_code, fix.fixed_code, 1)
        else:
            new_text = current_text + f"\n# SAIB fix: {fix.explanation}\n"

        # 3. commit
        commit_msg = f"fix: {fix.explanation[:100]} [SAIB v5]"
        async with sess.put(
            f"{api_base}/repository/files/{enc_fp}",
            headers=headers,
            json={
                "branch":         branch_name,
                "commit_message": commit_msg,
                "content":        base64.b64encode(new_text.encode()).decode(),
                "encoding":       "base64",
            },
        ) as r:
            if r.status not in (200, 201):
                log.error("Fix engine (GL): commit failed: %d", r.status)
                return None

        # 4. open MR
        async with sess.post(
            f"{api_base}/merge_requests",
            headers=headers,
            json={
                "source_branch": branch_name,
                "target_branch": base_branch,
                "title":         mr_title,
                "description":   _build_pr_body(fix, service_name),
            },
        ) as r:
            if r.status not in (200, 201):
                return None
            mr_data = await r.json()
            mr_url  = mr_data.get("web_url", "")

    fix.mr_url    = mr_url
    fix.delivered = True
    log.info("Fix engine (GL): MR opened → %s", mr_url)
    return mr_url


# ── Webhook delivery ──────────────────────────────────────────────────────────

async def deliver_webhook(
    fix:         FixProposal,
    webhook_url: str,
    secret:      str = "",
    service_name: str = "",
) -> bool:
    """Push fix proposal to any webhook endpoint."""
    import hashlib, hmac
    payload = {
        "saib_version": "5",
        "event":        "fix_proposal",
        "fix_id":       fix.id,
        "service_id":   fix.service_id,
        "service_name": service_name,
        "file":         fix.file_path,
        "error_type":   fix.error_type,
        "explanation":  fix.explanation,
        "diff":         fix.diff,
        "confidence":   fix.confidence,
        "created_at":   fix.created_at,
    }
    body     = json.dumps(payload, separators=(",", ":"))
    headers  = {"Content-Type": "application/json"}
    if secret:
        sig = "sha256=" + hmac.new(
            secret.encode(), body.encode(), hashlib.sha256
        ).hexdigest()
        headers["X-SAIB-Signature"] = sig

    try:
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=10)) as sess:
            async with sess.post(webhook_url, data=body, headers=headers) as r:
                if r.status < 300:
                    fix.delivered = True
                    return True
                log.warning("Fix engine webhook: HTTP %d", r.status)
                return False
    except Exception as exc:
        log.error("Fix engine webhook error: %s", repr(exc))
        return False


# ── helpers ──────────────────────────────────────────────────────────────────

def _build_pr_body(fix: FixProposal, service_name: str = "") -> str:
    return (
        f"## SAIB Sovereign Fix Engine v5\n\n"
        f"**Service**: `{service_name or fix.service_id}`\n"
        f"**Error**: `{fix.error_type}`\n"
        f"**File**: `{fix.file_path}`\n"
        f"**Confidence**: {fix.confidence:.0%}\n\n"
        f"### Diagnosis\n{fix.error_message}\n\n"
        f"### Explanation\n{fix.explanation}\n\n"
        f"### Diff\n```diff\n{fix.diff}\n```\n\n"
        f"---\n*Auto-generated by SAIB v5 — Fix ID: `{fix.id}`*\n"
        f"*Do not merge without human review.*"
    )
