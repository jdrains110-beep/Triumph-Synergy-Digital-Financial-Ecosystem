"""
Stack-Aware Code Analyzer — SAIB v5
──────────────────────────────────────────────────────────────────────────────
Reads source code from repositories or file content, parses stack traces with
full stack-type awareness, extracts the precise file + line + symbol of the
failure, and feeds Grok a surgical code-level context window for pinpoint
root-cause diagnosis.

Stack parsers supported
───────────────────────
  Python       — Traceback (most recent call last), asyncio, pytest
  Node.js      — V8 stack (at Function.xxx (file.js:line:col))
  Java         — java.lang.NullPointerException at com.Class.method(File.java:42)
  Go           — goroutine panic, runtime/debug.Stack()
  Rust         — thread 'main' panicked at 'msg', src/file.rs:42
  .NET/C#      — at Namespace.Class.Method(Type param) in File.cs:line 42
  PHP          — Fatal error: ... in /path/to/file.php on line 42
  Ruby         — /path/to/file.rb:42:in `method_name`
  Generic      — heuristic file:line extraction

Code fetch adapters
───────────────────
  GitHub       — raw.githubusercontent.com (token-gated for private)
  GitLab       — /api/v4/projects/.../repository/files/.../raw
  Bitbucket    — /2.0/repositories/.../src/...
  Local mount  — direct file read (if /repos/ is mounted)
  Paste        — accept raw code string directly from API

Output
──────
  CodeContext: {
    file_path, start_line, end_line, language, snippet,
    stack_frames[{file, line, symbol}],
    primary_frame: {file, line, symbol},
    grok_prompt_fragment: ready-to-inject text for Grok
  }
"""
from __future__ import annotations

import json
import logging
import os
import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

import aiohttp

log = logging.getLogger("saib.code_analyzer")

CONTEXT_LINES = int(os.getenv("SAIB_CODE_CONTEXT_LINES", "20"))  # ± lines around error


# ── data models ──────────────────────────────────────────────────────────────

@dataclass
class StackFrame:
    file:   str
    line:   int
    symbol: str   # function / class / method name
    source: str = ""  # fetched source line if available


@dataclass
class CodeContext:
    """Everything Grok needs to diagnose a code-level failure."""
    service_id:          str
    stack_frames:        List[StackFrame]
    primary_frame:       Optional[StackFrame]   # deepest application frame
    file_path:           str
    start_line:          int
    end_line:            int
    language:            str
    snippet:             str                    # source code window
    error_type:          str
    error_message:       str
    full_trace:          str
    grok_prompt_fragment: str = ""              # ready to embed in healer prompt


# ── per-stack parsers ─────────────────────────────────────────────────────────

def parse_python(text: str) -> List[StackFrame]:
    frames = []
    # standard Python traceback pattern
    for m in re.finditer(
        r'File "(.+?)", line (\d+),? in (.+)',
        text,
    ):
        frames.append(StackFrame(
            file=m.group(1),
            line=int(m.group(2)),
            symbol=m.group(3).strip(),
        ))
    return frames


def parse_nodejs(text: str) -> List[StackFrame]:
    frames = []
    # V8:  "    at ClassName.method (file.js:10:5)"
    # V8:  "    at file.js:10:5"
    for m in re.finditer(
        r'at\s+(?:(.+?)\s+\()?(.+?\.(?:js|ts|mjs|cjs)):(\d+):\d+\)?',
        text,
    ):
        symbol = m.group(1) or "<anonymous>"
        frames.append(StackFrame(
            file=m.group(2),
            line=int(m.group(3)),
            symbol=symbol.strip(),
        ))
    return frames


def parse_java(text: str) -> List[StackFrame]:
    frames = []
    # "  at com.example.Class.method(File.java:42)"
    for m in re.finditer(
        r'at\s+([\w\.\$]+)\(([\w]+\.java):(\d+)\)',
        text,
    ):
        frames.append(StackFrame(
            file=m.group(2),
            line=int(m.group(3)),
            symbol=m.group(1),
        ))
    return frames


