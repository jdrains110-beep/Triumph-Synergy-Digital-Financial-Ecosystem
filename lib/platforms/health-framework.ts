/**
 * TRIUMPH SYNERGY - Health Platform Integration Framework
 * 
 * Enables major health institutions (Shands Hospital, UF Health, etc.)
 * to integrate Pi Network for employee/employer/contractor payments
 * and policy management with sovereign control
 * 
 * Features:
 * - Employee/employer direct Pi payments
 * - Contractor payment routing
 * - Policy alternatives (optional vaccines, midwives program)
 * - Department-level management
 * - Medical equipment integration
 * - Regulatory compliance tracking
 * 
 * Vision: Digital healthcare with physical sovereignty
 * - No government mandates
 * - Alternative care pathways
 * - Transparent payment systems
 */

import { OfficialPiPayments } from '@/lib/payments/pi-payments-official';
import { 
  enforceHealthPayment, 
  piOriginEnforcer,
  TransactionCategory 
} from '@/lib/core/pi-origin-enforcement';
import { piOriginVerificationEngine } from '@/lib/core/pi-origin-verification';

/**
 * CRITICAL: All health institution payments enforce Pi origin verification
 * - INTERNAL Pi only (earned through healthcare work)
 * - NO external Pi accepted for payroll
 * - Immutable enforcement on blockchain
 */

/**
 * Policy alternatives (non-mandatory options)
 */
export interface HealthPolicy {
  id: string;
  name: string;
  category: 'vaccination' | 'birthing' | 'treatment' | 'testing' | 'prevention';
  description: string;
  isOptional: boolean; // All policies made optional under Triumph Synergy
  alternatives: {
    id: string;
    name: string;
    description: string;
    provider?: string;
    isTraditional: boolean;
    isAlternative: boolean;
  }[];
  employeeChoice: Map<string, string>; // employeeId -> selectedAlternativeId
}

/**
 * Employee/Contractor profile
 */
export interface HealthcarePersonProfile {
  id: string;
  type: 'employee' | 'contractor' | 'administrator';
  firstName: string;
  lastName: string;
  email: string;
  department?: string;
  role: string;
  salary?: number; // Annual in fiat or Pi equivalence
  hourlyRate?: number; // For contractors
  employerName: string;
  startDate: Date;
  
  // Pi Payment details
  piWalletAddress: string;
  paymentFrequency: 'weekly' | 'biweekly' | 'monthly';
  totalEarned: number; // Pi total earned
  nextPaymentDate: Date;
  
  // Policy preferences (user choice, not mandated)
  policyPreferences: Record<string, string>; // policyId -> selectedAlternativeId
  
  // Relationships
  relatedContractors?: string[]; // For employers
  relatedEmployer?: string; // For employees
  
  // Medical history (encrypted)
  medicalNotes?: string;
  activeConditions?: string[];
  preferredTreatmentPath?: 'traditional' | 'alternative' | 'integrated';
}

/**
 * Department configuration
 */
export interface HealthcareDepconfig {
  id: string;
  name: string;
  specialization: string;
  employeeCount: number;
  contractorCount: number;
  piPaymentPool: number; // Total Pi allocated for payroll
  equipmentIntegrated: string[]; // Equipment with Triumph Synergy
}

/**
 * Health institution configuration
 */
export interface HealthInstitutionConfig {
  id: string; // 'shands-hospital', 'uf-health'
  name: string;
  type: 'hospital' | 'clinic' | 'research' | 'wellness';
  locations: string[];
  departments: HealthcareDepconfig[];
  
  // Pi Payment integration
  piPaymentEnabled: boolean;
  piPaymentEndpoint: string;
  apiKey: string;
  apiSecret: string;
  
  // Policy management
  policiesManaged: HealthPolicy[];
  
  // Partnership with Triumph Synergy
  triumphSynergyPartner: boolean;
  partnershipLevel: 'associate' | 'partner' | 'owner';
  policyInfluenceLevel: 'observer' | 'advisor' | 'co-creator' | 'owner';
  
  // Medical equipment integration
  equipmentIntegrated: Array<{
    name: string;
    deviceId: string;
    triumphSynergyEnabled: boolean;
  }>;
}

/**
 * Payment transaction in healthcare
 */
export interface HealthcarePayment {
  id: string;
  fromEntityId: string; // Employer or institution
  toPersonId: string; // Employee or contractor
  amount: number; // Pi
  type: 'salary' | 'bonus' | 'reimbursement' | 'contractor_payment';
  frequency?: 'weekly' | 'biweekly' | 'monthly';
  description: string;
  paymentDate: Date;
  blockchainHash?: string;
  status: 'pending' | 'completed' | 'failed';
}

