# 🥧 Mainnet & Testnet: Separate Deployments (REQUIRED)

## ⚠️ Critical Requirement

**Mainnet and testnet are SEPARATE Pi Network apps and MUST have:**
- ✅ Separate Vercel projects/deployments  
- ✅ Separate URLs
- ✅ Separate validation key endpoints
- ✅ Cannot share the same domain

---

## 📋 Deployment Configuration

### **Mainnet** (Main Branch)
```
Project: triumph-synergy
Environment: Production
URL: https://triumph-synergy-jeremiah-drains-projects.vercel.app
Validation Key URL: https://triumph-synergy-jeremiah-drains-projects.vercel.app/validation-key-mainnet.txt
Validation Key: efee2c5a2ce4e5079efeb7eb88e9460f8928f87e900d1fb2075b3f6279fb5b612550875c1fb8b0f1b749b96028e66c833bfc6e52011997a4c38d3252e7b2b195
Pi Network: MAINNET (developers.minepi.com)
NEXT_PUBLIC_PI_SANDBOX: false
```

**Configuration File**: `vercel.json`
```json
{
  "env": {
    "NEXT_PUBLIC_APP_URL": "https://triumph-synergy-jeremiah-drains-projects.vercel.app",
    "NEXT_PUBLIC_PI_SANDBOX": "false",
    "DEPLOYMENT_ENV": "mainnet"
  }
}
```

### **Testnet** (Separate Testnet Branch)
```
Project: triumph-synergy-testnet
Environment: Staging
URL: https://triumph-synergy-testnet.vercel.app
Validation Key URL: https://triumph-synergy-testnet.vercel.app/validation-key-testnet.txt
Validation Key: 75b333f8b28771b24f2fb6adb87b225cc1b58eef8bd5a747d388a98dca1084e331eebc385c6a63885a887f4a0382bc883adeeeccdce9240b4cb8c10faaed93a3
Pi Network: TESTNET (develop.pi)
NEXT_PUBLIC_PI_SANDBOX: true
```

**Configuration File**: `vercel.testnet.json`
```json
{
  "env": {
    "NEXT_PUBLIC_APP_URL": "https://triumph-synergy-testnet.vercel.app",
    "NEXT_PUBLIC_PI_SANDBOX": "true",
    "DEPLOYMENT_ENV": "testnet"
  }
}
```

---

## 🚀 Vercel Setup Steps

### Step 1: Create Mainnet Project
```bash
# In your main branch (default)
vercel link
# Select: triumph-synergy
# Environment: Production
```

**Mainnet Environment Variables** (in Vercel dashboard):
```
NEXT_PUBLIC_APP_URL=https://triumph-synergy-jeremiah-drains-projects.vercel.app
NEXT_PUBLIC_PI_SANDBOX=false
DEPLOYMENT_ENV=mainnet
```

### Step 2: Create Testnet Project
```bash
# Create new Vercel project for testnet
# OR link a testnet branch to a new Vercel project
```

**Testnet Environment Variables** (in Vercel dashboard):
```
NEXT_PUBLIC_APP_URL=https://triumph-synergy-testnet.vercel.app
NEXT_PUBLIC_PI_SANDBOX=true
DEPLOYMENT_ENV=testnet
```

---

## 🔑 Pi Portal Registration

### Mainnet Registration (developers.minepi.com)
1. Go to **https://developers.minepi.com**
2. Create/Edit app: **Triumph-Synergy (mainnet)**
3. Set **App URL**: `https://triumph-synergy-jeremiah-drains-projects.vercel.app`
4. In Domain Verification:
   - **Domain**: `triumph-synergy-jeremiah-drains-projects.vercel.app`
   - **Validation Key URL**: `https://triumph-synergy-jeremiah-drains-projects.vercel.app/validation-key-mainnet.txt`
   - Click **Verify Domain**
5. Configure payment endpoints:
   - Approval URL: `https://triumph-synergy-jeremiah-drains-projects.vercel.app/api/pi/approve`
   - Completion URL: `https://triumph-synergy-jeremiah-drains-projects.vercel.app/api/pi/complete`

### Testnet Registration (develop.pi)
1. Go to **https://develop.pi**
2. Create/Edit app: **Triumph-Synergy (testnet)**
3. Set **App URL**: `https://triumph-synergy-testnet.vercel.app`
4. In Domain Verification:
   - **Domain**: `triumph-synergy-testnet.vercel.app`
   - **Validation Key URL**: `https://triumph-synergy-testnet.vercel.app/validation-key-testnet.txt`
   - Click **Verify Domain**
5. Configure payment endpoints:
   - Approval URL: `https://triumph-synergy-testnet.vercel.app/api/pi/approve`
   - Completion URL: `https://triumph-synergy-testnet.vercel.app/api/pi/complete`

---

## ✅ Verification

Test that validation keys are correct:

```bash
# Mainnet Key Check
curl https://triumph-synergy-jeremiah-drains-projects.vercel.app/validation-key-mainnet.txt

# Testnet Key Check  
curl https://triumph-synergy-testnet.vercel.app/validation-key-testnet.txt
```

Both should return their respective validation keys (different hexadecimal strings).

---

## 📊 Summary Table

| Aspect | Mainnet | Testnet |
|--------|---------|---------|
| **URL** | `triumph-synergy-jeremiah-drains-projects.vercel.app` | `triumph-synergy-testnet.vercel.app` |
| **Pi Portal** | developers.minepi.com | develop.pi |
| **Sandbox Mode** | false | true |
| **Validation Key** | `efee2c5a2c...` (mainnet) | `75b333f8b2...` (testnet) |
| **Vercel Config** | `vercel.json` | `vercel.testnet.json` |
| **Branch** | main | testnet (separate) |

---

## ❌ What NOT to Do

❌ Don't use same URL for both  
❌ Don't share validation keys  
❌ Don't use pinet.com domain for verification  
❌ Don't register both apps with same domain  
❌ Don't deploy both from same Vercel project  

---

## 🎯 Result

✅ Both mainnet and testnet apps verified simultaneously  
✅ No conflicts or overwrites  
✅ Separate payment flows  
✅ Proper Pi Network integration  

This is the **ONLY correct way** to handle separate Pi Network environments.
