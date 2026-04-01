# Pi Network Domain Verification Guide

## ✅ Domain Configuration

### Testnet App (Vercel)
- **Domain**: `https://triumph-synergy.vercel.app`
- **Verification URL**: https://triumph-synergy.vercel.app/validation-key.txt
- **Validation Key**: `75b333f8b28771b24f2fb6adb87b225cc1b58eef8bd5a747d388a98dca1084e331eebc385c6a63885a887f4a0382bc883adeeeccdce9240b4cb8c10faaed93a3`
- **Portal**: https://develop.pi (testnet)
- **Links to**: `https://triumphsynergy0576.pinet.com`

### Mainnet App (Pi Net)
- **Domain**: `https://triumphsynergy0576.pinet.com`
- **Verification URL**: https://triumphsynergy0576.pinet.com/validation-key.txt
- **Validation Key**: `efee2c5a2ce4e5079efeb7eb88e9460f8928f87e900d1fb2075b3f6279fb5b612550875c1fb8b0f1b749b96028e66c833bfc6e52011997a4c38d3252e7b2b195`
- **Portal**: https://developers.minepi.com (mainnet)
- **Primary domain**: This is the main Pi Network domain

## 📋 Verification Steps

### 1. Test Validation Keys
```bash
# Test Vercel (Testnet)
curl https://triumph-synergy.vercel.app/validation-key.txt

# Test Pi Net (Mainnet)
curl https://triumphsynergy0576.pinet.com/validation-key.txt
```

### 2. Verify in Pi Developer Portal

#### Testnet Verification
1. Go to https://develop.pi
2. Navigate to your app: `triumphsynergy7386`
3. Add domain: `triumph-synergy.vercel.app`
4. Pi Network will fetch: `https://triumph-synergy.vercel.app/validation-key.txt`
5. Wait for verification confirmation

#### Mainnet Verification
1. Go to https://developers.minepi.com
2. Navigate to your app
3. Add domain: `triumphsynergy0576.pinet.com`
4. Pi Network will fetch: `https://triumphsynergy0576.pinet.com/validation-key.txt`
5. Wait for verification confirmation

## 🔧 Implementation Details

### Dynamic Key Serving
The app serves different validation keys based on the requesting domain:

```typescript
// In middleware.ts and route handlers
const isVercelDomain = host.includes("vercel.app");
const validationKey = isVercelDomain
  ? "75b333f8b28771b24f2fb6adb87b225cc1b58eef8bd5a747d388a98dca1084e331eebc385c6a63885a887f4a0382bc883adeeeccdce9240b4cb8c10faaed93a3" // TESTNET
  : "efee2c5a2ce4e5079efeb7eb88e9460f8928f87e900d1fb2075b3f6279fb5b612550875c1fb8b0f1b749b96028e66c833bfc6e52011997a4c38d3252e7b2b195"; // MAINNET
```

### Endpoints Serving Validation Keys
- `/validation-key.txt` (primary)
- `/api/validation-key` (alternative)

Both endpoints are handled by:
1. **Middleware** (first priority)
2. **App Route**: `app/validation-key.txt/route.ts`
3. **API Route**: `app/api/validation-key/route.ts`

## ⚠️ Important Notes

### During Verification
- **Vercel redirect is DISABLED** to allow independent domain access
- Both domains must be accessible separately for verification
- Do NOT re-enable the redirect until verification is complete

### After Verification
Once both domains are verified in Pi Network:

1. Open `middleware.ts`
2. Uncomment the Vercel redirect section:
   ```typescript
   // Uncomment this after verification:
   if (host.includes("triumph-synergy") && host.includes("vercel.app")) {
     return NextResponse.redirect(
       `https://triumphsynergy0576.pinet.com${pathname}${search}`,
       { status: 307 }
     );
   }
   ```
3. Redeploy to production

### Environment Variables
Ensure these are set in Vercel:
```
NEXT_PUBLIC_PI_APP_ID=<your-testnet-app-id>
PI_APP_ID=<your-mainnet-app-id>
PI_API_KEY=<your-pi-api-key>
NEXT_PUBLIC_PI_SANDBOX=false
```

## 🧪 Testing Pi Browser Recognition

### After Verification Complete
1. **Testnet**: Open `https://triumph-synergy.vercel.app` in Pi Browser (testnet mode)
2. **Mainnet**: Open `https://triumphsynergy0576.pinet.com` in Pi Browser (mainnet)
3. Confirm Pi Browser recognition on the app homepage after verification.

### Expected Behavior
- Pi Browser should recognize the domain
- `window.Pi` should be available
- SDK should initialize without errors
- Payments should be functional

## 🔍 Troubleshooting

### Validation Key Not Found
- Check that the route is deployed
- Verify middleware priority (validation key should be served first)
- Test with curl/browser directly

### Wrong Key Served
- Check the host detection logic
- Verify the domain in the request
- Check response headers for `X-Pi-Domain` header

### Pi Browser Not Recognizing App
- Ensure domain verification is complete in Pi Developer Portal
- Wait 5-10 minutes after verification for DNS propagation
- Clear Pi Browser cache
- Restart Pi Browser app

### Infinite Loading
- Check browser console for Pi SDK errors
- Verify `window.Pi` is defined
- Check network tab for failed script loads
- Review Pi SDK initialization logs

## 📞 Support

If issues persist:
1. Check Pi Network status: https://status.minepi.com
2. Review Pi Developer docs: https://developers.minepi.com/docs
3. Contact Pi Developer Support through the developer portal
4. Check your app's error logs in Vercel Dashboard

## 🎯 Success Checklist

- [ ] Testnet validation key served at `triumph-synergy.vercel.app/validation-key.txt`
- [ ] Mainnet validation key served at `triumphsynergy0576.pinet.com/validation-key.txt`
- [ ] Testnet domain verified in https://develop.pi
- [ ] Mainnet domain verified in https://developers.minepi.com
- [ ] Pi Browser recognizes testnet domain
- [ ] Pi Browser recognizes mainnet domain
- [ ] Vercel redirect re-enabled (after verification)
- [ ] Payment flows tested successfully
