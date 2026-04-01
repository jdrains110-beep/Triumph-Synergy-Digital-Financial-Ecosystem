# Pi Network SDK 2026 Official Requirements Checklist

**Source:** Official Pi Network documentation from minepi.com and github.com/pi-apps/pi-platform-docs
**Date:** January 26, 2026
**Status:** Complete technical specifications for Pi Browser and Pi SDK 2026 integration

---

## 1. PI SDK INITIALIZATION REQUIREMENTS

### Script Loading (REQUIRED)
```html
<!-- Add to your HTML <head> or before closing </body> -->
<script src="https://sdk.minepi.com/pi-sdk.js"></script>
<script>
  Pi.init({ 
    version: "2.0",
    sandbox: false  // Set to true for development/testing
  })
</script>
```

**Official Specification:**
- ✅ **Script URL:** Exactly `https://sdk.minepi.com/pi-sdk.js`
- ✅ **Init Version:** Must be `"2.0"` (current standard)
- ✅ **Sandbox Flag:** 
  - `sandbox: true` for development environments
  - `sandbox: false` for production
  - Can be dynamically set based on `process.env.NODE_ENV`
- ✅ **Global Object:** Creates `window.Pi` global object
- ✅ **Not for Server-Side:** This SDK is **ONLY** for frontend/client-side code
  - Do NOT use in Node.js server environments
  - Use backend SDK equivalents (pi-nodejs, pi-ruby, etc.) for server operations

---

## 2. DEVELOPER PORTAL REQUIREMENTS

### App Registration (MANDATORY)
**Access Point:** `pi://develop.pi` in Pi Browser
**Status:** App must be registered and configured

#### Required Setup Steps (In Order):
1. ✅ **Register New App**
   - Click "New App" button in Developer Portal
   - Fill in required fields (app name, description)

2. ✅ **Select Network** (CANNOT BE CHANGED AFTER)
   - Choose `Mainnet` OR `Testnet`
   - **Recommendation:** Create TWO separate apps
     - One for Mainnet (production)
     - One for Testnet (development/testing)

3. ✅ **Configure Hosting Option**
   - First step in App Checklist
   - Specify how/where your app is hosted
   - This determines available options in next steps

4. ✅ **Connect App Wallet**
   - Second step in App Checklist
   - Create and connect wallet to the app
   - Required for payment processing

5. ✅ **Domain Verification**
   - Verify URL ownership for your app
   - Required for Pi Browser to recognize your domain
   - See **Section 5** for implementation

6. ✅ **Configure Payment Endpoints** (if using payments)
   - Approve endpoint: `/api/pi/approve`
   - Complete endpoint: `/api/pi/complete`
   - Cancel endpoint: `/api/pi/cancel` (optional)

### Testnet Indicator
- Apps registered on Testnet show black and yellow stripe at top of Pi Browser
- This is automatic and confirms Testnet connection

---

## 3. AUTHENTICATION REQUIREMENTS

### Pi.authenticate() Method
```javascript
// Required scopes for payments
const scopes = ['payments'];

// Callback for incomplete payments
function onIncompletePaymentFound(payment) {
  // Handle incomplete payment from previous session
  // Send to server for server-side completion
}

// Authenticate user
Pi.authenticate(scopes, onIncompletePaymentFound)
  .then(function(auth) {
    console.log(`Hi there! You're ready to make payments!`);
    // auth.accessToken - use for /me endpoint verification
    // auth.user.uid - app-specific user identifier
    // auth.user.username - user's Pi username (if 'username' scope)
  })
  .catch(function(error) {
    console.error(error);
  });
```

### Available Scopes
| Scope | Purpose | Returns |
|-------|---------|---------|
| `'payments'` | Request payment capability | Required for all payments |
| `'username'` | Access user's Pi username | `auth.user.username` |
| `'wallet_address'` | Access user's wallet address | For A2U payments |
| (none) | Basic app-local ID only | `auth.user.uid` always available |

### Authentication Rules
- ✅ **First Time:** User sees consent dialog to share data with app
- ✅ **Subsequent Times:** Returns cached authentication
- ✅ **onIncompletePaymentFound:** Called if user has incomplete payment from previous session
- ✅ **Incomplete Payment Definition:** Payment submitted to blockchain but NOT server-completed (developer_completed: false)
- ✅ **Frontend Only:** User info from SDK is for presentation logic only
- ✅ **Backend Verification:** Always verify with `/me` endpoint on your server using access token

### Backend User Verification
```
GET /me
Authorization: Bearer <user access token>

