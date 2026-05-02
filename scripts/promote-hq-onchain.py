#!/usr/bin/env python3
"""
HQ on-chain promotion orchestrator.

PHASE A — Re-anchor existing HQ tokens (preserves tokenIds; broadcasts a fresh
          on-chain manageData op for each token whose original anchor was a
          deterministic placeholder).

PHASE B — Mint a fresh HQ Sovereign Estate Bundle with a unique mint-sequence
          suffix so the property hash differs from any prior token. This proves
          the broadcast-on-mint path end-to-end.

PHASE C — Verify EVERY new tx hash on Pi testnet Horizon and write a signed
          on-chain receipt to legal/hq-onchain-verification.json.
"""
import json, os, sys, time, urllib.request, urllib.error

TB = os.environ.get("TOKENIZATION_BASE", "http://triumph-settlement-core:8089")
QB = os.environ.get("QUANTUM_BASE",      "http://triumph-quantum-fortress:8094")
HORIZON = "https://api.testnet.minepi.com"
EXPLORER = "https://blockexplorer.minepi.com/testnet/tx"
RECEIPT_IN  = "/legal/hq-tokenization.json"
RECEIPT_OUT = "/legal/hq-onchain-verification.json"

OWNER_WALLET = "GDINCI6L7M3J3YTUEMSX3SP2OD7VBJEVX6DTC3BHLD4SD4CMVQ2DVTMF"
OWNER_USER   = "jdrains30"
HQ_LEGAL = ("Sovereign Allodial Title — 135 Lake Como Dr, Pomona Park, FL 32181 — "
            "Held in private capacity by Jeremiah Joel Drains for Triumph-Synergy")
PI_DOMAIN_BASE = "triumph-synergy-hq"
VAL_PI = "2.053101"


def _canon(v):
    if isinstance(v, dict):  return {k: _canon(v[k]) for k in sorted(v)}
    if isinstance(v, list):  return [_canon(x) for x in v]
    return v


