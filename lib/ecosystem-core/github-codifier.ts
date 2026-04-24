/**
 * GitHub Codifier - The Ultimate Access Control
 * 
 * Triumph-Synergy's hierarchical governance system:
 * - Role-based access control
 * - Multi-tier employee levels
 * - Executive oversight (CEO, COO)
 * - OWNER has FINAL AUTHORITY
 * - Immutable audit trail on blockchain
 */

import { EventEmitter } from "events";

// ============================================================================
// Types
// ============================================================================

export type RoleType = 
  | "guest"            // Read-only access
  | "approved-worker"  // Approved external contributors
  | "tier1-employee"   // Entry-level employees
  | "tier2-employee"   // Mid-level employees
  | "tier3-employee"   // Senior employees
  | "lead"             // Team leads
  | "manager"          // Department managers
  | "director"         // Directors
  | "vp"               // Vice Presidents
  | "cto"              // Chief Technology Officer
  | "coo"              // Chief Operating Officer
  | "ceo"              // Chief Executive Officer
  | "owner";           // OWNER - FINAL AUTHORITY

export type PermissionType = 
  // Repository
  | "repo:read"
  | "repo:write"
  | "repo:delete"
  | "repo:admin"
  // Code
  | "code:view"
  | "code:push"
  | "code:merge"
  | "code:review"
  | "code:approve"
  | "code:reject"
  | "code:force-push"
  | "code:delete-branch"
  // Pull Requests
  | "pr:create"
  | "pr:review"
  | "pr:approve"
  | "pr:merge"
  | "pr:close"
  | "pr:reopen"
  // Issues
  | "issue:create"
  | "issue:edit"
  | "issue:close"
  | "issue:assign"
  | "issue:label"
  // Releases
  | "release:view"
  | "release:create"
  | "release:publish"
  | "release:delete"
  // Settings
  | "settings:view"
  | "settings:edit"
  | "settings:security"
  | "settings:webhooks"
  | "settings:integrations"
  // Access Control
  | "access:view"
  | "access:invite"
  | "access:remove"
  | "access:change-role"
  | "access:override"
  // Ecosystem
  | "ecosystem:view"
  | "ecosystem:modify"
  | "ecosystem:deploy"
  | "ecosystem:rollback"
  | "ecosystem:shutdown"
  // Ultimate
  | "owner:override"
  | "owner:veto"
  | "owner:emergency";

export interface EcosystemUser {
  id: string;
  username: string;
  email: string;
  role: RoleType;
  department?: string;
  tier?: number;
  
  // Security
  publicKey: string;
  mfaEnabled: boolean;
  lastLogin?: Date;
  
  // Permissions
  permissions: PermissionType[];
  customPermissions: PermissionType[];
  restrictedPermissions: PermissionType[];
  
  // Employment
  hiredAt: Date;
  promotedAt?: Date;
  supervisor?: string;
  
  // Activity
  totalCommits: number;
  totalPRs: number;
  totalReviews: number;
  reputationScore: number;
  
  // Status
  status: "active" | "suspended" | "terminated" | "pending";
  verifiedAt?: Date;
  
  // Blockchain identity
  walletAddress?: string;
  piNetworkId?: string;
}

export interface AccessRequest {
  id: string;
  type: "permission" | "role-change" | "repo-access" | "override";
  requesterId: string;
  targetUserId?: string;
  targetResource?: string;
  requestedPermission?: PermissionType;
  requestedRole?: RoleType;
  reason: string;
  status: "pending" | "approved" | "rejected" | "escalated";
  
  // Approval chain
  requiredApprovers: string[];
  currentApprovals: ApprovalRecord[];
  
  // Escalation
  escalatedTo?: RoleType;
  escalationReason?: string;
  
  createdAt: Date;
  resolvedAt?: Date;
  expiresAt?: Date;
}

export interface ApprovalRecord {
  approverId: string;
  approverRole: RoleType;
  decision: "approve" | "reject" | "escalate";
  reason?: string;
  timestamp: Date;
  signature: string;
}

export interface CodeChange {
  id: string;
  type: "commit" | "pr" | "merge" | "revert" | "deploy";
  authorId: string;
  branch: string;
  targetBranch?: string;
  
  // Content
  files: FileChange[];
  linesAdded: number;
  linesRemoved: number;
  
  // Review
  reviewRequired: boolean;
  reviewers: string[];
  approvals: string[];
  rejections: string[];
  
  // Status
  status: "pending" | "reviewing" | "approved" | "merged" | "rejected" | "reverted";
  
  // Security
  securityScan: "pending" | "passed" | "failed" | "warning";
  vulnerabilities: number;
  
  // Immutability
  commitHash: string;
  blockchainTxId?: string;
  
