#!/usr/bin/env python3
"""
apply_docker_fixes.py
=====================
Applies two permanent fixes to docker-compose.yml:

1. CPU REDUCTION  — caps total CPU budget at ~3.4 cores (Docker Desktop = 4 CPUs,
   leaving ~0.6 cores for the Docker VM, Pi Node desktop, and macOS itself).

2. QUANTUM SETUP  — ensures every applicable platform has:
   - QUANTUM_SHIELD_URL pointing to triumph-quantum-shield:8094
   - A service-specific PQ enforcement flag at the highest level
     (CRYSTALS-Kyber-1024 / Dilithium-5 / SPHINCS+-SHAKE-256f via NIST FIPS 203/204/205)
"""

import sys
import os

FILE = os.path.join(os.path.dirname(__file__), '..', 'docker-compose.yml')

with open(FILE, 'r') as f:
    content = f.read()

original = content
errors = []

def replace_once(old, new, label):
    global content
    if old not in content:
        errors.append(f"NOT FOUND [{label}]: {repr(old[:80])}")
        return False
    count = content.count(old)
    if count > 1:
        errors.append(f"AMBIGUOUS [{label}]: found {count} occurrences of {repr(old[:60])}")
        return False
    content = content.replace(old, new, 1)
    print(f"  OK  {label}")
    return True

# ===========================================================================
# PART 0: Add Docker Desktop recommendation to header
# ===========================================================================
replace_once(
    "#   Stop:     docker compose down\n# ==========================================================================",
    "#   Stop:     docker compose down\n#\n"
    "# RECOMMENDED DOCKER DESKTOP SETTINGS (macOS / Windows):\n"
    "#   CPUs:   4 minimum — total container CPU budget is ~3.4 cores\n"
    "#   Memory: 6 GB minimum, 8 GB recommended\n"
    "#   Swap:   2 GB\n"
    "#   Docker Desktop → Settings → Resources → Advanced\n"
    "# ==========================================================================",
    "header: Docker Desktop resource recommendation"
)

# ===========================================================================
# PART 1: CPU REDUCTIONS
# Current total: 7.00 cores → target: ~3.4 cores
# ===========================================================================
print("\n--- CPU reductions ---")

