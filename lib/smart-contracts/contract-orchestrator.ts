/**
 * Smart Contract Orchestrator
 * 
 * Manages multiple smart contracts with complete isolation:
 * - Each contract runs in isolated execution context
 * - Event systems are namespaced per contract
 * - State management is sandboxed
 * - Resources are monitored per contract
 * - No cross-contract interference
 * 
 * @module lib/smart-contracts/contract-orchestrator
 * @version 1.0.0
 */

import { EventEmitter } from "events";

// ============================================================================
// TYPES
// ============================================================================

export type ContractNamespace = string;

export type IsolationLevel = 
  | "full"       // Complete isolation - no shared resources
  | "shared-read"  // Can read shared state, isolated writes
  | "collaborative"; // Can interact with approved contracts

export type ContractState = 
  | "created"
  | "initializing"
  | "running"
  | "paused"
  | "suspended"
  | "terminated"
  | "error";

export type ResourceLimit = {
  maxMemoryMB: number;
  maxExecutionTimeMs: number;
  maxStorageKB: number;
  maxEventsPerSecond: number;
  maxConcurrentCalls: number;
};

export type ContractInstance = {
  id: string;
  namespace: ContractNamespace;
  type: string;
  state: ContractState;
  isolationLevel: IsolationLevel;
  
  // Isolation context
  context: ContractContext;
  
  // Resources
  resourceLimits: ResourceLimit;
  resourceUsage: ResourceUsage;
  
  // Lifecycle
  createdAt: Date;
  lastActivityAt: Date;
  errorCount: number;
  
  // Permissions
  allowedInteractions: string[];
  blockedContracts: string[];
};

export type ContractContext = {
  storage: Map<string, unknown>;
  events: EventEmitter;
  timers: Set<NodeJS.Timeout>;
  pendingOperations: Set<string>;
  parentOrchestrator: ContractOrchestrator;
};

export type ResourceUsage = {
  memoryMB: number;
  storageKB: number;
  eventsEmitted: number;
  executionTimeMs: number;
  activeCalls: number;
};

export type ContractEvent = {
  contractId: string;
  namespace: ContractNamespace;
  eventType: string;
  payload: unknown;
  timestamp: Date;
  isolated: boolean;
};

export type InteractionRequest = {
  sourceContract: string;
  targetContract: string;
  method: string;
  args: unknown[];
  timestamp: Date;
};

export type InteractionResult = {
  success: boolean;
  result?: unknown;
  error?: string;
  executionTimeMs: number;
};

export type OrchestratorConfig = {
  maxContracts: number;
  defaultResourceLimits: ResourceLimit;
  enableMetrics: boolean;
  enableAuditLog: boolean;
  isolationMode: "strict" | "permissive";
};

// ============================================================================
// CONTRACT ORCHESTRATOR
// ============================================================================

export class ContractOrchestrator {
  private contracts: Map<string, ContractInstance> = new Map();
  private namespaces: Map<ContractNamespace, Set<string>> = new Map();
  private globalEvents: EventEmitter = new EventEmitter();
  private interactionLog: InteractionRequest[] = [];
  private auditLog: ContractEvent[] = [];
  private config: OrchestratorConfig;
  private initialized = false;

  // Resource monitoring
  private resourceMonitorInterval: NodeJS.Timeout | null = null;
  private readonly RESOURCE_CHECK_INTERVAL = 5000; // 5 seconds

  constructor(config?: Partial<OrchestratorConfig>) {
    this.config = {
      maxContracts: config?.maxContracts ?? 1000,
      defaultResourceLimits: config?.defaultResourceLimits ?? {
        maxMemoryMB: 128,
        maxExecutionTimeMs: 30000,
        maxStorageKB: 10240,
        maxEventsPerSecond: 100,
        maxConcurrentCalls: 10,
      },
      enableMetrics: config?.enableMetrics ?? true,
      enableAuditLog: config?.enableAuditLog ?? true,
      isolationMode: config?.isolationMode ?? "strict",
    };
  }

  // ==========================================================================
  // LIFECYCLE
  // ==========================================================================

  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log("[Orchestrator] Initializing contract orchestrator...");

