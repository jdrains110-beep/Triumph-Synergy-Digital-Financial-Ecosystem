# CRITICAL CONFIGURATION: Pi App Studio Redirect

## Overview

This application is configured to redirect ALL traffic from Vercel URLs to the Pi Network domain.

## Redirect Rules

- **Source**: `https://triumph-synergy-jeremiah-drains-projects.vercel.app/` (and all subpaths)
- **Destination**: `https://triumphsynergy0576.pinet.com/` (and matching subpaths)
- **Status Code**: 307 (Temporary Redirect)
- **Applies To**: All requests, no exceptions

## Files Controlling This Behavior

### 1. **proxy.ts** (PRIMARY - DO NOT MODIFY)

- Handles runtime redirect logic
- Catches all Vercel domain requests
- Preserves pathname and query strings
- LOCKED with protective comments

### 2. **vercel.json** (BACKUP)

- Contains Vercel-level redirect configuration
- Acts as fallback if proxy.ts fails
- Ensures redirect works at platform level

### 3. **app/layout.tsx** (METADATA)

- All metadata URLs point to `triumphsynergy0576.pinet.com`
- OpenGraph URLs point to Pi Network domain
- Ensures sharing/crawling uses correct domain

## ⚠️ IMPORTANT: DO NOT CHANGE

When adding new features, add-ons, or modifications:

1. **Do NOT modify the redirect logic** in `proxy.ts`
2. **Do NOT change** `vercel.json` redirects section
3. **Do NOT update** metadata URLs in `app/layout.tsx` to point to Vercel
4. **All code** must be added AFTER the redirect check in proxy.ts

## Verification

To verify the redirect is working:

```bash
curl -I https://triumph-synergy-jeremiah-drains-projects.vercel.app/
# Should return 307 redirect to triumphsynergy0576.pinet.com
```

## Contact

If you need to understand or modify this configuration, reference this file and contact the infrastructure team.
