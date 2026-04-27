"""Sovereign Water Utility — superior to GRU Water, JEA Water, Clay County Utility Authority."""
from _common import make_app

PROVIDERS = [
    {"id": "gru-water", "name": "GRU Water Wastewater", "region": "Gainesville, FL"},
    {"id": "jea-water", "name": "JEA Water & Wastewater", "region": "Jacksonville, FL"},
    {"id": "ccua", "name": "Clay County Utility Authority", "region": "Clay County, FL"},
    {"id": "putnam-county-water", "name": "Putnam County Water", "region": "Putnam County, FL"},
    {"id": "city-of-palatka", "name": "City of Palatka Utilities", "region": "Palatka, FL"},
    {"id": "ocala-water", "name": "City of Ocala Water Resources", "region": "Ocala, FL"},
    {"id": "miami-dade-water", "name": "Miami-Dade Water and Sewer", "region": "Miami-Dade, FL"},
    {"id": "tampa-water", "name": "Tampa Water Department", "region": "Tampa, FL"},
]

app = make_app(
    service_name="sovereign-water",
    sector="water",
    unit_name="kgal",
    rate_pi_per_unit=0.0029,
    base_fee_pi=0.45,
    providers=PROVIDERS,
)
