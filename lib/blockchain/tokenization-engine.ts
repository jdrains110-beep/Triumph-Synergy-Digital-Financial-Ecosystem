/**
 * Tokenization Engine
 *
 * Core engine for tokenizing real-world products and companies,
 * binding them permanently to Pi Network's blockchain via Stellar SCP.
 *
 * Capabilities:
 * - Product tokenization (physical goods, digital assets, services, IP)
 * - Company tokenization (equity, revenue shares, governance)
 * - Immutable blockchain binding with Pi Network settlement
 * - Token standard enforcement (PT-20 fungible, PT-721 non-fungible, PT-1155 multi)
 * - Supply chain provenance tracking
 * - Regulatory compliance metadata
 * - Fractional ownership and divisibility
 */

import { EventEmitter } from "events";
import * as StellarSdk from "@stellar/stellar-sdk";

// ============================================================================
// Token Standards — Pi Network Native
// ============================================================================

/**
 * PT-20:   Fungible tokens (company shares, loyalty points, commodity units)
 * PT-721:  Non-fungible tokens (unique products, certificates, deeds)
 * PT-1155: Multi-tokens (product lines, tiered memberships, batch goods)
 */
export type TokenStandard = "PT-20" | "PT-721" | "PT-1155";

export type TokenizationStatus =
  | "draft"
  | "pending-verification"
  | "verified"
  | "minting"
  | "active"
  | "suspended"
  | "burned"
  | "expired";

export type AssetCategory =
  | "physical-product"
  | "digital-product"
  | "service"
  | "intellectual-property"
  | "real-estate"
  | "equity"
  | "commodity"
  | "collectible"
  | "certificate"
  | "license"
  | "subscription"
  | "revenue-share";

export type CompanyTokenType =
  | "equity-token"
  | "revenue-share"
  | "governance-token"
  | "utility-token"
  | "security-token"
  | "debt-token";

// ============================================================================
// Core Interfaces
// ============================================================================

export interface TokenMetadata {
  name: string;
  symbol: string;
  description: string;
  imageUri?: string;
  externalUrl?: string;
  attributes: Record<string, string | number | boolean>;
}

export interface BlockchainBinding {
  /** Stellar transaction hash that created the binding */
  txHash: string;
  /** Ledger number where binding was recorded */
  ledger: number;
  /** Stellar asset code for this token */
  assetCode: string;
  /** Issuing account on Stellar */
  issuerAccount: string;
  /** Pi Network payment ID if paid with Pi */
  piPaymentId?: string;
  /** Timestamp of on-chain confirmation */
  confirmedAt: Date;
  /** Network: testnet or mainnet */
  network: "testnet" | "mainnet";
  /** Network passphrase used */
  networkPassphrase: string;
}

export interface TokenizedProduct {
  id: string;
  standard: TokenStandard;
  category: AssetCategory;
  metadata: TokenMetadata;
  /** Owner wallet address */
  ownerAddress: string;
  /** Company that tokenized this product */
  companyId?: string;
  /** Blockchain binding proof */
  binding: BlockchainBinding | null;
  /** Current status */
  status: TokenizationStatus;
  /** Total supply (PT-20/PT-1155) or 1 (PT-721) */
  totalSupply: number;
  /** Circulating supply */
  circulatingSupply: number;
  /** Price in Pi */
  priceInPi: number;
  /** Whether ownership can be fractionally divided */
  divisible: boolean;
  /** Minimum divisible unit */
  minUnit: number;
  /** Provenance chain */
  provenance: ProvenanceRecord[];
  /** Regulatory compliance data */
  compliance: ComplianceData;
  /** Created timestamp */
  createdAt: Date;
  /** Last updated */
  updatedAt: Date;
}