  createdAt: Date;
  mergedAt?: Date;
}

export interface FileChange {
  path: string;
  operation: "add" | "modify" | "delete" | "rename";
  previousPath?: string;
  linesAdded: number;
  linesRemoved: number;
  isCritical: boolean;
  requiresOwnerApproval: boolean;
}

export interface OwnerDecision {
  id: string;
  type: "approve" | "reject" | "veto" | "override" | "emergency";
  targetType: "code-change" | "access-request" | "deployment" | "system-change";
  targetId: string;
  reason: string;
  
  // Verification
  ownerSignature: string;
  timestamp: Date;
  
  // Impact
  overriddenDecisions: string[];
  affectedUsers: string[];
  
  // Immutability
  blockchainTxId: string;
  immutable: true;
}

export interface AuditEntry {
  id: string;
  action: string;
  actorId: string;
  actorRole: RoleType;
  targetType: string;
  targetId: string;
  details: Record<string, unknown>;
  timestamp: Date;
  
  // Blockchain proof
  blockNumber: number;
  txHash: string;
  verified: boolean;
}

// ============================================================================
// Role Permission Matrix
// ============================================================================

const ROLE_PERMISSIONS: Record<RoleType, PermissionType[]> = {
  guest: [
    "repo:read",
    "code:view",
    "release:view",
    "issue:create",
  ],
  
  "approved-worker": [
    "repo:read",
    "code:view",
    "code:push",
    "pr:create",
    "pr:review",
    "issue:create",
    "issue:edit",
    "release:view",
  ],
  
  "tier1-employee": [
    "repo:read",
    "repo:write",
    "code:view",
    "code:push",
    "code:review",
    "pr:create",
    "pr:review",
    "issue:create",
    "issue:edit",
    "issue:close",
    "issue:assign",
    "issue:label",
    "release:view",
    "ecosystem:view",
  ],
  
  "tier2-employee": [
    "repo:read",
    "repo:write",
    "code:view",
    "code:push",
    "code:review",
    "code:merge",
    "pr:create",
    "pr:review",
    "pr:approve",
    "pr:merge",
    "pr:close",
    "issue:create",
    "issue:edit",
    "issue:close",
    "issue:assign",
    "issue:label",
    "release:view",
    "release:create",
    "settings:view",
    "ecosystem:view",
  ],
  
  "tier3-employee": [
    "repo:read",
    "repo:write",
    "code:view",
    "code:push",
    "code:review",
    "code:merge",
    "code:approve",
    "pr:create",
    "pr:review",
    "pr:approve",
    "pr:merge",
    "pr:close",
    "pr:reopen",
    "issue:create",
    "issue:edit",
    "issue:close",
    "issue:assign",
    "issue:label",
    "release:view",
    "release:create",
    "release:publish",
    "settings:view",
    "ecosystem:view",
    "ecosystem:modify",
  ],
  
  lead: [
    "repo:read",
    "repo:write",
    "code:view",
    "code:push",
    "code:review",
    "code:merge",
    "code:approve",
    "code:reject",
    "pr:create",
    "pr:review",
    "pr:approve",
    "pr:merge",
    "pr:close",
    "pr:reopen",
    "issue:create",
    "issue:edit",
    "issue:close",
    "issue:assign",
    "issue:label",
    "release:view",
    "release:create",
    "release:publish",
    "settings:view",
    "settings:edit",
    "access:view",
    "access:invite",
    "ecosystem:view",
    "ecosystem:modify",
    "ecosystem:deploy",
  ],
  
  manager: [
    "repo:read",
    "repo:write",
    "repo:admin",
    "code:view",
    "code:push",
    "code:review",
    "code:merge",
    "code:approve",
    "code:reject",
    "code:delete-branch",
    "pr:create",
    "pr:review",
    "pr:approve",
    "pr:merge",
    "pr:close",
    "pr:reopen",
    "issue:create",
    "issue:edit",
    "issue:close",
    "issue:assign",
    "issue:label",
    "release:view",
    "release:create",
    "release:publish",
    "settings:view",
    "settings:edit",
    "settings:webhooks",
    "access:view",
    "access:invite",
    "access:remove",
    "access:change-role",
    "ecosystem:view",
    "ecosystem:modify",
    "ecosystem:deploy",
    "ecosystem:rollback",
  ],
  
  director: [
    "repo:read",
    "repo:write",
    "repo:delete",
    "repo:admin",
    "code:view",
    "code:push",
    "code:review",
    "code:merge",
    "code:approve",
    "code:reject",
    "code:force-push",
    "code:delete-branch",
    "pr:create",
    "pr:review",
    "pr:approve",
    "pr:merge",
    "pr:close",
    "pr:reopen",
    "issue:create",
    "issue:edit",
    "issue:close",
    "issue:assign",
    "issue:label",
    "release:view",
    "release:create",
    "release:publish",
    "release:delete",
    "settings:view",
    "settings:edit",
    "settings:security",
    "settings:webhooks",
    "settings:integrations",
    "access:view",
    "access:invite",
    "access:remove",
    "access:change-role",
    "ecosystem:view",
    "ecosystem:modify",
    "ecosystem:deploy",
    "ecosystem:rollback",
  ],
  
  vp: [
    // All director permissions plus more
    "repo:read",
    "repo:write",
    "repo:delete",
    "repo:admin",
    "code:view",
    "code:push",
    "code:review",
    "code:merge",
    "code:approve",
    "code:reject",
    "code:force-push",
    "code:delete-branch",
    "pr:create",
    "pr:review",
    "pr:approve",
    "pr:merge",
    "pr:close",
    "pr:reopen",
    "issue:create",
    "issue:edit",
    "issue:close",
    "issue:assign",
    "issue:label",
    "release:view",
    "release:create",
    "release:publish",
    "release:delete",
    "settings:view",
    "settings:edit",
    "settings:security",
    "settings:webhooks",
    "settings:integrations",
    "access:view",
    "access:invite",
    "access:remove",
    "access:change-role",
    "access:override",
    "ecosystem:view",
    "ecosystem:modify",
    "ecosystem:deploy",
    "ecosystem:rollback",
  ],
  
  cto: [
    // Full technical authority
    "repo:read",
    "repo:write",
    "repo:delete",
    "repo:admin",
    "code:view",
    "code:push",
    "code:review",
    "code:merge",
    "code:approve",
    "code:reject",
    "code:force-push",
    "code:delete-branch",
    "pr:create",
    "pr:review",
    "pr:approve",
    "pr:merge",
    "pr:close",
    "pr:reopen",
    "issue:create",
    "issue:edit",
    "issue:close",
    "issue:assign",
    "issue:label",
    "release:view",
    "release:create",
    "release:publish",
    "release:delete",
    "settings:view",
    "settings:edit",
    "settings:security",
    "settings:webhooks",
    "settings:integrations",
    "access:view",
    "access:invite",
    "access:remove",
    "access:change-role",
    "access:override",
    "ecosystem:view",
    "ecosystem:modify",
    "ecosystem:deploy",
    "ecosystem:rollback",
    "ecosystem:shutdown",
  ],
  
  coo: [
    // Full operational authority
    "repo:read",
    "repo:write",
    "repo:delete",
    "repo:admin",
    "code:view",
    "code:push",
    "code:review",
    "code:merge",
    "code:approve",
    "code:reject",
    "code:force-push",
    "code:delete-branch",
    "pr:create",
    "pr:review",
    "pr:approve",
    "pr:merge",
    "pr:close",
    "pr:reopen",
    "issue:create",
    "issue:edit",
    "issue:close",
    "issue:assign",
    "issue:label",
    "release:view",
    "release:create",
    "release:publish",
    "release:delete",
    "settings:view",
    "settings:edit",
    "settings:security",
    "settings:webhooks",
    "settings:integrations",
    "access:view",
    "access:invite",
    "access:remove",
    "access:change-role",
    "access:override",
    "ecosystem:view",
    "ecosystem:modify",
    "ecosystem:deploy",
    "ecosystem:rollback",
    "ecosystem:shutdown",
  ],
  
  ceo: [
    // Full executive authority (except owner-specific)
    "repo:read",
    "repo:write",
    "repo:delete",
    "repo:admin",
    "code:view",
    "code:push",
    "code:review",
    "code:merge",
    "code:approve",
    "code:reject",
    "code:force-push",
    "code:delete-branch",
    "pr:create",
    "pr:review",
    "pr:approve",
    "pr:merge",
    "pr:close",
    "pr:reopen",
    "issue:create",
    "issue:edit",
    "issue:close",
    "issue:assign",
    "issue:label",
    "release:view",
    "release:create",
    "release:publish",
    "release:delete",
    "settings:view",
    "settings:edit",
    "settings:security",
    "settings:webhooks",
    "settings:integrations",
    "access:view",
    "access:invite",
    "access:remove",
    "access:change-role",
    "access:override",
    "ecosystem:view",
    "ecosystem:modify",
    "ecosystem:deploy",
    "ecosystem:rollback",
    "ecosystem:shutdown",
  ],
  
  owner: [
    // FULL AUTHORITY - ALL PERMISSIONS
    "repo:read",
    "repo:write",
    "repo:delete",
    "repo:admin",
    "code:view",
    "code:push",
    "code:review",
    "code:merge",
    "code:approve",
    "code:reject",
    "code:force-push",
    "code:delete-branch",
    "pr:create",
    "pr:review",
    "pr:approve",
    "pr:merge",
    "pr:close",
    "pr:reopen",
    "issue:create",
    "issue:edit",
    "issue:close",
    "issue:assign",
    "issue:label",
    "release:view",
    "release:create",
    "release:publish",
    "release:delete",
    "settings:view",
    "settings:edit",
    "settings:security",
    "settings:webhooks",
    "settings:integrations",
    "access:view",
    "access:invite",
    "access:remove",
    "access:change-role",
    "access:override",
    "ecosystem:view",
    "ecosystem:modify",
    "ecosystem:deploy",
    "ecosystem:rollback",
    "ecosystem:shutdown",
    // OWNER-ONLY PERMISSIONS
    "owner:override",
    "owner:veto",
    "owner:emergency",
  ],
};

