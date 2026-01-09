/**
 * Banking Partners API Route
 * 
 * Handles banking integration, transfers, and Pi conversions
 */

import { type NextRequest, NextResponse } from "next/server";
import {
  bankingPartnersPlatform,
  addBankingPartner,
  openBankAccount,
  initiateTransfer,
  convertToPi,
  convertFromPi,
} from "@/lib/banking/banking-partners-platform";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const partnerId = searchParams.get("partnerId");
  const accountId = searchParams.get("accountId");
  const userId = searchParams.get("userId");

  try {
    switch (action) {
      case "partners":
        const partners = await bankingPartnersPlatform.listPartners();
        return NextResponse.json({ success: true, partners });

      case "partner":
        if (!partnerId) {
          return NextResponse.json({ success: false, error: "Partner ID required" }, { status: 400 });
        }
        const partner = await bankingPartnersPlatform.getPartner(partnerId);
        return NextResponse.json({ success: true, partner });

      case "account":
        if (!accountId) {
          return NextResponse.json({ success: false, error: "Account ID required" }, { status: 400 });
        }
        const account = await bankingPartnersPlatform.getAccount(accountId);
        return NextResponse.json({ success: true, account });

      case "user-accounts":
        if (!userId) {
          return NextResponse.json({ success: false, error: "User ID required" }, { status: 400 });
        }
        const accounts = await bankingPartnersPlatform.getUserAccounts(userId);
        return NextResponse.json({ success: true, accounts });

      case "rates":
        const dualRates = bankingPartnersPlatform.getDualRateInfo();
        return NextResponse.json({
          success: true,
          rates: {
            internal: {
              piToUsd: dualRates.internal,
              usdToPi: 1 / dualRates.internal,
              description: "Internally mined/contributed Pi (1000x multiplier)",
            },
            external: {
              piToUsd: dualRates.external,
              usdToPi: 1 / dualRates.external,
              description: "External/non-contributed Pi",
            },
            multiplier: dualRates.multiplier,
          },
        });

      default:
        return NextResponse.json({
          success: true,
          message: "Banking Partners API",
          endpoints: {
            "GET ?action=partners": "List all banking partners",
            "GET ?action=partner&partnerId=X": "Get partner details",
            "GET ?action=account&accountId=X": "Get account details",
            "GET ?action=user-accounts&userId=X": "Get user accounts",
            "GET ?action=rates": "Get Pi/USD exchange rates",
            "POST": "Open accounts, transfers, conversions",
          },
        });
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "add-partner":
        const newPartner = await addBankingPartner({
          name: body.name,
          type: body.type || "retail",
          status: body.status || "pending",
          routingNumber: body.routingNumber || "",
          swiftCode: body.swiftCode || null,
          ibanPrefix: body.ibanPrefix || null,
          charteredIn: body.charteredIn || "USA",
          fdicsInsured: body.fdicsInsured || true,
          ncuaInsured: body.ncuaInsured || false,
          headquarters: body.headquarters || { street: "", city: "", state: "", zip: "", country: "USA" },
          primaryContact: body.primaryContact || { name: "", email: "", phone: "" },
          technicalContact: body.technicalContact || { name: "", email: "", phone: "" },
          apiEndpoint: body.apiEndpoint || "",
          apiVersion: body.apiVersion || "v1",
          authMethod: body.authMethod || "api-key",
          supportedOperations: body.supportedOperations || [],
          rateLimit: body.rateLimit || 1000,
          capabilities: body.capabilities || {},
          piNetworkEnabled: body.piNetworkEnabled || true,
          piCustodySupported: body.piCustodySupported || false,
          piSettlementAccount: body.piSettlementAccount || null,
          compliance: body.compliance || {},
          partnerSince: new Date(),
          lastActiveAt: new Date(),
        });
        return NextResponse.json({ success: true, partner: newPartner });

      case "open-account":
        const newAccount = await openBankAccount({
          userId: body.userId,
          partnerId: body.partnerId,
          type: body.accountType || "checking",
          accountName: body.accountName || "Primary Account",
          linkedPiWallet: body.linkedPiWallet,
          piAutoConvert: body.piAutoConvert,
          piConversionThreshold: body.piConversionThreshold,
        });
        return NextResponse.json({ success: true, account: newAccount });

      case "transfer":
        const transfer = await initiateTransfer({
          accountId: body.fromAccountId,
          type: body.type || "transfer-ach",
          amount: body.amount,
          toAccount: body.toAccountId,
          toRoutingNumber: body.toRoutingNumber,
          description: body.memo || "Transfer",
          convertToPi: body.convertToPi,
          piDestWallet: body.piDestWallet,
        });
        return NextResponse.json({ success: true, transfer });

      case "convert-to-pi":
        const piConversion = await convertToPi(body.accountId, body.usdAmount, body.piWallet);
        return NextResponse.json({ success: true, conversion: piConversion });

      case "convert-from-pi":
        const usdConversion = await convertFromPi(body.accountId, body.piAmount, body.piWallet, body.piTxHash);
        return NextResponse.json({ success: true, conversion: usdConversion });

      case "setup-direct-deposit":
        const directDeposit = await bankingPartnersPlatform.setupDirectDeposit(
          body.accountId,
          {
            employerName: body.employerName,
            employerId: body.employerId,
            depositType: body.depositType || "full",
            amount: body.amount,
            percentage: body.percentage,
          }
        );
        return NextResponse.json({ success: true, directDeposit });

      default:
        return NextResponse.json(
          { success: false, error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
