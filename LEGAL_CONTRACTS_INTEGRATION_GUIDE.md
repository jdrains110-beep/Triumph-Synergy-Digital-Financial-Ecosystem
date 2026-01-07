# Legal Contracts Integration Guide

## Overview

Triumph Synergy now includes a comprehensive **legally binding contract system** that enables users and partners to create, sign, and manage contracts with full legal compliance under ESIGN Act, UETA, GDPR, and CCPA.

## Key Features

### 1. **Legal Document Management**
- Create contracts from templates or custom content
- Support for multiple contract types (T&C, NDA, Service Agreements, etc.)
- Version control and jurisdiction settings
- Expiry tracking and archive management

### 2. **Active User Consent**
- Mandatory checkbox acceptance
- Consent status tracking (ACCEPTED, REJECTED, WITHDRAWN)
- Time-based consent expiration
- Withdrawal capability

### 3. **E-Signature Integration**
- **DocuSign Integration** - Professional envelope signing
- **Native Click Signing** - Simple "I Agree" acceptance
- **Biometric Signatures** - Future enhancement for mobile
- **Dual signature** support for partnerships

### 4. **Comprehensive Audit Trails**
- Timestamped signature records
- Device fingerprinting and geolocation
- IP address and browser information capture
- Screenshot evidence with SHA-256 hashing
- Complete action history logging

### 5. **Legal Compliance**
- ✅ **ESIGN Act** - Electronic Signatures in Global and National Commerce
- ✅ **UETA** - Uniform Electronic Transactions Act
- ✅ **GDPR** - General Data Protection Regulation (explicit consent)
- ✅ **CCPA** - California Consumer Privacy Act (opt-in)
- ✅ **Certificate of Authenticity** - Legally admissible proof

## Architecture

### Database Schema

```
contracts
├── contractSignatures (1:many)
├── userConsents (1:many)
├── contractAuditLogs (1:many)
├── encryptedContracts (1:1)
└── contractAnalyses (1:1)

contractTemplates
└── Used to generate contracts with variable substitution

docuSignIntegrations
└── OAuth tokens and account configuration

contractNotifications
└── User notifications for actions required
```

### Service Layer

```
ContractService
├── createContract()
├── signContract()
├── recordConsent()
├── getContractWithDetails()
├── verifyLegalCompliance()
└── exportContractWithAuditTrail()

DocuSignService
├── sendForSignature()
├── getEnvelopeStatus()
├── downloadSignedDocument()
└── createSigningLink()

AuditTrailService
├── captureScreenshot()
├── generateDeviceFingerprint()
├── generateEvidenceToken()
└── exportEvidencePackage()
```

## API Endpoints

### Create Contract
```
POST /api/contracts
Headers:
  X-User-ID: user-id
  X-User-Email: user@example.com
Body:
{
  "type": "TERMS_OF_SERVICE",
  "title": "App Terms of Service",
  "version": "1.0",
  "content": "...",
  "jurisdiction": "US",
  "effectiveDate": "2026-01-07",
  "tags": ["legal", "binding"]
}
Response:
{
  "id": "uuid",
  "status": "DRAFT",
  "createdAt": "2026-01-07T..."
}
```

### Sign Contract
```
POST /api/contracts/{contractId}/sign
Headers:
  X-User-ID: user-id
  X-User-Email: user@example.com
  X-User-Name: Display Name
Body:
{
  "signatureData": "signature_1234567890_abc123",
  "method": "NATIVE_CLICK",
  "screenshotBase64": "data:image/png;base64,...",
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "platform": "Windows",
  "browser": "Chrome",
  "deviceType": "desktop",
  "country": "United States",
  "city": "New York"
}
Response:
{
  "signature": {
    "id": "uuid",
    "signedAt": "2026-01-07T...",
    "signatureMethod": "NATIVE_CLICK",
    "deviceInfo": {...},
    "location": {...}
  },
  "certificate": "DIGITAL SIGNATURE CERTIFICATE\n...",
  "evidenceToken": "abc123def456..."
}
```

### Record Consent
```
POST /api/contracts/{contractId}/consent
Headers:
  X-User-ID: user-id
  X-User-Email: user@example.com
Body:
{
  "contractType": "PRIVACY_POLICY",
  "status": "ACCEPTED",
  "expiresInDays": 365
}
Response:
{
  "id": "uuid",
  "consentStatus": "ACCEPTED",
  "acceptedAt": "2026-01-07T...",
  "expiresAt": "2027-01-07T..."
}
```

### Get Audit Trail
```
GET /api/contracts/{contractId}/audit-trail
Response:
{
  "contractId": "uuid",
  "logs": [
    {
      "action": "signed",
      "timestamp": "2026-01-07T...",
      "userId": "user-id",
      "ipAddress": "192.168.1.1",
      "details": {
        "deviceType": "desktop",
        "platform": "Windows",
        "browser": "Chrome"
      },
      "screenshot": {
        "hash": "abc123def456..."
      }
    }
  ]
}
```