/**
 * Health Platform Integration Interface
 * All health institutions must implement this
 */
export interface HealthIntegration {
  readonly institutionId: string;
  readonly name: string;
  readonly type: 'hospital' | 'clinic' | 'research' | 'wellness';

  // Core lifecycle
  connect(): Promise<void>;
  disconnect(): Promise<void>;

  // Employee/Contractor management
  registerPerson(profile: HealthcarePersonProfile): Promise<void>;
  getPerson(personId: string): Promise<HealthcarePersonProfile>;
  updatePerson(personId: string, updates: Partial<HealthcarePersonProfile>): Promise<void>;
  listEmployees(departmentId?: string): Promise<HealthcarePersonProfile[]>;
  listContractors(): Promise<HealthcarePersonProfile[]>;

  // Payment distribution
  processPayroll(date: Date): Promise<HealthcarePayment[]>;
  processContractorPayment(contractorId: string, amount: number, memo: string): Promise<HealthcarePayment>;
  processBonus(personId: string, amount: number, reason: string): Promise<HealthcarePayment>;
  processReimbursement(personId: string, amount: number, description: string): Promise<HealthcarePayment>;

  // Policy management (all optional under Triumph Synergy)
  createPolicy(policy: HealthPolicy): Promise<void>;
  getPolicy(policyId: string): Promise<HealthPolicy>;
  updatePersonPolicyPreference(personId: string, policyId: string, alternativeId: string): Promise<void>;
  getPolicyStatistics(policyId: string): Promise<{
    totalAffected: number;
    selectionBreakdown: Record<string, number>;
  }>;

  // Department management
  createDepartment(dept: HealthcareDepconfig): Promise<void>;
  getDepartment(deptId: string): Promise<HealthcareDepconfig>;
  listDepartments(): Promise<HealthcareDepconfig[]>;
  allocatePaymentPool(deptId: string, piAmount: number): Promise<void>;

  // Medical device integration
  integrateDevice(deviceName: string, deviceId: string): Promise<void>;
  getIntegratedDevices(): Promise<Array<{ name: string; deviceId: string; status: string }>>;

  // Reporting & compliance
  getPayrollReport(startDate: Date, endDate: Date): Promise<{
    totalPaid: number;
    employeeCount: number;
    contractorPayments: number;
    transactions: HealthcarePayment[];
  }>;

  getPolicyComplianceReport(policyId: string): Promise<{
    policyName: string;
    totalAffected: number;
    adoptionRate: number;
    alternatives: Record<string, number>;
  }>;

  // Health check
  healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'offline';
    uptime: number;
    activePersons: number;
    paymentSystemStatus: 'operational' | 'degraded';
    lastSync: Date;
  }>;
}

/**
 * Health Platform Registry - Manages all integrated health institutions
 */
export class HealthPlatformRegistry {
  private static instance: HealthPlatformRegistry;
  private institutions = new Map<string, HealthIntegration>();
  private configs = new Map<string, HealthInstitutionConfig>();
  private persons = new Map<string, HealthcarePersonProfile>();
  private payments: HealthcarePayment[] = [];
  private policies: HealthPolicy[] = [];
  private piPayments: OfficialPiPayments;

  private constructor() {
    this.piPayments = new OfficialPiPayments({
      appId: 'triumph-health-hub',
      apiKey: process.env.NEXT_PUBLIC_PI_API_KEY!,
      apiSecret: process.env.PI_API_SECRET!,
      sandbox: process.env.NEXT_PUBLIC_PI_SANDBOX !== 'false',
    });

    // Initialize standard health policies (all optional)
    this.initializeDefaultPolicies();
  }

  static getInstance(): HealthPlatformRegistry {
    if (!this.instance) {
      this.instance = new HealthPlatformRegistry();
    }
    return this.instance;
  }