replace_once(
    "    container_name: triumph-postgres\n    <<: *common\n    mem_limit: 256m\n    mem_reservation: 128m\n    cpus: 0.4",
    "    container_name: triumph-postgres\n    <<: *common\n    mem_limit: 256m\n    mem_reservation: 128m\n    cpus: 0.20",
    "postgres 0.4→0.20"
)
replace_once(
    "    container_name: triumph-redis\n    <<: *common\n    mem_limit: 128m\n    mem_reservation: 64m\n    cpus: 0.2\n    oom_score_adj: -500          # Protect cache",
    "    container_name: triumph-redis\n    <<: *common\n    mem_limit: 128m\n    mem_reservation: 64m\n    cpus: 0.10\n    oom_score_adj: -500          # Protect cache",
    "redis 0.2→0.10"
)
replace_once(
    "    container_name: triumph-pi-bridge-connector\n    <<: *common\n    restart: on-failure:10            # override: stop crash-looping if Pi Node desktop is offline (prevents CPU storm)\n    mem_limit: 192m\n    mem_reservation: 96m\n    cpus: 0.2",
    "    container_name: triumph-pi-bridge-connector\n    <<: *common\n    restart: on-failure:10            # override: stop crash-looping if Pi Node desktop is offline (prevents CPU storm)\n    mem_limit: 192m\n    mem_reservation: 96m\n    cpus: 0.10",
    "pi-bridge-connector 0.2→0.10"
)
replace_once(
    "    container_name: triumph-central-node\n    <<: *common\n    mem_limit: 256m\n    mem_reservation: 128m\n    cpus: 0.4",
    "    container_name: triumph-central-node\n    <<: *common\n    mem_limit: 256m\n    mem_reservation: 128m\n    cpus: 0.20",
    "central-node 0.4→0.20"
)
replace_once(
    "    container_name: triumph-app\n    <<: *common\n    mem_limit: 384m\n    mem_reservation: 192m\n    cpus: 0.6",
    "    container_name: triumph-app\n    <<: *common\n    mem_limit: 384m\n    mem_reservation: 192m\n    cpus: 0.30",
    "app 0.6→0.30"
)
replace_once(
    "    container_name: triumph-transaction-engine\n    <<: *common\n    mem_limit: 128m\n    mem_reservation: 64m\n    cpus: 0.2\n    environment:\n      <<: [*db-env, *pi-env]\n      ENGINE_MODE: hyper",
    "    container_name: triumph-transaction-engine\n    <<: *common\n    mem_limit: 128m\n    mem_reservation: 64m\n    cpus: 0.10\n    environment:\n      <<: [*db-env, *pi-env]\n      ENGINE_MODE: hyper",
    "transaction-engine 0.2→0.10"
)
replace_once(
    "    container_name: triumph-vault\n    <<: *common\n    mem_limit: 128m\n    mem_reservation: 64m\n    cpus: 0.2\n    environment:\n      <<: [*db-env, *pi-env]\n      VAULT_MODE: trillion",
    "    container_name: triumph-vault\n    <<: *common\n    mem_limit: 128m\n    mem_reservation: 64m\n    cpus: 0.10\n    environment:\n      <<: [*db-env, *pi-env]\n      VAULT_MODE: trillion",
    "vault 0.2→0.10"
)
replace_once(
    "    container_name: triumph-smart-contracts\n    <<: *common\n    mem_limit: 128m\n    mem_reservation: 64m\n    cpus: 0.2\n    environment:\n      <<: [*db-env, *pi-env]\n      EXECUTION_CHANNELS: 10000",
    "    container_name: triumph-smart-contracts\n    <<: *common\n    mem_limit: 128m\n    mem_reservation: 64m\n    cpus: 0.10\n    environment:\n      <<: [*db-env, *pi-env]\n      EXECUTION_CHANNELS: 10000",
    "smart-contracts 0.2→0.10"
)
replace_once(
    "    container_name: triumph-scp-upgrader\n    <<: *common\n    mem_limit: 64m\n    mem_reservation: 32m\n    cpus: 0.2",
    "    container_name: triumph-scp-upgrader\n    <<: *common\n    mem_limit: 64m\n    mem_reservation: 32m\n    cpus: 0.08",
    "scp-upgrader 0.2→0.08"
)
replace_once(
    "    container_name: triumph-payment-processor\n    <<: *common\n    mem_limit: 96m\n    mem_reservation: 48m\n    cpus: 0.25",
    "    container_name: triumph-payment-processor\n    <<: *common\n    mem_limit: 96m\n    mem_reservation: 48m\n    cpus: 0.12",
    "payment-processor 0.25→0.12"
)
replace_once(
    "    container_name: triumph-nginx\n    <<: *common\n    mem_limit: 128m\n    mem_reservation: 32m\n    cpus: 0.2",
    "    container_name: triumph-nginx\n    <<: *common\n    mem_limit: 128m\n    mem_reservation: 32m\n    cpus: 0.10",
    "nginx 0.2→0.10"
)
replace_once(
    "    container_name: triumph-market-data\n    <<: *common\n    mem_limit: 96m\n    mem_reservation: 48m\n    cpus: 0.2\n    environment:\n      <<: [*db-env, *pi-env]\n      MARKET_POLL_MS: 5000",
    "    container_name: triumph-market-data\n    <<: *common\n    mem_limit: 96m\n    mem_reservation: 48m\n    cpus: 0.10\n    environment:\n      <<: [*db-env, *pi-env]\n      MARKET_POLL_MS: 5000",
    "market-data 0.2→0.10"
)
replace_once(
    "    container_name: triumph-blockchain-oracle\n    <<: *common\n    mem_limit: 96m\n    mem_reservation: 48m\n    cpus: 0.25",
    "    container_name: triumph-blockchain-oracle\n    <<: *common\n    mem_limit: 96m\n    mem_reservation: 48m\n    cpus: 0.12",
    "blockchain-oracle 0.25→0.12"
)
replace_once(
    "    container_name: triumph-compliance\n    <<: *common\n    mem_limit: 96m\n    mem_reservation: 48m\n    cpus: 0.25",
    "    container_name: triumph-compliance\n    <<: *common\n    mem_limit: 96m\n    mem_reservation: 48m\n    cpus: 0.12",
    "compliance 0.25→0.12"
)
replace_once(
    "    container_name: triumph-dex\n    <<: *common\n    mem_limit: 128m\n    mem_reservation: 64m\n    cpus: 0.2\n    environment:\n      <<: [*db-env, *pi-env]\n      DUAL_VALUE_URL: http://triumph-dual-value-engine:8093",
    "    container_name: triumph-dex\n    <<: *common\n    mem_limit: 128m\n    mem_reservation: 64m\n    cpus: 0.10\n    environment:\n      <<: [*db-env, *pi-env]\n      DUAL_VALUE_URL: http://triumph-dual-value-engine:8093",
    "dex 0.2→0.10"
)
replace_once(
    "    container_name: triumph-ml-engine\n    <<: *common\n    mem_limit: 384m\n    mem_reservation: 192m\n    cpus: 0.4",
    "    container_name: triumph-ml-engine\n    <<: *common\n    mem_limit: 384m\n    mem_reservation: 192m\n    cpus: 0.20",
    "ml-engine 0.4→0.20"
)
replace_once(
    "    container_name: triumph-credit-engine\n    <<: *common\n    mem_limit: 128m\n    mem_reservation: 64m\n    cpus: 0.2\n    environment:\n      <<: [*db-env, *pi-env]\n      PORT: \"8091\"",
    "    container_name: triumph-credit-engine\n    <<: *common\n    mem_limit: 128m\n    mem_reservation: 64m\n    cpus: 0.10\n    environment:\n      <<: [*db-env, *pi-env]\n      PORT: \"8091\"",
    "credit-engine 0.2→0.10"
)
replace_once(
    "    container_name: triumph-quantum-shield\n    <<: *common\n    mem_limit: 256m\n    mem_reservation: 128m\n    cpus: 0.25",
    "    container_name: triumph-quantum-shield\n    <<: *common\n    mem_limit: 256m\n    mem_reservation: 128m\n    cpus: 0.12",
    "quantum-shield 0.25→0.12"
)
replace_once(
    "    container_name: triumph-cloud-memory\n    <<: *common\n    mem_limit: 256m\n    mem_reservation: 96m\n    cpus: 0.2",
    "    container_name: triumph-cloud-memory\n    <<: *common\n    mem_limit: 256m\n    mem_reservation: 96m\n    cpus: 0.10",
    "cloud-memory 0.2→0.10"
)
replace_once(
    "    container_name: triumph-sovereign-gateway\n    <<: *common\n    mem_limit: 192m\n    mem_reservation: 96m\n    cpus: 0.2",
    "    container_name: triumph-sovereign-gateway\n    <<: *common\n    mem_limit: 192m\n    mem_reservation: 96m\n    cpus: 0.10",
    "sovereign-gateway 0.2→0.10"
)
replace_once(
    "    container_name: triumph-dual-value-engine\n    <<: *common\n    mem_limit: 128m\n    mem_reservation: 64m\n    cpus: 0.2\n    environment:\n      PORT: \"8093\"",
    "    container_name: triumph-dual-value-engine\n    <<: *common\n    mem_limit: 128m\n    mem_reservation: 64m\n    cpus: 0.10\n    environment:\n      PORT: \"8093\"",
    "dual-value-engine 0.2→0.10"
)
replace_once(
    "    container_name: triumph-tokenization-engine\n    <<: *common\n    mem_limit: 128m\n    mem_reservation: 64m\n    cpus: 0.2\n    environment:\n      <<: [*db-env, *pi-env]\n      NODE_OPTIONS: \"--max-old-space-size=96\"\n      DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD:?POSTGRES_PASSWORD required}@triumph-postgres:5432/${POSTGRES_DB:-triumph_synergy}\n      TOKENIZATION_HMAC_KEY:",
    "    container_name: triumph-tokenization-engine\n    <<: *common\n    mem_limit: 128m\n    mem_reservation: 64m\n    cpus: 0.10\n    environment:\n      <<: [*db-env, *pi-env]\n      NODE_OPTIONS: \"--max-old-space-size=96\"\n      DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD:?POSTGRES_PASSWORD required}@triumph-postgres:5432/${POSTGRES_DB:-triumph_synergy}\n      TOKENIZATION_HMAC_KEY:",
    "tokenization-engine 0.2→0.10"
)
replace_once(
    "    container_name: triumph-prometheus\n    <<: *common\n    mem_limit: 128m\n    mem_reservation: 64m\n    cpus: 0.2\n    ports:\n      - \"9090:9090\"",
    "    container_name: triumph-prometheus\n    <<: *common\n    mem_limit: 128m\n    mem_reservation: 64m\n    cpus: 0.08\n    ports:\n      - \"9090:9090\"",
    "prometheus 0.2→0.08"
)
replace_once(
    "    container_name: triumph-postgres-exporter\n    <<: *common\n    mem_limit: 32m\n    mem_reservation: 16m\n    cpus: 0.1",
    "    container_name: triumph-postgres-exporter\n    <<: *common\n    mem_limit: 32m\n    mem_reservation: 16m\n    cpus: 0.05",
    "postgres-exporter 0.1→0.05"
)
replace_once(
    "    container_name: triumph-redis-exporter\n    <<: *common\n    mem_limit: 24m\n    mem_reservation: 12m\n    cpus: 0.1",
    "    container_name: triumph-redis-exporter\n    <<: *common\n    mem_limit: 24m\n    mem_reservation: 12m\n    cpus: 0.05",
    "redis-exporter 0.1→0.05"
)
replace_once(
    "    container_name: triumph-horizon-guardian\n    <<: *common\n    restart: on-failure:10            # override: stop looping if Pi Node desktop is offline\n    mem_limit: 128m\n    mem_reservation: 32m\n    cpus: 0.15",
    "    container_name: triumph-horizon-guardian\n    <<: *common\n    restart: on-failure:10            # override: stop looping if Pi Node desktop is offline\n    mem_limit: 128m\n    mem_reservation: 32m\n    cpus: 0.08",
    "horizon-guardian 0.15→0.08"
)
replace_once(
    "    container_name: triumph-judicial-monitor\n    <<: *common\n    mem_limit: 128m\n    mem_reservation: 64m\n    cpus: 0.2\n    environment:\n      <<: [*db-env, *pi-env]\n      SERVICE_NAME: judicial-monitor",
    "    container_name: triumph-judicial-monitor\n    <<: *common\n    mem_limit: 128m\n    mem_reservation: 64m\n    cpus: 0.08\n    environment:\n      <<: [*db-env, *pi-env]\n      SERVICE_NAME: judicial-monitor",
    "judicial-monitor 0.2→0.08"
)
replace_once(
    "    container_name: triumph-grafana\n    <<: *common\n    mem_limit: 128m\n    mem_reservation: 64m\n    cpus: 0.2\n    ports:\n      - \"3001:3000\"",
    "    container_name: triumph-grafana\n    <<: *common\n    mem_limit: 128m\n    mem_reservation: 64m\n    cpus: 0.08\n    ports:\n      - \"3001:3000\"",
    "grafana 0.2→0.08"
)
replace_once(
    "    container_name: triumph-health-governor\n    <<: *common\n    mem_limit: 64m\n    mem_reservation: 24m\n    cpus: 0.15",
    "    container_name: triumph-health-governor\n    <<: *common\n    mem_limit: 64m\n    mem_reservation: 24m\n    cpus: 0.08",
    "health-governor 0.15→0.08"
)
replace_once(
    "    container_name: triumph-network-sentinel\n    <<: *common\n    restart: on-failure:10            # override: don't crash-loop on network probe failures\n    mem_limit: 48m\n    mem_reservation: 16m\n    cpus: 0.1",
    "    container_name: triumph-network-sentinel\n    <<: *common\n    restart: on-failure:10            # override: don't crash-loop on network probe failures\n    mem_limit: 48m\n    mem_reservation: 16m\n    cpus: 0.05",
    "network-sentinel 0.1→0.05"
)
replace_once(
    "    container_name: triumph-qpu-bridge\n    <<: *common\n    mem_limit: 192m\n    mem_reservation: 96m\n    cpus: 0.2",
    "    container_name: triumph-qpu-bridge\n    <<: *common\n    mem_limit: 192m\n    mem_reservation: 96m\n    cpus: 0.10",
    "qpu-bridge 0.2→0.10"
)

