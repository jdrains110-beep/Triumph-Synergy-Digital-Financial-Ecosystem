/**
 * lib/ecosystem/application-registry.ts
 * Extensible application registry for integrating third-party apps
 * 
 * Allows the Triumph Synergy ecosystem to extend with additional applications
 * while maintaining consistent Pi Payment handling across all integrated apps
 */

export interface PiPaymentConfig {
  appId: string;
  apiKey?: string;
  apiSecret?: string;
  callbackUrl: string;
  sandbox?: boolean;
}

export interface RegisteredApplication {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  apiEndpoint: string;
  paymentConfig: PiPaymentConfig;
  categories: string[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  features: string[];
}

export interface ApplicationIntegration {
  appId: string;
  name: string;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  executePayment: (config: PaymentExecutionConfig) => Promise<PaymentResult>;
  getStatus: () => Promise<ApplicationStatus>;
  healthCheck: () => Promise<boolean>;
}

export interface PaymentExecutionConfig {
  amount: number;
  memo: string;
  metadata?: Record<string, unknown>;
  userId?: string;
  appId: string;
}

export interface PaymentResult {
  transactionId: string;
  status: "pending" | "approved" | "completed" | "failed" | "cancelled";
  amount: number;
  timestamp: Date;
  blockchainHash?: string;
  error?: string;
}

export interface ApplicationStatus {
  appId: string;
  connected: boolean;
  healthy: boolean;
  lastChecked: Date;
  piPaymentReady: boolean;
  errorMessage?: string;
}

// =============================================================================
// APPLICATION REGISTRY
// =============================================================================

export class ApplicationRegistry {
  private static instance: ApplicationRegistry | null = null;
  private applications: Map<string, RegisteredApplication> = new Map();
  private integrations: Map<string, ApplicationIntegration> = new Map();

  private constructor() {
    console.log("[ApplicationRegistry] Initialized");
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ApplicationRegistry {
    if (!this.instance) {
      this.instance = new ApplicationRegistry();
    }
    return this.instance;
  }

  /**
   * Register a new application
   */
  registerApplication(
    app: RegisteredApplication,
    integration: ApplicationIntegration
  ): void {
    if (this.applications.has(app.id)) {
      console.warn(`[ApplicationRegistry] Application ${app.id} already registered`);
      return;
    }

    this.applications.set(app.id, {
      ...app,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    this.integrations.set(app.id, integration);

    console.log(
      `[ApplicationRegistry] ✓ Registered application: ${app.name} (${app.id})`
    );
  }

  /**
   * Get registered application
   */
  getApplication(appId: string): RegisteredApplication | undefined {
    return this.applications.get(appId);
  }

  /**
   * Get application integration
   */
  getIntegration(appId: string): ApplicationIntegration | undefined {
    return this.integrations.get(appId);
  }

  /**
   * List all registered applications
   */
  listApplications(enabledOnly = false): RegisteredApplication[] {
    const apps = Array.from(this.applications.values());
    return enabledOnly ? apps.filter((app) => app.enabled) : apps;
  }

  /**
   * Enable application
   */
  enableApplication(appId: string): boolean {
    const app = this.applications.get(appId);
    if (!app) return false;

    app.enabled = true;
    app.updatedAt = new Date();
    console.log(`[ApplicationRegistry] ✓ Enabled: ${app.name}`);
    return true;
  }

  /**
   * Disable application
   */
  disableApplication(appId: string): boolean {
    const app = this.applications.get(appId);
    if (!app) return false;

    app.enabled = false;
    app.updatedAt = new Date();
    console.log(`[ApplicationRegistry] ✓ Disabled: ${app.name}`);
    return true;
  }

  /**
   * Update application
   */
  updateApplication(appId: string, updates: Partial<RegisteredApplication>): boolean {
    const app = this.applications.get(appId);
    if (!app) return false;

    Object.assign(app, updates, { updatedAt: new Date() });
    console.log(`[ApplicationRegistry] ✓ Updated: ${app.name}`);
    return true;
  }

  /**
   * Execute payment through application
   */
  async executePayment(config: PaymentExecutionConfig): Promise<PaymentResult> {
    const integration = this.integrations.get(config.appId);
    if (!integration) {
      throw new Error(`Application ${config.appId} not found`);
    }

    const app = this.applications.get(config.appId);
    if (!app || !app.enabled) {
      throw new Error(`Application ${config.appId} is not enabled`);
    }

    try {
      console.log(`[ApplicationRegistry] Executing payment through ${app.name}`);
      const result = await integration.executePayment(config);
      return result;
    } catch (error) {
      console.error(`[ApplicationRegistry] Payment failed for ${app.name}:`, error);
      throw error;
    }
  }

  /**
   * Health check all applications
   */
  async healthCheckAll(): Promise<Map<string, ApplicationStatus>> {
    const statuses = new Map<string, ApplicationStatus>();

    for (const [appId, integration] of this.integrations) {
      try {
        const healthy = await integration.healthCheck();
        const status = await integration.getStatus();
        statuses.set(appId, { ...status, healthy });
      } catch (error) {
        statuses.set(appId, {
          appId,
          connected: false,
          healthy: false,
          lastChecked: new Date(),
          piPaymentReady: false,
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return statuses;
  }

  /**
   * Get registry summary
   */
  getSummary(): {
    total: number;
    enabled: number;
    disabled: number;
    applications: string[];
  } {
    const apps = Array.from(this.applications.values());
    return {
      total: apps.length,
      enabled: apps.filter((a) => a.enabled).length,
      disabled: apps.filter((a) => !a.enabled).length,
      applications: apps.map((a) => `${a.name} (${a.id})`),
    };
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const applicationRegistry = ApplicationRegistry.getInstance();

/**
 * Register an application with the ecosystem
 */
export function registerApplication(
  app: RegisteredApplication,
  integration: ApplicationIntegration
): void {
  applicationRegistry.registerApplication(app, integration);
}

/**
 * Execute payment through integrated application
 */
export async function executeApplicationPayment(
  config: PaymentExecutionConfig
): Promise<PaymentResult> {
  return applicationRegistry.executePayment(config);
}

/**
 * Get all applications in registry
 */
export function getRegisteredApplications(enabledOnly = false): RegisteredApplication[] {
  return applicationRegistry.listApplications(enabledOnly);
}

/**
 * Get application status
 */
export async function getApplicationStatus(
  appId: string
): Promise<ApplicationStatus | null> {
  const integration = applicationRegistry.getIntegration(appId);
  if (!integration) return null;

  return integration.getStatus();
}
