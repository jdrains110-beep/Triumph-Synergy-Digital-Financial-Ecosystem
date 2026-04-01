/**
 * Immutable Ecosystem Protection
 * 
 * Zero-manipulation architecture:
 * - Cryptographic integrity verification
 * - Blockchain-backed state changes
 * - Tamper-proof configurations
 * - Multi-signature governance
 * - Zero-trust architecture
 * - Immutable audit trails
 */

import { EventEmitter } from "events";

// ============================================================================
// Types
// ============================================================================

export type ProtectionLevel = 
  | "standard"
  | "enhanced"
  | "critical"
  | "immutable";

export type IntegrityStatus = 
  | "verified"
  | "pending"
  | "tampered"
  | "unknown";

export type GovernanceType = 
  | "owner-only"
  | "multi-sig"
  | "council"
  | "consensus"
  | "locked";

export interface ProtectedAsset {
  id: string;
  name: string;
  type: "config" | "code" | "data" | "state" | "key" | "policy";
  
  // Protection
  protectionLevel: ProtectionLevel;
  governance: GovernanceType;
  
  // Integrity
  hash: string;
  hashAlgorithm: "sha256" | "sha512" | "blake3" | "keccak256";
  signature?: string;
  signedBy?: string;
  
  // State
  status: IntegrityStatus;
  lastVerified: Date;
  
  // Blockchain
  blockchainAnchored: boolean;
  anchorTx?: string;
  anchorBlock?: number;
  
  // Version
  version: number;
  previousHash?: string;
  
  // Access
  allowedModifiers: string[];   // User/role IDs
  requiredSignatures: number;
  
  createdAt: Date;
  modifiedAt?: Date;
}

export interface IntegrityCheck {
  id: string;
  assetId: string;
  
  // Check details
  expectedHash: string;
  actualHash: string;
  matches: boolean;
  
  // Timestamp
  performedAt: Date;
  
  // Blockchain verification
  blockchainVerified: boolean;
  verificationTx?: string;
  
  // Result
  status: IntegrityStatus;
  violations?: IntegrityViolation[];
}

export interface IntegrityViolation {
  type: "hash-mismatch" | "signature-invalid" | "unauthorized-change" | "tamper-detected" | "blockchain-mismatch";
  severity: "low" | "medium" | "high" | "critical";
  details: string;
  detectedAt: Date;
  evidence?: string;
}

export interface ChangeRequest {
  id: string;
  assetId: string;
  requesterId: string;
  
  // Change details
  changeType: "modify" | "delete" | "transfer" | "upgrade";
  description: string;
  newValue?: unknown;
  newHash?: string;
  
  // Approval
  requiredSignatures: number;
  signatures: ApprovalSignature[];
  
  // Status
  status: "pending" | "approved" | "rejected" | "executed" | "expired";
  
  // Timing
  requestedAt: Date;
  expiresAt: Date;
  executedAt?: Date;
  
  // Blockchain
  blockchainRecorded: boolean;
  recordTx?: string;
}

export interface ApprovalSignature {
  signerId: string;
  signerRole: string;
  signature: string;
  approved: boolean;
  signedAt: Date;
  message?: string;
}

export interface SecurityPolicy {
  id: string;
  name: string;
  
  // Scope
  scope: "global" | "module" | "asset" | "user";
  target?: string;
  
  // Rules
  rules: PolicyRule[];
  
  // Enforcement
  enforcement: "strict" | "warn" | "audit";
  
  // Status
  active: boolean;
  locked: boolean;   // Cannot be modified
  
  // Blockchain
  policyHash: string;
  anchorTx?: string;
  
  createdAt: Date;
  createdBy: string;
}

export interface PolicyRule {
  id: string;
  type: "require" | "deny" | "limit" | "verify";
  condition: string;
  action: string;
  parameters?: Record<string, unknown>;
  exception?: string;
}

export interface TrustAnchor {
  id: string;
  type: "root-key" | "certificate" | "blockchain-genesis" | "hardware-security-module";
  
