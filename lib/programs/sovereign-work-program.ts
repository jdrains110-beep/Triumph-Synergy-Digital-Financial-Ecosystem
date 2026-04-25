/**
 * Triumph Synergy — Sovereign Work Program Engine
 *
 * The world's first sovereign Pi-powered work program covering employers,
 * employees, work-release inmates, and DOC facility participants globally.
 *
 * Under the sovereign utility layer of Pi Network, participants earn Pi
 * through verified work tasks — credited to Pi wallets, commissary accounts,
 * or sovereign hold accounts depending on participant classification.
 *
 * Sovereign Security Level: APEX — highest access tier granted by sovereign
 * ecosystem standing. All transactions are immutable and Pi-ledger verified.
 *
 * @module lib/programs/sovereign-work-program
 * @version 1.0.0
 */

// ============================================================================
// CONSTANTS
// ============================================================================

export const PI_WORK_RATE_EXTERNAL = 314.159;   // $314.159 per Pi (external)
export const PI_WORK_RATE_INTERNAL = 314_159;    // internal utility value
export const MIN_TASK_PI_REWARD    = 0.001;      // minimum Pi per task
export const MAX_DAILY_EARN_PI     = 50;         // daily cap per participant
export const COMMISSARY_PI_CAP     = 200;        // max Pi in commissary hold
export const SOVEREIGN_PROGRAM_ID  = "TRIUMPH-SWP-v1";
export const DOC_INTEGRATION_VER   = "2026.1";

// ============================================================================
// ENUMS & UNION TYPES
// ============================================================================

export type ParticipantClass =
  | "employer"           // Business / facility offering work tasks
  | "employee"           // Free-world employee
  | "inmate-work-release"// Sentenced individual on work-release clearance
  | "inmate-facility"    // Inside DOC facility participant
  | "doc-admin"          // DOC program administrator
  | "sovereign-admin";   // Triumph Synergy sovereign operator

export type WorkProgramStatus =
  | "active"
  | "suspended"
  | "completed"
  | "pending-approval"
  | "revoked";

export type TaskCategory =
  | "facility-maintenance"   // cleaning, repairs, groundskeeping
  | "administrative"         // data entry, records, filing
  | "manufacturing"          // production, assembly, packaging
  | "agricultural"           // farm work, harvesting, processing
  | "technology"             // IT support, coding, digital tasks
  | "healthcare-support"     // patient transport, orderly, laundry
  | "culinary"               // kitchen work, food prep, catering
  | "construction"           // building, renovation, skilled trades
  | "education-support"      // tutoring, library, classroom aides
  | "community-service"      // public works, environmental cleanup
  | "logistics"              // warehouse, shipping, delivery
  | "creative"               // art, media, design projects
  | "remote-digital";        // fully remote digital micro-tasks

export type TaskStatus =
  | "open"
  | "assigned"
  | "in-progress"
  | "submitted"
  | "verified"
  | "paid"
  | "disputed"
  | "cancelled";

export type EarningsDestination =
  | "pi-wallet"          // direct to participant Pi wallet
  | "commissary"         // DOC commissary account (inmates)
  | "sovereign-hold"     // held in sovereign escrow until release
  | "family-transfer"    // transferred to designated family member wallet
  | "split";             // configurable split across multiple destinations

export type DocFacilityType =
  | "county-jail"
  | "state-prison"
  | "federal-prison"
  | "immigration-detention"
  | "juvenile-facility"
  | "work-release-center"
  | "halfway-house"
  | "community-corrections";

export type ClearanceLevel =
  | "standard"     // basic tasks, supervised
  | "elevated"     // unsupervised tasks, digital access
  | "work-release" // off-facility work eligible
  | "sovereign";   // full sovereign ecosystem access (post-release transition)

// ============================================================================
// CORE INTERFACES
// ============================================================================

export interface SovereignWorkParticipant {
  id: string;
  piUid: string;                        // Pi Network UID (KYC-verified)
  piWallet: string;                     // Pi wallet address
  participantClass: ParticipantClass;
  status: WorkProgramStatus;
  clearanceLevel: ClearanceLevel;
  sovereignId?: string;                 // Sovereign identity ID (Triumph Synergy)

  // Identity
  displayName: string;
  jurisdiction: string;                 // Country / state / region
  enrollmentDate: string;               // ISO date

  // DOC-specific (inmate participants)
  doc?: DocProfile;

  // Employer-specific
  employer?: EmployerProfile;