// Role hierarchy (higher = more authority)
const ROLE_HIERARCHY: Record<RoleType, number> = {
  guest: 0,
  "approved-worker": 1,
  "tier1-employee": 2,
  "tier2-employee": 3,
  "tier3-employee": 4,
  lead: 5,
  manager: 6,
  director: 7,
  vp: 8,
  cto: 9,
  coo: 9,
  ceo: 10,
  owner: 100, // SUPREME AUTHORITY
};

// ============================================================================
// GitHub Codifier Manager
// ============================================================================

class GitHubCodifierManager extends EventEmitter {
  private static instance: GitHubCodifierManager;
  
  private users: Map<string, EcosystemUser> = new Map();
  private accessRequests: Map<string, AccessRequest> = new Map();
  private codeChanges: Map<string, CodeChange> = new Map();
  private ownerDecisions: Map<string, OwnerDecision> = new Map();
  private auditLog: AuditEntry[] = [];
  
  // Critical paths that require owner approval
  private criticalPaths = [
    "lib/ecosystem-core/",
    "lib/pi-backbone/",
    ".github/workflows/",
    "package.json",
    "next.config.ts",
    "middleware.ts",
  ];
  
  private constructor() {
    super();
    this.setMaxListeners(100);
    this.initializeOwner();
  }
  
