/**
 * Blockchain Binding Manager
 *
 * Orchestrates the permanent binding of products and companies to
 * Pi Network's blockchain. Provides:
 * - Multi-signature binding for high-value assets
 * - Batch tokenization for product lines
 * - Supply chain provenance anchoring
 * - Cross-reference lookup (product ↔ company ↔ blockchain)
 * - Binding verification and audit trails
 * - Integration with existing token reward + business interaction systems
 */

import { EventEmitter } from "events";
import {
  tokenizationEngine,
  type TokenizedProduct,
  type TokenizedCompany,
  type BlockchainBinding,
  type TokenStandard,
  type AssetCategory,
  type CompanyTokenType,
  type TokenMetadata,
  type ComplianceData,
  type ProvenanceRecord,
} from "./tokenization-engine";
import {
  tokenRewardSystem,
  type TokenType,
} from "../tokens/token-reward-system";
import { businessInteractions } from "../tokens/business-interactions";

// ============================================================================
// Types
// ============================================================================

export type BindingVerificationResult = {
  tokenId: string;
  type: "product" | "company";
  bound: boolean;
  verified: boolean;
  txHash?: string;
  ledger?: number;
  network?: string;
  confirmedAt?: Date;
  onChainValid: boolean;
  provenanceCount: number;
  holderCount: number;
  error?: string;
};

export type BatchTokenizationRequest = {
  companyId: string;
  products: Array<{
    category: AssetCategory;
    standard: TokenStandard;
    metadata: TokenMetadata;
    totalSupply: number;
    priceInPi: number;
    divisible?: boolean;
    compliance?: Partial<ComplianceData>;
  }>;
  signerSecret: string;
};

export type BatchTokenizationResult = {
  companyId: string;
  total: number;
  successful: number;
  failed: number;
  results: Array<{
    productId?: string;
    success: boolean;
    txHash?: string;
    error?: string;
  }>;
};

export type SupplyChainAnchor = {
  productId: string;
  stage: string;
  location?: string;
  handler: string;
  timestamp: Date;
  txHash?: string;
  metadata: Record<string, string>;
};

export type CrossReference = {
  productId?: string;
  companyId?: string;
  txHash?: string;
  assetCode?: string;
  found: boolean;
};

export type EcosystemStats = {
  tokenization: ReturnType<typeof tokenizationEngine.getStats>;
  totalBindings: number;
  totalProvenance: number;
  recentActivity: Array<{
    type: string;
    id: string;
    action: string;
    timestamp: Date;
  }>;
};

// ============================================================================
// Blockchain Binding Manager
// ============================================================================

export class BlockchainBindingManager extends EventEmitter {
  private supplyChainAnchors: Map<string, SupplyChainAnchor[]> = new Map();
  private activityLog: Array<{
    type: string;
    id: string;
    action: string;
    timestamp: Date;
  }> = [];

  constructor() {
    super();
    this.setupEventListeners();
  }

  // ==========================================================================
  // Company Onboarding & Tokenization
  // ==========================================================================

  /**
   * Full company onboarding flow:
   * 1. Register in business interaction system
   * 2. Tokenize on Pi blockchain
   * 3. Create token wallet
   * 4. Link systems together
   */
  async onboardCompany(params: {
    name: string;
    registrationNumber: string;
    industry: string;
    jurisdiction: string;
    description: string;
    ownerAddress: string;
    ownerUserId: string;
    tokenType: CompanyTokenType;
    metadata: TokenMetadata;
    totalSupply: number;
    valuationInPi: number;
    revenueSharePercent?: number;
    votesPerToken?: number;
    compliance?: Partial<ComplianceData>;
    signerSecret: string;
  }): Promise<{
    company: TokenizedCompany;
    binding: BlockchainBinding;
    businessId: string;
    walletId: string;
  }> {
    // Step 1: Register in business interaction system
    const businessType = this.inferBusinessType(params.industry);
    const business = businessInteractions.registerBusiness({
      name: params.name,
      type: businessType,
      industry: params.industry,
      ownerId: params.ownerUserId,
      ownerWalletId: `owner-wallet-${params.ownerUserId}`,
      description: params.description,
    });

    // Step 2: Create token wallet for the company
    const walletId = `corp-${business.id}`;
    tokenRewardSystem.createWallet({ ownerId: walletId, ownerType: "business" });

    // Step 3: Tokenize and bind to blockchain
    const company = await tokenizationEngine.tokenizeCompany({
      ...params,
      signerSecret: params.signerSecret,
    });

    if (!company.binding) {
      throw new Error("Company tokenization succeeded but blockchain binding failed");
    }

    // Step 4: Reward the company for onboarding
    tokenRewardSystem.rewardActivity({
      walletId,
      activityType: "work-milestone",
      activityId: `onboard-${company.id}`,
    });

    this.logActivity("company", company.id, "onboarded");
    this.emit("company:onboarded", {
      company,
      businessId: business.id,
      walletId,
    });

    return {
      company,
      binding: company.binding,
      businessId: business.id,
      walletId,
    };
  }

