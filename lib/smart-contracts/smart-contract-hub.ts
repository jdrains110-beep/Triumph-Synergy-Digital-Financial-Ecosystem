/**
 * Triumph Synergy - Smart Contract Integration Hub
 *
 * GitHub integration for smart contract management
 * Rust and Solidity language support with cross-chain compatibility
 *
 * @module lib/smart-contracts/smart-contract-hub
 * @version 1.0.0
 */

// ============================================================================
// CONSTANTS
// ============================================================================

// Dual Pi Value System
// Internally mined/contributed Pi = 1000x multiplier
// External/non-contributed Pi = base rate
const PI_EXTERNAL_RATE = 314.159; // External non-contributed Pi
const PI_INTERNAL_RATE = 314_159; // Internally mined/contributed Pi (1000x)
const PI_INTERNAL_MULTIPLIER = 1000;

// Performance: Define regex at module level
const FILE_EXTENSION_REGEX = /\.[^.]+$/;
const GITHUB_API_BASE = "https://api.github.com";
const SUPPORTED_LANGUAGES = [
  "rust",
  "solidity",
  "move",
  "cairo",
  "vyper",
] as const;

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type SmartContract = {
  id: string;
  name: string;
  description: string;
  version: string;
  language: ContractLanguage;
  status: ContractStatus;

  // Source
  sourceCode: string;
  compiledBytecode: string | null;
  abi: ContractABI | null;

  // GitHub
  githubRepo: string | null;
  githubPath: string | null;
  githubBranch: string;
  commitHash: string | null;
  lastSyncAt: Date | null;

  // Deployment
  deployedAddress: string | null;
  network: BlockchainNetwork;
  deployedAt: Date | null;
  deploymentTxHash: string | null;

  // Metadata
  author: string;
  license: string;
  tags: string[];
  dependencies: ContractDependency[];

  // Audit
  auditStatus: AuditStatus;
  auditReports: AuditReport[];
  securityScore: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
};

export type ContractLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export type ContractStatus =
  | "draft"
  | "compiled"
  | "tested"
  | "audited"
  | "deployed"
  | "verified"
  | "deprecated";

export type BlockchainNetwork =
  | "pi-mainnet"
  | "pi-testnet"
  | "stellar-mainnet"
  | "stellar-testnet"
  | "ethereum-mainnet"
  | "ethereum-sepolia"
  | "polygon-mainnet"
  | "polygon-mumbai"
  | "solana-mainnet"
  | "solana-devnet";

export type ContractABI = {
  functions: ABIFunction[];
  events: ABIEvent[];
  errors: ABIError[];
};

export type ABIFunction = {
  name: string;
  inputs: ABIParameter[];
  outputs: ABIParameter[];
  stateMutability: "pure" | "view" | "nonpayable" | "payable";
  visibility: "public" | "external" | "internal" | "private";
};

export type ABIEvent = {
  name: string;
  inputs: ABIParameter[];
  anonymous: boolean;
};

export type ABIError = {
  name: string;
  inputs: ABIParameter[];
};

export type ABIParameter = {
  name: string;
  type: string;
  indexed?: boolean;
  components?: ABIParameter[];
};

export type ContractDependency = {
  name: string;
  version: string;
  source: "github" | "crates" | "npm" | "local";
  path: string;
};

export type AuditStatus =
  | "not-audited"
  | "pending"
  | "in-progress"
  | "passed"
  | "failed"
  | "conditional";

export type AuditReport = {
  id: string;
  auditor: string;
  date: Date;
  findings: AuditFinding[];
  overallRating: "critical" | "high" | "medium" | "low" | "informational";
  reportUrl: string;
};

export type AuditFinding = {
  id: string;
  severity: "critical" | "high" | "medium" | "low" | "informational";
  title: string;
  description: string;
  location: string;
  recommendation: string;
  status: "open" | "acknowledged" | "fixed" | "wontfix";
};

export type GitHubRepository = {
  owner: string;
  name: string;
  fullName: string;
  description: string;
  defaultBranch: string;
  language: string;
  topics: string[];
  visibility: "public" | "private";
  cloneUrl: string;
  sshUrl: string;
  lastPush: Date;
};

