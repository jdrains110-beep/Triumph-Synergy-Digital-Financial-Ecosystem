#!/usr/bin/env python3
# ==========================================================================
# TRIUMPH SYNERGY — WEB3 .pi DOMAIN ALLODIAL DEEDS
#
# Mints a sovereign ALLODIAL DEED (PI-721) for every Web3 .pi domain in the
# founder's portfolio. Each deed binds the domain as sovereign Web3 territory
# under the apex-cascade doctrine (cascades over Web2 + Web1 surfaces).
#
# Output: legal/web3-domains-allodial-deeds.json
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
OWNERSHIP_MODEL = "JOINT_TRIUMPH_SYNERGY_AND_FOUNDER_100PCT_EACH"

DOMAINS = [
    "wingstop.pi", "gru.pi", "netjets.pi", "sonnysbbq.pi", "shands.pi",
    "ufhealth.pi", "ufl.pi", "putnamclerk.pi", "checkbeck.pi",
    "daytonainternationalspeedway.pi", "gracekennedy.pi", "winnebago.pi",
    "palatkaha.pi", "circuit7.pi", "magellanjets.pi", "rulonco.pi",
    "appleandeve.pi", "seprod.pi", "jamrockmart.pi",
    "spirit.pi", "wawa.pi",
]

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
    "jamrockmart.pi":                 ["jamrockmart.com"],    "spirit.pi":                       ["spirit.com", "spirit.airlines", "stores.spirit.com", "checkin.spirit.com"],
    "wawa.pi":                         ["wawa.com", "wawainc.com", "myperks.wawa.com"],}

VALUATION_PI = os.environ.get("FOUNDER_DOMAIN_VALUATION_PI", "1")

TOKENIZATION_BASE = os.environ.get("TOKENIZATION_BASE", "http://triumph-settlement-core:8089")
QUANTUM_BASE      = os.environ.get("QUANTUM_BASE", "http://triumph-quantum-fortress:8094")


def _canonical(value):
    if isinstance(value, dict):
        return {k: _canonical(value[k]) for k in sorted(value.keys())}
    if isinstance(value, list):
        return [_canonical(v) for v in value]
    return value