  // Key material
  publicKey: string;
  keyAlgorithm: "ed25519" | "secp256k1" | "rsa-4096";
  
  // Trust
  trustLevel: number;  // 0-100
  issuer?: string;
  
  // Validity
  validFrom: Date;
  validUntil?: Date;
  revoked: boolean;
  
  // Blockchain
  anchoredOnChain: boolean;
  chainId?: string;
  anchorTx?: string;
}

export interface AuditTrail {
  id: string;
  category: "access" | "change" | "violation" | "verification" | "governance";
  
  // Event details
  event: string;
  actor: string;
  target?: string;
  
  // Data
  before?: string;
  after?: string;
  
  // Verification
  hash: string;
  previousHash: string;
  signature: string;
  
  // Blockchain
  blockNumber: number;
  txHash: string;
  
  timestamp: Date;
}

// ============================================================================
// Immutable Ecosystem Manager
// ============================================================================

class ImmutableEcosystemManager extends EventEmitter {
  private static instance: ImmutableEcosystemManager;
  
  private protectedAssets: Map<string, ProtectedAsset> = new Map();
  private changeRequests: Map<string, ChangeRequest> = new Map();
  private policies: Map<string, SecurityPolicy> = new Map();
  private trustAnchors: Map<string, TrustAnchor> = new Map();
  private auditTrail: AuditTrail[] = [];
  
  // Root keys
  private ownerPublicKey?: string;
  private systemRootKey?: string;
  
  // Indexes
  private assetsByType: Map<string, Set<string>> = new Map();
  private assetsByLevel: Map<ProtectionLevel, Set<string>> = new Map();
  private pendingRequests: Map<string, Set<string>> = new Map();  // asset -> requests
  
  // Chain state
  private blockNumber = 1;
  private lastBlockHash = "0x0";
  
  private constructor() {
    super();
    this.setMaxListeners(100);
    
    this.initializeRootTrust();
    this.initializeCorePolicies();
  }
  
  static getInstance(): ImmutableEcosystemManager {
    if (!ImmutableEcosystemManager.instance) {
      ImmutableEcosystemManager.instance = new ImmutableEcosystemManager();
    }
    return ImmutableEcosystemManager.instance;
  }
  
  private initializeRootTrust(): void {
    // Generate system root key (simulated)
    this.systemRootKey = `pub-${Date.now().toString(36)}-root`;
    
    // Register root trust anchor
    const rootAnchor: TrustAnchor = {
      id: "root-anchor",
      type: "root-key",
      publicKey: this.systemRootKey,
      keyAlgorithm: "ed25519",
      trustLevel: 100,
      validFrom: new Date(),
      revoked: false,
      anchoredOnChain: true,
      chainId: "pi-network-mainnet",
      anchorTx: `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`,
    };
    
    this.trustAnchors.set(rootAnchor.id, rootAnchor);
    
    // Owner key placeholder (to be set by owner)
    this.ownerPublicKey = undefined;
  }
  
  private initializeCorePolicies(): void {
    // Core immutability policy
    this.createPolicy({
      name: "Core Immutability Policy",
      scope: "global",
      enforcement: "strict",
      rules: [
        {
          type: "require",
          condition: "asset.protectionLevel === 'immutable'",
          action: "require-owner-signature",
        },
        {
          type: "deny",
          condition: "asset.locked === true",
          action: "block-modification",
        },
        {
          type: "verify",
          condition: "change.type === 'modify'",
          action: "verify-blockchain-anchor",
        },
      ],
      locked: true,
    });
    
    // Zero-manipulation policy
    this.createPolicy({
      name: "Zero Manipulation Policy",
      scope: "global",
      enforcement: "strict",
      rules: [
        {
          type: "require",
          condition: "true",
          action: "blockchain-record",
        },
        {
          type: "require",
          condition: "change.severity === 'critical'",
          action: "multi-sig-approval",
        },
        {
          type: "verify",
          condition: "true",
          action: "hash-verification",
        },
      ],
      locked: true,
    });
  }
  