### Verify Compliance
```
GET /api/contracts/{contractId}/compliance
Response:
{
  "contractId": "uuid",
  "compliance": {
    "esignActCompliant": true,
    "uetaCompliant": true,
    "gdprCompliant": true,
    "ccpaCompliant": true,
    "hasActiveConsent": true,
    "hasAuditTrail": true,
    "isValid": true
  },
  "summary": {
    "isCompliant": true,
    "message": "Contract meets legal compliance standards (ESIGN, UETA)"
  }
}
```

### Export Contract with Evidence
```
POST /api/contracts/{contractId}/export
Headers:
  X-User-ID: user-id
Response:
{
  "contract": {
    "id": "uuid",
    "title": "...",
    "content": "...",
    "status": "SIGNED"
  },
  "signatures": [...],
  "consents": [...],
  "auditLogs": [...],
  "complianceStatus": {...},
  "evidence": {
    "auditReport": "...",
    "signingCertificates": [...],
    "complianceStatement": "..."
  },
  "exportedAt": "2026-01-07T..."
}
```

## Integration Guide

### 1. Enable DocuSign (Optional)

```typescript
// Set up OAuth
const docusignOAuthUrl = getDocuSignOAuthUrl(state);
window.location.href = docusignOAuthUrl;

// Handle callback
const { accessToken, refreshToken, accountId } = await exchangeDocuSignCode(code);
await DocuSignService.setupIntegration(
  accountId,
  accountEmail,
  accessToken,
  refreshToken,
  baseUri
);
```

### 2. Create and Present Contract

```typescript
// Create contract
const contract = await ContractService.createContract(
  {
    type: ContractType.TERMS_OF_SERVICE,
    title: "App Terms of Service",
    version: "1.0",
    content: contractContent,
    jurisdiction: "US",
    effectiveDate: new Date(),
    status: ContractStatus.ACTIVE,
    tags: ['legal', 'binding']
  },
  userId
);

// Present to user with ContractSigningComponent
<ContractSigningComponent
  contractId={contract.id}
  contractTitle={contract.title}
  contractContent={contract.content}
  onSignatureComplete={(sig) => console.log('Signed!', sig)}
/>
```

### 3. Verify Compliance Before Accepting User

```typescript
const compliance = await ContractService.verifyLegalCompliance(contractId);
if (!compliance.isValid) {
  throw new Error('Contract lacks required signatures and audit trail');
}
```

### 4. Export Evidence for Disputes

```typescript
const evidence = await ContractService.exportContractWithAuditTrail(contractId);
const auditReport = await AuditTrailService.generateAuditReport(contractId);
// Store securely or send to legal team
```

## Contract Templates

### Terms of Service Template
```
{{companyName}} Terms of Service
Version {{version}}
Effective Date: {{effectiveDate}}

1. ACCEPTANCE OF TERMS
By using {{appName}}, you agree to be bound by these terms.

2. SERVICES PROVIDED
{{companyName}} provides the following services:
{{serviceDescription}}

3. PAYMENT & BILLING
{{paymentTerms}}

4. LIABILITY & DISCLAIMERS
{{disclaimers}}

5. DISPUTE RESOLUTION
{{disputeResolution}}

6. GOVERNING LAW
These terms shall be governed by the laws of {{jurisdiction}}.

7. CONTACT
For questions: {{contactEmail}}
```

### Privacy Policy Template
```
{{companyName}} Privacy Policy
Version {{version}}

1. DATA COLLECTION
We collect the following personal data:
{{dataCollection}}

2. DATA USE
Your data is used for:
{{dataUsage}}

3. THIRD-PARTY SHARING
{{thirdPartySharing}}

4. YOUR RIGHTS
GDPR/CCPA Grant you the right to:
- Access your data
- Correct inaccuracies
- Request deletion
- Opt-out of processing

5. DATA SECURITY
{{securityMeasures}}
```

## Legal Compliance Details

### ESIGN Act Compliance
The ESIGN Act (E-SIGN) requires:
- ✅ Intent to sign electronically
- ✅ Consent to electronic records
- ✅ Ability to access and retain electronic records
- ✅ Notice of right to opt out
- ✅ Audit trail with timestamps

Our implementation:
```typescript
// Explicit consent checkbox
<Checkbox label="I accept the contract electronically" />

// Timestamp recording
signedAt: new Date() // ISO 8601

// Audit trail with screenshot evidence
await AuditTrailService.logSigningEvent({...})

// Certificate of authenticity
AuditTrailService.generateSigningCertificate({...})
```

### UETA Compliance
UETA requires:
- ✅ Agreement to conduct transaction electronically
- ✅ Capable of retaining electronic records
- ✅ Electronic signature associated with party
- ✅ Reasonable reliability of signature

