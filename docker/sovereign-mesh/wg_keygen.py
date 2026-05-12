"""
Triumph Synergy Sovereign Mesh — WireGuard Key Generator Utility
=================================================================
Generates Curve25519 keypairs and pre-shared keys for all mesh nodes
using the cryptography library (same dependency already in requirements.txt).

This runs inside the container on first start (called from entrypoint.sh)
or can be invoked manually:
    python wg_keygen.py --list       # show all current public keys
    python wg_keygen.py --rotate <node>  # rotate keypair for one node
    python wg_keygen.py --export        # export public keys as JSON
"""

import argparse
import json
import os
import subprocess
import sys

KEY_DIR = os.getenv("KEY_DIR", "/app/keys")

MESH_NODES = {
    "hub":           "10.13.37.1",
    "app":           "10.13.37.10",
    "nginx":         "10.13.37.11",
    "apex-services": "10.13.37.12",
    "smb":           "10.13.37.13",
    "quantum":       "10.13.37.14",
    "settlement":    "10.13.37.15",
    "pi-node":       "10.13.37.16",
    "governance":    "10.13.37.17",
    "vault":         "10.13.37.18",
}


def _run(cmd: list[str]) -> str:
    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    return result.stdout.strip()


def _pipe(cmd1: list[str], stdin_data: str) -> str:
    result = subprocess.run(cmd1, input=stdin_data, capture_output=True, text=True, check=True)
    return result.stdout.strip()


def ensure_keypair(node: str, force: bool = False) -> dict:
    """Generate private + public key for a node if not already present."""
    os.makedirs(KEY_DIR, mode=0o700, exist_ok=True)
    priv_path = os.path.join(KEY_DIR, f"{node}_private.key")
    pub_path  = os.path.join(KEY_DIR, f"{node}_public.key")

    if force or not os.path.exists(priv_path):
        private_key = _run(["wg", "genkey"])
        with open(priv_path, "w") as f:
            f.write(private_key + "\n")
        os.chmod(priv_path, 0o600)
    else:
        with open(priv_path) as f:
            private_key = f.read().strip()

    public_key = _pipe(["wg", "pubkey"], private_key)
    with open(pub_path, "w") as f:
        f.write(public_key + "\n")
    os.chmod(pub_path, 0o644)

    return {"node": node, "ip": MESH_NODES.get(node, "unknown"), "public_key": public_key}


def ensure_psk(node: str, force: bool = False) -> str:
    """Generate pre-shared key for hub↔node if not already present."""
    os.makedirs(KEY_DIR, mode=0o700, exist_ok=True)
    psk_path = os.path.join(KEY_DIR, f"psk_{node}.key")

    if force or not os.path.exists(psk_path):
        psk = _run(["wg", "genpsk"])
        with open(psk_path, "w") as f:
            f.write(psk + "\n")
        os.chmod(psk_path, 0o600)
    else:
        with open(psk_path) as f:
            psk = f.read().strip()

    return psk


def generate_all(force: bool = False) -> list[dict]:
    """Generate keypairs + PSKs for all mesh nodes."""
    results = []
    for node in MESH_NODES:
        info = ensure_keypair(node, force=force)
        if node != "hub":
            ensure_psk(node, force=force)
        results.append(info)
    return results


def list_keys() -> None:
    """Print all current public keys."""
    print(f"\n{'Node':<20} {'Mesh IP':<18} {'Public Key'}")
    print("-" * 100)
    for node, ip in MESH_NODES.items():
        pub_path = os.path.join(KEY_DIR, f"{node}_public.key")
        if os.path.exists(pub_path):
            with open(pub_path) as f:
                pub = f.read().strip()
        else:
            pub = "(not generated)"
        print(f"{node:<20} {ip:<18} {pub}")
    print()


def export_public_keys() -> dict:
    """Return all public keys as a dict (safe to share)."""
    result = {}
    for node, ip in MESH_NODES.items():
        pub_path = os.path.join(KEY_DIR, f"{node}_public.key")
        if os.path.exists(pub_path):
            with open(pub_path) as f:
                result[node] = {"ip": ip, "public_key": f.read().strip()}
        else:
            result[node] = {"ip": ip, "public_key": None}
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Triumph Sovereign Mesh Key Generator")
    parser.add_argument("--list",   action="store_true", help="List all current public keys")
    parser.add_argument("--export", action="store_true", help="Export public keys as JSON")
    parser.add_argument("--rotate", metavar="NODE",      help="Rotate keypair for a specific node")
    parser.add_argument("--init",   action="store_true", help="Generate all keys (skip if already exist)")
    parser.add_argument("--force",  action="store_true", help="Force regenerate all keys")
    args = parser.parse_args()

    if args.list:
        list_keys()
    elif args.export:
        print(json.dumps(export_public_keys(), indent=2))
    elif args.rotate:
        node = args.rotate
        if node not in MESH_NODES:
            print(f"ERROR: unknown node '{node}'. Valid: {list(MESH_NODES.keys())}")
            sys.exit(1)
        info = ensure_keypair(node, force=True)
        if node != "hub":
            ensure_psk(node, force=True)
        print(f"Rotated keypair for {node}: {info['public_key']}")
    elif args.init or args.force:
        results = generate_all(force=args.force)
        for r in results:
            print(f"  {r['node']:<20} {r['ip']:<18} {r['public_key']}")
    else:
        # Default: generate all missing keys
        results = generate_all(force=False)
        for r in results:
            print(f"  {r['node']:<20} {r['ip']:<18} {r['public_key']}")
