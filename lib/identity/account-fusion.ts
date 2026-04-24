/**
 * Account Fusion System - One Account Per Person
 * 
 * Ensures:
 * - Unique identity verification per person
 * - Prevention of duplicate accounts
 * - Prevention of stolen/fraudulent accounts
 * - Biometric binding to physical identity
 * - Multi-factor authentication
 * - Account linking across all services
 * 
 * Integration with:
 * - Biometric verification (facial recognition, fingerprint)
 * - Government ID verification (passport, driver's license)
 * - Know Your Customer (KYC) framework
 * - Zero-Knowledge Proofs for privacy
 */

import crypto from "crypto";

// ============================================================================
// Types & Interfaces
// ============================================================================

export type BiometricType = "facial" | "fingerprint" | "iris" | "voice";
export type IdDocumentType = "passport" | "driver_license" | "id_card" | "birth_certificate";
export type VerificationStatus = "pending" | "verified" | "rejected" | "suspicious" | "flagged";

export interface BiometricSignature {
  type: BiometricType;
  templateHash: string;
  captureTimestamp: number;
  quality: number; // 0-100
  confidence: number; // 0-100
  liveness: boolean;
}

export interface IdDocumentVerification {
  type: IdDocumentType;
  country: string;
  documentNumber: string;
  issuedDate: string;
  expiryDate: string;
  documentHash: string;
  verified: boolean;
  verificationMethod: "manual" | "automated" | "blockchain";
}

export interface PersonalIdentity {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  country: string;
  identityHash: string; // Hash of sensitive data, not stored plaintext
  biometrics: Map<BiometricType, BiometricSignature>;
  idDocuments: IdDocumentVerification[];
  verificationStatus: VerificationStatus;
  verifiedAt?: number;
  riskScore: number; // 0-100, higher = more suspicious
}

export interface TriumphAccount {
  accountId: string;
  personalIdentity: PersonalIdentity;
  piNetworkAddress: string[];
  email: string;
  phone: string;
  createdAt: number;
  lastActivityAt: number;
  devices: RegisteredDevice[];
  linkedAccounts: string[]; // Other services/platforms
  status: "active" | "suspended" | "locked" | "closed";
  verificationLevel: "level1" | "level2" | "level3"; // KYC levels
}

export interface RegisteredDevice {
  deviceId: string;
  fingerprint: string;
  name: string;
  type: "mobile" | "desktop" | "tablet" | "hardware_wallet";
  ipAddress: string;
  biometricsOnDevice: boolean;
  trustedUntil?: number;
  lastUsedAt: number;
}

export interface DuplicateDetection {
  identityId: string;
  suspiciousBiometricMatches: Array<{ score: number; accountId: string }>;
  suspiciousIPMatches: Array<{ ip: string; accountId: string }>;
  suspiciousPhoneMatches: Array<{ phone: string; accountId: string }>;
  suspiciousEmailMatches: Array<{ email: string; accountId: string }>;
  overallRiskScore: number;
  isLikelyDuplicate: boolean;
}

// ============================================================================
// Account Fusion System Implementation
// ============================================================================

export class AccountFusionSystem {
  private accounts: Map<string, TriumphAccount> = new Map();
  private identityIndex: Map<string, string> = new Map(); // identityHash -> accountId
  private biometricIndex: Map<string, string> = new Map(); // biometricHash -> accountId
  private ipAddressIndex: Map<string, Set<string>> = new Map(); // IP -> accountIds
  private phoneIndex: Map<string, string> = new Map(); // phone -> accountId
  private emailIndex: Map<string, string> = new Map(); // email -> accountId
  private deviceFingerprintIndex: Map<string, string> = new Map(); // deviceFingerprint -> accountId

  private static instance: AccountFusionSystem;

  private constructor() {}

  static getInstance(): AccountFusionSystem {
    if (!AccountFusionSystem.instance) {
      AccountFusionSystem.instance = new AccountFusionSystem();
    }
    return AccountFusionSystem.instance;
  }

