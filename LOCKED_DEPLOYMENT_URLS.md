# 🔒 LOCKED DEPLOYMENT URLS - Pi Network Domain Verification

**Status**: IMMUTABLE & VERIFIED  
**Date**: January 18, 2026  
**Pi App ID**: triumph-synergy  

---

## ✅ OFFICIAL DEPLOYMENT URLS

### 🟢 MAINNET (Production)
```
https://triumph-synergy-jeremiah-drains-projects.vercel.app
https://triumphsynergy0576.pinet.com (custom domain)
```

**Network**: Pi Mainnet (Real π)  
**Sandbox**: false  
**Max Payment**: 10,000π  
**Fee**: 2%  
**Verified**: YES ✅  

### 🔵 TESTNET (Development)
```
https://triumph-synergy-testnet.vercel.app
https://triumphsynergy0576.pinet.com (same domain, env-based routing)
```

**Network**: Pi Testnet (Sandbox π)  
**Sandbox**: true  
**Max Payment**: 100π  
**Fee**: 0.5%  
**Verified**: YES ✅  

### 🔴 LOCAL (Development)
```
http://localhost:3000
```

**Network**: Configurable (default testnet)  
**Not Verified**: For local development only  

---

## 🔐 IMMUTABILITY ENFORCEMENT

These URLs are locked at multiple levels:

### 1. **TypeScript Constants** (`lib/constants/deployment-urls.ts`)
- Defined as `const` objects
- Export readonly properties with `as const` assertion
- Cannot be modified without code changes

### 2. **Vercel Configuration** (`vercel.json`, `vercel.testnet.json`)
- Environment variables stored in Vercel
- Set via secure Vercel CLI
- Cannot be changed via local files

### 3. **Runtime Validation** (`lib/hooks/useDeploymentVerification.ts`)
- Validates URLs on app startup
- Alerts if URLs have been tampered with
- Prevents Pi SDK initialization if mismatch detected

### 4. **GitHub Commits**
- URL changes require git commits
- Changes are tracked and auditable
- Can be reviewed before merging

---

## 📋 URL CHANGE PROCEDURE

**If you need to change these URLs:**

1. ❌ **DO NOT** manually edit vercel.json or vercel.testnet.json environment values
2. ❌ **DO NOT** change the TypeScript constants without re-verification
3. ✅ **DO** contact Pi Developer Portal to update registered URLs
4. ✅ **DO** update all three sources in sync:
   - TypeScript constants
   - Vercel configuration
   - GitHub commit with explanation

**Each change requires:**
- Pi Developer Portal re-verification
- New deployment with updated constants
- Audit trail of who changed what and when

---

## 🧪 VERIFICATION POINTS

### On Development
- Constants defined in `lib/constants/deployment-urls.ts`
- Check `validateDeploymentURLs()` function
- Run: `npm run type-check` to verify TypeScript

### On Production Build
- Vercel reads environment variables
- Runtime validation runs on app startup
- Browser console shows verification status

### On App Load
```javascript
// Check in browser console:
console.log(validateDeploymentURLs()); // true = verified
console.log(getVerifiedDeploymentURLs()); // shows current URLs
console.log(isMainnetDeployment()); // true if on mainnet
console.log(isTestnetDeployment()); // true if on testnet
```

---

## 📊 Configuration Comparison

| Setting | Mainnet | Testnet | Local |
|---------|---------|---------|-------|
| **Vercel URL** | triumph-synergy-jeremiah-drains-projects.vercel.app | triumph-synergy-testnet.vercel.app | localhost:3000 |
| **Custom Domain** | triumphsynergy0576.pinet.com | triumphsynergy0576.pinet.com | N/A |
| **Sandbox Mode** | false | true | true (dev) |
| **Network** | mainnet | testnet | testnet |
| **API Endpoint** | api.minepi.com | testnet-api.minepi.com | testnet-api.minepi.com |
| **Max Payment** | 10,000π | 100π | 100π |
| **Network Fee** | 2% | 0.5% | 0.5% |
| **Verified** | ✅ Yes | ✅ Yes | ❌ No |

---

## 🛡️ SECURITY NOTES

1. **Immutable Deployment**: URLs are locked to prevent accidental misconfiguration
2. **Verification Validation**: App validates URLs match expected values on startup
3. **Environment Isolation**: Testnet and mainnet are completely separated
4. **Audit Trail**: All changes are git-tracked and auditable
5. **Pi Integration**: URLs registered with Pi Developer Portal cannot change without re-verification

---

## 🔄 Deployment Flow

```
User Request
    ↓
Vercel Receives Request
    ↓
Environment Variables Loaded (IMMUTABLE)
    ↓
App Initializes
    ↓
Runtime Validation (validateDeploymentURLs)
    ↓
URL Mismatch?
├─ YES → Alert + Stop Pi SDK
└─ NO → Continue with Pi SDK
    ↓
Request Handled with Correct Network Config
```

---

## ✅ Verification Checklist

- [x] Mainnet URL: https://triumph-synergy-jeremiah-drains-projects.vercel.app
- [x] Testnet URL: https://triumph-synergy-testnet.vercel.app
- [x] Custom Domain: triumphsynergy0576.pinet.com
- [x] App ID: triumph-synergy
- [x] TypeScript Constants: Locked (as const)
- [x] Vercel Config: Updated with URLs
- [x] Runtime Validation: Implemented
- [x] Git Commits: Tracked and auditable
- [x] Pi Developer Portal: Can be notified

---

## 📞 Contact Pi Support

If you need to:
1. **Change Deployment URLs** → Update Pi Developer Portal registration
2. **Add New Domains** → Submit verification request to Pi
3. **Migrate Deployments** → Contact Pi support with new URLs
4. **Verify Deployment** → Run `validateDeploymentURLs()` in console

---

**Last Updated**: January 18, 2026  
**Status**: 🟢 IMMUTABLE & VERIFIED  
**Next Review**: Upon Pi Developer Portal request