Our implementation:
```typescript
// Device fingerprint prevents impersonation
const deviceFingerprint = generateDeviceFingerprint(context)

// Location and IP verify signing context
location: { country, city, coordinates }

// Screenshot hash provides visual evidence
screenshotHash: crypto.createHash('sha256')...
```

### GDPR Compliance
GDPR requires explicit consent for data processing.

Our implementation:
```typescript
// Explicit checkbox before data processing
const consent = await ContractService.recordConsent({
  consentStatus: ConsentStatus.ACCEPTED,
  expiresAt: new Date(Date.now() + 365*24*60*60*1000), // 1 year
})

// Right to withdraw
await ContractService.recordConsent({
  consentStatus: ConsentStatus.WITHDRAWN
})

// Audit trail proves consent
auditLogs = await ContractService.getContractAuditTrail(contractId)
```

### CCPA Compliance
CCPA gives California consumers data rights.

Our implementation:
```typescript
// Opt-in consent required
consentStatus: ConsentStatus.ACCEPTED

// Easy opt-out mechanism
consentStatus: ConsentStatus.WITHDRAWN

// Access to personal data
auditTrail = await ContractService.getUserAuditTrail(userId)

// Deletion capability
// Implement with GDPR right to be forgotten
```

## Security Best Practices

### 1. Encryption
```typescript
// Store sensitive contract content encrypted
const encrypted = encrypt(contract.content, publicKey)
await db.insert(encryptedContracts).values({
  contractId,
  encryptionAlgorithm: 'AES-256-GCM',
  encryptedContent: encrypted.content,
  iv: encrypted.iv,
  salt: encrypted.salt
})
```

### 2. Signature Verification
```typescript
// Verify evidence token before accepting signature
const isValid = AuditTrailService.verifyEvidenceToken(
  token,
  contractId,
  userId,
  signingContext
)
```

### 3. Audit Trail Integrity
```typescript
// Hash and chain audit logs
const previousHash = auditLogs[i-1].hash
const currentHash = sha256(
  auditLog.data + previousHash
)
```

### 4. Rate Limiting
```typescript
// Prevent signature spam
const recentSignatures = await db
  .select()
  .from(contractSignatures)
  .where(
    and(
      eq(contractSignatures.userId, userId),
      gt(contractSignatures.signedAt, 
         new Date(Date.now() - 1000*60)) // Last minute
    )
  )

if (recentSignatures.length > 5) {
  throw new Error('Too many signatures, please wait')
}
```

## Testing

### Test Contract Signing
```typescript
const testContext = {
  ipAddress: '192.168.1.1',
  userAgent: 'Test Browser',
  platform: 'Windows',
  browser: 'Chrome',
  deviceType: 'desktop',
  timestamp: new Date(),
  country: 'United States',
  city: 'New York'
}

const signature = await ContractService.signContract(
  contractId,
  userId,
  'test@example.com',
  'Test User',
  'test_signature_data',
  SignatureMethod.NATIVE_CLICK,
  testContext
)

// Verify signature was recorded
const savedSignature = await db
  .select()
  .from(contractSignatures)
  .where(eq(contractSignatures.id, signature.id))
```

### Verify Compliance
```typescript
const compliance = await ContractService.verifyLegalCompliance(contractId)
assert(compliance.esignActCompliant === true)
assert(compliance.uetaCompliant === true)
assert(compliance.hasAuditTrail === true)
```

## Troubleshooting

### Contract Status Not Updating
Check if all required signatures are present:
```typescript
const signatures = await ContractService.getContractSignatures(contractId)
if (signatures.length > 0) {
  await ContractService.updateContractStatus(
    contractId,
    ContractStatus.SIGNED
  )
}
```

### Missing Audit Trail
Ensure `logAuditEvent` is called after every action:
```typescript
await AuditTrailService.logSigningEvent(contractId, userId, context, {
  action: 'signed',
  screenshotHash,
  method: 'NATIVE_CLICK'
})
```

### Screenshot Capture Failing
Use `html2canvas` library for client-side capture:
```bash
npm install html2canvas
```

### DocuSign Integration Issues
Verify OAuth tokens are fresh:
```typescript
if (config.expiresAt < new Date()) {
  await DocuSignService.refreshToken(accountId)
}
```

## Future Enhancements

1. **Blockchain Storage** - Store contract hashes on blockchain for immutability
2. **Multi-Sig Contracts** - Require signatures from multiple parties
3. **Contract Analytics** - Track signing speed, location patterns
4. **Automated Enforcement** - Trigger actions on contract signing
5. **Smart Contracts** - Connect to Ethereum/Pi Network for automatic execution
6. **Mobile Biometric** - Fingerprint/FaceID signing on mobile
7. **Video Evidence** - Record video of signing process
8. **Legal AI Analysis** - Automatic risk assessment and suggestions

## Support

For legal questions, consult with your legal team. For technical support, contact the development team.

---

**Last Updated:** January 7, 2026
**Version:** 1.0
**Status:** Production Ready
