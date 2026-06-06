# Domain Transfer: triumphsynergy.com (Vercel → Cloudflare)

## Prerequisites ✅
- Authentication code from Vercel: `[YOUR_AUTH_CODE]`
- Cloudflare account created and logged in
- Wrangler CLI installed (`npm install -g wrangler`)
- Next.js app built and ready to deploy to Workers

---

## Step 1: Prepare Domain Transfer (Vercel Side)

### Get EPP Code from Vercel

1. Go to https://vercel.com/account/domains
2. Find **triumphsynergy.com**
3. Click the three-dot menu → **Transfer Out**
4. Click **Get Authorization Code** (this is your EPP/auth code)
5. Save the code: `YOUR_AUTH_CODE_HERE`

**Time: 2 minutes**

---

## Step 2: Add Domain to Cloudflare

### Register Domain in Cloudflare

1. Go to https://dash.cloudflare.com
2. Click **Add Site** (or **+ Add Account**)
3. Enter domain: `triumphsynergy.com`
4. Select **Standard** plan (free tier is fine for this)
5. Click **Continue**

**You'll see Cloudflare's nameservers:**
```
NS1: blake.ns.cloudflare.com
NS2: marjory.ns.cloudflare.com
```

**Save these nameservers!**

**Time: 3 minutes**

---

## Step 3: Complete Domain Transfer at Registrar

> **⚠️ Domain is currently with Vercel Domains (registrar). We need to authorize the transfer.**

### Option A: Transfer via Vercel Domains Registrar (Fastest)

1. Go to https://vercel.com/account/domains
2. Click **triumphsynergy.com**
3. Click **Transfer Domain** → **Transfer Out**
4. Paste your EPP/auth code: `YOUR_AUTH_CODE_HERE`
5. Follow Vercel's confirmation email
6. Update nameservers to Cloudflare:
   ```
   NS1: blake.ns.cloudflare.com
   NS2: marjory.ns.cloudflare.com
   ```
7. Wait for propagation (24-48 hours, usually 1-4 hours)

**Time: 5-10 minutes (+ propagation)**

---

## Step 4: Configure Cloudflare DNS for Workers

Once nameservers point to Cloudflare:

### Add A Record Pointing to Cloudflare Workers

1. In Cloudflare dashboard, go to **DNS** tab
2. Click **Add Record**
3. Set up:
   ```
   Type:     CNAME
   Name:     @ (for root domain)
   Target:   triumph-synergy-quantum.workers.dev
   Proxy:    ✓ Proxied (orange cloud)
   TTL:      Auto
   ```

4. For `www` subdomain:
   ```
   Type:     CNAME
   Name:     www
   Target:   triumph-synergy-quantum.workers.dev
   Proxy:    ✓ Proxied
   TTL:      Auto
   ```

**DNS Records should look like:**
```
CNAME  @    triumph-synergy-quantum.workers.dev  Proxied
CNAME  www  triumph-synergy-quantum.workers.dev  Proxied
```

**Time: 2 minutes**

---

## Step 5: Enable SSL/TLS in Cloudflare

1. Go to **SSL/TLS** tab in Cloudflare dashboard
2. Under **Overview**, select **Flexible** (Cloudflare handles HTTPS)
3. Go to **Edge Certificates**
4. Enable:
   - ✓ **Always Use HTTPS**
   - ✓ **HTTP Strict Transport Security (HSTS)**
   - ✓ **Minimum TLS Version**: TLS 1.2

**Time: 2 minutes**

---

## Step 6: Deploy Next.js to Cloudflare Workers