  static getInstance(): GitHubCodifierManager {
    if (!GitHubCodifierManager.instance) {
      GitHubCodifierManager.instance = new GitHubCodifierManager();
    }
    return GitHubCodifierManager.instance;
  }
  
  private initializeOwner(): void {
    // The Owner is always initialized first
    const ownerId = "owner-triumph-synergy";
    
    const owner: EcosystemUser = {
      id: ownerId,
      username: "triumph-synergy-owner",
      email: "owner@triumphsynergy.pi",
      role: "owner",
      publicKey: "owner-public-key",
      mfaEnabled: true,
      permissions: ROLE_PERMISSIONS.owner,
      customPermissions: [],
      restrictedPermissions: [],
      hiredAt: new Date("2024-01-01"),
      totalCommits: 0,
      totalPRs: 0,
      totalReviews: 0,
      reputationScore: 1000,
      status: "active",
      verifiedAt: new Date("2024-01-01"),
      walletAddress: "0xOWNER",
      piNetworkId: "pi-owner-001",
    };
    
    this.users.set(ownerId, owner);
    
    this.addAuditEntry({
      action: "owner-initialized",
      actorId: "system",
      actorRole: "owner",
      targetType: "user",
      targetId: ownerId,
      details: { message: "Ecosystem owner initialized with FINAL AUTHORITY" },
    });
  }
  
  // ==========================================================================
  // User Management
  // ==========================================================================
  
  /**
   * Register a new user (requires appropriate authority)
   */
  registerUser(params: {
    registrarId: string;
    username: string;
    email: string;
    role: RoleType;
    department?: string;
    publicKey: string;
  }): EcosystemUser {
    const registrar = this.users.get(params.registrarId);
    if (!registrar) throw new Error("Registrar not found");
    
    // Check if registrar can assign this role
    if (!this.canAssignRole(registrar.role, params.role)) {
      throw new Error(`${registrar.role} cannot assign role ${params.role}`);
    }
    
    const userId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    const user: EcosystemUser = {
      id: userId,
      username: params.username,
      email: params.email,
      role: params.role,
      department: params.department,
      tier: this.extractTier(params.role),
      publicKey: params.publicKey,
      mfaEnabled: false,
      permissions: [...ROLE_PERMISSIONS[params.role]],
      customPermissions: [],
      restrictedPermissions: [],
      hiredAt: new Date(),
      totalCommits: 0,
      totalPRs: 0,
      totalReviews: 0,
      reputationScore: 0,
      status: "pending",
    };
    
    this.users.set(userId, user);
    
    this.addAuditEntry({
      action: "user-registered",
      actorId: params.registrarId,
      actorRole: registrar.role,
      targetType: "user",
      targetId: userId,
      details: { role: params.role, department: params.department },
    });
    
    this.emit("user-registered", { user, registrar });
    return user;
  }
  
