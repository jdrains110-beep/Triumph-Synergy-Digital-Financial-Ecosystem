"""Sovereign Electric Utility — superior to GRU, FPL, Clay Electric, Duke Energy."""
from _common import make_app

PROVIDERS = [
    {"id": "gru", "name": "Gainesville Regional Utilities (GRU)", "region": "Gainesville, FL", "fuel_mix": "natural-gas+solar+biomass"},
    {"id": "fpl", "name": "Florida Power & Light (FPL)", "region": "Florida (statewide)", "fuel_mix": "natural-gas+solar+nuclear"},
    {"id": "clay-electric", "name": "Clay Electric Cooperative", "region": "North Central FL", "fuel_mix": "cooperative-wholesale"},
    {"id": "duke-fl", "name": "Duke Energy Florida", "region": "Central/North FL", "fuel_mix": "natural-gas+solar+nuclear"},
    {"id": "teco", "name": "Tampa Electric (TECO)", "region": "Tampa Bay, FL", "fuel_mix": "natural-gas+solar"},
    {"id": "jea", "name": "JEA", "region": "Jacksonville, FL", "fuel_mix": "natural-gas+solar"},
    {"id": "okefenoke-remc", "name": "Okefenoke REMC", "region": "SE Georgia / N FL", "fuel_mix": "cooperative"},
]

app = make_app(
    service_name="sovereign-electric",
    sector="electric",
    unit_name="kWh",
    rate_pi_per_unit=0.000095,
    base_fee_pi=0.85,
    providers=PROVIDERS,
)