  // ==========================================================================
  // Product Tokenization & Binding
  // ==========================================================================

  /**
   * Tokenize and bind a single product to Pi blockchain
   */
  async tokenizeAndBindProduct(params: {
    ownerAddress: string;
    category: AssetCategory;
    standard: TokenStandard;
    metadata: TokenMetadata;
    totalSupply: number;
    priceInPi: number;
    divisible?: boolean;
    companyId?: string;
    compliance?: Partial<ComplianceData>;
    signerSecret: string;
  }): Promise<{
    product: TokenizedProduct;
    binding: BlockchainBinding;
  }> {
    const product = await tokenizationEngine.tokenizeProduct({
      ...params,
      signerSecret: params.signerSecret,
    });

    if (!product.binding) {
      throw new Error("Product tokenization succeeded but blockchain binding failed");
    }

    this.logActivity("product", product.id, "tokenized-and-bound");
    return { product, binding: product.binding };
  }

  /**
   * Batch tokenize an entire product line under a company
   */
  async batchTokenize(
    request: BatchTokenizationRequest
  ): Promise<BatchTokenizationResult> {
    const company = tokenizationEngine.getCompany(request.companyId);
    if (!company) throw new Error(`Company ${request.companyId} not found`);
    if (!company.binding)
      throw new Error("Company must be bound to blockchain before batch tokenization");

    const results: BatchTokenizationResult["results"] = [];
    let successful = 0;
    let failed = 0;

    for (const productSpec of request.products) {
      try {
        const product = await tokenizationEngine.tokenizeProduct({
          ownerAddress: company.ownerAddress,
          category: productSpec.category,
          standard: productSpec.standard,
          metadata: productSpec.metadata,
          totalSupply: productSpec.totalSupply,
          priceInPi: productSpec.priceInPi,
          divisible: productSpec.divisible,
          companyId: request.companyId,
          compliance: productSpec.compliance,
          signerSecret: request.signerSecret,
        });

        results.push({
          productId: product.id,
          success: true,
          txHash: product.binding?.txHash,
        });
        successful++;
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
        failed++;
      }
    }

    this.logActivity(
      "batch",
      request.companyId,
      `batch-tokenized: ${successful}/${request.products.length}`
    );

    return {
      companyId: request.companyId,
      total: request.products.length,
      successful,
      failed,
      results,
    };
  }

  // ==========================================================================
  // Supply Chain Provenance
  // ==========================================================================

