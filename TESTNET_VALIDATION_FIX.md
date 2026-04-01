# Testnet Domain Validation Fix - Complete Steps

## Problem Identified

**Root Cause:** Testnet and Mainnet MUST use separate deployments and URLs per minepi.com documentation (developer_portal.md).

- ❌ Mainnet: `triumph-synergy.vercel.app` (working ✅)
- ❌ Testnet: Configured to `triumphsynergy1991.pinet.com` (a Pi proxy—WRONG)

**Why it fails:** The pinet.com domain is just a proxy forwarding to your actual deployment. Pi portal validation requests the testnet key from the actual deployment URL, not the proxy.

---

## Solution: Use Separate Testnet Vercel Deployment

### Step 1: Create Testnet Vercel Project (One-time)

**Option A: New Vercel Project (Recommended)**
```bash
# Clone repo to testnet branch
git checkout -b testnet
# Push to a separate GitHub repo or branch for testnet
git push origin testnet

# In Vercel Dashboard:
# 1. Click "Add New..." → "Project"
# 2. Select your testnet branch
# 3. Framework: Next.js (auto-detect)
# 4. Environment Variables: (see Step 2)
# 5. Deploy
```

**Option B: Same Repo, Different Environment (Advanced)**
```bash
# Use Vercel's Environment feature
# In Vercel Dashboard → Project → Settings → Environment Variables
# Create "Preview" environment with testnet vars
```

### Step 2: Configure Testnet Environment Variables in Vercel

**Project:** `triumph-synergy-testnet` (or your naming convention)

Set these environment variables in Vercel:

```
NEXT_PUBLIC_APP_URL = https://triumph-synergy-testnet.vercel.app
NEXTAUTH_URL = https://triumph-synergy-testnet.vercel.app
NEXT_PUBLIC_PI_APP_ID = triumph-synergy
NEXT_PUBLIC_PI_SANDBOX = true
NEXT_PUBLIC_PI_BROWSER_DETECTION = true
DEPLOYMENT_ENV = testnet
PI_NETWORK_TESTNET_VALIDATION_KEY = <your-testnet-validation-key-from-develop.pi>
```

**Critical:** Get the testnet validation key from develop.pi portal (the key Pi gives you for testnet app).

### Step 3: Get Testnet Validation Key

1. Open Pi Browser
2. Navigate to `develop.pi`
3. Find your testnet app (or create one if missing)
4. Go to "Domain" settings
5. Copy the **Validation Key** shown there
6. Paste it into Vercel env var: `PI_NETWORK_TESTNET_VALIDATION_KEY`

### Step 4: Configure DNS for Testnet Proxy Domain

**If you want the pinet.com proxy to work**, set the CNAME:

```
Domain: triumphsynergy1991.pinet.com
CNAME: <your-testnet-vercel-deployment>.vercel.app
Type: CNAME
```

Example:
```
triumphsynergy1991.pinet.com  CNAME  triumph-synergy-testnet.vercel.app
```

### Step 5: Verify Testnet Deployment is Live

**Test the endpoints:**

```bash
# Test testnet validation key endpoint
curl -s "https://triumph-synergy-testnet.vercel.app/validation-key-testnet.txt"

# Should return your testnet key:
# 75b333f8b28771b24f2fb6adb87b225cc1b58eef8bd5a747d388a98dca1084e331eebc385c6a63885a887f4a0382bc883adeeeccdce9240b4cb8c10faaed93a3
```

If you get the key back, testnet deployment is working.

### Step 6: Register Testnet App in Pi Developer Portal (develop.pi)

**Important:** This is SEPARATE from your mainnet app.

1. Open Pi Browser
2. Navigate to `develop.pi`
3. Click "New App"
4. **Network:** Select **Pi Testnet** (NOT Mainnet)
5. **Domain:** `triumph-synergy-testnet.vercel.app` (OR `triumphsynergy1991.pinet.com` if DNS is set)
6. **App URL:** `https://triumph-synergy-testnet.vercel.app`
7. Click "Verify Domain"
8. **Copy the Validation Key** provided
9. **Paste into Vercel env:** `PI_NETWORK_TESTNET_VALIDATION_KEY`
10. Redeploy testnet Vercel project

### Step 7: Test Validation

After deployment, test the validation endpoint:

```bash
# Should return the testnet validation key
curl -s "https://triumph-synergy-testnet.vercel.app/validation-key-testnet.txt"

# If using pinet.com proxy:
curl -s "https://triumphsynergy1991.pinet.com/validation-key-testnet.txt"
```

---

## Vercel.testnet.json (Already Updated)

Your `vercel.testnet.json` has been updated:

```json
{
  "env": {
    "NEXT_PUBLIC_APP_URL": "https://triumph-synergy-testnet.vercel.app",
    "NEXTAUTH_URL": "https://triumph-synergy-testnet.vercel.app",
    "NEXT_PUBLIC_PI_SANDBOX": "true",
    "PI_NETWORK_TESTNET_VALIDATION_KEY": ""  // ← SET IN VERCEL DASHBOARD
  }
}
```

---

## Summary of Changes

| Item | Mainnet | Testnet |
|------|---------|------|
| **Vercel URL** | `triumph-synergy.vercel.app` | `triumph-synergy-testnet.vercel.app` |
| **Pi Portal** | developers.minepi.com | develop.pi |
| **Domain** | triumph-synergy.vercel.app | triumph-synergy-testnet.vercel.app |
| **Proxy Domain** | N/A | triumphsynergy1991.pinet.com (optional) |
| **Validation Key Env** | `PI_NETWORK_MAINNET_VALIDATION_KEY` | `PI_NETWORK_TESTNET_VALIDATION_KEY` |
| **NEXT_PUBLIC_PI_SANDBOX** | false | true |
| **Deployment** | Production | Preview/Staging |

---

## Why This Works (Per minepi.com docs)

From `developer_portal.md`:
> "an app can only connect to one network at a time... you're advised to create two different apps, one with testnet for testing purpose and one with mainnet for your production usage."

This means:
- ✅ Separate app in develop.pi (testnet)
- ✅ Separate app in developers.minepi.com (mainnet)
- ✅ Separate Vercel deployments
- ✅ Separate validation keys
- ✅ Separate domains (or aliased via DNS)

---

## Troubleshooting

### "Testnet validation key endpoint returns mainnet key"
**Solution:** Check that `PI_NETWORK_TESTNET_VALIDATION_KEY` is set in Vercel and deployment was redeployed after setting it.

### "Domain not verified in develop.pi"
**Solution:** 
1. Ensure testnet Vercel deployment is live and accessible
2. Verify validation key endpoint returns correct key
3. Use exact domain configured in Vercel (no typos)
4. Wait 5-10 minutes for DNS propagation if using pinet.com proxy

### "DNS propagation slow for pinet.com domain"
**Solution:** Test directly with Vercel URL first (`triumph-synergy-testnet.vercel.app`) in develop.pi portal, skip proxy domain for now.

---

## Quick Deploy Command

```bash
# If using Vercel CLI:
vercel --prod --config vercel.testnet.json

# Or create new project:
vercel --config vercel.testnet.json
```

---

**Reference:** https://github.com/pi-apps/pi-platform-docs/blob/master/developer_portal.md

**Status:** Ready for implementation
