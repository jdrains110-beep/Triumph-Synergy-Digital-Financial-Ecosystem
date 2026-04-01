# Smart Validation Key Guide

## ✅ System Status
**DEPLOYED & WORKING**: Both testnet and mainnet validation keys are active on the same domain!

## 🔑 How It Works

Your app now intelligently serves the correct validation key based on which Pi Network portal is verifying your domain.

### Automatic Detection
The system checks these in order:
1. **Query Parameter**: `?mode=testnet` or `?mode=mainnet`
2. **Referer Header**: Detects `develop.pi` (testnet) vs `developers.minepi.com` (mainnet)
3. **Origin Header**: Same detection as referer
4. **Pattern Matching**: Looks for "testnet" or ".sandbox." in the request
5. **Default**: Falls back to mainnet key

## 📝 Verification URLs

### For Testnet Portal (develop.pi)
```
Domain to verify: https://triumph-synergy.vercel.app
Validation URL: https://triumph-synergy.vercel.app/validation-key.txt?mode=testnet
Expected Key: 75b333f8b28771b24f2fb6adb87b225cc1b58eef8bd5a747d388a98dca1084e331eebc385c6a63885a887f4a0382bc883adeeeccdce9240b4cb8c10faaed93a3
```

### For Mainnet Portal (developers.minepi.com)
```
Domain to verify: https://triumph-synergy.vercel.app
Validation URL: https://triumph-synergy.vercel.app/validation-key.txt?mode=mainnet
Expected Key: efee2c5a2ce4e5079efeb7eb88e9460f8928f87e900d1fb2075b3f6279fb5b612550875c1fb8b0f1b749b96028e66c833bfc6e52011997a4c38d3252e7b2b195
```

## 🚀 Next Steps

### 1. Verify Testnet App
1. Go to https://develop.pi
2. Open your testnet app settings (triumphsynergy7386)
3. In "Domain" field, enter: `triumph-synergy.vercel.app`
4. In "App URL" field, enter: `https://triumph-synergy.vercel.app`
5. Click "Verify Domain"
6. ✅ Should automatically detect testnet key and verify successfully

### 2. Verify Mainnet App
1. Go to https://developers.minepi.com
2. Open your mainnet app settings (triumphsynergy0576)
3. In "Domain" field, enter: `triumph-synergy.vercel.app`
4. In "App URL" field, enter: `https://triumph-synergy.vercel.app`
5. Click "Verify Domain"
6. ✅ Should automatically detect mainnet key and verify successfully

### 3. Test in Pi Browser
After both portals verify the domain:

**Testnet Mode:**
- Open Pi Browser
- Go to develop.pi and launch your testnet app
- Should load and recognize Pi Browser ✅

**Mainnet Mode:**
- Open Pi Browser on mainnet
- Search for "Triumph Synergy" or visit triumphsynergy0576.pinet.com
- Should load and recognize Pi Browser ✅

### Manual Testing
```powershell
# Test default (mainnet)
Invoke-WebRequest -Uri "https://triumph-synergy.vercel.app/validation-key.txt" -UseBasicParsing

# Test explicit testnet
Invoke-WebRequest -Uri "https://triumph-synergy.vercel.app/validation-key.txt?mode=testnet" -UseBasicParsing

# Test explicit mainnet
Invoke-WebRequest -Uri "https://triumph-synergy.vercel.app/validation-key.txt?mode=mainnet" -UseBasicParsing
```

### Run Automated Tests
```powershell
./test-validation.ps1
```

## 📡 API Endpoints

All three endpoints support smart detection:

1. **Static File**: `/validation-key.txt`
2. **API Route**: `/api/validation-key`
3. **App Route**: `/validation-key.txt` (dynamic)

All respond with:
- `Content-Type: text/plain`
- `X-Pi-Verification: testnet|mainnet` (detection result)
- `X-Pi-Referer: <referer>` (for debugging)

## ⚠️ Important Notes

### .pinet.com Domains
- `triumphsynergy7386.pinet.com` (testnet) is a Pi Network proxy
- `triumphsynergy0576.pinet.com` (mainnet) is a Pi Network proxy
- These domains **forward** to your actual app URL
- You **cannot** deploy directly to .pinet.com
- Domain verification happens on your **actual deployment** (Vercel)

### App URL Configuration
After domain verification, configure "App URL" in both portals:
- **Must** point to your Vercel URL: `https://triumph-synergy.vercel.app`
- This is where Pi Browser will actually load your app
- The .pinet.com domain is just for the Pi Network directory

### Redirect Disabled
The automatic www → non-www redirect is currently **disabled** to allow domain verification. 
After both portals verify successfully, you can re-enable it in [middleware.ts](middleware.ts#L135).

## ✅ Verification Checklist

- [x] Smart key detection deployed
- [x] Testnet key works with `?mode=testnet`
- [x] Mainnet key works with `?mode=mainnet`
- [x] Default serves mainnet key
- [ ] Verify testnet domain in develop.pi portal
- [ ] Verify mainnet domain in developers.minepi.com portal
- [ ] Configure testnet App URL
- [ ] Configure mainnet App URL
- [ ] Test in Pi Browser (testnet)
- [ ] Test in Pi Browser (mainnet)
- [ ] Re-enable Vercel redirect after verification

## 🎯 Expected Results

Once both portals verify the domain:
- ✅ Pi Browser will recognize your app
- ✅ SDK will load correctly
- ✅ Pi authentication will work
- ✅ Payments will be enabled
- ✅ Both testnet and mainnet will work simultaneously

## 🐛 Troubleshooting

### "Domain not verified"
- Check that you entered `triumph-synergy.vercel.app` (no https://)
- Verify the validation key URL is accessible
- Try the explicit mode parameter: `?mode=testnet` or `?mode=mainnet`

### "Pi Browser not recognized"
- Complete domain verification first
- Configure App URL in portal settings
- Clear Pi Browser cache

### "Payment buttons not working"
- Verify domain verification is complete
- Check App URL is set to Vercel domain
- Ensure SDK loads successfully (check console)

## 📚 Documentation Files

- `PI_DOMAIN_VERIFICATION.md` - Original setup guide
- `MAINNET_DOMAIN_FIX.md` - Mainnet-specific notes
- This file - Complete smart verification guide

---

**Need Help?**
Review the verification URLs above and re-check portal settings.
