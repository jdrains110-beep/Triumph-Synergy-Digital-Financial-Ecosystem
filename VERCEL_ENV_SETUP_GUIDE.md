# VERCEL ENVIRONMENT VARIABLES SETUP GUIDE
**Date**: January 27, 2026  
**Security Level**: 🔒 CONFIDENTIAL - Contains sensitive keys

---

## CRITICAL SECURITY WARNING

⚠️ **These credentials are SENSITIVE and should NEVER be:**
- Committed to git or GitHub
- Shared publicly
- Hardcoded in source code
- Stored in local .env files (use .env.local for development ONLY)

✅ **These credentials MUST be:**
- Set ONLY via Vercel Dashboard → Environment Variables
- Rotated regularly
- Kept in secure 1Password/LastPass vault
- Different for each environment (mainnet/testnet/staging)

---

## MAINNET CONFIGURATION

**Environment**: Production  
**Pinet Domain**: `triumphsynergy7386.pinet.com`  
**Vercel Project**: `triumph-synergy-main`

### Required Environment Variables:

```
PI_APP_ID = e485546ac793cb7
PI_API_KEY = gta2ph1qqcrwij0irsep1ks8ftdaehs7mpz6yvcinslpehfnlpsr4cndugiktj1y
NEXT_PUBLIC_PI_APP_ID = triumph-synergy
NEXT_PUBLIC_PI_SANDBOX = false
NEXT_PUBLIC_APP_URL = https://triumphsynergy7386.pinet.com
NEXTAUTH_URL = https://triumphsynergy7386.pinet.com
PI_NETWORK_MAINNET_VALIDATION_KEY = efee2c5a2ce4e5079efeb7eb88e9460f8928f87e900d1fb2075b3f6279fb5b612550875c1fb8b0f1b749b96028e66c833bfc6e52011997a4c38d3252e7b2b195
```

### Setup Instructions:

1. **Go to Vercel Dashboard**
   - URL: https://vercel.com/dashboard
   - Project: `triumph-synergy-main`

2. **Click Project Settings**
   - Navigate to: Settings → Environment Variables

3. **Add Variables**
   - Add each variable above with corresponding value
   - Ensure production environment is selected (not preview/development)

4. **Save and Redeploy**
   - Changes take effect on next deployment
   - Previous deployments are unaffected

---

## TESTNET CONFIGURATION

**Environment**: Staging/Testing  
**Pinet Domain**: `triumphsynergy1991.pinet.com`  
**Vercel Project**: `triumph-synergy-testnet`

### Required Environment Variables:

```
PI_APP_ID = 60f6dc6830c60061
PI_API_KEY = 3fsdyhlpi2hqwvshprtiiblxi85oio7xzhisijxgjjraeyvid6jispowh0gq4ug8
NEXT_PUBLIC_PI_APP_ID = triumph-synergy
NEXT_PUBLIC_PI_SANDBOX = true
NEXT_PUBLIC_APP_URL = https://triumphsynergy1991.pinet.com
NEXTAUTH_URL = https://triumphsynergy1991.pinet.com
PI_NETWORK_TESTNET_VALIDATION_KEY = 75b333f8b28771b24f2fb6adb87b225cc1b58eef8bd5a747d388a98dca1084e331eebc385c6a63885a887f4a0382bc883adeeeccdce9240b4cb8c10faaed93a3
```

### Setup Instructions:

1. **Create Testnet Vercel Project** (if not exists)
   - New project: triumph-synergy-testnet
   - Configure with vercel.testnet.json
   - Use same source code repository

2. **Add Variables to Testnet Project**
   - Settings → Environment Variables
   - Add each variable above
   - Ensure production environment is selected

3. **Deploy**
   - Push to GitHub and let Vercel auto-deploy
   - Or use: `vercel deploy --prod`

---

## LOCAL DEVELOPMENT SETUP

For local testing **ONLY** (NEVER commit these):

1. **Create `.env.local`** (ignored by git):
   ```bash
   cp .env.example .env.local
   ```

2. **Edit `.env.local`** with your credentials:
   ```dotenv
   PI_APP_ID=e485546ac793cb7
   PI_API_KEY=gta2ph1qqcrwij0irsep1ks8ftdaehs7mpz6yvcinslpehfnlpsr4cndugiktj1y
   NEXT_PUBLIC_PI_SANDBOX=false
   ```

3. **Run locally**:
   ```bash
   pnpm dev
   ```

4. **IMPORTANT**: Never commit `.env.local` to git

---

## HOW TO SET IN VERCEL DASHBOARD

### Step-by-Step:

1. **Log in to Vercel**
   - Go to: https://vercel.com/login

