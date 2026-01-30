# Real Pi Payments Implementation Guide

## Overview

This document explains how REAL Pi Network payments work in the Triumph Synergy app. The implementation uses the official Pi Network SDK to create actual blockchain transactions.

## Payment Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER IN PI BROWSER                          │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │
                    ┌─────────────▼──────────────┐
                    │  User clicks "Pay with Pi" │
                    └─────────────┬──────────────┘
                                  │
                    ┌─────────────▼──────────────────────┐
                    │  App calls realPi.createPayment()  │
                    └─────────────┬──────────────────────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         │                        │                        │
         │   PHASE I: APPROVAL    │    PHASE II: COMPLETE  │
         │                        │                        │
    ┌────▼────────┐          ┌────▼───────┐          ┌────▼─────┐
    │ Pi Browser  │          │ Blockchain │          │ Pi       │
    │ shows       │          │ processes  │          │ Browser  │
    │ wallet UI   │          │ transfer   │          │ confirms │
    │             │          │            │          │ success  │
    │ User        │          │            │          │          │
    │ approves    │          │            │          │ User     │
    │ transaction │          │            │          │ gets Pi  │
    └────┬────────┘          └────┬───────┘          └────┬─────┘
         │                        │                        │
         │ onReadyFor...│          │ onReadyFor...│          │
         │ ServerApproval          │ ServerCompletion       │
         │                        │                        │
    ┌────▼─────────────────┐  ┌────▼─────────────────────┐
    │ BACKEND: /api/pi/    │  │ BACKEND: /api/pi/        │
    │ approve              │  │ complete                 │
    │                      │  │                          │
    │ 1. Verify paymentId  │  │ 1. Verify paymentId      │
    │ 2. Call Pi API       │  │ 2. Verify txid           │
    │ 3. Approve payment   │  │ 3. Record transaction    │
    │ 4. Update database   │  │ 4. Send confirmation     │
    └──────────────────────┘  └────────────────────────────┘
```

## Implementation Details

### 1. Real Pi SDK (`lib/quantum-pi-browser-sdk.ts`)

The `realPi` object provides the main payment interface:

```typescript
const result = await realPi.createPayment({
  amount: 10.5,
  memo: "Extend Premium Subscription",
  metadata: {
    subscription: "monthly",
    userId: "user123",
    invoiceId: "inv-456"
  }
});

if (result.success) {
  console.log("Payment successful:", result.txid);
} else {
  console.error("Payment failed:", result.error);
}
```

### 2. Payment Button Component (`components/PiPaymentButton.tsx`)

Usage in your React components:

```tsx
import { PiPaymentButton } from '@/components/PiPaymentButton';

export function SubscriptionComponent() {
  return (
    <PiPaymentButton
      amount={9.99}
      memo="Monthly Premium Subscription"
      metadata={{ planId: "premium-monthly" }}
      onPaymentSuccess={(paymentId, txid) => {
        console.log("Subscription activated!");
      }}
      onPaymentError={(error) => {
        console.error("Payment failed:", error);
      }}
    >
      Subscribe for 9.99 Pi
    </PiPaymentButton>
  );
}
```

### 3. Backend Approval Endpoint (`app/api/pi/approve/route.ts`)

**What it does:**
- Receives payment approval request from frontend
- Verifies paymentId is valid with Pi Network API
- Signals to Pi Network backend that server approves the payment
- Stores transaction record in database
- Returns 200 OK to proceed to blockchain execution

**When it's called:**
- Automatically by `realPi.createPayment()` after user approves in Pi Browser wallet
- User sees: "Approving payment..." in Pi Browser

**Example request:**
```json
POST /api/pi/approve
{
  "paymentId": "payment_abc123",
  "amount": 10.5,
  "memo": "Extend Premium",
  "metadata": { "planId": "premium" }
}
```

### 4. Backend Completion Endpoint (`app/api/pi/complete/route.ts`)

**What it does:**
- Receives payment completion notification after blockchain transaction
- Verifies paymentId and txid (transaction ID)
- Confirms transaction on Pi Network API
- Updates database with successful payment
- Returns 200 OK to finalize payment

**When it's called:**
- Automatically by `realPi.createPayment()` after blockchain confirms the transfer
- User sees: "Confirming transaction..." in Pi Browser

**Example request:**
```json
POST /api/pi/complete
{
  "paymentId": "payment_abc123",
  "txid": "0x1234567890abcdef...",
  "amount": 10.5,
  "memo": "Extend Premium",
  "metadata": { "planId": "premium" }
}
```

## 2-Phase Payment Protocol

Pi Network requires a 2-phase payment verification for security:

### Phase I: Server Approval
1. **User approves** in Pi Browser wallet → Pi Browser calls `onReadyForServerApproval` callback
2. **Frontend calls** `/api/pi/approve` with paymentId
3. **Backend verifies** paymentId with Pi API
4. **Backend approves** payment state with Pi API
5. **Pi Network** prepares blockchain transaction

### Phase II: Server Completion  
1. **User's Pi transferred** from their wallet to app wallet on blockchain
2. **Pi Network calls** `onReadyForServerCompletion` callback with txid
3. **Frontend calls** `/api/pi/complete` with paymentId and txid
4. **Backend verifies** txid on blockchain
5. **Backend records** payment completion in database
6. **Payment confirmed** - app can activate service

## Domain & Network Detection

The SDK automatically detects which network you're on:

```typescript
// Testnet (1991 domain)
realPi.getNetwork() // returns "testnet"