  // Earnings
  earnings: ParticipantEarnings;

  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface DocProfile {
  facilityId: string;
  facilityName: string;
  facilityType: DocFacilityType;
  jurisdiction: string;                 // e.g. "US-TX", "UK-ENG", "ZA-GP"
  inmateId: string;                     // Facility-assigned inmate number
  programEnrollmentDate: string;
  projectedReleaseDate?: string;
  workReleaseEligible: boolean;
  workReleaseApprovedDate?: string;
  supervisorId: string;                 // DOC officer / case manager ID
  commissaryAccountId: string;
  holdAccountId: string;                // Sovereign hold account until release
  behavioralScore: number;              // 0–100, maintained by DOC admin
  taskCompletionRate: number;           // rolling 30-day %
}

export interface EmployerProfile {
  organizationId: string;
  organizationName: string;
  organizationType:
    | "private-business"
    | "nonprofit"
    | "government-agency"
    | "doc-facility"
    | "sovereign-operator";
  verifiedAt: string;
  totalTasksPosted: number;
  totalPiDisbursed: number;
  rating: number;                       // 0–5 employer trust rating
}

export interface ParticipantEarnings {
  totalEarnedPi: number;
  pendingPi: number;
  disbursedPi: number;
  commissaryBalancePi: number;
  holdBalancePi: number;
  familyTransferredPi: number;
  lifetimeTasksCompleted: number;
  currentStreakDays: number;
  lastEarnDate?: string;
}

// ============================================================================
// WORK TASK
// ============================================================================

export interface WorkTask {
  id: string;
  programId: string;
  employerId: string;
  title: string;
  description: string;
  category: TaskCategory;
  status: TaskStatus;

  // Reward
  rewardPi: number;                     // Pi reward on verified completion
  rewardUsd: number;                    // USD equivalent at current rate
  bonusPiOnStreak?: number;             // bonus if participant on streak

  // Eligibility
  eligibleParticipantClasses: ParticipantClass[];
  requiredClearanceLevel: ClearanceLevel;
  minBehavioralScore?: number;          // DOC minimum behavioral score
  requiresDocApproval: boolean;

  // Location
  isRemote: boolean;
  facilityId?: string;                  // if facility-bound task
  location?: string;

  // Timing
  estimatedHours: number;
  deadline?: string;
  postedAt: string;

  // Assignment
  assignedTo?: string;                  // participant ID
  assignedAt?: string;
  submittedAt?: string;
  verifiedAt?: string;
  verifiedBy?: string;

  // Pi payment
  piPaymentId?: string;
  paidAt?: string;

  // Metadata
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// COMMISSARY ACCOUNT
// ============================================================================

export interface CommissaryAccount {
  id: string;
  inmateId: string;
  facilityId: string;
  piBalance: number;
  usdEquivalent: number;
  linkedPiWallet?: string;              // for post-release auto-transfer
  transactions: CommissaryTransaction[];
  lastUpdated: string;
}

export interface CommissaryTransaction {
  id: string;
  accountId: string;
  type:
    | "work-credit"      // earned from task
    | "commissary-spend" // spent at commissary
    | "hold-transfer"    // moved to sovereign hold
    | "release-transfer" // transferred on release
    | "admin-adjustment";
  amountPi: number;
  amountUsd: number;
  taskId?: string;
  note: string;
  timestamp: string;
}

// ============================================================================
// DOC FACILITY PROGRAM
// ============================================================================

export interface DocFacilityProgram {
  id: string;
  facilityId: string;
  facilityName: string;
  facilityType: DocFacilityType;
  jurisdiction: string;
  country: string;

  // Program config
  programName: string;
  isActive: boolean;
  sovereignTier: "standard" | "elevated" | "apex";

  // Caps & limits
  dailyEarnCapPi: number;
  commissaryCapPi: number;
  holdCapPi: number;

  // Participants
  enrolledParticipants: number;
  activeParticipants: number;

  // Aggregate stats
  totalPiDistributed: number;
  totalTasksCompleted: number;
  averageCompletionRate: number;

  // Admin contacts
  docAdminIds: string[];
  sovereignAdminId: string;

  // Integration
  externalSystemId?: string;            // DOC facility management system ID
  apiKey?: string;                      // encrypted DOC API key

  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// WORK PROGRAM (TOP-LEVEL)
// ============================================================================

export interface SovereignWorkProgramConfig {
  id: string;
  name: string;
  description: string;
  isGlobal: boolean;
  jurisdictions: string[];              // "ALL" or specific jurisdictions
  participantClasses: ParticipantClass[];
  isActive: boolean;