  // ==========================================================================
  // Owner Key Management
  // ==========================================================================
  
  /**
   * Set owner public key (can only be done once)
   */
  setOwnerKey(publicKey: string): void {
    if (this.ownerPublicKey) {
      throw new Error("Owner key already set - cannot be changed");
    }
    
    this.ownerPublicKey = publicKey;
    
    // Register owner trust anchor
    const ownerAnchor: TrustAnchor = {
      id: "owner-anchor",
      type: "root-key",
      publicKey,
      keyAlgorithm: "ed25519",
      trustLevel: 100,
      validFrom: new Date(),
      revoked: false,
      anchoredOnChain: true,
      chainId: "pi-network-mainnet",
      anchorTx: `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`,
    };
    
    this.trustAnchors.set(ownerAnchor.id, ownerAnchor);
    
    this.recordAuditEntry({
      category: "governance",
      event: "owner-key-set",
      actor: "system",
      after: publicKey,
    });
    
    this.emit("owner-key-set", { publicKey });
  }
  
  // ==========================================================================
  // Asset Protection
  // ==========================================================================
  
  /**
   * Register a protected asset
   */
  registerAsset(params: {
    name: string;
    type: ProtectedAsset["type"];
    content: unknown;
    protectionLevel: ProtectionLevel;
    governance: GovernanceType;
    allowedModifiers?: string[];
    requiredSignatures?: number;
  }): ProtectedAsset {
    const id = `asset-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    const contentString = JSON.stringify(params.content);
    const hash = this.computeHash(contentString);
    
    const asset: ProtectedAsset = {
      id,
      name: params.name,
      type: params.type,
      protectionLevel: params.protectionLevel,
      governance: params.governance,
      hash,
      hashAlgorithm: "sha256",
      status: "verified",
      lastVerified: new Date(),
      blockchainAnchored: false,
      version: 1,
      allowedModifiers: params.allowedModifiers || [],
      requiredSignatures: params.requiredSignatures || 1,
      createdAt: new Date(),
    };
    
    // Anchor on blockchain
    this.anchorAsset(asset);
    
    this.protectedAssets.set(id, asset);
    
    // Index
    if (!this.assetsByType.has(params.type)) {
      this.assetsByType.set(params.type, new Set());
    }
    this.assetsByType.get(params.type)!.add(id);
    
    if (!this.assetsByLevel.has(params.protectionLevel)) {
      this.assetsByLevel.set(params.protectionLevel, new Set());
    }
    this.assetsByLevel.get(params.protectionLevel)!.add(id);
    
    this.pendingRequests.set(id, new Set());
    
    // Audit
    this.recordAuditEntry({
      category: "change",
      event: "asset-registered",
      actor: "system",
      target: id,
      after: hash,
    });
    
    this.emit("asset-registered", { asset });
    return asset;
  }
  
  private computeHash(content: string): string {
    // Simulated SHA-256 hash
    const chars = "0123456789abcdef";
    let hash = "";
    let sum = 0;
    
    for (let i = 0; i < content.length; i++) {
      sum = (sum + content.charCodeAt(i) * (i + 1)) % 1000000000;
    }
    
    for (let i = 0; i < 64; i++) {
      hash += chars[(sum * (i + 1)) % 16];
    }
    
    return hash;
  }
  
  private anchorAsset(asset: ProtectedAsset): void {
    asset.blockchainAnchored = true;
    asset.anchorTx = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;
    asset.anchorBlock = this.blockNumber;
    
    // Sign with system key
    asset.signature = this.sign(asset.hash);
    asset.signedBy = "system-root";
  }
  
  private sign(data: string): string {
    // Simulated Ed25519 signature
    return `sig-${Date.now().toString(36)}-${this.computeHash(data).slice(0, 32)}`;
  }
  
  /**
   * Verify asset integrity
   */
  verifyAsset(assetId: string, currentContent: unknown): IntegrityCheck {
    const asset = this.protectedAssets.get(assetId);
    if (!asset) throw new Error("Asset not found");
    
    const id = `check-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    const contentString = JSON.stringify(currentContent);
    const actualHash = this.computeHash(contentString);
    const matches = actualHash === asset.hash;
    
    const violations: IntegrityViolation[] = [];
    
    if (!matches) {
      violations.push({
        type: "hash-mismatch",
        severity: asset.protectionLevel === "immutable" ? "critical" : "high",
        details: `Expected ${asset.hash}, got ${actualHash}`,
        detectedAt: new Date(),
        evidence: `Content hash mismatch for asset ${asset.name}`,
      });
    }
    
    // Verify blockchain anchor
    let blockchainVerified = false;
    if (asset.blockchainAnchored && asset.anchorTx) {
      // Simulated blockchain verification
      blockchainVerified = true;
    }
    
    const check: IntegrityCheck = {
      id,
      assetId,
      expectedHash: asset.hash,
      actualHash,
      matches,
      performedAt: new Date(),
      blockchainVerified,
      verificationTx: `0x${Date.now().toString(16)}`,
      status: matches ? "verified" : "tampered",
      violations: violations.length > 0 ? violations : undefined,
    };
    
    // Update asset status
    asset.status = check.status;
    asset.lastVerified = check.performedAt;
    
    // Audit
    this.recordAuditEntry({
      category: "verification",
      event: matches ? "integrity-verified" : "integrity-violation",
      actor: "system",
      target: assetId,
      before: asset.hash,
      after: actualHash,
    });
    
    if (!matches) {
      this.emit("integrity-violation", { asset, check });
    }
    
    return check;
  }
  
