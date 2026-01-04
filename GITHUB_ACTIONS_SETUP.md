# GitHub Actions & Vercel Deployment Setup Guide

## Quick Setup (5 minutes)

### Step 1: Add GitHub Secrets

Go to: **Repository Settings → Secrets and variables → Actions**

Add these 4 secrets:

```
VERCEL_TOKEN         → Your Vercel API token
VERCEL_ORG_ID        → Your Vercel organization ID  
VERCEL_PROJECT_ID    → Your Triumph Synergy project ID
SUPABASE_ANON_KEY    → Your Supabase anonymous key
```

**How to get these values:**

1. **VERCEL_TOKEN**:
   - Go to https://vercel.com/account/tokens
   - Create new token
   - Copy value

2. **VERCEL_ORG_ID & VERCEL_PROJECT_ID**:
   - Go to Vercel project settings
   - Copy from URL: `vercel.com/[ORG_ID]/triumph-synergy/[PROJECT_ID]`

3. **SUPABASE_ANON_KEY**:
   - Go to Supabase project settings
   - Copy from "API Keys" section

### Step 2: Add Vercel Secrets

Go to: **Vercel Project → Settings → Environment Variables**

Add these 7 secrets (all required for production):

```
NEXTAUTH_SECRET      → Min 32 random characters (use: openssl rand -base64 32)
AUTH_SECRET          → Min 32 random characters (different from NEXTAUTH_SECRET)
PI_API_KEY           → Your Pi Network API key
PI_INTERNAL_API_KEY  → Your Pi Network internal API key
SUPABASE_ANON_KEY    → Same as GitHub secret above
POSTGRES_URL         → PostgreSQL connection string
REDIS_URL            → Redis connection string
```

**Generate secure secrets:**

```bash
# On Mac/Linux
openssl rand -base64 32

# On Windows PowerShell
[System.Convert]::ToBase64String((1..32 | ForEach-Object {[byte](Get-Random -Max 256)})) -ne ""
```

### Step 3: Test the Setup

Push a commit to trigger the workflow:

```bash
git add .
git commit -m "test: trigger deployment workflow"
git push origin main
```

Monitor the workflow:
1. Go to **Actions** tab in GitHub
2. Click on "Unified Deploy - Triumph Synergy" workflow
3. Watch the 7 stages complete:
   - ✓ Validate
   - ✓ Build
   - ✓ Test
   - ✓ Security
   - ✓ Deploy
   - ✓ Health Check
   - ✓ Notify

---

## Workflow Stages Explained

### 1. Validate (Code Quality)
- TypeScript compilation
- ESLint checks
- Markdown validation
- Dependency audit

**Fails if**: Linting errors found

### 2. Build (Next.js Build)
- Compiles TypeScript to JavaScript
- Bundles assets
- Optimizes for production

**Fails if**: Build errors in code

### 3. Test (Integration Tests)
- Runs Playwright E2E tests
- Database integration tests
- API endpoint tests

**Skipped if**: No failing tests

### 4. Security (Vulnerability Scan)
- Trivy filesystem scan
- Dependency vulnerabilities
- Container image analysis

**Continues**: Even if vulnerabilities found (warnings only)

### 5. Deploy (Vercel Deployment)
- Uploads build to Vercel
- Sets production secrets
- Routes traffic to new version

**Requires**: VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID

### 6. Health Check (Verification)
- Waits 30 seconds for deployment
- Calls /api/health endpoint
- Creates deployment record

**Requires**: Successful deployment

### 7. Notify (Status)
- Slack notification (if configured)
- GitHub deployment status
- Execution summary

---

## Troubleshooting

### ❌ "Context access might be invalid: SECRET_NAME"

**Problem**: Secret doesn't exist in GitHub

**Solution**:
1. Go to Settings → Secrets and variables → Actions
2. Verify the secret exists with exact name
3. Make sure you're in the right repository

### ❌ "Vercel deploy skipped"

**Problem**: One of the 3 Vercel secrets is missing

**Solution**:
1. Check GitHub secrets: VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID
2. All three must be present
3. Verify values are correct (no extra spaces)

### ❌ "Build failed: Missing environment variable"

**Problem**: A required Vercel secret is not set

**Solution**:
1. Go to Vercel project settings
2. Add to Environment Variables:
   - NEXTAUTH_SECRET
   - AUTH_SECRET
   - PI_API_KEY
   - PI_INTERNAL_API_KEY
   - SUPABASE_ANON_KEY
   - POSTGRES_URL
   - REDIS_URL

### ❌ "Health check endpoint not responding"

**Problem**: Deployment successful but app not ready

**Solution**:
1. Wait 60 seconds instead of 30
2. Check Vercel deployment logs
3. Verify all Vercel secrets are set
4. Check database connection in POSTGRES_URL

### ❌ "Test failures"

**Problem**: Playwright or integration tests failed

**Solution**:
1. Check test logs in GitHub Actions
2. Run locally: `pnpm test`
3. Fix failing tests before pushing
4. Mark non-critical tests as skipped if needed

---

## Environment Variables Reference

### Secrets (Don't commit these!)

- `NEXTAUTH_SECRET`: NextAuth.js secret (32+ chars)
- `AUTH_SECRET`: Additional auth secret (32+ chars)
- `PI_API_KEY`: Pi Network production API key
- `PI_INTERNAL_API_KEY`: Pi Network internal API key
- `SUPABASE_ANON_KEY`: Supabase anonymous key
- `POSTGRES_URL`: Database connection string
- `REDIS_URL`: Redis connection string

### Public Values (Safe to commit)

- `NEXTAUTH_URL`: https://triumph-synergy-f4s4h76l1-jeremiah-drains-projects.vercel.app
- `STELLAR_HORIZON_URL`: https://horizon.stellar.org
- `SUPABASE_URL`: https://triumph-synergy.supabase.co
- `INTERNAL_PI_MULTIPLIER`: 1.5
- `INTERNAL_PI_MIN_VALUE`: 10.0
- `EXTERNAL_PI_MIN_VALUE`: 1.0

---

## After Successful Deployment

1. **Verify Live**: Visit https://triumph-synergy-f4s4h76l1-jeremiah-drains-projects.vercel.app
2. **Check Health**: Append `/api/health` to URL
3. **Monitor**: Set up Vercel analytics and error tracking
4. **Test Payment**: Submit test Pi payment through chat interface
5. **Review Logs**: Check Vercel deployment logs for any issues

---

## Common Questions

**Q: How often does the workflow run?**  
A: Every push to main branch and pull requests to main

**Q: Can I skip the deployment?**  
A: Yes, add `[skip ci]` to commit message

**Q: What if a secret expires?**  
A: Update in both GitHub and Vercel, new deploys will use updated value

**Q: How do I rollback?**  
A: Revert commit and push - previous deployment will be restored

**Q: Can I deploy manually?**  
A: Yes, use "Run workflow" in GitHub Actions tab, select any branch

---

## Need Help?

- **GitHub Secrets Issues**: Check Settings → Secrets → ensure correct spelling
- **Vercel Issues**: Check Vercel dashboard → Deployments → view logs
- **Build Failures**: Run `pnpm build` locally to debug
- **Test Failures**: Run `pnpm test` locally to reproduce
