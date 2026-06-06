#!/bin/bash
set -e

# SAIB Optimus v4.3 - Domain Transfer & Cloudflare Workers Deployment
# Domain: triumphsynergy.com
# Target: Cloudflare Workers (full Next.js app)

echo "🚀 SAIB Optimus v4.3 - Full Deployment to Cloudflare"
echo "========================================================"
echo ""

# Step 1: Verify environment
echo "Step 1️⃣ Verifying environment..."
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler not found. Install with: npm install -g wrangler"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm not found."
    exit 1
fi

echo "✅ Wrangler and npm found"
echo ""

# Step 2: Verify Cloudflare login
echo "Step 2️⃣ Checking Cloudflare login..."
if ! wrangler whoami &> /dev/null; then
    echo "⏳ Not logged in. Opening Cloudflare login..."
    wrangler login
fi
echo "✅ Cloudflare authenticated"
echo ""

# Step 3: Create KV Namespace
echo "Step 3️⃣ Creating KV Namespace (SAIB Backups)..."
if wrangler kv:namespace create SAIB_BACKUP_KV --preview false 2>&1 | tee /tmp/kv-output.txt | grep -q "Successfully created"; then
    KV_ID=$(grep -oP 'id = "\K[^"]+' /tmp/kv-output.txt | head -1)
    echo "✅ KV Namespace created: $KV_ID"
    echo ""
    echo "⚠️  UPDATE REQUIRED:"
    echo "   Open: wrangler-nextjs.toml"
    echo "   Replace YOUR_KV_NAMESPACE_ID with: $KV_ID"
    echo ""
else
    echo "ℹ️  KV Namespace may already exist (checking...)"
fi
echo ""

# Step 4: Create R2 Bucket
echo "Step 4️⃣ Creating R2 Bucket (SAIB Vault)..."
if wrangler r2 bucket create saib-vault-production 2>&1 | grep -q "Successfully created"; then
    echo "✅ R2 Bucket created: saib-vault-production"
elif wrangler r2 bucket list 2>&1 | grep -q "saib-vault-production"; then
    echo "ℹ️  R2 Bucket already exists: saib-vault-production"
else
    echo "⚠️  R2 Bucket creation status unclear"
fi
echo ""

# Step 5: Set Secrets
echo "Step 5️⃣ Setting Cloudflare Secrets..."
echo ""
echo "You'll be prompted to enter the following secrets:"
echo "  1. SUPABASE_URL"
echo "  2. SUPABASE_ANON_KEY"
echo "  3. SUPABASE_SERVICE_ROLE_KEY"
echo "  4. REDIS_HOST"
echo "  5. REDIS_PORT"
echo ""

wrangler secret put SUPABASE_URL --env production
wrangler secret put SUPABASE_ANON_KEY --env production
wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env production
wrangler secret put REDIS_HOST --env production
wrangler secret put REDIS_PORT --env production

echo "✅ Secrets configured"
echo ""

# Step 6: Build Next.js
echo "Step 6️⃣ Building Next.js application..."
cd /Users/jeremiahjoeldrains/Desktop/Triumph-Synergy-Digital-Financial-Ecosystem-main
npm run build
echo "✅ Build complete"
echo ""

# Step 7: Deploy to Cloudflare Workers
echo "Step 7️⃣ Deploying to Cloudflare Workers..."
wrangler deploy --config wrangler-nextjs.toml --env production
WORKER_URL=$(wrangler deployments list --config wrangler-nextjs.toml 2>&1 | grep -oP 'https://[^/]+workers.dev' | head -1)
echo "✅ Deployed to: $WORKER_URL"
echo ""

# Step 8: Configure Domain in Cloudflare Dashboard
echo "Step 8️⃣ MANUAL STEP: Configure Domain in Cloudflare Dashboard"
echo "=============================================================="
echo ""
echo "1. Go to: https://dash.cloudflare.com"
echo "2. Add Site → Enter: triumphsynergy.com"
echo "3. Select: Standard (Free)"
echo "4. Click: Continue"
echo ""
echo "5. You'll see Cloudflare nameservers:"
echo "   NS1: blake.ns.cloudflare.com"
echo "   NS2: marjory.ns.cloudflare.com"
echo ""
echo "6. UPDATE NAMESERVERS AT VERCEL:"
echo "   - Go to: https://vercel.com/account/domains"
echo "   - Click: triumphsynergy.com"
echo "   - Auth Code: [your code from earlier]"
echo "   - Enter the Cloudflare nameservers above"
echo "   - Wait for propagation (1-4 hours typically)"
echo ""
echo "7. Once nameservers propagate, configure DNS in Cloudflare:"
echo "   DNS → Add Record:"
echo "   Type: CNAME | Name: @ | Target: $WORKER_URL | Proxy: ✓"
echo "   Type: CNAME | Name: www | Target: $WORKER_URL | Proxy: ✓"
echo ""
echo "8. Enable SSL/TLS:"
echo "   SSL/TLS → Overview → Select: Flexible"
echo "   SSL/TLS → Edge Certificates → Enable HSTS & Always HTTPS"
echo ""

echo "9. VERIFY DEPLOYMENT:"
read -p "Press Enter once nameservers have propagated and DNS is configured..."
echo ""

# Step 9: Verification
echo "Step 9️⃣ Verifying deployment..."
echo ""

# Test worker is responding
if curl -s -I https://${WORKER_URL#https://}/api/health | grep -q "200\|404"; then
    echo "✅ Worker is responding"
else
    echo "⚠️  Worker may not be responding (check logs with: wrangler tail)"
fi

# Test domain (if available)
if curl -s -I https://triumphsynergy.com/api/health 2>/dev/null | grep -q "200\|404"; then
    echo "✅ Domain is resolving"
else
    echo "⏳ Domain not yet resolving (may need time for propagation)"
fi

echo ""
echo "📋 Full System Verification:"
./verify-saib-system.sh

echo ""
echo "🎉 DEPLOYMENT COMPLETE!"
echo "=============================================================="
echo "Domain: https://triumphsynergy.com"
echo "Worker: $WORKER_URL"
echo "=============================================================="