Response: UserDTO {
  uid: string,
  credentials: {
    scopes: Array<Scope>,
    valid_until: { timestamp, iso8601 }
  },
  username?: string,
  wallet_address?: string
}
```

---

## 4. PAYMENT FLOW REQUIREMENTS

### Payment Flow Overview
All payments go through **3 mandatory phases:**

#### Phase I: Payment Creation & Server-Side Approval
1. Frontend calls `Pi.createPayment()`
2. SDK obtains PaymentID from Pi Servers
3. Callback `onReadyForServerApproval(paymentId)` fires
4. **Your responsibility:** Send PaymentID to your server
5. Your server calls `/payments/{payment_id}/approve` endpoint
6. User can now submit blockchain transaction

#### Phase II: User Interaction & Blockchain Transaction
- User confirms transaction in Pi Wallet modal
- User signs and submits to blockchain
- **No developer action needed** - automatic
- Payment dialog remains open (does NOT close)

#### Phase III: Server-Side Completion
1. Callback `onReadyForServerCompletion(paymentId, txid)` fires
2. **Your responsibility:** Send paymentId and txid to your server
3. Your server calls `/payments/{payment_id}/complete` endpoint
4. Pi Servers verify blockchain transaction
5. Payment flow closes automatically
6. Your app is visible again to user

### Payment Creation Method
```javascript
Pi.createPayment({
  // Required: amount in Pi currency
  amount: 3.14,
  
  // Required: explanation shown to user
  memo: "Digital kitten #1234",
  
  // Optional: metadata for your use
  metadata: { 
    orderId: 1234, 
    itemIds: [11, 42, 314] 
  }
}, {
  // Phase I Callback
  onReadyForServerApproval: function(paymentId) {
    // MUST send paymentId to your backend
    // Backend MUST call /payments/{paymentId}/approve
  },
  
  // Phase III Callback
  onReadyForServerCompletion: function(paymentId, txid) {
    // MUST send paymentId + txid to your backend
    // Backend MUST call /payments/{paymentId}/complete
  },
  
  // User cancelled payment
  onCancel: function(paymentId) {
    // Handle user cancellation
  },
  
  // Error occurred
  onError: function(error, payment) {
    // Handle errors
    // 'payment' only present if payment was created
  }
});
```

### Platform API Endpoints (Backend)

#### Approve Payment
```
POST /payments/{payment_id}/approve
Authorization: Key <Server API Key>
Response: PaymentDTO

Purpose: Allow user to submit blockchain transaction
Required: Must be called in Phase I callback response
```

#### Complete Payment
```
POST /payments/{payment_id}/complete
Authorization: Key <Server API Key>
Content-Type: application/json

Body: {
  "txid": "7a7ed20d3d72c365b9019baf8dc4c4e3cce4c08114d866e47ae157e3a796e9e7"
}

Response: PaymentDTO

Purpose: Acknowledge receipt of blockchain transaction
Required: Must be called in Phase III callback response
```

#### Get Payment Status
```
GET /payments/{payment_id}
Authorization: Key <Server API Key>
Response: PaymentDTO
```

#### Cancel Payment
```
POST /payments/{payment_id}/cancel
Authorization: Key <Server API Key>
Response: PaymentDTO
```

### Payment Status Flags (PaymentDTO)
```typescript
status: {
  developer_approved: boolean,      // Phase I complete
  transaction_verified: boolean,    // Blockchain verified
  developer_completed: boolean,     // Phase III complete
  cancelled: boolean,               // Dev or Pi cancelled
  user_cancelled: boolean           // User cancelled
}
```

### Critical Security Rule
⚠️ **User Might Be Lying!**
- Users could run hacked SDK versions claiming payment success
- If `/complete` API returns non-200 error: **DO NOT** mark payment complete
- **DO NOT** deliver goods/services until confirmed by `/complete` endpoint
- Always verify server-side

### API Base URL
- **Latest Version:** `https://api.minepi.com/v2`
- **Current Version:** v2
- Breaking changes only in new major versions

