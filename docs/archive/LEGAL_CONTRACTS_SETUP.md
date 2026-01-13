# Legal Contracts Setup Guide

## 🚀 Quick Setup (5 minutes)

### 1. Install Dependencies
```bash
npm install uuid crypto html2canvas axios
# Or with pnpm
pnpm add uuid crypto html2canvas axios
```

### 2. Create Database Tables
```bash
# Generate migration
npm run db:generate

# Run migration
npm run db:migrate

# Or push schema directly
npm run db:push
```

### 3. Add Environment Variables
```bash
# .env.local
DOCUSIGN_CLIENT_ID=your_docusign_client_id
DOCUSIGN_CLIENT_SECRET=your_docusign_client_secret
DOCUSIGN_REDIRECT_URI=https://yourapp.com/api/contracts/docusign/callback
SIGNATURE_SECRET=your_signature_verification_secret
```

### 4. Test the System
```bash
# Create a test contract
curl -X POST http://localhost:3000/api/contracts \
  -H "Content-Type: application/json" \
  -H "X-User-ID: test-user" \
  -H "X-User-Email: test@example.com" \
  -d '{
    "type": "TERMS_OF_SERVICE",
    "title": "Test Contract",
    "version": "1.0",
    "content": "This is a test contract",
    "jurisdiction": "US",
    "effectiveDate": "2026-01-07"
  }'
```

## 📋 Implementation Checklist

- [ ] Database schema created (`npm run db:push`)
- [ ] Environment variables configured
- [ ] Contract types defined in UI
- [ ] Legal templates reviewed by lawyer
- [ ] Signature capture tested (screenshot functionality)
- [ ] Audit logging verified
- [ ] Compliance verification working
- [ ] DocuSign integration (optional) configured
- [ ] API endpoints tested
- [ ] UI component integrated
- [ ] Legal disclaimers added to app
- [ ] Privacy policy updated
- [ ] Terms of service published

## 🔌 Integration Steps

### Step 1: Create Contract Instance
```typescript
import { ContractService } from '@/lib/contracts/service';
import { ContractType, ContractStatus } from '@/lib/contracts/types';

// Create contract
const contract = await ContractService.createContract(
  {
    type: ContractType.TERMS_OF_SERVICE,
    title: 'Triumph Synergy Terms',
    version: '1.0',
    content: contractText,
    jurisdiction: 'US',
    effectiveDate: new Date(),
    status: ContractStatus.ACTIVE,
    tags: ['legal', 'binding']
  },
  currentUserId
);
```

### Step 2: Display to User
```typescript
import { ContractSigningComponent } from '@/components/contracts/signing-component';

// In your page/component
<ContractSigningComponent 
  contractId={contract.id}
  contractTitle={contract.title}
  contractContent={contract.content}
  requiredToSign={true}
  onSignatureComplete={(signature) => {
    // Handle successful signature
    console.log('Contract signed:', signature);
    // Save evidence
    // Update user account
  }}
/>
```

### Step 3: Verify Compliance
```typescript
// After user signs
const compliance = await ContractService.verifyLegalCompliance(contractId);

if (compliance.isValid) {
  // User can proceed (contract is enforceable)
  await db.update(users).set({ contractSigned: true });
} else {
  // Contract needs additional work
  console.error('Contract not yet compliant:', compliance);
}
```

### Step 4: Store Evidence
```typescript
// Export complete legal package
const evidence = await ContractService.exportContractWithAuditTrail(contractId);

// Store in secure location
await saveToEvidenceVault(evidence);

// Optional: Send to legal team
await sendToLegalTeam(evidence.evidence);
```

## 🔐 Security Configuration

### 1. Encrypt Sensitive Contracts
```typescript
import { encryptContract, decryptContract } from '@/lib/contracts/encryption';

const encrypted = encryptContract(contractContent, publicKey);
await db.insert(encryptedContracts).values({
  contractId,
  encryptionAlgorithm: 'AES-256-GCM',
  encryptedContent: encrypted.content,
  iv: encrypted.iv,
  salt: encrypted.salt
});
```

### 2. Set Up Rate Limiting
```typescript
// Add to API route
import { Ratelimit } from '@upstash/ratelimit';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '60s'), // 5 signatures per minute
});

const { success } = await ratelimit.limit(`sign:${userId}`);
if (!success) throw new Error('Too many signature requests');
```

### 3. Verify Signatures
```typescript
const token = generateEvidenceToken(contractId, userId, context);
// Store token

// Later, verify it wasn't tampered with
const isValid = verifyEvidenceToken(token, contractId, userId, context);
if (!isValid) {
  throw new Error('Signature evidence tampered with');
}
```

## 📧 Optional: DocuSign Integration

### 1. Register DocuSign App
- Go to https://developers.docusign.com
- Create application
- Get Client ID and Client Secret