export type RustContractConfig = {
  cargoToml: string;
  edition: "2018" | "2021" | "2024";
  features: string[];
  target: "wasm32-unknown-unknown" | "native";
  optimizationLevel: 0 | 1 | 2 | 3 | "s" | "z";
};

export type ContractTemplate = {
  id: string;
  name: string;
  description: string;
  language: ContractLanguage;
  category: TemplateCategory;
  sourceCode: string;
  variables: TemplateVariable[];
  preview: string;
};

export type TemplateCategory =
  | "token"
  | "nft"
  | "defi"
  | "governance"
  | "escrow"
  | "marketplace"
  | "real-estate"
  | "identity"
  | "custom";

export type TemplateVariable = {
  name: string;
  type: "string" | "number" | "address" | "boolean";
  description: string;
  defaultValue: string;
  required: boolean;
};

// ============================================================================
// SMART CONTRACT HUB CLASS
// ============================================================================

class SmartContractHub {
  private readonly contracts: Map<string, SmartContract> = new Map();
  private readonly templates: Map<string, ContractTemplate> = new Map();
  private readonly repositories: Map<string, GitHubRepository> = new Map();
  private readonly externalContracts: Map<string, SmartContract> = new Map();

  constructor() {
    this.initializeDefaultTemplates();
    this.initializeExternalContracts();
  }

  private async initializeExternalContracts(): Promise<void> {
    try {
      // Dynamically import Pi-Nexus integration
      const { loadAllPiNexusContracts } = await import(
        "./external/pi-nexus-autonomous-banking-network"
      );
      const piNexusContracts = await loadAllPiNexusContracts();
      
      for (const contract of piNexusContracts) {
        this.externalContracts.set(contract.id, contract);
      }
    } catch (error) {
      // External contracts are optional, log but don't fail
      console.warn("Failed to load external contracts:", error);
    }
  }