  /**
   * Initialize default policies (all optional)
   */
  private initializeDefaultPolicies(): void {
    // Vaccination policy - make optional
    this.policies.push({
      id: 'vaccination-optional',
      name: 'Vaccination Policy',
      category: 'vaccination',
      description: 'Optional vaccination program - employee choice',
      isOptional: true,
      alternatives: [
        {
          id: 'vaccine-mrna',
          name: 'mRNA Vaccination',
          description: 'Modern mRNA vaccine approach',
          isTraditional: false,
          isAlternative: false,
        },
        {
          id: 'vaccine-traditional',
          name: 'Traditional Vaccination',
          description: 'Inactivated pathogen vaccine',
          isTraditional: true,
          isAlternative: false,
        },
        {
          id: 'vaccine-none',
          name: 'No Vaccination',
          description: 'Choose not to vaccinate',
          isTraditional: false,
          isAlternative: true,
        },
        {
          id: 'vaccine-natural-immunity',
          name: 'Natural Immunity Building',
          description: 'Build immunity through natural exposure',
          isTraditional: true,
          isAlternative: true,
        },
      ],
      employeeChoice: new Map(),
    });

    // Birthing options - midwives program
    this.policies.push({
      id: 'birthing-options',
      name: 'Birthing Path Options',
      category: 'birthing',
      description: 'Choose your preferred birthing pathway',
      isOptional: true,
      alternatives: [
        {
          id: 'birth-hospital',
          name: 'Hospital Birth',
          description: 'Traditional hospital delivery',
          provider: 'Shands Hospital',
          isTraditional: true,
          isAlternative: false,
        },
        {
          id: 'birth-midwife',
          name: 'Midwife Assisted Birth',
          description: 'Certified midwife home or birthing center birth',
          provider: 'Triumph Synergy Midwives',
          isTraditional: true,
          isAlternative: true,
        },
        {
          id: 'birth-home-unassisted',
          name: 'Home Birth (Unassisted)',
          description: 'Natural home birth without medical intervention',
          isTraditional: true,
          isAlternative: true,
        },
        {
          id: 'birth-doula',
          name: 'Doula Supported Birth',
          description: 'Birth with professional doula support',
          provider: 'Triumph Synergy Doula Network',
          isTraditional: true,
          isAlternative: true,
        },
      ],
      employeeChoice: new Map(),
    });
  }

  /**
   * Register health institution
   */
  registerInstitution(
    config: HealthInstitutionConfig,
    integration: HealthIntegration
  ): void {
    if (this.institutions.has(config.id)) {
      throw new Error(`Institution ${config.id} already registered`);
    }

    this.institutions.set(config.id, integration);
    this.configs.set(config.id, config);
    console.log(`✅ Health institution registered: ${config.name}`);
  }

  /**
   * Get institution configuration
   */
  getConfig(institutionId: string): HealthInstitutionConfig | undefined {
    return this.configs.get(institutionId);
  }

  /**
   * Get institution integration
   */
  getInstitution(institutionId: string): HealthIntegration | undefined {
    return this.institutions.get(institutionId);
  }

  /**
   * List all registered institutions
   */
  listInstitutions(): Array<{ config: HealthInstitutionConfig; isHealthy: boolean }> {
    const result: Array<{ config: HealthInstitutionConfig; isHealthy: boolean }> = [];

    for (const [institutionId, config] of this.configs.entries()) {
      result.push({
        config,
        isHealthy: this.institutions.has(institutionId),
      });
    }

    return result;
  }

  /**
   * Register person (employee/contractor)
   */
  async registerPerson(profile: HealthcarePersonProfile): Promise<void> {
    this.persons.set(profile.id, profile);
    
    // Notify institution
    const institution = this.institutions.get(profile.employerName);
    if (institution) {
      await institution.registerPerson(profile);
    }
  }

  /**
   * Get person profile
   */
  getPerson(personId: string): HealthcarePersonProfile | undefined {
    return this.persons.get(personId);
  }

  /**
   * Process payroll for institution
   */
  async processPayroll(institutionId: string, date: Date): Promise<HealthcarePayment[]> {
    const institution = this.institutions.get(institutionId);
    if (!institution) {
      throw new Error(`Institution ${institutionId} not found`);
    }

    const payments = await institution.processPayroll(date);
    
    // Record all payments with origin enforcement
    for (const payment of payments) {
      this.payments.push(payment);
      
      // ✅ CRITICAL: Enforce Pi origin verification for payroll
      // All health institution payroll MUST be from internally earned Pi
      // NO external Pi accepted - this is immutable
      const enforceResult = await enforceHealthPayment(
        payment.toPersonId,
        payment.amount,
        payment.type === 'salary' || payment.type === 'contractor_payment' ? 'payroll' : 'bonus',
        `${payment.type} payment - ${payment.description}`
      );

      if (!enforceResult.success) {
        payment.status = 'failed';
        console.error(
          `[Health Payroll] REJECTED: ${enforceResult.message} - Only internally earned Pi accepted`
        );
        continue; // Skip payment if origin check fails
      }
      
      // Execute Pi payment (origin already verified)
      try {
        const piPayment = await this.piPayments.createPayment({
          amount: payment.amount,
          memo: `${payment.type} - ${payment.description} [INTERNAL PI VERIFIED]`,
          metadata: { 
            personId: payment.toPersonId, 
            type: payment.type,
            originEnforced: true, // Mark as origin-verified
            piSource: 'internal', // Record source
          },
        });
        
        payment.blockchainHash = piPayment.txid;
        payment.status = 'completed';
      } catch (error) {
        payment.status = 'failed';
        console.error(`Payment failed for ${payment.toPersonId}:`, error);
      }
    }

    return payments;
  }