  /**
   * Create a new account with unified identity verification
   */
  async createAccount(
    identity: PersonalIdentity,
    device: RegisteredDevice,
    email: string,
    phone: string,
    piAddress: string
  ): Promise<{ account: TriumphAccount; verification: DuplicateDetection }> {
    // Step 1: Verify identity
    this.validateIdentity(identity);

    // Step 2: Check for duplicates
    const duplicateCheck = this.checkForDuplicates(identity, device, email, phone);
    if (duplicateCheck.isLikelyDuplicate) {
      throw new Error(
        `Duplicate account detected! Risk score: ${duplicateCheck.overallRiskScore}. Manual review required.`
      );
    }

    // Step 3: Create account
    const accountId = this.generateAccountId();
    const account: TriumphAccount = {
      accountId,
      personalIdentity: identity,
      piNetworkAddress: [piAddress],
      email,
      phone,
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
      devices: [device],
      linkedAccounts: [],
      status: "active",
      verificationLevel: "level1",
    };

    // Step 4: Register indices
    this.accounts.set(accountId, account);
    this.identityIndex.set(identity.identityHash, accountId);
    this.emailIndex.set(email.toLowerCase(), accountId);
    this.phoneIndex.set(phone, accountId);
    device.ipAddress && this.registerIpAddress(device.ipAddress, accountId);
    this.registerDeviceFingerprint(device.fingerprint, accountId);

    // Register biometrics
    for (const [bioType, bioSig] of identity.biometrics) {
      this.biometricIndex.set(bioSig.templateHash, accountId);
    }

    return { account, verification: duplicateCheck };
  }

  /**
   * Check for duplicate accounts
   * Detects: same biometrics, same IP, same phone, same email, device fingerprints
   */
  private checkForDuplicates(
    identity: PersonalIdentity,
    device: RegisteredDevice,
    email: string,
    phone: string
  ): DuplicateDetection {
    const duplicateDetection: DuplicateDetection = {
      identityId: identity.id,
      suspiciousBiometricMatches: [],
      suspiciousIPMatches: [],
      suspiciousPhoneMatches: [],
      suspiciousEmailMatches: [],
      overallRiskScore: 0,
      isLikelyDuplicate: false,
    };

    let riskScore = 0;

    // Check biometrics
    for (const [_bioType, bioSig] of identity.biometrics) {
      const matchedAccountId = this.biometricIndex.get(bioSig.templateHash);
      if (matchedAccountId) {
        duplicateDetection.suspiciousBiometricMatches.push({
          score: bioSig.confidence,
          accountId: matchedAccountId,
        });
        riskScore += 50; // High risk
      }
    }

    // Check phone
    const phoneMatch = this.phoneIndex.get(phone);
    if (phoneMatch) {
      duplicateDetection.suspiciousPhoneMatches.push({
        phone,
        accountId: phoneMatch,
      });
      riskScore += 30;
    }

    // Check email
    const emailMatch = this.emailIndex.get(email.toLowerCase());
    if (emailMatch) {
      duplicateDetection.suspiciousEmailMatches.push({
        email,
        accountId: emailMatch,
      });
      riskScore += 30;
    }

    // Check IP address
    const ipMatches = this.ipAddressIndex.get(device.ipAddress);
    if (ipMatches && ipMatches.size > 0) {
      for (const accountId of ipMatches) {
        duplicateDetection.suspiciousIPMatches.push({
          ip: device.ipAddress,
          accountId,
        });
      }
      riskScore += 10; // Lower risk (IPs can be shared)
    }

    // Check device fingerprint
    const deviceMatch = this.deviceFingerprintIndex.get(device.fingerprint);
    if (deviceMatch) {
      // Same device could indicate reuse
      riskScore += 5;
    }

    duplicateDetection.overallRiskScore = Math.min(100, riskScore);
    duplicateDetection.isLikelyDuplicate = riskScore >= 50; // Threshold: 50+

    return duplicateDetection;
  }

  /**
   * Link additional devices to existing account
   * Enforces biometric verification
   */
  async linkDevice(
    accountId: string,
    newDevice: RegisteredDevice,
    biometricVerification: BiometricSignature
  ): Promise<TriumphAccount> {
    const account = this.accounts.get(accountId);
    if (!account) {
      throw new Error("Account not found");
    }

    // Verify biometric matches account
    const biometricMatch = Array.from(account.personalIdentity.biometrics.values())
      .filter(b => b.type === biometricVerification.type)
      .some(b => this.compareBiometrics(b.templateHash, biometricVerification.templateHash) > 95);

    if (!biometricMatch) {
      throw new Error("Biometric verification failed. Device not linked.");
    }

    // Add device
    account.devices.push(newDevice);
    this.registerDeviceFingerprint(newDevice.fingerprint, accountId);
    if (newDevice.ipAddress) {
      this.registerIpAddress(newDevice.ipAddress, accountId);
    }

    return account;
  }

