# 🔑 GitHub Secrets Quick Setup Card

## COPY-PASTE CHECKLIST

Your build failures are fixed! Now add these 6 secrets to enable deployment:

### Step 1: Go to Repository Settings
```
GitHub → triumph-synergy → Settings → Secrets and variables → Actions
```

### Step 2: Add Each Secret Below

---

## 📦 VERCEL SECRETS (3 required)

### Secret 1: VERCEL_TOKEN
**Where to get it**: https://vercel.com/account/tokens
- Click "Create Token"
- Name: "GitHub Actions"
- Scope: "Full Account"
- Paste token value

**Copy your value from**:
```
https://vercel.com/account/tokens
```

---

### Secret 2: VERCEL_ORG_ID
**Where to get it**: https://vercel.com/account/general
- Look for "Team ID" section
- Or check `.vercel/project.json` if you've linked locally

**Copy your value from**:
```
https://vercel.com/account/general
```

---

### Secret 3: VERCEL_PROJECT_ID
**Where to get it**: Create/link your Vercel project
```bash
# Quick way:
cd tmpt_nextjs
vercel link
cat .vercel/project.json
```

Or at: https://vercel.com/dashboard (select your Next.js project)

---

## 🚀 HEROKU SECRETS (3 required)

### Secret 4: HEROKU_API_KEY
**Where to get it**: https://dashboard.heroku.com/account/applications/authorizations
- Click "Create authorization"
- Name: "GitHub Actions"
- Copy token

---

### Secret 5: HEROKU_EMAIL
**Where to get it**: Your Heroku account login email
```
Example: your-email@example.com
```

---

### Secret 6: HEROKU_APP_NAME
**Where to get it**: Create Heroku app
```bash
heroku create triumph-synergy-rails
# This will show your app name, or:
heroku apps
```

Or visit: https://dashboard.heroku.com/apps (your app name)

---

## ✅ QUICK TEST

After adding secrets, trigger workflows:

```bash
echo "# Setup complete" >> TEST.md
git add TEST.md
git commit -m "Trigger workflows"
git push origin main
```

Then check: **GitHub → Actions** (should show workflows running)

---

## 🆘 Still Need Help?

See full guide: **CI_CD_DEPLOYMENT_SETUP.md**

All files are ready. Just add the secrets and deployments activate! 🚀
