# API Documentation

This document provides an overview of the Triumph Synergy API endpoints.

## Base URL

- **Development**: `http://localhost:3000`
- **Production**: `https://your-domain.vercel.app`

## Authentication

Most API endpoints require authentication via NextAuth.js session. Authentication is handled through:

- Session-based authentication (HTTP-only cookies)
- JWT tokens for stateless authentication
- API keys for external integrations

### Authentication Headers

```
Cookie: next-auth.session-token=<session-token>
```

## API Endpoints

### Health & Status

#### `GET /api/health`

Check API health status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-12T00:00:00.000Z"
}
```

### Authentication

#### `POST /api/auth/signin`

Sign in a user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "User Name"
  },
  "token": "session-token"
}
```

#### `POST /api/auth/signout`

Sign out the current user.

**Response:**
```json
{
  "message": "Signed out successfully"
}
```

### Transactions

#### `GET /api/transactions`

Get transaction history for the authenticated user.

**Query Parameters:**
- `limit` (optional): Number of transactions to return (default: 20)
- `offset` (optional): Pagination offset (default: 0)
- `status` (optional): Filter by status (pending, completed, failed)

**Response:**
```json
{
  "transactions": [
    {
      "id": "tx-id",
      "amount": 100.00,
      "currency": "PI",
      "status": "completed",
      "createdAt": "2026-01-12T00:00:00.000Z"
    }
  ],
  "total": 50,
  "limit": 20,
  "offset": 0
}
```

#### `POST /api/transactions`

Create a new transaction.

**Request Body:**
```json
{
  "amount": 100.00,
  "currency": "PI",
  "recipient": "recipient-id",
  "description": "Payment for services"
}
```

**Response:**
```json
{
  "transaction": {
    "id": "tx-id",
    "amount": 100.00,
    "currency": "PI",
    "status": "pending",
    "createdAt": "2026-01-12T00:00:00.000Z"
  }
}
```

#### `GET /api/transactions/:id`

Get details of a specific transaction.

**Response:**
```json
{
  "transaction": {
    "id": "tx-id",
    "amount": 100.00,
    "currency": "PI",
    "status": "completed",
    "sender": "sender-id",
    "recipient": "recipient-id",
    "createdAt": "2026-01-12T00:00:00.000Z",
    "completedAt": "2026-01-12T00:01:00.000Z"
  }
}
```

### Payments (Pi Network)

#### `POST /api/payments/pi/initiate`

Initiate a Pi Network payment.

**Request Body:**
```json
{
  "amount": 10.5,
  "memo": "Payment for service"
}
```

**Response:**
```json
{
  "paymentId": "payment-id",
  "paymentUrl": "https://pi.network/approve/payment-id",
  "status": "initiated"
}
```

#### `GET /api/payments/pi/:paymentId`

Get Pi Network payment status.

**Response:**
```json
{
  "paymentId": "payment-id",
  "amount": 10.5,
  "status": "completed",
  "txid": "stellar-transaction-id",
  "createdAt": "2026-01-12T00:00:00.000Z"
}
```

### User Profile

#### `GET /api/user/profile`

Get current user profile.

**Response:**
```json
{
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "User Name",
    "balance": {
      "PI": 100.50
    },
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

#### `PATCH /api/user/profile`

Update user profile.

**Request Body:**
```json
{
  "name": "New Name",
  "preferences": {
    "notifications": true
  }
}
```

**Response:**
```json
{
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "New Name",
    "preferences": {
      "notifications": true
    }
  }
}
```

### Compliance

#### `POST /api/compliance/kyc`

Submit KYC (Know Your Customer) information.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1990-01-01",
  "country": "US",
  "documentType": "passport",
  "documentNumber": "ABC123456"
}
```

**Response:**
```json
{
  "kycId": "kyc-id",
  "status": "pending",
  "submittedAt": "2026-01-12T00:00:00.000Z"
}
```

#### `GET /api/compliance/kyc/status`

Check KYC verification status.

**Response:**
```json
{
  "status": "verified",
  "verifiedAt": "2026-01-12T00:00:00.000Z",
  "level": "tier2"
}
```

## Error Responses

All endpoints return standard error responses:

### 400 Bad Request
```json
{
  "error": "Bad Request",
  "message": "Invalid request parameters",
  "details": {
    "field": "amount",
    "issue": "must be a positive number"
  }
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "error": "Not Found",
  "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
```

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **Authenticated users**: 100 requests per minute
- **Guest users**: 10 requests per minute
- **Payment endpoints**: 10 requests per minute

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642032000
```

## Webhooks

The API supports webhooks for real-time event notifications.

### Webhook Events

- `transaction.created`
- `transaction.completed`
- `transaction.failed`
- `payment.initiated`
- `payment.completed`
- `kyc.verified`
- `kyc.rejected`

### Webhook Payload Format

```json
{
  "event": "transaction.completed",
  "timestamp": "2026-01-12T00:00:00.000Z",
  "data": {
    "transactionId": "tx-id",
    "amount": 100.00,
    "status": "completed"
  }
}
```

### Webhook Signature Verification

Webhooks include a signature header for verification:
```
X-Webhook-Signature: sha256=<signature>
```

## SDKs & Client Libraries

Official SDKs are available for:

- JavaScript/TypeScript (included in this repository)
- Python (coming soon)
- Go (coming soon)

## Support

For API support:
- Review this documentation
- Check [GitHub Issues](https://github.com/jdrains110-beep/triumph-synergy/issues)
- Submit a [question](../../issues/new?template=question.md)

## Changelog

See [CHANGELOG.md](../CHANGELOG.md) for API version history and breaking changes.
