# GitHub Actions - Pi SDK Secrets Setup

## 🔐 Required Secrets for GitHub Actions

To enable Pi SDK integration in GitHub Actions, you need to add three secrets to your repository.

### Step 1: Get Your Credentials

Visit **https://pi-apps.github.io**:
1. Sign in to Pi App Platform
2. Go to **Development → Credentials**
3. Select or create your app
4. Copy these values:
   - **API Key** → Use for `PI_API_KEY`
   - **API Secret** → Use for `PI_API_SECRET`
   - **Internal API Key** → Use for `PI_INTERNAL_API_KEY`

### Step 2: Add Secrets to GitHub

Go to: **https://github.com/jdrains110-beep/triumph-synergy/settings/secrets/actions**

Click **"New repository secret"** and add each one:

#### Secret 1: PI_API_KEY
- **Name:** `PI_API_KEY`
- **Value:** Your API Key from Pi Platform
- **Visibility:** Secrets (encrypted)

```
https://github.com/jdrains110-beep/triumph-synergy/settings/secrets/actions
→ New repository secret
→ Name: PI_API_KEY
→ Value: [paste your API key]
→ Add secret
```

#### Secret 2: PI_API_SECRET
- **Name:** `PI_API_SECRET`
- **Value:** Your API Secret from Pi Platform
- **Visibility:** Secrets (encrypted)

```
https://github.com/jdrains110-beep/triumph-synergy/settings/secrets/actions
→ New repository secret
→ Name: PI_API_SECRET
→ Value: [paste your API secret]
→ Add secret
```

#### Secret 3: PI_INTERNAL_API_KEY
- **Name:** `PI_INTERNAL_API_KEY`
- **Value:** Your Internal API Key
- **Visibility:** Secrets (encrypted)

```
https://github.com/jdrains110-beep/triumph-synergy/settings/secrets/actions
→ New repository secret
→ Name: PI_INTERNAL_API_KEY
→ Value: [paste your internal API key]
→ Add secret
```

### Step 3: Verify Secrets Are Set

```bash
# View your secrets (without showing values)
gh secret list --repo jdrains110-beep/triumph-synergy
```

You should see:
```
PI_API_KEY               Updated 2024-01-06
PI_API_SECRET            Updated 2024-01-06
PI_INTERNAL_API_KEY      Updated 2024-01-06
```

### Step 4: Test the Integration

Push a change to main:
```bash
git add .
git commit -m "test: verify pi sdk integration"
git push origin main
```

Go to: **https://github.com/jdrains110-beep/triumph-synergy/actions**

Watch the workflow run:
- ✅ Validate stage (lint, types, audit)
- ✅ Build stage (includes Pi SDK)
- ✅ Test stage (runs tests)
- ✅ Deploy to Vercel (with secrets)
- ✅ Health check (verify deployment)

## 🔍 How GitHub Actions Uses These Secrets

### In Build Stage
```yaml
env:
  PI_API_KEY: build-time-dummy           # Doesn't need real value for build
  PI_API_SECRET: build-time-dummy-secret
  PI_INTERNAL_API_KEY: build-time-dummy
  NEXT_PUBLIC_PI_SANDBOX: 'true'         # Uses sandbox for build
```

### In Vercel Deploy Stage
```yaml
env:
  PI_API_KEY: ${{ secrets.PI_API_KEY }}              # Real secret
  PI_API_SECRET: ${{ secrets.PI_API_SECRET }}        # Real secret
  PI_INTERNAL_API_KEY: ${{ secrets.PI_INTERNAL_API_KEY }}  # Real secret
  NEXT_PUBLIC_PI_SANDBOX: 'false'        # Production mode
```

The secrets are passed to Vercel during deployment, which makes them available at runtime.

## ⚠️ Important Notes

1. **Never commit secrets** - Always use GitHub Secrets
2. **Rotate regularly** - Change credentials quarterly
3. **Keep secret** - Don't share Pi API credentials
4. **Test locally first** - Verify `.env.local` before pushing
5. **Monitor deployments** - Check GitHub Actions logs for errors

## 🐛 Troubleshooting

### "Secrets not found" Error
- Verify all three secrets are added
- Check spelling exactly matches
- Wait 5-10 seconds after adding for propagation

### "Build fails" Error
- Check GitHub Actions logs in Actions tab
- Look for error messages about Pi SDK
- Verify .env variables are correct

### "Vercel deploy fails" Error
- Check Vercel dashboard for deployment logs
- Verify secrets are being passed through
- Check that NEXT_PUBLIC_PI_SANDBOX is correct

## ✅ Verification Checklist

- [ ] Visited https://pi-apps.github.io
- [ ] Got API Key and Secret
- [ ] Added PI_API_KEY secret to GitHub
- [ ] Added PI_API_SECRET secret to GitHub
- [ ] Added PI_INTERNAL_API_KEY secret to GitHub
- [ ] Verified with `gh secret list`
- [ ] Pushed test commit
- [ ] Watched workflow complete
- [ ] Checked Vercel deployment

## 🔗 Related Resources

- **GitHub Secrets Docs:** https://docs.github.com/en/actions/security-guides/encrypted-secrets
- **Pi Platform:** https://pi-apps.github.io
- **Vercel Environment:** https://vercel.com/docs/environment-variables
- **GitHub Actions:** https://github.com/jdrains110-beep/triumph-synergy/actions

---

**Ready to deploy with Pi SDK integration!** ✅
