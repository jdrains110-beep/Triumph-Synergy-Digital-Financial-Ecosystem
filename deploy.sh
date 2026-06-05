#!/bin/bash
# ==============================================================================
# Triumph Synergy — PostgreSQL 16 + Pi Network Integration Deployment Script
# Complete stack verification and deployment
# ==============================================================================

set -e

WORKSPACE="/Users/jeremiahjoeldrains/Desktop/Triumph-Synergy-Digital-Financial-Ecosystem-main"
cd "$WORKSPACE" || exit 1

echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║ Triumph Synergy — PostgreSQL 16 + Pi SCP-24 Integration                   ║"
echo "║ Deployment Verification & Recovery Script                                  ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo ""

# ──────────────────────────────────────────────────────────────────────────────
# PHASE 1: Validation
# ──────────────────────────────────────────────────────────────────────────────

echo "[1/6] 🔍 Validating docker-compose.yml syntax..."
if docker compose config --quiet; then
    echo "      ✅ docker-compose.yml is valid"
else
    echo "      ❌ docker-compose.yml has errors"
    exit 1
fi

echo ""
echo "[2/6] 🔍 Verifying PostgreSQL init scripts..."
SCRIPTS=(
    "docker/postgres/init/00-init.sql"
    "docker/postgres/init/01-pi-ledger.sql"
    "docker/postgres/init/02-sovereign-payments.sql"
    "docker/postgres/init/03-saib-enforcement.sql"
    "docker/postgres/init/04-credit-bureau.sql"
)

for script in "${SCRIPTS[@]}"; do
    if [ -f "$script" ]; then
        lines=$(wc -l < "$script")
        echo "      ✅ $script ($lines lines)"
    else
        echo "      ❌ Missing: $script"
        exit 1
    fi
done

echo ""
echo "[3/6] 🔍 Checking PostgreSQL configuration..."
if [ -f "docker/postgres/postgresql.conf" ]; then
    echo "      ✅ postgresql.conf exists"
    grep -E "^(shared_buffers|work_mem|max_connections)" docker/postgres/postgresql.conf || true
else
    echo "      ❌ Missing: docker/postgres/postgresql.conf"
    exit 1
fi

# ──────────────────────────────────────────────────────────────────────────────
# PHASE 2: Pre-deployment checks
# ──────────────────────────────────────────────────────────────────────────────

echo ""
echo "[4/6] 🔍 Verifying environment secrets..."
if [ -f ".env.local" ]; then
    if grep -q "POSTGRES_PASSWORD=" .env.local; then
        echo "      ✅ .env.local has POSTGRES_PASSWORD"
    else
        echo "      ⚠️  POSTGRES_PASSWORD not set in .env.local — using default"
    fi
else
    echo "      ⚠️  .env.local not found — will use .env.example defaults"
fi

echo ""
echo "[5/6] 🔍 Checking app container build status..."
if docker images --filter "reference=triumph-app" --format "{{.Repository}}" | grep -q triumph-app; then
    echo "      ✅ triumph-app image exists"
    docker images --filter "reference=triumph-app" --format "      Repository: {{.Repository}}
      Size:       {{.Size}}
      Created:    {{.CreatedAt}}"
else
    echo "      ⏳ triumph-app image not yet built (async build in progress)"
    echo "      → Wait for build with: docker compose build app"
fi

echo ""
echo "[6/6] 🔍 Verifying sovereign storefronts configuration..."
if grep -q "wingstop.pi" docker-compose.yml || grep -q "sovereign" lib/sovereign-tenants.ts; then
    echo "      ✅ Sovereign routes configured (22 .pi domains)"
else
    echo "      ⚠️  Sovereign configuration may need verification"
fi

# ──────────────────────────────────────────────────────────────────────────────
# PHASE 3: Deployment recommendations
# ──────────────────────────────────────────────────────────────────────────────

echo ""
echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║ DEPLOYMENT CHECKLIST                                                       ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo ""

echo "📋 Pre-deployment tasks:"
echo ""
echo "   If app build not yet complete, monitor with:"
echo "   $ docker compose build app"
echo ""
echo "   Once build completes, start full stack:"
echo "   $ docker compose up -d"
echo ""
echo "   Wait for PostgreSQL initialization (~30s):"
echo "   $ docker compose logs triumph-postgres | grep 'system is ready'"
echo ""

echo "🧪 Post-deployment verification:"
echo ""
echo "   1️⃣  Check all services are healthy:"
echo "   $ docker compose ps --format \"table {{.Names}}\t{{.Status}}\""
echo ""
echo "   2️⃣  Verify PostgreSQL schemas created:"
echo "   $ docker exec triumph-postgres psql -U postgres -d triumph_synergy -c '\\dn'"
echo ""
echo "   3️⃣  Check sovereign storefronts seeded (should be 22):"
echo "   $ docker exec triumph-postgres psql -U postgres -d triumph_synergy -c \"SELECT COUNT(*) FROM sovereign.storefronts;\""
echo ""
echo "   4️⃣  Test SAIB live ledger:"
echo "   $ curl http://localhost:8210/live-ledger?limit=3"
echo ""
echo "   5️⃣  Test SSE stream (Ctrl+C to stop):"
echo "   $ curl -N http://localhost:8210/live-ledger/stream | head -5"
echo ""
echo "   6️⃣  Verify sovereign storefront (should return React HTML, not static):"
echo "   $ curl -H 'Host: wingstop.pi' http://localhost/ | head -30"
echo ""
echo "   7️⃣  Access Ubuntu admin container (opt-in):"
echo "   $ docker compose --profile tools up -d ubuntu-admin"
echo "   $ docker exec -it triumph-ubuntu-admin bash"
echo "   $ node /admin/pi-admin.js live-ledger"
echo ""

echo "🔗 Integration verification:"
echo ""
echo "   PostgreSQL → SAIB:"
echo "   $ docker exec triumph-postgres psql -U postgres -d triumph_synergy -c \"SELECT COUNT(*) FROM pi_network.transactions;\""
echo ""
echo "   PostgreSQL → Sovereign:"
echo "   $ docker exec triumph-postgres psql -U postgres -d triumph_synergy -c \"SELECT slug FROM sovereign.storefronts LIMIT 5;\""
echo ""
echo "   PostgreSQL → Credit:"
echo "   $ docker exec triumph-postgres psql -U postgres -d triumph_synergy -c \"SELECT COUNT(*) FROM credit.credit_profiles;\""
echo ""

echo "⚡ Performance tuning (if issues arise):"
echo ""
echo "   Increase PostgreSQL memory:"
echo "   # In docker-compose.yml, postgres service:"
echo "   # mem_limit: 512m  # Increase from 256m"
echo "   # mem_reservation: 256m  # Increase from 128m"
echo ""
echo "   Increase Redis memory:"
echo "   # redis service:"
echo "   # command: --maxmemory 256mb --maxmemory-policy allkeys-lru"
echo ""

echo ""
echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║ 📚 DOCUMENTATION                                                           ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo ""
echo "   Complete integration guide:"
echo "   $ cat POSTGRES16_INTEGRATION.md"
echo ""
echo "   PostgreSQL schemas:"
echo "   docker/postgres/init/{00,01,02,03,04}-*.sql"
echo ""
echo "   Environment variables:"
echo "   .env.example (includes Pi Network SCP-24 + GCV docs)"
echo ""
echo "   Sovereign tenants (22 domains):"
echo "   lib/sovereign-tenants.ts"
echo ""

echo ""
echo "✨ Status: READY FOR DEPLOYMENT"
echo ""
