// lib/pi-kyc/types.ts
// Pi Network KYC/KYB Type Definitions

/**
 * Pi Network KYC Verification Levels
 * Fast-tracked through Pi Network's existing verification
 */
export type PiKYCLevel = 
  | 'UNVERIFIED'           // No Pi Network verification
  | 'PI_BASIC'             // Pi Network phone verification
  | 'PI_VERIFIED'          // Pi Network full KYC complete
  | 'FAST_TRACK_APPROVED'  // Fast-track with Pi verification + additional checks
  | 'PREMIUM_VERIFIED';    // Full enhanced verification for high-value operations

/**
 * Pi Network KYB Business Verification Levels
 */
export type PiKYBLevel =
  | 'UNVERIFIED'
  | 'BASIC_BUSINESS'       // Business email + Pi verified owner
  | 'VERIFIED_BUSINESS'    // Full business verification
  | 'ENTERPRISE_VERIFIED'  // Enterprise-level with multi-sig
  | 'INSTITUTIONAL';       // Institutional-grade verification

/**
 * Pi Network User with KYC Status
 */
export interface PiKYCUser {
  piUid: string;              // Pi Network unique identifier
  username: string;           // Pi username
  kycLevel: PiKYCLevel;
  fastTrackEligible: boolean;
  verificationDate: string;
  expiryDate: string;
  piWalletAddress?: string;
  kycScore: number;           // 0-100 verification confidence
  fastTrackFactors: PiKYCFastTrackFactors;
  documents: PiKYCDocuments;
  riskProfile: PiRiskProfile;
}

/**
 * Pi Network Business with KYB Status
 */
export interface PiKYBBusiness {
  businessId: string;
  piOwnerUid: string;         // Pi UID of primary owner
  businessName: string;
  registrationNumber: string;
  jurisdiction: string;
  kybLevel: PiKYBLevel;
  verificationDate: string;
  expiryDate: string;
  multiSigWallet?: PiMultiSigWallet;
  kybScore: number;
  directors: PiKYBDirector[];
  beneficialOwners: PiKYBBeneficialOwner[];
  complianceChecks: PiKYBComplianceChecks;
}

/**
 * Fast-Track Eligibility Factors
 * Pi Network verification provides trust basis
 */
export interface PiKYCFastTrackFactors {
  piNetworkVerified: boolean;       // Pi Network phone/ID verification
  piMiningHistory: boolean;         // Has mining history
  piMiningDurationDays: number;     // Days actively mining
  piWalletCreated: boolean;         // Has Pi wallet
  piTransactionHistory: boolean;    // Has transaction history
  piReferralNetwork: boolean;       // Active referral network
  piSecurityCircle: boolean;        // Has security circle
  piContributorStatus: boolean;     // Pioneer, Ambassador, Node operator
  piAppUsageScore: number;          // App engagement (0-100)
}

/**
 * KYC Document Verification Status
 */
export interface PiKYCDocuments {
  governmentId: DocumentStatus;
  selfieVerification: DocumentStatus;
  proofOfAddress: DocumentStatus;
  sourceOfFunds: DocumentStatus;
  piNetworkVerification: DocumentStatus;
}

/**
 * KYB Director Information
 */
export interface PiKYBDirector {
  name: string;
  piUid?: string;             // If Pi Network user
  position: string;
  dateOfBirth: string;
  nationality: string;
  idVerified: boolean;
  pepScreened: boolean;
  sanctionsScreened: boolean;
}

/**
 * KYB Beneficial Owner (>25% ownership)
 */
export interface PiKYBBeneficialOwner {
  name: string;
  piUid?: string;
  ownershipPercentage: number;
  controlType: 'DIRECT' | 'INDIRECT';
  dateOfBirth: string;
  nationality: string;
  idVerified: boolean;
  pepScreened: boolean;
  sanctionsScreened: boolean;
}

/**
 * KYB Compliance Checks
 */
export interface PiKYBComplianceChecks {
  businessRegistration: boolean;
  taxCompliance: boolean;
  amlPolicy: boolean;
  privacyPolicy: boolean;
  sanctionsScreening: boolean;
  pepScreening: boolean;
  adverseMedia: boolean;
  beneficialOwnershipVerified: boolean;
  financialStatements: boolean;
}

/**
 * Document Verification Status
 */
export interface DocumentStatus {
  submitted: boolean;
  verified: boolean;
  verificationDate?: string;
  expiryDate?: string;
  documentType?: string;
  issuingCountry?: string;
  confidence: number;         // Verification confidence 0-100
}

/**
 * Risk Profile for AML/CFT
 */
export interface PiRiskProfile {
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskScore: number;          // 0-100
  factors: {
    geographicRisk: number;
    transactionPatternRisk: number;
    pepExposure: number;
    sanctionsProximity: number;
    sourceOfFundsRisk: number;
  };
  lastAssessment: string;
  reviewRequired: boolean;
}

/**
 * Pi Multi-Signature Wallet for Business
 */
