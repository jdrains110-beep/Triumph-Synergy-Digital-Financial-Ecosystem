# Pi Network Domain Configuration Fix

## 🔴 Issue: Mainnet Domain (.pinet.com) Returns 404

The `.pinet.com` subdomain is a **Pi Network hosted proxy** - not a direct deployment. It needs to be configured in your Pi Developer Portal to point to your Vercel app.

## ✅ Solution

### Step 1: Configure Pi Network App Settings (MAINNET)

1. Go to **https://developers.minepi.com** (mainnet portal)
2. Navigate to your app settings
3. Find **"App URL"** or **"App Domain"** settings
4. Set your app URL to: `https://triumph-synergy.vercel.app`
5. The validation key URL should be: `https://triumph-synergy.vercel.app/validation-key.txt`

### Step 2: Configure Pi Network App Settings (TESTNET)

1. Go to **https://develop.pi** (testnet portal)  
2. Navigate to your app: `triumphsynergy7386`
3. Find **"App URL"** or **"App Domain"** settings
4. Set your app URL to: `https://triumph-synergy.vercel.app`
5. The validation key URL should be: `https://triumph-synergy.vercel.app/validation-key.txt`

## 🎯 How Pi Network Domains Work

```
┌─────────────────────────────────────────────────────────────┐
│ Pi Browser opens:                                           │
│ https://triumphsynergy0576.pinet.com                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ Pi Network proxies/iframes to
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ Your actual app:                                            │
│ https://triumph-synergy.vercel.app                          │
└─────────────────────────────────────────────────────────────┘
```

### Key Points:
- `.pinet.com` domains are **Pi Network hosted proxies**
- They forward to your actual app URL (Vercel)
- You configure this in Pi Developer Portal
- Both testnet and mainnet should point to: `https://triumph-synergy.vercel.app`

## 📋 Updated Verification Strategy

### Domain Verification Keys

Since **both testnet and mainnet will verify the same Vercel domain**, we need to handle this differently:

#### Option A: Verify Vercel with Testnet First
1. Use testnet key: `75b333f8b28771b24f2fb6adb87b225cc1b58eef8bd5a747d388a98dca1084e331eebc385c6a63885a887f4a0382bc883adeeeccdce9240b4cb8c10faaed93a3`
2. Verify `triumph-synergy.vercel.app` in testnet portal
3. Configure app URL in testnet: `https://triumph-synergy.vercel.app`
4. Test in Pi Browser testnet

#### Option B: Verify Vercel with Mainnet After Testnet
1. **Change** the validation key on Vercel to mainnet key
2. Update `/validation-key.txt` to serve mainnet key
3. Verify `triumph-synergy.vercel.app` in mainnet portal
4. Configure app URL in mainnet: `https://triumph-synergy.vercel.app`
5. Test in Pi Browser mainnet

#### Option C: Use Separate Domains (Recommended if possible)
- Deploy to a second Vercel domain OR
- Use environment-based key switching with query parameters

## 🔧 Current Implementation Issue

The current code switches keys based on hostname:
```typescript
const isVercelDomain = host.includes("vercel.app");
const validationKey = isVercelDomain ? testnetKey : mainnetKey;
```

**Problem**: Since **both testnet and mainnet** will verify `triumph-synergy.vercel.app`, this won't work as intended.

**Solution**: You need to verify the **same domain** in both portals, which means:
1. Verify with testnet key first
2. After testnet verification succeeds, update to mainnet key
3. Verify with mainnet key
4. OR use query parameter switching (see below)

## 🚀 Quick Fix: Query Parameter Switching

Update the validation endpoint to support mode switching:

```typescript
// In validation route
const searchParams = new URL(request.url).searchParams;
const mode = searchParams.get('mode'); // ?mode=testnet or ?mode=mainnet

const validationKey = mode === 'testnet'
  ? "75b333f8b28771b24f2fb6adb87b225cc1b58eef8bd5a747d388a98dca1084e331eebc385c6a63885a887f4a0382bc883adeeeccdce9240b4cb8c10faaed93a3"
  : "efee2c5a2ce4e5079efeb7eb88e9460f8928f87e900d1fb2075b3f6279fb5b612550875c1fb8b0f1b749b96028e66c833bfc6e52011997a4c38d3252e7b2b195";
```

Then verify:
- Testnet: `https://triumph-synergy.vercel.app/validation-key.txt?mode=testnet`
- Mainnet: `https://triumph-synergy.vercel.app/validation-key.txt` (default)

## 📝 Recommended Approach

### Simplest Solution: Sequential Verification

1. **Deploy with TESTNET key as default** (already done ✅)
   ```
   https://triumph-synergy.vercel.app/validation-key.txt
   → Returns testnet key
   ```

2. **Verify in Testnet Portal**
   - Go to https://develop.pi
   - Add domain: `triumph-synergy.vercel.app`
   - Verify with testnet key ✅

3. **Configure Testnet App URL**
   - Set app URL to: `https://triumph-synergy.vercel.app`
   - Test in Pi Browser (testnet mode)

4. **Switch to MAINNET key** (after testnet works)
   - Update default key to mainnet in code
   - Redeploy

5. **Verify in Mainnet Portal**
   - Go to https://developers.minepi.com
   - Add domain: `triumph-synergy.vercel.app`
   - Verify with mainnet key

6. **Configure Mainnet App URL**
   - Set app URL to: `https://triumph-synergy.vercel.app`
   - Test in Pi Browser (mainnet mode)

## 🎯 Action Items

Right now:
1. ✅ Testnet key is deployed and working
2. ⚠️ The `.pinet.com` domain is a Pi Network proxy - not something you deploy to
3. 🔨 Configure your app URL in Pi Developer Portal to point to Vercel
4. 🚀 After testnet verification, switch keys and verify mainnet

The `.pinet.com` domains will **automatically work** once you:
- Verify your Vercel domain in Pi Portal
- Configure the app URL setting in Pi Portal
- Pi Network will proxy/iframe your Vercel app through the .pinet.com domain
