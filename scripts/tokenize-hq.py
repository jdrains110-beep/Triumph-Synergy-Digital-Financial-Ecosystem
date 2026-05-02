#!/usr/bin/env python3
# ==========================================================================
# TRIUMPH SYNERGY — HQ TOKENIZATION
# Tokenizes 135 Lake Como Dr, Pomona Park, FL 32181 as the world headquarters.
# Mints:
#   1. Sovereign Estate Bundle  (deed + triumphsynergy.pi domain + trust)
#   2. Standalone Allodial Deed (PI-721)
# Saves all responses to legal/hq-tokenization.json
# ==========================================================================
import json
import os
import secrets
import string
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

# ── HQ PROPERTY ────────────────────────────────────────────────────────────
HQ_ADDRESS = "135 Lake Como Dr, Pomona Park, FL 32181, United States"
HQ_LEGAL_DESCRIPTION = (
    "World Headquarters of Triumph Synergy — "
    "135 Lake Como Dr, Pomona Park, Putnam County, Florida 32181, USA. "
    "Allodial title held by founder Jeremiah Joel Drains for and on behalf "
    "of Triumph Synergy as principal place of business. Asking price USD $645,000."
)
COMPANY_NAME = "Triumph Synergy"
FOUNDER = "Jeremiah Joel Drains"
SOVEREIGN_ROLE = "FOUNDER_AND_SUPERIOR_SOVEREIGN"
PI_DOMAIN = "triumphsynergy.pi"
PI_USERNAME = "jdrains30"

# Asking price $645,000; PI_INTERNAL_RATE = $314,159/Pi → Pi = 645000 / 314159
ASKING_USD = 645_000.0
PI_INTERNAL_RATE = 314_159.0
VALUATION_PI = f"{ASKING_USD / PI_INTERNAL_RATE:.6f}"  # ≈ 2.053069

# ── PLACEHOLDER WALLET ────────────────────────────────────────────────────
# *** REPLACE WHEN REAL PI WALLET IS PROVIDED ***
# Format: 'G' + 55 base32 chars (Stellar/Pi address spec)
# Wallet path: prefer the env override (set when run inside docker, where the
# host file path isn't writable). Falls back to repo-relative path on host.
_default_wallet = Path(__file__).resolve().parent.parent / "legal" / "hq-wallet-placeholder.txt"
WALLET_FILE = Path(os.environ.get("HQ_WALLET_FILE", str(_default_wallet)))


def _generate_placeholder_wallet() -> str:
    alphabet = string.ascii_uppercase + "234567"
    suffix = "".join(secrets.choice(alphabet) for _ in range(55))
    return "G" + suffix


def get_owner_wallet() -> str:
    # 1. Explicit env wallet (e.g. real address provided later) wins
    env_addr = os.environ.get("HQ_OWNER_WALLET", "").strip()
    if env_addr.startswith("G") and len(env_addr) == 56:
        return env_addr
    # 2. Existing file
    if WALLET_FILE.exists():
        for line in WALLET_FILE.read_text().splitlines():
            line = line.strip()
            if line.startswith("G") and len(line) == 56:
                return line
    # 3. Generate placeholder
    addr = _generate_placeholder_wallet()
    try:
        WALLET_FILE.parent.mkdir(parents=True, exist_ok=True)
        WALLET_FILE.write_text(
            "# *** PLACEHOLDER — REPLACE WITH REAL PI WALLET ADDRESS ***\n"
            "# Owner: jdrains30 (Jeremiah Joel Drains, Founder of Triumph Synergy)\n"
            "# Generated: " + time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()) + "\n"
            "# When the real wallet is available, replace the line below and\n"
            "# re-run scripts/tokenize-hq.py to re-mint the deed against the\n"
            "# correct owner address (the prior tokens become traceable history).\n"
            f"{addr}\n"
        )
    except PermissionError:
        # Running inside container with read-only host mount — caller will persist.
        pass
    return addr


# ── API ENDPOINTS ─────────────────────────────────────────────────────────
# settlement-core super-pod absorbed tokenization-engine on port 8089
# quantum-fortress super-pod absorbed quantum-shield on port 8094
TOKENIZATION_BASE = os.environ.get(
    "TOKENIZATION_BASE", "http://triumph-settlement-core:8089"
)
QUANTUM_BASE = os.environ.get(
    "QUANTUM_BASE", "http://triumph-quantum-fortress:8094"
)


def _canonical(value):
    """Match tokenization-engine's canonicalPayload(): recursive key sort."""
    if isinstance(value, dict):
        return {k: _canonical(value[k]) for k in sorted(value.keys())}
    if isinstance(value, list):
        return [_canonical(v) for v in value]
    return value


def _canonical_json(body: dict) -> str:
    # JS JSON.stringify default: no spaces, no ASCII escape for non-ASCII chars
    return json.dumps(_canonical(body), separators=(",", ":"), ensure_ascii=False)


