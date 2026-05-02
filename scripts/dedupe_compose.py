#!/usr/bin/env python3
"""Dedupe Triumph-Synergy docker-compose.yml.

Removes the 16 standalone service blocks that are already merged into
existing super-pods, and injects hostname aliases on the super-pods so
all callers continue to resolve unchanged.
"""
import re
import sys
from pathlib import Path

COMPOSE = Path("docker-compose.yml")
text = COMPOSE.read_text()

# --- Services to delete (they're duplicates of super-pod sub-services) ---
DUPLICATES = [
    "central-node",          # → governance-shield
    "transaction-engine",    # → settlement-core
    "smart-contracts",       # → settlement-core
    "scp-upgrader",          # → governance-shield
    "market-data",           # → horizon-stream
    "blockchain-oracle",     # → horizon-stream
    "compliance",            # → governance-shield
    "dex",                   # → settlement-core
    "ml-engine",             # → financial-intel
    "apex-credit-prime",     # → revert (financial-intel covers credit/ml/dual-value)
    "quantum-shield",        # → quantum-fortress
    "tokenization-engine",   # → settlement-core
    "horizon-guardian",      # → ecosystem-guardian
    "judicial-monitor",      # → governance-shield
    "health-governor",       # → ecosystem-guardian
    "network-sentinel",      # → ecosystem-guardian
]

# --- Aliases to inject on each super-pod ---
ALIASES = {
    "financial-intel": ["triumph-credit-engine", "triumph-ml-engine", "triumph-dual-value-engine"],
    "settlement-core": ["triumph-transaction-engine", "triumph-smart-contracts", "triumph-tokenization-engine", "triumph-dex"],
    "governance-shield": ["triumph-compliance", "triumph-judicial-monitor", "triumph-central-node", "triumph-scp-upgrader"],
    "horizon-stream": ["triumph-blockchain-oracle", "triumph-market-data"],
    "quantum-fortress": ["triumph-quantum-shield"],
    "ecosystem-guardian": ["triumph-health-governor", "triumph-network-sentinel", "triumph-horizon-guardian"],
    "apex-services": ["triumph-sovereign-gateway"],  # add gateway to existing aliases
}

# Regex: match a service block from "  <name>:\n" to the next "  <name>:\n"
# at the same 2-space indent (or end of services section marked by "\n# ====" or "\nvolumes:")
def find_block(name: str, src: str):
    pattern = rf"(?ms)^(  {re.escape(name)}:\n.*?)(?=^  [a-z][a-z0-9_-]*:\n|^# =|^volumes:|^networks:)"
    m = re.search(pattern, src)
    return m

# Delete blocks
removed = []
for name in DUPLICATES:
    m = find_block(name, text)
    if not m:
        print(f"  ! not found: {name}", file=sys.stderr)
        continue
    placeholder = f"  # NOTE: {name} folded into super-pod (see aliases). Standalone removed.\n\n"
    text = text[:m.start()] + placeholder + text[m.end():]
    removed.append(name)

print(f"Removed {len(removed)} duplicate service blocks: {', '.join(removed)}")

# --- Inject aliases on super-pods ---
def inject_aliases(pod: str, new_aliases: list[str], src: str) -> str:
    """Find the super-pod block, locate its `networks:` section, and either
    extend an existing aliases array or convert `- triumph-net` to the
    aliased form."""
    m = find_block(pod, src)
    if not m:
        print(f"  ! pod block not found: {pod}", file=sys.stderr)
        return src
    block = m.group(1)
    block_start, block_end = m.start(), m.end()

    # Case A: `networks:\n      triumph-net:\n        aliases:\n          - X` — extend
    extend_pattern = re.compile(
        r"(    networks:\n      triumph-net:\n        aliases:\n)((?:          - [^\n]+\n)+)"
    )
    em = extend_pattern.search(block)
    if em:
        existing = em.group(2)
        existing_set = {ln.strip().lstrip("- ").strip() for ln in existing.strip().split("\n")}
        additions = "".join(f"          - {a}\n" for a in new_aliases if a not in existing_set)
        if additions:
            new_block = block[:em.end(1)] + existing + additions + block[em.end():]
            src = src[:block_start] + new_block + src[block_end:]
        return src

    # Case B: `networks:\n      - triumph-net` (plus optionally - pi-bridge) — rewrite
    short_pattern = re.compile(
        r"    networks:\n((?:      - [a-z0-9_-]+\n)+)"
    )
    sm = short_pattern.search(block)
    if not sm:
        print(f"  ! networks: section not found in {pod}", file=sys.stderr)
        return src

    nets = [ln.strip().lstrip("- ").strip() for ln in sm.group(1).strip().split("\n")]
    new_lines = ["    networks:\n"]
    for net in nets:
        if net == "triumph-net":
            new_lines.append("      triumph-net:\n")
            new_lines.append("        aliases:\n")
            for a in new_aliases:
                new_lines.append(f"          - {a}\n")
        else:
            new_lines.append(f"      - {net}\n")
    new_networks = "".join(new_lines)
    new_block = block[:sm.start()] + new_networks + block[sm.end():]
    src = src[:block_start] + new_block + src[block_end:]
    return src

for pod, names in ALIASES.items():
    text = inject_aliases(pod, names, text)
    print(f"  + aliases on {pod}: {', '.join(names)}")

# Collapse triple+ blank lines down to two
text = re.sub(r"\n{4,}", "\n\n\n", text)

COMPOSE.write_text(text)
print(f"\nWrote {COMPOSE} ({len(text.splitlines())} lines)")
