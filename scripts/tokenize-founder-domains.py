#!/usr/bin/env python3
# ==========================================================================
# TRIUMPH SYNERGY — FOUNDER WEB3 .pi DOMAIN BATCH TOKENIZATION
#
# Mints 100% on-chain PI-721 NFT for each .pi web3 domain purchased by the
# founder, with apex-cascade ownership projecting backwards over web1/web2.
#
# Output:
#   - legal/founder-pi-domains-tokenization.json  (full receipts)
#   - legal/founder-pi-domains-cascade.md         (web3 → web2 → web1 ledger)
# ==========================================================================
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

# ── Founder + ownership identity ──────────────────────────────────────────
COMPANY_NAME    = "Triumph Synergy"
FOUNDER         = "Jeremiah Joel Drains"
PI_USERNAME     = "jdrains30"
SOVEREIGN_ROLE  = "FOUNDER_AND_SUPERIOR_SOVEREIGN"
FOUNDER_WALLET  = os.environ.get(
    "TRIUMPH_FOUNDER_ADDRESS",
    "GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V",
)

# Joint ownership: 100% Triumph Synergy + Founder (sovereign dual-anchor)
OWNERSHIP_MODEL = "JOINT_TRIUMPH_SYNERGY_AND_FOUNDER_100PCT_EACH"

# ── Domains paid for in Pi by the founder ────────────────────────────────
DOMAINS = [
    "wingstop.pi",
    "gru.pi",
    "netjets.pi",
    "sonnysbbq.pi",
    "shands.pi",
    "ufhealth.pi",
    "ufl.pi",
    "putnamclerk.pi",
    "checkbeck.pi",
    "daytonainternationalspeedway.pi",
    "gracekennedy.pi",
    "winnebago.pi",
    "palatkaha.pi",
    "circuit7.pi",
    "magellanjets.pi",
    "rulonco.pi",
    "appleandeve.pi",
    "seprod.pi",
    "jamrockmart.pi",
    "spirit.pi",
    "wawa.pi",
]

# Cascade map: web3 → web2/web1 surfaces this domain projects priority over.
CASCADE = {
    "wingstop.pi":                    ["wingstop.com", "order.wingstop.com", "wingstop.org"],
    "gru.pi":                         ["gru.com.br", "gru.com", "gruairport.com.br"],
    "netjets.pi":                     ["netjets.com", "owners.netjets.com"],
    "sonnysbbq.pi":                   ["sonnysbbq.com", "order.sonnysbbq.com"],
    "shands.pi":                      ["shands.org", "ufhealth.org/shands"],
    "ufhealth.pi":                    ["ufhealth.org", "my.ufhealth.org"],
    "ufl.pi":                         ["ufl.edu", "my.ufl.edu", "one.ufl.edu"],
    "putnamclerk.pi":                 ["putnam-fl.com", "putnamclerk.com"],
    "checkbeck.pi":                   ["checkbeck.com"],
    "daytonainternationalspeedway.pi": ["daytonainternationalspeedway.com", "daytonaspeedway.com"],
    "gracekennedy.pi":                ["gracekennedy.com", "gkfoods.com"],
    "winnebago.pi":                   ["winnebago.com", "winnebagoind.com"],
    "palatkaha.pi":                   ["palatkaha.com", "palatka-fl.gov"],
    "circuit7.pi":                    ["circuit7.org", "circuit7.net"],
    "magellanjets.pi":                ["magellanjets.com"],
    "rulonco.pi":                     ["rulonco.com"],
    "appleandeve.pi":                 ["appleandeve.com"],
    "seprod.pi":                      ["seprod.com"],
    "jamrockmart.pi":                 ["jamrockmart.com"],
    "spirit.pi":                      ["spirit.com", "spirit.airlines", "stores.spirit.com", "checkin.spirit.com"],
    "wawa.pi":                        ["wawa.com", "wawainc.com", "myperks.wawa.com"],
}

# Default valuation per founder-acquired domain.
# Founder paid in Pi; record minimum 1 Pi per domain (engine min).
VALUATION_PI = os.environ.get("FOUNDER_DOMAIN_VALUATION_PI", "1")

# ── Endpoints (resolve inside docker network) ────────────────────────────
TOKENIZATION_BASE = os.environ.get(
    "TOKENIZATION_BASE", "http://triumph-settlement-core:8089"
)
QUANTUM_BASE = os.environ.get(
    "QUANTUM_BASE", "http://triumph-quantum-fortress:8094"
)


# ── Canonical JSON helpers (must match engine canonicalPayload()) ─────────
def _canonical(value):
    if isinstance(value, dict):
        return {k: _canonical(value[k]) for k in sorted(value.keys())}
    if isinstance(value, list):
        return [_canonical(v) for v in value]
    return value


