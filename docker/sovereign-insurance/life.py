"""Sovereign Life Insurance — superior to Prudential, MetLife, NY Life."""
from _common import make_app

app = make_app(
    service_name="sovereign-life-insurance",
    sector="life",
    base_premium_per_pi_per_month=0.00045,
    risk_multiplier=1.10,
)
