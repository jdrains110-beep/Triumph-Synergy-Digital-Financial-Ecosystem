# External Smart Contracts

This directory hosts smart contracts from external repositories, maintaining their integrity while providing seamless integration with the Triumph-Synergy ecosystem.

## Overview

External smart contracts are integrated into Triumph-Synergy using a modular architecture that:

- **Preserves Original Code**: No modifications to upstream contract logic
- **Maintains Attribution**: Full credit to original authors and licenses
- **Enables Compatibility**: Seamless interaction with Triumph-Synergy features
- **Supports Future Additions**: Easy integration of new external contracts

## Currently Integrated

### Pi-Nexus Autonomous Banking Network

**Author**: [KOSASIH](https://github.com/KOSASIH)  
**Repository**: [pi-nexus-autonomous-banking-network](https://github.com/KOSASIH/pi-nexus-autonomous-banking-network)  
**Contracts**: 8 active contracts

A decentralized, AI-driven banking network with comprehensive smart contracts for:
- Core banking operations
- DAO governance (Global Harmony Nexus)
- Account management and access control
- Compliance (PSD2, GDPR)
- Analytics and fraud detection
- Risk management
- Transaction processing

[📚 View Integration Documentation](../../../docs/pi-nexus-integration.md)

## Directory Structure

```
external/
├── README.md                                    # This file
└── pi-nexus-autonomous-banking-network/
    ├── config.ts                                # Contract registry
    ├── integration.ts                           # Integration layer
    └── index.ts                                 # Public exports
```

## Integration Architecture

### 1. Configuration (`config.ts`)
Defines contract metadata, repository information, and integration settings without containing actual contract code.

### 2. Integration Layer (`integration.ts`)
Provides methods to:
- Load contracts from upstream repositories
- Convert contracts to Triumph-Synergy format
- Manage deployment instructions
- Monitor integration health

### 3. Public Exports (`index.ts`)
Exports public API for accessing external contracts in the Triumph-Synergy ecosystem.

## Usage

### Accessing External Contracts

```typescript
import { smartContractHub } from '@/lib/smart-contracts/smart-contract-hub';

// List all external contracts
const externalContracts = smartContractHub.listExternalContracts();

// Get integration status
const status = await smartContractHub.getExternalIntegrationStatus();

// List all contracts (including external)
const allContracts = await smartContractHub.listContracts({
  includeExternal: true
});
```

### Pi-Nexus Specific

```typescript
import {
  piNexusIntegration,
  loadPiNexusContract,
  loadAllPiNexusContracts,
} from '@/lib/smart-contracts/external/pi-nexus-autonomous-banking-network';

// List Pi-Nexus contracts
const contracts = piNexusIntegration.listContracts();

// Load a specific contract
const contract = await loadPiNexusContract('pi-nexus-banking-core');

// Load all active contracts
const allContracts = await loadAllPiNexusContracts();
```

## Adding New External Contracts

To integrate a new external smart contract repository:

1. **Create Directory Structure**
   ```bash
   mkdir -p lib/smart-contracts/external/[repository-name]
   ```

2. **Create Configuration File** (`config.ts`)
   - Define repository metadata
   - Register available contracts
   - Set integration configuration

3. **Create Integration Layer** (`integration.ts`)
   - Implement contract loading logic
   - Add conversion to SmartContract format
   - Provide deployment instructions

4. **Create Public Exports** (`index.ts`)
   - Export public API
   - Export helper functions

5. **Update Smart Contract Hub**
   - Add to `initializeExternalContracts()` in `smart-contract-hub.ts`

6. **Add Documentation**
   - Create integration guide in `docs/`
   - Update main README

7. **Create Tests**
   - Add unit tests in `tests/unit/`
   - Test contract loading and integration

8. **Update API Routes**
   - Add endpoints for new external contracts
   - Update API documentation

## Integration Principles

### Legal & Attribution
- Always credit original authors
- Maintain original licenses
- Provide links to upstream repositories
- Never claim ownership of external code

### Technical Integrity
- No modifications to original contract logic
- Reference upstream source, don't copy
- Preserve all metadata and attribution
- Maintain backward compatibility

### Security
- Verify upstream repository authenticity
- Check for security audits
- Monitor for vulnerabilities
- Validate dependencies

### Maintenance
- Monitor upstream for updates
- Keep integration layer current
- Document version compatibility
- Test after upstream changes

## API Integration

External contracts are accessible via the Smart Contracts API:

```bash
# List external contracts
GET /api/smart-contracts?action=external

# Get external integration status
GET /api/smart-contracts?action=external-status

# Pi-Nexus specific
GET /api/smart-contracts?action=pi-nexus
```

## Testing

Run tests for external contract integrations:

```bash
# All unit tests
npm run test:unit

# Specific integration tests
npm run test:unit -- pi-nexus-integration.test.ts
```

## Support

For issues with external contract integrations:
1. Check the specific integration documentation
2. Verify upstream repository status
3. Review integration test results
4. Open an issue in Triumph-Synergy repository

For issues with the contracts themselves:
1. Check the upstream repository
2. Contact the original author
3. Review upstream documentation

## Contributing

To contribute external contract integrations:
1. Follow the integration guidelines above
2. Ensure full attribution and license compliance
3. Add comprehensive tests
4. Update documentation
5. Submit a pull request

## License

The integration layer is part of Triumph-Synergy (see root LICENSE).

Each external contract maintains its original license:
- Pi-Nexus: Multiple licenses (Galactic Chain, Universal Consensus, UCTR)

Always respect and maintain upstream licenses.