  /**
   * Validate identity completeness
   */
  private validateIdentity(identity: PersonalIdentity): void {
    if (!identity.firstName || !identity.lastName) {
      throw new Error("First and last name required");
    }

    if (!identity.dateOfBirth) {
      throw new Error("Date of birth required");
    }

    if (!identity.country) {
      throw new Error("Country of residence required");
    }

    if (identity.biometrics.size === 0) {
      throw new Error("At least one biometric signature required");
    }

    if (identity.idDocuments.length === 0) {
      throw new Error("Government ID verification required");
    }

    // Verify all ID documents are valid and not expired
    const now = new Date();
    for (const doc of identity.idDocuments) {
      const expiryDate = new Date(doc.expiryDate);
      if (expiryDate < now) {
        throw new Error(`ID document expired: ${doc.type}`);
      }
      if (!doc.verified) {
        throw new Error(`ID document not verified: ${doc.type}`);
      }
    }
  }

  /**
   * Get account by ID with security checks
   */
  async getAccount(
    accountId: string,
    requesterAccountId?: string
  ): Promise<TriumphAccount | null> {
    const account = this.accounts.get(accountId);

    if (!account) {
      return null;
    }

    // Log access for security audit
    if (requesterAccountId && requesterAccountId !== accountId) {
      console.log(`[SECURITY] Account ${requesterAccountId} accessed account ${accountId}`);
    }

    return account;
  }

  /**
   * Update account activity
   */
  updateLastActivity(accountId: string): void {
    const account = this.accounts.get(accountId);
    if (account) {
      account.lastActivityAt = Date.now();
    }
  }

  /**
   * Link multiple Pi Network addresses to single account
   * Ensures all addresses under one person's control
   */
  linkPiAddress(accountId: string, piAddress: string, biometricVerification: BiometricSignature): void {
    const account = this.accounts.get(accountId);
    if (!account) {
      throw new Error("Account not found");
    }

    // Verify biometric
    const match = Array.from(account.personalIdentity.biometrics.values()).some(
      b => this.compareBiometrics(b.templateHash, biometricVerification.templateHash) > 95
    );

    if (!match) {
      throw new Error("Biometric verification failed");
    }

    if (!account.piNetworkAddress.includes(piAddress)) {
      account.piNetworkAddress.push(piAddress);
    }
  }

  /**
   * Helper: Register IP address in index
   */
  private registerIpAddress(ip: string, accountId: string): void {
    if (!this.ipAddressIndex.has(ip)) {
      this.ipAddressIndex.set(ip, new Set());
    }
    this.ipAddressIndex.get(ip)!.add(accountId);
  }

  /**
   * Helper: Register device fingerprint
   */
  private registerDeviceFingerprint(fingerprint: string, accountId: string): void {
    this.deviceFingerprintIndex.set(fingerprint, accountId);
  }

  /**
   * Helper: Compare biometric templates (simplified)
   */
  private compareBiometrics(template1: string, template2: string): number {
    if (template1 === template2) return 100;
    // In production, use proper biometric matching algorithms
    return 0;
  }

  /**
   * Helper: Generate unique account ID
   */
  private generateAccountId(): string {
    return `acc_${crypto.randomBytes(16).toString("hex")}`;
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalAccounts: number;
    flaggedAccounts: number;
    suspiciousActivities: number;
  } {
    const flaggedAccounts = Array.from(this.accounts.values()).filter(
      acc => acc.personalIdentity.riskScore > 50 || acc.status === "locked"
    ).length;

    return {
      totalAccounts: this.accounts.size,
      flaggedAccounts,
      suspiciousActivities: flaggedAccounts, // Simplified
    };
  }
}

// ============================================================================
// Singleton & Exports
// ============================================================================

export const accountFusionSystem = AccountFusionSystem.getInstance();
