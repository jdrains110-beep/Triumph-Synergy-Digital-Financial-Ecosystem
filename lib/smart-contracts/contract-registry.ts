/**
 * Contract Registry
 * 
 * Central registry for all smart contracts in the ecosystem:
 * - Tracks all deployed contracts across networks
 * - Maintains dependency graphs
 * - Prevents conflicting deployments
 * - Provides discovery and verification
 * 
 * @module lib/smart-contracts/contract-registry
 * @version 1.0.0
 */

// ============================================================================
// TYPES
// ============================================================================

export type NetworkType = 
  | "pi-mainnet" 
  | "pi-testnet" 
  | "stellar-mainnet" 
  | "stellar-testnet"
  | "ethereum-mainnet"
  | "polygon-mainnet";

export type ContractCategory =
  | "payment"
  | "escrow"
  | "token"
  | "nft"
  | "defi"
  | "governance"
  | "real-estate"
  | "identity"
  | "bridge"
  | "utility";

export type RegistryEntry = {
  // Identity
  contractId: string;
  address: string;
  network: NetworkType;
  
  // Metadata
  name: string;
  version: string;
  category: ContractCategory;
  description: string;
  
  // Ownership
  owner: string;
  deployer: string;
  
  // Status
  status: "active" | "paused" | "deprecated" | "archived";
  verified: boolean;
  auditStatus: "none" | "pending" | "passed" | "failed";
  
  // Dependencies - contracts this depends on
  dependencies: string[];
  
  // Dependents - contracts that depend on this one
  dependents: string[];
  
  // Resources
  resourceAllocation: {
    maxGasPerTx: number;
    maxStorageKB: number;
    priorityLevel: number;
  };
  
  // Permissions
  canInteractWith: string[]; // Contract IDs or "*" for all
  blockedFrom: string[];     // Contract IDs that cannot call this
  
  // Timestamps
  deployedAt: Date;
  lastInteractionAt: Date;
  lastAuditAt?: Date;
  
  // ABI Hash for verification
  abiHash: string;
};

export type DependencyEdge = {
  from: string;
  to: string;
  type: "calls" | "reads" | "writes" | "inherits";
  frequency: "high" | "medium" | "low";
};

export type ConflictCheck = {
  hasConflict: boolean;
  conflicts: {
    type: "address" | "name" | "resource" | "dependency";
    description: string;
    severity: "critical" | "warning" | "info";
    resolution?: string;
  }[];
};

export type RegistryStats = {
  totalContracts: number;
  byNetwork: Record<NetworkType, number>;
  byCategory: Record<ContractCategory, number>;
  byStatus: Record<string, number>;
  verifiedCount: number;
  totalDependencies: number;
};

// ============================================================================
// CONTRACT REGISTRY
// ============================================================================

class ContractRegistry {
  private entries: Map<string, RegistryEntry> = new Map();
  private addressIndex: Map<string, string> = new Map(); // address -> contractId
  private dependencyGraph: Map<string, Set<string>> = new Map();
  private dependentGraph: Map<string, Set<string>> = new Map();

  // ==========================================================================
  // REGISTRATION
  // ==========================================================================

  /**
   * Register a new contract
   */
  async register(entry: Omit<RegistryEntry, "dependents">): Promise<{
    success: boolean;
    contractId: string;
    conflicts?: ConflictCheck;
  }> {
    // Check for conflicts
    const conflicts = this.checkConflicts(entry);
    if (conflicts.hasConflict && conflicts.conflicts.some(c => c.severity === "critical")) {
      return {
        success: false,
        contractId: entry.contractId,
        conflicts,
      };
    }

    // Create full entry
    const fullEntry: RegistryEntry = {
      ...entry,
      dependents: [],
    };

    // Register
    this.entries.set(entry.contractId, fullEntry);
    this.addressIndex.set(`${entry.network}:${entry.address}`, entry.contractId);

    // Update dependency graph
    for (const depId of entry.dependencies) {
      // Add to this contract's dependencies
      if (!this.dependencyGraph.has(entry.contractId)) {
        this.dependencyGraph.set(entry.contractId, new Set());
      }
      this.dependencyGraph.get(entry.contractId)!.add(depId);

      // Add this contract as a dependent of the dependency
      if (!this.dependentGraph.has(depId)) {
        this.dependentGraph.set(depId, new Set());
      }
      this.dependentGraph.get(depId)!.add(entry.contractId);

      // Update the dependency's entry
      const depEntry = this.entries.get(depId);
      if (depEntry && !depEntry.dependents.includes(entry.contractId)) {
        depEntry.dependents.push(entry.contractId);
      }
    }

    console.log(`[Registry] Contract ${entry.contractId} registered on ${entry.network}`);

    return {
      success: true,
      contractId: entry.contractId,
      conflicts: conflicts.hasConflict ? conflicts : undefined,
    };
  }