def _pq_sign(body: dict, *, timeout: int = 15) -> tuple[str, str]:
    """Return (signature_b64, public_key_b64) for the canonical body payload."""
    payload = _canonical_json(body)
    req_body = json.dumps({"payload": payload, "encoding": "utf8"}).encode("utf-8")
    req = urllib.request.Request(
        f"{QUANTUM_BASE}/quantum/sign",
        data=req_body, method="POST",
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        result = json.loads(resp.read().decode("utf-8"))
    sig = result.get("signature") or result.get("sig") or ""
    pub = result.get("public_key") or result.get("publicKey") or result.get("pubkey") or ""
    if not sig or not pub:
        raise RuntimeError(f"quantum-fortress did not return sig+pub: {result}")
    return sig, pub


def post(path: str, body: dict, *, timeout: int = 30) -> tuple[int, dict]:
    url = f"{TOKENIZATION_BASE}{path}"
    sig, pub = _pq_sign(body)
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url, data=data, method="POST",
        headers={
            "Content-Type": "application/json",
            "User-Agent": "triumph-hq-tokenizer/1.0",
            "x-quantum-signature": sig,
            "x-quantum-public-key": pub,
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8") or "{}")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8") or "{}")


def main() -> int:
    owner_wallet = get_owner_wallet()
    print(f"→ Owner wallet (placeholder): {owner_wallet}")
    print(f"→ HQ address:                 {HQ_ADDRESS}")
    print(f"→ Asking price USD:           ${ASKING_USD:,.0f}")
    print(f"→ Valuation Pi (internal):    {VALUATION_PI} Pi")
    print(f"→ Endpoint:                   {TOKENIZATION_BASE}")
    print()

    out: dict = {
        "company": COMPANY_NAME,
        "founder": FOUNDER,
        "headquarters_address": HQ_ADDRESS,
        "owner_pi_username": PI_USERNAME,
        "owner_pi_wallet_placeholder": owner_wallet,
        "asking_price_usd": ASKING_USD,
        "valuation_pi_internal": VALUATION_PI,
        "domain_pi": PI_DOMAIN,
        "tokenized_at_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "results": {},
    }

    # 1 — Sovereign Estate Bundle (deed + .pi domain + private living trust)
    print("[1/2] Minting Sovereign Estate Bundle …")
    estate_body = {
        "domain": PI_DOMAIN,
        "ownerAddress": owner_wallet,
        "ownerUsername": PI_USERNAME,
        "legalDescription": HQ_LEGAL_DESCRIPTION,
        "valuationPi": VALUATION_PI,
        "country": "US",
        "sovereignRole": SOVEREIGN_ROLE,
        "privateTrust": {
            "name": "Triumph Synergy Sovereign Headquarters Living Trust",
            "settlor": FOUNDER,
            "trustee": FOUNDER,
            "beneficiary": COMPANY_NAME,
        },
    }
    code, body = post("/api/sovereign/estate/enroll", estate_body)
    out["results"]["sovereign_estate"] = {"http_status": code, "response": body}
    print(f"      → HTTP {code}")
    if code == 201:
        print(f"      → estateId:      {body.get('estate', {}).get('estateId')}")
        print(f"      → deedTokenId:   {body.get('deedToken', {}).get('tokenId')}")
        print(f"      → domainTokenId: {body.get('domainToken', {}).get('tokenId')}")
    else:
        print(f"      → error: {body}")

    # 2 — Standalone Allodial Deed (PI-721)
    print("[2/2] Minting standalone Allodial Deed …")
    deed_body = {
        "property": {
            "legalDescription": HQ_LEGAL_DESCRIPTION + " [STANDALONE-ALLODIAL-DEED]",
            "country": "US",
            "state": "FL",
            "county": "Putnam",
            "address": HQ_ADDRESS,
            "company": COMPANY_NAME,
            "founder": FOUNDER,
            "asking_price_usd": int(ASKING_USD),  # int — JS JSON.stringify(645000.0)="645000", Python "645000.0" would break PQ canonical match
        },
        "owner": {
            "piAddress": owner_wallet,
            "piUsername": PI_USERNAME,
            "company": COMPANY_NAME,
            "founder_role": SOVEREIGN_ROLE,
        },
        "valuationPi": VALUATION_PI,
    }
    code, body = post("/api/tokenize/deed", deed_body)
    out["results"]["allodial_deed"] = {"http_status": code, "response": body}
    print(f"      → HTTP {code}")
    if code == 201:
        token = body.get("token", {})
        print(f"      → tokenId:    {token.get('tokenId')}")
        print(f"      → deedNumber: {token.get('deedNumber')}")
    else:
        print(f"      → error: {body}")

    # Persist everything (env override allows host capture when run in container)
    out_path = Path(os.environ.get(
        "HQ_RECEIPT_FILE",
        str(Path(__file__).resolve().parent.parent / "legal" / "hq-tokenization.json"),
    ))
    try:
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(out, indent=2, sort_keys=True))
        print(f"\n✓ Saved full receipt → {out_path}")
    except PermissionError:
        # Container can't write to host — emit to stdout for capture
        print("\n--- BEGIN HQ_RECEIPT_JSON ---")
        print(json.dumps(out, indent=2, sort_keys=True))
        print("--- END HQ_RECEIPT_JSON ---")

    failures = [
        name for name, r in out["results"].items() if r["http_status"] not in (201, 409)
    ]
    if failures:
        print(f"⚠ Failures: {failures}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
