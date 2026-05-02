"""End-to-end smoke test for SWN + PPH (in-process, no docker)."""
from __future__ import annotations
import os, sys
ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.abspath(os.path.join(ROOT, "..", "docker", "sovereign-work-nexus")))
import main as swn  # noqa: E402
sys.path.pop(0)
sys.path.insert(0, os.path.abspath(os.path.join(ROOT, "..", "docker", "publix-phygital-hub")))
# Force a fresh import for PPH because both modules are named "main"
del sys.modules["main"]
import main as pph  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

async def fake_settle(payee, amount_pi, memo=""):
    return {"settled": True, "txid": "stub", "payee": payee, "amount_pi": amount_pi}
swn._settle_pi = fake_settle  # type: ignore[attr-defined]

cs = TestClient(swn.app)
cp = TestClient(pph.app)

def must(cond, label):
    print(f"  {'✔' if cond else '✘'} {label}")
    if not cond: sys.exit(1)

print("── SWN ────────────────────────────────────────")
r = cs.get("/health"); must(r.status_code == 200, "GET /health")
r = cs.get("/loopholes"); must(r.json()["count"] >= 50, f"loopholes={r.json()['count']}")
r = cs.post("/workers", json={"name": "Alice", "tier": "PIONEER", "country": "US",
                              "skills": ["python", "rust"], "pi_address": "GALICE"})
must(r.status_code == 200, "register pioneer worker"); wid = r.json()["worker_id"]
r = cs.post("/workers", json={"name": "Bob", "tier": "NON_PIONEER", "country": "GH",
                              "skills": ["mason"]})
must(r.status_code == 200, "register non-pioneer worker")
r = cs.post("/employers", json={"name": "Acme Corp", "country": "US"})
must(r.status_code == 200, "register employer"); eid = r.json()["employer_id"]
r = cs.post("/jobs", json={"employer_id": eid, "title": "Backend Engineer",
                            "rate_pi_per_hour": 0.5, "estimated_hours": 10})
must(r.status_code == 200, "post job"); jid = r.json()["job_id"]
# Wage-floor enforcement
r = cs.post("/jobs", json={"employer_id": eid, "title": "Sweatshop",
                            "rate_pi_per_hour": 0.001, "estimated_hours": 1})
must(r.status_code == 400, "wage floor enforced")
r = cs.post(f"/jobs/{jid}/apply", json={"worker_id": wid, "bid_pi_per_hour": 0.5})
must(r.status_code == 200, "apply to job")
r = cs.post("/contracts", json={"job_id": jid, "worker_id": wid, "hours": 10})
must(r.status_code == 200, "create contract"); cid = r.json()["contract_id"]
r = cs.post(f"/contracts/{cid}/release", json={"hours_worked": 5})
must(r.status_code == 200, "milestone release"); must(r.json()["released_pi"] == 2.5, f"released 2.5 Pi")
r = cs.get(f"/workers/{wid}/history")
must(r.json()["lifetime_pi_earned"] == 2.5, "lifetime Pi tracked")
r = cs.post("/swaa/report", json={"type": "wage_theft", "employer_id": eid, "details": "test"})
must(r.status_code == 200, "anti-trafficking report")

print("── PPH ────────────────────────────────────────")
r = cp.get("/health"); must(r.status_code == 200, "GET /health")
r = cp.get("/domains"); d = r.json()
must(d["apex"] == "publix.pi" and d["ledger"]["publix.pi"]["apex_priority"] == "ABSOLUTE",
     "publix.pi apex absolute")
must(d["ledger"]["publix.com"]["apex_priority"] == "DERIVED-FROM-WEB3",
     "publix.com derived from web3")
r = cp.get("/loopholes"); must(r.json()["count"] >= 25, f"loopholes={r.json()['count']}")
r = cp.post("/stores", json={"physical_address": "123 Main St", "city": "Lakeland",
                              "state": "FL", "country": "US"})
must(r.status_code == 200, "register store"); sid = r.json()["store_id"]
r = cp.post("/loyalty", json={"name": "Carol", "tier": "PIONEER", "pi_address": "GCAROL"})
must(r.status_code == 200, "loyalty join"); mid = r.json()["member_id"]
r = cp.post("/checkin", json={"store_id": sid, "member_id": mid, "reward_pi": 0.005})
must(r.status_code == 200 and r.json()["reward_pi"] == 0.005, "phygital QR check-in earns Pi")
r = cp.post("/checkout", json={"store_id": sid, "member_id": mid, "total_pi": 12.34,
                                "items": [{"sku": "milk", "qty": 2}]})
rec = r.json()["receipt"]
must(rec["interchange_fee_pi"] == 0.0, "0% interchange (vs Visa 2.9%)")
must(rec["settlement_window_s"] == 0, "T+0 settlement (vs Visa T+2)")

print("\nALL_OK ✅  SWN + PPH end-to-end smoke test passed.")
