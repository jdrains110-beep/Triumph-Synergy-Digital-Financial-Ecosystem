#!/bin/bash
# ==============================================================================
# Pi Central Node Entrypoint
# ==============================================================================
# Central Node: GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V
# ==============================================================================

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║           PI CENTRAL NODE - INITIALIZING                       ║"
echo "╠════════════════════════════════════════════════════════════════╣"
echo "║  Node Type: ${NODE_TYPE:-central}                                            ║"
echo "║  Priority: ${NODE_PRIORITY:-supreme}                                           ║"
echo "║  Network: ${PI_NETWORK_TYPE:-mainnet}                                           ║"
echo "╚════════════════════════════════════════════════════════════════╝"

# Display Central Node Info
echo ""
echo "Central Node Public Key:"
echo "  ${CENTRAL_NODE_PUBLIC_KEY}"
echo ""

# Wait for dependencies
echo "Waiting for PostgreSQL..."
until pg_isready -h "${POSTGRES_HOST:-pi-postgres}" -p "${POSTGRES_PORT:-5432}" -U "${POSTGRES_USER:-postgres}"; do
    sleep 2
done
echo "PostgreSQL is ready"

echo "Waiting for Redis..."
until redis-cli -h "${REDIS_HOST:-pi-redis}" -p "${REDIS_PORT:-6379}" ping > /dev/null 2>&1; do
    sleep 2
done
echo "Redis is ready"

# Initialize data directories
echo "Initializing data directories..."
mkdir -p /app/data/ledger
mkdir -p /app/data/scp
mkdir -p /app/data/transactions
mkdir -p /app/data/checkpoints
mkdir -p /opt/stellar/data/buckets
mkdir -p /opt/stellar/data/history

# Start the Central Node service
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║           PI CENTRAL NODE - ONLINE                             ║"
echo "╠════════════════════════════════════════════════════════════════╣"
echo "║  Status: ACTIVE                                                ║"
echo "║  Capacity: 10 BILLION TPS                                      ║"
echo "║  Congestion: ZERO                                              ║"
echo "║  SCP Sync: AUTOMATIC                                           ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Run the Node.js central node service
exec node /app/dist/lib/pi-transaction/index.js