---

## 5. DOMAIN VERIFICATION REQUIREMENTS

### Purpose
- Prove ownership of your domain to Pi Network
- Required for Pi Browser to recognize and serve your app
- Part of app "App Checklist" in Developer Portal

### Verification Process

#### Step 1: Generate Validation Keys
In Developer Portal (develop.pi):
- Navigate to your app settings
- Find "Domain Verification" section
- System generates unique validation keys

#### Step 2: Create Validation Endpoints
Your app must expose validation endpoints:

```
GET /.well-known/pi-validation/{validation_key}
```

**Response Requirements:**
- HTTP Status: `200 OK`
- Content-Type: `application/json`
- Body: 
```json
{
  "key": "{validation_key}",
  "verified": true
}
```

#### Step 3: Endpoint Implementation
- Create endpoint that responds to Pi Network validation requests
- Endpoint must be publicly accessible
- Must return correct validation key in response
- Can implement multiple validation keys (one per domain if needed)

#### Step 4: Verify in Developer Portal
- Click "Verify Domain" in Developer Portal
- Pi Network calls your validation endpoint
- On success: Domain is verified and app is accessible in Pi Browser

### Well-Known Directory
```
/.well-known/pi-validation/
```
- This is a standard directory for web app metadata
- Similar to `/.well-known/apple-app-site-association`, etc.
- Should be publicly accessible (may need to whitelist if behind auth)

---

## 6. SECURITY HEADERS FOR PI BROWSER

### Required Headers

#### X-Frame-Options
```
X-Frame-Options: SAMEORIGIN
```
- ✅ Allows framing within Pi Browser (same-origin)
- ❌ DO NOT use `DENY` (blocks Pi Browser)
- ✅ SAMEORIGIN works with Pi Browser frame integration

#### CORS Headers
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
```
- ✅ Must allow Pi SDK script to make requests
- ✅ May need to relax for Pi Browser environment

#### Content-Security-Policy
```
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' https://sdk.minepi.com https://api.minepi.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://api.minepi.com https://sdk.minepi.com;
```
- ✅ **MUST allow:** `https://sdk.minepi.com` for Pi SDK script
- ✅ **MUST allow:** `https://api.minepi.com` for API calls
- ✅ Consider `'unsafe-inline'` for styles if needed in Pi Browser

### Middleware/Server Configuration

#### Next.js Example (next.config.ts)
```typescript
const nextConfig = {
  headers: async () => {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization'
          }
        ],
      }
    ]
  }
}
```

---

## 7. APP MANIFEST AND CONFIGURATION

### pi-app-manifest.json

#### Location
```
/public/pi-app-manifest.json
```
or
```
/pi-app-manifest.json
```

#### Required Fields
```json
{
  "name": "Triumph-Synergy",
  "short_name": "Triumph",
  "description": "Your app description",
  "version": "1.0.0",
  "pi_sdk_version": "2.0",
  
  "developer": {
    "name": "Developer Name",
    "organization": "Organization",
    "email": "email@example.com",
    "website": "https://yoursite.com"
  },
  
  "app": {
    "id": "unique-app-id",
    "category": "finance|games|utilities|social|etc",
    "rating": "E|T|M|A",
    "languages": ["en", "es", "fr"],
    "countries": "all|list-of-countries"
  },
  
  "platform": {
    "pi_network": {
      "enabled": true,
      "mainnet": true,
      "testnet": true
    },
    "web": {
      "enabled": true,
      "pwa": true
    },
    "mobile": {
      "enabled": true,
      "pi_browser": true
    }
  },
  
  "permissions": [
    "payments",
    "username",
    "wallet_address",
    "user_info"
  ],
  
  "payment_config": {
    "enabled": true,
    "endpoints": {
      "approve": "/api/pi/approve",
      "complete": "/api/pi/complete",
      "cancel": "/api/pi/cancel"
    }
  }
}
```

