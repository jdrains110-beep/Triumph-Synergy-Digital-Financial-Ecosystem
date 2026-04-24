/**
 * Contract Registry API
 * 
 * Central registry for all smart contracts:
 * - Register and track deployed contracts
 * - Manage dependencies and prevent conflicts
 * - Control inter-contract permissions
 * - Verify contract relationships
 */

import { type NextRequest, NextResponse } from "next/server";
import { 
  getContractRegistry,
  type ContractCategory,
  type NetworkType,
  type RegistryEntry,
} from "@/lib/smart-contracts/contract-registry";

const registry = getContractRegistry();

// GET: Query registry
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const contractId = searchParams.get("contractId");
  const network = searchParams.get("network") as NetworkType | null;
  const address = searchParams.get("address");

  try {
    switch (action) {
      case "list": {
        const filter: Parameters<typeof registry.list>[0] = {};
        if (network) filter.network = network;
        const category = searchParams.get("category") as ContractCategory | null;
        if (category) filter.category = category;
        const status = searchParams.get("status") as RegistryEntry["status"] | null;
        if (status) filter.status = status;
        const verified = searchParams.get("verified");
        if (verified !== null) filter.verified = verified === "true";

        const contracts = registry.list(filter);
        return NextResponse.json({
          success: true,
          contracts: contracts.map(c => ({
            contractId: c.contractId,
            address: c.address,
            network: c.network,
            name: c.name,
            category: c.category,
            status: c.status,
            verified: c.verified,
            dependencyCount: c.dependencies.length,
            dependentCount: c.dependents.length,
          })),
          total: contracts.length,
        });
      }

      case "get": {
        if (!contractId) {
          return NextResponse.json(
            { success: false, error: "Contract ID required" },
            { status: 400 }
          );
        }
        const contract = registry.get(contractId);
        if (!contract) {
          return NextResponse.json(
            { success: false, error: "Contract not found" },
            { status: 404 }
          );
        }
        return NextResponse.json({ success: true, contract });
      }

      case "by-address": {
        if (!network || !address) {
          return NextResponse.json(
            { success: false, error: "Network and address required" },
            { status: 400 }
          );
        }
        const contract = registry.getByAddress(network, address);
        if (!contract) {
          return NextResponse.json(
            { success: false, error: "Contract not found" },
            { status: 404 }
          );
        }
        return NextResponse.json({ success: true, contract });
      }

      case "dependencies": {
        if (!contractId) {
          return NextResponse.json(
            { success: false, error: "Contract ID required" },
            { status: 400 }
          );
        }
        const depth = parseInt(searchParams.get("depth") || "3", 10);
        const tree = registry.getDependencyTree(contractId, Math.min(depth, 10));
        return NextResponse.json({ success: true, dependencyTree: tree });
      }

      case "dependents": {
        if (!contractId) {
          return NextResponse.json(
            { success: false, error: "Contract ID required" },
            { status: 400 }
          );
        }
        const dependents = registry.getDependents(contractId);
        return NextResponse.json({ success: true, contractId, dependents });
      }

      case "health": {
        if (!contractId) {
          return NextResponse.json(
            { success: false, error: "Contract ID required" },
            { status: 400 }
          );
        }
        const health = registry.verifyDependencyHealth(contractId);
        return NextResponse.json({ success: true, ...health });
      }

      case "can-interact": {
        const sourceId = searchParams.get("source");
        const targetId = searchParams.get("target");
        if (!sourceId || !targetId) {
          return NextResponse.json(
            { success: false, error: "Source and target contract IDs required" },
            { status: 400 }
          );
        }
        const result = registry.canInteract(sourceId, targetId);
        return NextResponse.json({ success: true, ...result });
      }

      case "stats": {
        const stats = registry.getStats();
        return NextResponse.json({ success: true, stats });
      }

      case "check-conflicts": {
        if (!contractId) {
          return NextResponse.json(
            { success: false, error: "Contract ID required" },
            { status: 400 }
          );
        }
        const name = searchParams.get("name") || undefined;
        const dependencies = searchParams.get("dependencies")?.split(",").filter(Boolean) || [];
        
        const conflicts = registry.checkConflicts({
          contractId,
          name,
          network: network || undefined,
          address: address || undefined,
          dependencies,
        });
        
        return NextResponse.json({ success: true, ...conflicts });
      }

      default:
        return NextResponse.json({
          success: true,
          api: "Contract Registry API",
          version: "1.0.0",
          description: "Central registry for smart contracts with dependency management",
          features: {
            registration: "Register contracts with metadata and dependencies",
            conflictDetection: "Detect address, name, and dependency conflicts",
            permissions: "Control inter-contract interactions",
            healthCheck: "Verify dependency health status",
          },
          endpoints: {
            "GET ?action=list": "List all contracts (with optional filters)",
            "GET ?action=get&contractId=X": "Get contract details",
            "GET ?action=by-address&network=X&address=Y": "Get by address",
            "GET ?action=dependencies&contractId=X": "Get dependency tree",
            "GET ?action=dependents&contractId=X": "Get contracts that depend on this",
            "GET ?action=health&contractId=X": "Check dependency health",
            "GET ?action=can-interact&source=X&target=Y": "Check interaction permission",
            "GET ?action=stats": "Get registry statistics",
            "GET ?action=check-conflicts": "Check for potential conflicts",
            "POST /register": "Register a new contract",
            "POST /update": "Update contract metadata",
            "POST /unregister": "Remove contract from registry",
            "POST /grant-interaction": "Grant interaction permission",
            "POST /block-interaction": "Block interaction from a contract",
          },
        });
    }
  } catch (error) {
    console.error("[Registry API] GET error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST: Manage registry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "register": {
        const {
          contractId,
          address,
          network,
          name,
          version,
          category,
          description,
          owner,
          deployer,
          dependencies,
          canInteractWith,
          blockedFrom,
          resourceAllocation,
          abiHash,
        } = body;

        if (!contractId || !address || !network || !name || !category) {
          return NextResponse.json(
            { success: false, error: "Required fields: contractId, address, network, name, category" },
            { status: 400 }
          );
        }

        const entry: Omit<RegistryEntry, "dependents"> = {
          contractId,
          address,
          network: network as NetworkType,
          name,
          version: version || "1.0.0",
          category: category as ContractCategory,
          description: description || "",
          owner: owner || "",
          deployer: deployer || owner || "",
          status: "active",
          verified: false,
          auditStatus: "none",
          dependencies: dependencies || [],
          resourceAllocation: resourceAllocation || {
            maxGasPerTx: 1000000,
            maxStorageKB: 1024,
            priorityLevel: 5,
          },
          canInteractWith: canInteractWith || [],
          blockedFrom: blockedFrom || [],
          deployedAt: new Date(),
          lastInteractionAt: new Date(),
          abiHash: abiHash || "",
        };

        const result = await registry.register(entry);

        return NextResponse.json({
          success: result.success,
          contractId: result.contractId,
          conflicts: result.conflicts,
          message: result.success 
            ? `Contract ${contractId} registered successfully`
            : "Registration failed due to conflicts",
        }, { status: result.success ? 201 : 400 });
      }

      case "update": {
        const { contractId, ...updates } = body;
        
        if (!contractId) {
          return NextResponse.json(
            { success: false, error: "Contract ID required" },
            { status: 400 }
          );
        }

        // Remove action and contractId from updates
        delete updates.action;

        const result = await registry.update(contractId, updates);

        return NextResponse.json({
          success: result.success,
          error: result.error,
          message: result.success ? `Contract ${contractId} updated` : result.error,
        });
      }

      case "unregister": {
        const { contractId, force } = body;
        
        if (!contractId) {
          return NextResponse.json(
            { success: false, error: "Contract ID required" },
            { status: 400 }
          );
        }

        const result = await registry.unregister(contractId);

        if (!result.success && result.affectedDependents && force) {
          // Force unregister - would need to update dependents first
          return NextResponse.json({
            success: false,
            error: result.error,
            affectedDependents: result.affectedDependents,
            hint: "Update or unregister dependent contracts first",
          }, { status: 400 });
        }

        return NextResponse.json({
          success: result.success,
          error: result.error,
          affectedDependents: result.affectedDependents,
        });
      }

      case "grant-interaction": {
        const { sourceId, targetId } = body;
        
        if (!sourceId || !targetId) {
          return NextResponse.json(
            { success: false, error: "Source and target IDs required" },
            { status: 400 }
          );
        }

        const granted = registry.grantInteraction(sourceId, targetId);

        return NextResponse.json({
          success: granted,
          message: granted 
            ? `${sourceId} can now interact with ${targetId}`
            : "Failed to grant interaction permission",
        });
      }

      case "block-interaction": {
        const { targetId, blockSourceId } = body;
        
        if (!targetId || !blockSourceId) {
          return NextResponse.json(
            { success: false, error: "Target and block source IDs required" },
            { status: 400 }
          );
        }

        const blocked = registry.blockInteraction(targetId, blockSourceId);

        return NextResponse.json({
          success: blocked,
          message: blocked 
            ? `${blockSourceId} is now blocked from ${targetId}`
            : "Failed to block interaction",
        });
      }

      case "verify": {
        const { contractId, verified, auditStatus, abiHash } = body;
        
        if (!contractId) {
          return NextResponse.json(
            { success: false, error: "Contract ID required" },
            { status: 400 }
          );
        }

        const updates: Partial<RegistryEntry> = {};
        if (verified !== undefined) updates.verified = verified;
        if (auditStatus) updates.auditStatus = auditStatus;
        if (abiHash) updates.abiHash = abiHash;
        if (auditStatus === "passed") updates.lastAuditAt = new Date();

        const result = await registry.update(contractId, updates);

        return NextResponse.json({
          success: result.success,
          contractId,
          verified: updates.verified,
          auditStatus: updates.auditStatus,
        });
      }

      default:
        return NextResponse.json(
          { 
            success: false, 
            error: "Unknown action",
            validActions: ["register", "update", "unregister", "grant-interaction", "block-interaction", "verify"],
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[Registry API] POST error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