# ===========================================================================
# PART 2: QUANTUM SETUP — add QUANTUM_SHIELD_URL + PQ enforce flags
# ===========================================================================
print("\n--- Quantum setup additions ---")

# --- central-node: add QUANTUM_SHIELD_URL + CENTRAL_NODE_REQUIRE_PQ_READY ---
replace_once(
    "      PI_NODE_VERSION_DISPLAY: \"5.4\"\n      DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD:?POSTGRES_PASSWORD required}@triumph-postgres:5432/${POSTGRES_DB:-triumph_synergy}\n    # Internal only — no host port exposure\n    expose:\n      - \"11625\"\n      - \"11626\"",
    "      PI_NODE_VERSION_DISPLAY: \"5.4\"\n      QUANTUM_SHIELD_URL: http://triumph-quantum-shield:8094\n      CENTRAL_NODE_REQUIRE_PQ_READY: \"true\"\n      DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD:?POSTGRES_PASSWORD required}@triumph-postgres:5432/${POSTGRES_DB:-triumph_synergy}\n    # Internal only — no host port exposure\n    expose:\n      - \"11625\"\n      - \"11626\"",
    "central-node: add QUANTUM_SHIELD_URL + CENTRAL_NODE_REQUIRE_PQ_READY"
)

# --- app: add QUANTUM_SHIELD_URL + APP_REQUIRE_PQ_SIGNATURE ---
replace_once(
    "      DUAL_VALUE_URL: http://triumph-dual-value-engine:8093\n    security_opt:",
    "      DUAL_VALUE_URL: http://triumph-dual-value-engine:8093\n      QUANTUM_SHIELD_URL: http://triumph-quantum-shield:8094\n      APP_REQUIRE_PQ_SIGNATURE: \"true\"\n    security_opt:",
    "app: add QUANTUM_SHIELD_URL + APP_REQUIRE_PQ_SIGNATURE"
)

