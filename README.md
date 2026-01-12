# Triumph Synergy

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16.1+-black.svg)](https://nextjs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-9.12.3+-orange.svg)](https://pnpm.io/)

Advanced payment routing with compliance automation powered by Pi Network.

## Overview

Triumph Synergy is a multi-cloud financial ecosystem that integrates Pi Network payments with compliance automation, AI-powered analytics, and zero-downtime deployment capabilities.

### Key Capabilities

- 🔐 **Secure Payment Processing** - Pi Network primary with 95% transaction volume target
- 🌐 **Cross-Chain Settlement** - Stellar network integration for interoperability
- ✅ **Compliance Automation** - PCI-DSS, SOC2, GDPR, CCPA ready
- 🚀 **Zero-Downtime Deployment** - Blue-green deployments with automatic failover
- ☁️ **Multi-Cloud Architecture** - GCP primary, AWS secondary with automatic failover
- 🔒 **Biometric Authentication** - Advanced security with biometric verification
- 📊 **Real-time Analytics** - AI-powered transaction monitoring and insights

## Features

- **Pi Network Integration**: Primary payment method with 95% transaction volume target
- **Stellar Settlement**: Cross-chain settlement with Stellar Consensus
- **Compliance Automation**: PCI-DSS, SOC2, GDPR, CCPA compliance ready
- **Zero-Downtime Deployment**: Blue-green deployments with automatic failover
- **Multi-Cloud Architecture**: GCP primary, AWS secondary with automatic failover

## Quick Start

### Prerequisites

- **Node.js** 20+ ([Download](https://nodejs.org/))
- **pnpm** 9.12.3+ (`npm install -g pnpm`)
- **PostgreSQL** 15+ (or use Docker)
- **Redis** 7+ (or use Docker)
- **Docker** (optional, for local services)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/jdrains110-beep/triumph-synergy.git
   cd triumph-synergy
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Start local services (PostgreSQL & Redis)**
   ```bash
   pnpm db:start
   ```

5. **Run database migrations**
   ```bash
   pnpm db:migrate
   ```

6. **Start development server**
   ```bash
   pnpm dev
   ```

The application will be available at **http://localhost:3000**

### Development Commands

```bash
pnpm dev              # Start development server
pnpm build            # Build for production
pnpm start            # Start production server
pnpm lint             # Run linter
pnpm format           # Format code
pnpm test             # Run tests
pnpm db:studio        # Open database GUI
```

## Deployment

### Production Deployment (Vercel)

#### Required Vercel Environment Variables

Set these in your Vercel project settings:

```
NEXTAUTH_SECRET          # Generate: openssl rand -base64 32
AUTH_SECRET              # Generate: openssl rand -base64 32
PI_API_KEY              # Your Pi Network API key
PI_INTERNAL_API_KEY     # Your Pi Network internal key
SUPABASE_ANON_KEY       # Supabase anonymous key
SUPABASE_SERVICE_ROLE_KEY # Supabase service role key
POSTGRES_URL            # Production PostgreSQL connection string
REDIS_URL               # Production Redis connection string
```

#### Required GitHub Secrets (for CI/CD)

```
VERCEL_TOKEN            # Vercel API token
VERCEL_ORG_ID          # Vercel organization ID
VERCEL_PROJECT_ID      # Vercel project ID
SUPABASE_ANON_KEY      # Supabase anonymous key
```

For detailed deployment instructions, see [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md).

## Database Management

### Database Commands

```bash
pnpm db:generate        # Generate migration files
pnpm db:migrate         # Run migrations
pnpm db:push            # Push schema changes
pnpm db:pull            # Pull schema from database
pnpm db:studio          # Open Drizzle Studio GUI
pnpm db:start           # Start local PostgreSQL & Redis
pnpm db:stop            # Stop local services
```

### Database Schema

The project uses [Drizzle ORM](https://orm.drizzle.team/) for type-safe database operations. Schema files are located in `lib/db/`.

## Architecture

### Technology Stack

- **Frontend**: Next.js 16, React 18, TypeScript
- **Styling**: Tailwind CSS 4, Radix UI
- **Backend**: Next.js API Routes, Server Actions
- **Database**: PostgreSQL 15, Drizzle ORM
- **Caching**: Redis 7
- **Authentication**: NextAuth.js v5
- **Payment**: Pi Network SDK, Stellar SDK
- **Testing**: Playwright
- **Deployment**: Vercel, Docker
- **CI/CD**: GitHub Actions

### Project Structure

```
triumph-synergy/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── (auth)/           # Authentication pages
│   ├── (chat)/           # Chat interface
│   └── ecosystem/        # Ecosystem features
├── components/            # React components
├── lib/                   # Core library code
│   ├── db/               # Database schemas & utilities
│   ├── payments/         # Payment processing
│   ├── security/         # Security utilities
│   └── compliance/       # Compliance frameworks
├── tests/                 # Test suites
│   ├── e2e/              # End-to-end tests
│   └── routes/           # API route tests
├── docs/                  # Documentation
└── .github/              # GitHub workflows & templates
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing.

## Security

Security is a top priority. Please review our [Security Policy](SECURITY_POLICY.md) for:

- Reporting vulnerabilities
- Security best practices
- Secrets management
- Compliance requirements

**Do not** open public issues for security vulnerabilities. Follow the responsible disclosure process outlined in the security policy.

## Documentation

- [Contributing Guide](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Security Policy](SECURITY_POLICY.md)
- [Deployment Guide](DEPLOYMENT_GUIDE.md)
- [Changelog](CHANGELOG.md)
- [API Documentation](docs/)

## Support

- 📖 [Documentation](docs/)
- 🐛 [Report a Bug](.github/ISSUE_TEMPLATE/bug_report.md)
- 💡 [Request a Feature](.github/ISSUE_TEMPLATE/feature_request.md)
- ❓ [Ask a Question](.github/ISSUE_TEMPLATE/question.md)

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

Built with:
- [Next.js](https://nextjs.org/) - React framework
- [Pi Network](https://minepi.com/) - Cryptocurrency payment system
- [Stellar](https://www.stellar.org/) - Blockchain network
- [Vercel](https://vercel.com/) - Deployment platform
- [Drizzle ORM](https://orm.drizzle.team/) - TypeScript ORM

---

**Status**: ✅ Production Ready | **Version**: 1.0.0 | **Last Updated**: January 2026
