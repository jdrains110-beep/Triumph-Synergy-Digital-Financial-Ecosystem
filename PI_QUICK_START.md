# ⚡ Pi Payment Integration - Quick Start (5 minutes)

## 🎯 Get Started Now

### 1️⃣ Get Your Credentials (2 min)

```
1. Go to → https://pi-apps.github.io
2. Sign in with Pi Browser/Pi Network
3. Click "Development" → "Credentials"
4. Create new app or select existing
5. Copy API Key and API Secret
```

### 2️⃣ Configure Local Environment (1 min)

```bash
# Copy example env file
cp .env.example .env.local

# Edit .env.local and add:
PI_API_KEY=your-api-key-here
PI_API_SECRET=your-api-secret-here
PI_INTERNAL_API_KEY=your-internal-key
NEXT_PUBLIC_PI_SANDBOX=true
PI_SANDBOX_MODE=true
```

### 3️⃣ Start Development Server (1 min)

```bash
npm run dev
# or
pnpm dev
```

Open browser console (F12) and verify:
```
✅ [Pi SDK] Pi SDK initialized successfully
```

### 4️⃣ Use Payment Component (1 min)

**Option A: Simple Button**
```tsx
import { PiPaymentButton } from "@/components/pi-payment-form";

export default function Checkout() {
  return (
    <PiPaymentButton
      amount={10}
      orderId="ORDER-123"
      onSuccess={(id) => console.log("Paid:", id)}
    />
  );
}
```

**Option B: Full Form**
```tsx
import { PiPaymentForm } from "@/components/pi-payment-form";

export default function Payment() {
  return <PiPaymentForm orderId="ORDER-456" />;
}
```

---

## 🔑 Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `PI_API_KEY` | ✅ | From Pi App Platform | `abc123def456...` |
| `PI_API_SECRET` | ✅ | From Pi App Platform | `secret123...` |
| `PI_INTERNAL_API_KEY` | ✅ | For internal payments | `internal123...` |
| `NEXT_PUBLIC_PI_SANDBOX` | ⚠️ | `true` for dev/test | `true` |
| `PI_SANDBOX_MODE` | ⚠️ | `true` for dev/test | `true` |

---

## 🚀 Deploy to Vercel

### Step 1: Push Code
```bash
git add .
git commit -m "Add Pi SDK integration"
git push origin main
```

### Step 2: Add Vercel Secrets
```bash
# Using Vercel CLI
vercel env pull
vercel env add PI_API_KEY
vercel env add PI_API_SECRET
vercel env add PI_INTERNAL_API_KEY
vercel env push
```

Or manually in Vercel Dashboard:
- Go to Settings → Environment Variables
- Add the 3 secrets above

### Step 3: Deploy
GitHub Actions deploys automatically on push to main!

---

## 🧪 Test Payment Flow

```
1. Go to your app
2. Click "Pay with Pi"
3. Pi payment modal opens
4. Enter amount (test: 10 Pi)
5. Click "Pay"
6. Approve in Pi Browser
7. ✅ Payment confirmed!
```

---

## 📊 What's Integrated

| Component | Status | Location |
|-----------|--------|----------|
| Pi SDK Script | ✅ | `app/layout.tsx` |
| Pi Provider | ✅ | `lib/pi-sdk/pi-provider.tsx` |
| Payment Hook | ✅ | `lib/pi-sdk/use-pi-payment.ts` |
| UI Components | ✅ | `components/pi-payment-form.tsx` |
| Payment API | ✅ | `app/api/payments/route.ts` |
| Verification | ✅ | `lib/pi-sdk/pi-sdk-verifier.ts` |
| GitHub Actions | ✅ | `.github/workflows/unified-deploy.yml` |
| Documentation | ✅ | `PI_SDK_INTEGRATION_GUIDE.md` |

---

## 🐛 Troubleshooting

### Pi SDK not loading?
```
→ Check browser console (F12)
→ Look for: Failed to load https://sdk.minepi.com/pi-sdk.js
→ Solution: Verify CORS in vercel.json
```

### Payment verification fails?
```
→ Check your PI_API_KEY is correct
→ Verify PI_API_SECRET is set
→ Check server logs in Vercel dashboard
```

### Sandbox mode issues?
```
→ Set NEXT_PUBLIC_PI_SANDBOX=true
→ Set PI_SANDBOX_MODE=true
→ Use test transaction IDs
```

---

## 📚 Full Documentation

- **Setup Guide:** Read [PI_SDK_INTEGRATION_GUIDE.md](./PI_SDK_INTEGRATION_GUIDE.md)
- **Deployment Checklist:** See [PI_SDK_DEPLOYMENT_CHECKLIST.md](./PI_SDK_DEPLOYMENT_CHECKLIST.md)
- **API Reference:** Check `/api/payments` endpoint docs
- **Pi Docs:** https://pi-docs.minepi.com

---

## ✅ Success Checklist

- [ ] Credentials obtained from Pi Platform
- [ ] .env.local configured
- [ ] `npm run dev` starts without errors
- [ ] Browser console shows "Pi SDK initialized"
- [ ] Payment button renders
- [ ] Test payment completes
- [ ] Vercel deployment configured
- [ ] GitHub Actions secrets added
- [ ] Production deployment tested

---

**🎉 You're ready to accept Pi payments!**

For advanced configuration, see the full integration guide.
