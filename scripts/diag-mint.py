#!/usr/bin/env python3
"""Diagnostic: mint a fresh deed to trigger broadcaster and surface the Horizon error."""
import urllib.request, urllib.error, json, time, sys

QB = "http://triumph-quantum-fortress:8094"
TB = "http://triumph-settlement-core:8089"

def _canon(v):
    if isinstance(v, dict): return {k:_canon(v[k]) for k in sorted(v)}
    if isinstance(v, list): return [_canon(x) for x in v]
    return v

body = {
    "property": {
        "legalDescription": "DIAGTEST " + str(time.time()),
        "address": {"street": "TEST", "city": "TEST", "state": "FL", "zip": "00000"},
        "valuationPi": "1.0",
        "marketValueUsd": "1",
        "jurisdiction": "US",
    },
    "owner": {
        "piAddress": "GDINCI6L7M3J3YTUEMSX3SP2OD7VBJEVX6DTC3BHLD4SD4CMVQ2DVTMF",
        "piUsername": "jdrains30",
    },
}
payload = json.dumps(_canon(body), separators=(",",":"), ensure_ascii=False)
data = json.dumps(body).encode()

sig_payload = json.dumps({"payload": payload, "encoding": "utf8"}).encode()
sreq = urllib.request.Request(QB + "/quantum/sign", data=sig_payload, method="POST",
                              headers={"Content-Type": "application/json"})
with urllib.request.urlopen(sreq, timeout=30) as r:
    s = json.load(r)
sig = s.get("signature") or s.get("sig")
pub = s.get("public_key") or s.get("publicKey")
print("sig?", bool(sig), "pub?", bool(pub))

req = urllib.request.Request(TB + "/api/tokenize/deed", data=data, method="POST",
                             headers={"Content-Type": "application/json",
                                      "x-quantum-signature": sig or "",
                                      "x-quantum-public-key": pub or ""})
try:
    with urllib.request.urlopen(req, timeout=30) as r:
        print("OK", r.status, r.read()[:400].decode())
except urllib.error.HTTPError as e:
    print("ERR", e.code, e.read()[:400].decode())