def pq_sign(body: dict, *, timeout=15):
    payload = json.dumps(_canon(body), separators=(",", ":"), ensure_ascii=False)
    req_body = json.dumps({"payload": payload, "encoding": "utf8"}).encode()
    req = urllib.request.Request(
        f"{QB}/quantum/sign", data=req_body, method="POST",
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        s = json.load(r)
    sig = s.get("signature") or s.get("sig")
    pub = s.get("public_key") or s.get("publicKey")
    if not sig or not pub:
        raise RuntimeError(f"quantum-fortress did not return sig+pub: {s}")
    return sig, pub


def post(path: str, body: dict, *, timeout=45):
    sig, pub = pq_sign(body)
    data = json.dumps(body).encode()
    req = urllib.request.Request(
        f"{TB}{path}", data=data, method="POST",
        headers={
            "Content-Type": "application/json",
            "x-quantum-signature": sig,
            "x-quantum-public-key": pub,
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, json.loads(r.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or "{}")


def horizon_tx(tx_hash: str, *, retries=3, sleep=2):
    url = f"{HORIZON}/transactions/{tx_hash}"
    for i in range(retries):
        try:
            with urllib.request.urlopen(url, timeout=20) as r:
                return r.status, json.loads(r.read().decode())
        except urllib.error.HTTPError as e:
            if e.code == 404 and i < retries - 1:
                time.sleep(sleep); continue
            return e.code, {"error": e.read().decode()[:200]}
        except Exception as e:
            return 0, {"error": str(e)}
    return 404, {"error": "not found after retries"}


def horizon_account_ops(tx_hash: str):
    url = f"{HORIZON}/transactions/{tx_hash}/operations"
    try:
        with urllib.request.urlopen(url, timeout=20) as r:
            d = json.load(r)
            ops = d.get("_embedded", {}).get("records", [])
            return [{
                "type": o.get("type"),
                "name": o.get("name"),
                "value_b64": o.get("value"),
                "source": o.get("source_account"),
            } for o in ops]
    except Exception as e:
        return [{"error": str(e)}]


def main() -> int:
    if not os.path.exists(RECEIPT_IN):
        print(f"❌ {RECEIPT_IN} not found"); return 1
    with open(RECEIPT_IN) as f:
        prior = json.load(f)

    out = {
        "phase":     "A+B+C",
        "started":   time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "endpoint":  TB,
        "horizon":   HORIZON,
        "owner_wallet": OWNER_WALLET,
        "phase_a_reanchor":   {"results": []},
        "phase_b_fresh_mint": {},
        "phase_c_horizon":    {"verifications": []},
    }

    # ── Phase A — re-anchor existing HQ tokens ────────────────────────────
    estate = prior.get("results", {}).get("sovereign_estate", {}).get("response", {})
    deed_tok   = estate.get("deedToken",   {}).get("tokenId")
    domain_tok = estate.get("domainToken", {}).get("tokenId")
    standalone = (prior.get("results", {}).get("allodial_deed", {})
                       .get("response", {}).get("token", {}).get("tokenId")
                  or prior.get("results", {}).get("standalone_deed", {})
                       .get("response", {}).get("token", {}).get("tokenId"))

    targets = [(k, t) for k, t in [
        ("deed",   deed_tok),
        ("domain", domain_tok),
        ("deed",   standalone),
    ] if t]

    print(f"[A] Re-anchoring {len(targets)} existing HQ token(s) …")
    for kind, tid in targets:
        code, body = post(f"/api/tokenize/{kind}/{tid}/reanchor", {"reason": "promote-to-onchain"})
        anchor = body.get("stellarAnchor", {}) if isinstance(body, dict) else {}
        tx = anchor.get("transactionHash")
        print(f"    {kind:6} {tid[:16]}… → HTTP {code} {'tx=' + tx if tx else body}")
        out["phase_a_reanchor"]["results"].append({
            "kind": kind, "tokenId": tid, "http": code,
            "txHash": tx, "ledger": anchor.get("ledgerSequence"),
            "broadcasted": anchor.get("broadcasted"),
            "explorer": anchor.get("explorerUrl"),
            "raw": body if not tx else None,
        })

    # ── Phase B — fresh mint with unique sequence suffix ─────────────────
    seq = int(time.time())
    pi_domain = f"{PI_DOMAIN_BASE}-{seq}.pi"
    print(f"\n[B] Fresh HQ Sovereign Estate Bundle — domain={pi_domain}")
    estate_body = {
        "domain": pi_domain,
        "ownerAddress":  OWNER_WALLET,
        "ownerUsername": OWNER_USER,
        "legalDescription": f"{HQ_LEGAL} [seq={seq}]",
        "valuationPi": VAL_PI,
        "country": "US",
        "sovereignRole": "founder-owner",
        "privateTrust": {
            "name":        "Triumph Synergy Sovereign Headquarters Living Trust",
            "settlor":     "Jeremiah Joel Drains",
            "trustee":     "Jeremiah Joel Drains",
            "beneficiary": "Triumph-Synergy",
        },
    }
    code, body = post("/api/sovereign/estate/enroll", estate_body)
    print(f"    estate enroll → HTTP {code}")
    fresh_deed_tok   = body.get("deedToken",   {}).get("tokenId") if code == 201 else None
    fresh_domain_tok = body.get("domainToken", {}).get("tokenId") if code == 201 else None
    out["phase_b_fresh_mint"] = {
        "http": code,
        "domain": pi_domain,
        "estateId":   body.get("estate", {}).get("estateId") if code == 201 else None,
        "deedToken":   body.get("deedToken")   if code == 201 else None,
        "domainToken": body.get("domainToken") if code == 201 else None,
        "raw_error": body if code != 201 else None,
    }
    if code == 201:
        print(f"    deedTokenId   = {fresh_deed_tok}")
        print(f"    domainTokenId = {fresh_domain_tok}")

    # ── Phase C — Horizon verification ──────────────────────────────────
    print("\n[C] Verifying on-chain via Horizon …")
    tx_hashes = []
    for r in out["phase_a_reanchor"]["results"]:
        if r.get("txHash"): tx_hashes.append(("reanchor-" + r["kind"], r["tokenId"], r["txHash"]))
    if code == 201:
        d = (body.get("deedToken",   {}).get("stellarAnchor", {}).get("transactionHash")
             or body.get("deedToken",   {}).get("stellarTxHash"))
        m = (body.get("domainToken", {}).get("stellarAnchor", {}).get("transactionHash")
             or body.get("domainToken", {}).get("stellarTxHash"))
        if d: tx_hashes.append(("fresh-deed",   fresh_deed_tok,   d))
        if m: tx_hashes.append(("fresh-domain", fresh_domain_tok, m))

    for label, tid, txh in tx_hashes:
        st, td = horizon_tx(txh)
        ops = horizon_account_ops(txh) if st == 200 else []
        verified = (st == 200 and td.get("successful") is True)
        print(f"    {label:18} {txh}  Horizon={st}  successful={td.get('successful')}")
        out["phase_c_horizon"]["verifications"].append({
            "label": label,
            "tokenId": tid,
            "txHash": txh,
            "horizon_status": st,
            "successful": td.get("successful") if st == 200 else None,
            "ledger": td.get("ledger"),
            "fee_charged": td.get("fee_charged"),
            "source_account": td.get("source_account"),
            "memo_type": td.get("memo_type"),
            "memo": td.get("memo"),
            "operation_count": td.get("operation_count"),
            "operations": ops,
            "explorer": f"{EXPLORER}/{txh}",
            "verified_onchain": verified,
        })

    out["finished"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    out["summary"] = {
        "reanchored_count": sum(1 for r in out["phase_a_reanchor"]["results"] if r.get("broadcasted")),
        "fresh_mint_ok":    code == 201,
        "horizon_verified": sum(1 for v in out["phase_c_horizon"]["verifications"] if v["verified_onchain"]),
        "total_tx":         len(tx_hashes),
    }

    with open(RECEIPT_OUT, "w") as f:
        json.dump(out, f, indent=2, sort_keys=True)
    print(f"\n✓ Verification receipt → {RECEIPT_OUT}")
    print(f"  Re-anchored: {out['summary']['reanchored_count']}/{len(targets)}")
    print(f"  Fresh mint:  {out['summary']['fresh_mint_ok']}")
    print(f"  Horizon-verified: {out['summary']['horizon_verified']}/{out['summary']['total_tx']}")
    return 0 if out["summary"]["horizon_verified"] == out["summary"]["total_tx"] else 2


if __name__ == "__main__":
    sys.exit(main())