# --- vault: add QUANTUM_SHIELD_URL + VAULT_REQUIRE_PQ_SIGNATURE (already has QUANTUM_ENCRYPTION) ---
replace_once(
    "      QUANTUM_ENCRYPTION: \"true\"\n      NODE_OPTIONS: \"--max-old-space-size=96\"\n      DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD:?POSTGRES_PASSWORD required}@triumph-postgres:5432/${POSTGRES_DB:-triumph_synergy}\n    volumes:\n      - triumph_vault_data:/app/data",
    "      QUANTUM_ENCRYPTION: \"true\"\n      QUANTUM_SHIELD_URL: http://triumph-quantum-shield:8094\n      VAULT_REQUIRE_PQ_SIGNATURE: \"true\"\n      NODE_OPTIONS: \"--max-old-space-size=96\"\n      DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD:?POSTGRES_PASSWORD required}@triumph-postgres:5432/${POSTGRES_DB:-triumph_synergy}\n    volumes:\n      - triumph_vault_data:/app/data",
    "vault: add QUANTUM_SHIELD_URL + VAULT_REQUIRE_PQ_SIGNATURE"
)

# --- smart-contracts: add SMART_CONTRACTS_REQUIRE_PQ_SIGNATURE after existing QUANTUM_SHIELD_URL ---
replace_once(
    "      QUANTUM_SHIELD_URL: http://triumph-quantum-shield:8094\n      PI_BRIDGE_URL: http://triumph-pi-bridge-connector:8092\n      CENTRAL_NODE_URL: http://triumph-central-node:11626",
    "      QUANTUM_SHIELD_URL: http://triumph-quantum-shield:8094\n      SMART_CONTRACTS_REQUIRE_PQ_SIGNATURE: \"true\"\n      PI_BRIDGE_URL: http://triumph-pi-bridge-connector:8092\n      CENTRAL_NODE_URL: http://triumph-central-node:11626",
    "smart-contracts: add SMART_CONTRACTS_REQUIRE_PQ_SIGNATURE"
)