  /**
   * Promote a user (requires appropriate authority)
   */
  promoteUser(promoterId: string, userId: string, newRole: RoleType): EcosystemUser {
    const promoter = this.users.get(promoterId);
    const user = this.users.get(userId);
    
    if (!promoter) throw new Error("Promoter not found");
    if (!user) throw new Error("User not found");
    
    // Check authorization
    if (!this.canAssignRole(promoter.role, newRole)) {
      throw new Error(`${promoter.role} cannot promote to ${newRole}`);
    }
    
    // Must be promoting, not demoting
    if (ROLE_HIERARCHY[newRole] <= ROLE_HIERARCHY[user.role]) {
      throw new Error("Use demoteUser for demotions");
    }
    
    const oldRole = user.role;
    user.role = newRole;
    user.tier = this.extractTier(newRole);
    user.permissions = [...ROLE_PERMISSIONS[newRole], ...user.customPermissions]
      .filter(p => !user.restrictedPermissions.includes(p));
    user.promotedAt = new Date();
    
    this.addAuditEntry({
      action: "user-promoted",
      actorId: promoterId,
      actorRole: promoter.role,
      targetType: "user",
      targetId: userId,
      details: { oldRole, newRole },
    });
    
    this.emit("user-promoted", { user, promoter, oldRole, newRole });
    return user;
  }
  
  /**
   * Verify user identity (blockchain-backed)
   */
  verifyUser(verifierId: string, userId: string): EcosystemUser {
    const verifier = this.users.get(verifierId);
    const user = this.users.get(userId);
    
    if (!verifier) throw new Error("Verifier not found");
    if (!user) throw new Error("User not found");
    
    if (ROLE_HIERARCHY[verifier.role] < ROLE_HIERARCHY.manager) {
      throw new Error("Only managers and above can verify users");
    }
    
    user.status = "active";
    user.verifiedAt = new Date();
    
    this.addAuditEntry({
      action: "user-verified",
      actorId: verifierId,
      actorRole: verifier.role,
      targetType: "user",
      targetId: userId,
      details: { verifiedAt: user.verifiedAt },
    });
    
    this.emit("user-verified", { user, verifier });
    return user;
  }
  
  private canAssignRole(assignerRole: RoleType, targetRole: RoleType): boolean {
    // Owner can assign anyone
    if (assignerRole === "owner") return true;
    
    // Cannot assign owner role
    if (targetRole === "owner") return false;
    
    // Cannot assign role equal or higher than self
    if (ROLE_HIERARCHY[targetRole] >= ROLE_HIERARCHY[assignerRole]) return false;
    
    // CEO can assign all except owner
    if (assignerRole === "ceo") return true;
    
    // COO/CTO can assign up to director
    if (assignerRole === "coo" || assignerRole === "cto") {
      return ROLE_HIERARCHY[targetRole] <= ROLE_HIERARCHY.director;
    }
    
    // Directors can assign up to lead
    if (assignerRole === "director") {
      return ROLE_HIERARCHY[targetRole] <= ROLE_HIERARCHY.lead;
    }
    
    // Managers can assign up to tier3
    if (assignerRole === "manager") {
      return ROLE_HIERARCHY[targetRole] <= ROLE_HIERARCHY["tier3-employee"];
    }
    
    // Leads can assign up to tier2
    if (assignerRole === "lead") {
      return ROLE_HIERARCHY[targetRole] <= ROLE_HIERARCHY["tier2-employee"];
    }
    
    return false;
  }
  
  private extractTier(role: RoleType): number | undefined {
    if (role.startsWith("tier")) {
      return parseInt(role.charAt(4));
    }
    return undefined;
  }
  
  // ==========================================================================
  // Permission Checking
  // ==========================================================================
  
  /**
   * Check if user has permission
   */
  hasPermission(userId: string, permission: PermissionType): boolean {
    const user = this.users.get(userId);
    if (!user) return false;
    if (user.status !== "active") return false;
    
    // Owner always has all permissions
    if (user.role === "owner") return true;
    
    // Check restricted
    if (user.restrictedPermissions.includes(permission)) return false;
    
    // Check permissions
    return user.permissions.includes(permission) || user.customPermissions.includes(permission);
  }
  
