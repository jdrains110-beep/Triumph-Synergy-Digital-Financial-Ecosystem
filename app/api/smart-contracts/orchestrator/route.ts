/**
 * Contract Orchestrator API
 * 
 * Manages multiple smart contracts with complete isolation:
 * - Create and manage isolated contract instances
 * - Execute methods with sandboxing
 * - Monitor resource usage
 * - Control cross-contract interactions
 * 
 * No interference between contracts - each runs in its own context
 */

import { type NextRequest, NextResponse } from "next/server";
import { 
  getContractOrchestrator,
  type IsolationLevel,
  type ResourceLimit,
} from "@/lib/smart-contracts/contract-orchestrator";

const orchestrator = getContractOrchestrator({
  maxContracts: 1000,
  enableMetrics: true,
  enableAuditLog: true,
  isolationMode: "strict",
});

// GET: Query contracts and stats
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const contractId = searchParams.get("contractId");
  const namespace = searchParams.get("namespace");

  try {
    await orchestrator.initialize();

    switch (action) {
      case "list": {
        const contracts = orchestrator.listContracts().map(c => ({
          id: c.id,
          namespace: c.namespace,
          type: c.type,
          state: c.state,
          isolationLevel: c.isolationLevel,
          createdAt: c.createdAt,
          lastActivityAt: c.lastActivityAt,
          errorCount: c.errorCount,
          resourceUsage: c.resourceUsage,
        }));
        return NextResponse.json({ success: true, contracts });
      }

      case "get": {
        if (!contractId) {
          return NextResponse.json(
            { success: false, error: "Contract ID required" },
            { status: 400 }
          );
        }
        const contract = orchestrator.getContract(contractId);
        if (!contract) {
          return NextResponse.json(
            { success: false, error: "Contract not found" },
            { status: 404 }
          );
        }
        return NextResponse.json({
          success: true,
          contract: {
            id: contract.id,
            namespace: contract.namespace,
            type: contract.type,
            state: contract.state,
            isolationLevel: contract.isolationLevel,
            resourceLimits: contract.resourceLimits,
            resourceUsage: contract.resourceUsage,
            createdAt: contract.createdAt,
            lastActivityAt: contract.lastActivityAt,
            errorCount: contract.errorCount,
            allowedInteractions: contract.allowedInteractions,
            blockedContracts: contract.blockedContracts,
          },
        });
      }

      case "namespace": {
        if (!namespace) {
          return NextResponse.json(
            { success: false, error: "Namespace required" },
            { status: 400 }
          );
        }
        const contracts = orchestrator.listContractsByNamespace(namespace).map(c => ({
          id: c.id,
          type: c.type,
          state: c.state,
        }));
        return NextResponse.json({ success: true, namespace, contracts });
      }

      case "stats": {
        const stats = orchestrator.getOrchestratorStats();
        return NextResponse.json({ success: true, stats });
      }

      case "interactions": {
        const log = orchestrator.getInteractionLog(contractId || undefined);
        return NextResponse.json({ success: true, interactions: log });
      }

      case "audit": {
        const events = orchestrator.getAuditLog(contractId || undefined);
        return NextResponse.json({ 
          success: true, 
          events: events.slice(-100), // Last 100 events
          total: events.length,
        });
      }

      case "storage": {
        if (!contractId) {
          return NextResponse.json(
            { success: false, error: "Contract ID required" },
            { status: 400 }
          );
        }
        const key = searchParams.get("key");
        if (key) {
          const value = orchestrator.getContractStorage(contractId, key);
          return NextResponse.json({ success: true, key, value });
        }
        // Return all storage keys (not values for security)
        const contract = orchestrator.getContract(contractId);
        if (!contract) {
          return NextResponse.json(
            { success: false, error: "Contract not found" },
            { status: 404 }
          );
        }
        const keys = Array.from(contract.context.storage.keys());
        return NextResponse.json({ success: true, storageKeys: keys });
      }

      default:
        return NextResponse.json({
          success: true,
          api: "Contract Orchestrator API",
          version: "1.0.0",
          description: "Manage multiple smart contracts with complete isolation",
          features: {
            isolation: "Each contract runs in isolated execution context",
            namespacing: "Contracts organized by namespaces",
            resourceLimits: "Memory, storage, execution time limits per contract",
            permissions: "Controlled cross-contract interactions",
            auditLog: "Full event and interaction logging",
          },
          endpoints: {
            "GET ?action=list": "List all contracts",
            "GET ?action=get&contractId=X": "Get contract details",
            "GET ?action=namespace&namespace=X": "List contracts in namespace",
            "GET ?action=stats": "Get orchestrator statistics",
            "GET ?action=interactions&contractId=X": "Get interaction log",
            "GET ?action=audit&contractId=X": "Get audit events",
            "GET ?action=storage&contractId=X&key=Y": "Get storage value",
            "POST /create": "Create new isolated contract",
            "POST /initialize": "Initialize contract",
            "POST /execute": "Execute method on contract",
            "POST /pause": "Pause contract",
            "POST /resume": "Resume contract",
            "POST /terminate": "Terminate contract",
            "POST /interact": "Request cross-contract interaction",
            "POST /storage": "Set contract storage",
          },
        });
    }
  } catch (error) {
    console.error("[Orchestrator API] GET error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST: Manage contracts
export async function POST(request: NextRequest) {
  try {
    await orchestrator.initialize();

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "create": {
        const { id, type, namespace, isolationLevel, resourceLimits, allowedInteractions } = body;
        
        if (!id || !type) {
          return NextResponse.json(
            { success: false, error: "Contract ID and type required" },
            { status: 400 }
          );
        }

        const contract = await orchestrator.createContract(id, type, {
          namespace,
          isolationLevel: isolationLevel as IsolationLevel,
          resourceLimits: resourceLimits as Partial<ResourceLimit>,
          allowedInteractions,
        });

        return NextResponse.json({
          success: true,
          contract: {
            id: contract.id,
            namespace: contract.namespace,
            type: contract.type,
            state: contract.state,
            isolationLevel: contract.isolationLevel,
          },
          message: `Contract ${id} created with ${contract.isolationLevel} isolation`,
        }, { status: 201 });
      }

      case "initialize": {
        const { contractId, initArgs } = body;
        
        if (!contractId) {
          return NextResponse.json(
            { success: false, error: "Contract ID required" },
            { status: 400 }
          );
        }

        await orchestrator.initializeContract(contractId, initArgs);
        
        return NextResponse.json({
          success: true,
          contractId,
          state: "running",
          message: `Contract ${contractId} initialized and running`,
        });
      }

      case "execute": {
        const { contractId, method, args } = body;
        
        if (!contractId || !method) {
          return NextResponse.json(
            { success: false, error: "Contract ID and method required" },
            { status: 400 }
          );
        }

        const result = await orchestrator.executeIsolated(
          contractId,
          method,
          args || []
        );

        return NextResponse.json({
          success: true,
          contractId,
          method,
          result,
        });
      }

      case "pause": {
        const { contractId } = body;
        
        if (!contractId) {
          return NextResponse.json(
            { success: false, error: "Contract ID required" },
            { status: 400 }
          );
        }

        await orchestrator.pauseContract(contractId);
        
        return NextResponse.json({
          success: true,
          contractId,
          state: "paused",
        });
      }

      case "resume": {
        const { contractId } = body;
        
        if (!contractId) {
          return NextResponse.json(
            { success: false, error: "Contract ID required" },
            { status: 400 }
          );
        }

        await orchestrator.resumeContract(contractId);
        
        return NextResponse.json({
          success: true,
          contractId,
          state: "running",
        });
      }

      case "terminate": {
        const { contractId } = body;
        
        if (!contractId) {
          return NextResponse.json(
            { success: false, error: "Contract ID required" },
            { status: 400 }
          );
        }

        await orchestrator.terminateContract(contractId);
        
        return NextResponse.json({
          success: true,
          contractId,
          state: "terminated",
        });
      }

      case "interact": {
        const { sourceContract, targetContract, method, args } = body;
        
        if (!sourceContract || !targetContract || !method) {
          return NextResponse.json(
            { success: false, error: "Source, target, and method required" },
            { status: 400 }
          );
        }

        const result = await orchestrator.requestInteraction({
          sourceContract,
          targetContract,
          method,
          args: args || [],
          timestamp: new Date(),
        });

        return NextResponse.json({
          success: result.success,
          interaction: {
            sourceContract,
            targetContract,
            method,
          },
          result: result.result,
          error: result.error,
          executionTimeMs: result.executionTimeMs,
        });
      }

      case "storage": {
        const { contractId, key, value, operation } = body;
        
        if (!contractId || !key) {
          return NextResponse.json(
            { success: false, error: "Contract ID and key required" },
            { status: 400 }
          );
        }

        if (operation === "delete") {
          const deleted = orchestrator.deleteContractStorage(contractId, key);
          return NextResponse.json({ 
            success: true, 
            contractId, 
            key, 
            deleted,
          });
        }

        if (value === undefined) {
          return NextResponse.json(
            { success: false, error: "Value required for set operation" },
            { status: 400 }
          );
        }

        orchestrator.setContractStorage(contractId, key, value);
        return NextResponse.json({
          success: true,
          contractId,
          key,
          message: "Storage value set",
        });
      }

      default:
        return NextResponse.json(
          { 
            success: false, 
            error: "Unknown action",
            validActions: [
              "create", "initialize", "execute",
              "pause", "resume", "terminate",
              "interact", "storage"
            ],
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[Orchestrator API] POST error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
