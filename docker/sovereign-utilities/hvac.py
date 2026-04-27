"""Sovereign HVAC Marketplace — superior to Trane, Carrier, Lennox dealer networks."""
from _common import make_app

PROVIDERS = [
    {"id": "trane-dealers", "name": "Trane Authorized Dealers", "region": "National"},
    {"id": "carrier-dealers", "name": "Carrier Factory Authorized Dealers", "region": "National"},
    {"id": "lennox-dealers", "name": "Lennox Premier Dealers", "region": "National"},
    {"id": "ars-hvac", "name": "ARS / Rescue Rooter HVAC", "region": "National"},
    {"id": "one-hour-air", "name": "One Hour Heating & Air Conditioning", "region": "National"},
    {"id": "florida-hvac-coop", "name": "Florida HVAC Cooperative", "region": "Florida"},
    {"id": "local-licensed-hvac", "name": "Local Licensed HVAC Contractor Network", "region": "Local"},
]

app = make_app(
    service_name="sovereign-hvac",
    sector="hvac",
    unit_name="service-call",
    rate_pi_per_unit=58.0,
    base_fee_pi=12.0,
    providers=PROVIDERS,
)
