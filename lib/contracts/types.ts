/**
 * Legal Contracts Management Types
 * Supports DocuSign, native e-signatures, audit trails, and legal compliance
 */

export enum ContractType {
  TERMS_OF_SERVICE = 'TERMS_OF_SERVICE',
  PRIVACY_POLICY = 'PRIVACY_POLICY',
  NON_DISCLOSURE_AGREEMENT = 'NON_DISCLOSURE_AGREEMENT',
  SERVICE_AGREEMENT = 'SERVICE_AGREEMENT',
  DATA_PROCESSING_AGREEMENT = 'DATA_PROCESSING_AGREEMENT',
  PARTNERSHIP_AGREEMENT = 'PARTNERSHIP_AGREEMENT',
  PAYMENT_TERMS = 'PAYMENT_TERMS',
  ARBITRATION_CLAUSE = 'ARBITRATION_CLAUSE',
}

export enum SignatureMethod {
  DOCUSIGN = 'DOCUSIGN',
  ADOBE_SIGN = 'ADOBE_SIGN',
  HELLOSIGN = 'HELLOSIGN',
  NATIVE_CLICK = 'NATIVE_CLICK',
  BIOMETRIC_SIGNATURE = 'BIOMETRIC_SIGNATURE',
}

export enum ContractStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PENDING_SIGNATURE = 'PENDING_SIGNATURE',
  SIGNED = 'SIGNED',
  EXPIRED = 'EXPIRED',
  ARCHIVED = 'ARCHIVED',
}

export enum ConsentStatus {
  NOT_REQUESTED = 'NOT_REQUESTED',
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
}

export interface Contract {
  id: string;
  type: ContractType;
  title: string;
  version: string;
  content: string;
  htmlContent?: string;
  status: ContractStatus;
  jurisdiction: string;
  effectiveDate: Date;
  expiryDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  tags: string[];
}

export interface ContractSignature {
  id: string;
  contractId: string;
  userId: string;
  email: string;
  displayName: string;
  signatureMethod: SignatureMethod;
  signatureData: string; // Base64 or reference
  docuSignEnvelopeId?: string;
  signedAt: Date;
  validUntil?: Date;
  ipAddress: string;
  userAgent: string;
  deviceInfo: {
    platform: string;
    browser: string;
    deviceType: string;
  };
  location?: {
    country: string;
    city: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  screenshotHash?: string; // Hash of screenshot for verification
  blockchainTxHash?: string; // If stored on blockchain
}

export interface UserConsent {
  id: string;
  userId: string;
  email: string;
  contractId: string;
  contractType: ContractType;
  consentStatus: ConsentStatus;
  acceptedAt?: Date;
  rejectedAt?: Date;
  withdrawnAt?: Date;
  ipAddress: string;
  userAgent: string;
  consentVersion: string;
  expiresAt?: Date;
  notes?: string;
}

export interface AuditLog {
  id: string;
  contractId: string;
  signatureId?: string;
  consentId?: string;
  userId: string;
  action: string; // 'created', 'viewed', 'signed', 'rejected', 'withdrawn', 'downloaded'
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  details: Record<string, any>;
  screenshot?: {
    hash: string;
    timestamp: Date;
    description: string;
  };
  changeLog?: {
    before: Record<string, any>;
    after: Record<string, any>;
  };
}

export interface DocuSignIntegration {
  id: string;
  accountId: string;
  accountEmail: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  baseUri: string;
  integrationStatus: 'CONNECTED' | 'PENDING' | 'FAILED' | 'EXPIRED';
  lastSyncAt: Date;
}

export interface E2EEncryptedContract {
  id: string;
  contractId: string;
  encryptionAlgorithm: 'AES-256-GCM' | 'AES-256-CBC';
  encryptedContent: string;
  iv: string;
  salt: string;
  encryptedAt: Date;
  publicKeyHash: string; // For key management
}

export interface ContractTemplate {
  id: string;
  name: string;
  type: ContractType;
  category: string;
  templateContent: string;
  variables: string[]; // e.g., {{companyName}}, {{userEmail}}
  jurisdiction: string;
  industry?: string;
  version: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContractAnalysis {
  id: string;
  contractId: string;
  analyzedAt: Date;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskFactors: {
    factor: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    description: string;
  }[];
  legalKeywords: string[];
  complianceChecks: {
    esignActCompliant: boolean;
    uetaCompliant: boolean;
    gdprCompliant: boolean;
    ccpaCompliant: boolean;
    otherRegulations: string[];
  };
  suggestedImprovements: string[];
}

export interface ContractNotification {
  id: string;
  contractId: string;
  userId: string;
  type: 'SIGNATURE_REQUIRED' | 'CONTRACT_UPDATED' | 'SIGNATURE_REMINDER' | 'CONTRACT_EXPIRING';
  sentAt: Date;
  readAt?: Date;
  content: string;
  actionUrl: string;
}

export interface ContractBulkOperation {
  id: string;
  operationType: 'SEND_FOR_SIGNATURE' | 'REQUEST_CONSENT' | 'EXPIRE_CONTRACTS' | 'ARCHIVE';
  contractIds: string[];
  recipientIds: string[];
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  createdAt: Date;
  completedAt?: Date;
  successCount: number;
  failureCount: number;
  errors?: {
    contractId: string;
    error: string;
  }[];
}