  /**
   * Anchor a supply chain event to the blockchain for a product
   */
  async anchorSupplyChainEvent(
    params: {
      productId: string;
      stage: string;
      location?: string;
      handler: string;
      metadata: Record<string, string>;
    },
    signerSecret: string
  ): Promise<SupplyChainAnchor> {
    const product = tokenizationEngine.getProduct(params.productId);
    if (!product) throw new Error(`Product ${params.productId} not found`);
    if (!product.binding)
      throw new Error("Product must be bound to blockchain first");

    // Record on blockchain
    const { Keypair, TransactionBuilder, Operation, Memo } = await import(
      "@stellar/stellar-sdk"
    );
    const STELLAR_HORIZON_URL =
      process.env.STELLAR_HORIZON_URL || "https://api.testnet.minepi.com";
    const NETWORK_PASSPHRASE =
      process.env.STELLAR_NETWORK_PASSPHRASE || "Pi Testnet";
    const { Horizon } = await import("@stellar/stellar-sdk");
    const server = new Horizon.Server(STELLAR_HORIZON_URL);

    const keypair = Keypair.fromSecret(signerSecret);
    const account = await server.loadAccount(keypair.publicKey());

    const BASE_FEE = "100";
    const txBuilder = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    });

    txBuilder.addOperation(
      Operation.manageData({
        name: `ts:sc:${params.productId.slice(-8)}`,
        value: Buffer.from(
          JSON.stringify({
            stage: params.stage,
            loc: params.location,
            handler: params.handler,
            ts: Date.now(),
            meta: params.metadata,
          })
        ).toString("base64"),
      })
    );

    txBuilder.addMemo(Memo.text(`SC:${params.stage.slice(0, 22)}`));
    txBuilder.setTimeout(180);

    const tx = txBuilder.build();
    tx.sign(keypair);
    const result = await server.submitTransaction(tx);

    const anchor: SupplyChainAnchor = {
      productId: params.productId,
      stage: params.stage,
      location: params.location,
      handler: params.handler,
      timestamp: new Date(),
      txHash: result.hash,
      metadata: params.metadata,
    };

    // Store locally
    const existing = this.supplyChainAnchors.get(params.productId) || [];
    existing.push(anchor);
    this.supplyChainAnchors.set(params.productId, existing);

    // Add to product provenance
    const prod = tokenizationEngine.getProduct(params.productId);
    if (prod) {
      prod.provenance.push({
        timestamp: new Date(),
        action: `supply-chain:${params.stage}`,
        actor: params.handler,
        txHash: result.hash,
        details: `Stage: ${params.stage}${params.location ? ` at ${params.location}` : ""}`,
      });
    }

    this.emit("supplychain:anchored", anchor);
    return anchor;
  }

  /**
   * Get full supply chain history for a product
   */
  getSupplyChain(productId: string): SupplyChainAnchor[] {
    return this.supplyChainAnchors.get(productId) || [];
  }

  // ==========================================================================
  // Verification & Audit
  // ==========================================================================

  /**
   * Full verification of a token binding — checks on-chain and local state
   */
  async verifyBinding(
    tokenId: string
  ): Promise<BindingVerificationResult> {
    const product = tokenizationEngine.getProduct(tokenId);
    const company = tokenizationEngine.getCompany(tokenId);
    const token = product || company;
    const type = product ? "product" : company ? "company" : null;

    if (!token || !type) {
      return {
        tokenId,
        type: "product",
        bound: false,
        verified: false,
        onChainValid: false,
        provenanceCount: 0,
        holderCount: 0,
        error: "Token not found",
      };
    }

    if (!token.binding) {
      return {
        tokenId,
        type,
        bound: false,
        verified: false,
        onChainValid: false,
        provenanceCount: product?.provenance.length || 0,
        holderCount: tokenizationEngine.getHolders(tokenId).length,
      };
    }

    // Verify on-chain
    const onChainResult = await tokenizationEngine.verifyBinding(tokenId);

    return {
      tokenId,
      type,
      bound: true,
      verified: onChainResult.verified,
      txHash: token.binding.txHash,
      ledger: token.binding.ledger,
      network: token.binding.network,
      confirmedAt: token.binding.confirmedAt,
      onChainValid: onChainResult.verified,
      provenanceCount: product?.provenance.length || 0,
      holderCount: tokenizationEngine.getHolders(tokenId).length,
    };
  }

  /**
   * Cross-reference lookup: find products/companies by txHash or assetCode
   */
  crossReference(query: {
    txHash?: string;
    assetCode?: string;
    productId?: string;
    companyId?: string;
  }): CrossReference {
    // By product or company ID
    if (query.productId) {
      const p = tokenizationEngine.getProduct(query.productId);
      return {
        productId: query.productId,
        companyId: p?.companyId,
        txHash: p?.binding?.txHash,
        assetCode: p?.binding?.assetCode,
        found: !!p,
      };
    }

    if (query.companyId) {
      const c = tokenizationEngine.getCompany(query.companyId);
      return {
        companyId: query.companyId,
        txHash: c?.binding?.txHash,
        assetCode: c?.binding?.assetCode,
        found: !!c,
      };
    }

    // By txHash — search all tokens
    if (query.txHash) {
      for (const p of tokenizationEngine.getAllProducts()) {
        if (p.binding?.txHash === query.txHash) {
          return {
            productId: p.id,
            companyId: p.companyId,
            txHash: p.binding.txHash,
            assetCode: p.binding.assetCode,
            found: true,
          };
        }
      }
      for (const c of tokenizationEngine.getAllCompanies()) {
        if (c.binding?.txHash === query.txHash) {
          return {
            companyId: c.id,
            txHash: c.binding.txHash,
            assetCode: c.binding.assetCode,
            found: true,
          };
        }
      }
    }

    // By assetCode
    if (query.assetCode) {
      for (const p of tokenizationEngine.getAllProducts()) {
        if (p.binding?.assetCode === query.assetCode) {
          return {
            productId: p.id,
            companyId: p.companyId,
            txHash: p.binding.txHash,
            assetCode: p.binding.assetCode,
            found: true,
          };
        }
      }
      for (const c of tokenizationEngine.getAllCompanies()) {
        if (c.binding?.assetCode === query.assetCode) {
          return {
            companyId: c.id,
            txHash: c.binding.txHash,
            assetCode: c.binding.assetCode,
            found: true,
          };
        }
      }
    }

    return { found: false };
  }

  // ==========================================================================
  // Ecosystem Integration
  // ==========================================================================

  /**
   * Get complete ecosystem statistics
   */
  getEcosystemStats(): EcosystemStats {
    const stats = tokenizationEngine.getStats();
    const allProducts = tokenizationEngine.getAllProducts();
    let totalProvenance = 0;
    for (const p of allProducts) {
      totalProvenance += p.provenance.length;
    }

    return {
      tokenization: stats,
      totalBindings: stats.boundProducts + stats.boundCompanies,
      totalProvenance,
      recentActivity: this.activityLog.slice(-50),
    };
  }

  /**
   * Link an existing business (from business-interactions) to a tokenized company
   */
  linkBusinessToTokenizedCompany(
    businessId: string,
    companyTokenId: string
  ): void {
    const business = businessInteractions.getBusiness(businessId);
    const company = tokenizationEngine.getCompany(companyTokenId);
    if (!business) throw new Error(`Business ${businessId} not found`);
    if (!company) throw new Error(`Tokenized company ${companyTokenId} not found`);

    this.logActivity("link", companyTokenId, `linked-to-business:${businessId}`);
    this.emit("company:linked", { businessId, companyTokenId });
  }

  // ==========================================================================
  // Internal Helpers
  // ==========================================================================

  private inferBusinessType(
    industry: string
  ): "corporation" | "small-business" | "startup" | "nonprofit" | "merchant" | "freelancer" | "cooperative" {
    const lower = industry.toLowerCase();
    if (lower.includes("nonprofit") || lower.includes("charity"))
      return "nonprofit";
    if (lower.includes("retail") || lower.includes("store"))
      return "merchant";
    if (lower.includes("freelance") || lower.includes("consulting"))
      return "freelancer";
    if (lower.includes("cooperative") || lower.includes("co-op"))
      return "cooperative";
    return "corporation";
  }

  private logActivity(type: string, id: string, action: string): void {
    this.activityLog.push({ type, id, action, timestamp: new Date() });
    if (this.activityLog.length > 1000) {
      this.activityLog = this.activityLog.slice(-500);
    }
  }

  private setupEventListeners(): void {
    tokenizationEngine.on("product:tokenized", (p: TokenizedProduct) => {
      this.logActivity("product", p.id, "tokenized");
    });
    tokenizationEngine.on("product:bound", ({ product }: { product: TokenizedProduct }) => {
      this.logActivity("product", product.id, "bound-to-blockchain");
    });
    tokenizationEngine.on("company:tokenized", (c: TokenizedCompany) => {
      this.logActivity("company", c.id, "tokenized");
    });
    tokenizationEngine.on("company:bound", ({ company }: { company: TokenizedCompany }) => {
      this.logActivity("company", company.id, "bound-to-blockchain");
    });
    tokenizationEngine.on("token:minted", (e: { tokenId: string; amount: number }) => {
      this.logActivity("mint", e.tokenId, `minted:${e.amount}`);
    });
    tokenizationEngine.on("token:transferred", (e: { tokenId: string; amount: number }) => {
      this.logActivity("transfer", e.tokenId, `transferred:${e.amount}`);
    });
    tokenizationEngine.on("token:burned", (e: { tokenId: string; amount: number }) => {
      this.logActivity("burn", e.tokenId, `burned:${e.amount}`);
    });
  }
}

// Singleton
export const blockchainBindingManager = new BlockchainBindingManager();
