# Testnet Deployment Fix - Step by Step

**Status**: Testnet not responding at `https://triumph-synergy-testnet.vercel.app`

## Root Cause Analysis
✅ **Code is correct** - validation endpoint exists and routes properly
✅ **Mainnet works** - mainnet key endpoint returning correct key
❌ **Testnet not deployed** - separate Vercel project doesn't exist OR environment variables not set

## Quick Fix (30 seconds)

### Option 1: Quick Deploy Testnet to Vercel CLI
```powershell
# 1. Make sure testnet config is ready (already done)
ls .\vercel.testnet.json

# 2. Deploy testnet with correct config
vercel deploy --prod --token YOUR_VERCEL_TOKEN

# 3. When prompted for project:
# - Link to existing "triumph-synergy-testnet" project (create if doesn't exist)
# - Set production domain to: triumph-synergy-testnet.vercel.app
```

### Option 2: Manual Vercel Dashboard Setup
1. **Create new Vercel project** OR use existing "triumph-synergy-testnet"
2. **Set Environment Variables** in Vercel Dashboard:
   ```
   PI_NETWORK_TESTNET_VALIDATION_KEY=75b333f8b28771b24f2fb6adb87b225cc1b58eef8bd5a747d388a98dca1084e331eebc385c6a63885a887f4a0382bc883adeeeccdce9240b4cb8c10faaed93a3
   ```
3. **Redeploy** from Vercel Dashboard → Deployments → Redeploy

### Option 3: PowerShell Script (Recommended)
```powershell
# Setup testnet secrets
. .\setup-secrets.ps1 -Environment testnet

# The script will:
# 1. Set PI_NETWORK_TESTNET_VALIDATION_KEY in Vercel testnet project
# 2. Deploy to triumph-synergy-testnet.vercel.app
# 3. Test the endpoint
```

## Verification Checklist

After deploying testnet, verify:

```powershell
# 1. Test testnet endpoint (should return testnet key)
curl -s "https://triumph-synergy-testnet.vercel.app/validation-key-testnet.txt" | head -c 50

# Expected: 75b333f8b28771b24f2fb6adb87b225cc1b... (testnet key)

# 2. Test mainnet endpoint (should still work)
curl -s "https://triumph-synergy.vercel.app/validation-key.txt" | head -c 50

# Expected: efee2c5a0b4de60... (mainnet key, unchanged)

# 3. Check deployment status
curl -I "https://triumph-synergy-testnet.vercel.app"

# Expected: HTTP/1.1 200 OK
```

## Key Differences

| Component | Mainnet | Testnet |
|-----------|---------|---------|
| **Domain** | triumph-synergy.vercel.app | triumph-synergy-testnet.vercel.app |
| **Vercel Project** | triumph-synergy | triumph-synergy-testnet (separate!) |
| **Config File** | vercel.json | vercel.testnet.json |
| **Environment** | production | sandbox (NEXT_PUBLIC_PI_SANDBOX=true) |
| **Validation Key Env** | PI_NETWORK_MAINNET_VALIDATION_KEY | PI_NETWORK_TESTNET_VALIDATION_KEY |
| **Validation Endpoint** | /validation-key.txt | /validation-key-testnet.txt |
| **Pi Portal** | pi.io studio | develop.pi (testnet) |

## Important: Don't Touch Mainnet ✅
```
✅ Leave mainnet as-is: https://triumph-synergy.vercel.app
✅ Don't redeploy mainnet unless absolutely necessary
✅ Mainnet is already validated and working
```

## Complete Environment Variables for Testnet Vercel Project

When setting up `triumph-synergy-testnet` in Vercel, add these env vars:

```
PI_NETWORK_TESTNET_VALIDATION_KEY=75b333f8b28771b24f2fb6adb87b225cc1b58eef8bd5a747d388a98dca1084e331eebc385c6a63885a887f4a0382bc883adeeeccdce9240b4cb8c10faaed93a3
NEXT_PUBLIC_PI_SANDBOX=true
NEXT_PUBLIC_PI_APP_ID=triumph-synergy
NEXT_PUBLIC_APP_URL=https://triumph-synergy-testnet.vercel.app
NEXTAUTH_URL=https://triumph-synergy-testnet.vercel.app
DEPLOYMENT_ENV=testnet
```

## After Deployment Success ✅

Once testnet is deployed and validation key endpoint returns the testnet key:

1. **Register in develop.pi portal**:
   - Go to https://develop.pi (testnet Pi portal)
   - Add app domain: `triumph-synergy-testnet.vercel.app`
   - Set validation key URL: `https://triumph-synergy-testnet.vercel.app/validation-key-testnet.txt`

2. **Test with curl**:
   ```powershell
   # This should return testnet key (75b333f8...)
   curl "https://triumph-synergy-testnet.vercel.app/validation-key-testnet.txt"
   ```

3. **Complete**: Testnet and mainnet both validated ✅

## Troubleshooting

| Issue | Solution |
|-------|----------|
| 404 on testnet URL | Testnet project not deployed yet — use Vercel Dashboard or CLI |
| Wrong key returned (mainnet key) | `PI_NETWORK_TESTNET_VALIDATION_KEY` not set in Vercel testnet env vars |
| Mainnet broken | Don't redeploy mainnet; only deploy testnet to separate project |
| Key endpoint shows cache issues | Headers in vercel.testnet.json set to 60s cache (was 3600s) |

## Summary

**The Fix**: Deploy to separate Vercel project (`triumph-synergy-testnet`) with `PI_NETWORK_TESTNET_VALIDATION_KEY` set.

**Config Ready**: ✅ `vercel.testnet.json` is now properly configured

**Next Step**: Execute deployment script or use Vercel Dashboard

**Don't Forget**: Set the env var in the testnet Vercel project!