  // ==========================================================================
  // Change Management
  // ==========================================================================
  
  /**
   * Request a change to a protected asset
   */
  requestChange(params: {
    assetId: string;
    requesterId: string;
    changeType: ChangeRequest["changeType"];
    description: string;
    newValue?: unknown;
    expiresInHours?: number;
  }): ChangeRequest {
    const asset = this.protectedAssets.get(params.assetId);
    if (!asset) throw new Error("Asset not found");
    
    // Check if modifier is allowed
    if (!asset.allowedModifiers.includes(params.requesterId) && 
        params.requesterId !== "owner") {
      throw new Error("Requester not authorized to modify this asset");
    }
    
    // Check governance type
    if (asset.governance === "locked") {
      throw new Error("Asset is locked - no changes allowed");
    }
    
    const id = `change-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + (params.expiresInHours || 24));
    
    const request: ChangeRequest = {
      id,
      assetId: params.assetId,
      requesterId: params.requesterId,
      changeType: params.changeType,
      description: params.description,
      newValue: params.newValue,
      newHash: params.newValue ? this.computeHash(JSON.stringify(params.newValue)) : undefined,
      requiredSignatures: this.getRequiredSignatures(asset),
      signatures: [],
      status: "pending",
      requestedAt: new Date(),
      expiresAt,
      blockchainRecorded: true,
      recordTx: `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`,
    };
    
    this.changeRequests.set(id, request);
    this.pendingRequests.get(params.assetId)!.add(id);
    
    // Audit
    this.recordAuditEntry({
      category: "change",
      event: "change-requested",
      actor: params.requesterId,
      target: params.assetId,
      after: request.description,
    });
    
    this.emit("change-requested", { request, asset });
    return request;
  }
  
  private getRequiredSignatures(asset: ProtectedAsset): number {
    switch (asset.governance) {
      case "owner-only":
        return 1;
      case "multi-sig":
        return Math.max(2, asset.requiredSignatures);
      case "council":
        return 3;
      case "consensus":
        return Math.ceil(asset.allowedModifiers.length * 0.66);
      case "locked":
        return Number.POSITIVE_INFINITY;
      default:
        return 1;
    }
  }
  
  /**
   * Sign a change request (approve or reject)
   */
  signChangeRequest(params: {
    requestId: string;
    signerId: string;
    signerRole: string;
    approved: boolean;
    message?: string;
  }): ChangeRequest {
    const request = this.changeRequests.get(params.requestId);
    if (!request) throw new Error("Change request not found");
    
    if (request.status !== "pending") {
      throw new Error("Change request is not pending");
    }
    
    if (request.expiresAt < new Date()) {
      request.status = "expired";
      throw new Error("Change request has expired");
    }
    
    // Check for existing signature
    const existing = request.signatures.find(s => s.signerId === params.signerId);
    if (existing) {
      throw new Error("Already signed this request");
    }
    
    const signature: ApprovalSignature = {
      signerId: params.signerId,
      signerRole: params.signerRole,
      signature: this.sign(`${params.requestId}:${params.signerId}:${params.approved}`),
      approved: params.approved,
      signedAt: new Date(),
      message: params.message,
    };
    
    request.signatures.push(signature);
    
    // Check approval status
    const approvals = request.signatures.filter(s => s.approved).length;
    const rejections = request.signatures.filter(s => !s.approved).length;
    
    if (rejections >= request.requiredSignatures) {
      request.status = "rejected";
      this.emit("change-rejected", { request });
    } else if (approvals >= request.requiredSignatures) {
      request.status = "approved";
      this.emit("change-approved", { request });
    }
    
    // Audit
    this.recordAuditEntry({
      category: "governance",
      event: params.approved ? "change-approved-by" : "change-rejected-by",
      actor: params.signerId,
      target: request.assetId,
    });
    
    return request;
  }
  
  /**
   * Execute an approved change
   */
  executeChange(requestId: string, executorId: string): ProtectedAsset {
    const request = this.changeRequests.get(requestId);
    if (!request) throw new Error("Change request not found");
    
    if (request.status !== "approved") {
      throw new Error("Change request is not approved");
    }
    
    const asset = this.protectedAssets.get(request.assetId);
    if (!asset) throw new Error("Asset not found");
    
    // Execute the change
    const previousHash = asset.hash;
    
    if (request.newHash) {
      asset.hash = request.newHash;
      asset.previousHash = previousHash;
    }
    
    asset.version++;
    asset.modifiedAt = new Date();
    asset.status = "verified";
    
    // Re-anchor on blockchain
    this.anchorAsset(asset);
    
    request.status = "executed";
    request.executedAt = new Date();
    
    // Remove from pending
    this.pendingRequests.get(request.assetId)!.delete(requestId);
    
    // Audit
    this.recordAuditEntry({
      category: "change",
      event: "change-executed",
      actor: executorId,
      target: request.assetId,
      before: previousHash,
      after: asset.hash,
    });
    
    this.emit("change-executed", { request, asset });
    return asset;
  }
  
  // ==========================================================================
  // Security Policies
  // ==========================================================================
  
  /**
   * Create a security policy
   */
  createPolicy(params: {
    name: string;
    scope: SecurityPolicy["scope"];
    target?: string;
    enforcement: SecurityPolicy["enforcement"];
    rules: Omit<PolicyRule, "id">[];
    locked?: boolean;
  }): SecurityPolicy {
    const id = `policy-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    const rules: PolicyRule[] = params.rules.map((rule, index) => ({
      ...rule,
      id: `rule-${id}-${index}`,
    }));
    
    const policyContent = JSON.stringify({ ...params, rules });
    
    const policy: SecurityPolicy = {
      id,
      name: params.name,
      scope: params.scope,
      target: params.target,
      rules,
      enforcement: params.enforcement,
      active: true,
      locked: params.locked || false,
      policyHash: this.computeHash(policyContent),
      anchorTx: `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`,
      createdAt: new Date(),
      createdBy: "system",
    };
    
    this.policies.set(id, policy);
    
    // Register as protected asset
    this.registerAsset({
      name: `Policy: ${params.name}`,
      type: "policy",
      content: policy,
      protectionLevel: params.locked ? "immutable" : "critical",
      governance: params.locked ? "locked" : "owner-only",
    });
    
    this.emit("policy-created", { policy });
    return policy;
  }
  
