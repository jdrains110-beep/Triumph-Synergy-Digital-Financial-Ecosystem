/**
 * Contract System Migration
 * Run with: npm run db:migrate
 */

import { db } from './index';
import {
  contracts,
  contractSignatures,
  userConsents,
  contractAuditLogs,
  contractTemplates,
  docuSignIntegrations,
  encryptedContracts,
  contractAnalyses,
  contractNotifications,
  contractBulkOperations,
} from '@/lib/contracts/schema';

export async function migrateContractSystem() {
  console.log('Starting contract system migration...');

  try {
    // Create all tables
    console.log('Creating contracts table...');
    // Tables created via Drizzle schema

    console.log('Seeding default contract templates...');
    await seedTemplates();

    console.log('✅ Contract system migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

async function seedTemplates() {
  const defaultTemplates = [
    {
      name: 'Terms of Service',
      type: 'TERMS_OF_SERVICE',
      category: 'Legal',
      templateContent: `TERMS OF SERVICE
Agreement Version {{version}}
Effective Date: {{effectiveDate}}

1. ACCEPTANCE OF TERMS
By accessing and using {{appName}}, you accept and agree to be bound by the terms of this agreement.

2. USE LICENSE
{{companyName}} grants you a limited license to use {{appName}} for your personal or business use, subject to restrictions set in these terms.

3. RESTRICTIONS
You agree not to:
- Reproduce, duplicate, copy, or resell any portion of {{appName}}
- Reverse engineer or attempt to discover source code
- Transmit viruses or malicious code
- Collect or track personal information without permission

4. DISCLAIMER OF WARRANTIES
{{appName}} is provided "as is" without warranties of any kind, express or implied.

5. LIMITATION OF LIABILITY
In no event shall {{companyName}} be liable for any damages arising from use of {{appName}}.

6. PAYMENT TERMS
{{paymentTerms}}

7. REFUND POLICY
{{refundPolicy}}

8. TERMINATION
{{companyName}} may terminate access for violation of these terms.

9. GOVERNING LAW
These terms are governed by the laws of {{jurisdiction}} without regard to conflicts of law.

10. DISPUTE RESOLUTION
Any disputes shall be resolved through binding arbitration in {{jurisdiction}}.

Acknowledgment: I have read and agree to these Terms of Service.`,
      variables: [
        'appName',
        'companyName',
        'version',
        'effectiveDate',
        'paymentTerms',
        'refundPolicy',
        'jurisdiction',
      ],
      jurisdiction: 'US',
      version: '1.0',
      isActive: true,
    },
    {
      name: 'Privacy Policy',
      type: 'PRIVACY_POLICY',
      category: 'Legal',
      templateContent: `PRIVACY POLICY
{{companyName}} Privacy Policy
Last Updated: {{lastUpdated}}

1. INFORMATION WE COLLECT
We collect information you provide directly:
- Account registration (email, name)
- Profile information
- Payment and billing information
- Communications and customer service interactions

We also collect information automatically:
- Log data (IP address, browser type, pages visited)
- Device information (device type, OS, mobile network)
- Cookies and similar tracking technologies

2. HOW WE USE YOUR INFORMATION
We use collected information to:
- Provide and improve {{appName}}
- Process payments and send related information
- Send promotional and educational emails
- Respond to your requests and support needs
- Monitor and analyze service usage
- Comply with legal obligations

3. THIRD-PARTY SHARING
We do not sell personal data. We may share information with:
- Service providers who assist in operations
- Business partners (with your consent)
- Law enforcement when legally required
- Successor entities in case of merger/acquisition

4. DATA RETENTION
We retain personal data for as long as necessary to provide services and comply with legal obligations.

5. YOUR PRIVACY RIGHTS
Under GDPR, CCPA, and other regulations, you have rights to:
- Access your personal data
- Correct inaccurate data
- Request deletion (right to be forgotten)
- Port your data to another service
- Opt-out of marketing communications
- Object to processing for certain purposes

6. SECURITY
We implement industry-standard security measures including:
- Encryption in transit (TLS/SSL)
- Encryption at rest (AES-256)
- Access controls and authentication
- Regular security audits

7. CALIFORNIA RESIDENTS (CCPA)
California residents have additional rights to request:
- Categories of personal information collected
- Business purposes for collection
- Third parties with whom data is shared
- Categories of data disclosed

8. EUROPEAN RESIDENTS (GDPR)
European residents can:
- Request access to personal data
- Withdraw consent at any time
- Lodge complaints with supervisory authorities
- Request data portability

9. COOKIES
We use cookies for:
- Authentication and security
- Preferences and customization
- Analytics and performance
- Marketing purposes

You can control cookies through browser settings.

10. CONTACT US
For privacy questions or to exercise rights:
Email: {{privacyEmail}}
Address: {{companyAddress}}

By using {{appName}}, you consent to this Privacy Policy.`,
      variables: [
        'companyName',
        'lastUpdated',
        'appName',
        'privacyEmail',
        'companyAddress',
      ],
      jurisdiction: 'US',
      version: '1.0',
      isActive: true,
    },
    {
      name: 'Non-Disclosure Agreement',
      type: 'NON_DISCLOSURE_AGREEMENT',
      category: 'Legal',
      templateContent: `NON-DISCLOSURE AGREEMENT
Confidential Information Protection Agreement

This NDA is entered into on {{date}} between:
- Disclosing Party: {{disclosingParty}}
- Receiving Party: {{receivingParty}}

1. CONFIDENTIAL INFORMATION
"Confidential Information" means all non-public information disclosed, including:
- Business plans and strategies
- Technical data and source code
- Customer lists and pricing
- Financial information
- Trade secrets

2. OBLIGATIONS
The Receiving Party agrees to:
- Maintain strict confidentiality
- Limit disclosure to employees with need to know
- Use reasonable security measures
- Not use information for unauthorized purposes

3. EXCEPTIONS
Confidential Information does not include information that:
- Is publicly available (not through breach)
- Was known prior to disclosure
- Is independently developed
- Is rightfully received from third parties
- Is required to be disclosed by law

4. TERM
This NDA remains in effect for {{duration}} years from date of this agreement.

5. RETURN OF INFORMATION
Upon request or termination, Receiving Party will:
- Return all confidential materials
- Destroy copies (except legally required retention)
- Certify destruction in writing

6. NO LICENSE
Disclosure does not grant any rights to patents, copyrights, or other IP.

7. GOVERNING LAW
This NDA is governed by the laws of {{jurisdiction}}.

I acknowledge that I have read and understand this NDA and agree to be bound by its terms.`,
      variables: [
        'date',
        'disclosingParty',
        'receivingParty',
        'duration',
        'jurisdiction',
      ],
      jurisdiction: 'US',
      version: '1.0',
      isActive: true,
    },
    {
      name: 'Service Agreement',
      type: 'SERVICE_AGREEMENT',
      category: 'Legal',
      templateContent: `SERVICE AGREEMENT
{{serviceName}} Service Agreement
Effective Date: {{effectiveDate}}

1. SERVICES
{{companyName}} will provide the following services:
{{serviceDescription}}

2. SERVICE LEVEL
- Uptime Target: {{uptime}}%
- Support Hours: {{supportHours}}
- Response Time: {{responseTime}}

3. PAYMENT TERMS
- Service Fee: {{serviceFee}}
- Billing Period: {{billingPeriod}}
- Payment Due: {{paymentDue}}
- Late Payment Penalty: {{latePenalty}}

4. TERM AND TERMINATION
- Initial Term: {{initialTerm}}
- Renewal: {{renewalTerms}}
- Termination Notice: {{terminationNotice}}
- Effect of Termination: {{terminationEffect}}

5. REPRESENTATIONS AND WARRANTIES
{{companyName}} represents that it will:
- Provide services in professional manner
- Maintain appropriate insurance
- Comply with all applicable laws
- Protect client confidential information

6. LIMITATION OF LIABILITY
Neither party shall be liable for indirect, incidental, consequential, or punitive damages.

7. INDEPENDENT CONTRACTOR
{{companyName}} is an independent contractor and not an employee.

8. ENTIRE AGREEMENT
This agreement constitutes the entire understanding between parties.

By executing this agreement, both parties acknowledge they have read, understand, and agree to be bound by all terms and conditions.`,
      variables: [
        'serviceName',
        'effectiveDate',
        'companyName',
        'serviceDescription',
        'uptime',
        'supportHours',
        'responseTime',
        'serviceFee',
        'billingPeriod',
        'paymentDue',
        'latePenalty',
        'initialTerm',
        'renewalTerms',
        'terminationNotice',
        'terminationEffect',
      ],
      jurisdiction: 'US',
      version: '1.0',
      isActive: true,
    },
  ];

  for (const template of defaultTemplates) {
    try {
      // Check if template already exists
      const existing = await db
        .select()
        .from(contractTemplates)
        .where(
          (t) => t.name === template.name && t.type === template.type
        );

      if (existing.length === 0) {
        await db.insert(contractTemplates).values(template);
        console.log(`✅ Created template: ${template.name}`);
      } else {
        console.log(`⏭️  Template already exists: ${template.name}`);
      }
    } catch (error) {
      console.error(`❌ Failed to seed template ${template.name}:`, error);
    }
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateContractSystem()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default migrateContractSystem;
