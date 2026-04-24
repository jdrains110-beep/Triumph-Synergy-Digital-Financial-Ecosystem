# Getting Started

## Prerequisites

- Node.js 20+ or Bun
- pnpm 9.12.3+
- PostgreSQL database
- Redis server
- Pi Network Developer Account

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/jdrains110-beep/triumph-synergy.git
cd triumph-synergy
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment

Create a `.env.local` file:

```bash
# Pi Network Configuration
PI_API_KEY=your-pi-api-key
PI_INTERNAL_API_KEY=your-internal-api-key

# Database
POSTGRES_URL=postgresql://user:password@localhost:5432/triumph_synergy
REDIS_URL=redis://localhost:6379

# Stellar Configuration
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
STELLAR_PAYMENT_ACCOUNT=your-stellar-account
STELLAR_PAYMENT_SECRET=your-stellar-secret

# Authentication
AUTH_SECRET=generate-a-secure-secret
NEXTAUTH_URL=http://localhost:3000

# Pi Value Settings
INTERNAL_PI_MULTIPLIER=1.5
INTERNAL_PI_MIN_VALUE=10.0
EXTERNAL_PI_MIN_VALUE=1.0
```

### 4. Initialize Database

```bash
# Start local database
pnpm db:start

# Run migrations
pnpm db:migrate
```

### 5. Start Development Server

```bash
pnpm dev
```

The application will be available at `http://localhost:3000`.

## Quick Start with Docker

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

## Pi Network Integration

### 1. Register as Pi Developer

1. Visit the [Pi Developer Portal](https://developers.minepi.com)
2. Create a new app
3. Get your API key and secret

### 2. Configure SDK

The SDK is automatically loaded in the Pi Browser. For testing outside:

```typescript
import { Pi } from '@/sdk/pi-sdk-react';

// Initialize (happens automatically in Pi Browser)
if (window.Pi) {
  window.Pi.init({ version: '2.0', sandbox: true });
}

// Authenticate user
const auth = await Pi.authenticate(['payments']);

// Create payment
const payment = await Pi.createPayment({
  amount: 10,
  memo: 'Test payment',
  metadata: { orderId: '123' }
}, {
  onReadyForServerApproval: async (paymentId) => {
    await fetch('/api/pi/approve', {
      method: 'POST',
      body: JSON.stringify({ paymentId })
    });
  },
  onReadyForServerCompletion: async (paymentId, txid) => {
    await fetch('/api/pi/complete', {
      method: 'POST',
      body: JSON.stringify({ paymentId, txid })
    });
  }
});
```

## Running Tests

```bash
# Unit tests
pnpm test:unit

# E2E tests (requires running server)
pnpm test

# Coverage report
pnpm test:coverage
```

## Building for Production

```bash
# Create optimized build
pnpm build

# Start production server
pnpm start
```

## Deployment Options

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Docker

```bash
# Build image
docker build -t triumph-synergy .

# Run container
docker run -p 3000:3000 triumph-synergy
```

## Next Steps

- [Architecture Overview](./architecture.md)
- [Pi Network Integration](./pi-network.md)
- [API Reference](./api-reference.md)
- [Security Guide](./security.md)