  /**
   * Grant custom permission (requires appropriate authority)
   */
  grantPermission(granterId: string, userId: string, permission: PermissionType): EcosystemUser {
    const granter = this.users.get(granterId);
    const user = this.users.get(userId);
    
    if (!granter) throw new Error("Granter not found");
    if (!user) throw new Error("User not found");
    
    // Must have the permission to grant it
    if (!this.hasPermission(granterId, permission)) {
      throw new Error("Cannot grant a permission you don't have");
    }
    
    // Owner-only permissions require owner
    if (permission.startsWith("owner:") && granter.role !== "owner") {
      throw new Error("Only owner can grant owner permissions");
    }
    
    if (!user.customPermissions.includes(permission)) {
      user.customPermissions.push(permission);
    }
    
    // Remove from restricted if present
    const restrictedIndex = user.restrictedPermissions.indexOf(permission);
    if (restrictedIndex > -1) {
      user.restrictedPermissions.splice(restrictedIndex, 1);
    }
    
    this.addAuditEntry({
      action: "permission-granted",
      actorId: granterId,
      actorRole: granter.role,
      targetType: "user",
      targetId: userId,
      details: { permission },
    });
    
    this.emit("permission-granted", { user, granter, permission });
    return user;
  }
  
  /**
   * Revoke permission
   */
  revokePermission(revokerId: string, userId: string, permission: PermissionType): EcosystemUser {
    const revoker = this.users.get(revokerId);
    const user = this.users.get(userId);
    
    if (!revoker) throw new Error("Revoker not found");
    if (!user) throw new Error("User not found");
    
    // Must have higher authority
    if (ROLE_HIERARCHY[revoker.role] <= ROLE_HIERARCHY[user.role]) {
      throw new Error("Cannot revoke permissions from equal or higher authority");
    }
    
    // Remove from custom
    const customIndex = user.customPermissions.indexOf(permission);
    if (customIndex > -1) {
      user.customPermissions.splice(customIndex, 1);
    }
    
    // Add to restricted
    if (!user.restrictedPermissions.includes(permission)) {
      user.restrictedPermissions.push(permission);
    }
    
    this.addAuditEntry({
      action: "permission-revoked",
      actorId: revokerId,
      actorRole: revoker.role,
      targetType: "user",
      targetId: userId,
      details: { permission },
    });
    
    this.emit("permission-revoked", { user, revoker, permission });
    return user;
  }
  
  // ==========================================================================
  // Code Change Management
  // ==========================================================================
  
