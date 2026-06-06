# SAIB Optimus v4.3 - EMERGENCY TROUBLESHOOTING GUIDE

**Status**: 🆘 Use this when things aren't working
**Goal**: Get back to operational within 15 minutes

---

## 🆘 EMERGENCY DECISION TREE

```
What's the problem?

├─ Endpoints returning 404
│  └─> PROBLEM 1: Deployment Failed
│
├─ Endpoints returning 500
│  └─> PROBLEM 2: Configuration Error
│
├─ No database records appearing
│  └─> PROBLEM 3: Database Disconnected
│
├─ Quantum Builder not diagnosing
│  └─> PROBLEM 4: Background Tasks Failing
│
├─ Webhook not firing
│  └─> PROBLEM 5: Webhook Configuration
│
├─ System stuck in degraded mode
│  └─> PROBLEM 6: Strategy Mutation Stuck
│
└─ Security/Auth failing
   └─> PROBLEM 7: Token Configuration
```

---

## PROBLEM 1: Endpoints Returning 404

**Symptoms**: 
- GET/POST to endpoints returns 404
- Endpoints don't exist or deployment failed

**Quick Fix (2 min)**:
```bash
# Verify deployment
vercel status          # Check Vercel deployment
wrangler status        # Check Cloudflare Worker status

# Re-deploy if needed
vercel deploy --prod   # Re-deploy Next.js
wrangler publish --env production  # Re-deploy Worker

# Verify endpoints exist
curl https://triumphsynergy.com/api/saib/quantum/health
curl https://triumphsynergy.com/api/saib/allodial/issue-deed
```

**If still failing**:
```bash
# Check route configuration
# For Next.js: Verify route.ts files in app/api/
# For Worker: Verify wrangler.toml routing

# Clear cache and rebuild
rm -rf .next
rm -rf node_modules
npm install --production
npm run build
vercel deploy --prod
```

**Nuclear Option** (Full redeploy):
```bash
# Start fresh
git status  # Verify on correct branch
npm install --production
npm run build
vercel redeploy  # Trigger fresh Vercel build
wrangler publish --env production --force
```

---

## PROBLEM 2: Endpoints Returning 500 (Server Error)

**Symptoms**:
- Endpoints return 500 Internal Server Error
- Configuration or environment variable issue

**Quick Fix (3 min)**:
```bash
# Check environment variables
cat .env.production | grep -E "SAIB|SUPABASE|DISPATCH"

# Verify all required vars are set
echo $SAIB_SECRET_TOKEN          # Should not be empty
echo $SUPABASE_URL                # Should not be empty
echo $SUPABASE_SERVICE_ROLE_KEY   # Should not be empty
```

**Debug 500 errors**:
```bash
# View Vercel logs
vercel logs

# View Cloudflare logs
wrangler tail --env production

# Test with verbose curl
curl -v https://triumphsynergy.com/api/saib/quantum/health

# Check response headers
curl -i https://triumphsynergy.com/api/saib/quantum/health
```

**Common causes**:
```bash
# 1. Missing SUPABASE variables
# Fix: Update .env.production with correct values
nano .env.production
vercel env pull  # If using Vercel env

# 2. Invalid authentication tokens
# Fix: Regenerate tokens
openssl rand -hex 32  # New token
# Update in Cloudflare Workers Settings → Environment Variables

# 3. Database not initialized
# Fix: Execute schema in Supabase
# Go to: https://app.supabase.com → SQL Editor → Execute schema-setup.sql
```

---

## PROBLEM 3: No Database Records Appearing

**Symptoms**:
- Can issue deeds but no records in Supabase
- Database not receiving data

**Quick Fix (2 min)**:
```bash
# Verify database connection
# In Supabase, run query:
SELECT COUNT(*) FROM allodial_land_deeds;

# Check if table exists
SELECT * FROM information_schema.tables 
WHERE table_name = 'allodial_land_deeds';

# View any errors
SELECT * FROM pg_stat_statements 
WHERE query LIKE '%allodial%';
```

**If table doesn't exist**:
```bash
# Re-execute schema
# Go to https://app.supabase.com → SQL Editor
# Paste: supabase/schema-setup.sql
# Click Run
```

**If connection failing**:
```bash
# Verify credentials in .env.production
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# Test connection manually
# Use Supabase client in local environment
# or test via API endpoint

# Check Supabase status
# Go to: https://status.supabase.com
```

**Debug INSERT operations**:
```bash
# Enable query logging in Cloudflare
# Check wrangler logs for Supabase errors
wrangler tail --env production | grep -i "supabase\|database\|insert"
```

---

## PROBLEM 4: Quantum Builder Not Diagnosing

**Symptoms**:
- GET /diagnostics returns empty or stale data
- Background diagnostics not running
- Strategy never changes

**Quick Fix (2 min)**:
```bash
# Check if background tasks executed
# Look at KV store
wrangler kv:key list --binding SAIB_BACKUP_KV --env production

# Verify KV binding exists
wrangler kv:namespace list

# Check for audit logs
wrangler kv:key list --binding SAIB_BACKUP_KV --env production | grep audit
```

