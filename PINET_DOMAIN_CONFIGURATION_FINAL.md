# ⚠️ PINET DOMAIN CONFIGURATION - FINAL & LOCKED
**Status**: LOCKED - NO CHANGES PERMITTED  
**Date**: January 17, 2026  
**Authority**: User-Confirmed Configuration  

---

## PRIMARY APP URL (THE ULTIMATE URL)
```
https://triumphsynergy0576.pinet.com
```
- **Status**: ✅ LIVE & RESPONSIVE
- **HTTP Status**: 200 OK
- **Content Size**: 27,059 bytes
- **Purpose**: Main application URL for ALL canonical references, metadata, and SEO
- **Usage**: Primary domain for layout.tsx metadataBase, OpenGraph URLs, and all user-facing links
- **Changes**: 🔒 LOCKED - DO NOT MODIFY

---

## TESTNET SUBDOMAIN VARIANT
```
https://triumphsynergy1991.pinet.com
```
- **Status**: ⏳ NOT RESPONDING (expected - not actively deployed yet)
- **Purpose**: Testnet variant of the application
- **Usage**: For testnet-specific deployments and testing
- **Changes**: 🔒 LOCKED - DO NOT MODIFY

---

## MAINNET SUBDOMAIN VARIANT
```
https://triumphsynergy7386.pinet.com
```
- **Status**: ✅ LIVE & RESPONSIVE
- **HTTP Status**: 200 OK
- **Content Size**: 25,602 bytes
- **Purpose**: Mainnet variant of the application
- **Usage**: For mainnet-specific deployments and production
- **Changes**: 🔒 LOCKED - DO NOT MODIFY

---

## CLARIFICATIONS (FINAL & BINDING)

✅ **triumphsynergy0576.pinet.com IS NOT A SUBDOMAIN**
- It is THE ultimate/primary app URL
- It is the main application URL for the entire Triumph Synergy ecosystem
- ALL metadata and canonical references use this URL
- This is the URL users see and use to access the app

✅ **triumphsynergy1991.pinet.com and triumphsynergy7386.pinet.com ARE SUBDOMAIN VARIANTS**
- These are specific deployment variants
- These are NOT the primary URL
- These should NOT be used in layout.tsx metadata
- These can be used for variant deployments if needed

✅ **NO DYNAMIC DOMAIN RESOLUTION**
- layout.tsx uses ONLY: `https://triumphsynergy0576.pinet.com`
- NO environment-based switching
- NO PI_NETWORK_MODE logic for domain selection
- Same domain for all environments

---

## DEPLOYED CONFIGURATION

### app/layout.tsx (BOTH BRANCHES)
```typescript
// Primary app domain
const metadataUrl = "https://triumphsynergy0576.pinet.com";

export const metadata: Metadata = {
  metadataBase: new URL(metadataUrl),
  // ... rest of metadata
};
```

### vercel.json (main branch)
- No PI_NETWORK_MODE
- References: https://triumph-synergy.vercel.app (Vercel deployment URL)
- Domain: triumphsynergy0576.pinet.com (via PiNet proxy)

### vercel.testnet.json (testnet branch)
- No PI_NETWORK_MODE
- References: https://triumph-synergy.vercel.app (same Vercel deployment URL)
- Domain: triumphsynergy0576.pinet.com (via PiNet proxy)

### docker-compose.yml
- FRONTEND_URL=https://triumphsynergy0576.pinet.com
- BACKEND_URL=https://triumphsynergy0576.pinet.com/api
- NEXTAUTH_URL=https://triumphsynergy0576.pinet.com
- NO PI_NETWORK_MODE

### .github/workflows/build-and-migrate.yml
- NEXTAUTH_URL: https://triumphsynergy0576.pinet.com
- NO PI_NETWORK_MODE

---

## RECENT COMMITS (LOCKED)

**main branch**: `cace549`
```
fix: correct pinet domain configuration (revert incorrect changes)
- Reverted: Incorrect dynamic domain resolution logic
- Fixed: layout.tsx now uses triumphsynergy0576.pinet.com
- Fixed: Removed PI_NETWORK_MODE=testnet from vercel.testnet.json
- Clarified: Domain structure and purpose
```

**testnet branch**: `96aac07`
```
fix: correct pinet domain configuration on testnet branch
- Reverted: Incorrect dynamic domain resolution logic
- Fixed: layout.tsx now uses triumphsynergy0576.pinet.com
- Fixed: Removed PI_NETWORK_MODE=testnet from vercel.testnet.json
- Clarified: Domain structure and purpose
```

---

## VALIDATION KEY ENDPOINTS

**Primary URL Validation Key**:
```
https://triumphsynergy0576.pinet.com/validation-key.txt
```
- Returns mainnet validation key (96-char hex)
- Verified working ✅

**Mainnet Subdomain Validation Key**:
```
https://triumphsynergy7386.pinet.com/validation-key.txt
```
- Returns mainnet validation key
- Verified working ✅

**Testnet Subdomain Validation Key**:
```
https://triumphsynergy1991.pinet.com/validation-key.txt
```
- Returns testnet validation key
- Status: Pending deployment

---

## ⛔ PROHIBITED CHANGES

The following changes are STRICTLY PROHIBITED:

1. ❌ DO NOT add PI_NETWORK_MODE environment variables
2. ❌ DO NOT implement dynamic domain resolution in layout.tsx
3. ❌ DO NOT change metadataBase from triumphsynergy0576.pinet.com
4. ❌ DO NOT swap or reassign subdomain meanings
5. ❌ DO NOT modify this configuration without explicit user authorization
6. ❌ DO NOT remove this file

---

## ✅ CURRENT CONFIGURATION STATUS

| Component | Configuration | Status |
|-----------|---------------|--------|
| **Primary App URL** | triumphsynergy0576.pinet.com | ✅ LOCKED |
| **Testnet Subdomain** | triumphsynergy1991.pinet.com | ✅ LOCKED |
| **Mainnet Subdomain** | triumphsynergy7386.pinet.com | ✅ LOCKED |
| **layout.tsx Domain** | triumphsynergy0576.pinet.com | ✅ LOCKED |
| **Environment-based Logic** | REMOVED | ✅ LOCKED |
| **PI_NETWORK_MODE** | NOT USED | ✅ LOCKED |

---

## FUTURE REFERENCE

**This document is the AUTHORITATIVE SOURCE for all pinet domain configuration.**

All development and deployment must conform to this configuration.

No deviations are permitted without explicit user authorization documented in writing.

---

**LOCKED BY**: User Authorization  
**DATE LOCKED**: January 17, 2026  
**NO EXCEPTIONS**