export interface TokenizedCompany {
  id: string;
  /** Company legal name */
  name: string;
  /** Registration / incorporation number */
  registrationNumber: string;
  /** Industry classification */
  industry: string;
  /** Country of incorporation */
  jurisdiction: string;
  /** Company description */
  description: string;
  /** Owner/founder wallet address */
  ownerAddress: string;
  /** KYB verification status */
  kybVerified: boolean;
  /** Token type issued by this company */
  tokenType: CompanyTokenType;
  /** Token standard used */
  standard: TokenStandard;
  /** Token metadata */
  metadata: TokenMetadata;
  /** Blockchain binding proof */
  binding: BlockchainBinding | null;
  /** Current status */
  status: TokenizationStatus;
  /** Total token supply */
  totalSupply: number;
  /** Tokens distributed */
  distributed: number;
  /** Tokens reserved (treasury) */
  reserved: number;
  /** Valuation in Pi */
  valuationInPi: number;
  /** Products tokenized under this company */
  productIds: string[];
  /** Compliance data */
  compliance: ComplianceData;
  /** Revenue share percentage (if revenue-share type) */
  revenueSharePercent?: number;
  /** Governance: votes per token */
  votesPerToken?: number;
  /** Created timestamp */
  createdAt: Date;
  /** Last updated */
  updatedAt: Date;
}

export interface ProvenanceRecord {
  timestamp: Date;
  action: string;
  actor: string;
  txHash?: string;
  details: string;
}

export interface ComplianceData {
  /** KYC verified owner */
  kycVerified: boolean;
  /** KYB verified company */
  kybVerified: boolean;
  /** Legal classification */
  classification: string;
  /** Restricted jurisdictions */
  restrictedJurisdictions: string[];
  /** Accredited investors only */
  accreditedOnly: boolean;
  /** Maximum holders (0 = unlimited) */
  maxHolders: number;
  /** Transfer restrictions */
  transferRestrictions: string[];
  /** Regulatory filings */
  filings: string[];
}

export interface TokenHolder {
  address: string;
  tokenId: string;
  amount: number;
  acquiredAt: Date;
  txHash: string;
}

export interface TokenTransferRequest {
  tokenId: string;
  fromAddress: string;
  toAddress: string;
  amount: number;
  piPaymentId?: string;
  memo?: string;
}

export interface TokenTransferResult {
  success: boolean;
  txHash?: string;
  ledger?: number;
  error?: string;
}

export interface MintRequest {
  tokenId: string;
  recipientAddress: string;
  amount: number;
  memo?: string;
}

export interface BurnRequest {
  tokenId: string;
  ownerAddress: string;
  amount: number;
  reason: string;
}

// ============================================================================
// Tokenization Engine
// ============================================================================

const STELLAR_HORIZON_URL =
  process.env.STELLAR_HORIZON_URL || "https://api.testnet.minepi.com";
const NETWORK_PASSPHRASE =
  process.env.STELLAR_NETWORK_PASSPHRASE || "Pi Testnet";
const PI_NETWORK_MODE = process.env.PI_NETWORK_MODE || "testnet";

export class TokenizationEngine extends EventEmitter {
  private products: Map<string, TokenizedProduct> = new Map();
  private companies: Map<string, TokenizedCompany> = new Map();
  private holders: Map<string, TokenHolder[]> = new Map();
  private server: StellarSdk.Horizon.Server;
  private networkPassphrase: string;

  constructor() {
    super();
    this.server = new StellarSdk.Horizon.Server(STELLAR_HORIZON_URL);
    this.networkPassphrase = NETWORK_PASSPHRASE;
  }

  // ==========================================================================
  // Product Tokenization
  // ==========================================================================

