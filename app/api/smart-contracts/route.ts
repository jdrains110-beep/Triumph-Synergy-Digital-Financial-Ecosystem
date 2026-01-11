/**
 * Smart Contracts API Route
 *
 * Handles GitHub integration, contract management, and deployment
 */

import { type NextRequest, NextResponse } from "next/server";
import {
  compileContract,
  connectGitHub,
  createContract,
  deployContract,
  smartContractHub,
  syncFromGitHub,
} from "@/lib/smart-contracts/smart-contract-hub";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const contractId = searchParams.get("contractId");

  try {
    switch (action) {
      case "list": {
        const contracts = await smartContractHub.listContracts();
        return NextResponse.json({ success: true, contracts });
      }

      case "get": {
        if (!contractId) {
          return NextResponse.json(
            { success: false, error: "Contract ID required" },
            { status: 400 }
          );
        }
        const contract = await smartContractHub.getContract(contractId);
        return NextResponse.json({ success: true, contract });
      }

      case "templates": {
        const templates = smartContractHub.listTemplates();
        return NextResponse.json({
          success: true,
          templates: templates.map((t) => ({
            id: t.id,
            name: t.name,
            category: t.category,
            language: t.language,
          })),
        });
      }

      case "github-repos": {
        const repos = smartContractHub.listRepositories();
        return NextResponse.json({ success: true, repos });
      }

      default:
        return NextResponse.json({
          success: true,
          message: "Smart Contracts API",
          endpoints: {
            "GET ?action=list": "List all contracts",
            "GET ?action=get&contractId=X": "Get contract details",
            "GET ?action=templates": "List Rust templates",
            "GET ?action=github-repos": "List connected GitHub repos",
            POST: "Create, compile, deploy contracts",
          },
        });
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "create": {
        const newContract = await createContract({
          name: body.name,
          description: body.description || "Smart contract created via API",
          language: body.language || "rust",
          sourceCode: body.sourceCode || "",
          network: body.network || "pi-mainnet",
          author: body.author || "triumph-synergy",
        });
        return NextResponse.json({ success: true, contract: newContract });
      }

      case "compile": {
        const compiled = await compileContract(body.contractId);
        return NextResponse.json({ success: true, contract: compiled });
      }

      case "deploy": {
        const deployed = await deployContract(
          body.contractId,
          body.network || "pi-mainnet"
        );
        return NextResponse.json({ success: true, contract: deployed });
      }

      case "connect-github": {
        const connection = await connectGitHub(
          body.owner,
          body.repo,
          body.accessToken
        );
        return NextResponse.json({ success: true, connection });
      }

      case "sync-github": {
        const synced = await syncFromGitHub(
          body.repoFullName,
          body.path,
          body.branch
        );
        return NextResponse.json({ success: true, contract: synced });
      }

      default:
        return NextResponse.json(
          { success: false, error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