```bash
#!/bin/bash
set -e

cd /Users/jeremiahjoeldrains/Desktop/Triumph-Synergy-Digital-Financial-Ecosystem-main

# Ensure Wrangler is logged in
wrangler login

# Create KV Namespace (for SAIB backups)
echo "📦 Creating KV Namespace..."
KV_ID=$(wrangler kv:namespace create SAIB_BACKUP_KV --preview false | grep -oP 'Successfully created.*: \K[\da-f-]+' || echo "YOUR_KV_ID")
echo "KV Namespace ID: $KV_ID"
echo "^ Update this in wrangler-nextjs.toml"

# Create R2 Bucket (for SAIB vault)
echo "📦 Creating R2 Bucket..."
wrangler r2 bucket create saib-vault-production

# Set secrets
echo "🔐 Setting Cloudflare secrets..."
wrangler secret put SUPABASE_URL --env production
# Paste: https://jflxtvccztqtxtekccsf.supabase.co

wrangler secret put SUPABASE_ANON_KEY --env production
# Paste: your anon key

wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env production
# Paste: your service role key

wrangler secret put REDIS_HOST --env production
# Paste: 127.0.0.1

wrangler secret put REDIS_PORT --env production
# Paste: 6379

# Build and deploy
echo "🚀 Building Next.js..."
npm run build

echo "🚀 Deploying to Cloudflare Workers..."
wrangler deploy --config wrangler-nextjs.toml --env production

echo "✅ Deployment complete!"
echo "Domain: https://triumphsynergy.com"
echo "Worker URL: https://triumph-synergy-quantum.workers.dev"
```

**Time: 5-10 minutes**

---

## Step 7: Verify Domain & SSL

```bash
# Test domain is resolving
nslookup triumphsynergy.com
# Should show Cloudflare nameservers

# Test HTTPS works
curl -I https://triumphsynergy.com
# Should show: HTTP/2 200 (SSL working)

# Test API endpoint
curl https://triumphsynergy.com/api/health

# Run full verification
./verify-saib-system.sh
# Enter: https://triumphsynergy.com
```

**Time: 2 minutes**

---

## Timeline Summary

| Step | Task | Time | Status |
|------|------|------|--------|
| 1 | Get EPP code from Vercel | 2 min | ⏳ Ready |
| 2 | Add domain to Cloudflare | 3 min | ⏳ Ready |
| 3 | Complete transfer at registrar | 5-10 min + propagation | ⏳ Ready |
| 4 | Configure DNS in Cloudflare | 2 min | ⏳ After propagation |
| 5 | Enable SSL/TLS | 2 min | ⏳ After propagation |
| 6 | Deploy to Workers | 5-10 min | ⏳ Ready |
| 7 | Verify domain & SSL | 2 min | ⏳ Final |

**Total Active Time: ~20-30 minutes**
**Total Wait Time: 24-48 hours (DNS propagation)**

---

## Important Notes

- **DNS Propagation**: May take 1-48 hours. Cloudflare usually updates within 1-4 hours.
- **Worker URL**: Your app will be live at `triumph-synergy-quantum.workers.dev` immediately (before domain transfers)
- **CNAME Records**: These point the domain to your Workers deployment
- **SSL Certificate**: Cloudflare automatically provides free SSL (even with Flexible mode)
- **No More Vercel**: Once this is done, you're 100% on Cloudflare (no Vercel involved)

---

## Troubleshooting

### Domain not resolving?
```bash
# Check nameserver propagation
dig triumphsynergy.com NS

# Should show Cloudflare nameservers:
# blake.ns.cloudflare.com
# marjory.ns.cloudflare.com
```

### HTTPS not working?
1. Go to Cloudflare → SSL/TLS → Overview
2. Verify **Flexible** or **Full** is selected
3. Wait for SSL certificate provisioning (usually immediate)

### API calls failing?
1. Check Worker logs: `wrangler tail`
2. Verify environment variables are set: `wrangler secret list`
3. Test with: `curl https://triumphsynergy.com/api/health -v`

---

## Ready? Let's Go! 🚀

You're all set. Let me know when you have:
1. ✅ EPP/Auth code from Vercel
2. ✅ Cloudflare account ready

Then I'll guide you through each step!