# --- scp-upgrader: add QUANTUM_SHIELD_URL + SCP_REQUIRE_PQ_SIGNATURE ---
replace_once(
    "      NETWORK_TYPE: ${PI_NETWORK_MODE:-mainnet}\n      NODE_OPTIONS: \"--max-old-space-size=48\"\n    volumes:\n      - triumph_scp_data:/app/data",
    "      NETWORK_TYPE: ${PI_NETWORK_MODE:-mainnet}\n      NODE_OPTIONS: \"--max-old-space-size=48\"\n      QUANTUM_SHIELD_URL: http://triumph-quantum-shield:8094\n      SCP_REQUIRE_PQ_SIGNATURE: \"true\"\n    volumes:\n      - triumph_scp_data:/app/data",
    "scp-upgrader: add QUANTUM_SHIELD_URL + SCP_REQUIRE_PQ_SIGNATURE"
)

# --- market-data: add MARKET_DATA_REQUIRE_PQ_SIGNATURE after existing QUANTUM_SHIELD_URL ---
replace_once(
    "      QUANTUM_SHIELD_URL: http://triumph-quantum-shield:8094\n      STELLAR_HORIZON_URL: http://${PI_NODE_CONTAINER:-testnet2}:${PI_NODE_API_PORT:-8000}\n      PI_INTERNAL_RATE: \"314159.0\"\n      PI_EXTERNAL_RATE: \"314.159\"\n      PI_INTERNAL_MULTIPLIER: \"1000.0\"\n      NODE_OPTIONS: \"--max-old-space-size=64\"\n      DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD:?POSTGRES_PASSWORD required}@triumph-postgres:5432/${POSTGRES_DB:-triumph_synergy}\n    networks:\n      - triumph-net\n      - pi-bridge\n    depends_on:\n      postgres:\n        condition: service_healthy\n      redis:\n        condition: service_healthy\n    healthcheck:\n      test: [\"CMD\", \"curl\", \"-f\", \"http://localhost:8085/health\"]",
    "      QUANTUM_SHIELD_URL: http://triumph-quantum-shield:8094\n      MARKET_DATA_REQUIRE_PQ_SIGNATURE: \"true\"\n      STELLAR_HORIZON_URL: http://${PI_NODE_CONTAINER:-testnet2}:${PI_NODE_API_PORT:-8000}\n      PI_INTERNAL_RATE: \"314159.0\"\n      PI_EXTERNAL_RATE: \"314.159\"\n      PI_INTERNAL_MULTIPLIER: \"1000.0\"\n      NODE_OPTIONS: \"--max-old-space-size=64\"\n      DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD:?POSTGRES_PASSWORD required}@triumph-postgres:5432/${POSTGRES_DB:-triumph_synergy}\n    networks:\n      - triumph-net\n      - pi-bridge\n    depends_on:\n      postgres:\n        condition: service_healthy\n      redis:\n        condition: service_healthy\n    healthcheck:\n      test: [\"CMD\", \"curl\", \"-f\", \"http://localhost:8085/health\"]",
    "market-data: add MARKET_DATA_REQUIRE_PQ_SIGNATURE"
)