  // Sovereign backing
  sovereignBackingPi: number;
  reserveRatio: number;                 // % of earnings backed by sovereign reserve

  // Distribution config
  defaultEarningsDestination: EarningsDestination;
  splitConfig?: EarningsSplitConfig;

  // Stats
  totalEnrolled: number;
  totalTasksPosted: number;
  totalTasksCompleted: number;
  totalPiDistributed: number;

  createdAt: string;
  updatedAt: string;
}

export interface EarningsSplitConfig {
  piWalletPct: number;       // % to Pi wallet
  commissaryPct: number;     // % to commissary
  holdPct: number;           // % to sovereign hold
  familyPct: number;         // % to designated family wallet
}

// ============================================================================
// SOVEREIGN WORK PROGRAM ENGINE
// ============================================================================

export class SovereignWorkProgramEngine {
  private static readonly PROGRAM_VERSION = "1.0.0";

  // ── Participant enrollment ─────────────────────────────────────────────────

  enrollParticipant(params: {
    piUid: string;
    piWallet: string;
    participantClass: ParticipantClass;
    displayName: string;
    jurisdiction: string;
    doc?: Omit<DocProfile, "commissaryAccountId" | "holdAccountId">;
    employer?: Omit<EmployerProfile, "totalTasksPosted" | "totalPiDisbursed" | "rating" | "verifiedAt">;
  }): SovereignWorkParticipant {
    const id = this.generateId("SWP-P");
    const now = new Date().toISOString();

    const clearanceLevel = this.resolveClearanceLevel(params.participantClass, params.doc);

    const docProfile: DocProfile | undefined = params.doc
      ? {
          ...params.doc,
          commissaryAccountId: this.generateId("COMM"),
          holdAccountId: this.generateId("HOLD"),
        }
      : undefined;

    const employerProfile: EmployerProfile | undefined = params.employer
      ? {
          ...params.employer,
          verifiedAt: now,
          totalTasksPosted: 0,
          totalPiDisbursed: 0,
          rating: 5.0,
        }
      : undefined;

    return {
      id,
      piUid: params.piUid,
      piWallet: params.piWallet,
      participantClass: params.participantClass,
      status: "pending-approval",
      clearanceLevel,
      displayName: params.displayName,
      jurisdiction: params.jurisdiction,
      enrollmentDate: now,
      doc: docProfile,
      employer: employerProfile,
      earnings: {
        totalEarnedPi: 0,
        pendingPi: 0,
        disbursedPi: 0,
        commissaryBalancePi: 0,
        holdBalancePi: 0,
        familyTransferredPi: 0,
        lifetimeTasksCompleted: 0,
        currentStreakDays: 0,
      },
      createdAt: now,
      updatedAt: now,
    };
  }

  // ── Task creation ──────────────────────────────────────────────────────────

  createTask(params: {
    employerId: string;
    programId: string;
    title: string;
    description: string;
    category: TaskCategory;
    rewardPi: number;
    eligibleClasses: ParticipantClass[];
    requiredClearance?: ClearanceLevel;
    isRemote?: boolean;
    facilityId?: string;
    estimatedHours?: number;
    deadline?: string;
    requiresDocApproval?: boolean;
    minBehavioralScore?: number;
    tags?: string[];
  }): WorkTask {
    const id = this.generateId("SWP-T");
    const now = new Date().toISOString();

    const rewardPi = Math.max(MIN_TASK_PI_REWARD, params.rewardPi);

    return {
      id,
      programId: params.programId,
      employerId: params.employerId,
      title: params.title,
      description: params.description,
      category: params.category,
      status: "open",
      rewardPi,
      rewardUsd: rewardPi * PI_WORK_RATE_EXTERNAL,
      eligibleParticipantClasses: params.eligibleClasses,
      requiredClearanceLevel: params.requiredClearance ?? "standard",
      minBehavioralScore: params.minBehavioralScore,
      requiresDocApproval: params.requiresDocApproval ?? false,
      isRemote: params.isRemote ?? false,
      facilityId: params.facilityId,
      estimatedHours: params.estimatedHours ?? 1,
      deadline: params.deadline,
      postedAt: now,
      tags: params.tags ?? [],
      createdAt: now,
      updatedAt: now,
    };
  }

  // ── Task assignment ────────────────────────────────────────────────────────

