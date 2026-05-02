"""End-to-end smoke test for Sovereign Gaming Nexus.

Boots SGN main:app via FastAPI's TestClient (no docker required), monkeypatching
the Pi settlement + quantum shield outbound calls so we exercise SGN's logic in
isolation. Runs the complete studio onboarding → earn → payroll flow.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import sys
import time
import uuid

# Make sure the SGN service module is importable
ROOT = os.path.dirname(os.path.abspath(__file__))
SGN_DIR = os.path.join(ROOT, "..", "docker", "sovereign-gaming-nexus")
sys.path.insert(0, os.path.abspath(SGN_DIR))

# Force admin token + auto-approve so the test runs hands-free
os.environ["SGN_ONBOARDING_AUTO_APPROVE"] = "false"
os.environ["SGN_ONBOARDING_ADMIN_TOKEN"] = "test-admin-secret"

import main as sgn  # noqa: E402

from fastapi.testclient import TestClient  # noqa: E402

# ── Stub outbound network calls ──────────────────────────────────────────────
async def _fake_settle_pi(payee, amount, memo=""):
    return {"settled": True, "txid": "stub-" + uuid.uuid4().hex[:12],
            "payee": payee, "amount": amount, "memo": memo}

sgn._settle_pi = _fake_settle_pi  # type: ignore[attr-defined]

client = TestClient(sgn.app)

def must(cond, label, extra=""):
    print(f"  {'✔' if cond else '✘'} {label} {extra}")
    if not cond:
        sys.exit(1)

print("── 1. Health & status ────────────────────────────────")
r = client.get("/health"); must(r.status_code == 200, "GET /health", r.status_code)
r = client.get("/status"); must(r.status_code == 200 and r.json().get("service"), "GET /status")
r = client.get("/loopholes"); must(r.status_code == 200 and r.json()["count"] >= 50, f"loophole count={r.json()['count']}")

print("── 2. Onboarding flow ────────────────────────────────")
r = client.post("/onboarding/apply", json={
    "studio_name": "Acme Royale Studios",
    "contact_email": "ops@acme.gg",
    "country": "US",
    "primary_titles": ["Acme Royale", "Acme Racer"],
    "engineer_headcount": 48,
    "pi_treasury_address": "GACMETREASURY",
})
must(r.status_code == 200, "POST /onboarding/apply", r.json())
apply_resp = r.json()
token = apply_resp["token"]
verification_code = apply_resp["verification_code_dev_only"]

r = client.post("/onboarding/verify", json={"token": token,
                                             "verification_code": verification_code})
must(r.status_code == 200 and r.json()["status"] == "pending_review", "POST /onboarding/verify")

r = client.post("/onboarding/approve",
                headers={"x-sgn-admin-token": "test-admin-secret"},
                json={"token": token})
must(r.status_code == 200 and r.json()["status"] == "secret_ready", "POST /onboarding/approve")
deliver_url = r.json()["secret_delivery_url"]
studio_id = r.json()["studio_id"]

r = client.get(deliver_url)
must(r.status_code == 200 and "hmac_secret" in r.json(), "GET /onboarding/secret")
hmac_secret = r.json()["hmac_secret"]
print(f"     studio_id={studio_id}  hmac_secret={hmac_secret[:12]}…")

# Second pickup must fail (one-time)
r2 = client.get(deliver_url)
must(r2.status_code == 410, "delivery token is single-use")

print("── 3. Title + player registration ────────────────────")
r = client.post("/titles", json={
    "studio_id": studio_id,
    "name": "Acme Royale",
    "earn_table": {"match_win": 1.5, "kill": 0.05, "objective": 0.3},
    "daily_player_cap_pi": 25.0,
})
must(r.status_code == 200, "POST /titles", r.json())
title_id = r.json()["title_id"]

r = client.post("/players", json={
    "pi_username": "alice_pi",
    "pi_address": "GALICEXYZ",
    "country": "US",
    "kyc_verified": True,
})
must(r.status_code == 200, "POST /players")
player_id = r.json()["player_id"]

print("── 4. Signed earn event ──────────────────────────────")
ts = int(time.time())
nonce = uuid.uuid4().hex
canonical_body = {
    "amount_pi": None,
    "match_id": "match-" + nonce[:8],
    "nonce": nonce,
    "player_id": player_id,
    "rule": "match_win",
    "studio_id": studio_id,
    "title_id": title_id,
    "ts": ts,
}
canonical = json.dumps(canonical_body, sort_keys=True, separators=(",", ":"))
# Match SGN's verifier: sha3_512(secret + "|" + canonical)[:96]
sig = hashlib.sha3_512((hmac_secret + "|" + canonical).encode()).hexdigest()[:96]

earn_payload = dict(canonical_body)
earn_payload["signature"] = sig
r = client.post("/earn", json=earn_payload)
must(r.status_code == 200 and r.json()["ok"], "POST /earn (signed)", r.text)
must(r.json()["lifetime_pi_earned"] > 0, "lifetime updated", r.json()["lifetime_pi_earned"])

# Replay must be rejected
r2 = client.post("/earn", json=earn_payload)
must(r2.status_code == 409, "replay rejected", r2.status_code)

print("── 5. Payroll rail ───────────────────────────────────")
r = client.post("/payroll/employers", json={
    "name": "Acme Studios HQ",
    "studio_id": studio_id,
    "pi_treasury_address": "GACMEHQ",
    "country": "US",
})
must(r.status_code == 200, "POST /payroll/employers")
employer_id = r.json()["employer_id"]

r = client.post("/payroll/employees", json={
    "employer_id": employer_id,
    "name": "Bob the Engineer",
    "role": "senior-engineer",
    "pi_address": "GBOBPAY",
    "rate_pi": 5.0,
    "cycle": "hourly",
    "country": "US",
    "kyc_verified": True,
})
must(r.status_code == 200, "POST /payroll/employees")

r = client.post("/payroll/deposit", json={"employer_id": employer_id, "amount_pi": 500.0})
must(r.status_code == 200, "POST /payroll/deposit")

r = client.post("/payroll/run", json={"employer_id": employer_id, "cycle": "hourly"})
must(r.status_code == 200 and r.json()["run"]["paid_count"] == 1, f"payroll run paid {r.json()['run']['paid_count']} engineer(s)")

print("\nALL_OK ✅  SGN end-to-end smoke test passed.")