# --- blockchain-oracle: add ORACLE_REQUIRE_PQ_SIGNATURE after existing QUANTUM_SHIELD_URL ---
replace_once(
    "      QUANTUM_SHIELD_URL: http://triumph-quantum-shield:8094\n      STELLAR_HORIZON_URL: http://${PI_NODE_CONTAINER:-testnet2}:${PI_NODE_API_PORT:-8000}\n      PI_INTERNAL_RATE: \"314159.0\"\n      PI_EXTERNAL_RATE: \"314.159\"\n      PI_INTERNAL_MULTIPLIER: \"1000.0\"\n      NODE_OPTIONS: \"--max-old-space-size=64\"\n      DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD:?POSTGRES_PASSWORD required}@triumph-postgres:5432/${POSTGRES_DB:-triumph_synergy}\n    networks:\n      - triumph-net\n      - pi-bridge\n    depends_on:\n      postgres:\n        condition: service_healthy\n      redis:\n        condition: service_healthy\n      smart-contracts:\n        condition: service_healthy\n    healthcheck:\n      test: [\"CMD\", \"curl\", \"-f\", \"http://localhost:8086/health\"]",
    "      QUANTUM_SHIELD_URL: http://triumph-quantum-shield:8094\n      ORACLE_REQUIRE_PQ_SIGNATURE: \"true\"\n      STELLAR_HORIZON_URL: http://${PI_NODE_CONTAINER:-testnet2}:${PI_NODE_API_PORT:-8000}\n      PI_INTERNAL_RATE: \"314159.0\"\n      PI_EXTERNAL_RATE: \"314.159\"\n      PI_INTERNAL_MULTIPLIER: \"1000.0\"\n      NODE_OPTIONS: \"--max-old-space-size=64\"\n      DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD:?POSTGRES_PASSWORD required}@triumph-postgres:5432/${POSTGRES_DB:-triumph_synergy}\n    networks:\n      - triumph-net\n      - pi-bridge\n    depends_on:\n      postgres:\n        condition: service_healthy\n      redis:\n        condition: service_healthy\n      smart-contracts:\n        condition: service_healthy\n    healthcheck:\n      test: [\"CMD\", \"curl\", \"-f\", \"http://localhost:8086/health\"]",
    "blockchain-oracle: add ORACLE_REQUIRE_PQ_SIGNATURE"
)

# --- compliance: add QUANTUM_SHIELD_URL + COMPLIANCE_REQUIRE_PQ_SIGNATURE ---
replace_once(
    "      AML_THRESHOLD_PI: ${AML_THRESHOLD_PI:-10000}\n      BLOCKED_ADDRESSES: ${BLOCKED_ADDRESSES:-}\n      NODE_OPTIONS: \"--max-old-space-size=64\"\n      DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD:?POSTGRES_PASSWORD required}@triumph-postgres:5432/${POSTGRES_DB:-triumph_synergy}\n    networks:\n      - triumph-net\n    depends_on:\n      postgres:\n        condition: service_healthy\n      redis:\n        condition: service_healthy\n    healthcheck:\n      test: [\"CMD\", \"curl\", \"-f\", \"http://localhost:8087/health\"]",
    "      AML_THRESHOLD_PI: ${AML_THRESHOLD_PI:-10000}\n      BLOCKED_ADDRESSES: ${BLOCKED_ADDRESSES:-}\n      NODE_OPTIONS: \"--max-old-space-size=64\"\n      DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD:?POSTGRES_PASSWORD required}@triumph-postgres:5432/${POSTGRES_DB:-triumph_synergy}\n      QUANTUM_SHIELD_URL: http://triumph-quantum-shield:8094\n      COMPLIANCE_REQUIRE_PQ_SIGNATURE: \"true\"\n    networks:\n      - triumph-net\n    depends_on:\n      postgres:\n        condition: service_healthy\n      redis:\n        condition: service_healthy\n    healthcheck:\n      test: [\"CMD\", \"curl\", \"-f\", \"http://localhost:8087/health\"]",
    "compliance: add QUANTUM_SHIELD_URL + COMPLIANCE_REQUIRE_PQ_SIGNATURE"
)

