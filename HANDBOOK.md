# Triumph Synergy Handbook 🥧

**Complete reference guide for the Pi Network payment platform**

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Configuration](#configuration)
4. [Pi Network Integration](#pi-network-integration)
5. [Deployment](#deployment)
6. [API Reference](#api-reference)
7. [Security & Compliance](#security--compliance)
8. [Troubleshooting](#troubleshooting)

---

## Overview

Triumph Synergy is a comprehensive Pi Network payment platform featuring:

- **Pi SDK 2.0 Integration** - Full Pi Browser support with CDN fallbacks
- **Stellar Settlement** - Automatic blockchain settlement for transactions
- **Biometric Authentication** - WebAuthn-based secure authentication
- **Enterprise Compliance** - ISO20022 compliant payment processing
- **Multi-Cloud Deployment** - Vercel, Heroku, and Docker support

**Tech Stack:**
- Next.js 16.1.1 + React 19
- TypeScript 5.9.3
- PostgreSQL + Drizzle ORM
- Redis for caching
- Stellar SDK for blockchain
- Vitest (59 passing tests)

---

## Quick Start

### Installation

```bash
# Clone repository
git clone https://github.com/jdrains110-beep/triumph-synergy.git
cd triumph-synergy

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your credentials

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

### First-Time Setup

1. **Get Pi Network API Keys** from https://pi-apps.github.io
2. **Set up PostgreSQL database** (local or cloud)
3. **Configure Redis** for caching
4. **Add environment variables** (see Configuration section)
5. **Run migrations**: `pnpm db:push`
6. **Test locally** in Pi Browser or regular browser

---

## Configuration

### Required Environment Variables

#### Pi Network (Critical)
```bash
PI_API_KEY=your-pi-api-key
PI_API_SECRET=your-pi-api-secret
PI_INTERNAL_API_KEY=your-internal-api-key
NEXT_PUBLIC_PI_SANDBOX=false          # true for testnet, false for mainnet
NEXT_PUBLIC_PI_APP_ID=triumph-synergy
```

#### Database
```bash
POSTGRES_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://localhost:6379
```

#### Stellar Settlement (Optional)
```bash
STELLAR_HORIZON_URL=https://horizon.stellar.org
STELLAR_PAYMENT_ACCOUNT=Gxxxxxxxx
STELLAR_PAYMENT_SECRET=Sxxxxxxxx
```

#### Biometric Authentication (Optional)
```bash
NEXT_PUBLIC_WEBAUTHN_RP_NAME=Triumph Synergy
NEXT_PUBLIC_WEBAUTHN_RP_ID=triumphsynergy.com
```

---

## Pi Network Integration

### Status Dashboard

| Feature | Status | Description |
|---------|--------|-------------|
| Pi SDK 2.0 | ✅ Active | Full Pi Browser integration |
| Pi Payments | ✅ Active | Create, approve, complete payments |
| Internal Pi | ✅ Active | 1.5x multiplier for internal transactions |
| External Pi | ✅ Active | Standard Pi transactions |
| Stellar Settlement | ✅ Active | Automatic blockchain settlement |
| Webhooks | ✅ Active | Real-time payment notifications |

### Implementation Details

**Pi SDK Loading:** CDN script in `app/layout.tsx`
```typescript
<script src="https://sdk.minepi.com/pi-sdk.js" async />
```

**Pi Provider:** Wraps app in `lib/pi-sdk/pi-provider.tsx`
- Detects Pi Browser with 10s timeout
- Initializes Pi SDK with appId and sandbox mode
- Provides context to all components

**Payment Flow:**
1. User initiates payment via `usePiPayment` hook
2. Pi.createPayment() called in Pi Browser
3. Server approves via `/api/pi/approve`
4. Server completes via `/api/pi/complete`
5. Stellar settlement (if configured)

### Validation Key

**Production URL:**
```
https://triumphsynergy0576.pinet.com/validation-key.txt
```

**Validation Key:** Located in `/public/validation-key.txt`

### Domain Verification

1. Go to https://pi-apps.github.io
2. Sign in with **MAINNET** Pi account
3. Find app: **triumph-synergy**
4. Click **Verify Domain**
5. Confirm domain binding

---

## Deployment

### Vercel (Recommended)

1. **Import from GitHub**
   - Connect repository
   - Select `main` branch

2. **Configure Environment Variables**
   - Add all required Pi Network secrets
   - Set `NEXT_PUBLIC_PI_SANDBOX=false` for production
   - Add database and Redis URLs

3. **Deploy**
   - Push to `main` branch triggers auto-deploy
   - Monitor at https://vercel.com/dashboard

4. **Custom Domain** (Optional)
   - Add pinet.com domain in Vercel
   - Update DNS records
   - Verify domain on Pi Platform

### GitHub Actions

Automatic CI/CD pipeline includes:
- ✅ Pi SDK validation
- ✅ Security audit (CodeQL)
- ✅ Unit tests (59 tests)
- ✅ Build verification
- ✅ Vercel deployment

**Workflow:** `.github/workflows/deploy.yml`

### Docker

```bash
# Build image
docker build -t triumph-synergy .

# Run container
docker run -p 3000:3000 \
  -e PI_API_KEY=xxx \
  -e PI_API_SECRET=xxx \
  -e POSTGRES_URL=xxx \
  triumph-synergy
```

**Docker Compose:** Available in `docker-compose.yml`

---

## API Reference

### Pi Payment APIs

#### Approve Payment
```
POST /api/pi/approve
Body: { paymentId: string }
Response: { approved: boolean, paymentId: string }
```

#### Complete Payment
```
POST /api/pi/complete
Body: { paymentId: string, txid: string }
Response: { completed: boolean, txid: string }
```

#### Get Pi Value
```
GET /api/pi/value
Response: { 
  value: number, 
  multiplier: number,
  network: "mainnet" | "testnet"
}
```

#### Pi Status
```
GET /api/pi/status
Response: {
  initialized: boolean,
  browser: boolean,
  network: string,
  user: object | null
}
```

### Authentication APIs

#### Pi OAuth Callback
```
GET /api/auth/pi/callback
Params: code, state
Response: { user: object, session: string }
```

#### Biometric Register
```
POST /api/biometric/register
Body: { credential: PublicKeyCredential }
Response: { registered: boolean, credentialId: string }
```

#### Biometric Verify
```
POST /api/biometric/verify
Body: { assertion: PublicKeyCredential }
Response: { verified: boolean, user: object }
```

### Webhook Endpoints

#### Pi Payment Webhook
```
POST /api/webhooks/pi
Body: { paymentId: string, status: string, ... }
Response: { received: boolean }
```

---

## Security & Compliance

### Security Features

- **Biometric Authentication** - WebAuthn passkeys for passwordless login
- **Pi Origin Enforcement** - Validates all Pi Browser requests
- **CORS Protection** - Proper headers configured in `next.config.ts`
- **Rate Limiting** - Redis-based rate limiting on sensitive endpoints
- **Input Validation** - All inputs sanitized and validated
- **SQL Injection Protection** - Drizzle ORM parameterized queries
- **XSS Prevention** - React automatic escaping + sanitization

### Compliance

- **ISO20022 Compliance** - International payment messaging standard
- **GDPR Ready** - User data privacy controls
- **PCI DSS Considerations** - No credit card data stored
- **Audit Logging** - All transactions logged to database

### Security Checklist

- [ ] All environment variables in Vercel/production secrets
- [ ] HTTPS enabled on all domains
- [ ] Pi API keys rotated regularly
- [ ] Database credentials secured
- [ ] Redis authentication enabled
- [ ] Stellar secret keys encrypted
- [ ] Regular security audits run
- [ ] Dependencies updated (Dependabot enabled)

---

## Troubleshooting

### Pi Browser Detection Issues

**Problem:** App doesn't detect Pi Browser

**Solutions:**
1. Check User-Agent contains "PiBrowser"
2. Verify `window.Pi` object exists
3. Check Pi SDK script loaded: View page source for `pi-sdk.js`
4. Enable debug logging in browser console

**Debug Commands:**
```javascript
console.log("User-Agent:", navigator.userAgent);
console.log("Pi Object:", window.Pi);
console.log("Pi Initialized:", window.Pi?.initialized);
```

### Payment Flow Errors

**Problem:** Payments fail to complete

**Solutions:**
1. Verify `PI_API_KEY` and `PI_API_SECRET` are correct
2. Check payment is approved before completing
3. Ensure webhook endpoint is accessible
4. Review server logs for error details
5. Confirm sandbox mode matches environment

**Check Payment Status:**
```bash
curl https://api.minepi.com/v2/payments/<paymentId> \
  -H "Authorization: Key YOUR_API_KEY"
```

### Environment Variable Issues

**Problem:** Missing or incorrect environment variables

**Solutions:**
1. Copy `.env.example` to `.env.local`
2. Fill in all required variables
3. Restart dev server after changes
4. For Vercel, add to dashboard environment variables
5. Verify with: `echo $VARIABLE_NAME`

### Build Failures

**Problem:** Build fails in CI/CD or local

**Solutions:**
1. Run `pnpm install` to update dependencies
2. Clear `.next` cache: `rm -rf .next`
3. Check TypeScript errors: `pnpm tsc --noEmit`
4. Verify Node.js version: `node -v` (requires 18+)
5. Review build logs for specific errors

### Database Connection Issues

**Problem:** Cannot connect to PostgreSQL or Redis

**Solutions:**
1. Verify database is running
2. Check connection string format
3. Test connection: `psql $POSTGRES_URL`
4. For Redis: `redis-cli ping`
5. Check firewall rules allow connections
6. Verify SSL mode if required

### Deployment Issues

**Problem:** Vercel deployment fails

**Solutions:**
1. Check build logs in Vercel dashboard
2. Verify all environment variables set
3. Ensure no syntax errors in code
4. Check project settings (Node version, build command)
5. Review `.vercelignore` and `.gitignore`
6. Contact support if persistent

---

## Additional Resources

### Documentation
- [Getting Started Guide](docs/getting-started.md)
- [Pi Network Integration](docs/pi-network.md)
- [API Reference](docs/api-reference.md)
- [Architecture Overview](docs/architecture.md)
- [Security Policies](docs/security.md)

### External Links
- [Pi Network Docs](https://docs.minepi.com/)
- [Pi Developer Portal](https://pi-apps.github.io)
- [Stellar Documentation](https://developers.stellar.org/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Vercel Documentation](https://vercel.com/docs)

### Support
- **GitHub Issues:** https://github.com/jdrains110-beep/triumph-synergy/issues
- **Pi Developer Community:** https://community.minepi.com/
- **Project Repository:** https://github.com/jdrains110-beep/triumph-synergy

---

## Status Summary

**Build:** ✅ Passing  
**Tests:** 59/59 Passing  
**Security:** 0 Vulnerabilities  
**Deployment:** ✅ Production Ready  
**Pi Integration:** ✅ Mainnet Active  

**Last Updated:** January 2026  
**Version:** 1.0.0  
**License:** See LICENSE file

---

**🚀 Ready to build with Pi Network? Start with the Quick Start section above!**
