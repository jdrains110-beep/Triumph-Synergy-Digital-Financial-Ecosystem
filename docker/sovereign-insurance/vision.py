"""Sovereign Vision Insurance — superior to VSP, EyeMed, Davis Vision."""
from _common import make_app

app = make_app(
    service_name="sovereign-vision-insurance",
    sector="vision",
    base_premium_per_pi_per_month=0.00021,
    risk_multiplier=0.80,
)