# --- dex: add QUANTUM_SHIELD_URL + DEX_REQUIRE_PQ_SIGNATURE ---
replace_once(
    "      NODE_OPTIONS: \"--max-old-space-size=96\"\n      DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD:?POSTGRES_PASSWORD required}@triumph-postgres:5432/${POSTGRES_DB:-triumph_synergy}\n    networks:\n      - triumph-net\n    depends_on:\n      postgres:\n        condition: service_healthy\n      redis:\n        condition: service_healthy\n      market-data:\n        condition: service_healthy\n    healthcheck:\n      test: [\"CMD\", \"curl\", \"-f\", \"http://localhost:8088/health\"]",
    "      NODE_OPTIONS: \"--max-old-space-size=96\"\n      DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD:?POSTGRES_PASSWORD required}@triumph-postgres:5432/${POSTGRES_DB:-triumph_synergy}\n      QUANTUM_SHIELD_URL: http://triumph-quantum-shield:8094\n      DEX_REQUIRE_PQ_SIGNATURE: \"true\"\n    networks:\n      - triumph-net\n    depends_on:\n      postgres:\n        condition: service_healthy\n      redis:\n        condition: service_healthy\n      market-data:\n        condition: service_healthy\n    healthcheck:\n      test: [\"CMD\", \"curl\", \"-f\", \"http://localhost:8088/health\"]",
    "dex: add QUANTUM_SHIELD_URL + DEX_REQUIRE_PQ_SIGNATURE"
)

# --- ml-engine: add QUANTUM_SHIELD_URL + ML_REQUIRE_PQ_SIGNATURE ---
replace_once(
    "      DUAL_VALUE_URL: http://triumph-dual-value-engine:8093\n    expose:\n      - \"8090\"\n    networks:\n      - triumph-net\n    depends_on:\n      redis:\n        condition: service_healthy\n      market-data:\n        condition: service_healthy\n    healthcheck:\n      test: [\"CMD\", \"wget\", \"-qO-\", \"http://localhost:8090/health\"]",
    "      DUAL_VALUE_URL: http://triumph-dual-value-engine:8093\n      QUANTUM_SHIELD_URL: http://triumph-quantum-shield:8094\n      ML_REQUIRE_PQ_SIGNATURE: \"true\"\n    expose:\n      - \"8090\"\n    networks:\n      - triumph-net\n    depends_on:\n      redis:\n        condition: service_healthy\n      market-data:\n        condition: service_healthy\n    healthcheck:\n      test: [\"CMD\", \"wget\", \"-qO-\", \"http://localhost:8090/health\"]",
    "ml-engine: add QUANTUM_SHIELD_URL + ML_REQUIRE_PQ_SIGNATURE"
)

# --- credit-engine: add CREDIT_REQUIRE_PQ_SIGNATURE after existing QUANTUM_SHIELD_URL ---
replace_once(
    "      QUANTUM_SHIELD_URL: http://triumph-quantum-shield:8094\n      PI_INTERNAL_RATE: \"314159.0\"\n      PI_EXTERNAL_RATE: \"314.159\"\n      PI_INTERNAL_MULTIPLIER: \"1000.0\"\n      CREDIT_SANDBOX: \"true\"",
    "      QUANTUM_SHIELD_URL: http://triumph-quantum-shield:8094\n      CREDIT_REQUIRE_PQ_SIGNATURE: \"true\"\n      PI_INTERNAL_RATE: \"314159.0\"\n      PI_EXTERNAL_RATE: \"314.159\"\n      PI_INTERNAL_MULTIPLIER: \"1000.0\"\n      CREDIT_SANDBOX: \"true\"",
    "credit-engine: add CREDIT_REQUIRE_PQ_SIGNATURE"
)

# --- cloud-memory: add QUANTUM_SHIELD_URL + CLOUD_MEMORY_REQUIRE_PQ before volumes ---
replace_once(
    "      PI_INTERNAL_RATE: \"314159.0\"\n      PI_EXTERNAL_RATE: \"314.159\"\n      PI_INTERNAL_MULTIPLIER: \"1000.0\"\n    volumes:\n      - triumph_cloud_memory_backup:/backup\n    expose:\n      - \"8095\"",
    "      PI_INTERNAL_RATE: \"314159.0\"\n      PI_EXTERNAL_RATE: \"314.159\"\n      PI_INTERNAL_MULTIPLIER: \"1000.0\"\n      QUANTUM_SHIELD_URL: http://triumph-quantum-shield:8094\n      CLOUD_MEMORY_REQUIRE_PQ: \"true\"\n    volumes:\n      - triumph_cloud_memory_backup:/backup\n    expose:\n      - \"8095\"",
    "cloud-memory: add QUANTUM_SHIELD_URL + CLOUD_MEMORY_REQUIRE_PQ"
)