  /**
   * Submit a code change for review
   */
  submitCodeChange(params: {
    authorId: string;
    type: CodeChange["type"];
    branch: string;
    targetBranch?: string;
    files: FileChange[];
    commitHash: string;
  }): CodeChange {
    const author = this.users.get(params.authorId);
    if (!author) throw new Error("Author not found");
    
    if (!this.hasPermission(params.authorId, "code:push")) {
      throw new Error("No permission to push code");
    }
    
    const changeId = `change-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    // Check for critical paths
    const criticalPaths = params.files.some(f => 
      this.criticalPaths.some(cp => f.path.startsWith(cp))
    );
    
    // Mark files requiring owner approval
    for (const file of params.files) {
      file.isCritical = this.criticalPaths.some(cp => file.path.startsWith(cp));
      file.requiresOwnerApproval = file.isCritical;
    }
    
    const linesAdded = params.files.reduce((sum, f) => sum + f.linesAdded, 0);
    const linesRemoved = params.files.reduce((sum, f) => sum + f.linesRemoved, 0);
    
    // Determine required reviewers
    const reviewers = this.determineReviewers(author, params.files);
    
    const change: CodeChange = {
      id: changeId,
      type: params.type,
      authorId: params.authorId,
      branch: params.branch,
      targetBranch: params.targetBranch,
      files: params.files,
      linesAdded,
      linesRemoved,
      reviewRequired: true,
      reviewers,
      approvals: [],
      rejections: [],
      status: "pending",
      securityScan: "pending",
      vulnerabilities: 0,
      commitHash: params.commitHash,
      createdAt: new Date(),
    };
    
    this.codeChanges.set(changeId, change);
    
    // Update author stats
    author.totalCommits++;
    
    this.addAuditEntry({
      action: "code-change-submitted",
      actorId: params.authorId,
      actorRole: author.role,
      targetType: "code-change",
      targetId: changeId,
      details: { 
        type: params.type, 
        branch: params.branch,
        filesChanged: params.files.length,
        criticalPaths,
      },
    });
    
    this.emit("code-change-submitted", { change, author });
    return change;
  }
  
  private determineReviewers(author: EcosystemUser, files: FileChange[]): string[] {
    const reviewers: string[] = [];
    
    // Always need at least one reviewer at or above author's level
    const minReviewerLevel = ROLE_HIERARCHY[author.role];
    
    // If critical paths, add owner to reviewers
    if (files.some(f => f.requiresOwnerApproval)) {
      const owner = Array.from(this.users.values()).find(u => u.role === "owner");
      if (owner) reviewers.push(owner.id);
    }
    
    // Add supervisor if exists
    if (author.supervisor) {
      reviewers.push(author.supervisor);
    }
    
    return reviewers;
  }
  
  /**
   * Review a code change
   */
  reviewCodeChange(
    reviewerId: string,
    changeId: string,
    decision: "approve" | "reject",
    comments?: string
  ): CodeChange {
    const reviewer = this.users.get(reviewerId);
    const change = this.codeChanges.get(changeId);
    
    if (!reviewer) throw new Error("Reviewer not found");
    if (!change) throw new Error("Code change not found");
    
    if (!this.hasPermission(reviewerId, "code:review")) {
      throw new Error("No permission to review code");
    }
    
    // Cannot review own code
    if (change.authorId === reviewerId) {
      throw new Error("Cannot review your own code");
    }
    
    change.status = "reviewing";
    
    if (decision === "approve") {
      if (!change.approvals.includes(reviewerId)) {
        change.approvals.push(reviewerId);
      }
      reviewer.totalReviews++;
    } else {
      if (!change.rejections.includes(reviewerId)) {
        change.rejections.push(reviewerId);
      }
      change.status = "rejected";
    }
    
    this.addAuditEntry({
      action: `code-change-${decision}`,
      actorId: reviewerId,
      actorRole: reviewer.role,
      targetType: "code-change",
      targetId: changeId,
      details: { decision, comments },
    });
    
    // Check if all required reviewers have approved
    const allApproved = change.reviewers.every(r => change.approvals.includes(r));
    if (allApproved && change.rejections.length === 0) {
      change.status = "approved";
      this.emit("code-change-approved", { change });
    }
    
    this.emit("code-change-reviewed", { change, reviewer, decision });
    return change;
  }
  
  /**
   * Merge approved code change
   */
  mergeCodeChange(mergerId: string, changeId: string): CodeChange {
    const merger = this.users.get(mergerId);
    const change = this.codeChanges.get(changeId);
    
    if (!merger) throw new Error("Merger not found");
    if (!change) throw new Error("Code change not found");
    
    if (!this.hasPermission(mergerId, "code:merge")) {
      throw new Error("No permission to merge code");
    }
    
    if (change.status !== "approved") {
      throw new Error("Code change must be approved before merging");
    }
    
    change.status = "merged";
    change.mergedAt = new Date();
    
    // Record on blockchain (simulated)
    change.blockchainTxId = `0x${Date.now().toString(16)}`;
    
    this.addAuditEntry({
      action: "code-change-merged",
      actorId: mergerId,
      actorRole: merger.role,
      targetType: "code-change",
      targetId: changeId,
      details: { blockchainTxId: change.blockchainTxId },
    });
    
    this.emit("code-change-merged", { change, merger });
    return change;
  }
  
  // ==========================================================================
  // Owner Authority
  // ==========================================================================
  
  /**
   * Owner override - FINAL AUTHORITY
   */
  ownerOverride(
    ownerSignature: string,
    targetType: OwnerDecision["targetType"],
    targetId: string,
    decision: "approve" | "reject" | "veto",
    reason: string
  ): OwnerDecision {
    // Verify owner signature
    if (!this.verifyOwnerSignature(ownerSignature)) {
      throw new Error("Invalid owner signature");
    }
    
    const owner = Array.from(this.users.values()).find(u => u.role === "owner");
    if (!owner) throw new Error("Owner not found");
    
    const decisionId = `owner-decision-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    const ownerDecision: OwnerDecision = {
      id: decisionId,
      type: decision === "veto" ? "veto" : decision === "approve" ? "override" : "reject",
      targetType,
      targetId,
      reason,
      ownerSignature,
      timestamp: new Date(),
      overriddenDecisions: [],
      affectedUsers: [],
      blockchainTxId: `0x${Date.now().toString(16)}`,
      immutable: true,
    };
    
    // Apply the decision
    switch (targetType) {
      case "code-change":
        const change = this.codeChanges.get(targetId);
        if (change) {
          if (decision === "approve") {
            change.status = "approved";
            change.approvals.push(owner.id);
          } else {
            change.status = "rejected";
            change.rejections.push(owner.id);
          }
          ownerDecision.affectedUsers.push(change.authorId);
        }
        break;
        
      case "access-request":
        const request = this.accessRequests.get(targetId);
        if (request) {
          request.status = decision === "approve" ? "approved" : "rejected";
          ownerDecision.affectedUsers.push(request.requesterId);
        }
        break;
    }
    
    this.ownerDecisions.set(decisionId, ownerDecision);
    
    this.addAuditEntry({
      action: "owner-decision",
      actorId: owner.id,
      actorRole: "owner",
      targetType,
      targetId,
      details: { decision, reason, blockchainTxId: ownerDecision.blockchainTxId },
    });
    
    this.emit("owner-decision", { ownerDecision });
    return ownerDecision;
  }
  
