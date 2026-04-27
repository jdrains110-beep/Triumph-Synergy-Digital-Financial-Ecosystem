"""Sovereign Home Insurance — superior to State Farm, Allstate, Liberty Mutual."""
from _common import make_app

app = make_app(
    service_name="sovereign-home-insurance",
    sector="home",
    base_premium_per_pi_per_month=0.00038,
    risk_multiplier=0.95,
)