  /**
   * Update an existing contract entry
   */
  async update(
    contractId: string,
    updates: Partial<RegistryEntry>
  ): Promise<{ success: boolean; error?: string }> {
    const entry = this.entries.get(contractId);
    if (!entry) {
      return { success: false, error: "Contract not found" };
    }

    // Apply updates
    Object.assign(entry, updates);
    entry.lastInteractionAt = new Date();

    console.log(`[Registry] Contract ${contractId} updated`);

    return { success: true };
  }

  /**
   * Unregister a contract
   */
  async unregister(contractId: string): Promise<{
    success: boolean;
    affectedDependents?: string[];
    error?: string;
  }> {
    const entry = this.entries.get(contractId);
    if (!entry) {
      return { success: false, error: "Contract not found" };
    }

    // Check for dependents
    const dependents = this.dependentGraph.get(contractId);
    if (dependents && dependents.size > 0) {
      return {
        success: false,
        affectedDependents: Array.from(dependents),
        error: `Cannot unregister: ${dependents.size} contracts depend on this`,
      };
    }

    // Remove from indices
    this.addressIndex.delete(`${entry.network}:${entry.address}`);
    
    // Remove from dependency graph
    const deps = this.dependencyGraph.get(contractId);
    if (deps) {
      for (const depId of deps) {
        const depDependents = this.dependentGraph.get(depId);
        if (depDependents) {
          depDependents.delete(contractId);
        }
      }
      this.dependencyGraph.delete(contractId);
    }

    // Remove entry
    this.entries.delete(contractId);

    console.log(`[Registry] Contract ${contractId} unregistered`);

    return { success: true };
  }

  // ==========================================================================
  // CONFLICT DETECTION
  // ==========================================================================

