# Security Policy & Best Practices

## 🔒 Critical Security Requirements

### Environment Variables
- ✅ `.env` file removed from git tracking
- ✅ `.env` in .gitignore to prevent accidental commits
- ✅ Never commit: `AUTH_SECRET`, `NEXTAUTH_SECRET`, `POSTGRES_URL`, `API_KEYS`, etc.
- ✅ Use `.env.example` as template for required variables

### Secrets Management
**For Production (Vercel):**
1. Go to Vercel Project Settings → Environment Variables
2. Add required secrets (never in code):
   - `NEXTAUTH_SECRET` (32+ chars, random)
   - `AUTH_SECRET` (32+ chars, random)
   - `POSTGRES_URL` (production database URL)
   - `REDIS_URL` (production Redis URL)
   - `PI_API_KEY` (Pi Network API key)
   - `PI_INTERNAL_API_KEY` (internal Pi key)
   - `SUPABASE_ANON_KEY` (Supabase anon key)
   - `SUPABASE_SERVICE_ROLE_KEY` (Supabase service role)

**For Local Development:**
1. Create `.env.local` (in .gitignore)
2. Copy from `.env.example`
3. Fill in real development secrets

### Code Security

#### ✅ What We Do Right
- All secrets accessed via `process.env`
- Never hardcoded credentials in source code
- Environment variables validated before use
- Graceful fallbacks for missing secrets
- Auth required for sensitive routes
- CORS headers configured
- Security headers in vercel.json:
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: SAMEORIGIN
  - X-XSS-Protection: 1; mode=block
  - Referrer-Policy: strict-origin-when-cross-origin
  - Permissions-Policy: geolocation=(), microphone=(), camera=()

#### ✅ Authentication Security
- NextAuth with bcrypt password hashing
- Session tokens in secure HTTP-only cookies
- CSRF protection enabled
- Rate limiting per user type
- User data isolation enforced
- Guest sessions don't access database

### Database Security
- Parameterized queries (via Drizzle ORM)
- No SQL injection vulnerabilities
- Row-level security with user_id checks
- Connection pooling for resource efficiency
- Sensitive data encrypted in transit

### API Security
- All `/api/*` routes require authentication (except public endpoints)
- Input validation on all POST/PATCH requests
- Error messages don't expose system details
- Rate limiting per user
- User ID verification on all operations
- Delete operations require ownership verification

### Deployment Security
- HTTPS only (enforced by Vercel)
- Environment variables isolated per deployment
- Preview deployments get separate secrets
- No secrets in logs or build output
- Build artifacts don't include secrets

---

## 🚨 CRITICAL: Never Do This

❌ **DON'T:**
- Commit `.env` files with real secrets
- Hardcode API keys in source code
- Log sensitive information
- Use weak secrets (<32 characters)
- Reuse secrets across environments
- Commit database credentials
- Store secrets in version control

✅ **DO:**
- Use environment variables for all secrets
- Rotate secrets regularly
- Use strong random values (32+ chars)
- Document required environment variables
- Use `.env.example` for templates
- Keep .env in .gitignore
- Review commits before pushing

---

## 🔐 Repository Security Configuration

### .gitignore Security Rules
```
# Environment files with secrets
.env
.env.*.local
.env.production
.env.staging

# Logs that might contain secrets
*.log
logs/

# IDE temporary files
.DS_Store
.idea/
*.swp
*.swo
```

### Committed to Git ✅
- `.env.example` - Template only, no real secrets
- `.env.local.example` - Local template, no real secrets
- All source code (vetted for no hardcoded secrets)

### NOT Committed ❌
- `.env` - Removed from tracking via `git rm --cached`
- `.env.local` - Local development only
- `.env.production` - Production secrets only
- Real API keys or passwords anywhere

---

## 🛡️ Pre-Deployment Checklist

Before any production deployment:
- [ ] All secrets are in Vercel environment variables
- [ ] `.env` file is NOT tracked by git
- [ ] `.env` is in `.gitignore`
- [ ] No credentials hardcoded in source
- [ ] All API routes have auth checks
- [ ] Database URL uses secure connection
- [ ] HTTPS enabled for all external URLs
- [ ] Security headers are in vercel.json
- [ ] Rate limiting is enabled
- [ ] User isolation is enforced

---

## 📋 GitHub Repository Settings

Required security settings:
1. ✅ **Branch Protection Rules** (main branch):
   - Require pull request reviews before merging
   - Require status checks to pass
   - Require branches to be up to date

2. ✅ **Secrets Scanner**: Enabled
   - Blocks pushes with exposed secrets
   - Reports found secrets

3. ✅ **Dependabot**: Enabled
   - Automatic vulnerability scanning
   - Security updates alerts

---

## 🔄 Incident Response

**If secrets are exposed:**
1. Immediately rotate all exposed secrets
2. Force update in Vercel environment
3. Review git history for exposure timeline
4. Check access logs for unauthorized use
5. Document incident
6. Monitor for unusual activity
7. Never revert commits containing secrets

---

## 📞 Contact & References

For security questions or to report vulnerabilities:
- Check `.env.example` for required environment variables
- Review `VERCEL_DEPLOYMENT_GUIDE.md` for setup
- See `PROJECT_HEALTH_CHECK.md` for system security status

---

**Status**: ✅ All security requirements met  
**Last Updated**: January 6, 2026  
**Next Review**: Before production deployment
