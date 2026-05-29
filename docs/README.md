# Triumph-Synergy Documentation

## Overview

Triumph-Synergy is an advanced sovereign quantum digital financial ecosystem powered by Pi Network. This documentation provides comprehensive guides for deployment, integration, and usage.

## Quick Links

| Category | Description |
|----------|-------------|
| [Getting Started](./getting-started.md) | Initial setup and quick start guide |
| [Architecture](./architecture.md) | System architecture and design |
| [Pi Network Integration](./pi-network.md) | Pi SDK, payments, and blockchain integration |
| [API Reference](./api-reference.md) | Complete API documentation |
| [Deployment](./deployment.md) | Production deployment guides |
| [Security](./security.md) | Security policies and best practices |

## Project Structure

```
triumph-synergy/
├── app/                    # Next.js App Router pages and API routes
├── components/             # React components
├── lib/                    # Core libraries and utilities
│   ├── ai/                 # AI SDK integration
│   ├── db/                 # Database schemas and migrations
│   ├── financial/          # Credit bureau and financial integrations
│   ├── integrations/       # External service integrations
│   └── payments/           # Pi Network payment processing
├── sdk/                    # Pi SDK implementations
│   ├── pi-sdk-js/          # Server-side Pi SDK
│   ├── pi-sdk-react/       # Browser-side Pi SDK
│   └── pi-sdk-nextjs/      # Next.js App Router handlers
├── docker/
│   ├── sovereign-mesh/     # WireGuard encrypted private mesh hub
│   ├── sovereign-military-bridge/  # CNSA Suite 2.0 military crypto (port 8199)
│   ├── quantum-intel-fortress/     # ML-KEM-1024 / ML-DSA-87 post-quantum (port 8094)
│   └── ...                 # All other service containers
├── scripts/
│   └── generate-mesh-keys.sh  # WireGuard keypair + PSK generator
├── tests/                  # Test suites
│   ├── unit/               # Unit tests (Vitest)
│   ├── e2e/                # End-to-end tests (Playwright)
│   └── routes/             # Route tests
└── docs/                   # Documentation
```

## Key Features

### 1. Pi Network Payment Integration
- Primary payment method (95% transaction volume target)
- Internal Pi multiplier (1.5x bonus for ecosystem payments)
- Stellar blockchain settlement
- Real-time transaction monitoring

### 2. Credit Bureau Integration
- Equifax, Experian, TransUnion connections
- Data furnisher registration
- Metro 2 format compliance
- Automated credit reporting

### 3. Biometric Authentication
- WebAuthn/FIDO2 support
- Passkey authentication
- Multi-factor authentication
- Secure credential management

### 4. Smart Contracts
- Digital contract management
- E-signature integration
- Template library
- Automated execution

### 5. Streaming & Entertainment
- HLS video streaming
- Watch party functionality
- Real-time analytics
- Adaptive bitrate streaming

### 6. Triumph Sovereign Mesh Network
- WireGuard encrypted private mesh — `10.13.37.0/24` subnet
- 5-layer encryption: ChaCha20-Poly1305 + Curve25519 ECDH + per-peer PSK + TLS 1.3 + CNSA Suite 2.0
- Hub management API on `:8200` — topology, peer registry, Prometheus metrics
- Post-quantum key exchange via `triumph-quantum-intel-fortress` (ML-KEM-1024)
- All 10 ecosystem services connected with static mesh IPs
- See: [docker/sovereign-mesh/](../docker/sovereign-mesh/)

### 7. Sovereign Military Bridge — CNSA Suite 2.0
- NSA/CISA Commercial National Security Algorithm Suite 2.0 (CNSA 2.0)
- AES-256-GCM, ECDH P-384, RSA-3072, Kyber-1024, Dilithium-5
- ARPANET multi-path routing, NSFNet backbone peering, DARPA autonomous healing
- API on `:8199` — encrypt, decrypt, sign, verify, key-exchange, heal
- See: [docker/sovereign-military-bridge/](../docker/sovereign-military-bridge/)