def parse_go(text: str) -> List[StackFrame]:
    frames = []
    # "goroutine 1 [running]:\nmain.funcName(...)\n\t/path/to/file.go:42 +0x..."
    lines = text.split("\n")
    for i, line in enumerate(lines):
        m = re.match(r'\s*/?([\w/\.\-_]+\.go):(\d+)', line)
        if m:
            symbol = ""
            if i > 0:
                sym_m = re.match(r'([\w\./]+)\(', lines[i - 1])
                if sym_m:
                    symbol = sym_m.group(1)
            frames.append(StackFrame(
                file=m.group(1),
                line=int(m.group(2)),
                symbol=symbol,
            ))
    return frames


def parse_rust(text: str) -> List[StackFrame]:
    frames = []
    # "thread 'main' panicked at 'message', src/main.rs:42:5"
    for m in re.finditer(
        r"panicked at '(.+?)',\s*([\w/\.\-_]+\.rs):(\d+)",
        text,
    ):
        frames.append(StackFrame(
            file=m.group(2),
            line=int(m.group(3)),
            symbol=f"panic: {m.group(1)[:60]}",
        ))
    # also parse numbered frames from RUST_BACKTRACE=1
    for m in re.finditer(
        r'\s*\d+:\s+\S+\s+at\s+([\w/\.\-_]+\.rs):(\d+)',
        text,
    ):
        frames.append(StackFrame(file=m.group(1), line=int(m.group(2)), symbol=""))
    return frames


def parse_dotnet(text: str) -> List[StackFrame]:
    frames = []
    # "  at Namespace.ClassName.Method(String param) in C:\path\File.cs:line 42"
    for m in re.finditer(
        r'at\s+([\w\.\[\]<>,\s]+?)\s+in\s+(.+?):line\s+(\d+)',
        text,
    ):
        frames.append(StackFrame(
            file=m.group(2).strip(),
            line=int(m.group(3)),
            symbol=m.group(1).strip(),
        ))
    return frames


def parse_php(text: str) -> List[StackFrame]:
    frames = []
    # "Fatal error: ... in /path/to/file.php on line 42"
    for m in re.finditer(
        r'in\s+([\w/\.\-_ ]+\.php)\s+on\s+line\s+(\d+)',
        text,
    ):
        frames.append(StackFrame(file=m.group(1), line=int(m.group(2)), symbol=""))
    # Stack trace entries "#0 /path/file.php(42): ClassName->method()"
    for m in re.finditer(
        r'#\d+\s+([\w/\.\-_]+\.php)\((\d+)\):\s+([\w\->:\$]+)',
        text,
    ):
        frames.append(StackFrame(
            file=m.group(1),
            line=int(m.group(2)),
            symbol=m.group(3),
        ))
    return frames


def parse_ruby(text: str) -> List[StackFrame]:
    frames = []
    # "/path/to/file.rb:42:in `method_name'"
    for m in re.finditer(
        r"([\w/\.\-_]+\.rb):(\d+):in `(.+?)'",
        text,
    ):
        frames.append(StackFrame(
            file=m.group(1),
            line=int(m.group(2)),
            symbol=m.group(3),
        ))
    return frames


def parse_generic(text: str) -> List[StackFrame]:
    frames = []
    # heuristic: anything that looks like file.ext:NNN
    for m in re.finditer(
        r'([\w/\.\-_ ]+\.\w{1,6}):(\d{1,6})',
        text,
    ):
        frames.append(StackFrame(file=m.group(1).strip(), line=int(m.group(2)), symbol=""))
    return frames


# ── dispatcher ───────────────────────────────────────────────────────────────

