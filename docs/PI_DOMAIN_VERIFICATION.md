# Pi Network Domain Verification Guide

## Current Status
- **Domain**: triumph-synergy.vercel.app
- **App ID**: Check your environment variables (NEXT_PUBLIC_PI_APP_ID)

## Steps to Complete Domain Verification

### 1. Access Pi Developer Portal

**For Testnet:**
1. Go to https://develop.pi
2. Sign in with your Pi account
3. Navigate to "My Apps"

**For Mainnet:**
1. Go to https://developers.minepi.com
2. Sign in with your Pi account
3. Navigate to "My Apps"

### 2. Register/Update Your App

1. Click on your app (or create new one)
2. Go to "App Settings" or "Configuration"
3. Add domain: `triumph-synergy.vercel.app`
4. Save changes

### 3. Domain Verification Options

Pi Network typically requires ONE of these methods:

#### Option A: Meta Tag (Easiest)
1. Pi Portal will give you a meta tag like:
   ```html
   <meta name="pi-domain-verification" content="YOUR_TOKEN_HERE" />
   ```
2. Add this to your app/layout.tsx in the `<head>` section
3. Deploy to Vercel
4. Return to Pi Portal and click "Verify"

#### Option B: Verification File
1. Pi Portal will give you a verification token
2. Create file: `public/.well-known/pi-domain-verification.txt`
3. Add the token to this file
4. Deploy to Vercel
5. Return to Pi Portal and click "Verify"

#### Option C: DNS Record
1. Add a TXT record to your DNS with the provided token
2. Wait for DNS propagation (can take up to 48 hours)
3. Return to Pi Portal and click "Verify"

### 4. Update Environment Variables

After domain verification, ensure your App ID matches:

```bash
# Add to Vercel environment variables
NEXT_PUBLIC_PI_APP_ID=your-verified-app-id-here
PI_APP_ID=your-verified-app-id-here
PI_API_KEY=your-api-key-here
PI_DOMAIN_VERIFICATION_TOKEN=your-verification-token
```

Update on Vercel:
```bash
vercel env add NEXT_PUBLIC_PI_APP_ID
vercel env add PI_APP_ID
vercel env add PI_API_KEY
vercel env add PI_DOMAIN_VERIFICATION_TOKEN
```

### 5. Verify Both Environments

You must complete verification for BOTH:
- ✅ **Testnet** (develop.pi) - for testing
- ✅ **Mainnet** (developers.minepi.com) - for production

### 6. Test Verification

After completing verification:

1. Open Pi Browser on your mobile device
2. Navigate to: https://triumph-synergy.vercel.app
3. Confirm Pi Browser detection and SDK initialization on the main app

### 7. Common Issues

**Issue**: "Domain not verified"
- **Solution**: Ensure you completed verification in Pi Portal AND deployed the changes

**Issue**: "App not whitelisted"
- **Solution**: Make sure the domain exactly matches (no www, no trailing slash)

**Issue**: "Wrong App ID"
- **Solution**: Copy the App ID from Pi Portal and update your environment variables

**Issue**: "Pi SDK not loading"
- **Solution**: After domain verification, Pi Browser will allow SDK to load

### 8. Files to Update

Once you get your verification token from Pi Portal:

1. **public/.well-known/pi-domain-verification.txt**
   - Replace `YOUR_VERIFICATION_TOKEN_HERE` with actual token

2. **app/layout.tsx** (if using meta tag method)
   - Add the meta tag to `<head>`

3. **Environment Variables on Vercel**
   - Ensure all Pi-related variables are set correctly

### 9. Deploy & Verify

```bash
# Build and deploy
pnpm build
vercel --prod

# Test the verification endpoint
curl https://triumph-synergy.vercel.app/.well-known/pi-domain-verification.txt
curl https://triumph-synergy.vercel.app/api/pi/verify
```

### 10. Documentation References

- Pi Network Developer Docs: https://developers.minepi.com/docs
- Pi SDK Documentation: https://developers.pi-network.com/docs/sdk
- Domain Verification Guide: https://developers.minepi.com/docs/domain-verification

---

## Quick Checklist

- [ ] Registered app in Pi Developer Portal (testnet)
- [ ] Registered app in Pi Developer Portal (mainnet)
- [ ] Added domain: triumph-synergy.vercel.app
- [ ] Completed domain verification (testnet)
- [ ] Completed domain verification (mainnet)
- [ ] Updated environment variables with correct App IDs
- [ ] Deployed verification file/meta tag
- [ ] Tested in Pi Browser
- [ ] Confirmed Pi SDK loads
- [ ] Confirmed payment flow works

---

## Next Steps After Verification

Once domain verification is complete:
1. Pi Browser will recognize your domain
2. Pi SDK will load automatically
3. Users can authenticate and make payments
4. Your app will appear in Pi App Directory (if approved)