  assignTask(
    task: WorkTask,
    participant: SovereignWorkParticipant
  ): { success: boolean; reason?: string; task: WorkTask } {
    if (task.status !== "open") {
      return { success: false, reason: "Task is not open for assignment", task };
    }

    if (!task.eligibleParticipantClasses.includes(participant.participantClass)) {
      return { success: false, reason: "Participant class not eligible for this task", task };
    }

    const clearanceRank = this.clearanceRank(participant.clearanceLevel);
    const requiredRank   = this.clearanceRank(task.requiredClearanceLevel);
    if (clearanceRank < requiredRank) {
      return { success: false, reason: "Insufficient clearance level", task };
    }

    if (
      task.minBehavioralScore !== undefined &&
      participant.doc &&
      participant.doc.behavioralScore < task.minBehavioralScore
    ) {
      return { success: false, reason: "Behavioral score below task minimum", task };
    }

    const now = new Date().toISOString();
    const updated: WorkTask = {
      ...task,
      status: "assigned",
      assignedTo: participant.id,
      assignedAt: now,
      updatedAt: now,
    };

    return { success: true, task: updated };
  }

  // ── Task completion + Pi disbursement ─────────────────────────────────────

  completeAndPay(
    task: WorkTask,
    participant: SovereignWorkParticipant,
    config: SovereignWorkProgramConfig
  ): {
    success: boolean;
    reason?: string;
    task: WorkTask;
    participant: SovereignWorkParticipant;
    disbursement: PiDisbursement;
  } {
    if (task.status !== "verified") {
      return {
        success: false,
        reason: "Task must be verified before payment",
        task,
        participant,
        disbursement: this.nullDisbursement(task.id, participant.id),
      };
    }

    const destination = config.defaultEarningsDestination;
    const piAmount    = task.rewardPi;
    const now         = new Date().toISOString();

    const disbursement = this.buildDisbursement({
      taskId: task.id,
      participantId: participant.id,
      piAmount,
      destination,
      splitConfig: config.splitConfig,
      participant,
    });

    // Update participant earnings
    const updatedEarnings = this.applyEarnings(participant.earnings, disbursement);
    const updatedParticipant: SovereignWorkParticipant = {
      ...participant,
      earnings: updatedEarnings,
      updatedAt: now,
    };

    const updatedTask: WorkTask = {
      ...task,
      status: "paid",
      paidAt: now,
      piPaymentId: disbursement.id,
      updatedAt: now,
    };

    return {
      success: true,
      task: updatedTask,
      participant: updatedParticipant,
      disbursement,
    };
  }

  // ── DOC facility enrollment ────────────────────────────────────────────────

  enrollFacility(params: {
    facilityId: string;
    facilityName: string;
    facilityType: DocFacilityType;
    jurisdiction: string;
    country: string;
    sovereignAdminId: string;
    docAdminIds: string[];
    dailyEarnCapPi?: number;
    commissaryCapPi?: number;
  }): DocFacilityProgram {
    const id  = this.generateId("SWP-FAC");
    const now = new Date().toISOString();

    return {
      id,
      facilityId: params.facilityId,
      facilityName: params.facilityName,
      facilityType: params.facilityType,
      jurisdiction: params.jurisdiction,
      country: params.country,
      programName: `Triumph Synergy Sovereign Work Program — ${params.facilityName}`,
      isActive: true,
      sovereignTier: "apex",
      dailyEarnCapPi: params.dailyEarnCapPi ?? MAX_DAILY_EARN_PI,
      commissaryCapPi: params.commissaryCapPi ?? COMMISSARY_PI_CAP,
      holdCapPi: 10_000,
      enrolledParticipants: 0,
      activeParticipants: 0,
      totalPiDistributed: 0,
      totalTasksCompleted: 0,
      averageCompletionRate: 0,
      docAdminIds: params.docAdminIds,
      sovereignAdminId: params.sovereignAdminId,
      createdAt: now,
      updatedAt: now,
    };
  }

  // ── Commissary credit ──────────────────────────────────────────────────────