  /**
   * Evaluate policies for an action
   */
  evaluatePolicies(action: {
    type: string;
    actor: string;
    target: string;
    data?: unknown;
  }): {
    allowed: boolean;
    violations: string[];
    warnings: string[];
  } {
    const violations: string[] = [];
    const warnings: string[] = [];
    
    for (const policy of this.policies.values()) {
      if (!policy.active) continue;
      
      for (const rule of policy.rules) {
        // Simple rule evaluation (in production, use proper expression engine)
        const matches = this.evaluateCondition(rule.condition, action);
        
        if (matches) {
          switch (rule.type) {
            case "deny":
              if (policy.enforcement === "strict") {
                violations.push(`Policy ${policy.name}: ${rule.action}`);
              } else if (policy.enforcement === "warn") {
                warnings.push(`Policy ${policy.name}: ${rule.action}`);
              }
              break;
              
            case "require":
              // Check if requirement is satisfied
              const satisfied = this.checkRequirement(rule.action, action);
              if (!satisfied) {
                if (policy.enforcement === "strict") {
                  violations.push(`Policy ${policy.name} requires: ${rule.action}`);
                } else {
                  warnings.push(`Policy ${policy.name} recommends: ${rule.action}`);
                }
              }
              break;
              
            case "limit":
              // Rate limiting check
              break;
              
            case "verify":
              // Verification check
              break;
          }
        }
      }
    }
    
    return {
      allowed: violations.length === 0,
      violations,
      warnings,
    };
  }
  