  private initializeDefaultTemplates(): void {
    // Pi Network Token Template (Rust)
    this.templates.set("pi-token-rust", {
      id: "pi-token-rust",
      name: "Pi Network Token",
      description: "Standard Pi Network token implementation in Rust",
      language: "rust",
      category: "token",
      sourceCode: `
use pi_sdk::prelude::*;

#[pi_contract]
pub struct PiToken {
    name: String,
    symbol: String,
    decimals: u8,
    total_supply: u128,
    balances: HashMap<Address, u128>,
    allowances: HashMap<(Address, Address), u128>,
}

impl PiToken {
    pub fn new(name: String, symbol: String, initial_supply: u128) -> Self {
        let mut balances = HashMap::new();
        balances.insert(env::caller(), initial_supply);
        
        Self {
            name,
            symbol,
            decimals: 18,
            total_supply: initial_supply,
            balances,
            allowances: HashMap::new(),
        }
    }

    pub fn transfer(&mut self, to: Address, amount: u128) -> Result<(), Error> {
        let from = env::caller();
        let from_balance = self.balances.get(&from).copied().unwrap_or(0);
        
        require!(from_balance >= amount, "Insufficient balance");
        
        self.balances.insert(from, from_balance - amount);
        let to_balance = self.balances.get(&to).copied().unwrap_or(0);
        self.balances.insert(to, to_balance + amount);
        
        emit!(Transfer { from, to, amount });
        Ok(())
    }

    pub fn balance_of(&self, account: Address) -> u128 {
        self.balances.get(&account).copied().unwrap_or(0)
    }
}
`,
      variables: [
        {
          name: "TOKEN_NAME",
          type: "string",
          description: "Token name",
          defaultValue: "Triumph Token",
          required: true,
        },
        {
          name: "TOKEN_SYMBOL",
          type: "string",
          description: "Token symbol",
          defaultValue: "TRI",
          required: true,
        },
        {
          name: "INITIAL_SUPPLY",
          type: "number",
          description: "Initial supply",
          defaultValue: "1000000",
          required: true,
        },
      ],
      preview: "Standard ERC-20 compatible token for Pi Network",
    });

    // Real Estate Deed Template (Rust)
    this.templates.set("real-estate-deed-rust", {
      id: "real-estate-deed-rust",
      name: "Real Estate Deed NFT",
      description: "Allodial deed representation as NFT on Pi Network",
      language: "rust",
      category: "real-estate",
      sourceCode: `
use pi_sdk::prelude::*;

#[pi_contract]
pub struct AllodialDeed {
    deeds: HashMap<u256, DeedRecord>,
    owners: HashMap<Address, Vec<u256>>,
    deed_counter: u256,
    registry_authority: Address,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct DeedRecord {
    id: u256,
    owner: Address,
    property_address: String,
    parcel_id: String,
    legal_description: String,
    deed_type: DeedType,
    recorded_at: u64,
    transfer_history: Vec<Transfer>,
    encumbrances: Vec<Encumbrance>,
    is_allodial: bool,
}

#[derive(Clone, Serialize, Deserialize)]
pub enum DeedType {
    Warranty,
    Quitclaim,
    Special,
    Allodial,
    Fee Simple,
}

impl AllodialDeed {
    pub fn mint_deed(
        &mut self,
        owner: Address,
        property_address: String,
        parcel_id: String,
        legal_description: String,
    ) -> Result<u256, Error> {
        require!(env::caller() == self.registry_authority, "Unauthorized");
        
        let deed_id = self.deed_counter;
        self.deed_counter += 1;
        
        let deed = DeedRecord {
            id: deed_id,
            owner,
            property_address,
            parcel_id,
            legal_description,
            deed_type: DeedType::Allodial,
            recorded_at: env::block_timestamp(),
            transfer_history: vec![],
            encumbrances: vec![],
            is_allodial: true,
        };
        
        self.deeds.insert(deed_id, deed);
        self.owners.entry(owner).or_default().push(deed_id);
        
        emit!(DeedMinted { deed_id, owner, parcel_id });
        Ok(deed_id)
    }

    pub fn transfer_deed(&mut self, deed_id: u256, to: Address) -> Result<(), Error> {
        let deed = self.deeds.get_mut(&deed_id).ok_or("Deed not found")?;
        require!(deed.owner == env::caller(), "Not the owner");
        
        let from = deed.owner;
        deed.owner = to;
        deed.transfer_history.push(Transfer {
            from,
            to,
            timestamp: env::block_timestamp(),
            tx_hash: env::tx_hash(),
        });
        
        // Update ownership mappings
        if let Some(deeds) = self.owners.get_mut(&from) {
            deeds.retain(|&id| id != deed_id);
        }
        self.owners.entry(to).or_default().push(deed_id);
        
        emit!(DeedTransferred { deed_id, from, to });
        Ok(())
    }
}
`,
      variables: [
        {
          name: "REGISTRY_AUTHORITY",
          type: "address",
          description: "Registry authority address",
          defaultValue: "",
          required: true,
        },
      ],
      preview: "Allodial deed smart contract for property ownership",
    });

    // Escrow Template (Rust)
    this.templates.set("escrow-rust", {
      id: "escrow-rust",
      name: "Pi Escrow Contract",
      description: "Secure escrow for Pi Network transactions",
      language: "rust",
      category: "escrow",
      sourceCode: `
use pi_sdk::prelude::*;

#[pi_contract]
pub struct PiEscrow {
    escrows: HashMap<u256, EscrowRecord>,
    escrow_counter: u256,
    platform_fee_bps: u16,
    platform_treasury: Address,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct EscrowRecord {
    id: u256,
    buyer: Address,
    seller: Address,
    amount: u128,
    status: EscrowStatus,
    created_at: u64,
    deadline: u64,
    conditions: Vec<EscrowCondition>,
    dispute_resolver: Option<Address>,
}

#[derive(Clone, Serialize, Deserialize)]
pub enum EscrowStatus {
    Created,
    Funded,
    ConditionsMet,
    Released,
    Refunded,
    Disputed,
}

impl PiEscrow {
    pub fn create_escrow(
        &mut self,
        seller: Address,
        deadline_days: u64,
        conditions: Vec<String>,
    ) -> Result<u256, Error> {
        let escrow_id = self.escrow_counter;
        self.escrow_counter += 1;
        
        let escrow = EscrowRecord {
            id: escrow_id,
            buyer: env::caller(),
            seller,
            amount: env::attached_value(),
            status: EscrowStatus::Funded,
            created_at: env::block_timestamp(),
            deadline: env::block_timestamp() + (deadline_days * 86400),
            conditions: conditions.into_iter().map(|c| EscrowCondition {
                description: c,
                met: false,
            }).collect(),
            dispute_resolver: None,
        };
        
        self.escrows.insert(escrow_id, escrow);
        
        emit!(EscrowCreated { escrow_id, buyer: env::caller(), seller, amount: env::attached_value() });
        Ok(escrow_id)
    }

    pub fn release_escrow(&mut self, escrow_id: u256) -> Result<(), Error> {
        let escrow = self.escrows.get_mut(&escrow_id).ok_or("Escrow not found")?;
        require!(escrow.buyer == env::caller(), "Only buyer can release");
        require!(matches!(escrow.status, EscrowStatus::Funded | EscrowStatus::ConditionsMet), "Invalid status");
        
        let fee = (escrow.amount * self.platform_fee_bps as u128) / 10000;
        let seller_amount = escrow.amount - fee;
        
        pi::transfer(escrow.seller, seller_amount)?;
        pi::transfer(self.platform_treasury, fee)?;
        
        escrow.status = EscrowStatus::Released;
        
        emit!(EscrowReleased { escrow_id, seller: escrow.seller, amount: seller_amount });
        Ok(())
    }
}
`,
      variables: [
        {
          name: "PLATFORM_FEE_BPS",
          type: "number",
          description: "Platform fee in basis points",
          defaultValue: "250",
          required: true,
        },
        {
          name: "TREASURY_ADDRESS",
          type: "address",
          description: "Treasury address for fees",
          defaultValue: "",
          required: true,
        },
      ],
      preview: "Secure escrow contract with dispute resolution",
    });
  }