### 2. Set Up OAuth
```typescript
import { getDocuSignOAuthUrl, exchangeDocuSignCode } from '@/lib/contracts/docusign-service';

// 1. Send user to DocuSign
const url = getDocuSignOAuthUrl(state);
window.location.href = url;

// 2. Handle callback
const { accessToken, refreshToken, accountId, baseUri } = 
  await exchangeDocuSignCode(code);

// 3. Save integration
await DocuSignService.setupIntegration(
  accountId,
  email,
  accessToken,
  refreshToken,
  baseUri
);
```

### 3. Send for Signature
```typescript
const service = await DocuSignService.getInstance(accountId);

const envelope = await service.sendForSignature(
  {
    contractId,
    recipients: [
      { email: 'signer@example.com', name: 'John Signer', recipientId: '1' }
    ],
    subject: 'Please sign this contract',
    message: 'You need to sign the attached contract'
  },
  contractPdfContent
);
```

## 📊 Monitoring & Compliance

### Monitor Contract Metrics
```typescript
// Get signing statistics
const contracts = await ContractService.getUserContracts(userId);
const stats = {
  total: contracts.length,
  signed: contracts.filter(c => c.status === 'SIGNED').length,
  pending: contracts.filter(c => c.status === 'PENDING_SIGNATURE').length,
  signRate: (signed / total) * 100
};
```

### Audit Compliance Regularly
```typescript
// Run daily compliance check
const contracts = await db.select().from(contracts);
for (const contract of contracts) {
  const compliance = await ContractService.verifyLegalCompliance(contract.id);
  if (!compliance.isValid) {
    await alertLegalTeam(`Contract ${contract.id} is not compliant`);
  }
}
```

### Export Evidence for Audits
```typescript
// Monthly compliance export
const allEvidence = [];
for (const contractId of contractIds) {
  const evidence = await ContractService.exportContractWithAuditTrail(contractId);
  allEvidence.push(evidence);
}

// Save to secure archive
await saveToComplianceArchive(allEvidence);
```

## 🧪 Testing

### Test Contract Creation
```typescript
test('should create contract', async () => {
  const contract = await ContractService.createContract({
    type: ContractType.TERMS_OF_SERVICE,
    title: 'Test Contract',
    version: '1.0',
    content: 'Test content',
    jurisdiction: 'US',
    effectiveDate: new Date(),
    status: ContractStatus.DRAFT,
    tags: []
  }, 'test-user');

  expect(contract.id).toBeDefined();
  expect(contract.status).toBe(ContractStatus.DRAFT);
});
```

### Test Signing
```typescript
test('should sign contract', async () => {
  const signature = await ContractService.signContract(
    contractId,
    userId,
    'user@test.com',
    'Test User',
    'signature_data',
    SignatureMethod.NATIVE_CLICK,
    {
      ipAddress: '127.0.0.1',
      userAgent: 'Test',
      platform: 'Windows',
      browser: 'Chrome',
      deviceType: 'desktop'
    }
  );

  expect(signature.signedAt).toBeDefined();
  expect(signature.userId).toBe(userId);
});
```

### Test Compliance
```typescript
test('should verify compliance', async () => {
  // Create and sign contract
  const contract = await ContractService.createContract({...}, userId);
  const signature = await ContractService.signContract({...});

  // Check compliance
  const compliance = await ContractService.verifyLegalCompliance(contract.id);
  expect(compliance.isValid).toBe(true);
  expect(compliance.hasAuditTrail).toBe(true);
});
```

## 🚨 Troubleshooting

### Database Connection Failed
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Solution:**
- Verify PostgreSQL is running: `docker-compose up -d`
- Check DATABASE_URL is correct
- Run migrations: `npm run db:migrate`

### Signature Verification Failed
```
Error: Signature evidence tampered with
```
**Solution:**
- Ensure SIGNATURE_SECRET is set in .env
- Check timestamp is current (not expired)
- Verify device fingerprint hasn't changed

### Screenshot Capture Fails
```
Error: html2canvas is not installed
```
**Solution:**
```bash
npm install html2canvas
```

### DocuSign Integration Fails
```
Error: DocuSign integration not configured
```
**Solution:**
- Verify DOCUSIGN_CLIENT_ID and SECRET in .env
- Complete OAuth flow: `getDocuSignOAuthUrl()`
- Run: `DocuSignService.setupIntegration()`

## 📞 Support Resources

- **Drizzle ORM:** https://orm.drizzle.team/
- **ESIGN Act:** https://www.law.cornell.edu/uscode/text/15/7001
- **UETA:** https://www.uniformelaw.org/acts/ueta
- **GDPR:** https://gdpr.eu/
- **DocuSign API:** https://developers.docusign.com/

---

**Setup Complete!** Your app now has legally binding contracts. 🎉

Next: Review legal templates with your lawyer before going live.