  /**
   * Check for conflicts before registration
   */
  checkConflicts(entry: Partial<RegistryEntry>): ConflictCheck {
    const conflicts: ConflictCheck["conflicts"] = [];

    // Check address conflict
    if (entry.network && entry.address) {
      const existingId = this.addressIndex.get(`${entry.network}:${entry.address}`);
      if (existingId && existingId !== entry.contractId) {
        conflicts.push({
          type: "address",
          description: `Address ${entry.address} already registered as ${existingId}`,
          severity: "critical",
        });
      }
    }

    // Check name conflict (within same network)
    if (entry.name && entry.network) {
      for (const existing of this.entries.values()) {
        if (existing.name === entry.name && 
            existing.network === entry.network &&
            existing.contractId !== entry.contractId) {
          conflicts.push({
            type: "name",
            description: `Contract name "${entry.name}" already exists on ${entry.network}`,
            severity: "warning",
            resolution: "Consider using a unique name or versioning",
          });
        }
      }
    }

    // Check dependency validity
    if (entry.dependencies) {
      for (const depId of entry.dependencies) {
        if (!this.entries.has(depId)) {
          conflicts.push({
            type: "dependency",
            description: `Dependency ${depId} not found in registry`,
            severity: "warning",
            resolution: "Register dependency first or verify contract ID",
          });
        }
      }
    }

    // Check circular dependencies
    if (entry.contractId && entry.dependencies) {
      const circular = this.detectCircularDependency(entry.contractId, entry.dependencies);
      if (circular) {
        conflicts.push({
          type: "dependency",
          description: `Circular dependency detected: ${circular.join(" -> ")}`,
          severity: "critical",
        });
      }
    }

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
    };
  }

  /**
   * Detect circular dependencies
   */
  private detectCircularDependency(
    contractId: string,
    dependencies: string[],
    visited: Set<string> = new Set()
  ): string[] | null {
    visited.add(contractId);

    for (const depId of dependencies) {
      if (depId === contractId) {
        return [contractId, depId];
      }

      if (visited.has(depId)) {
        return [contractId, depId];
      }

      const depEntry = this.entries.get(depId);
      if (depEntry) {
        const circular = this.detectCircularDependency(depId, depEntry.dependencies, visited);
        if (circular) {
          return [contractId, ...circular];
        }
      }
    }

    visited.delete(contractId);
    return null;
  }

  // ==========================================================================
  // PERMISSION CHECKS
  // ==========================================================================

  /**
   * Check if one contract can interact with another
   */
  canInteract(sourceId: string, targetId: string): {
    allowed: boolean;
    reason?: string;
  } {
    const source = this.entries.get(sourceId);
    const target = this.entries.get(targetId);

    if (!source) {
      return { allowed: false, reason: "Source contract not found" };
    }

    if (!target) {
      return { allowed: false, reason: "Target contract not found" };
    }

    // Check if source is blocked by target
    if (target.blockedFrom.includes(sourceId)) {
      return { allowed: false, reason: "Source is blocked by target" };
    }

    // Check if source can interact with target
    if (source.canInteractWith.includes("*") || source.canInteractWith.includes(targetId)) {
      return { allowed: true };
    }

    // Check dependency relationship
    if (source.dependencies.includes(targetId) || target.dependencies.includes(sourceId)) {
      return { allowed: true };
    }

    return { allowed: false, reason: "No interaction permission configured" };
  }

  /**
   * Grant interaction permission
   */
  grantInteraction(sourceId: string, targetId: string): boolean {
    const source = this.entries.get(sourceId);
    if (!source) return false;

    if (!source.canInteractWith.includes(targetId)) {
      source.canInteractWith.push(targetId);
    }
    return true;
  }

  /**
   * Block interaction
   */
  blockInteraction(targetId: string, blockSourceId: string): boolean {
    const target = this.entries.get(targetId);
    if (!target) return false;

    if (!target.blockedFrom.includes(blockSourceId)) {
      target.blockedFrom.push(blockSourceId);
    }
    return true;
  }

  // ==========================================================================
  // QUERIES
  // ==========================================================================

  /**
   * Get contract by ID
   */
  get(contractId: string): RegistryEntry | undefined {
    return this.entries.get(contractId);
  }

  /**
   * Get contract by address
   */
  getByAddress(network: NetworkType, address: string): RegistryEntry | undefined {
    const contractId = this.addressIndex.get(`${network}:${address}`);
    if (contractId) {
      return this.entries.get(contractId);
    }
    return undefined;
  }

  /**
   * List all contracts
   */
  list(filter?: {
    network?: NetworkType;
    category?: ContractCategory;
    status?: RegistryEntry["status"];
    verified?: boolean;
  }): RegistryEntry[] {
    let results = Array.from(this.entries.values());

    if (filter?.network) {
      results = results.filter(e => e.network === filter.network);
    }
    if (filter?.category) {
      results = results.filter(e => e.category === filter.category);
    }
    if (filter?.status) {
      results = results.filter(e => e.status === filter.status);
    }
    if (filter?.verified !== undefined) {
      results = results.filter(e => e.verified === filter.verified);
    }

    return results;
  }

  /**
   * Get dependency tree for a contract
   */
  getDependencyTree(contractId: string, depth = 3): {
    contractId: string;
    dependencies: ReturnType<ContractRegistry["getDependencyTree"]>[];
  } {
    const entry = this.entries.get(contractId);
    if (!entry || depth <= 0) {
      return { contractId, dependencies: [] };
    }

    return {
      contractId,
      dependencies: entry.dependencies.map(depId => 
        this.getDependencyTree(depId, depth - 1)
      ),
    };
  }

  /**
   * Get all contracts that depend on a given contract
   */
  getDependents(contractId: string): string[] {
    const dependents = this.dependentGraph.get(contractId);
    return dependents ? Array.from(dependents) : [];
  }

  /**
   * Get registry statistics
   */
  getStats(): RegistryStats {
    const stats: RegistryStats = {
      totalContracts: this.entries.size,
      byNetwork: {} as Record<NetworkType, number>,
      byCategory: {} as Record<ContractCategory, number>,
      byStatus: {},
      verifiedCount: 0,
      totalDependencies: 0,
    };

    for (const entry of this.entries.values()) {
      // By network
      stats.byNetwork[entry.network] = (stats.byNetwork[entry.network] || 0) + 1;
      
      // By category
      stats.byCategory[entry.category] = (stats.byCategory[entry.category] || 0) + 1;
      
      // By status
      stats.byStatus[entry.status] = (stats.byStatus[entry.status] || 0) + 1;
      
      // Verified
      if (entry.verified) stats.verifiedCount++;
      
      // Dependencies
      stats.totalDependencies += entry.dependencies.length;
    }

    return stats;
  }

  /**
   * Verify dependency health - check all dependencies are active
   */
  verifyDependencyHealth(contractId: string): {
    healthy: boolean;
    issues: { depId: string; status: string; issue: string }[];
  } {
    const entry = this.entries.get(contractId);
    if (!entry) {
      return { healthy: false, issues: [{ depId: contractId, status: "unknown", issue: "Contract not found" }] };
    }

    const issues: { depId: string; status: string; issue: string }[] = [];

    for (const depId of entry.dependencies) {
      const dep = this.entries.get(depId);
      if (!dep) {
        issues.push({ depId, status: "missing", issue: "Dependency not in registry" });
      } else if (dep.status !== "active") {
        issues.push({ depId, status: dep.status, issue: `Dependency is ${dep.status}` });
      } else if (!dep.verified) {
        issues.push({ depId, status: "unverified", issue: "Dependency not verified" });
      }
    }

    return {
      healthy: issues.length === 0,
      issues,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let registryInstance: ContractRegistry | null = null;

export function getContractRegistry(): ContractRegistry {
  if (!registryInstance) {
    registryInstance = new ContractRegistry();
  }
  return registryInstance;
}

export function resetRegistry(): void {
  registryInstance = null;
}
