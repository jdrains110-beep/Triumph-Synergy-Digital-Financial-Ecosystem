# External Smart Contracts Integration Guide

This guide explains how Triumph-Synergy integrates and manages external smart contracts from third-party developers and projects.

## Overview

Triumph-Synergy provides a modular smart contract ecosystem that allows seamless integration of external smart contracts while maintaining their integrity and proper attribution. This approach enables the platform to:

- Host multiple smart contract implementations
- Maintain clear ownership and licensing
- Provide a unified interface for contract discovery and interaction
- Scale to support additional contracts from various sources

## Architecture

### Directory Structure

```
lib/smart-contracts/
├── smart-contract-hub.ts          # Central contract management
├── external/                       # All external contracts
│   ├── index.ts                   # External contracts registry
│   └── {owner}/                   # Grouped by owner/organization
│       └── {project}/             # Project-specific directory
│           ├── README.md          # Attribution and documentation
│           ├── LICENSE            # Original license
│           ├── metadata.json      # Contract metadata
│           └── contracts/         # Smart contract files
│               ├── Contract1.sol
│               ├── Contract2.sol
│               └── ...
```

### Key Components

1. **Smart Contract Hub** (`smart-contract-hub.ts`)
   - Central registry for all contracts
   - External repository management
   - Contract discovery and loading
   - Metadata tracking

2. **External Repository Registry**
   - Tracks all integrated external projects
   - Maintains metadata about each repository
   - Provides discovery mechanisms

3. **Contract Metadata**
   - Version information
   - License details
   - Author attribution
   - Feature descriptions

## Currently Integrated Contracts

### Kosasih's Pi-Supernode

