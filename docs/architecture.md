# System Architecture

## Overview

Triumph-Synergy is built as a modular, scalable financial ecosystem with Pi Network as the backbone.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│  Pi Browser  │  Web Browser  │  Mobile App  │  Partner APIs     │
└──────┬───────┴───────┬───────┴──────┬───────┴────────┬──────────┘
       │               │              │                │
       ▼               ▼              ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  Next.js 16.1.1 (App Router + Pages Router)                     │
│  ┌──────────────┬──────────────┬──────────────┬────────────┐    │
│  │  Pi Payment  │  Biometric   │  Streaming   │  Contracts │    │
│  │  Components  │  Auth UI     │  Player      │  Manager   │    │
│  └──────────────┴──────────────┴──────────────┴────────────┘    │
└─────────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API LAYER                                   │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐      │
│  │ /api/pi/*   │ /api/bio/* │ /api/stream │ /api/credit │      │
│  │ Payments    │ Auth       │ Media       │ Bureaus     │      │
│  └─────────────┴─────────────┴─────────────┴─────────────┘      │
│                                                                  │
│  Middleware: Auth, Rate Limiting, Logging, CORS                  │
└─────────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SERVICE LAYER                                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐   │
│  │ Pi Network SDK │  │ Credit Bureau  │  │ Financial Hub    │   │
│  │ - React SDK    │  │ Integration    │  │ - Payment Router │   │
│  │ - Server SDK   │  │ - Equifax      │  │ - Fee Calculator │   │
│  │ - NextJS SDK   │  │ - Experian     │  │ - Limit Checker  │   │
│  └────────────────┘  │ - TransUnion   │  └──────────────────┘   │
│                      └────────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│                   BLOCKCHAIN LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐    ┌────────────────────────┐          │
│  │    Pi Network       │    │    Stellar Network     │          │
│  │  - Authentication   │────│  - Settlement          │          │
│  │  - Payments         │    │  - Asset Management    │          │
│  │  - User Identity    │    │  - Smart Contracts     │          │
│  └─────────────────────┘    └────────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATA LAYER                                    │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ PostgreSQL  │  │   Redis     │  │    Vercel Blob          │  │
│  │ - Users     │  │ - Sessions  │  │ - Media Files           │  │
│  │ - Payments  │  │ - Cache     │  │ - Documents             │  │
│  │ - Contracts │  │ - Rate Limit│  │ - User Uploads          │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### Frontend Components

```
components/
├── ui/                     # Base UI components (shadcn/ui)
│   ├── button.tsx
│   ├── dialog.tsx
│   └── ...
├── auth/                   # Authentication components
│   ├── biometric-login.tsx
│   └── sign-in-form.tsx
├── payments/               # Payment components
│   └── PiPaymentButton.tsx
├── streaming/              # Media streaming
│   └── stream-controls.tsx
└── contracts/              # Contract management
    └── contract-viewer.tsx
```

### API Route Structure

```
app/api/
├── pi/                     # Pi Network endpoints
│   ├── approve/route.ts
│   ├── complete/route.ts
│   └── value/route.ts
├── biometric/              # WebAuthn endpoints
│   ├── register/
│   └── authenticate/
├── ecosystem/              # Ecosystem management
│   ├── applications/
│   └── payments/
├── credit/                 # Credit bureau integration
├── streaming/              # Media streaming
└── contracts/              # Smart contracts
```

### Library Structure

```
lib/
├── ai/                     # AI SDK integration
│   └── models.ts
├── db/                     # Database layer
│   ├── schema.ts           # Drizzle schema
│   ├── queries.ts          # Query functions
│   └── migrate.ts          # Migration runner
├── financial/              # Financial services
│   └── credit-bureau-integration.ts
├── integrations/           # External integrations
│   └── financial-hub.ts
├── payments/               # Payment processing
│   └── pi-network-primary.ts
└── utils/                  # Utilities
    └── auth.ts
```

## Data Flow

### Payment Flow

```
1. User initiates payment in UI
2. PiPaymentButton calls Pi.createPayment()
3. Pi SDK shows payment confirmation
4. User approves in Pi Browser
5. onReadyForServerApproval callback fires
6. Client POSTs to /api/pi/approve
7. Server calls Pi.ApprovePayment()
8. Pi Network processes on Stellar
9. onReadyForServerCompletion callback fires
10. Client POSTs to /api/pi/complete
11. Server calls Pi.CompletePayment()
12. Payment recorded in database
13. UI updates with success
```

### Authentication Flow

```
1. User clicks "Sign in with Biometrics"
2. Client requests authentication challenge
3. Browser prompts for biometric
4. User authenticates with fingerprint/face
5. Authenticator creates signature
6. Client sends to /api/biometric/verify
7. Server verifies WebAuthn signature
8. Session created with NextAuth
9. User redirected to dashboard
```

## Scalability Considerations

### Horizontal Scaling

- Stateless API routes allow unlimited horizontal scaling
- Redis for distributed session/cache management
- PostgreSQL with read replicas for high traffic

### Performance Optimizations

- Next.js Turbopack for fast builds
- Edge functions for low-latency responses
- CDN caching for static assets
- Database connection pooling

### Monitoring

- Vercel Analytics for performance metrics
- OpenTelemetry for distributed tracing
- Custom logging for audit trails

## Security Architecture

### Defense in Depth

```
Layer 1: Edge (Cloudflare/Vercel)
├── DDoS protection
├── WAF rules
└── Rate limiting

Layer 2: Application
├── Input validation (Zod)
├── CSRF protection
└── Content Security Policy

Layer 3: Authentication
├── NextAuth.js
├── WebAuthn/Passkeys
└── Session management

Layer 4: Authorization
├── Role-based access control
├── Resource-level permissions
└── API key scoping

Layer 5: Data
├── Encryption at rest
├── Encryption in transit (TLS)
└── PII protection
```

## Deployment Architecture

### Production (Vercel)

```
┌───────────────────────────────────────┐
│           Vercel Edge Network          │
├───────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌───────┐ │
│  │ Edge    │  │ Serverless│  │ Static│ │
│  │Functions│  │ Functions │  │ Assets│ │
│  └─────────┘  └─────────┘  └───────┘ │
└───────────────────────────────────────┘
         │              │
         ▼              ▼
┌─────────────┐  ┌─────────────┐
│ PostgreSQL  │  │    Redis    │
│ (Supabase)  │  │  (Upstash)  │
└─────────────┘  └─────────────┘
```

### Self-Hosted (Docker)

```yaml
# docker-compose.yml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:16
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    volumes:
      - redis_data:/data
```