// Mainnet (7386 or 0576 domains)  
realPi.getNetwork() // returns "mainnet"
```

This is determined by checking `window.location.hostname`:
- If hostname includes "1991" → testnet
- Otherwise → mainnet

## Environment Variables Required

For payment endpoints to work, you need:

```bash
# Pi Network API Key (from https://developers.minepi.com)
PI_API_KEY=your_api_key_here

# App ID (registered in Pi Developer Portal)
PI_APP_ID=triumph-synergy

# Validation Keys (from Pi Developer Portal - per domain)
PI_NETWORK_TESTNET_VALIDATION_KEY=75b333f8...
PI_NETWORK_MAINNET_VALIDATION_KEY=efee2c5a...
```

## Error Handling

The SDK handles common error scenarios:

```typescript
const result = await realPi.createPayment({...});

// Types of errors:
if (result.error === "Pi SDK not available - must open in Pi Browser") {
  // User opened app in regular browser instead of Pi Browser
  // Show: "Please open this app in Pi Browser to enable payments"
}

if (result.error === "User cancelled payment") {
  // User clicked cancel in wallet UI
  // No charge occurred
}

if (result.error?.includes("Server approval failed")) {
  // Backend /api/pi/approve failed
  // Payment did not process
}

if (result.error?.includes("Server completion failed")) {
  // Backend /api/pi/complete failed
  // Payment may have been processed but not recorded
  // Manual review recommended
}
```

## Testing

### Testnet Testing (Safe - No Real Money)
1. Open app in Pi Browser on testnet domain: `https://triumphsynergy1991.pinet.com`
2. Use testnet Pi (development/testing currency)
3. Click payment button
4. Approve in Pi Browser wallet
5. Check logs to verify 2-phase flow

### Mainnet Testing (Real Money)
1. Open app in Pi Browser on mainnet domain: `https://triumphsynergy7386.pinet.com`
2. Use real Pi currency
3. Click payment button
4. Approve in Pi Browser wallet
5. Monitor blockchain for transaction confirmation

## Debugging

Enable detailed logging:

```typescript
// In browser console - search for these logs:
"[Real Pi] Creating payment:"        // Payment started
"[Real Pi] Phase I - Ready..."       // User approved, backend signaling
"[Real Pi] Phase I - Server..."      // Backend approval call
"[Real Pi] Phase II - Blockchain..." // Transaction on blockchain
"[Real Pi] Phase II - Server..."     // Backend completion call
```

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| "Pi SDK not available" | App opened in regular browser | Open in Pi Browser |
| Button shows "Open in Pi Browser" | Pi not initialized | Refresh page in Pi Browser |
| Payment hangs at "Processing..." | Backend endpoint down | Check `/api/pi/approve` status |
| Transaction not confirmed | Blockchain network congestion | Wait and retry, or check block explorer |
| Payment marked complete but no service | Database write failed | Check backend logs and database |

## Real vs. Fake Implementations

### ✅ Real Implementation (Current - quantum-pi-browser-sdk.ts)
- Uses official `window.Pi.createPayment()` API
- Creates actual blockchain transactions
- 2-phase verification protocol
- Backend API calls to approve/complete
- Real Pi transferred from wallet

### ❌ Fake Implementation (Deprecated - piSDK2026.ts)
- Simulated payment flow
- No blockchain involvement
- Mock responses
- NOT FOR PRODUCTION

## References

- [Pi Network Developer Docs](https://developers.minepi.com)
- [Pi Payment API Docs](https://github.com/pi-apps/pi-platform-docs/blob/master/payments.md)
- [Pi SDK Documentation](https://github.com/pi-apps/pi-js-sdk)
- [Triumph Synergy Payment Button](../../components/PiPaymentButton.tsx)
- [Real Pi SDK](../../lib/quantum-pi-browser-sdk.ts)

## Next Steps

1. ✅ Verify Vercel deployment completes (check GitHub Actions)
2. ✅ Hard refresh in Pi Browser (Ctrl+Shift+R / Cmd+Shift+R)
3. ✅ Test on testnet domain (1991) first with small amount
4. ✅ Test payment flow end-to-end (approval → complete)
5. ✅ Check backend logs for approval/complete calls
6. ✅ Verify blockchain transaction on Pi Testnet explorer
7. ✅ Once testnet confirmed, test mainnet (7386/0576) with real Pi
