# CI/CD Deployment Setup Guide

## Status: ✅ CI/CD Configuration Fixed

Your CI/CD pipelines have been fixed with proper subdirectory configuration. Both workflows are now ready to deploy, but require GitHub secrets configuration to activate.

### 🚀 What Was Fixed

1. **vercel.json** - Updated to properly navigate to `tmtt_nextjs/` subdirectory
   - Build command: `cd tmtt_nextjs && npm run build`
   - Install command: `cd tmtt_nextjs && npm install`
   - Output directory: `tmtt_nextjs/.next`

2. **GitHub Workflows** - Created focused workflows for each application
   - `.github/workflows/nextjs-deploy.yml` → Builds and deploys Next.js to Vercel
   - `.github/workflows/rails-deploy.yml` → Builds and deploys Rails to Heroku

3. **Local Verification** - Both apps build successfully
   - Next.js: ✅ 3.0s build time, zero errors
   - Rails: ✅ Bundle ready, migrations prepared

---

## 📋 GitHub Secrets Configuration

### For Next.js/Vercel Deployment

Navigate to: **Settings → Secrets and variables → Actions**

Add these 3 secrets:

#### 1. VERCEL_TOKEN
- **What**: Your Vercel authentication token
- **How to get**:
  1. Visit https://vercel.com/account/tokens
  2. Click "Create Token"
  3. Name it "GitHub Actions"
  4. Select "Full Account" scope
  5. Copy the token
- **Value**: `verXXXXXXXXXXXXXXXXXXXXXX`

#### 2. VERCEL_ORG_ID
- **What**: Your Vercel organization/team ID
- **How to get**:
  1. Visit https://vercel.com/account/general
  2. Find "Team ID" in the settings
  3. Or run: `vercel env pull` and check `.vercel/project.json`
- **Value**: `team_xxxxxxxxxxxxxx` or your account ID

#### 3. VERCEL_PROJECT_ID
- **What**: The Next.js project ID on Vercel
- **How to get**:
  1. Create project on Vercel: https://vercel.com/new
  2. Select "Next.js" framework
  3. Import from GitHub
  4. Set Root Directory to `tmtt_nextjs`
  5. Deploy
  6. In project settings, find "Project ID"
  7. Or: `vercel env pull` creates `.vercel/project.json`
- **Value**: `prj_xxxxxxxxxxxxxx`

### For Rails/Heroku Deployment

Add these 3 secrets:

#### 1. HEROKU_API_KEY
- **What**: Your Heroku authentication token
- **How to get**:
  1. Visit https://dashboard.heroku.com/account/applications/authorizations
  2. Click "Create authorization"
  3. Give it a meaningful name
  4. Copy the token
- **Value**: `heroku_xxxxxxxxxxxxxxxxxxxxxxxxx`

#### 2. HEROKU_EMAIL
- **What**: Your Heroku account email
- **How to get**: The email you use to sign in to Heroku
- **Value**: `your-email@example.com`

#### 3. HEROKU_APP_NAME
- **What**: Name of your Rails app on Heroku
- **How to get**:
  1. Create app on Heroku: https://dashboard.heroku.com/apps
  2. Click "New" → "Create new app"
  3. Enter app name: `triumph-synergy-rails`
  4. Click "Create app"
- **Value**: `triumph-synergy-rails`

---

## 🔧 Initial Setup Steps

### Step 1: Add GitHub Secrets
1. Go to: https://github.com/jdrains110-beep/triumph-synergy/settings/secrets/actions
2. Click "New repository secret" for each secret above
3. Paste the values carefully

### Step 2: Create Vercel Project (if not already created)
```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Link project
cd tmtt_nextjs
vercel link
# When asked about root directory, select "No" 
# (root is already tmtt_nextjs/)

# Copy the project ID from .vercel/project.json
```