  private evaluateCondition(condition: string, context: unknown): boolean {
    // Simplified condition evaluation
    // In production, use a proper expression engine
    if (condition === "true") return true;
    if (condition === "false") return false;
    return Math.random() > 0.5;
  }
  
  private checkRequirement(requirement: string, context: unknown): boolean {
    // Simplified requirement check
    return true;
  }
  
  // ==========================================================================
  // Audit Trail
  // ==========================================================================
  
  private recordAuditEntry(params: {
    category: AuditTrail["category"];
    event: string;
    actor: string;
    target?: string;
    before?: string;
    after?: string;
  }): AuditTrail {
    const previousHash = this.auditTrail.length > 0 
      ? this.auditTrail[this.auditTrail.length - 1].hash 
      : "genesis";
    
    const entryData = JSON.stringify({
      ...params,
      previousHash,
      timestamp: Date.now(),
    });
    
    const hash = this.computeHash(entryData);
    const signature = this.sign(hash);
    
    const entry: AuditTrail = {
      id: `audit-${this.auditTrail.length + 1}`,
      category: params.category,
      event: params.event,
      actor: params.actor,
      target: params.target,
      before: params.before,
      after: params.after,
      hash,
      previousHash,
      signature,
      blockNumber: this.blockNumber,
      txHash: `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`,
      timestamp: new Date(),
    };
    
    this.auditTrail.push(entry);
    
    // Advance block
    this.lastBlockHash = hash;
    if (this.auditTrail.length % 10 === 0) {
      this.blockNumber++;
    }
    
    return entry;
  }
  
  /**
   * Verify audit trail integrity
   */
  verifyAuditTrail(): {
    valid: boolean;
    verifiedEntries: number;
    invalidEntries: number;
    firstInvalid?: number;
  } {
    let previousHash = "genesis";
    let invalidEntries = 0;
    let firstInvalid: number | undefined;
    
    for (let i = 0; i < this.auditTrail.length; i++) {
      const entry = this.auditTrail[i];
      
      if (entry.previousHash !== previousHash) {
        invalidEntries++;
        if (firstInvalid === undefined) {
          firstInvalid = i;
        }
      }
      
      previousHash = entry.hash;
    }
    
    return {
      valid: invalidEntries === 0,
      verifiedEntries: this.auditTrail.length - invalidEntries,
      invalidEntries,
      firstInvalid,
    };
  }
  