2. **Select Your Project**
   - For mainnet: Select "triumph-synergy-main"
   - For testnet: Select "triumph-synergy-testnet"

3. **Open Settings Tab**
   - Click: Settings (in top navigation)

4. **Go to Environment Variables**
   - Click: Environment Variables (in left sidebar)

5. **Add Environment Variable**
   - Click: "Add" button
   - Enter variable name (e.g., `PI_API_KEY`)
   - Enter variable value (paste the full key)
   - Select environments (Production, Preview, Development)
   - Click: "Save"

6. **Repeat for each variable** above

7. **Trigger Deployment**
   - Push to GitHub: `git push origin main`
   - Or click: "Deployments" → "Redeploy"

---

## API KEY USAGE IN CODE

### Approve Endpoint (`app/api/pi/approve/route.ts`):
```typescript
const PI_API_KEY = process.env.PI_API_KEY || '';
const PI_APP_ID = process.env.PI_APP_ID || '';

// Called by: fetch('/api/pi/approve', { ... })
// Uses: PI_API_KEY to verify and approve payment
```

### Complete Endpoint (`app/api/pi/complete/route.ts`):
```typescript
// Also uses PI_API_KEY for server-side completion
// Called after user confirms payment in Pi Browser
```

### Validation Keys:
```typescript
// Mainnet: PI_NETWORK_MAINNET_VALIDATION_KEY
// Testnet: PI_NETWORK_TESTNET_VALIDATION_KEY
// Used by: /validation-key.txt and /validation-key-testnet.txt endpoints
// Purpose: Authenticate app with Pi App Studio
```

---

## VERIFICATION CHECKLIST

### After Setting Vercel Variables:

- [ ] Go to Vercel dashboard
- [ ] Select mainnet project
- [ ] Settings → Environment Variables shows all PI_* variables
- [ ] PI_API_KEY is set (value masked with ●●●)
- [ ] PI_APP_ID is set
- [ ] Repeat for testnet project
- [ ] Trigger redeploy: `git push origin main`
- [ ] Wait for deployment to complete
- [ ] Access https://triumphsynergy7386.pinet.com (mainnet)
- [ ] Access https://triumphsynergy1991.pinet.com (testnet)
- [ ] Check browser console for errors
- [ ] Test payment flow end-to-end

---

## ROTATING KEYS (If Compromised)

1. **Go to Pi App Studio** (admin dashboard)
2. **Regenerate API Keys**:
   - Mainnet app: e485546ac793cb7
   - Testnet app: 60f6dc6830c60061
3. **Update Vercel** with new keys
4. **Redeploy** both projects
5. **Test** payment flow

---

## TROUBLESHOOTING

### Error: "Payment verification failed"
**Cause**: PI_API_KEY not set or incorrect  
**Solution**:
1. Verify PI_API_KEY is set in Vercel dashboard
2. Ensure value is complete (full key, no spaces)
3. Check it's set for correct environment (Production)
4. Redeploy and retry

### Error: "Invalid app ID"
**Cause**: PI_APP_ID doesn't match app registration  
**Solution**:
1. Verify PI_APP_ID matches your Pi Studio registration
2. Mainnet should be: `e485546ac793cb7`
3. Testnet should be: `60f6dc6830c60061`
4. Redeploy and retry

### App works locally but not on Vercel
**Cause**: Environment variables not set in Vercel  
**Solution**:
1. Check Vercel dashboard: Settings → Environment Variables
2. Add missing variables
3. Redeploy: `git push origin main` or click "Redeploy" button
4. Wait for deployment to complete

---

## SECURITY BEST PRACTICES

✅ **DO:**
- [ ] Store keys in Vercel environment variables ONLY
- [ ] Rotate keys regularly (monthly recommended)
- [ ] Use different keys for mainnet/testnet
- [ ] Monitor Vercel deployments for errors
- [ ] Keep .env.local in .gitignore
- [ ] Use separate Vercel projects for environments

❌ **DON'T:**
- [ ] Commit .env files to git
- [ ] Share keys via email or Slack
- [ ] Hardcode keys in source code
- [ ] Use same key for multiple apps
- [ ] Leave keys in git history
- [ ] Share production keys with untrusted parties

---

## ADDITIONAL RESOURCES

- **Pi App Studio**: https://appstudio.minepi.com
- **Pi SDK Documentation**: https://github.com/pi-apps/pi-platform-docs
- **Vercel Docs**: https://vercel.com/docs/environment-variables
- **Next.js Secrets**: https://nextjs.org/docs/basic-features/environment-variables

---

**Last Updated**: January 27, 2026  
**Setup Status**: Ready for configuration