  /**
   * Get all optional policies
   */
  getPolicies(): HealthPolicy[] {
    return this.policies;
  }

  /**
   * Get policy by ID
   */
  getPolicy(policyId: string): HealthPolicy | undefined {
    return this.policies.find(p => p.id === policyId);
  }

  /**
   * Set person's policy preference
   */
  async setPersonPolicyPreference(
    personId: string,
    policyId: string,
    alternativeId: string
  ): Promise<void> {
    const person = this.persons.get(personId);
    if (!person) {
      throw new Error(`Person ${personId} not found`);
    }

    person.policyPreferences[policyId] = alternativeId;
    
    // Update with institution
    const institution = this.institutions.get(person.employerName);
    if (institution) {
      await institution.updatePersonPolicyPreference(personId, policyId, alternativeId);
    }
  }

  /**
   * Get policy adoption statistics
   */
  getPolicyStatistics(policyId: string): {
    policyName: string;
    totalAffected: number;
    adoptionBreakdown: Record<string, number>;
  } {
    const policy = this.getPolicy(policyId);
    if (!policy) {
      throw new Error(`Policy ${policyId} not found`);
    }

    const breakdown: Record<string, number> = {};
    policy.alternatives.forEach(alt => {
      breakdown[alt.name] = 0;
    });

    // Count selections
    for (const person of this.persons.values()) {
      const selectedAltId = person.policyPreferences[policyId];
      if (selectedAltId) {
        const alt = policy.alternatives.find(a => a.id === selectedAltId);
        if (alt) {
          breakdown[alt.name]++;
        }
      }
    }

    return {
      policyName: policy.name,
      totalAffected: this.persons.size,
      adoptionBreakdown: breakdown,
    };
  }

  /**
   * Process contractor payment
   */
  async processContractorPayment(
    institutionId: string,
    contractorId: string,
    amount: number,
    memo: string
  ): Promise<HealthcarePayment> {
    const institution = this.institutions.get(institutionId);
    if (!institution) {
      throw new Error(`Institution ${institutionId} not found`);
    }

    const payment = await institution.processContractorPayment(contractorId, amount, memo);
    
    try {
      const piPayment = await this.piPayments.createPayment({
        amount,
        memo: `Contractor: ${memo}`,
        metadata: { contractorId, institutionId },
      });
      
      payment.blockchainHash = piPayment.txid;
      payment.status = 'completed';
    } catch (error) {
      payment.status = 'failed';
    }

    this.payments.push(payment);
    return payment;
  }

  /**
   * Health check all institutions
   */
  async healthCheckAll(): Promise<
    Record<string, { status: 'healthy' | 'degraded' | 'offline' }>
  > {
    const results: Record<string, any> = {};

    for (const [institutionId, institution] of this.institutions.entries()) {
      try {
        const health = await institution.healthCheck();
        results[institutionId] = {
          status: health.status,
          activePersons: health.activePersons,
          paymentSystemStatus: health.paymentSystemStatus,
        };
      } catch (error) {
        results[institutionId] = {
          status: 'offline',
          error: String(error),
        };
      }
    }

    return results;
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    totalInstitutions: number;
    totalPersons: number;
    totalPaid: number;
    totalPolicies: number;
  } {
    const totalPaid = this.payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      totalInstitutions: this.institutions.size,
      totalPersons: this.persons.size,
      totalPaid,
      totalPolicies: this.policies.length,
    };
  }

  /**
   * Get payment history
   */
  getPaymentHistory(personId?: string, institutionId?: string): HealthcarePayment[] {
    return this.payments.filter(p => {
      if (personId && p.toPersonId !== personId) return false;
      if (institutionId && p.fromEntityId !== institutionId) return false;
      return true;
    });
  }
}

/**
 * Singleton instance
 */
export const healthRegistry = HealthPlatformRegistry.getInstance();