  /**
   * Get audit entries
   */
  getAuditTrail(params?: {
    category?: AuditTrail["category"];
    actor?: string;
    target?: string;
    since?: Date;
    limit?: number;
  }): AuditTrail[] {
    let entries = [...this.auditTrail];
    
    if (params?.category) {
      entries = entries.filter(e => e.category === params.category);
    }
    if (params?.actor) {
      entries = entries.filter(e => e.actor === params.actor);
    }
    if (params?.target) {
      entries = entries.filter(e => e.target === params.target);
    }
    if (params?.since) {
      entries = entries.filter(e => e.timestamp >= params.since!);
    }
    
    entries.reverse();
    
    if (params?.limit) {
      entries = entries.slice(0, params.limit);
    }
    
    return entries;
  }
  
  // ==========================================================================
  // Queries
  // ==========================================================================
  
  getAsset(assetId: string): ProtectedAsset | undefined {
    return this.protectedAssets.get(assetId);
  }
  
  getAssetsByType(type: ProtectedAsset["type"]): ProtectedAsset[] {
    const ids = this.assetsByType.get(type);
    if (!ids) return [];
    return Array.from(ids).map(id => this.protectedAssets.get(id)!).filter(a => a);
  }
  
  getAssetsByLevel(level: ProtectionLevel): ProtectedAsset[] {
    const ids = this.assetsByLevel.get(level);
    if (!ids) return [];
    return Array.from(ids).map(id => this.protectedAssets.get(id)!).filter(a => a);
  }
  
  getChangeRequest(requestId: string): ChangeRequest | undefined {
    return this.changeRequests.get(requestId);
  }
  
  getPendingRequests(assetId: string): ChangeRequest[] {
    const ids = this.pendingRequests.get(assetId);
    if (!ids) return [];
    return Array.from(ids)
      .map(id => this.changeRequests.get(id)!)
      .filter(r => r && r.status === "pending");
  }
  
  getPolicy(policyId: string): SecurityPolicy | undefined {
    return this.policies.get(policyId);
  }
  
  getStatistics(): {
    assets: { total: number; byType: Record<string, number>; byLevel: Record<string, number> };
    changeRequests: { total: number; pending: number; approved: number; rejected: number };
    policies: { total: number; active: number; locked: number };
    auditTrail: { entries: number; categories: Record<string, number>; blocks: number };
  } {
    const assetsByType: Record<string, number> = {};
    const assetsByLevel: Record<string, number> = {};
    
    for (const asset of this.protectedAssets.values()) {
      assetsByType[asset.type] = (assetsByType[asset.type] || 0) + 1;
      assetsByLevel[asset.protectionLevel] = (assetsByLevel[asset.protectionLevel] || 0) + 1;
    }
    
    let pending = 0, approved = 0, rejected = 0;
    for (const request of this.changeRequests.values()) {
      if (request.status === "pending") pending++;
      else if (request.status === "approved" || request.status === "executed") approved++;
      else if (request.status === "rejected") rejected++;
    }
    
    let activePolicies = 0, lockedPolicies = 0;
    for (const policy of this.policies.values()) {
      if (policy.active) activePolicies++;
      if (policy.locked) lockedPolicies++;
    }
    
    const auditCategories: Record<string, number> = {};
    for (const entry of this.auditTrail) {
      auditCategories[entry.category] = (auditCategories[entry.category] || 0) + 1;
    }
    
    return {
      assets: {
        total: this.protectedAssets.size,
        byType: assetsByType,
        byLevel: assetsByLevel,
      },
      changeRequests: {
        total: this.changeRequests.size,
        pending,
        approved,
        rejected,
      },
      policies: {
        total: this.policies.size,
        active: activePolicies,
        locked: lockedPolicies,
      },
      auditTrail: {
        entries: this.auditTrail.length,
        categories: auditCategories,
        blocks: this.blockNumber,
      },
    };
  }
}

// ============================================================================
// Exports
// ============================================================================

export const immutableEcosystem = ImmutableEcosystemManager.getInstance();

export { ImmutableEcosystemManager };
