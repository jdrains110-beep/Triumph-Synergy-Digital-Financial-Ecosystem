"""Sovereign Gas Utility — superior to TECO Peoples Gas, FPU, Chesapeake Utilities."""
from _common import make_app

PROVIDERS = [
    {"id": "peoples-gas", "name": "TECO Peoples Gas", "region": "Florida"},
    {"id": "fpu", "name": "Florida Public Utilities (FPU)", "region": "Florida"},
    {"id": "chesapeake", "name": "Chesapeake Utilities", "region": "Florida / SE US"},
    {"id": "city-of-tallahassee-gas", "name": "City of Tallahassee Gas", "region": "Tallahassee, FL"},
    {"id": "infinite-energy", "name": "Infinite Energy", "region": "Florida"},
]

app = make_app(
    service_name="sovereign-gas",
    sector="gas",
    unit_name="therm",
    rate_pi_per_unit=0.0011,
    base_fee_pi=0.55,
    providers=PROVIDERS,
)