_PARSERS = {
    "python": parse_python,
    "node":   parse_nodejs,
    "java":   parse_java,
    "go":     parse_go,
    "rust":   parse_rust,
    "dotnet": parse_dotnet,
    "php":    parse_php,
    "ruby":   parse_ruby,
}


def extract_frames(stack_text: str, stack_type: str) -> List[StackFrame]:
    """Parse stack trace using the appropriate parser, with generic fallback."""
    parser = _PARSERS.get(stack_type.lower(), parse_generic)
    frames = parser(stack_text)
    if not frames:
        frames = parse_generic(stack_text)
    return frames


def pick_primary_frame(frames: List[StackFrame], exclude_prefixes: tuple = ()) -> Optional[StackFrame]:
    """
    Select the most relevant (deepest application-code) frame.
    Excludes stdlib / vendor paths.
    """
    vendor_hints = (
        "node_modules", "site-packages", "/usr/lib", "java/",
        "python3.", "dist-packages", "__pycache__",
        "runtime/", "runtime.", "goroutine",
    ) + exclude_prefixes
    app_frames = [
        f for f in frames
        if not any(h in f.file for h in vendor_hints)
    ]
    return app_frames[-1] if app_frames else (frames[-1] if frames else None)


# ── source code fetchers ──────────────────────────────────────────────────────

async def fetch_github_snippet(
    repo_url:   str,
    file_path:  str,
    line:       int,
    token:      str = "",
    context:    int = CONTEXT_LINES,
) -> str:
    """Fetch lines around `line` from a GitHub repo (public or private)."""
    # convert https://github.com/org/repo → raw API
    m = re.match(r'https?://github\.com/([^/]+)/([^/]+?)(?:\.git)?$', repo_url)
    if not m:
        return ""
    owner, repo = m.group(1), m.group(2)
    api_url = f"https://api.github.com/repos/{owner}/{repo}/contents/{file_path}"
    headers: Dict[str, str] = {"Accept": "application/vnd.github.v3.raw"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    try:
        async with aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=10)
        ) as sess:
            async with sess.get(api_url, headers=headers) as resp:
                if resp.status != 200:
                    return f"[source fetch failed: HTTP {resp.status}]"
                full_text = await resp.text()
                lines = full_text.splitlines()
                start = max(0, line - context - 1)
                end   = min(len(lines), line + context)
                snippet_lines = []
                for i, l in enumerate(lines[start:end], start=start + 1):
                    marker = ">>>" if i == line else "   "
                    snippet_lines.append(f"{marker} {i:4d}  {l}")
                return "\n".join(snippet_lines)
    except Exception as exc:
        return f"[source fetch error: {exc}]"


async def fetch_gitlab_snippet(
    repo_url:  str,
    file_path: str,
    line:      int,
    token:     str = "",
    ref:       str = "main",
    context:   int = CONTEXT_LINES,
) -> str:
    """Fetch lines around `line` from a GitLab repo."""
    m = re.match(r'https?://([^/]+)/(.+?)(?:\.git)?$', repo_url)
    if not m:
        return ""
    host   = m.group(1)
    path   = m.group(2).replace("/", "%2F")
    enc_fp = file_path.replace("/", "%2F")
    url    = f"https://{host}/api/v4/projects/{path}/repository/files/{enc_fp}/raw?ref={ref}"
    headers: Dict[str, str] = {}
    if token:
        headers["PRIVATE-TOKEN"] = token
    try:
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=10)) as sess:
            async with sess.get(url, headers=headers) as resp:
                if resp.status != 200:
                    return f"[source fetch failed: HTTP {resp.status}]"
                full_text = await resp.text()
                lines = full_text.splitlines()
                start = max(0, line - context - 1)
                end   = min(len(lines), line + context)
                snippet_lines = []
                for i, l in enumerate(lines[start:end], start=start + 1):
                    marker = ">>>" if i == line else "   "
                    snippet_lines.append(f"{marker} {i:4d}  {l}")
                return "\n".join(snippet_lines)
    except Exception as exc:
        return f"[source fetch error: {exc}]"


