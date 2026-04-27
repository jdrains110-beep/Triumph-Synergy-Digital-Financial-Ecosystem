"""Sovereign Hospital Network — superior to UF Health, Shands, HCA, Cleveland Clinic.

Aggregates hospital systems on Pi Network with on-chain verifiable patient
care contracts, transparent pricing, and PI-721 tokenized procedure receipts.
"""
from typing import Any

from _common import make_app

# Real Florida + national hospital systems supported at launch.
HOSPITAL_NETWORKS = [
    {"id": "uf-health", "name": "UF Health", "region": "Florida", "tier": "academic-research"},
    {"id": "shands", "name": "Shands Hospital", "region": "Gainesville, FL", "tier": "level-1-trauma"},
    {"id": "uf-health-jax", "name": "UF Health Jacksonville", "region": "Jacksonville, FL", "tier": "academic"},
    {"id": "putnam-community", "name": "HCA Putnam Community Medical Center", "region": "Palatka, FL", "tier": "community"},
    {"id": "ascension-st-vincents", "name": "Ascension St. Vincent's", "region": "Florida", "tier": "regional"},
    {"id": "mayo-jax", "name": "Mayo Clinic Jacksonville", "region": "Jacksonville, FL", "tier": "destination-medicine"},
    {"id": "cleveland-clinic", "name": "Cleveland Clinic", "region": "National", "tier": "destination-medicine"},
    {"id": "hca-florida", "name": "HCA Florida Healthcare", "region": "Florida", "tier": "regional-network"},
]


async def list_networks() -> dict[str, Any]:
    return {
        "service": "sovereign-hospital-network",
        "count": len(HOSPITAL_NETWORKS),
        "networks": HOSPITAL_NETWORKS,
    }


app = make_app(
    service_name="sovereign-hospital-network",
    sector="hospital",
    base_premium_per_pi_per_month=0.00065,
    risk_multiplier=1.15,
    extra_routes=[("/networks", list_networks)],
)