# --- sovereign-gateway: add SOVEREIGN_PQ_ENFORCE after existing QUANTUM_SHIELD_URL ---
replace_once(
    "      QUANTUM_SHIELD_URL: http://triumph-quantum-shield:8094\n    expose:\n      - \"8097\"",
    "      QUANTUM_SHIELD_URL: http://triumph-quantum-shield:8094\n      SOVEREIGN_PQ_ENFORCE: \"true\"\n    expose:\n      - \"8097\"",
    "sovereign-gateway: add SOVEREIGN_PQ_ENFORCE"
)

# --- dual-value-engine: add QUANTUM_SHIELD_URL + DUAL_VALUE_REQUIRE_PQ_SIGNATURE ---
replace_once(
    "      KYC_PREMIUM_PCT: \"0.05\"\n      PIONEER_PREMIUM_PCT: \"0.03\"\n    expose:\n      - \"8093\"",
    "      KYC_PREMIUM_PCT: \"0.05\"\n      PIONEER_PREMIUM_PCT: \"0.03\"\n      QUANTUM_SHIELD_URL: http://triumph-quantum-shield:8094\n      DUAL_VALUE_REQUIRE_PQ_SIGNATURE: \"true\"\n    expose:\n      - \"8093\"",
    "dual-value-engine: add QUANTUM_SHIELD_URL + DUAL_VALUE_REQUIRE_PQ_SIGNATURE"
)

# --- judicial-monitor: add QUANTUM_SHIELD_URL + JUDICIAL_REQUIRE_PQ_SIGNATURE ---
replace_once(
    "      SERVICE_NAME: judicial-monitor\n      SERVICE_PORT: \"8096\"\n      JUDICIAL_JURISDICTION: florida\n    ports:",
    "      SERVICE_NAME: judicial-monitor\n      SERVICE_PORT: \"8096\"\n      JUDICIAL_JURISDICTION: florida\n      QUANTUM_SHIELD_URL: http://triumph-quantum-shield:8094\n      JUDICIAL_REQUIRE_PQ_SIGNATURE: \"true\"\n    ports:",
    "judicial-monitor: add QUANTUM_SHIELD_URL + JUDICIAL_REQUIRE_PQ_SIGNATURE"
)

# --- qpu-bridge: add QPU_REQUIRE_PQ_SIGNATURE after existing QUANTUM_SHIELD_URL ---
replace_once(
    "      QUANTUM_SHIELD_URL: http://triumph-quantum-shield:8094\n      PI_INTERNAL_RATE: \"314159.0\"\n      PI_EXTERNAL_RATE: \"314.159\"\n      PI_INTERNAL_MULTIPLIER: \"1000.0\"\n      PI_SUPERNODE_ADDRESS: GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V\n      APP_URL: http://triumph-nginx:80",
    "      QUANTUM_SHIELD_URL: http://triumph-quantum-shield:8094\n      QPU_REQUIRE_PQ_SIGNATURE: \"true\"\n      PI_INTERNAL_RATE: \"314159.0\"\n      PI_EXTERNAL_RATE: \"314.159\"\n      PI_INTERNAL_MULTIPLIER: \"1000.0\"\n      PI_SUPERNODE_ADDRESS: GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V\n      APP_URL: http://triumph-nginx:80",
    "qpu-bridge: add QPU_REQUIRE_PQ_SIGNATURE"
)

# ===========================================================================
# WRITE OUTPUT
# ===========================================================================
if errors:
    print("\n\nERRORS:")
    for e in errors:
        print(f"  {e}")
    print("\nFile NOT written due to errors.")
    sys.exit(1)

with open(FILE, 'w') as f:
    f.write(content)

print(f"\n✓ All changes applied successfully. ({len(content) - len(original):+d} bytes)")

# Verify new CPU total
import re
cpus = re.findall(r'^\s+cpus:\s+([\d.]+)', content, re.MULTILINE)
total = sum(float(c) for c in cpus)
print(f"✓ New total CPU: {total:.2f} cores (was 7.00)")

# Count quantum shield references
qs_count = content.count('QUANTUM_SHIELD_URL:')
pq_count = content.count('REQUIRE_PQ') + content.count('PQ_ENFORCE') + content.count('REQUIRE_PQ_READY') + content.count('REQUIRE_PQ_SIGNATURE')
print(f"✓ QUANTUM_SHIELD_URL references: {qs_count}")
print(f"✓ PQ enforcement flags: {pq_count}")
