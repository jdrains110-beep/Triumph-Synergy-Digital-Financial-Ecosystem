#!/usr/bin/env python3
# Batch mint .pi domains via Next.js /api/tokenization/domains (no PQ middleware).
import json, os, sys, time, urllib.error, urllib.request
from pathlib import Path

FOUNDER_WALLET = os.environ.get("TRIUMPH_FOUNDER_ADDRESS",
    "GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V")
PI_USERNAME    = "jdrains30"
COMPANY        = "Triumph Synergy"
FOUNDER        = "Jeremiah Joel Drains"
VALUATION_PI   = os.environ.get("FOUNDER_DOMAIN_VALUATION_PI", "1")
APP_BASE       = os.environ.get("APP_BASE", "http://triumph-app:3000")

DOMAINS = [
    "wingstop.pi","gru.pi","netjets.pi","sonnysbbq.pi","shands.pi",
    "ufhealth.pi","ufl.pi","putnamclerk.pi","checkbeck.pi",
    "daytonainternationalspeedway.pi","gracekennedy.pi","winnebago.pi",
    "palatkaha.pi","circuit7.pi","magellanjets.pi","rulonco.pi",
    "appleandeve.pi","seprod.pi","jamrockmart.pi",
]

CASCADE = {
    "wingstop.pi":["wingstop.com","order.wingstop.com"],
    "gru.pi":["gru.com.br","gruairport.com.br"],
    "netjets.pi":["netjets.com","owners.netjets.com"],
    "sonnysbbq.pi":["sonnysbbq.com","order.sonnysbbq.com"],
    "shands.pi":["shands.org"],
    "ufhealth.pi":["ufhealth.org","my.ufhealth.org"],
    "ufl.pi":["ufl.edu","one.ufl.edu"],
    "putnamclerk.pi":["putnam-fl.com","putnamclerk.com"],
    "checkbeck.pi":["checkbeck.com"],
    "daytonainternationalspeedway.pi":["daytonainternationalspeedway.com"],
    "gracekennedy.pi":["gracekennedy.com","gkfoods.com"],
    "winnebago.pi":["winnebago.com"],
    "palatkaha.pi":["palatkaha.com"],
    "circuit7.pi":["circuit7.org"],
    "magellanjets.pi":["magellanjets.com"],
    "rulonco.pi":["rulonco.com"],
    "appleandeve.pi":["appleandeve.com"],
    "seprod.pi":["seprod.com"],
    "jamrockmart.pi":["jamrockmart.com"],
}


def post(path: str, body: dict, timeout=60):
    data = json.dumps(body).encode()
    req = urllib.request.Request(f"{APP_BASE}{path}", data=data, method="POST",
        headers={"Content-Type":"application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, json.loads(r.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read().decode() or "{}")
        except Exception: return e.code, {"error": str(e)}


def main() -> int:
    print(f"→ App base:       {APP_BASE}")
    print(f"→ Founder wallet: {FOUNDER_WALLET}")
    print(f"→ Domains:        {len(DOMAINS)}")
    print()
    out = {"company":COMPANY,"founder":FOUNDER,"owner_wallet":FOUNDER_WALLET,
           "owner_username":PI_USERNAME,"valuation_pi":VALUATION_PI,
           "ownership_model":"JOINT_TRIUMPH_SYNERGY_AND_FOUNDER_100PCT_EACH",
           "tokenized_at_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
           "domains":{}}
    minted=skipped=0; failed=[]
    for i,d in enumerate(DOMAINS,1):
        body = {"domain":d, "ownerAddress":FOUNDER_WALLET, "ownerUsername":PI_USERNAME,
                "network":"mainnet", "valuationPi":VALUATION_PI}
        code, resp = post("/api/tokenization/domains", body)
        tok = (resp.get("token") or {})
        out["domains"][d] = {
            "http_status": code,
            "token_id":    tok.get("tokenId"),
            "pi_blockchain_tx":  resp.get("piBlockchainTx") or tok.get("blockchainTxHash"),
            "stellar_anchor_tx": resp.get("stellarAnchorTx") or tok.get("stellarTxHash"),
            "stellar_ledger":    tok.get("stellarLedgerSequence"),
            "fortress_score":    (tok.get("fortressProtection") or {}).get("score"),
            "cascade_over":      CASCADE.get(d, []),
        }
        if code == 201:
            minted += 1
            print(f"[{i:2d}/{len(DOMAINS)}] ✓ {d}")
            print(f"           tokenId={tok.get('tokenId')}")
            print(f"           pi_tx  ={resp.get('piBlockchainTx')}")
            print(f"           anchor ={resp.get('stellarAnchorTx')}")
        elif code == 409:
            skipped += 1
            print(f"[{i:2d}/{len(DOMAINS)}] = {d} already tokenized")
        else:
            failed.append(d)
            print(f"[{i:2d}/{len(DOMAINS)}] ✗ {d} HTTP {code} :: {resp}")
    out["summary"] = {"total":len(DOMAINS),"minted":minted,"already_tokenized":skipped,"failed":failed}
    out_path = Path(os.environ.get("FOUNDER_DOMAIN_RECEIPT_FILE","/tmp/founder-pi-domains-tokenization.json"))
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(out, indent=2, sort_keys=True))
    print(f"\n✓ Receipts → {out_path}")
    print(f"=== SUMMARY === minted={minted} already={skipped} failed={len(failed)} {failed}")
    return 0 if not failed else 1


if __name__ == "__main__":
    sys.exit(main())