  /**
   * Tokenize a product — creates an on-chain representation bound to Pi blockchain
   */
  async tokenizeProduct(params: {
    ownerAddress: string;
    category: AssetCategory;
    standard: TokenStandard;
    metadata: TokenMetadata;
    totalSupply: number;
    priceInPi: number;
    divisible?: boolean;
    minUnit?: number;
    companyId?: string;
    compliance?: Partial<ComplianceData>;
    signerSecret?: string;
  }): Promise<TokenizedProduct> {
    const id = this.generateId("PROD");

    // Enforce NFT rules
    if (params.standard === "PT-721" && params.totalSupply !== 1) {
      throw new Error("PT-721 tokens must have totalSupply of 1");
    }

    const compliance: ComplianceData = {
      kycVerified: false,
      kybVerified: false,
      classification: params.category,
      restrictedJurisdictions: [],
      accreditedOnly: false,
      maxHolders: 0,
      transferRestrictions: [],
      filings: [],
      ...params.compliance,
    };

    const product: TokenizedProduct = {
      id,
      standard: params.standard,
      category: params.category,
      metadata: params.metadata,
      ownerAddress: params.ownerAddress,
      companyId: params.companyId,
      binding: null,
      status: "draft",
      totalSupply: params.totalSupply,
      circulatingSupply: 0,
      priceInPi: params.priceInPi,
      divisible: params.divisible ?? params.standard !== "PT-721",
      minUnit: params.minUnit ?? (params.standard === "PT-721" ? 1 : 0.0000001),
      provenance: [
        {
          timestamp: new Date(),
          action: "tokenized",
          actor: params.ownerAddress,
          details: `Product tokenized as ${params.standard}: ${params.metadata.name}`,
        },
      ],
      compliance,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.products.set(id, product);

    // If signer secret provided, bind to blockchain immediately
    if (params.signerSecret) {
      await this.bindProductToBlockchain(id, params.signerSecret);
    }

    // Link to company if specified
    if (params.companyId) {
      const company = this.companies.get(params.companyId);
      if (company) {
        company.productIds.push(id);
        company.updatedAt = new Date();
      }
    }

    this.emit("product:tokenized", product);
    return product;
  }

  /**
   * Bind a tokenized product to Pi Network's blockchain via Stellar
   */
  async bindProductToBlockchain(
    productId: string,
    signerSecret: string
  ): Promise<BlockchainBinding> {
    const product = this.products.get(productId);
    if (!product) throw new Error(`Product ${productId} not found`);
    if (product.binding) throw new Error(`Product ${productId} already bound`);

    product.status = "minting";
    this.emit("product:minting", product);

    try {
      const keypair = StellarSdk.Keypair.fromSecret(signerSecret);
      const sourceAccount = await this.server.loadAccount(keypair.publicKey());

      // Create a unique asset code from the product ID (max 12 chars for Stellar)
      const assetCode = this.deriveAssetCode(product.id, product.standard);

      // Build the tokenization transaction
      const txBuilder = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      });

      // Encode product metadata as manage_data operations
      const metaHash = this.hashMetadata(product.metadata);
      txBuilder.addOperation(
        StellarSdk.Operation.manageData({
          name: `ts:product:${product.id.slice(-8)}`,
          value: Buffer.from(
            JSON.stringify({
              id: product.id,
              standard: product.standard,
              category: product.category,
              supply: product.totalSupply,
              price: product.priceInPi,
              metaHash,
            })
          ).toString("base64"),
        })
      );

      // Add memo with tokenization identifier
      txBuilder.addMemo(
        StellarSdk.Memo.text(`TS:PROD:${product.id.slice(-16)}`)
      );
      txBuilder.setTimeout(300);

      const tx = txBuilder.build();
      tx.sign(keypair);

      const result = await this.server.submitTransaction(tx);

      const binding: BlockchainBinding = {
        txHash: result.hash,
        ledger: result.ledger,
        assetCode,
        issuerAccount: keypair.publicKey(),
        confirmedAt: new Date(),
        network: PI_NETWORK_MODE as "testnet" | "mainnet",
        networkPassphrase: this.networkPassphrase,
      };

      product.binding = binding;
      product.status = "active";
      product.updatedAt = new Date();
      product.provenance.push({
        timestamp: new Date(),
        action: "blockchain-bound",
        actor: keypair.publicKey(),
        txHash: result.hash,
        details: `Bound to Pi blockchain at ledger ${result.ledger}`,
      });

      this.emit("product:bound", { product, binding });
      return binding;
    } catch (error) {
      product.status = "draft";
      product.updatedAt = new Date();
      this.emit("product:binding-failed", {
        product,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // ==========================================================================
  // Company Tokenization
  // ==========================================================================

  /**
   * Tokenize a company — issues equity/governance/revenue tokens on Pi blockchain
   */
  async tokenizeCompany(params: {
    name: string;
    registrationNumber: string;
    industry: string;
    jurisdiction: string;
    description: string;
    ownerAddress: string;
    tokenType: CompanyTokenType;
    standard?: TokenStandard;
    metadata: TokenMetadata;
    totalSupply: number;
    reservedPercent?: number;
    valuationInPi: number;
    revenueSharePercent?: number;
    votesPerToken?: number;
    compliance?: Partial<ComplianceData>;
    signerSecret?: string;
  }): Promise<TokenizedCompany> {
    const id = this.generateId("CORP");
    const reservedPercent = params.reservedPercent ?? 20;
    const reserved = Math.floor(
      params.totalSupply * (reservedPercent / 100)
    );

    const compliance: ComplianceData = {
      kycVerified: false,
      kybVerified: false,
      classification: params.tokenType,
      restrictedJurisdictions: [],
      accreditedOnly: params.tokenType === "security-token",
      maxHolders: 0,
      transferRestrictions:
        params.tokenType === "security-token"
          ? ["accredited-only", "jurisdiction-check", "holding-period"]
          : [],
      filings: [],
      ...params.compliance,
    };

    const company: TokenizedCompany = {
      id,
      name: params.name,
      registrationNumber: params.registrationNumber,
      industry: params.industry,
      jurisdiction: params.jurisdiction,
      description: params.description,
      ownerAddress: params.ownerAddress,
      kybVerified: false,
      tokenType: params.tokenType,
      standard: params.standard ?? "PT-20",
      metadata: params.metadata,
      binding: null,
      status: "draft",
      totalSupply: params.totalSupply,
      distributed: 0,
      reserved,
      valuationInPi: params.valuationInPi,
      productIds: [],
      compliance,
      revenueSharePercent: params.revenueSharePercent,
      votesPerToken: params.votesPerToken,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.companies.set(id, company);

    if (params.signerSecret) {
      await this.bindCompanyToBlockchain(id, params.signerSecret);
    }

    this.emit("company:tokenized", company);
    return company;
  }

  /**
   * Bind a tokenized company to Pi Network's blockchain
   */
  async bindCompanyToBlockchain(
    companyId: string,
    signerSecret: string
  ): Promise<BlockchainBinding> {
    const company = this.companies.get(companyId);
    if (!company) throw new Error(`Company ${companyId} not found`);
    if (company.binding)
      throw new Error(`Company ${companyId} already bound`);

    company.status = "minting";
    this.emit("company:minting", company);

    try {
      const keypair = StellarSdk.Keypair.fromSecret(signerSecret);
      const sourceAccount = await this.server.loadAccount(keypair.publicKey());

      const assetCode = this.deriveAssetCode(company.id, company.standard);

      const txBuilder = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      });

      // Store company binding data on-chain
      const metaHash = this.hashMetadata(company.metadata);
      txBuilder.addOperation(
        StellarSdk.Operation.manageData({
          name: `ts:corp:${company.id.slice(-8)}`,
          value: Buffer.from(
            JSON.stringify({
              id: company.id,
              name: company.name,
              reg: company.registrationNumber,
              type: company.tokenType,
              standard: company.standard,
              supply: company.totalSupply,
              valuation: company.valuationInPi,
              metaHash,
            })
          ).toString("base64"),
        })
      );

      txBuilder.addMemo(
        StellarSdk.Memo.text(`TS:CORP:${company.id.slice(-16)}`)
      );
      txBuilder.setTimeout(300);

      const tx = txBuilder.build();
      tx.sign(keypair);

      const result = await this.server.submitTransaction(tx);

      const binding: BlockchainBinding = {
        txHash: result.hash,
        ledger: result.ledger,
        assetCode,
        issuerAccount: keypair.publicKey(),
        confirmedAt: new Date(),
        network: PI_NETWORK_MODE as "testnet" | "mainnet",
        networkPassphrase: this.networkPassphrase,
      };

      company.binding = binding;
      company.status = "active";
      company.updatedAt = new Date();

      this.emit("company:bound", { company, binding });
      return binding;
    } catch (error) {
      company.status = "draft";
      company.updatedAt = new Date();
      this.emit("company:binding-failed", {
        company,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // ==========================================================================
  // Token Operations (Mint, Transfer, Burn)
  // ==========================================================================

  /**
   * Mint tokens — increases circulating supply for a bound product/company
   */
  async mintTokens(
    request: MintRequest,
    signerSecret: string
  ): Promise<TokenTransferResult> {
    const token =
      this.products.get(request.tokenId) ||
      this.companies.get(request.tokenId);
    if (!token) throw new Error(`Token ${request.tokenId} not found`);
    if (!token.binding) throw new Error("Token not bound to blockchain");
    if (token.status !== "active")
      throw new Error(`Token status is ${token.status}, must be active`);

    // Check supply cap
    const currentSupply =
      "circulatingSupply" in token
        ? token.circulatingSupply
        : token.distributed;
    if (currentSupply + request.amount > token.totalSupply) {
      throw new Error(
        `Minting ${request.amount} would exceed total supply of ${token.totalSupply}`
      );
    }

    try {
      const keypair = StellarSdk.Keypair.fromSecret(signerSecret);
      const sourceAccount = await this.server.loadAccount(keypair.publicKey());

      const txBuilder = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      });

      txBuilder.addOperation(
        StellarSdk.Operation.manageData({
          name: `ts:mint:${request.tokenId.slice(-8)}`,
          value: Buffer.from(
            JSON.stringify({
              tokenId: request.tokenId,
              to: request.recipientAddress,
              amount: request.amount,
              ts: Date.now(),
            })
          ).toString("base64"),
        })
      );

      txBuilder.addMemo(
        StellarSdk.Memo.text(
          request.memo || `MINT:${request.amount}`
        )
      );
      txBuilder.setTimeout(180);

      const tx = txBuilder.build();
      tx.sign(keypair);
      const result = await this.server.submitTransaction(tx);

      // Update local state
      if ("circulatingSupply" in token) {
        token.circulatingSupply += request.amount;
      } else {
        token.distributed += request.amount;
      }
      token.updatedAt = new Date();

      // Track holder
      this.addHolder(request.tokenId, {
        address: request.recipientAddress,
        tokenId: request.tokenId,
        amount: request.amount,
        acquiredAt: new Date(),
        txHash: result.hash,
      });

      this.emit("token:minted", {
        tokenId: request.tokenId,
        to: request.recipientAddress,
        amount: request.amount,
        txHash: result.hash,
      });

      return { success: true, txHash: result.hash, ledger: result.ledger };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Transfer tokens between addresses with on-chain recording
   */
  async transferTokens(
    request: TokenTransferRequest,
    signerSecret: string
  ): Promise<TokenTransferResult> {
    const token =
      this.products.get(request.tokenId) ||
      this.companies.get(request.tokenId);
    if (!token) throw new Error(`Token ${request.tokenId} not found`);
    if (!token.binding) throw new Error("Token not bound to blockchain");

    // Check compliance restrictions
    if (token.compliance.accreditedOnly) {
      // In production: verify accredited investor status
    }
    if (token.compliance.restrictedJurisdictions.length > 0) {
      // In production: verify recipient jurisdiction
    }

    // Verify sender holds enough
    const senderHoldings = this.getHolderBalance(
      request.tokenId,
      request.fromAddress
    );
    if (senderHoldings < request.amount) {
      throw new Error(
        `Insufficient balance: holds ${senderHoldings}, transferring ${request.amount}`
      );
    }

    try {
      const keypair = StellarSdk.Keypair.fromSecret(signerSecret);
      const sourceAccount = await this.server.loadAccount(keypair.publicKey());

      const txBuilder = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      });

      txBuilder.addOperation(
        StellarSdk.Operation.manageData({
          name: `ts:xfer:${request.tokenId.slice(-8)}`,
          value: Buffer.from(
            JSON.stringify({
              tokenId: request.tokenId,
              from: request.fromAddress,
              to: request.toAddress,
              amount: request.amount,
              ts: Date.now(),
            })
          ).toString("base64"),
        })
      );

      txBuilder.addMemo(
        StellarSdk.Memo.text(request.memo || `XFER:${request.amount}`)
      );
      txBuilder.setTimeout(180);

      const tx = txBuilder.build();
      tx.sign(keypair);
      const result = await this.server.submitTransaction(tx);

      // Update holder records
      this.deductHolder(request.tokenId, request.fromAddress, request.amount);
      this.addHolder(request.tokenId, {
        address: request.toAddress,
        tokenId: request.tokenId,
        amount: request.amount,
        acquiredAt: new Date(),
        txHash: result.hash,
      });

      // Add provenance if product
      const product = this.products.get(request.tokenId);
      if (product) {
        product.provenance.push({
          timestamp: new Date(),
          action: "transferred",
          actor: request.fromAddress,
          txHash: result.hash,
          details: `${request.amount} units transferred to ${request.toAddress}`,
        });
      }

      this.emit("token:transferred", {
        tokenId: request.tokenId,
        from: request.fromAddress,
        to: request.toAddress,
        amount: request.amount,
        txHash: result.hash,
      });

      return { success: true, txHash: result.hash, ledger: result.ledger };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Burn tokens — permanently removes from circulation with on-chain proof
   */
  async burnTokens(
    request: BurnRequest,
    signerSecret: string
  ): Promise<TokenTransferResult> {
    const token =
      this.products.get(request.tokenId) ||
      this.companies.get(request.tokenId);
    if (!token) throw new Error(`Token ${request.tokenId} not found`);
    if (!token.binding) throw new Error("Token not bound to blockchain");

    const holderBalance = this.getHolderBalance(
      request.tokenId,
      request.ownerAddress
    );
    if (holderBalance < request.amount) {
      throw new Error(
        `Insufficient balance to burn: holds ${holderBalance}, burning ${request.amount}`
      );
    }

    try {
      const keypair = StellarSdk.Keypair.fromSecret(signerSecret);
      const sourceAccount = await this.server.loadAccount(keypair.publicKey());

      const txBuilder = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      });

      txBuilder.addOperation(
        StellarSdk.Operation.manageData({
          name: `ts:burn:${request.tokenId.slice(-8)}`,
          value: Buffer.from(
            JSON.stringify({
              tokenId: request.tokenId,
              from: request.ownerAddress,
              amount: request.amount,
              reason: request.reason,
              ts: Date.now(),
            })
          ).toString("base64"),
        })
      );

      txBuilder.addMemo(StellarSdk.Memo.text(`BURN:${request.amount}`));
      txBuilder.setTimeout(180);

      const tx = txBuilder.build();
      tx.sign(keypair);
      const result = await this.server.submitTransaction(tx);

      // Update state
      this.deductHolder(request.tokenId, request.ownerAddress, request.amount);
      if ("circulatingSupply" in token) {
        token.circulatingSupply -= request.amount;
      } else {
        token.distributed -= request.amount;
      }
      token.updatedAt = new Date();

      this.emit("token:burned", {
        tokenId: request.tokenId,
        amount: request.amount,
        reason: request.reason,
        txHash: result.hash,
      });

      return { success: true, txHash: result.hash, ledger: result.ledger };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // ==========================================================================
  // Verification & Queries
  // ==========================================================================

  /**
   * Verify a product/company binding on-chain — checks the Stellar ledger
   */
  async verifyBinding(tokenId: string): Promise<{
    verified: boolean;
    onChainData?: Record<string, unknown>;
    error?: string;
  }> {
    const token =
      this.products.get(tokenId) || this.companies.get(tokenId);
    if (!token) return { verified: false, error: "Token not found" };
    if (!token.binding) return { verified: false, error: "Not bound" };

    try {
      const tx = await this.server
        .transactions()
        .transaction(token.binding.txHash)
        .call();

      return {
        verified: true,
        onChainData: {
          hash: tx.hash,
          ledger: tx.ledger,
          createdAt: tx.created_at,
          sourceAccount: tx.source_account,
          memo: tx.memo,
          memoType: tx.memo_type,
          operationCount: tx.operation_count,
          successful: tx.successful,
        },
      };
    } catch (error) {
      return {
        verified: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get full provenance chain for a product
   */
  getProvenance(productId: string): ProvenanceRecord[] {
    return this.products.get(productId)?.provenance || [];
  }

  /**
   * Get all holders for a tokenized asset
   */
  getHolders(tokenId: string): TokenHolder[] {
    return this.holders.get(tokenId) || [];
  }

  /**
   * Get a single holder's balance
   */
  getHolderBalance(tokenId: string, address: string): number {
    const tokenHolders = this.holders.get(tokenId) || [];
    return tokenHolders
      .filter((h) => h.address === address)
      .reduce((sum, h) => sum + h.amount, 0);
  }

  getProduct(id: string): TokenizedProduct | undefined {
    return this.products.get(id);
  }

  getCompany(id: string): TokenizedCompany | undefined {
    return this.companies.get(id);
  }

  getAllProducts(): TokenizedProduct[] {
    return Array.from(this.products.values());
  }

  getAllCompanies(): TokenizedCompany[] {
    return Array.from(this.companies.values());
  }

  getProductsByCompany(companyId: string): TokenizedProduct[] {
    const company = this.companies.get(companyId);
    if (!company) return [];
    return company.productIds
      .map((pid) => this.products.get(pid))
      .filter((p): p is TokenizedProduct => p !== undefined);
  }

  /**
   * Search products and companies by keyword
   */
  search(query: string): {
    products: TokenizedProduct[];
    companies: TokenizedCompany[];
  } {
    const q = query.toLowerCase();
    return {
      products: this.getAllProducts().filter(
        (p) =>
          p.metadata.name.toLowerCase().includes(q) ||
          p.metadata.description.toLowerCase().includes(q) ||
          p.category.includes(q)
      ),
      companies: this.getAllCompanies().filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.industry.toLowerCase().includes(q)
      ),
    };
  }

  /**
   * Get statistics for the tokenization ecosystem
   */
  getStats(): {
    totalProducts: number;
    totalCompanies: number;
    boundProducts: number;
    boundCompanies: number;
    totalTokensIssued: number;
    totalValueInPi: number;
    byStandard: Record<TokenStandard, number>;
    byCategory: Record<string, number>;
  } {
    const products = this.getAllProducts();
    const companies = this.getAllCompanies();
    const byStandard: Record<string, number> = {
      "PT-20": 0,
      "PT-721": 0,
      "PT-1155": 0,
    };
    const byCategory: Record<string, number> = {};

    for (const p of products) {
      byStandard[p.standard] = (byStandard[p.standard] || 0) + 1;
      byCategory[p.category] = (byCategory[p.category] || 0) + 1;
    }

    return {
      totalProducts: products.length,
      totalCompanies: companies.length,
      boundProducts: products.filter((p) => p.binding).length,
      boundCompanies: companies.filter((c) => c.binding).length,
      totalTokensIssued: [
        ...products.map((p) => p.circulatingSupply),
        ...companies.map((c) => c.distributed),
      ].reduce((a, b) => a + b, 0),
      totalValueInPi:
        products.reduce(
          (s, p) => s + p.priceInPi * p.circulatingSupply,
          0
        ) + companies.reduce((s, c) => s + c.valuationInPi, 0),
      byStandard: byStandard as Record<TokenStandard, number>,
      byCategory,
    };
  }

  // ==========================================================================
  // Internal Helpers
  // ==========================================================================

  private generateId(prefix: string): string {
    const ts = Date.now().toString(36);
    const rand = Math.random().toString(36).substring(2, 8);
    return `${prefix}-${ts}-${rand}`.toUpperCase();
  }

  /**
   * Derive a Stellar-compatible asset code (max 12 chars) from token ID and standard
   */
  private deriveAssetCode(tokenId: string, standard: TokenStandard): string {
    const stdPrefix = standard === "PT-721" ? "N" : standard === "PT-1155" ? "M" : "F";
    // Use last 10 chars of token ID + standard prefix + "T" for Triumph
    const idPart = tokenId.replace(/[^A-Z0-9]/g, "").slice(-10);
    return `T${stdPrefix}${idPart}`.slice(0, 12);
  }

  /**
   * Hash metadata for on-chain integrity verification
   */
  private hashMetadata(metadata: TokenMetadata): string {
    const str = JSON.stringify({
      name: metadata.name,
      symbol: metadata.symbol,
      description: metadata.description,
      attributes: metadata.attributes,
    });
    // Simple hash for demo; production should use SHA-256
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash + char) | 0;
    }
    return Math.abs(hash).toString(16).padStart(8, "0");
  }

  private addHolder(tokenId: string, holder: TokenHolder): void {
    const existing = this.holders.get(tokenId) || [];
    existing.push(holder);
    this.holders.set(tokenId, existing);
  }

  private deductHolder(
    tokenId: string,
    address: string,
    amount: number
  ): void {
    const existing = this.holders.get(tokenId) || [];
    let remaining = amount;
    const updated: TokenHolder[] = [];

    for (const h of existing) {
      if (h.address === address && remaining > 0) {
        if (h.amount <= remaining) {
          remaining -= h.amount;
          // Remove this holder entry entirely
        } else {
          h.amount -= remaining;
          remaining = 0;
          updated.push(h);
        }
      } else {
        updated.push(h);
      }
    }

    this.holders.set(tokenId, updated);
  }
}

// Singleton instance
export const tokenizationEngine = new TokenizationEngine();