    // Start resource monitoring
    if (this.config.enableMetrics) {
      this.resourceMonitorInterval = setInterval(
        () => this.monitorResources(),
        this.RESOURCE_CHECK_INTERVAL
      );
    }

    this.initialized = true;
    console.log("[Orchestrator] ✅ Contract orchestrator ready");
  }

  async shutdown(): Promise<void> {
    console.log("[Orchestrator] Shutting down...");

    // Stop resource monitoring
    if (this.resourceMonitorInterval) {
      clearInterval(this.resourceMonitorInterval);
      this.resourceMonitorInterval = null;
    }

    // Terminate all contracts
    const terminationPromises = Array.from(this.contracts.keys()).map(
      (id) => this.terminateContract(id)
    );
    await Promise.all(terminationPromises);

    this.contracts.clear();
    this.namespaces.clear();
    this.initialized = false;

    console.log("[Orchestrator] ✅ Shutdown complete");
  }

  // ==========================================================================
  // CONTRACT MANAGEMENT
  // ==========================================================================

  /**
   * Create a new isolated contract instance
   */
  async createContract(
    id: string,
    type: string,
    options?: {
      namespace?: ContractNamespace;
      isolationLevel?: IsolationLevel;
      resourceLimits?: Partial<ResourceLimit>;
      allowedInteractions?: string[];
    }
  ): Promise<ContractInstance> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (this.contracts.has(id)) {
      throw new Error(`Contract ${id} already exists`);
    }

    if (this.contracts.size >= this.config.maxContracts) {
      throw new Error(`Maximum contract limit (${this.config.maxContracts}) reached`);
    }

    const namespace = options?.namespace ?? `ns-${id}`;
    const isolationLevel = options?.isolationLevel ?? "full";

    // Create isolated context
    const context: ContractContext = {
      storage: new Map(),
      events: new EventEmitter(),
      timers: new Set(),
      pendingOperations: new Set(),
      parentOrchestrator: this,
    };

    // Merge resource limits
    const resourceLimits: ResourceLimit = {
      ...this.config.defaultResourceLimits,
      ...options?.resourceLimits,
    };

    const contract: ContractInstance = {
      id,
      namespace,
      type,
      state: "created",
      isolationLevel,
      context,
      resourceLimits,
      resourceUsage: {
        memoryMB: 0,
        storageKB: 0,
        eventsEmitted: 0,
        executionTimeMs: 0,
        activeCalls: 0,
      },
      createdAt: new Date(),
      lastActivityAt: new Date(),
      errorCount: 0,
      allowedInteractions: options?.allowedInteractions ?? [],
      blockedContracts: [],
    };

    // Register in namespace
    if (!this.namespaces.has(namespace)) {
      this.namespaces.set(namespace, new Set());
    }
    this.namespaces.get(namespace)!.add(id);

    // Store contract
    this.contracts.set(id, contract);

    // Emit creation event (isolated to this contract)
    this.emitContractEvent(id, "created", { type, namespace });

    console.log(`[Orchestrator] Contract ${id} created in namespace ${namespace}`);

    return contract;
  }

  /**
   * Initialize a contract (must be called before execution)
   */
  async initializeContract(id: string, initArgs?: unknown): Promise<void> {
    const contract = this.getContractOrThrow(id);

    if (contract.state !== "created") {
      throw new Error(`Contract ${id} cannot be initialized from state ${contract.state}`);
    }

    contract.state = "initializing";
    this.updateActivity(contract);

    try {
      // Perform any initialization logic
      this.emitContractEvent(id, "initializing", { initArgs });

      // Mark as running
      contract.state = "running";
      this.emitContractEvent(id, "initialized", { timestamp: new Date() });

      console.log(`[Orchestrator] Contract ${id} initialized`);
    } catch (error) {
      contract.state = "error";
      contract.errorCount++;
      throw error;
    }
  }

  /**
   * Pause a running contract
   */
  async pauseContract(id: string): Promise<void> {
    const contract = this.getContractOrThrow(id);

    if (contract.state !== "running") {
      throw new Error(`Contract ${id} cannot be paused from state ${contract.state}`);
    }

    contract.state = "paused";
    this.updateActivity(contract);
    this.emitContractEvent(id, "paused", {});

    console.log(`[Orchestrator] Contract ${id} paused`);
  }

  /**
   * Resume a paused contract
   */
  async resumeContract(id: string): Promise<void> {
    const contract = this.getContractOrThrow(id);

    if (contract.state !== "paused") {
      throw new Error(`Contract ${id} cannot be resumed from state ${contract.state}`);
    }

    contract.state = "running";
    this.updateActivity(contract);
    this.emitContractEvent(id, "resumed", {});

    console.log(`[Orchestrator] Contract ${id} resumed`);
  }

  /**
   * Terminate and cleanup a contract
   */
  async terminateContract(id: string): Promise<void> {
    const contract = this.contracts.get(id);
    if (!contract) return;

    contract.state = "terminated";

    // Cleanup timers
    for (const timer of contract.context.timers) {
      clearTimeout(timer);
    }
    contract.context.timers.clear();

    // Clear pending operations
    contract.context.pendingOperations.clear();

    // Remove from namespace
    const nsContracts = this.namespaces.get(contract.namespace);
    if (nsContracts) {
      nsContracts.delete(id);
      if (nsContracts.size === 0) {
        this.namespaces.delete(contract.namespace);
      }
    }

    // Remove contract
    this.contracts.delete(id);

    this.emitContractEvent(id, "terminated", {});
    console.log(`[Orchestrator] Contract ${id} terminated`);
  }

  // ==========================================================================
  // ISOLATED EXECUTION
  // ==========================================================================

  /**
   * Execute a method on a contract with full isolation
   */
  async executeIsolated<T>(
    contractId: string,
    method: string,
    args: unknown[] = []
  ): Promise<T> {
    const contract = this.getContractOrThrow(contractId);

    if (contract.state !== "running") {
      throw new Error(`Contract ${contractId} is not running (state: ${contract.state})`);
    }

    // Check concurrent call limit
    if (contract.resourceUsage.activeCalls >= contract.resourceLimits.maxConcurrentCalls) {
      throw new Error(`Contract ${contractId} exceeded concurrent call limit`);
    }

    const operationId = `${method}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    contract.context.pendingOperations.add(operationId);
    contract.resourceUsage.activeCalls++;

    const startTime = Date.now();

    try {
      // Wrap execution in timeout
      const result = await this.executeWithTimeout<T>(
        contract,
        method,
        args,
        contract.resourceLimits.maxExecutionTimeMs
      );

      // Update metrics
      contract.resourceUsage.executionTimeMs += Date.now() - startTime;
      this.updateActivity(contract);

      return result;
    } catch (error) {
      contract.errorCount++;
      throw error;
    } finally {
      contract.context.pendingOperations.delete(operationId);
      contract.resourceUsage.activeCalls--;
    }
  }

  private async executeWithTimeout<T>(
    contract: ContractInstance,
    method: string,
    args: unknown[],
    timeoutMs: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Contract ${contract.id} method ${method} timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      contract.context.timers.add(timeout);

      // Simulate method execution (in real implementation, this would execute actual contract logic)
      try {
        // The actual method execution would happen here
        // For now, we emit an event and return the args as result
        this.emitContractEvent(contract.id, "methodExecuted", { method, args });
        clearTimeout(timeout);
        contract.context.timers.delete(timeout);
        resolve({ method, args, executed: true } as T);
      } catch (error) {
        clearTimeout(timeout);
        contract.context.timers.delete(timeout);
        reject(error);
      }
    });
  }

  // ==========================================================================
  // CROSS-CONTRACT INTERACTION (WITH PERMISSION CHECKS)
  // ==========================================================================

  /**
   * Request interaction between contracts (only if permitted)
   */
  async requestInteraction(
    request: InteractionRequest
  ): Promise<InteractionResult> {
    const sourceContract = this.getContractOrThrow(request.sourceContract);
    const targetContract = this.contracts.get(request.targetContract);

    if (!targetContract) {
      return {
        success: false,
        error: `Target contract ${request.targetContract} not found`,
        executionTimeMs: 0,
      };
    }

    // Check isolation levels
    if (sourceContract.isolationLevel === "full") {
      return {
        success: false,
        error: "Source contract has full isolation - interactions not permitted",
        executionTimeMs: 0,
      };
    }

    if (targetContract.isolationLevel === "full") {
      return {
        success: false,
        error: "Target contract has full isolation - interactions not permitted",
        executionTimeMs: 0,
      };
    }

    // Check if interaction is allowed
    if (!sourceContract.allowedInteractions.includes(request.targetContract) &&
        !sourceContract.allowedInteractions.includes("*")) {
      return {
        success: false,
        error: `Interaction from ${request.sourceContract} to ${request.targetContract} not permitted`,
        executionTimeMs: 0,
      };
    }

    // Check if blocked
    if (targetContract.blockedContracts.includes(request.sourceContract)) {
      return {
        success: false,
        error: `Contract ${request.targetContract} has blocked ${request.sourceContract}`,
        executionTimeMs: 0,
      };
    }

    // Log interaction
    this.interactionLog.push(request);

    // Execute on target contract
    const startTime = Date.now();
    try {
      const result = await this.executeIsolated(
        request.targetContract,
        request.method,
        request.args
      );

      return {
        success: true,
        result,
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  // ==========================================================================
  // ISOLATED STORAGE
  // ==========================================================================

  /**
   * Get value from contract's isolated storage
   */
  getContractStorage<T>(contractId: string, key: string): T | undefined {
    const contract = this.getContractOrThrow(contractId);
    return contract.context.storage.get(key) as T | undefined;
  }

  /**
   * Set value in contract's isolated storage
   */
  setContractStorage(contractId: string, key: string, value: unknown): void {
    const contract = this.getContractOrThrow(contractId);

    // Check storage limit
    const currentSize = this.calculateStorageSize(contract.context.storage);
    const valueSize = this.estimateSize(value);

    if (currentSize + valueSize > contract.resourceLimits.maxStorageKB * 1024) {
      throw new Error(`Contract ${contractId} storage limit exceeded`);
    }

    contract.context.storage.set(key, value);
    contract.resourceUsage.storageKB = (currentSize + valueSize) / 1024;
    this.updateActivity(contract);
  }

  /**
   * Delete value from contract's isolated storage
   */
  deleteContractStorage(contractId: string, key: string): boolean {
    const contract = this.getContractOrThrow(contractId);
    const result = contract.context.storage.delete(key);
    contract.resourceUsage.storageKB = this.calculateStorageSize(contract.context.storage) / 1024;
    return result;
  }

  // ==========================================================================
  // EVENTS (NAMESPACED)
  // ==========================================================================

  /**
   * Emit event within contract's isolated namespace
   */
  emitContractEvent(contractId: string, eventType: string, payload: unknown): void {
    const contract = this.contracts.get(contractId);
    const namespace = contract?.namespace ?? "unknown";

    const event: ContractEvent = {
      contractId,
      namespace,
      eventType,
      payload,
      timestamp: new Date(),
      isolated: true,
    };

    // Emit to contract's local event emitter (isolated)
    if (contract) {
      contract.context.events.emit(eventType, event);
      contract.resourceUsage.eventsEmitted++;
    }

    // Log to audit if enabled
    if (this.config.enableAuditLog) {
      this.auditLog.push(event);
    }
  }

  /**
   * Subscribe to events within a contract (isolated)
   */
  onContractEvent(
    contractId: string,
    eventType: string,
    handler: (event: ContractEvent) => void
  ): void {
    const contract = this.getContractOrThrow(contractId);
    contract.context.events.on(eventType, handler);
  }

  /**
   * Emit global orchestrator event (non-isolated)
   */
  emitGlobalEvent(eventType: string, payload: unknown): void {
    this.globalEvents.emit(eventType, payload);
  }

  /**
   * Subscribe to global orchestrator events
   */
  onGlobalEvent(eventType: string, handler: (payload: unknown) => void): void {
    this.globalEvents.on(eventType, handler);
  }

  // ==========================================================================
  // RESOURCE MONITORING
  // ==========================================================================

  private monitorResources(): void {
    for (const [id, contract] of this.contracts) {
      // Check memory (estimated)
      const memUsage = this.estimateMemoryUsage(contract);
      contract.resourceUsage.memoryMB = memUsage;

      // Check if over limits
      if (memUsage > contract.resourceLimits.maxMemoryMB) {
        console.warn(`[Orchestrator] Contract ${id} exceeding memory limit`);
        this.emitContractEvent(id, "resourceWarning", {
          type: "memory",
          current: memUsage,
          limit: contract.resourceLimits.maxMemoryMB,
        });
      }

      // Check event rate
      if (contract.resourceUsage.eventsEmitted > contract.resourceLimits.maxEventsPerSecond * 60) {
        console.warn(`[Orchestrator] Contract ${id} high event rate`);
      }
    }
  }

  private estimateMemoryUsage(contract: ContractInstance): number {
    // Estimate memory based on storage size and pending operations
    const storageBytes = this.calculateStorageSize(contract.context.storage);
    const overheadBytes = contract.context.pendingOperations.size * 1024; // Estimate
    return (storageBytes + overheadBytes) / (1024 * 1024);
  }

  private calculateStorageSize(storage: Map<string, unknown>): number {
    let size = 0;
    for (const [key, value] of storage) {
      size += key.length * 2; // UTF-16
      size += this.estimateSize(value);
    }
    return size;
  }

  private estimateSize(value: unknown): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === "boolean") return 4;
    if (typeof value === "number") return 8;
    if (typeof value === "string") return value.length * 2;
    if (Array.isArray(value)) {
      return value.reduce((sum, v) => sum + this.estimateSize(v), 0);
    }
    if (typeof value === "object") {
      return JSON.stringify(value).length * 2;
    }
    return 0;
  }

  // ==========================================================================
  // QUERY METHODS
  // ==========================================================================

  getContract(id: string): ContractInstance | undefined {
    return this.contracts.get(id);
  }

  private getContractOrThrow(id: string): ContractInstance {
    const contract = this.contracts.get(id);
    if (!contract) {
      throw new Error(`Contract ${id} not found`);
    }
    return contract;
  }

  listContracts(): ContractInstance[] {
    return Array.from(this.contracts.values());
  }

  listContractsByNamespace(namespace: ContractNamespace): ContractInstance[] {
    const contractIds = this.namespaces.get(namespace);
    if (!contractIds) return [];

    return Array.from(contractIds)
      .map((id) => this.contracts.get(id))
      .filter((c): c is ContractInstance => c !== undefined);
  }

  getInteractionLog(contractId?: string): InteractionRequest[] {
    if (contractId) {
      return this.interactionLog.filter(
        (log) => log.sourceContract === contractId || log.targetContract === contractId
      );
    }
    return [...this.interactionLog];
  }

  getAuditLog(contractId?: string): ContractEvent[] {
    if (contractId) {
      return this.auditLog.filter((event) => event.contractId === contractId);
    }
    return [...this.auditLog];
  }

  getOrchestratorStats(): {
    totalContracts: number;
    contractsByState: Record<ContractState, number>;
    namespaceCount: number;
    totalInteractions: number;
    totalEvents: number;
  } {
    const contractsByState: Record<ContractState, number> = {
      created: 0,
      initializing: 0,
      running: 0,
      paused: 0,
      suspended: 0,
      terminated: 0,
      error: 0,
    };

    for (const contract of this.contracts.values()) {
      contractsByState[contract.state]++;
    }

    return {
      totalContracts: this.contracts.size,
      contractsByState,
      namespaceCount: this.namespaces.size,
      totalInteractions: this.interactionLog.length,
      totalEvents: this.auditLog.length,
    };
  }

  private updateActivity(contract: ContractInstance): void {
    contract.lastActivityAt = new Date();
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let orchestratorInstance: ContractOrchestrator | null = null;

export function getContractOrchestrator(config?: Partial<OrchestratorConfig>): ContractOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new ContractOrchestrator(config);
  }
  return orchestratorInstance;
}

export function resetOrchestrator(): void {
  if (orchestratorInstance) {
    orchestratorInstance.shutdown();
    orchestratorInstance = null;
  }
}
