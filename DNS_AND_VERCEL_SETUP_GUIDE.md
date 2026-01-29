# DNS and Vercel Domain Configuration Guide

**Status**: ✅ Code framework updated to use correct domain routing  
**Date**: January 28, 2026  
**Priority**: 🔴 CRITICAL - Must complete these steps for app to be accessible

---

## Overview: How Your Domain Architecture Works

Your application has a 5-domain structure that requires two external configurations (DNS + Vercel):

```
User Access → Pi Network Proxy (pinet.com) → DNS CNAME → Vercel Deployment → App Renders
```

### Domain Tiers Explained

| Domain | Purpose | Routes To | Network |
|--------|---------|-----------|---------|
| **triumphsynergy0576.pinet.com** | PRIMARY/MAIN | triumph-synergy.vercel.app | Mainnet |
| **triumphsynergy7386.pinet.com** | MAINNET subdomain | triumph-synergy.vercel.app | Mainnet |
| **triumphsynergy1991.pinet.com** | TESTNET subdomain | triumph-synergy-testnet.vercel.app | Testnet |
| **triumph-synergy.vercel.app** | Actual hosting | N/A (Vercel) | Mainnet |
| **triumph-synergy-testnet.vercel.app** | Actual hosting | N/A (Vercel) | Testnet |