def _canonical_json(body: dict) -> str:
    return json.dumps(_canonical(body), separators=(",", ":"), ensure_ascii=False)


def _pq_sign(body: dict, *, timeout: int = 20) -> tuple[str, str]:
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


def post(path: str, body: dict, *, timeout: int = 45) -> tuple[int, dict]:
    url = f"{TOKENIZATION_BASE}{path}"
    sig, pub = _pq_sign(body)
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url, data=data, method="POST",
        headers={
            "Content-Type": "application/json",
            "User-Agent": "triumph-founder-domain-tokenizer/1.0",
            "x-quantum-signature": sig,
            "x-quantum-public-key": pub,
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8") or "{}")
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode("utf-8") or "{}")
        except Exception:
            return e.code, {"error": str(e)}


# ── Main ─────────────────────────────────────────────────────────────────
def main() -> int:
    print(f"→ Founder:           {FOUNDER} ({PI_USERNAME})")
    print(f"→ Owner wallet:      {FOUNDER_WALLET}")
    print(f"→ Co-owner:          {COMPANY_NAME}")
    print(f"→ Ownership model:   {OWNERSHIP_MODEL}")
    print(f"→ Tokenization base: {TOKENIZATION_BASE}")
    print(f"→ Quantum base:      {QUANTUM_BASE}")
    print(f"→ Domains to mint:   {len(DOMAINS)}")
    print()

    out: dict = {
        "company":         COMPANY_NAME,
        "founder":         FOUNDER,
        "owner_wallet":    FOUNDER_WALLET,
        "owner_username":  PI_USERNAME,
        "ownership_model": OWNERSHIP_MODEL,
        "sovereign_role":  SOVEREIGN_ROLE,
        "valuation_pi":    VALUATION_PI,
        "tokenized_at_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "domains": {},
    }

    success = 0
    skipped = 0
    failed: list[str] = []

    for i, domain in enumerate(DOMAINS, 1):
        print(f"[{i:2d}/{len(DOMAINS)}] {domain}")
        body = {
            "domain":        domain,
            "ownerAddress":  FOUNDER_WALLET,
            "ownerUsername": PI_USERNAME,
            "valuationPi":   VALUATION_PI,
            "company":       COMPANY_NAME,
            "founder":       FOUNDER,
            "founderRole":   SOVEREIGN_ROLE,
            "ownershipModel": OWNERSHIP_MODEL,
            "cascadeOver":   CASCADE.get(domain, []),
            "apexCascade":   "WEB3_PROJECTS_BACKWARDS_OVER_WEB1_AND_WEB2",
            "purchasedWith": "PI",
            "boundTo":       "PI_BLOCKCHAIN",
        }
        code, resp = post("/api/tokenize/domain", body)
        token_id = (resp.get("token") or {}).get("tokenId") or resp.get("tokenId")
        pi_tx    = resp.get("piBlockchainTx") or (resp.get("token") or {}).get("blockchainTxHash")
        stx      = resp.get("stellarAnchorTx") or (resp.get("token") or {}).get("stellarTxHash")
        out["domains"][domain] = {
            "http_status":      code,
            "token_id":         token_id,
            "pi_blockchain_tx": pi_tx,
            "stellar_anchor_tx": stx,
            "cascade_over":     CASCADE.get(domain, []),
            "response":         resp,
        }
        if code == 201:
            success += 1
            print(f"        → MINTED  tokenId={token_id}")
            print(f"        → pi_tx   {pi_tx}")
            print(f"        → stellar {stx}")
        elif code == 409:
            skipped += 1
            print(f"        → already tokenized (idempotent), tokenId={resp.get('tokenId')}")
        else:
            failed.append(domain)
            print(f"        → HTTP {code} :: {resp}")

    out["summary"] = {
        "total":     len(DOMAINS),
        "minted":    success,
        "already_tokenized": skipped,
        "failed":    failed,
    }

    # Persist
    out_path = Path(os.environ.get(
        "FOUNDER_DOMAIN_RECEIPT_FILE",
        "/work/legal/founder-pi-domains-tokenization.json",
    ))
    try:
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(out, indent=2, sort_keys=True))
        print(f"\n✓ Receipts → {out_path}")
    except Exception:
        print("\n--- BEGIN FOUNDER_DOMAIN_RECEIPT_JSON ---")
        print(json.dumps(out, indent=2, sort_keys=True))
        print("--- END FOUNDER_DOMAIN_RECEIPT_JSON ---")

    print(f"\n=== SUMMARY ===\n  minted: {success}\n  already-tokenized: {skipped}\n  failed: {len(failed)} {failed}")
    return 0 if not failed else 1


if __name__ == "__main__":
    sys.exit(main())
