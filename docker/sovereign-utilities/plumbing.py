"""Sovereign Plumbing Marketplace — superior to Roto-Rooter, Mr. Rooter, Benjamin Franklin."""
from _common import make_app

PROVIDERS = [
    {"id": "roto-rooter", "name": "Roto-Rooter", "region": "National"},
    {"id": "mr-rooter", "name": "Mr. Rooter Plumbing", "region": "National"},
    {"id": "benjamin-franklin", "name": "Benjamin Franklin Plumbing", "region": "National"},
    {"id": "ars-rescue-rooter", "name": "ARS / Rescue Rooter", "region": "National"},
    {"id": "local-master-plumber", "name": "Local Licensed Master Plumber Network", "region": "Local"},
    {"id": "florida-plumbing-coop", "name": "Florida Plumbing Cooperative", "region": "Florida"},
]

app = make_app(
    service_name="sovereign-plumbing",
    sector="plumbing",
    unit_name="service-call",
    rate_pi_per_unit=42.0,
    base_fee_pi=8.5,
    providers=PROVIDERS,
)