### .well-known Directory Files

#### .well-known/pi-validation/{key}
- **Purpose:** Domain ownership verification
- **Response:** Validation key confirmation
- **See Section 5** for details

---

## 8. FILE AND ENDPOINT STRUCTURE

### Required Directory Structure
```
your-app/
├── public/
│   ├── .well-known/
│   │   └── pi-validation/
│   │       └── {validation-key}  [endpoint, not static file]
│   └── pi-app-manifest.json
├── pages/ (or app/)
│   ├── index.html / route
│   └── api/
│       ├── pi/
│       │   ├── approve.ts        [POST endpoint]
│       │   ├── complete.ts       [POST endpoint]
│       │   ├── cancel.ts         [POST endpoint, optional]
│       │   └── status.ts         [GET endpoint, optional]
│       └── auth/
│           ├── pi/
│           │   └── callback.ts   [OAuth callback]
│           └── verify.ts         [Verify with /me endpoint]
└── middleware.ts                 [Set security headers]
```

### Minimum Required Endpoints

#### 1. Pi Validation Endpoint
```
GET /.well-known/pi-validation/{validation_key}
Response: { "key": "{key}", "verified": true }
```

#### 2. Approve Endpoint
```
POST /api/pi/approve
Content: { paymentId: string }
Action: Call Pi Platform API /payments/{id}/approve
```

#### 3. Complete Endpoint
```
POST /api/pi/complete
Content: { paymentId: string, txid: string }
Action: Call Pi Platform API /payments/{id}/complete
```

#### 4. User Verification Endpoint
```
GET /api/auth/verify
Headers: Authorization: Bearer {accessToken}
Action: Call Pi Platform API /me to verify user
```

---

## 9. ENVIRONMENT VARIABLES REQUIRED

```env
# Pi Platform
PI_SDK_VERSION=2.0
PI_NETWORK=mainnet              # or 'testnet'

# Server API Key (backend only)
PI_SERVER_API_KEY=your_key_here # Keep on server ONLY

# Domain Configuration
PI_DOMAIN=https://yourdomain.com

# API Configuration
PI_API_BASE=https://api.minepi.com/v2
PI_SDK_URL=https://sdk.minepi.com/pi-sdk.js

# Validation Keys
PI_VALIDATION_KEY_1=key_from_developer_portal
PI_VALIDATION_KEY_2=key_from_developer_portal

# Development
SANDBOX_MODE=false              # Set to true in development
NODE_ENV=production             # or 'development'
```

---

## 10. COMPLETE CHECKLIST FOR FULL INTEGRATION

### Frontend Requirements
- [ ] Pi SDK script loaded: `<script src="https://sdk.minepi.com/pi-sdk.js"></script>`
- [ ] Pi.init() called with version "2.0"
- [ ] Pi.authenticate() implemented with 'payments' scope
- [ ] onIncompletePaymentFound callback implemented
- [ ] Pi.createPayment() implemented with all callbacks
- [ ] onReadyForServerApproval callback implemented
- [ ] onReadyForServerCompletion callback implemented
- [ ] onCancel callback implemented
- [ ] onError callback implemented
- [ ] User data displayed only for presentation (not sent to untrusted sources)

### Backend Requirements
- [ ] Server API Key stored securely (environment variables)
- [ ] /api/pi/approve endpoint created
- [ ] /api/pi/approve calls Pi Platform API /payments/{id}/approve
- [ ] /api/pi/complete endpoint created
- [ ] /api/pi/complete calls Pi Platform API /payments/{id}/complete
- [ ] Access token verification via /me endpoint implemented
- [ ] PaymentDTO stored in database for tracking
- [ ] Transaction verification before marking complete
- [ ] Error handling for 401 responses from /complete
- [ ] Database schema for payments table