**If no background execution**:
```bash
# Test process endpoint manually
curl -X POST https://triumphsynergy.com/api/saib/quantum/process \
  -H "X-SAIB-ID: DEBUG-001" \
  -H "Content-Type: application/json" \
  -d '{"domain":"test.pi","deedCertificateId":"DEBUG-TEST"}'

# Response should be 202 Accepted
# Check KV for audit logs shortly after

# If no response:
wrangler logs --env production
```

**Verify RPC endpoint**:
```bash
# Test blockchain RPC directly
curl -X POST https://cloudflare-eth.com \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# If RPC unreachable:
# Update BLOCKCHAIN_RPC_URL in .env.production
# Options: cloudflare-eth.com, eth.llamarpc.com, etc.
```

**Reset diagnostics state**:
```bash
# Clear KV state
wrangler kv:key delete ACTIVE_DYNAMIC_STRATEGY_FLAG --binding SAIB_BACKUP_KV --env production
wrangler kv:key delete MUTATION_FORCE_BACKOFF_MS --binding SAIB_BACKUP_KV --env production

# Or use admin endpoint
curl -X POST https://triumphsynergy.com/api/saib/quantum/admin/reset \
  -H "Authorization: Bearer $ADMIN_RESET_TOKEN"
```

---

## PROBLEM 5: Webhook Not Firing

**Symptoms**:
- No Discord alerts when corrections applied
- Webhook should fire on deed issuance

**Quick Fix (2 min)**:
```bash
# Test webhook manually
WEBHOOK_URL="your-discord-webhook-url"

curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"content":"Test webhook"}'

# If successful: Discord message appears
# If failed: Check webhook URL
```

**Verify webhook URL**:
```bash
# In Discord:
# 1. Server → Server Settings → Webhooks
# 2. Click your webhook
# 3. Copy webhook URL
# 4. Update DISPATCH_WEBHOOK_URL in Cloudflare settings

# Verify format
echo $DISPATCH_WEBHOOK_URL | grep -q "discord.com/api/webhooks"
```

**Check webhook permissions**:
```bash
# Discord webhook must have:
# ✓ Send Messages
# ✓ Embed Links
# ✓ Attach Files

# In Discord:
# 1. Webhook settings
# 2. Verify permissions are enabled
```

**Debug webhook dispatch**:
```bash
# Enable webhook logging in quantum-worker.ts
# Add console.log for webhook attempts

# View Cloudflare logs
wrangler tail --env production | grep -i "webhook\|dispatch\|alert"

# Check for network errors
wrangler tail --env production | grep -i "fetch\|error\|failed"
```

**Webhook URL changed**:
```bash
# If you changed Discord server or webhook:
# 1. Generate new webhook URL
# 2. Update in Cloudflare Workers Settings
# 3. Set DISPATCH_WEBHOOK_URL environment variable
# 4. Test with manual curl (see above)
```

---

## PROBLEM 6: System Stuck in Degraded Mode

**Symptoms**:
- Health score remains low
- Strategy stuck on degradation mode
- Won't return to optimal

**Quick Fix (1 min)**:
```bash
# Check current strategy
wrangler kv:key get ACTIVE_DYNAMIC_STRATEGY_FLAG \
  --binding SAIB_BACKUP_KV --env production

# Check health triggers
wrangler kv:key get MUTATION_FORCE_BACKOFF_MS \
  --binding SAIB_BACKUP_KV --env production

wrangler kv:key get MUTATION_LOCKDOWN_MODE \
  --binding SAIB_BACKUP_KV --env production
```

**Manual reset**:
```bash
# Option 1: Use admin endpoint (requires token)
curl -X POST https://triumphsynergy.com/api/saib/quantum/admin/reset \
  -H "Authorization: Bearer $ADMIN_RESET_TOKEN"

# Option 2: Delete KV keys manually
wrangler kv:key delete ACTIVE_DYNAMIC_STRATEGY_FLAG \
  --binding SAIB_BACKUP_KV --env production

wrangler kv:key delete MUTATION_FORCE_BACKOFF_MS \
  --binding SAIB_BACKUP_KV --env production

wrangler kv:key delete MUTATION_LOCKDOWN_MODE \
  --binding SAIB_BACKUP_KV --env production

wrangler kv:key delete MUTATION_FREEZE_PRICING_UPDATES \
  --binding SAIB_BACKUP_KV --env production

wrangler kv:key delete MUTATION_CONSENSUS_MODE \
  --binding SAIB_BACKUP_KV --env production
```

**Why it's stuck**:
```bash
# Check RPC health
curl -X POST https://cloudflare-eth.com \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Check R2 bucket
wrangler r2 bucket list

# Check Supabase connectivity
# Test from Supabase console

# If all healthy:
# System will auto-recover after TTL expiration (15-30 min)
# Or force recovery with admin reset
```

---

## PROBLEM 7: Security/Auth Failing