## Environment Variables

```bash
# Pi Network
PI_API_KEY=your-pi-api-key
PI_INTERNAL_API_KEY=your-internal-api-key

# Stellar
STELLAR_HORIZON_URL=https://horizon.stellar.org
STELLAR_PAYMENT_ACCOUNT=your-stellar-account
STELLAR_PAYMENT_SECRET=your-stellar-secret

# Database
POSTGRES_URL=postgresql://...
REDIS_URL=redis://...

# Authentication
AUTH_SECRET=your-auth-secret
NEXTAUTH_URL=https://your-domain.com
```

## Scripts

```bash
# Development
pnpm dev          # Start development server
pnpm build        # Production build
pnpm start        # Start production server

# Testing
pnpm test:unit    # Run unit tests (Vitest)
pnpm test         # Run E2E tests (Playwright)
pnpm test:coverage # Generate coverage report

# Code Quality
pnpm lint         # Run linter
pnpm format       # Auto-fix formatting

# Database
pnpm db:generate  # Generate migrations
pnpm db:migrate   # Apply migrations
pnpm db:studio    # Open Drizzle Studio
```

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16.1.1, React 18.2, TypeScript 5.9 |
| Backend | Next.js API Routes, Drizzle ORM |
| Database | PostgreSQL, Redis |
| Blockchain | Pi Network, Stellar SDK 14.4.3 |
| Authentication | NextAuth.js, WebAuthn |
| Network Security | WireGuard (sovereign mesh), TLS 1.3, CNSA Suite 2.0 |
| Post-Quantum Crypto | ML-KEM-1024, ML-DSA-87, SPHINCS+ (liboqs) |
| Testing | Vitest, Playwright |
| Deployment | Replit, Docker |

## Service Ports

| Port | Service |
|------|---------|
| 8200 | Sovereign Mesh Hub API |
| 51820/udp | WireGuard (Sovereign Mesh) |
| 8199 | Sovereign Military Bridge (CNSA 2.0) |
| 8094 | Quantum Intel Fortress (ML-KEM-1024) |
| 8081 | Triumph Vault |
| 8080 | Settlement Core |
| 9090 | Prometheus |
| 3001 | Grafana |
| 31501 | Pi Mainnet Node Horizon API |
| 31500 | Pi Mainnet Node SCP |

## Status

- **Build**: ✅ Passing (76 routes)
- **Lint**: ✅ 0 errors
- **Tests**: ✅ 59 unit tests passing
- **Security**: ✅ 0 vulnerabilities — 5-layer encrypted sovereign mesh active
- **TypeScript**: ✅ Strict mode enabled
- **Pi Mainnet Node**: ✅ Joining SCP (ledger 26620210+)
- **Sovereign Mesh**: ✅ WireGuard hub live on 10.13.37.0/24

## Support

For issues and feature requests, please use the GitHub Issues tracker.

## License

Proprietary — All Rights Reserved

Licensed under [PiOS License](../LICENSE-PIOS) for Pi Network ecosystem compatibility.
See also: [Proprietary License](../LICENSE)

---

## Sovereign Ownership

**Founder & Superior Sovereign:** Jeremiah Joel Drains
**EIN:** 41-6777102 (TRIUMPH-SYNERGY Trust, Putnam County, FL)
**Copyright (C) 2024-2026 Jeremiah Joel Drains, Founder & Superior Sovereign / Triumph Synergy. All rights reserved.**

Maximum Quantum Sovereign Protection Active — ML-KEM-1024 · ML-DSA-87 · SHAKE-256+SHA3-512 · SPHINCS+ · AES-256-GCM

Sovereign Ownership Notice: [legal/SOVEREIGN-OWNERSHIP-NOTICE.md](../legal/SOVEREIGN-OWNERSHIP-NOTICE.md)
