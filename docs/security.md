# Security Guide

## Overview

Triumph-Synergy implements comprehensive security measures to protect user data, financial transactions, and system integrity.

## Security Principles

1. **Defense in Depth**: Multiple layers of security
2. **Least Privilege**: Minimal access rights
3. **Zero Trust**: Verify everything, trust nothing
4. **Secure by Default**: Safe configurations out of the box

## Authentication

### NextAuth.js

Session-based authentication with multiple providers:

```typescript
// lib/auth.ts
import NextAuth from 'next-auth';

export const { auth, handlers } = NextAuth({
  providers: [
    // Credentials, OAuth providers
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    jwt: async ({ token, user }) => {
      // Token customization
    },
    session: async ({ session, token }) => {
      // Session customization
    },
  },
});
```

### Biometric Authentication (WebAuthn)

FIDO2/WebAuthn for passwordless authentication:

```typescript
// Registration
const options = await generateRegistrationOptions({
  rpName: 'Triumph-Synergy',
  rpID: 'triumph-synergy.com',
  userID: user.id,
  userName: user.email,
  attestationType: 'none',
  authenticatorSelection: {
    authenticatorAttachment: 'platform',
    userVerification: 'required',
  },
});

// Authentication
const options = await generateAuthenticationOptions({
  rpID: 'triumph-synergy.com',
  allowCredentials: userCredentials,
  userVerification: 'required',
});
```

## Authorization

### Role-Based Access Control

```typescript
type Role = 'user' | 'admin' | 'developer' | 'enterprise';

const permissions = {
  user: ['read:profile', 'create:payment'],
  admin: ['read:all', 'write:all', 'delete:all'],
  developer: ['read:api', 'create:app', 'manage:webhooks'],
  enterprise: ['read:all', 'bulk:operations'],
};

function hasPermission(role: Role, permission: string): boolean {
  return permissions[role]?.includes(permission) ?? false;
}
```

### API Key Security

```typescript
// Generate secure API key
import { nanoid } from 'nanoid';
import { hash } from 'bcrypt-ts';

const apiKey = `ts_${nanoid(32)}`;
const hashedKey = await hash(apiKey, 12);

// Verify API key
const isValid = await compare(providedKey, storedHash);
```

## Input Validation

### Zod Schemas

```typescript
import { z } from 'zod';

const PaymentSchema = z.object({
  amount: z.number().positive().max(100000),
  memo: z.string().min(1).max(140),
  metadata: z.record(z.unknown()).optional(),
});

// Validate input
const result = PaymentSchema.safeParse(input);
if (!result.success) {
  throw new ValidationError(result.error);
}
```

### SQL Injection Prevention

Using Drizzle ORM with parameterized queries:

```typescript
// Safe - parameterized
const user = await db.query.users.findFirst({
  where: eq(users.id, userId),
});

// Never do this
const unsafe = await db.execute(`SELECT * FROM users WHERE id = '${userId}'`);
```

## Encryption

### Data at Rest

- PostgreSQL with encrypted columns for PII
- Redis with TLS and authentication
- Vercel Blob with server-side encryption

### Data in Transit

- TLS 1.3 for all connections
- HTTPS enforced via middleware
- Certificate pinning for mobile apps

### Sensitive Data

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!;

function encrypt(text: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  // ...encryption logic
}

function decrypt(encrypted: string): string {
  // ...decryption logic
}
```

## API Security

### Rate Limiting

```typescript
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1m'),
  analytics: true,
});

// In API route
const { success, limit, remaining } = await ratelimit.limit(ip);
if (!success) {
  return Response.json({ error: 'Rate limited' }, { status: 429 });
}
```

### CORS Configuration

```typescript
// next.config.ts
const config = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: 'https://app.minepi.com' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
};
```

### Content Security Policy

```typescript
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://sdk.minepi.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data:;
  font-src 'self';
  connect-src 'self' https://api.minepi.com https://horizon.stellar.org;
  frame-src 'none';
  object-src 'none';
`;
```

## Payment Security

### Pi Network Integration

1. **Server-Side Approval**: All payments approved server-side only
2. **Amount Verification**: Verify amounts match expected values
3. **User Verification**: Confirm user identity matches payment
4. **Idempotency**: Prevent duplicate payment processing

```typescript
async function approvePayment(paymentId: string, userId: string) {
  // Get payment from Pi Network
  const payment = await getPayment(paymentId);
  
  // Verify user
  if (payment.user_uid !== userId) {
    throw new Error('User mismatch');
  }
  
  // Verify amount
  if (payment.amount > MAX_PAYMENT_AMOUNT) {
    throw new Error('Amount exceeds limit');
  }
  
  // Check idempotency
  const existing = await db.query.payments.findFirst({
    where: eq(payments.externalId, paymentId),
  });
  if (existing) {
    return existing;
  }
  
  // Approve
  return await Pi.ApprovePayment(paymentId);
}
```

### Stellar Security

- Use dedicated payment accounts
- Multi-signature for high-value transactions
- Monitor for suspicious activity

## Secrets Management

### Environment Variables

```bash
# Required secrets (never commit these)
PI_API_KEY=secret
PI_INTERNAL_API_KEY=secret
STELLAR_PAYMENT_SECRET=secret
AUTH_SECRET=secret
ENCRYPTION_KEY=secret
DATABASE_URL=secret
```

### Secret Rotation

- Rotate API keys every 90 days
- Use short-lived tokens where possible
- Implement graceful key rotation

## Audit Logging

```typescript
interface AuditLog {
  timestamp: Date;
  userId: string;
  action: string;
  resource: string;
  ipAddress: string;
  userAgent: string;
  details: Record<string, unknown>;
}

async function logAuditEvent(event: AuditLog) {
  await db.insert(auditLogs).values(event);
  
  // High-severity events
  if (event.action.includes('payment') || event.action.includes('delete')) {
    await alertSecurityTeam(event);
  }
}
```

## Incident Response

### Detection

- Real-time monitoring of failed authentication
- Unusual payment patterns
- API abuse detection
- Anomaly detection on user behavior

### Response Plan

1. **Identify**: Confirm incident scope
2. **Contain**: Isolate affected systems
3. **Eradicate**: Remove threat
4. **Recover**: Restore normal operations
5. **Document**: Post-incident analysis

### Emergency Contacts

- Security Team: security@triumph-synergy.com
- On-Call: Available 24/7 via PagerDuty
- Pi Network Security: security@minepi.com

## Compliance

### Data Protection

- GDPR compliance for EU users
- CCPA compliance for California users
- PCI DSS Level 1 for payment processing

### Credit Bureau Compliance

- FCRA (Fair Credit Reporting Act)
- FACTA (Fair and Accurate Credit Transactions Act)
- Metro 2 format compliance

## Security Checklist

- [ ] All secrets stored in environment variables
- [ ] HTTPS enforced in production
- [ ] Rate limiting on all API endpoints
- [ ] Input validation on all user input
- [ ] SQL injection prevention (use ORM)
- [ ] XSS prevention (CSP headers)
- [ ] CSRF protection enabled
- [ ] Audit logging for sensitive actions
- [ ] Regular security updates
- [ ] Penetration testing quarterly

## Reporting Vulnerabilities

If you discover a security vulnerability, please report it responsibly:

1. **Email**: security@triumph-synergy.com
2. **PGP Key**: Available on request
3. **Response Time**: 24-48 hours
4. **Bug Bounty**: Available for critical vulnerabilities
