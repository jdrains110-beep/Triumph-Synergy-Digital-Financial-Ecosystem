# API Reference

## Overview

Triumph-Synergy provides a comprehensive REST API for payment processing, ecosystem management, and integrations.

## Base URL

- **Production**: `https://triumph-synergy.vercel.app/api`
- **Development**: `http://localhost:3000/api`

## Authentication

Most endpoints require authentication via NextAuth session or API key.

```bash
# Session-based (browser)
Cookie: next-auth.session-token=...

# API Key (server-to-server)
Authorization: Bearer <api-key>
```

---

## Pi Payment Endpoints

### POST /api/pi/approve

Approve a Pi payment after user confirmation.

**Request:**
```json
{
  "paymentId": "string (required)"
}
```

**Response:**
```json
{
  "success": true,
  "paymentId": "pi_payment_123",
  "approved": true,
  "approvedAt": "2026-01-13T12:00:00.000Z"
}
```

**Errors:**
- `400`: Missing paymentId
- `404`: Payment not found
- `409`: Payment already approved

---

### POST /api/pi/complete

Complete a Pi payment after Stellar transaction.

**Request:**
```json
{
  "paymentId": "string (required)",
  "txid": "string (required)"
}
```

**Response:**
```json
{
  "success": true,
  "paymentId": "pi_payment_123",
  "txid": "stellar_tx_abc123",
  "completed": true,
  "completedAt": "2026-01-13T12:00:00.000Z"
}
```

---

### GET /api/pi/value

Get current Pi value and multipliers.

**Response:**
```json
{
  "basePiValue": 10.0,
  "internalMultiplier": 1.5,
  "externalMultiplier": 1.0,
  "effectiveValue": {
    "internal": 15.0,
    "external": 10.0
  },
  "lastUpdated": "2026-01-13T12:00:00.000Z"
}
```

---

## Ecosystem Endpoints

### GET /api/ecosystem/applications

List registered ecosystem applications.

**Response:**
```json
{
  "applications": [
    {
      "id": "app-123",
      "name": "ecommerce-app",
      "status": "active",
      "registeredAt": "2026-01-01T00:00:00.000Z"
    }
  ],
  "totalActive": 3
}
```

---

### POST /api/ecosystem/payments

Process an ecosystem payment.

**Request:**
```json
{
  "applicationId": "string",
  "amount": 100,
  "currency": "PI",
  "source": "internal",
  "memo": "string",
  "metadata": {}
}
```

**Response:**
```json
{
  "success": true,
  "transactionId": "txn_123",
  "amount": 100,
  "effectiveValue": 150.0,
  "status": "completed"
}
```

---

## Biometric Authentication

### POST /api/biometric/register/initiate

Start biometric credential registration.

**Request:**
```json
{
  "userId": "string",
  "userName": "string"
}
```

**Response:**
```json
{
  "success": true,
  "challenge": "base64-encoded-challenge",
  "rpId": "triumph-synergy.com",
  "userId": "user-123",
  "pubKeyCredParams": [...]
}
```

---

### POST /api/biometric/register/verify

Verify biometric registration.

**Request:**
```json
{
  "credential": {
    "id": "string",
    "rawId": "string",
    "response": {
      "clientDataJSON": "string",
      "attestationObject": "string"
    }
  }
}
```

---

### POST /api/biometric/authenticate/verify

Verify biometric authentication.

**Request:**
```json
{
  "credential": {
    "id": "string",
    "response": {
      "clientDataJSON": "string",
      "authenticatorData": "string",
      "signature": "string"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "verified": true,
  "userId": "user-123",
  "sessionToken": "..."
}
```

---

## Smart Contracts

### POST /api/contracts

Create a new smart contract.

**Request:**
```json
{
  "type": "service_agreement",
  "parties": ["party-a", "party-b"],
  "terms": {
    "duration": "12 months",
    "value": 10000
  }
}
```

**Response:**
```json
{
  "success": true,
  "contractId": "contract-123",
  "status": "pending_signatures"
}
```

---

### GET /api/contracts/:id

Get contract details.

**Response:**
```json
{
  "id": "contract-123",
  "type": "service_agreement",
  "parties": [...],
  "status": "active",
  "signatures": [...],
  "createdAt": "2026-01-13T00:00:00.000Z"
}
```

---

## Credit Bureau Integration

### POST /api/credit

Submit credit report data.

**Request:**
```json
{
  "action": "report",
  "data": {
    "accountNumber": "ACC-123",
    "consumerSSN": "123456789",
    "paymentStatus": "current",
    "balance": 5000
  }
}
```

---

### GET /api/credit/score/:userId

Get user's credit score.

**Response:**
```json
{
  "userId": "user-123",
  "scores": [
    {
      "bureau": "equifax",
      "score": 750,
      "date": "2026-01-13"
    }
  ]
}
```

---

## Streaming

### POST /api/streaming/sessions/init

Initialize a streaming session.

**Request:**
```json
{
  "userId": "string",
  "contentId": "string",
  "quality": "auto"
}
```

**Response:**
```json
{
  "sessionId": "session-123",
  "streamUrl": "https://...",
  "token": "..."
}
```

---

## Health & Status

### GET /api/health

System health check.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-13T12:00:00.000Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "stellar": "connected",
    "pi_network": "connected"
  }
}
```

---

### GET /api/system/status

Detailed system status.

**Response:**
```json
{
  "version": "1.0.0",
  "environment": "production",
  "uptime": 86400,
  "metrics": {
    "requestsPerMinute": 100,
    "activeConnections": 50
  }
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {}
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate Limiting

- **Default**: 100 requests per minute
- **Authenticated**: 500 requests per minute
- **Payment endpoints**: 10 requests per minute

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704110400
```
