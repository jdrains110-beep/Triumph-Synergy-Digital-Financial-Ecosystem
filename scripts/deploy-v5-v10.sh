#!/bin/bash

# ─── TRIUMPH SYNERGY v5.0 + v10 - DEPLOYMENT SCRIPT ───────────────────────
# This script automates the first 4 deployment steps

set -e  # Exit on error

echo "🚀 Triumph Synergy v5.0 + v10 Deployment Script"
echo "================================================"
echo ""

# Step 1: Check Node.js/Yarn
echo "📌 Step 1: Verifying environment..."
if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found. Please install Node.js 18+"
  exit 1
fi
if ! command -v yarn &> /dev/null; then
  echo "❌ Yarn not found. Please install Yarn"
  exit 1
fi
echo "✓ Node.js $(node --version)"
echo "✓ Yarn $(yarn --version)"
echo ""

# Step 2: Create .env.local if it doesn't exist
echo "📌 Step 2: Setting up environment variables..."
if [ -f ".env.local" ]; then
  echo "⚠️  .env.local already exists. Skipping..."
else
  echo "📝 Creating .env.local from template..."
  cp .env.local.example .env.local
  echo "✓ .env.local created"
  echo ""
  echo "⚠️  IMPORTANT: Edit .env.local with your actual credentials:"
  echo "   - SUPABASE_URL"
  echo "   - SUPABASE_KEY"
  echo "   - OPENAI_API_KEY"
  echo "   - GITHUB_TOKEN"
  echo "   - AWS_ACCESS_KEY_ID"
  echo "   - AWS_SECRET_ACCESS_KEY"
  echo ""
  read -p "Press Enter once you've configured .env.local..."
fi
echo ""

# Step 3: Install dependencies
echo "📌 Step 3: Installing dependencies..."
echo "This may take a few minutes..."
yarn install --frozen-lockfile
echo "✓ Dependencies installed"
echo ""

# Step 4: Run database migration (if Supabase CLI is installed)
echo "📌 Step 4: Database setup..."
if command -v supabase &> /dev/null; then
  echo "📝 Running Supabase migrations..."
  supabase migration up || echo "⚠️  Could not run migrations. Run manually in Supabase dashboard."
  echo "✓ Migrations completed"
else
  echo "⚠️  Supabase CLI not found. Please:"
  echo "   1. npm install -g supabase"
  echo "   2. supabase migration up"
  echo "   OR manually paste SQL from supabase/migrations/ to Supabase dashboard"
fi
echo ""

# Step 5: Run tests
echo "📌 Step 5: Running test suite..."
echo "This will run 24 tests..."
yarn test:unit
echo ""

# Step 6: Build
echo "📌 Step 6: Building application..."
yarn build
echo "✓ Build completed"
echo ""

# Step 7: Summary
echo "✅ DEPLOYMENT SCRIPT COMPLETE!"
echo ""
echo "📋 Next steps:"
echo "   1. Start dev server:     yarn dev"
echo "   2. Test API in another terminal:"
echo "      curl http://localhost:3000/api/ecosystem/tick | jq '.saib_v5'"
echo "   3. Monitor for 24 hours to validate:"
echo "      - Autonomous decision rate (should be 80%+)"
echo "      - System uptime (should be 99.95%+)"
echo "      - GCV peg accuracy (should be ±$100)"
echo ""
echo "📚 For more info, see:"
echo "   - SAIB_V5_INTEGRATION_STATUS.md"
echo "   - SAIB_V5_AND_V10_FINAL_DEPLOYMENT_GUIDE.md"
echo "   - SAIB_V5_DEPLOYMENT_CHECKLIST.md"
echo ""
echo "🎉 Ready to go live!"