**Key Point**: `.pinet.com` domains are proxies (Pi Network's infrastructure). They must route to Vercel via DNS CNAME records.

---

## Step 1: Add DNS CNAME Records in pinet.com Registrar

You must add three CNAME records in your Pi Network domain registrar to route pinet domains to Vercel.

### How to Access pinet.com Registrar
1. Go to your **Pi Developer Portal** account
2. Navigate to **App Studio** → Your app
3. Find **Domain Management** or **DNS Settings** section
4. Look for **CNAME Records** or **DNS Records**

### CNAME Records to Add

#### Record 1: Main Domain (0576 → Mainnet Vercel)
```
Subdomain/Host: triumphsynergy0576
Type: CNAME
Points To: triumph-synergy.vercel.app
TTL: 3600 (or default)
```

#### Record 2: Mainnet Subdomain (7386 → Mainnet Vercel)
```
Subdomain/Host: triumphsynergy7386
Type: CNAME
Points To: triumph-synergy.vercel.app
TTL: 3600 (or default)
```

#### Record 3: Testnet Subdomain (1991 → Testnet Vercel)
```
Subdomain/Host: triumphsynergy1991
Type: CNAME
Points To: triumph-synergy-testnet.vercel.app
TTL: 3600 (or default)
```

### Verify DNS Records Were Added
After adding records, wait 5-15 minutes for DNS propagation, then test:

```bash
# Test from terminal/PowerShell
nslookup triumphsynergy0576.pinet.com
nslookup triumphsynergy7386.pinet.com
nslookup triumphsynergy1991.pinet.com

# Should show CNAME pointing to Vercel URLs
# Example output: triumphsynergy0576.pinet.com canonical name = triumph-synergy.vercel.app
```

---

## Step 2: Configure Domains in Vercel Projects

You need to add the pinet domains to both Vercel projects.

### For Mainnet Project (triumph-synergy)

1. Go to **Vercel Dashboard** → Select **triumph-synergy** project
2. Navigate to **Settings** → **Domains**
3. Click **"Add Domain"**
4. Add Domain 1: `triumphsynergy0576.pinet.com`
   - Vercel will show DNS CNAME records
   - Since you already added CNAME in pinet.com registrar, Vercel will detect it
   - Click **Verify** when prompted
5. Add Domain 2: `triumphsynergy7386.pinet.com`
   - Same verification process
   - Click **Verify** when prompted
6. After verification, both domains appear under "Domains" section
7. Mark preferred domain if needed (usually 0576 as primary)

**Expected Result**: Both 0576.pinet.com and 7386.pinet.com show ✅ "Valid Configuration"

### For Testnet Project (triumph-synergy-testnet)

1. Go to **Vercel Dashboard** → Select **triumph-synergy-testnet** project
2. Navigate to **Settings** → **Domains**
3. Click **"Add Domain"**
4. Add Domain: `triumphsynergy1991.pinet.com`
   - Vercel will show DNS CNAME records
   - Since you already added CNAME in pinet.com registrar, Vercel will detect it
   - Click **Verify** when prompted
5. After verification, domain appears under "Domains" section

**Expected Result**: 1991.pinet.com shows ✅ "Valid Configuration"

---

## Step 3: SSL/HTTPS Certificates

After adding domains to Vercel, SSL certificates are automatically provisioned.

**What Happens Automatically**:
- ✅ Vercel provisions free SSL via Let's Encrypt
- ✅ HTTPS enforced automatically
- ✅ Takes 5-30 minutes after domain verification
- ✅ No additional action needed

**Verify SSL is Working**:
```bash
# In browser, visit and check:
https://triumphsynergy0576.pinet.com  # Should show 🔒 secure
https://triumphsynergy7386.pinet.com  # Should show 🔒 secure
https://triumphsynergy1991.pinet.com  # Should show 🔒 secure
```

---

## Step 4: Verify Everything Works

### Testing Checklist

#### Test Mainnet (0576 Main Domain)
```
Visit: https://triumphsynergy0576.pinet.com
Expected:
  ✅ Page loads (not blank)
  ✅ "Triumph Synergy - Pi App Studio" header visible
  ✅ System status shows "Running on Vercel"
  ✅ All 3 pinet domains listed
  ✅ SSL certificate valid (🔒 icon)
  ✅ No redirects or errors
```

#### Test Mainnet (7386 Subdomain)
```
Visit: https://triumphsynergy7386.pinet.com
Expected:
  ✅ Same page as 0576 (both route to same deployment)
  ✅ All content loads correctly
  ✅ SSL certificate valid (🔒 icon)
```

#### Test Testnet (1991 Subdomain)
```
Visit: https://triumphsynergy1991.pinet.com
Expected:
  ✅ Page loads (testnet deployment)
  ✅ DEPLOYMENT_ENV should be "testnet" in console
  ✅ SSL certificate valid (🔒 icon)
```

#### Test Direct Vercel URLs
```
Visit: https://triumph-synergy.vercel.app
Expected: ✅ Mainnet app loads

Visit: https://triumph-synergy-testnet.vercel.app
Expected: ✅ Testnet app loads
```

### Debug Tests (if something doesn't work)

#### Check Domain Resolution
```bash
# PowerShell
nslookup triumphsynergy0576.pinet.com
# Should show: canonical name = triumph-synergy.vercel.app

nslookup triumphsynergy1991.pinet.com
# Should show: canonical name = triumph-synergy-testnet.vercel.app
```

#### Check Vercel Deployment Status
1. Go to **Vercel Dashboard** → Project
2. Click **Deployments** tab
3. Check latest deployment status: Should be ✅ **Ready**
4. If ❌ **Failed**, click deployment to see error logs

#### Check Environment Variables
**For Mainnet (vercel.json)**:
- NEXT_PUBLIC_APP_URL = https://triumph-synergy.vercel.app ✅
- NEXTAUTH_URL = https://triumph-synergy.vercel.app ✅
- DEPLOYMENT_ENV = mainnet ✅

**For Testnet (vercel.testnet.json)**:
- NEXT_PUBLIC_APP_URL = https://triumph-synergy-testnet.vercel.app ✅
- NEXTAUTH_URL = https://triumph-synergy-testnet.vercel.app ✅
- DEPLOYMENT_ENV = testnet ✅

---

## Step 5: Pi App Studio Verification (Step 10)

Once all 5 domains are working:

1. Go to **Pi Developer Portal** → **App Studio**
2. Select your **triumph-synergy** app
3. Navigate to **Step 10 - Domain Verification**
4. Try accessing your app through the different domains
5. Verify all domains are accessible and showing the correct app

**Success Indicators**:
- ✅ All 3 pinet domains load your app
- ✅ Both Vercel URLs work
- ✅ Pi App Studio Step 10 completes successfully
- ✅ App ready for Pi Network mainnet deployment

---

## Troubleshooting

### Issue: "Domain not found" or blank page

**Cause**: DNS not propagated or CNAME records not added correctly

**Fix**:
1. Verify CNAME records are in pinet.com registrar:
   ```bash
   nslookup -type=CNAME triumphsynergy0576.pinet.com
   ```
2. Wait 15-30 minutes for DNS propagation
3. Try accessing again

### Issue: SSL certificate error (⚠️ Not Secure)

**Cause**: Vercel hasn't validated domain yet

**Fix**:
1. Verify domain is added in Vercel project settings
2. Verify CNAME records are correct
3. Wait 5-10 minutes for SSL provisioning
4. Try accessing again

### Issue: Page loads but shows error in console

**Cause**: Environment variable mismatch

**Fix**:
1. Check which domain you're accessing
2. Verify NEXT_PUBLIC_APP_URL matches in vercel.json (mainnet) or vercel.testnet.json (testnet)
3. Push changes to GitHub (triggers redeploy)
4. Wait for Vercel deployment to complete

### Issue: Authentication/SessionProvider errors

**Cause**: NEXTAUTH_URL mismatch

**Fix**:
1. Verify NEXTAUTH_URL in vercel.json/vercel.testnet.json matches actual deployment URL
2. Verify AUTH_SECRET is set in environment
3. This should be fixed by the code changes already made

---

## Configuration Summary

### What Was Fixed (Code Changes)
✅ vercel.json: NEXT_PUBLIC_APP_URL → triumph-synergy.vercel.app
✅ vercel.testnet.json: NEXT_PUBLIC_APP_URL → triumph-synergy-testnet.vercel.app
✅ app/layout.tsx: Metadata using correct Vercel URLs
✅ pi-app-manifest.json: Production URL → 0576.pinet.com (main)
✅ app/page.tsx: Shows all 5 domains correctly
✅ middleware.ts: Detects network from 1991 subdomain

### What You Must Do (External Setup)
⏳ Add 3 CNAME records in pinet.com registrar
⏳ Add pinet domains to Vercel projects
⏳ Wait for DNS propagation and SSL provisioning
⏳ Verify all 5 domains are accessible
⏳ Complete Pi App Studio Step 10 verification

---

## Next Steps

1. **Immediately**: Add DNS CNAME records to pinet.com registrar (Step 1)
2. **Within 15 minutes**: Add domains to Vercel projects (Step 2)
3. **After 15-30 minutes**: Test all domains (Step 3)
4. **After verification**: Complete Pi App Studio Step 10

**Estimated Total Time**: 30-45 minutes

**Questions?** Check middleware.ts for domain detection logic or vercel.json for environment variable configuration.