  // ==========================================================================
  // GITHUB INTEGRATION
  // ==========================================================================

  async connectGitHubRepository(
    owner: string,
    repo: string,
    accessToken?: string
  ): Promise<GitHubRepository> {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "Triumph-Synergy-Smart-Contracts",
    };

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    // Simulate GitHub API call
    const repository: GitHubRepository = {
      owner,
      name: repo,
      fullName: `${owner}/${repo}`,
      description: `Smart contract repository for ${repo}`,
      defaultBranch: "main",
      language: "Rust",
      topics: ["smart-contracts", "pi-network", "blockchain"],
      visibility: "public",
      cloneUrl: `https://github.com/${owner}/${repo}.git`,
      sshUrl: `git@github.com:${owner}/${repo}.git`,
      lastPush: new Date(),
    };

    this.repositories.set(repository.fullName, repository);
    return repository;
  }

  async syncContractFromGitHub(
    repoFullName: string,
    path: string,
    branch = "main"
  ): Promise<SmartContract> {
    const repository = this.repositories.get(repoFullName);
    if (!repository) {
      throw new Error("Repository not connected");
    }

    // Detect language from file extension
    const extension = path.split(".").pop()?.toLowerCase();
    let language: ContractLanguage = "rust";
    if (extension === "sol") {
      language = "solidity";
    } else if (extension === "move") {
      language = "move";
    } else if (extension === "cairo") {
      language = "cairo";
    } else if (extension === "vy") {
      language = "vyper";
    }

    const id = `contract-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const contract: SmartContract = {
      id,
      name:
        path.split("/").pop()?.replace(FILE_EXTENSION_REGEX, "") || "Unknown",
      description: `Contract synced from ${repoFullName}/${path}`,
      version: "1.0.0",
      language,
      status: "draft",
      sourceCode: "", // Would be fetched from GitHub
      compiledBytecode: null,
      abi: null,
      githubRepo: repoFullName,
      githubPath: path,
      githubBranch: branch,
      commitHash: null,
      lastSyncAt: new Date(),
      deployedAddress: null,
      network: "pi-mainnet",
      deployedAt: null,
      deploymentTxHash: null,
      author: repository.owner,
      license: "MIT",
      tags: ["github-synced"],
      dependencies: [],
      auditStatus: "not-audited",
      auditReports: [],
      securityScore: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.contracts.set(id, contract);
    return contract;
  }

  // ==========================================================================
  // CONTRACT MANAGEMENT
  // ==========================================================================

  async createContract(data: {
    name: string;
    description: string;
    language: ContractLanguage;
    sourceCode: string;
    network: BlockchainNetwork;
    author: string;
  }): Promise<SmartContract> {
    const id = `contract-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const contract: SmartContract = {
      id,
      name: data.name,
      description: data.description,
      version: "1.0.0",
      language: data.language,
      status: "draft",
      sourceCode: data.sourceCode,
      compiledBytecode: null,
      abi: null,
      githubRepo: null,
      githubPath: null,
      githubBranch: "main",
      commitHash: null,
      lastSyncAt: null,
      deployedAddress: null,
      network: data.network,
      deployedAt: null,
      deploymentTxHash: null,
      author: data.author,
      license: "MIT",
      tags: [],
      dependencies: [],
      auditStatus: "not-audited",
      auditReports: [],
      securityScore: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.contracts.set(id, contract);
    return contract;
  }

  async compileContract(contractId: string): Promise<{
    success: boolean;
    bytecode: string | null;
    abi: ContractABI | null;
    errors: string[];
    warnings: string[];
  }> {
    const contract = this.contracts.get(contractId);
    if (!contract) {
      throw new Error("Contract not found");
    }

    // Simulate compilation based on language
    const compilationResult = {
      success: true,
      bytecode: `0x${Buffer.from(contract.sourceCode).toString("hex").slice(0, 100)}...`,
      abi: {
        functions: [
          {
            name: "transfer",
            inputs: [
              { name: "to", type: "address" },
              { name: "amount", type: "u128" },
            ],
            outputs: [{ name: "", type: "bool" }],
            stateMutability: "nonpayable" as const,
            visibility: "public" as const,
          },
        ],
        events: [
          {
            name: "Transfer",
            inputs: [
              { name: "from", type: "address", indexed: true },
              { name: "to", type: "address", indexed: true },
              { name: "amount", type: "u128", indexed: false },
            ],
            anonymous: false,
          },
        ],
        errors: [],
      },
      errors: [],
      warnings: [],
    };

    if (compilationResult.success) {
      contract.status = "compiled";
      contract.compiledBytecode = compilationResult.bytecode;
      contract.abi = compilationResult.abi;
      contract.updatedAt = new Date();
    }

    return compilationResult;
  }

  async deployContract(
    contractId: string,
    constructorArgs: unknown[] = []
  ): Promise<{
    address: string;
    txHash: string;
    gasUsed: number;
    blockNumber: number;
  }> {
    const contract = this.contracts.get(contractId);
    if (!contract) {
      throw new Error("Contract not found");
    }

    if (!contract.compiledBytecode) {
      throw new Error("Contract must be compiled before deployment");
    }

    // Simulate deployment
    const address = `0x${Math.random().toString(16).slice(2, 42)}`;
    const txHash = `0x${Math.random().toString(16).slice(2, 66)}`;

    contract.deployedAddress = address;
    contract.deploymentTxHash = txHash;
    contract.deployedAt = new Date();
    contract.status = "deployed";
    contract.updatedAt = new Date();

    return {
      address,
      txHash,
      gasUsed: Math.floor(Math.random() * 1_000_000) + 100_000,
      blockNumber: Math.floor(Math.random() * 1_000_000) + 1_000_000,
    };
  }

  async getContract(contractId: string): Promise<SmartContract | null> {
    // Check internal contracts first
    const internalContract = this.contracts.get(contractId);
    if (internalContract) {
      return internalContract;
    }
    
    // Check external contracts
    const externalContract = this.externalContracts.get(contractId);
    if (externalContract) {
      return externalContract;
    }
    
    return null;
  }

  async listContracts(filters?: {
    language?: ContractLanguage;
    status?: ContractStatus;
    network?: BlockchainNetwork;
    includeExternal?: boolean;
  }): Promise<SmartContract[]> {
    let contracts = Array.from(this.contracts.values());
    
    // Include external contracts if requested (default: true)
    if (filters?.includeExternal !== false) {
      contracts = [...contracts, ...Array.from(this.externalContracts.values())];
    }

    if (filters?.language) {
      contracts = contracts.filter((c) => c.language === filters.language);
    }
    if (filters?.status) {
      contracts = contracts.filter((c) => c.status === filters.status);
    }
    if (filters?.network) {
      contracts = contracts.filter((c) => c.network === filters.network);
    }

    return contracts;
  }

  listExternalContracts(): SmartContract[] {
    return Array.from(this.externalContracts.values());
  }

  async getExternalIntegrationStatus(): Promise<{
    piNexus?: ReturnType<typeof import("./external/pi-nexus-autonomous-banking-network").getPiNexusIntegrationStatus>;
  }> {
    const status: ReturnType<typeof this.getExternalIntegrationStatus> = {};
    
    try {
      const { getPiNexusIntegrationStatus } = await import(
        "./external/pi-nexus-autonomous-banking-network"
      );
      status.piNexus = getPiNexusIntegrationStatus();
    } catch (error) {
      console.warn("Failed to get Pi-Nexus integration status:", error);
    }
    
    return status;
  }

  getTemplate(templateId: string): ContractTemplate | null {
    return this.templates.get(templateId) || null;
  }

  listTemplates(category?: TemplateCategory): ContractTemplate[] {
    let templates = Array.from(this.templates.values());

    if (category) {
      templates = templates.filter((t) => t.category === category);
    }

    return templates;
  }

  listRepositories(): GitHubRepository[] {
    return Array.from(this.repositories.values());
  }

  async createFromTemplate(
    templateId: string,
    variables: Record<string, string>,
    contractName: string
  ): Promise<SmartContract> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    // Replace variables in source code
    let sourceCode = template.sourceCode;
    for (const [key, value] of Object.entries(variables)) {
      sourceCode = sourceCode.replace(
        new RegExp(`\\$\\{${key}\\}`, "g"),
        value
      );
    }

    return this.createContract({
      name: contractName,
      description: `Created from template: ${template.name}`,
      language: template.language,
      sourceCode,
      network: "pi-mainnet",
      author: "triumph-synergy",
    });
  }

  // ==========================================================================
  // RUST SPECIFIC FEATURES
  // ==========================================================================

  async configureRustContract(
    contractId: string,
    config: Partial<RustContractConfig>
  ): Promise<RustContractConfig> {
    const contract = this.contracts.get(contractId);
    if (!contract) {
      throw new Error("Contract not found");
    }

    if (contract.language !== "rust") {
      throw new Error("Contract is not a Rust contract");
    }

    const fullConfig: RustContractConfig = {
      cargoToml: config.cargoToml || this.generateCargoToml(contract.name),
      edition: config.edition || "2021",
      features: config.features || ["pi-sdk", "serde"],
      target: config.target || "wasm32-unknown-unknown",
      optimizationLevel: config.optimizationLevel || 3,
    };

    return fullConfig;
  }

  private generateCargoToml(name: string): string {
    return `
[package]
name = "${name.toLowerCase().replace(/\s+/g, "-")}"
version = "1.0.0"
edition = "2021"
authors = ["Triumph Synergy <contracts@triumphsynergy.com>"]

[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
pi-sdk = "1.0"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

[profile.release]
opt-level = 3
lto = true
codegen-units = 1
`;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const smartContractHub = new SmartContractHub();

// Export helper functions
export async function createContract(
  data: Parameters<typeof smartContractHub.createContract>[0]
): Promise<SmartContract> {
  return smartContractHub.createContract(data);
}

export async function compileContract(
  contractId: string
): Promise<ReturnType<typeof smartContractHub.compileContract>> {
  return smartContractHub.compileContract(contractId);
}

export async function deployContract(
  contractId: string,
  constructorArgs?: unknown[]
): Promise<ReturnType<typeof smartContractHub.deployContract>> {
  return smartContractHub.deployContract(contractId, constructorArgs);
}

export async function connectGitHub(
  owner: string,
  repo: string,
  token?: string
): Promise<GitHubRepository> {
  return smartContractHub.connectGitHubRepository(owner, repo, token);
}

export async function syncFromGitHub(
  repoFullName: string,
  path: string,
  branch?: string
): Promise<SmartContract> {
  return smartContractHub.syncContractFromGitHub(repoFullName, path, branch);
}