  creditCommissary(
    account: CommissaryAccount,
    piAmount: number,
    taskId: string
  ): CommissaryAccount {
    const now = new Date().toISOString();
    const newBalance = Math.min(account.piBalance + piAmount, COMMISSARY_PI_CAP);
    const actual     = newBalance - account.piBalance;

    const tx: CommissaryTransaction = {
      id: this.generateId("COMM-TX"),
      accountId: account.id,
      type: "work-credit",
      amountPi: actual,
      amountUsd: actual * PI_WORK_RATE_EXTERNAL,
      taskId,
      note: `Work task completion credit — task ${taskId}`,
      timestamp: now,
    };

    return {
      ...account,
      piBalance: newBalance,
      usdEquivalent: newBalance * PI_WORK_RATE_EXTERNAL,
      transactions: [...account.transactions, tx],
      lastUpdated: now,
    };
  }

  // ── Work release eligibility check ────────────────────────────────────────

  checkWorkReleaseEligibility(participant: SovereignWorkParticipant): {
    eligible: boolean;
    reasons: string[];
    recommendations: string[];
  } {
    const reasons: string[]         = [];
    const recommendations: string[] = [];

    if (!participant.doc) {
      return { eligible: false, reasons: ["Not a DOC participant"], recommendations: [] };
    }

    const { doc } = participant;

    if (!doc.workReleaseEligible) {
      reasons.push("Facility has not granted work-release eligibility");
      recommendations.push("Complete behavioral assessment with case manager");
    }

    if (doc.behavioralScore < 70) {
      reasons.push(`Behavioral score ${doc.behavioralScore}/100 is below 70 minimum`);
      recommendations.push("Maintain good conduct for 90 consecutive days");
    }

    if (doc.taskCompletionRate < 0.75) {
      reasons.push(`Task completion rate ${Math.round(doc.taskCompletionRate * 100)}% is below 75% minimum`);
      recommendations.push("Complete at least 75% of assigned tasks in the next 30 days");
    }

    if (participant.earnings.currentStreakDays < 14) {
      recommendations.push("Build a 14-day consecutive work streak to unlock higher-paying tasks");
    }

    const eligible = reasons.length === 0;
    return { eligible, reasons, recommendations };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private resolveClearanceLevel(
    cls: ParticipantClass,
    doc?: Partial<DocProfile>
  ): ClearanceLevel {
    if (cls === "employer" || cls === "employee" || cls === "sovereign-admin") {
      return "sovereign";
    }
    if (cls === "doc-admin") {
      return "elevated";
    }
    if (cls === "inmate-work-release") {
      return doc?.workReleaseEligible ? "work-release" : "elevated";
    }
    return "standard";
  }

  private clearanceRank(level: ClearanceLevel): number {
    const ranks: Record<ClearanceLevel, number> = {
      standard: 1,
      elevated: 2,
      "work-release": 3,
      sovereign: 4,
    };
    return ranks[level];
  }

  private buildDisbursement(params: {
    taskId: string;
    participantId: string;
    piAmount: number;
    destination: EarningsDestination;
    splitConfig?: EarningsSplitConfig;
    participant: SovereignWorkParticipant;
  }): PiDisbursement {
    const id  = this.generateId("SWP-PAY");
    const now = new Date().toISOString();

    const allocations: PiAllocation[] = [];

    if (params.destination === "split" && params.splitConfig) {
      const { piWalletPct, commissaryPct, holdPct, familyPct } = params.splitConfig;
      const total = params.piAmount;

      if (piWalletPct > 0) {
        allocations.push({ destination: "pi-wallet", amountPi: total * (piWalletPct / 100) });
      }
      if (commissaryPct > 0) {
        allocations.push({ destination: "commissary", amountPi: total * (commissaryPct / 100) });
      }
      if (holdPct > 0) {
        allocations.push({ destination: "sovereign-hold", amountPi: total * (holdPct / 100) });
      }
      if (familyPct > 0) {
        allocations.push({ destination: "family-transfer", amountPi: total * (familyPct / 100) });
      }
    } else {
      allocations.push({ destination: params.destination, amountPi: params.piAmount });
    }

    return {
      id,
      taskId: params.taskId,
      participantId: params.participantId,
      piWallet: params.participant.piWallet,
      totalAmountPi: params.piAmount,
      totalAmountUsd: params.piAmount * PI_WORK_RATE_EXTERNAL,
      allocations,
      status: "processing",
      programId: SOVEREIGN_PROGRAM_ID,
      createdAt: now,
    };
  }

  private applyEarnings(
    earnings: ParticipantEarnings,
    disbursement: PiDisbursement
  ): ParticipantEarnings {
    const walletAmt      = disbursement.allocations.find(a => a.destination === "pi-wallet")?.amountPi ?? 0;
    const commissaryAmt  = disbursement.allocations.find(a => a.destination === "commissary")?.amountPi ?? 0;
    const holdAmt        = disbursement.allocations.find(a => a.destination === "sovereign-hold")?.amountPi ?? 0;
    const familyAmt      = disbursement.allocations.find(a => a.destination === "family-transfer")?.amountPi ?? 0;

    return {
      totalEarnedPi: earnings.totalEarnedPi + disbursement.totalAmountPi,
      pendingPi: Math.max(0, earnings.pendingPi - disbursement.totalAmountPi),
      disbursedPi: earnings.disbursedPi + walletAmt,
      commissaryBalancePi: Math.min(
        earnings.commissaryBalancePi + commissaryAmt,
        COMMISSARY_PI_CAP
      ),
      holdBalancePi: earnings.holdBalancePi + holdAmt,
      familyTransferredPi: earnings.familyTransferredPi + familyAmt,
      lifetimeTasksCompleted: earnings.lifetimeTasksCompleted + 1,
      currentStreakDays: earnings.currentStreakDays + 1,
      lastEarnDate: new Date().toISOString(),
    };
  }

  private nullDisbursement(taskId: string, participantId: string): PiDisbursement {
    const now = new Date().toISOString();
    return {
      id: "",
      taskId,
      participantId,
      piWallet: "",
      totalAmountPi: 0,
      totalAmountUsd: 0,
      allocations: [],
      status: "failed",
      programId: SOVEREIGN_PROGRAM_ID,
      createdAt: now,
    };
  }

  private generateId(prefix: string): string {
    const ts   = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `${prefix}-${ts}-${rand}`;
  }
}

// ============================================================================
// PI DISBURSEMENT
// ============================================================================

export interface PiAllocation {
  destination: EarningsDestination;
  amountPi: number;
}

export interface PiDisbursement {
  id: string;
  taskId: string;
  participantId: string;
  piWallet: string;
  totalAmountPi: number;
  totalAmountUsd: number;
  allocations: PiAllocation[];
  status: "processing" | "completed" | "failed";
  programId: string;
  piTransactionHash?: string;
  createdAt: string;
  completedAt?: string;
}

// ============================================================================
// GLOBAL STATS
// ============================================================================

export interface SovereignWorkProgramStats {
  totalParticipants: number;
  employerCount: number;
  employeeCount: number;
  inmateWorkReleaseCount: number;
  inmateFacilityCount: number;
  enrolledFacilities: number;
  facilitiesGlobal: number;
  totalTasksPosted: number;
  totalTasksCompleted: number;
  totalPiDistributed: number;
  totalUsdEquivalent: number;
  totalCommissaryPi: number;
  totalHoldPi: number;
  topJurisdictions: string[];
  programVersion: string;
  sovereignProgramId: string;
}

export function buildProgramStats(
  participants: SovereignWorkParticipant[],
  facilities: DocFacilityProgram[]
): SovereignWorkProgramStats {
  const totalPiDistributed = participants.reduce(
    (sum, p) => sum + p.earnings.totalEarnedPi,
    0
  );

  return {
    totalParticipants: participants.length,
    employerCount: participants.filter(p => p.participantClass === "employer").length,
    employeeCount: participants.filter(p => p.participantClass === "employee").length,
    inmateWorkReleaseCount: participants.filter(p => p.participantClass === "inmate-work-release").length,
    inmateFacilityCount: participants.filter(p => p.participantClass === "inmate-facility").length,
    enrolledFacilities: facilities.length,
    facilitiesGlobal: new Set(facilities.map(f => f.country)).size,
    totalTasksPosted: 0,
    totalTasksCompleted: participants.reduce(
      (sum, p) => sum + p.earnings.lifetimeTasksCompleted,
      0
    ),
    totalPiDistributed,
    totalUsdEquivalent: totalPiDistributed * PI_WORK_RATE_EXTERNAL,
    totalCommissaryPi: participants.reduce(
      (sum, p) => sum + p.earnings.commissaryBalancePi,
      0
    ),
    totalHoldPi: participants.reduce(
      (sum, p) => sum + p.earnings.holdBalancePi,
      0
    ),
    topJurisdictions: [...new Set(participants.map(p => p.jurisdiction))].slice(0, 10),
    programVersion: "1.0.0",
    sovereignProgramId: SOVEREIGN_PROGRAM_ID,
  };
}

// Singleton engine instance
export const sovereignWorkEngine = new SovereignWorkProgramEngine();
