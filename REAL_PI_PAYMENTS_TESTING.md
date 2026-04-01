# Real Pi Payments - Testing Checklist

## Pre-Testing Setup

- [ ] Vercel deployment completed (check GitHub Actions)
- [ ] Code is live on all three domains
- [ ] Environment variables set for PI_API_KEY
- [ ] Pi Developer Portal app configured
- [ ] Validation keys stored in environment

## Testnet Testing (1991 domain - Safe)

### Environment Verification
- [ ] Open https://triumphsynergy1991.pinet.com in Pi Browser
- [ ] Check browser console for: `[Real Pi] Authenticating user...`
- [ ] Verify: `✓ Pi SDK available on testnet`
- [ ] Verify: Network detection shows "testnet"

### Payment Button State
- [ ] Payment button is ENABLED (not greyed out)
- [ ] Button text shows "Pay X Pi" (not "Open in Pi Browser")
- [ ] Hover shows correct amount

### Payment Flow
1. [ ] Click payment button
2. [ ] Console shows: `[Payment] Starting real Pi payment: X Pi on testnet`
3. [ ] Pi Browser wallet dialog appears
4. [ ] User can see payment details (amount, memo)
5. [ ] User clicks "Approve" in wallet
6. [ ] Console shows: `[Real Pi] Phase I - Ready for server approval`
7. [ ] Backend receives `/api/pi/approve` call (check backend logs)
8. [ ] Blockchain processes transaction (~5-30 seconds)
9. [ ] Console shows: `[Real Pi] Phase II - Blockchain transaction completed`
10. [ ] Backend receives `/api/pi/complete` call (check backend logs)
11. [ ] Console shows: `✓ Payment completed`
12. [ ] Transaction ID (txid) is logged
13. [ ] User receives confirmation in Pi Browser
14. [ ] App service is activated/extended

### Payment Cancellation
- [ ] Click payment button
- [ ] Pi Browser appears
- [ ] Click "Cancel" in wallet
- [ ] Console shows: `[Real Pi] Payment cancelled`
- [ ] No charge occurs
- [ ] Button returns to normal state

### Error Handling
- [ ] Stop backend API temporarily
- [ ] Click payment button
- [ ] Verify error is caught and logged
- [ ] User sees appropriate error message
- [ ] Button returns to enabled state
- [ ] Restart backend

## Testnet Full Flow Test

```bash
# Terminal 1 - Backend
npm run dev

# Terminal 2 - Check logs
tail -f /var/log/app.log
```

1. [ ] Backend running on localhost:3000
2. [ ] Click payment button in testnet
3. [ ] Verify both `/api/pi/approve` and `/api/pi/complete` are called
4. [ ] Check database shows payment record
5. [ ] Verify blockchain shows transaction
6. [ ] Service is activated for user

## Mainnet Testing (7386 domain - Real Money)

### ⚠️ CAUTION: Real Pi will be transferred!

### Environment Verification
- [ ] Open https://triumphsynergy7386.pinet.com in Pi Browser
- [ ] Check browser console for: `✓ Pi SDK available on mainnet`
- [ ] Verify: Network detection shows "mainnet" (NOT "testnet")

### Payment Button State
- [ ] Payment button is ENABLED
- [ ] Button shows correct Pi amount
- [ ] Title/tooltip mentions "Pay X Pi"

### Single Payment Test
1. [ ] Use small test amount (e.g., 0.01 Pi)
2. [ ] Click payment button
3. [ ] Approve in Pi Browser wallet
4. [ ] Verify payment completes
5. [ ] Check wallet balance decreased
6. [ ] Check app wallet received Pi
7. [ ] Verify database records transaction
8. [ ] Check blockchain for transaction

### Full Mainnet Verification
- [ ] All three domains work (0576, 7386, 1991)
- [ ] Each domain gets correct network config
- [ ] Verification endpoint returns correct keys
- [ ] Payments process with real Pi
- [ ] Service activation works end-to-end
- [ ] Blockchain records all transactions

## Domain Verification

### Check Configuration Per Domain

**Domain 1991 (Testnet)**
```
GET https://triumphsynergy1991.pinet.com/.well-known/pi-app-verification
Expected response:
{
  "network": "testnet",
  "sandbox": true,
  "domain": "triumphsynergy1991.pinet.com",
  "verification": "<testnet-validation-key>"
}
```

**Domain 7386 (Mainnet)**
```
GET https://triumphsynergy7386.pinet.com/.well-known/pi-app-verification
Expected response:
{
  "network": "mainnet",
  "sandbox": false,
  "domain": "triumphsynergy7386.pinet.com",
  "verification": "<mainnet-validation-key>"
}
```

**Domain 0576 (Primary)**
```
GET https://triumphsynergy0576.pinet.com/.well-known/pi-app-verification
Expected response:
{
  "network": "mainnet",
  "sandbox": false,
  "domain": "triumphsynergy0576.pinet.com",
  "verification": "<mainnet-validation-key>"
}
```

- [ ] All three endpoints respond with 200 OK
- [ ] Each returns correct network (testnet/mainnet)
- [ ] Each returns correct sandbox flag
- [ ] Each returns correct validation key

## Console Logging Verification

When payment completes successfully, you should see:

```
[Real Pi] Creating payment: {amount: 10, memo: "...", ...}
[Real Pi] Phase I - Ready for server approval: payment_abc123
[Real Pi] Phase I - Server approval successful
[Real Pi] Phase II - Blockchain transaction completed: 0x123...
[Real Pi] Phase II - Server completion successful
✓ Payment completed: {success: true, paymentId: "...", txid: "..."}
```

- [ ] All Phase I logs appear
- [ ] All Phase II logs appear
- [ ] Transaction ID is recorded
- [ ] Final success message shows

## Backend API Verification

### /api/pi/approve Endpoint
- [ ] Endpoint receives POST request
- [ ] Validates paymentId parameter
- [ ] Calls Pi Network API to verify payment
- [ ] Returns 200 with success status
- [ ] Logs the approval action
- [ ] Records in database

### /api/pi/complete Endpoint
- [ ] Endpoint receives POST request
- [ ] Validates paymentId and txid parameters
- [ ] Calls Pi Network API to verify transaction
- [ ] Marks payment as completed
- [ ] Activates service for user
- [ ] Returns 200 with success status

### Error Cases
- [ ] Invalid paymentId returns 400
- [ ] Missing txid returns 400
- [ ] Expired payment returns error
- [ ] Database errors are caught and logged

## Performance Monitoring

- [ ] Payment approval completes in < 10 seconds
- [ ] Blockchain confirmation within 60 seconds
- [ ] Backend response time < 1 second
- [ ] No console errors or warnings
- [ ] Memory usage is stable (no leaks)

## Final Verification

- [ ] ✅ Testnet payments process correctly
- [ ] ✅ Mainnet payments process with real Pi
- [ ] ✅ All three domains work independently
- [ ] ✅ Service activation/extension works
- [ ] ✅ User receives confirmation
- [ ] ✅ Blockchain shows transactions
- [ ] ✅ Database records all payments

## Sign-Off

- [ ] Testing completed by: _______________
- [ ] Date: _______________
- [ ] All tests passed: YES / NO
- [ ] Ready for production: YES / NO

## Known Issues / Notes

(Record any issues found during testing)

---

See [REAL_PI_PAYMENTS_GUIDE.md](./REAL_PI_PAYMENTS_GUIDE.md) for detailed implementation information.
