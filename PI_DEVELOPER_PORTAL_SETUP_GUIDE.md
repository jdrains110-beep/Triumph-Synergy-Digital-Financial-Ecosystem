# Pi Developer Portal Setup - Official Configuration

**Based on Official minepi.com Documentation**

## Summary

You need to register **TWO separate applications** in the Pi Developer Portal:
1. **Mainnet App** → registers with URL: `https://triumph-synergy.vercel.app`
2. **Testnet App** → registers with URL: `https://triumph-synergy-testnet.vercel.app`

The `triumphsynergy0576.pinet.com` domain is a **pinet proxy** that routes requests to your actual registered URLs.

---

## How Pi Browser App Access Works

Per official minepi.com documentation:

1. **You register an app with a URL** in the Pi Developer Portal
2. **That URL is the actual app domain** (your Vercel deployment)
3. **Pi Browser routes through pinet.com proxy** → then to your registered URL
4. **Your app receives the request** at the Vercel domain

```
Pi Browser User
    ↓
accesses: triumphsynergy0576.pinet.com (pinet proxy)
    ↓ routes to
Registered App URL: https://triumph-synergy.vercel.app
    ↓
Your App Code (runs on Vercel)
```

---

## Configuration Status

### ✅ What's Already Done

- `.env.production` updated to use `https://triumph-synergy.vercel.app` (mainnet)
- `vercel.testnet.json` configured to use `https://triumph-synergy-testnet.vercel.app` (testnet)
- Validation key endpoints ready:
  - `/validation-key.txt` → mainnet key
  - `/validation-key-testnet.txt` → testnet key
- Middleware updated to detect testnet vs mainnet correctly

### ⚠️ What You Need to Do

**Register TWO apps in Pi Developer Portal** (go to `pi://develop.pi` in Pi Browser):

---

## Step 1: Register Mainnet App

1. Open Pi Browser → Go to `pi://develop.pi`
2. Click "New App"
3. **App Name**: `Triumph Synergy`
4. **App Network**: Select **Mainnet**
5. **Save and go to App Checklist**

### Configure App Domain

1. **Step 1 - Hosting Option**: Click to configure
2. **Domain/URL**: Enter `https://triumph-synergy.vercel.app`
3. **Domain Type**: External Domain
4. **Verify Domain**:
   - Pi will ask you to add a DNS record or verification file
   - Add the validation file at: `https://triumph-synergy.vercel.app/validation-key.txt`
   - Validation key: `efee2c5a2ce4e5079efeb7eb88e9460f8928f87e900d1fb2075b3f6279fb5b612550875c1fb8b0f1b749b96028e66c833bfc6e52011997a4c38d3252e7b2b195`

5. **App Wallet**: Create and connect your Pi wallet
6. **Continue through checklist** to complete setup

---

## Step 2: Register Testnet App

1. Click "New App" again
2. **App Name**: `Triumph Synergy Testnet`
3. **App Network**: Select **Testnet**
4. **Save and go to App Checklist**

### Configure Testnet Domain

1. **Step 1 - Hosting Option**: Click to configure
2. **Domain/URL**: Enter `https://triumph-synergy-testnet.vercel.app`
3. **Domain Type**: External Domain
4. **Verify Domain**:
   - Pi will ask you to add verification
   - Add the validation file at: `https://triumph-synergy-testnet.vercel.app/validation-key-testnet.txt`
   - Validation key: `75b333f8b28771b24f2fb6adb87b225cc1b58eef8bd5a747d388a98dca1084e331eebc385c6a63885a887f4a0382bc883adeeeccdce9240b4cb8c10faaed93a3`

5. **App Wallet**: Create and connect your testnet wallet
6. **Continue through checklist** to complete setup

---

## What Happens After Registration

### Mainnet
- **Pi Browser App URL**: `triumphsynergy0576.pinet.com` (pinet proxy creates this)
- **Actual App URL**: `https://triumph-synergy.vercel.app`
- **Your code uses**: `NEXT_PUBLIC_APP_URL=https://triumph-synergy.vercel.app`
- **Pi Browser routes**: pinet.com proxy → triumph-synergy.vercel.app

### Testnet
- **Pi Browser App URL**: `triumpsynergy0576testnet.pinet.com` (or similar pinet proxy)
- **Actual App URL**: `https://triumph-synergy-testnet.vercel.app`
- **Your code uses**: `NEXT_PUBLIC_APP_URL=https://triumph-synergy-testnet.vercel.app`
- **Pi Browser routes**: pinet.com proxy → triumph-synergy-testnet.vercel.app

---

## Current Deployment Configuration

### `.env.production` (Mainnet)
```env
NEXT_PUBLIC_APP_URL=https://triumph-synergy.vercel.app
NEXTAUTH_URL=https://triumph-synergy.vercel.app
NEXT_PUBLIC_PI_SANDBOX=false
PI_NETWORK_MAINNET_VALIDATION_KEY=efee2c5a2ce4e5079efeb7eb88e9460f8928f87e900d1fb2075b3f6279fb5b612550875c1fb8b0f1b749b96028e66c833bfc6e52011997a4c38d3252e7b2b195
PI_NETWORK_TESTNET_VALIDATION_KEY=75b333f8b28771b24f2fb6adb87b225cc1b58eef8bd5a747d388a98dca1084e331eebc385c6a63885a887f4a0382bc883adeeeccdce9240b4cb8c10faaed93a3
```

### `vercel.testnet.json` (Testnet)
```json
{
  "env": {
    "NEXT_PUBLIC_APP_URL": "https://triumph-synergy-testnet.vercel.app",
    "NEXTAUTH_URL": "https://triumph-synergy-testnet.vercel.app",
    "NEXT_PUBLIC_PI_SANDBOX": "true",
    "PI_NETWORK_TESTNET_VALIDATION_KEY": "75b333f8b28771b24f2fb6adb87b225cc1b58eef8bd5a747d388a98dca1084e331eebc385c6a63885a887f4a0382bc883adeeeccdce9240b4cb8c10faaed93a3"
  }
}
```

---

## Testing After Registration

### Mainnet (via Pi Browser)
```
1. Open Pi Browser
2. Type: triumphsynergy0576.pinet.com (or whatever pinet gives you)
3. Your mainnet app loads at: https://triumph-synergy.vercel.app
4. Pi SDK connects to Mainnet
5. Payment processing uses mainnet validators
```

### Testnet (via Pi Browser)
```
1. Open Pi Browser
2. Type: Your testnet pinet domain
3. Your testnet app loads at: https://triumph-synergy-testnet.vercel.app
4. Pi SDK connects to Testnet
5. You should see black/yellow testnet indicator bar
6. Payment processing uses testnet validators
```

---

## Why This Works (Official Docs)

From **minepi.com developer documentation**:

> "The URL ownership will be determined through a verification process."
> 
> "This project should contain the desired URL that Pioneers will access the app with through the Pi Browser."
>
> "It is best practice to create new Developer Portal Projects" (for mainnet vs testnet).

The verification endpoints at `/validation-key.txt` and `/validation-key-testnet.txt` are automatically scanned by the Pi platform during domain verification.

---

## Next Steps

1. ✅ **Code**: Already updated with correct URLs and env vars
2. ⏳ **TODO**: Register both apps in Pi Developer Portal
3. ⏳ **TODO**: Verify domains when Pi portal prompts
4. ⏳ **TODO**: Test through Pi Browser

Once you've registered and verified both apps in the Pi Developer Portal, your ecosystem will be complete!
