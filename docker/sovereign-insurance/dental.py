"""Sovereign Dental Insurance — superior to Delta Dental, MetLife Dental."""
from _common import make_app

app = make_app(
    service_name="sovereign-dental-insurance",
    sector="dental",
    base_premium_per_pi_per_month=0.00028,
    risk_multiplier=0.85,
)