export interface PiMultiSigWallet {
  walletId: string;
  walletAddress: string;
  businessId: string;
  signatoryThreshold: number;  // Required signatures
  totalSignatories: number;
  signatories: PiWalletSignatory[];
  createdAt: string;
  status: 'PENDING_SETUP' | 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
  spendingLimits: PiSpendingLimits;
  transactionRules: PiTransactionRule[];
  escrowEnabled: boolean;
}

/**
 * Wallet Signatory Information
 */
export interface PiWalletSignatory {
  piUid: string;
  username: string;
  role: 'OWNER' | 'ADMIN' | 'SIGNATORY' | 'VIEWER';
  weight: number;             // Vote weight for threshold
  canInitiate: boolean;       // Can initiate transactions
  canApprove: boolean;        // Can approve transactions
  addedAt: string;
  lastActive: string;
  deviceVerified: boolean;
  biometricEnabled: boolean;
}

/**
 * Multi-Sig Spending Limits
 */
export interface PiSpendingLimits {
  dailyLimit: number;         // In Pi
  weeklyLimit: number;
  monthlyLimit: number;
  singleTransactionLimit: number;
  requiresMultiSig: number;   // Amount threshold requiring multi-sig
}

/**
 * Multi-Sig Transaction Rules
 */
export interface PiTransactionRule {
  ruleId: string;
  ruleName: string;
  condition: {
    type: 'AMOUNT' | 'RECIPIENT' | 'TIME' | 'FREQUENCY';
    operator: '>' | '<' | '==' | 'IN' | 'NOT_IN';
    value: any;
  };
  action: 'REQUIRE_MULTI_SIG' | 'REQUIRE_ALL_SIGNERS' | 'BLOCK' | 'ALERT' | 'DELAY';
  signaturesRequired?: number;
  delayMinutes?: number;
  alertRecipients?: string[];
}

/**
 * Fast-Track KYC Application
 */
export interface PiKYCApplication {
  applicationId: string;
  piUid: string;
  applicationType: 'INDIVIDUAL' | 'BUSINESS';
  status: KYCApplicationStatus;
  submittedAt: string;
  updatedAt: string;
  targetLevel: PiKYCLevel | PiKYBLevel;
  fastTrackQualified: boolean;
  estimatedCompletionTime: string;  // ISO duration
  documents: {
    documentId: string;
    type: string;
    status: DocumentStatus;
  }[];
  verificationSteps: VerificationStep[];
  walletProvisioning?: {
    scheduled: boolean;
    scheduledAt?: string;
    walletType: 'INDIVIDUAL' | 'MULTI_SIG';
  };
}

/**
 * KYC Application Status
 */
export type KYCApplicationStatus = 
  | 'PENDING'
  | 'IN_REVIEW'
  | 'ADDITIONAL_INFO_REQUIRED'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'WALLET_PROVISIONING'
  | 'COMPLETED';

/**
 * Individual Verification Step
 */
export interface VerificationStep {
  stepId: string;
  stepName: string;
  order: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  automated: boolean;
  startedAt?: string;
  completedAt?: string;
  result?: {
    passed: boolean;
    confidence: number;
    details: string;
  };
}

/**
 * Pi Wallet Creation Request
 */
export interface PiWalletCreationRequest {
  requestId: string;
  piUid: string;
  walletType: 'INDIVIDUAL' | 'MULTI_SIG';
  businessId?: string;        // For multi-sig
  signatories?: string[];     // Pi UIDs for multi-sig
  threshold?: number;         // Required signatures
  createdAt: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
}

/**
 * Pi Wallet Creation Result
 */
export interface PiWalletCreationResult {
  success: boolean;
  walletAddress?: string;
  walletId?: string;
  multiSigWallet?: PiMultiSigWallet;
  error?: string;
  transactionId?: string;     // Blockchain transaction
  createdAt: string;
}

/**
 * Fast-Track Verification Request
 */
export interface FastTrackVerificationRequest {
  piUid: string;
  username: string;
  requestedLevel: PiKYCLevel;
  piAccessToken: string;      // For Pi Network API verification
  consentGiven: boolean;
  gdprConsent: boolean;
  additionalDocuments?: File[];
}

/**
 * Business Fast-Track Request
 */
export interface BusinessFastTrackRequest {
  ownerPiUid: string;
  businessName: string;
  registrationNumber: string;
  jurisdiction: string;
  requestedLevel: PiKYBLevel;
  directors: Omit<PiKYBDirector, 'idVerified' | 'pepScreened' | 'sanctionsScreened'>[];
  beneficialOwners: Omit<PiKYBBeneficialOwner, 'idVerified' | 'pepScreened' | 'sanctionsScreened'>[];
  requestMultiSigWallet: boolean;
  multiSigConfig?: {
    signatories: string[];    // Pi UIDs
    threshold: number;
    spendingLimits: PiSpendingLimits;
  };
  documents: {
    businessRegistration: File;
    taxCertificate?: File;
    financialStatements?: File;
    amlPolicy?: File;
  };
  consentGiven: boolean;
  gdprConsent: boolean;
}