def _pq_sign(body: dict, *, timeout: int = 90) -> tuple[str, str]:
    payload = json.dumps(_canonical(body), separators=(",", ":"), ensure_ascii=False)
    req_body = json.dumps({"payload": payload, "encoding": "utf8"}).encode("utf-8")
    req = urllib.request.Request(
        f"{QUANTUM_BASE}/quantum/sign", data=req_body, method="POST",
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        result = json.loads(resp.read().decode("utf-8"))
    sig = result.get("signature") or result.get("sig") or ""
    pub = result.get("public_key") or result.get("publicKey") or result.get("pubkey") or ""
    if not sig or not pub:
        raise RuntimeError(f"quantum-fortress did not return sig+pub: {result}")
    return sig, pub


def post(path: str, body: dict, *, timeout: int = 60) -> tuple[int, dict]:
    url = f"{TOKENIZATION_BASE}{path}"
    sig, pub = _pq_sign(body)
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url, data=data, method="POST",
        headers={
            "Content-Type": "application/json",
            "User-Agent": "triumph-web3-domain-deed-tokenizer/1.0",
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
    except Exception as e:
        return 0, {"error": str(e)}


def deed_body_for(domain: str) -> dict:
    cascade = CASCADE.get(domain, [])
    cascade_str = ", ".join(cascade) if cascade else "(no Web1/Web2 surfaces)"
    legal_desc = (
        f"Sovereign Allodial Web3 Territory — {domain} — "
        f"Held in private capacity by {FOUNDER} ({PI_USERNAME}) jointly with "
        f"{COMPANY_NAME} under the Apex-Cascade Doctrine (Web3 → Web2 → Web1). "
        f"This Web3 namespace projects superior priority backwards over: "
        f"{cascade_str}. Bound to Pi Network blockchain, anchored on Stellar, "
        f"protected by 21-layer Quantum Fortress. Sovereign role: {SOVEREIGN_ROLE}."
    )
    return {
        "property": {
            "legalDescription": legal_desc,
            "country": "PI",                      # Pi Network sovereign jurisdiction
            "state":   "WEB3",
            "county":  "PI-NAME-SERVICE",
            "address": f"pi://{domain}",
            "company": COMPANY_NAME,
            "founder": FOUNDER,
            "domain":  domain,
            "cascade_over": cascade,
            "asking_price_usd": 0,                # not for sale
            "kind": "WEB3_DOMAIN_ALLODIAL",
        },
        "owner": {
            "piAddress":     FOUNDER_WALLET,
            "piUsername":    PI_USERNAME,
            "company":       COMPANY_NAME,
            "founder_role":  SOVEREIGN_ROLE,
            "ownershipModel": OWNERSHIP_MODEL,
        },
        "valuationPi": VALUATION_PI,
    }


def main() -> int:
    print(f"→ Founder:           {FOUNDER} ({PI_USERNAME})")
    print(f"→ Owner wallet:      {FOUNDER_WALLET}")
    print(f"→ Co-owner:          {COMPANY_NAME}")
    print(f"→ Tokenization base: {TOKENIZATION_BASE}")
    print(f"→ Domains to deed:   {len(DOMAINS)}")
    print()

    out: dict = {
        "company":         COMPANY_NAME,
        "founder":         FOUNDER,
        "owner_wallet":    FOUNDER_WALLET,
        "owner_username":  PI_USERNAME,
        "ownership_model": OWNERSHIP_MODEL,
        "sovereign_role":  SOVEREIGN_ROLE,
        "doctrine":        "APEX_CASCADE_WEB3_OVER_WEB2_OVER_WEB1",
        "deed_kind":       "WEB3_DOMAIN_ALLODIAL_PI721",
        "tokenized_at_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "deeds": {},
    }

    minted = 0
    skipped = 0
    failed: list[str] = []

    for i, domain in enumerate(DOMAINS, 1):
        print(f"[{i:2d}/{len(DOMAINS)}] {domain}")
        body = deed_body_for(domain)
        code, resp = post("/api/tokenize/deed", body, timeout=90)
        token = (resp.get("token") or {})
        tid = token.get("tokenId") or resp.get("tokenId")
        deed_no = token.get("deedNumber") or resp.get("deedNumber")
        pi_tx = token.get("blockchainTxHash") or resp.get("piBlockchainTx")
        stx = token.get("stellarTxHash") or resp.get("stellarAnchorTx")
        out["deeds"][domain] = {
            "http_status":      code,
            "token_id":         tid,
            "deed_number":      deed_no,
            "pi_blockchain_tx": pi_tx,
            "stellar_anchor_tx": stx,
            "cascade_over":     CASCADE.get(domain, []),
            "response":         resp,
        }
        if code == 201:
            minted += 1
            print(f"        → DEED MINTED  {deed_no}  tokenId={tid}")
            print(f"        → pi_tx        {pi_tx}")
            print(f"        → stellar_tx   {stx}")
        elif code == 409:
            skipped += 1
            print(f"        → already deeded (idempotent)  tokenId={tid}")
        else:
            failed.append(domain)
            print(f"        → HTTP {code} :: {resp}")
        time.sleep(0.4)  # gentle on Horizon

    out["summary"] = {
        "total":              len(DOMAINS),
        "deeds_minted":       minted,
        "already_deeded":     skipped,
        "failed":             failed,
    }

    out_path = Path(os.environ.get(
        "WEB3_DEEDS_FILE",
        str(Path(__file__).resolve().parent.parent / "legal" / "web3-domains-allodial-deeds.json"),
    ))
    try:
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(out, indent=2, ensure_ascii=False))
        print(f"\n✔ Wrote {out_path}")
    except PermissionError:
        # In container: dump to stdout for caller to capture
        print("\n--- WEB3_DEEDS_JSON_BEGIN ---")
        print(json.dumps(out, ensure_ascii=False))
        print("--- WEB3_DEEDS_JSON_END ---")

    print(f"\nSummary: minted={minted}  already={skipped}  failed={len(failed)}")
    return 0 if not failed else 1


if __name__ == "__main__":
    sys.exit(main())