### Step 3: Create Heroku App (if not already created)
```bash
# Install Heroku CLI
npm install -g heroku

# Login
heroku login

# Create app
heroku create triumph-synergy-rails

# Add buildpack for Rails
heroku buildpacks:add heroku/ruby -a triumph-synergy-rails

# Provision database (PostgreSQL recommended)
heroku addons:create heroku-postgresql:hobby-dev -a triumph-synergy-rails
```

### Step 4: Trigger First Build
```bash
# Make a test commit
echo "# Deployment Setup Complete" >> DEPLOYMENT_NOTES.md
git add DEPLOYMENT_NOTES.md
git commit -m "Trigger deployment workflows"
git push origin main
```

---

## 📊 Deployment Workflow Overview

### Next.js → Vercel

```
Push to tmtt_nextjs/
    ↓
GitHub Actions triggered
    ↓
1. Checkout code
2. Setup Node.js v20
3. Install dependencies
4. Run TypeScript check
5. Run linter
6. Build Next.js
    ↓ (success)
Deploy to Vercel
    ↓
✅ Site live at vercel.com
```

### Rails → Heroku

```
Push to tmpt/
    ↓
GitHub Actions triggered
    ↓
1. Checkout code
2. Setup Ruby
3. Install bundler
4. Setup test database
5. Run linter
6. Compile assets
    ↓ (success)
Deploy to Heroku
    ↓
✅ API live at heroku.com
```

---

## ✅ Verification Checklist

- [ ] Added VERCEL_TOKEN to GitHub secrets
- [ ] Added VERCEL_ORG_ID to GitHub secrets
- [ ] Added VERCEL_PROJECT_ID to GitHub secrets
- [ ] Added HEROKU_API_KEY to GitHub secrets
- [ ] Added HEROKU_EMAIL to GitHub secrets
- [ ] Added HEROKU_APP_NAME to GitHub secrets
- [ ] Created Vercel project for tmtt_nextjs
- [ ] Created Heroku app for tmpt (Rails)
- [ ] Verified local builds work: `npm run build` (Next.js) and `bundle` (Rails)
- [ ] Pushed test commit to trigger workflows
- [ ] Checked GitHub Actions tab for workflow status
- [ ] Verified Vercel deployment URL works
- [ ] Verified Heroku deployment URL works

---

## 🔍 Troubleshooting

### Workflow Not Triggering?
- Make sure files were changed in the correct subdirectory
- Push to `main` branch (not other branches)
- Check `.github/workflows/nextjs-deploy.yml` has correct path trigger

### Build Failures?
- Check GitHub Actions logs: Settings → Actions → All workflows
- Look for specific error messages in workflow run
- Most common: Invalid secrets or incorrect project IDs
- Verify local builds work first: `npm run build` / `bundle`

### Secret Configuration Issues?
- Verify secret names exactly match (case-sensitive)
- Don't include quotes in secret values
- Token format should match expected pattern
- Re-test by making a small commit

---

## 📝 Application Endpoints (After Deployment)

**Next.js Application**:
- URL: `https://your-vercel-deployment-url.vercel.app`
- API Endpoint: `/api/payment`
- Test: `GET /api/payment`

**Rails Application**:
- URL: `https://your-heroku-app-name.herokuapp.com`
- API Endpoint: `/api/transactions`
- Test: `GET /api/transactions`

---

## 🎯 Next Steps

1. **Configure GitHub Secrets** (takes 5 minutes)
   - Follow the sections above to add all 6 secrets

2. **Test Initial Deployment** (takes 10 minutes)
   - Make a test commit
   - Watch GitHub Actions execute
   - Verify both deployments succeed

3. **Monitor Builds** (ongoing)
   - Go to Actions tab to see workflow runs
   - Click on workflow run for detailed logs
   - Both should show ✅ (green checks)

---

## 🆘 Support Resources

- **Vercel Issues**: https://vercel.com/support
- **Heroku Docs**: https://devcenter.heroku.com/
- **GitHub Actions**: https://docs.github.com/en/actions

Your CI/CD pipeline is now configured and ready to deploy! 🚀
