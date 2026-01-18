# GitHub Actions Vercel Deployment Configuration

## Issue Fixed
Error: "Could not retrieve Project Settings. To link your Project, remove the `.vercel` directory"

## Solution Applied
✅ `.vercel` directory removed from workflow (it's git-ignored)  
✅ `--confirm` flag added to skip interactive prompts  
✅ Using `--token` flag for authentication

## Required GitHub Secrets

For the deployment to work, you need to set these secrets in your GitHub repository:

### 1. VERCEL_TOKEN
**What it is**: Authentication token for Vercel CLI  
**How to get it**:
1. Go to: https://vercel.com/account/tokens
2. Create a new token (scope: full)
3. Copy the token

**Add to GitHub**:
1. Go to: https://github.com/jdrains110-beep/triumph-synergy/settings/secrets/actions
2. Click "New repository secret"
3. Name: `VERCEL_TOKEN`
4. Value: (paste your token)
5. Click "Add secret"

### 2. VERCEL_ORG_ID (Optional but Recommended)
**What it is**: Your Vercel organization/team ID  
**How to get it**:
```bash
vercel whoami
vercel teams list  # Get ORG_ID from output
```
**Add to GitHub**: Same process as VERCEL_TOKEN

### 3. VERCEL_PROJECT_ID (Optional but Recommended)
**What it is**: Project ID for mainnet deployment  
**How to get it**:
1. Go to your Vercel project settings
2. Find "Project ID" in Settings > General
3. Copy it

**Add to GitHub**: Same process as VERCEL_TOKEN

## How to Set Secrets

**Command line approach** (using Vercel CLI):
```bash
vercel link  # Interactive setup
cat .vercel/project.json  # Shows PROJECT_ID
vercel tokens create --name github-actions  # Get VERCEL_TOKEN
```

Then add to GitHub Secrets:
1. VERCEL_TOKEN → from `vercel tokens create`
2. VERCEL_ORG_ID → from `.vercel/project.json` or `vercel whoami`
3. VERCEL_PROJECT_ID → from `.vercel/project.json`

## Current Status

✅ **Workflow Updated** (commit 4d10fe7)
- Removes stale `.vercel` directory
- Uses VERCEL_TOKEN for auth
- Adds `--confirm` flag for CI/CD compatibility

⏳ **Awaiting**: GitHub Secrets configuration

## Next Steps

1. **Set VERCEL_TOKEN** in GitHub Secrets (required)
2. Optionally set VERCEL_ORG_ID and VERCEL_PROJECT_ID
3. GitHub Actions will trigger on next push
4. Should deploy successfully to Vercel

## Testing

Once secrets are set, you can trigger deployment:
```bash
git commit --allow-empty -m "trigger: test vercel deployment"
git push origin main
```

Then check GitHub Actions logs to verify deployment completes successfully.

## Vercel Project Configuration

**Mainnet**: https://triumph-synergy-jeremiah-drains-projects.vercel.app  
**Testnet**: https://triumph-synergy-testnet.vercel.app  
**Custom Domain**: https://triumphsynergy0576.pinet.com

Each environment needs proper configuration in Vercel dashboard.
