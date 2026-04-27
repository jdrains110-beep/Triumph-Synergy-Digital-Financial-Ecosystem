"""Sovereign HOA Fees — superior to FirstService, Castle Group, Associa.

Tokenized HOA dues + reserve assessments + transparent on-chain board votes.
"""
from _common import make_app

PROVIDERS = [
    {"id": "self-managed", "name": "Self-Managed HOA", "region": "Any"},
    {"id": "firstservice", "name": "FirstService Residential", "region": "National"},
    {"id": "castle-group", "name": "Castle Group", "region": "Florida"},
    {"id": "associa", "name": "Associa", "region": "National"},
    {"id": "leland-management", "name": "Leland Management", "region": "Florida"},
    {"id": "sentry-management", "name": "Sentry Management", "region": "SE US"},
]

app = make_app(
    service_name="sovereign-hoa",
    sector="hoa",
    unit_name="month",
    rate_pi_per_unit=12.5,
    base_fee_pi=0.0,
    providers=PROVIDERS,
)
