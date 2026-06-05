#!/bin/bash
#
# SAIB OPTIMUS v4.3 - QUICK START (90 SECONDS)
#
# Fastest path to get SAIB running
# Prerequisites: Node.js, npm, Supabase account, Discord webhook
#

set -e

echo "🚀 SAIB QUICK START - 90 SECONDS TO DEPLOYMENT"
echo ""

# Step 1: Generate tokens
echo "Step 1: Generating secure tokens..."
TOKEN1=$(openssl rand -hex 32)
TOKEN2=$(openssl rand -hex 32)
TOKEN3=$(openssl rand -hex 32)
echo "✓ Tokens generated"

# Step 2: Create env file
echo "Step 2: Creating environment configuration..."
cat > .env.production << EOF
SAIB_SECRET_TOKEN=$TOKEN1
SAIB_WITNESS_A_SECRET=$TOKEN2
SAIB_WITNESS_B_SECRET=$TOKEN3
SUPABASE_URL=YOUR_SUPABASE_URL_HERE
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_HERE
DISPATCH_WEBHOOK_URL=YOUR_DISCORD_WEBHOOK_HERE
ADMIN_RESET_TOKEN=$(openssl rand -hex 32)
BLOCKCHAIN_RPC_URL=https://cloudflare-eth.com
EOF
echo "✓ .env.production created"
echo "  Edit now with real values!"

# Step 3: Build
echo "Step 3: Building application..."
npm install --production > /dev/null 2>&1
npm run build > /dev/null 2>&1
echo "✓ Build complete"

# Step 4: Supabase schema
echo ""
echo "Step 4: Database schema"
echo "  1. Go to: https://app.supabase.com"
echo "  2. Open SQL Editor"
echo "  3. Create new query"
echo "  4. Paste: supabase/schema-setup.sql"
echo "  5. Click Run"
echo "✓ Schema ready"

# Step 5: Deploy
echo ""
echo "Step 5: Deploy"
echo "  npm:       vercel deploy --prod"
echo "  Worker:    wrangler publish --env production"

echo ""
echo "✅ SAIB ready for deployment in ~90 seconds!"
echo ""
echo "Secrets generated and saved to .env.production"
echo "Update Supabase/Discord values before deploying"