### Domain & Verification
- [ ] Domain registered in Pi Developer Portal
- [ ] Validation key obtained from Developer Portal
- [ ] /.well-known/pi-validation/{key} endpoint created
- [ ] Endpoint returns `{"key": "{key}", "verified": true}`
- [ ] Domain verified in Developer Portal
- [ ] HTTPS enabled on domain
- [ ] DNS pointing to correct server

### Security Headers
- [ ] X-Frame-Options: SAMEORIGIN set
- [ ] Access-Control-Allow-Origin headers configured
- [ ] Content-Security-Policy includes sdk.minepi.com and api.minepi.com
- [ ] CORS preflight OPTIONS responses configured
- [ ] Middleware applies headers to all responses
- [ ] Server API Key never exposed to frontend code
- [ ] No hardcoded secrets in frontend code

### Configuration Files
- [ ] pi-app-manifest.json created with all required fields
- [ ] pi-app-manifest.json includes "pi_sdk_version": "2.0"
- [ ] pi-app-manifest.json accessible via /pi-app-manifest.json
- [ ] payment_config.endpoints configured
- [ ] permissions array includes "payments"
- [ ] platform.pi_browser.enabled = true
- [ ] platform.pi_network settings correct for mainnet/testnet

### Developer Portal
- [ ] App registered in Pi Developer Portal
- [ ] Network selected (Mainnet or Testnet)
- [ ] Hosting option configured
- [ ] App wallet created and connected
- [ ] Payment endpoints specified
- [ ] Domain verified
- [ ] App checklist completed
- [ ] Testnet indicator appears (if testnet)

### Testing
- [ ] Test authentication flow
- [ ] Test incomplete payment recovery
- [ ] Test User-to-App payment flow (all 3 phases)
- [ ] Test server approval failure handling
- [ ] Test server completion failure handling
- [ ] Test error callbacks
- [ ] Test cancellation flow
- [ ] Test with multiple users
- [ ] Test on testnet before mainnet
- [ ] Verify all payment data logged correctly

### Production Deployment
- [ ] SSL/TLS certificate valid and current
- [ ] HTTPS enforced
- [ ] Server API Key in production environment only
- [ ] Monitoring and alerting configured
- [ ] Payment tracking dashboard implemented
- [ ] User support process ready
- [ ] Rollback plan documented
- [ ] Database backups configured

---

## 11. COMMON IMPLEMENTATION PATTERNS

### Frontend Payment Flow Pattern
```javascript
// 1. On page load
Pi.init({ version: "2.0" });

// 2. On authentication
Pi.authenticate(['payments'], handleIncompletePayments)
  .then(auth => {
    window.accessToken = auth.accessToken;
    window.userId = auth.user.uid;
  });

// 3. On user payment request
Pi.createPayment({
  amount: 10,
  memo: "Purchase item",
  metadata: { itemId: 123 }
}, {
  onReadyForServerApproval: async (paymentId) => {
    // Send to server
    const response = await fetch('/api/pi/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentId, userId: window.userId })
    });
    // Server must call /payments/{paymentId}/approve
  },
  
  onReadyForServerCompletion: async (paymentId, txid) => {
    // Send to server
    const response = await fetch('/api/pi/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentId, txid, userId: window.userId })
    });
    // Server must call /payments/{paymentId}/complete
  },
  
  onCancel: (paymentId) => {
    console.log('Payment cancelled:', paymentId);
  },
  
  onError: (error, payment) => {
    console.error('Payment error:', error, payment);
  }
});
```

### Backend Approval Pattern
```javascript
// POST /api/pi/approve
const piServerKey = process.env.PI_SERVER_API_KEY;

const response = await fetch('https://api.minepi.com/v2/payments/{paymentId}/approve', {
  method: 'POST',
  headers: {
    'Authorization': `Key ${piServerKey}`,
    'Content-Type': 'application/json'
  }
});

const payment = await response.json();
// payment.status.developer_approved will be true
```

### Backend Completion Pattern
```javascript
// POST /api/pi/complete
const piServerKey = process.env.PI_SERVER_API_KEY;

const response = await fetch('https://api.minepi.com/v2/payments/{paymentId}/complete', {
  method: 'POST',
  headers: {
    'Authorization': `Key ${piServerKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    txid: "7a7ed20d3d72c365b9019baf8dc4c4e3cce4c08114d866e47ae157e3a796e9e7"
  })
});

