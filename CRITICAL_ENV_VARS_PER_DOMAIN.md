# 🔴 CRITICAL: Environment Variables Not Set Per Domain

**Root Cause Found:** vercel.json has hardcoded environment variables for mainnet only. All three domains (0576, 1991, 7386) are getting the SAME env vars, causing:
- Testnet domain (1991) getting mainnet config
- Wrong validation keys being used
- Pi SDK not recognizing domains

---

## The Problem

Current vercel.json:
```json
{
  "env": {
    "NEXT_PUBLIC_APP_URL": "https://triumphsynergy7386.pinet.com",
    "NEXT_PUBLIC_PI_SANDBOX": "false",  // ← This is MAINNET only!
    "NEXT_PUBLIC_PI_APP_ID": "triumph-synergy",
    ...
  }
}
```

This means ALL domains get:
- `NEXT_PUBLIC_PI_SANDBOX=false` (mainnet)
- `NEXT_PUBLIC_APP_URL=https://triumphsynergy7386.pinet.com`

**But when you access 1991.pinet.com:**
- It gets mainnet environment (wrong!)
- Testnet validation key never loaded
- Wrong SDK config sent
- Pi Browser can't verify

---

## Solution: Set Environment Variables Per Domain in Vercel

You need to set different env vars for each domain deployment. **Here's how:**

### Step 1: Go to Vercel Project Settings

1. Go to https://vercel.com/dashboard
2. Click on "triumph-synergy" project
3. Click **"Settings"** tab
4. Click **"Environment Variables"** on the left

### Step 2: Check Current Variables

You should see:
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_PI_SANDBOX`
- `PI_NETWORK_MAINNET_VALIDATION_KEY`
- `PI_NETWORK_TESTNET_VALIDATION_KEY`
- Others

### Step 3: Create Domain-Specific Overrides

#### For 0576 (Primary Mainnet):
If you have a separate deployment for 0576, set:
```
NEXT_PUBLIC_APP_URL = https://triumphsynergy0576.pinet.com
NEXT_PUBLIC_PI_SANDBOX = false
DEPLOYMENT_ENV = mainnet
```

#### For 1991 (Testnet):
If you have a separate deployment for 1991, set:
```
NEXT_PUBLIC_APP_URL = https://triumphsynergy1991.pinet.com
NEXT_PUBLIC_PI_SANDBOX = true  ← KEY DIFFERENCE
DEPLOYMENT_ENV = testnet
```

#### For 7386 (Mainnet):
```
NEXT_PUBLIC_APP_URL = https://triumphsynergy7386.pinet.com
NEXT_PUBLIC_PI_SANDBOX = false
DEPLOYMENT_ENV = mainnet
```

### Step 4: Set Environment to "Production" for each

When adding env vars in Vercel:
- Select **"Production"** environment
- This applies to your production domain deployments

### Step 5: Save and Redeploy

1. Save changes
2. Go to Deployments tab
3. Click the latest deployment
4. Click **"Redeploy"**
5. Wait for build to complete

---

## Alternative: Use Different Vercel Projects

If you want to be 100% sure:
- Create separate Vercel projects for testnet vs mainnet
- Deploy 0576 and 7386 to one project (mainnet settings)
- Deploy 1991 to another project (testnet settings)

But this is more complex. The simpler solution is environment variable overrides.

---

## Quick Fix (Temporary)

If Vercel environment overrides aren't working, remove hardcoded env from vercel.json:

```json
{
  "env": {
    // DELETE THESE - let runtime detect from hostname
    // "NEXT_PUBLIC_APP_URL": "https://triumphsynergy7386.pinet.com",
    // "NEXT_PUBLIC_PI_SANDBOX": "false",
    
    // KEEP ONLY SHARED VARS
    "NEXT_PUBLIC_PI_APP_ID": "triumph-synergy",
    "NEXT_PUBLIC_PI_BROWSER_DETECTION": "true",
    ...
  }
}
```

Then the code will detect from hostname:
- 1991 → testnet
- 7386 → mainnet
- 0576 → mainnet

---

## What to Do RIGHT NOW

1. **Go to Vercel Project Settings**
2. **Check Environment Variables**
3. **Verify 1991 has `NEXT_PUBLIC_PI_SANDBOX=true`** (if separate deployment)
4. **If not, add it**
5. **Redeploy**

---

## Verification

After fixing, check each domain:

```bash
# 1991 should return testnet=true
curl https://triumphsynergy1991.pinet.com/api/pi/verify

# 7386 should return mainnet
curl https://triumphsynergy7386.pinet.com/api/pi/verify
```

Both responses should show `NEXT_PUBLIC_PI_SANDBOX` correctly.

---

This is the REAL issue. Fix the environment variables per domain and Pi SDK will be recognized.