**Symptoms**:
- Unauthorized responses (401)
- Bearer token validation failing
- Admin reset returning 403

**Quick Fix (2 min)**:
```bash
# Check token format
echo $SAIB_SECRET_TOKEN | wc -c  # Should be 65+ (32 bytes hex = 64 chars)
echo $ADMIN_RESET_TOKEN | wc -c

# Verify Bearer token format
BEARER="Bearer $SAIB_SECRET_TOKEN"
echo $BEARER

# Test with bearer token
curl -X GET https://triumphsynergy.com/api/saib/quantum/health \
  -H "Authorization: $BEARER"
```

**If bearer token rejected**:
```bash
# Regenerate token
NEW_TOKEN=$(openssl rand -hex 32)
echo $NEW_TOKEN

# Update in Cloudflare Workers Settings
# Go to: Workers → Settings → Environment Variables
# Update SAIB_SECRET_TOKEN

# Wait 30 seconds for propagation
sleep 30

# Test again with new token
curl -X GET https://triumphsynergy.com/api/saib/quantum/health \
  -H "Authorization: Bearer $NEW_TOKEN"
```

**Admin endpoint returning 403**:
```bash
# Verify admin token
echo "Expected: $ADMIN_RESET_TOKEN"

# Test exact token match
ADMIN_TOKEN="your-token-here"
curl -X POST https://triumphsynergy.com/api/saib/quantum/admin/reset \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# If still 403:
# Token may have changed
# Update in Cloudflare environment variables
```

---

## 🚨 NUCLEAR OPTIONS (Last Resort)

### Option A: Full Reset (5 min)

```bash
# 1. Clear all KV state
wrangler kv:namespace list
wrangler kv:key delete $(wrangler kv:key list --binding SAIB_BACKUP_KV | awk '{print $1}')

# 2. Reset Supabase (if needed)
# Go to Supabase: Settings → Delete Project (if starting fresh)

# 3. Re-execute schema
# SQL Editor: Execute supabase/schema-setup.sql

# 4. Redeploy applications
git pull origin feat/saib-nano-sovereign-self-awareness
npm install --production
npm run build
vercel deploy --prod
wrangler publish --env production --force
```

### Option B: Emergency Maintenance Mode (3 min)

```bash
# Set all systems to emergency safe mode
wrangler kv:key put ACTIVE_DYNAMIC_STRATEGY_FLAG "EMERGENCY_SAFE_MODE"

# Disable automatic corrections temporarily
wrangler kv:key put MUTATION_FREEZE_PRICING_UPDATES "TRUE"
wrangler kv:key put MUTATION_LOCKDOWN_MODE "TRUE"

# This gives you time to investigate without automatic mutations
# Manually reset when ready with admin endpoint
```

### Option C: Rollback (2 min)

```bash
# If recent deploy broke things:
git checkout HEAD~1  # Go back 1 commit
npm run build
vercel deploy --prod
wrangler publish --env production

# Investigate issue in rolled-back version
# Then push fix to new commit
```

---

## 🆘 IF ALL ELSE FAILS

**Emergency Contacts & Resources**:

1. **Check System Status**
   - Supabase: https://status.supabase.com
   - Cloudflare: https://www.cloudflarestatus.com
   - Vercel: https://www.vercelstatus.com
   - GitHub: https://www.githubstatus.com

2. **Review Logs**
   ```bash
   # Vercel logs
   vercel logs
   
   # Cloudflare logs
   wrangler tail --env production
   
   # Supabase logs
   # Go to: https://app.supabase.com → Logs
   ```

3. **Check Configuration**
   ```bash
   # Environment variables
   cat .env.production | grep -E "^[A-Z]"
   
   # Vercel settings
   vercel env pull
   
   # Cloudflare settings
   wrangler secret list
   ```

4. **Manual Verification**
   ```bash
   # Each component independently
   
   # Database
   # Go to: https://app.supabase.com → SQL Editor
   # Run: SELECT * FROM allodial_land_deeds LIMIT 1;
   
   # KV Store
   # Run: wrangler kv:key list --binding SAIB_BACKUP_KV
   
   # R2 Bucket
   # Run: wrangler r2 object list saib-vault-production
   
   # RPC Endpoint
   # Run: curl https://cloudflare-eth.com (POST)
   ```

5. **Contact Support**
   - Supabase: https://supabase.com/support
   - Cloudflare: https://support.cloudflare.com
   - Vercel: https://vercel.com/support

---

## ✅ VERIFICATION CHECKLIST

After troubleshooting, verify everything works:

- [ ] Health endpoint returns 200
- [ ] Diagnostics endpoint returns data
- [ ] Process endpoint returns 202
- [ ] Database receiving records
- [ ] Webhook firing on alerts
- [ ] Strategy flag updatable
- [ ] Admin reset working
- [ ] Tests passing (run `./verify-saib-system.sh`)

---

**Remember**: Most issues resolve within 5 minutes with proper diagnosis.

**Keep this guide handy. You've got this. 🚀**
