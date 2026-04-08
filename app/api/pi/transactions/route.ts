/**
 * Pi Hyper-Scale Transaction API
 * 
 * Endpoints for:
 * - Transaction submission (billions/trillions scale)
 * - Vault operations (trillion-scale storage)
 * - Smart contract deployment and execution
 * - SCP sync status
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  piHyperTransactionEngine,
  piTrillionVaultManager,
  piSmartContractEngine,
  piSCPAutoUpgradeManager,
  initializePiTransactionSystem,
  getPiTransactionSystemStatus,
  type Transaction,
} from '@/lib/pi-transaction';

type TransactionInput = Omit<Transaction, 'id' | 'status' | 'createdAt'>;

// =============================================================================
// System Status Endpoint
// =============================================================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'status';

  try {
    switch (action) {
      case 'status':
        return NextResponse.json({
          success: true,
          system: getPiTransactionSystemStatus(),
          timestamp: new Date().toISOString(),
          capabilities: {
            maxTPS: 10_000_000_000,
            maxVaultCapacity: 'unlimited',
            smartContractChannels: 10_000,
            zeroCongestion: true,
            autoSCPUpgrade: true,
          },
        });

      case 'transaction-metrics':
        return NextResponse.json({
          success: true,
          metrics: piHyperTransactionEngine.getMetrics(),
        });

      case 'vault-metrics':
        return NextResponse.json({
          success: true,
          metrics: piTrillionVaultManager.getMetrics(),
          centralVault: piTrillionVaultManager.getStatus(),
        });

      case 'contract-metrics':
        return NextResponse.json({
          success: true,
          metrics: piSmartContractEngine.getMetrics(),
        });

      case 'scp-status':
        return NextResponse.json({
          success: true,
          version: piSCPAutoUpgradeManager.getCurrentVersion(),
          parameters: piSCPAutoUpgradeManager.getCurrentParameters(),
          metrics: piSCPAutoUpgradeManager.getMetrics(),
          validators: piSCPAutoUpgradeManager.getValidators(),
        });

      case 'upgrade-history':
        return NextResponse.json({
          success: true,
          history: piSCPAutoUpgradeManager.getUpgradeHistory(),
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Unknown action',
        }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
    }, { status: 500 });
  }
}

// =============================================================================
// Transaction Operations
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { operation, data } = body;

    switch (operation) {
      // ---------------------------------------------------------------------
      // Initialize System
      // ---------------------------------------------------------------------
      case 'initialize':
        await initializePiTransactionSystem({
          networkType: data?.networkType || 'mainnet',
        });
        return NextResponse.json({
          success: true,
          message: 'Pi Transaction System initialized',
          status: getPiTransactionSystemStatus(),
        });

      // ---------------------------------------------------------------------
      // Transaction Operations
      // ---------------------------------------------------------------------
      case 'submit-transaction':
        const txResult = await piHyperTransactionEngine.submitTransaction({
          type: data.type || 'transfer',
          sender: data.from,
          receiver: data.to,
          senderPublicKey: data.sourceAccount || data.from,
          amount: BigInt(data.amount),
          priority: data.priority || 'normal',
          memo: data.memo,
        });
        return NextResponse.json({
          success: true,
          transaction: {
            ...txResult,
            amount: txResult.amount.toString(),
          },
        });

      case 'submit-batch':
        const transactions: TransactionInput[] = 
          data.transactions.map((tx: { from: string; to: string; amount: string; type?: string; priority?: string; memo?: string }) => ({
            type: tx.type || 'transfer',
            sender: tx.from,
            receiver: tx.to,
            senderPublicKey: tx.from,
            amount: BigInt(tx.amount),
            priority: tx.priority || 'normal',
            memo: tx.memo,
          }));
        const batchResult = await piHyperTransactionEngine.submitBatch(transactions);
        return NextResponse.json({
          success: true,
          batch: {
            ...batchResult,
            transactions: batchResult.transactions.map(tx => ({
              ...tx,
              amount: tx.amount.toString(),
            })),
          },
        });

      case 'get-transaction':
        const tx = piHyperTransactionEngine.getTransaction(data.transactionId);
        return NextResponse.json({
          success: true,
          transaction: tx ? {
            ...tx,
            amount: tx.amount.toString(),
          } : null,
        });

      // ---------------------------------------------------------------------
      // Vault Operations
      // ---------------------------------------------------------------------
      case 'create-vault':
        const vault = await piTrillionVaultManager.createVault({
          ownerId: data.ownerId,
          ownerPublicKey: data.ownerId,
          name: data.name,
          type: data.type,
          requiredSignatures: data.requiredSignatures,
        });
        return NextResponse.json({
          success: true,
          vault: {
            ...vault,
            balance: vault.balance.total.toString(),
            totalDeposited: vault.totalDeposited.toString(),
            totalWithdrawn: vault.totalWithdrawn.toString(),
          },
        });

      case 'deposit':
        const depositResult = await piTrillionVaultManager.deposit({
          vaultId: data.vaultId,
          amount: BigInt(data.amount),
          initiator: data.fromAccount,
          memo: data.memo,
        });
        return NextResponse.json({
          success: true,
          transaction: {
            ...depositResult,
            amount: depositResult.amount.toString(),
            postBalance: depositResult.postBalance.toString(),
          },
        });

      case 'withdraw':
        const withdrawResult = await piTrillionVaultManager.withdraw({
          vaultId: data.vaultId,
          amount: BigInt(data.amount),
          initiator: data.authorizedBy || data.toAccount,
          toAddress: data.toAccount,
        });
        return NextResponse.json({
          success: true,
          transaction: {
            ...withdrawResult,
            amount: withdrawResult.amount.toString(),
            postBalance: withdrawResult.postBalance.toString(),
          },
        });

      case 'get-vault':
        const vaultInfo = piTrillionVaultManager.getVault(data.vaultId);
        return NextResponse.json({
          success: true,
          vault: vaultInfo ? {
            ...vaultInfo,
            balance: vaultInfo.balance.total.toString(),
            totalDeposited: vaultInfo.totalDeposited.toString(),
            totalWithdrawn: vaultInfo.totalWithdrawn.toString(),
          } : null,
        });

      case 'vault-balance':
        const vaultForBalance = piTrillionVaultManager.getVault(data.vaultId);
        return NextResponse.json({
          success: true,
          vaultId: data.vaultId,
          balance: vaultForBalance ? vaultForBalance.balance.total.toString() : '0',
        });

      // ---------------------------------------------------------------------
      // Smart Contract Operations
      // ---------------------------------------------------------------------
      case 'deploy-contract':
        const contract = await piSmartContractEngine.deployContract({
          name: data.name,
          bytecode: data.code || data.bytecode || '',
          owner: data.owner,
          ownerPublicKey: data.ownerPublicKey || data.owner,
          type: data.type || 'custom',
          methods: data.abi || data.methods || [],
          initialState: data.initialState,
        });
        return NextResponse.json({
          success: true,
          contract: {
            id: contract.id,
            address: contract.address,
            type: contract.type,
            status: contract.status,
            owner: contract.owner,
          },
        });

      case 'execute-contract':
        const execution = await piSmartContractEngine.executeContract({
          contractAddress: data.contractId || data.contractAddress,
          method: data.method,
          args: data.params || data.args || [],
          caller: data.caller,
          callerPublicKey: data.callerPublicKey || data.caller,
          gasLimit: data.gasLimit ? BigInt(data.gasLimit) : undefined,
        });
        return NextResponse.json({
          success: true,
          execution: {
            id: execution.id,
            contractId: execution.contractId,
            status: execution.status,
            gasUsed: execution.gasUsed.toString(),
          },
        });

      case 'get-contract':
        const contractInfo = piSmartContractEngine.getContract(data.contractId);
        return NextResponse.json({
          success: true,
          contract: contractInfo ? {
            id: contractInfo.id,
            address: contractInfo.address,
            type: contractInfo.type,
            status: contractInfo.status,
            owner: contractInfo.owner,
          } : null,
        });

      // ---------------------------------------------------------------------
      // SCP Operations
      // ---------------------------------------------------------------------
      case 'force-scp-check':
        const upgradeCheck = await piSCPAutoUpgradeManager.forceUpgradeCheck();
        return NextResponse.json({
          success: true,
          upgradeCheck,
        });

      case 'trigger-upgrade':
        const upgradeResult = await piSCPAutoUpgradeManager.triggerUpgrade();
        return NextResponse.json({
          success: true,
          upgrade: upgradeResult,
        });

      default:
        return NextResponse.json({
          success: false,
          error: `Unknown operation: ${operation}`,
        }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
    }, { status: 500 });
  }
}