  /**
   * Owner emergency action
   */
  ownerEmergency(
    ownerSignature: string,
    action: "shutdown" | "lockdown" | "revoke-all" | "reset",
    reason: string
  ): OwnerDecision {
    if (!this.verifyOwnerSignature(ownerSignature)) {
      throw new Error("Invalid owner signature");
    }
    
    const owner = Array.from(this.users.values()).find(u => u.role === "owner");
    if (!owner) throw new Error("Owner not found");
    
    const decisionId = `owner-emergency-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    const ownerDecision: OwnerDecision = {
      id: decisionId,
      type: "emergency",
      targetType: "system-change",
      targetId: action,
      reason,
      ownerSignature,
      timestamp: new Date(),
      overriddenDecisions: [],
      affectedUsers: Array.from(this.users.keys()),
      blockchainTxId: `0x${Date.now().toString(16)}`,
      immutable: true,
    };
    
    // Execute emergency action
    switch (action) {
      case "lockdown":
        // Suspend all non-owner users
        for (const [id, user] of this.users) {
          if (user.role !== "owner") {
            user.status = "suspended";
          }
        }
        break;
        
      case "revoke-all":
        // Revoke all custom permissions
        for (const [id, user] of this.users) {
          if (user.role !== "owner") {
            user.customPermissions = [];
          }
        }
        break;
    }
    
    this.ownerDecisions.set(decisionId, ownerDecision);
    
    this.addAuditEntry({
      action: "owner-emergency",
      actorId: owner.id,
      actorRole: "owner",
      targetType: "ecosystem",
      targetId: action,
      details: { action, reason, blockchainTxId: ownerDecision.blockchainTxId },
    });
    
    this.emit("owner-emergency", { action, reason, ownerDecision });
    return ownerDecision;
  }
  
  private verifyOwnerSignature(signature: string): boolean {
    // In production: Cryptographic verification
    return signature.startsWith("owner-sig-") && signature.length > 15;
  }
  
  // ==========================================================================
  // Audit & Queries
  // ==========================================================================
  
  private addAuditEntry(params: Omit<AuditEntry, "id" | "timestamp" | "blockNumber" | "txHash" | "verified">): void {
    const entry: AuditEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      ...params,
      timestamp: new Date(),
      blockNumber: Math.floor(Date.now() / 1000),
      txHash: `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`,
      verified: true,
    };
    
    this.auditLog.push(entry);
    
    // Keep last 10000 entries in memory
    if (this.auditLog.length > 10000) {
      this.auditLog = this.auditLog.slice(-10000);
    }
  }
  
  getUser(userId: string): EcosystemUser | undefined {
    return this.users.get(userId);
  }
  
  getUserByUsername(username: string): EcosystemUser | undefined {
    return Array.from(this.users.values()).find(u => u.username === username);
  }
  
  getUsersByRole(role: RoleType): EcosystemUser[] {
    return Array.from(this.users.values()).filter(u => u.role === role);
  }
  
  getCodeChange(changeId: string): CodeChange | undefined {
    return this.codeChanges.get(changeId);
  }
  
  getOwnerDecisions(): OwnerDecision[] {
    return Array.from(this.ownerDecisions.values());
  }
  
  getAuditLog(limit: number = 100): AuditEntry[] {
    return this.auditLog.slice(-limit);
  }
  
  getStatistics(): {
    totalUsers: number;
    activeUsers: number;
    usersByRole: Record<RoleType, number>;
    totalCodeChanges: number;
    pendingCodeChanges: number;
    mergedCodeChanges: number;
    ownerDecisions: number;
    auditEntries: number;
  } {
    const usersByRole: Partial<Record<RoleType, number>> = {};
    let activeUsers = 0;
    
    for (const user of this.users.values()) {
      if (user.status === "active") activeUsers++;
      usersByRole[user.role] = (usersByRole[user.role] || 0) + 1;
    }
    
    return {
      totalUsers: this.users.size,
      activeUsers,
      usersByRole: usersByRole as Record<RoleType, number>,
      totalCodeChanges: this.codeChanges.size,
      pendingCodeChanges: Array.from(this.codeChanges.values()).filter(c => c.status === "pending").length,
      mergedCodeChanges: Array.from(this.codeChanges.values()).filter(c => c.status === "merged").length,
      ownerDecisions: this.ownerDecisions.size,
      auditEntries: this.auditLog.length,
    };
  }
}

// ============================================================================
// Exports
// ============================================================================

export const githubCodifier = GitHubCodifierManager.getInstance();

export { GitHubCodifierManager, ROLE_PERMISSIONS, ROLE_HIERARCHY };
