"""Sovereign Auto Insurance — superior to GEICO, Progressive, USAA."""
from _common import make_app

app = make_app(
    service_name="sovereign-auto-insurance",
    sector="auto",
    base_premium_per_pi_per_month=0.00052,
    risk_multiplier=1.05,
)