const payment = await response.json();
// Check response.status.developer_completed
// If not 200 status: DO NOT mark payment complete in your system
```

---

## 12. CRITICAL SECURITY CONSIDERATIONS

### Server API Key
- ✅ Store only in environment variables
- ✅ Never commit to git or expose in frontend
- ✅ Different keys for testnet and mainnet
- ✅ Rotate regularly
- ❌ Never log or debug in client code

### Access Token Verification
- ✅ Always verify with `/me` endpoint on backend
- ✅ Check `valid_until` timestamp
- ✅ Verify scopes match your requirements
- ✅ Use as source of truth for user identity
- ❌ Don't trust user identity from frontend SDK alone

### Payment Verification
- ✅ Always verify payments server-side
- ✅ Check blockchain transaction status
- ✅ Only deliver goods after `/complete` succeeds
- ✅ Log all payment attempts
- ✅ Monitor for fraud patterns
- ❌ Don't trust frontend callbacks for sensitive operations

### Domain Validation
- ✅ HTTPS required
- ✅ Valid SSL certificate
- ✅ Validation endpoint accessible publicly
- ✅ Return correct validation key
- ❌ Don't hardcode validation keys in frontend

---

## 13. OFFICIAL REFERENCES

**Documentation Sources:**
1. Pi Platform Docs: https://github.com/pi-apps/pi-platform-docs
2. Demo App Reference: https://github.com/pi-apps/demo
3. Developer Portal: pi://develop.pi (access via Pi Browser)
4. Platform API: https://api.minepi.com/v2

**Key Documentation Files:**
- README.md - SDK overview and quick start
- SDK_reference.md - Complete SDK method documentation
- payments.md - Payment flow detailed specification
- payments_advanced.md - App-to-User payment advanced flows
- platform_API.md - Backend API endpoints
- developer_portal.md - App registration and configuration
- authentication.md - Authentication details

---

## 14. VALIDATION CHECKLIST SUMMARY

**Must Haves (All Required):**
- Pi SDK 2.0 loaded from official URL
- Pi.authenticate() with 'payments' scope
- All 3 payment phases implemented
- Server-side API key authorization
- /payments/{id}/approve endpoint called
- /payments/{id}/complete endpoint called
- Domain verification working
- Security headers configured
- pi-app-manifest.json with pi_sdk_version: "2.0"
- App registered in Developer Portal

**Should Haves (Strongly Recommended):**
- Error handling for all payment states
- Incomplete payment recovery
- Transaction logging
- User support documentation
- Testnet testing before mainnet
- Database backup strategy
- Monitoring and alerting

**Nice to Haves (Optional but Beneficial):**
- App-to-User payments
- Custom payment analytics dashboard
- Webhook support
- Rate limiting
- Multi-currency support
- Biometric authentication

---

## 15. DEPLOYMENT STATUS FOR TRIUMPH SYNERGY

### Current Implementation Status
Based on your `pi-app-manifest.json`:

✅ **Correctly Configured:**
- Pi SDK version 2.0 specified
- All required permissions declared
- Endpoints defined correctly
- Network configuration present
- Payment config comprehensive

⚠️ **Items to Verify:**
1. Validation endpoint (/.well-known/pi-validation/) - Must return validation keys
2. X-Frame-Options header - Must be SAMEORIGIN
3. CSP headers - Must include sdk.minepi.com
4. Domain verification - Complete in Developer Portal
5. Backend endpoints - Must call Platform API
6. Server API Key - Must be secured in environment

### Next Steps for Full Production Ready
1. Verify all endpoints respond correctly
2. Test complete payment flow end-to-end
3. Deploy to testnet first
4. Get domain verified in Developer Portal
5. Move to mainnet after testnet validation
6. Monitor payment transactions
7. Set up user support

---

**Document Version:** 1.0
**Last Updated:** January 26, 2026
**Compliance Level:** Official Pi Network Specifications (2026)
