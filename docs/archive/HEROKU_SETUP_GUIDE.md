# 🚀 Heroku Deployment Setup Guide

## ✅ Critical Fixes Applied

Your build failures were caused by **2 bugs in the workflows**:
1. ❌ Node cache path said `tmpt_nextjs` (single 't') but should be `tmtt_nextjs` (double 't')
2. ❌ Rails workflow called non-existent `rails_lint` command

**Both fixes have been committed and pushed** ✅

---

## 🎯 Now That You Have a Heroku Account

### Step 1: Get Your Heroku API Key (2 minutes)

1. Go to: https://dashboard.heroku.com/account/applications/authorizations
2. Click **"Create authorization"**
3. Fill in:
   - **Description**: `GitHub Actions` (or any name)
   - **Expires in**: Choose "No expiration" (or your preference)
4. Click **"Create authorization"**
5. **Copy the token** (it's shown once, then hidden)

```
Your HEROKU_API_KEY looks like:
heroku_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

### Step 2: Create Your Heroku App (2 minutes)

**Option A: Via Web Dashboard** (Recommended for first time)
1. Go to: https://dashboard.heroku.com/apps
2. Click **"New"** → **"Create new app"**
3. Enter app name: `triumph-synergy-rails`
4. Choose region: `United States` (or your preference)
5. Click **"Create app"**

**Your app URL will be**: `https://triumph-synergy-rails.herokuapp.com`

**Option B: Via Heroku CLI**
```bash
# Install Heroku CLI (if needed)
npm install -g heroku

# Login
heroku login

# Create app
heroku create triumph-synergy-rails

# You'll see output like:
# https://triumph-synergy-rails.herokuapp.com/ | https://git.heroku.com/triumph-synergy-rails.git
```

---

### Step 3: Add Rails Buildpack (1 minute)

The app needs to know it's a Rails application.

**Option A: Via Web Dashboard**
1. Go to your app: https://dashboard.heroku.com/apps/triumph-synergy-rails
2. Click **"Settings"** tab
3. Scroll to **"Buildpacks"**
4. Click **"Add buildpack"**
5. Search for `heroku/ruby` and click it
6. Click **"Add buildpack"**

**Option B: Via Heroku CLI**
```bash
heroku buildpacks:add heroku/ruby -a triumph-synergy-rails
```

---

### Step 4: Add PostgreSQL Database (1 minute)

SQLite won't work on Heroku's ephemeral filesystem. We need PostgreSQL.

**Option A: Via Web Dashboard**
1. In your app settings, find **"Add-ons"**
2. Search for `heroku-postgresql`
3. Select **"Heroku Postgres"**
4. Choose plan: **"Hobby Dev"** (Free tier)
5. Click **"Provision"**

**Option B: Via Heroku CLI**
```bash
heroku addons:create heroku-postgresql:hobby-dev -a triumph-synergy-rails
```

The database will be automatically available as `DATABASE_URL` environment variable.

---

### Step 5: Add GitHub Secrets (3 minutes)

Now add these to GitHub so the workflow can deploy.

Go to: https://github.com/jdrains110-beep/triumph-synergy/settings/secrets/actions

**Add these 3 secrets**:

| Secret Name | Value | Where From |
|------------|-------|-----------|
| **HEROKU_API_KEY** | `heroku_xxx...` | Step 1 (you just created it) |
| **HEROKU_APP_NAME** | `triumph-synergy-rails` | Step 2 (your app name) |
| **HEROKU_EMAIL** | Your Heroku email | Your Heroku account email |

---

### Step 6: Test the Deployment (5 minutes)

Make a test commit to trigger the workflow:

```bash
# Create a test file
echo "# Heroku deployment test" > HEROKU_TEST.md

# Commit and push
git add HEROKU_TEST.md
git commit -m "Trigger Heroku deployment test"
git push origin main
```

**Watch it deploy**:
1. Go to: https://github.com/jdrains110-beep/triumph-synergy/actions
2. Click the latest workflow run
3. You should see:
   - ✅ `build-rails` job completes
   - ✅ `deploy-heroku` job runs and deploys

**Check Heroku**:
1. Go to: https://dashboard.heroku.com/apps/triumph-synergy-rails
2. Look for **"Deployed"** status
3. Click the app URL to test

---

## 📊 What Your Heroku Deployment Includes

```
✅ Ruby 3.4.8
✅ Rails 8.0
✅ PostgreSQL database
✅ Automatic deployment from GitHub
✅ SSL/HTTPS enabled by default
✅ Free tier: 550 dyno hours/month
```

---

## 🔧 Environment Variables

Your Rails app needs some configuration. Add these to Heroku:

**Option A: Via Web Dashboard**
1. Go to your app settings
2. Find **"Config Vars"**
3. Add each variable

**Option B: Via Heroku CLI**
```bash
# Set each variable
heroku config:set RAILS_ENV=production -a triumph-synergy-rails
heroku config:set RAILS_MASTER_KEY=your_key -a triumph-synergy-rails
heroku config:set PI_NETWORK_API_KEY=your_pi_key -a triumph-synergy-rails
```

---

## 🧪 Test Your Deployed API

After deployment succeeds:

```bash
# Test the Rails API
curl https://triumph-synergy-rails.herokuapp.com/api/transactions

# You should get a JSON response
```

---

## 📈 Monitoring Your Deployment

**View Logs**:
```bash
heroku logs -a triumph-synergy-rails --tail
```

**View Database**:
```bash
heroku pg:info -a triumph-synergy-rails
```

**View App Info**:
```bash
heroku apps:info -a triumph-synergy-rails
```

---

## 🚨 Common Issues

### Issue: "Buildpack not installed"
**Solution**: Make sure `heroku/ruby` buildpack is added (Step 3)

### Issue: "Database errors"
**Solution**: Ensure PostgreSQL is provisioned (Step 4)

### Issue: "Deployment fails silently"
**Solution**: Check logs with `heroku logs -a triumph-synergy-rails --tail`

### Issue: "RAILS_MASTER_KEY missing"
**Solution**: Add `RAILS_MASTER_KEY` to Config Vars (see Environment Variables section)

---

## 📝 Summary Checklist

- [ ] Created Heroku API key
- [ ] Created Heroku app: `triumph-synergy-rails`
- [ ] Added Ruby buildpack
- [ ] Provisioned PostgreSQL database
- [ ] Added 3 GitHub secrets (HEROKU_API_KEY, HEROKU_APP_NAME, HEROKU_EMAIL)
- [ ] Made test commit to trigger workflow
- [ ] Verified workflow ran successfully
- [ ] Tested deployed API endpoint
- [ ] Set environment variables (if needed)

---

## 🎉 You're Deployed!

Your Rails app is now **live on Heroku** and will automatically update every time you push to GitHub.

**Your API is at**: https://triumph-synergy-rails.herokuapp.com

---

**Questions?** Check the logs with:
```bash
heroku logs -a triumph-synergy-rails --tail
```