**Source**: [KOSASIH/pi-supernode](https://github.com/KOSASIH/pi-supernode)

**Location**: `lib/smart-contracts/external/kosasih/pi-supernode/`

**Contracts**:
- **PiCoin.sol** - Core Pi Coin token with ERC-20 compatibility
- **Governance.sol** - Decentralized governance and voting system
- **StableCoin.sol** - Stablecoin implementation for Pi ecosystem
- **WrappedPiToken.sol** - Wrapped token for cross-chain compatibility
- **Migrations.sol** - Contract deployment management

## Using External Contracts

### Listing Available Repositories

```typescript
import { listExternalRepositories } from '@/lib/smart-contracts/smart-contract-hub';

// Get all external repositories
const repositories = listExternalRepositories();
console.log(repositories);
```

### Getting Repository Information

```typescript
import { getExternalRepository } from '@/lib/smart-contracts/smart-contract-hub';

// Get specific repository
const piSupernode = getExternalRepository('kosasih/pi-supernode');
console.log(piSupernode);
// {
//   owner: 'kosasih',
//   name: 'pi-supernode',
//   description: '...',
//   version: '2.0.0',
//   contracts: [...]
// }
```

### Accessing Contract Details

```typescript
import { getExternalContract } from '@/lib/smart-contracts/smart-contract-hub';

// Get specific contract
const piCoin = getExternalContract('kosasih/pi-supernode', 'PiCoin');
console.log(piCoin);
// {
//   name: 'PiCoin',
//   fileName: 'PiCoin.sol',
//   language: 'solidity',
//   description: '...',
//   features: [...]
// }
```

### Listing All External Contracts

```typescript
import { listExternalContracts } from '@/lib/smart-contracts/smart-contract-hub';

// List all contracts from all repositories
const allContracts = listExternalContracts();

// List contracts from specific repository
const piSupernodeContracts = listExternalContracts('kosasih/pi-supernode');
```

## Adding New External Contracts

### Step 1: Prepare the Directory Structure

```bash
# Create directory for the new repository
mkdir -p lib/smart-contracts/external/{owner}/{project}/contracts

# Example:
mkdir -p lib/smart-contracts/external/john-doe/awesome-contracts/contracts
```

### Step 2: Copy Contract Files

```bash
# Copy smart contract files
cp /path/to/source/*.sol lib/smart-contracts/external/{owner}/{project}/contracts/

# Copy LICENSE file
cp /path/to/source/LICENSE lib/smart-contracts/external/{owner}/{project}/
```

### Step 3: Create README.md

Create a comprehensive README with:
- Project description
- Original source attribution
- License information
- Contract descriptions
- Usage examples
- Security notes
- Links to original repository

See `lib/smart-contracts/external/kosasih/pi-supernode/README.md` as a template.

### Step 4: Create metadata.json

```json
{
  "id": "owner-project",
  "owner": "owner",
  "name": "project",
  "fullName": "owner/project",
  "description": "Project description",
  "version": "1.0.0",
  "license": "MIT",
  "sourceUrl": "https://github.com/owner/project",
  "localPath": "lib/smart-contracts/external/owner/project",
  "integrationDate": "2026-01-13T00:00:00.000Z",
  "maintainedBy": "Original Author",
  "status": "active",
  "contracts": [
    {
      "name": "ContractName",
      "fileName": "ContractName.sol",
      "language": "solidity",
      "path": "contracts/ContractName.sol",
      "description": "Contract description",
      "version": "1.0.0",
      "features": ["Feature 1", "Feature 2"]
    }
  ]
}
```

### Step 5: Register in Smart Contract Hub

Edit `lib/smart-contracts/smart-contract-hub.ts` and add to `initializeExternalRepositories()`:

```typescript
private initializeExternalRepositories(): void {
  // ... existing repositories ...
  
  // Add new repository
  this.externalRepositories.set("owner/project", {
    id: "owner-project",
    owner: "owner",
    name: "project",
    fullName: "owner/project",
    description: "Project description",
    version: "1.0.0",
    license: "MIT",
    sourceUrl: "https://github.com/owner/project",
    localPath: "lib/smart-contracts/external/owner/project",
    integrationDate: new Date("2026-01-13"),
    maintainedBy: "Original Author",
    status: "active",
    contracts: [
      // ... contract definitions ...
    ],
  });
}
```

### Step 6: Update External Index

Edit `lib/smart-contracts/external/index.ts`:

```typescript
export const EXTERNAL_REPOSITORIES = {
  KOSASIH_PI_SUPERNODE: 'kosasih/pi-supernode',
  OWNER_PROJECT: 'owner/project', // Add new entry
} as const;
```

### Step 7: Create Tests

Create test file `tests/unit/{project}-contracts.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { getExternalRepository, getExternalContract } from '@/lib/smart-contracts/smart-contract-hub';

describe('External Contracts - owner/project', () => {
  it('should have the repository registered', () => {
    const repo = getExternalRepository('owner/project');
    expect(repo).toBeDefined();
    expect(repo?.name).toBe('project');
  });

  it('should have contracts available', () => {
    const contract = getExternalContract('owner/project', 'ContractName');
    expect(contract).toBeDefined();
  });
});
```

## Best Practices

### 1. Maintain Original Integrity

- **Never modify original contract files**
- Copy files exactly as they are from the source
- Include the original LICENSE file
- Document any modifications separately

### 2. Proper Attribution

- Always credit the original author
- Include links to the original repository
- Document the integration date
- Track the version of the integrated code

### 3. Security Considerations

- Review contracts before integration
- Document known security issues
- Include audit information if available
- Recommend testing in testnets

### 4. Documentation

- Create comprehensive README files
- Include usage examples
- Document integration points
- Explain contract features

### 5. Testing

- Write tests for each integrated contract
- Verify contract metadata
- Test discovery mechanisms
- Validate integrity checks

### 6. Version Management

- Track original contract versions
- Document breaking changes
- Update metadata on version changes
- Maintain compatibility information

## API Reference

### Types

```typescript
// External repository type
type ExternalContractRepository = {
  id: string;
  owner: string;
  name: string;
  fullName: string;
  description: string;
  version: string;
  license: string;
  sourceUrl: string;
  localPath: string;
  integrationDate: Date;
  contracts: ExternalContract[];
  maintainedBy: string;
  status: "active" | "deprecated" | "archived";
};

// External contract type
type ExternalContract = {
  name: string;
  fileName: string;
  language: ContractLanguage;
  path: string;
  description: string;
  version: string;
  features: string[];
};
```

### Functions

#### `listExternalRepositories()`
Returns all registered external repositories.

```typescript
function listExternalRepositories(): ExternalContractRepository[]
```

#### `getExternalRepository(fullName: string)`
Gets a specific repository by full name (owner/name).

```typescript
function getExternalRepository(fullName: string): ExternalContractRepository | null
```

#### `getExternalContract(repoFullName: string, contractName: string)`
Gets a specific contract from a repository.

```typescript
function getExternalContract(
  repoFullName: string,
  contractName: string
): ExternalContract | null
```

#### `listExternalContracts(repoFullName?: string)`
Lists all contracts, optionally filtered by repository.

```typescript
function listExternalContracts(
  repoFullName?: string
): Array<ExternalContract & { repository: string }>
```

#### `connectExternalRepository(config)`
Dynamically registers a new external repository.

```typescript
function connectExternalRepository(
  config: {
    owner: string;
    name: string;
    description: string;
    version: string;
    license: string;
    sourceUrl: string;
    localPath: string;
    maintainedBy: string;
    contracts: ExternalContract[];
  }
): Promise<ExternalContractRepository>
```

## Troubleshooting

### Contract Not Found

If a contract is not found:
1. Verify the repository is registered in `smart-contract-hub.ts`
2. Check the contract name matches exactly (case-sensitive)
3. Ensure metadata.json is correct
4. Verify contract files are in the correct location

### Repository Not Listed

If a repository doesn't appear:
1. Check `initializeExternalRepositories()` in `smart-contract-hub.ts`
2. Verify the repository is added to the map
3. Check the repository status is "active"
4. Restart the development server

### Test Failures

If tests fail:
1. Run `npm run test:unit` to see detailed errors
2. Verify metadata matches the test expectations
3. Check that all required files are present
4. Ensure the contract names are correct

## Contributing

To contribute external contract integrations:

1. Fork the Triumph-Synergy repository
2. Follow the integration steps above
3. Create comprehensive tests
4. Update documentation
5. Submit a pull request

Include in your PR:
- Purpose of the integration
- Link to original repository
- License verification
- Test results
- Documentation updates

## Support

For questions or issues with external contract integration:
- Open an issue in the Triumph-Synergy repository
- Tag with `smart-contracts` and `integration`
- Provide full context and error messages

---

**Last Updated**: January 2026  
**Maintained By**: Triumph-Synergy Team