async def fetch_code_snippet(
    frame:         StackFrame,
    repo_url:      str = "",
    repo_token:    str = "",
    repo_provider: str = "github",
    context:       int = CONTEXT_LINES,
) -> str:
    """Route to the correct fetcher based on provider."""
    if not repo_url:
        return "[no repo configured — attach repo_url on service registration]"
    if repo_provider == "github":
        return await fetch_github_snippet(repo_url, frame.file, frame.line, repo_token, context)
    elif repo_provider in ("gitlab", "self-hosted"):
        return await fetch_gitlab_snippet(repo_url, frame.file, frame.line, repo_token, context=context)
    return "[unsupported provider]"


# ── main entry point ──────────────────────────────────────────────────────────

async def analyse_code(
    service_id:    str,
    log_events:    List[Any],  # List[NormalisedLogEvent]
    stack_type:    str = "generic",
    repo_url:      str = "",
    repo_token:    str = "",
    repo_provider: str = "github",
) -> Optional[CodeContext]:
    """
    Full code analysis pipeline:
      1. Collect error/warn events
      2. Find best stack trace
      3. Parse frames per stack type
      4. Pick primary application frame
      5. Fetch source code window from repo
      6. Build grok_prompt_fragment

    Returns CodeContext or None if no stack trace found.
    """
    # gather all error/warn messages
    error_events = [e for e in log_events if e.level in ("error", "warn")]
    if not error_events:
        return None

    full_trace = "\n".join(e.message for e in error_events[-30:])

    # detect error type from first error line
    first_err   = error_events[-1].message
    error_type  = "unknown"
    error_message = first_err[:300]

    # common error type extraction patterns
    for pattern, lang_hint in [
        (r'([\w\.]+Error|[\w\.]+Exception|[\w\.]+Panic|[\w\.]+Fault):', "python"),
        (r'([A-Z]\w+Error):', "node"),
        (r'(java\.[\w\.]+Exception):', "java"),
        (r'thread .+ panicked at', "rust"),
        (r'(goroutine \d+ \[.+?\])', "go"),
        (r'(Fatal error|Parse error|TypeError):', "php"),
    ]:
        m = re.search(pattern, full_trace)
        if m:
            error_type = m.group(1)
            break

    # parse frames
    frames = extract_frames(full_trace, stack_type)
    if not frames:
        return None

    primary = pick_primary_frame(frames)
    if not primary:
        return None

    # fetch source snippet
    snippet = await fetch_code_snippet(
        frame         = primary,
        repo_url      = repo_url,
        repo_token    = repo_token,
        repo_provider = repo_provider,
    )
    primary.source = snippet

    # build Grok prompt fragment — surgical, no fluff
    grok_fragment = (
        f"CODE-LEVEL ANALYSIS\n"
        f"Stack type: {stack_type}\n"
        f"Error type: {error_type}\n"
        f"Error: {error_message}\n"
        f"Primary frame: {primary.file}:{primary.line} in {primary.symbol}\n"
        f"Full stack ({len(frames)} frames total):\n"
        + "\n".join(f"  {f.file}:{f.line} {f.symbol}" for f in frames[-8:])
        + f"\n\nSource context ({primary.file} lines {primary.line - CONTEXT_LINES}–{primary.line + CONTEXT_LINES}):\n"
        + snippet
    )

    return CodeContext(
        service_id           = service_id,
        stack_frames         = frames,
        primary_frame        = primary,
        file_path            = primary.file,
        start_line           = max(1, primary.line - CONTEXT_LINES),
        end_line             = primary.line + CONTEXT_LINES,
        language             = stack_type,
        snippet              = snippet,
        error_type           = error_type,
        error_message        = error_message,
        full_trace           = full_trace[:2000],
        grok_prompt_fragment = grok_fragment,
    )
