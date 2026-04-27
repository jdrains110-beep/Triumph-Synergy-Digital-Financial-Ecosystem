"""Sovereign Health Insurance — superior to BCBS, UnitedHealth, Aetna, Cigna."""
from _common import make_app

app = make_app(
    service_name="sovereign-health-insurance",
    sector="health",
    base_premium_per_pi_per_month=0.00072,
    risk_multiplier=1.25,
)
