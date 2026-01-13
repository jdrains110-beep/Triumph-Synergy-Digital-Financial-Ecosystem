# Pi Stable Revoluter Core Integration

## Overview

The **Pi Stable Revoluter Core** is a comprehensive stablecoin system integrated into the Triumph-Synergy ecosystem. This integration provides decentralized stability mechanisms, reserve management, and community governance for the PiStable token.

## Features

### 1. StableCoin (PiStable - PST)
- **ERC20-compatible** stablecoin with enhanced features
- **Transaction fees** (configurable 0-100%)
- **Snapshot functionality** for historical balance tracking
- **Pausable** emergency controls
- **Minting and burning** capabilities for supply management

### 2. Reserve Manager
- **Decentralized reserve system** with multiple asset support
- **Dynamic ratio management** for reserve allocation
- **Emergency withdrawal** mechanisms
- **Transparent reserve tracking**

### 3. Governance System
- **Proposal-based** decision making
- **Quorum requirements** for proposal execution
- **Time-locked voting** periods (7 days default)
- **Community participation** through voting

## Architecture

```
lib/smart-contracts/pi-stable-revoluter-core/
├── contracts/           # Solidity smart contracts
│   ├── StableCoin.sol
│   ├── ReserveManager.sol
│   └── Governance.sol
├── types/              # TypeScript type definitions
│   └── index.ts
├── scripts/            # Deployment and utility scripts
├── tests/              # Test suites
├── docs/               # Documentation
└── index.ts            # Main integration module
```

## Installation

The Pi Stable Revoluter Core is integrated directly into Triumph-Synergy. No additional installation is required.

## Usage

### Initialize the System

```typescript
import { getPiStableRevoluterCore } from "@/lib/smart-contracts/pi-stable-revoluter-core";

// Get singleton instance
const piStable = getPiStableRevoluterCore("pi-mainnet");

// Initialize with contract addresses
await piStable.initialize({
  stableCoin: "0x...",
  reserveManager: "0x...",
  governance: "0x...",
});
```

### StableCoin Operations

```typescript
// Mint new tokens (owner only)
const mintTx = await piStable.mint(recipientAddress, "1000000000000000000"); // 1 token
console.log("Minted:", mintTx.txHash);

// Burn tokens
const burnTx = await piStable.burn("500000000000000000"); // 0.5 tokens
console.log("Burned:", burnTx.txHash);

// Update transaction fee (owner only)
const feeTx = await piStable.setTransactionFee(3); // 3%
console.log("Fee updated:", feeTx.txHash);

// Emergency pause/unpause
await piStable.pauseStableCoin();
await piStable.unpauseStableCoin();
```

### Reserve Management

```typescript
// Add a new reserve asset
const addReserveTx = await piStable.addReserve({
  asset: "0x...", // Asset contract address
  amount: "1000000000000000000", // 1 unit
  ratio: 25, // 25% of total reserves
});

// Remove from reserves
const removeReserveTx = await piStable.removeReserve({
  asset: "0x...",
  amount: "500000000000000000", // 0.5 units
});

// Get reserve information
const reserve = await piStable.getReserve("0x...");
console.log("Reserve:", reserve);

// Get all reserves
const allReserves = await piStable.getAllReserves();
console.log("Total reserves:", allReserves.length);
```

### Governance

```typescript
// Create a new proposal (owner only)
const proposalTx = await piStable.createProposal({
  title: "Increase Transaction Fee",
  description: "Proposal to increase the transaction fee from 3% to 5% to support development",
});

// Vote on a proposal
const voteTx = await piStable.vote({
  proposalId: 1,
  support: true, // true = for, false = against
});

// Execute a proposal (owner only, after voting period)
const executeTx = await piStable.executeProposal(1);

// Get proposal details
const proposal = await piStable.getProposal(1);
console.log("Proposal:", proposal);

// Get all proposals
const proposals = await piStable.getAllProposals();
console.log("Total proposals:", proposals.length);
```

### State Management

```typescript
// Refresh all contract states
await piStable.refreshStates();

// Get contract addresses
const addresses = piStable.getContractAddresses();
console.log("StableCoin:", addresses.stableCoin);
console.log("ReserveManager:", addresses.reserveManager);
console.log("Governance:", addresses.governance);

// Get network information
const info = piStable.getNetworkInfo();
console.log("Network:", info.network);
console.log("Version:", info.version);
```

## Smart Contract Details

### StableCoin.sol

**Key Functions:**
- `mint(address to, uint256 amount)` - Mint new tokens (owner only)
- `burn(uint256 amount)` - Burn tokens from sender
- `setTransactionFee(uint256 newFee)` - Update transaction fee (owner only)
- `setFeeRecipient(address newRecipient)` - Update fee recipient (owner only)
- `snapshot()` - Create a balance snapshot (owner only)
- `pause()` / `unpause()` - Emergency controls (owner only)

**Events:**
- `Transfer(address indexed from, address indexed to, uint256 value)`
- `FeeRecipientChanged(address indexed newRecipient)`
- `TransactionFeeChanged(uint256 newFee)`
- `Paused()` / `Unpaused()`

### ReserveManager.sol

**Key Functions:**
- `addReserve(address asset, uint256 amount, uint256 ratio)` - Add reserve asset
- `removeReserve(address asset, uint256 amount)` - Remove from reserves
- `updateReserveRatio(address asset, uint256 newRatio)` - Update reserve ratio
- `getReserve(address asset)` - Get reserve details
- `getAllReserves()` - Get all reserve assets
- `emergencyWithdraw(address asset, uint256 amount)` - Emergency withdrawal

**Events:**
- `ReserveAdded(address indexed asset, uint256 amount, uint256 ratio)`
- `ReserveRemoved(address indexed asset, uint256 amount)`
- `ReserveRatioUpdated(address indexed asset, uint256 newRatio)`
- `EmergencyWithdrawal(address indexed asset, uint256 amount)`

### Governance.sol

**Key Functions:**
- `createProposal(string title, string description)` - Create new proposal
- `vote(uint256 proposalId, bool support)` - Vote on proposal
- `executeProposal(uint256 proposalId)` - Execute passed proposal
- `cancelProposal(uint256 proposalId)` - Cancel proposal
- `setQuorum(uint256 newQuorum)` - Update quorum requirement

**Events:**
- `ProposalCreated(uint256 indexed id, string title, address indexed proposer)`
- `Voted(uint256 indexed proposalId, address indexed voter, bool support)`
- `ProposalExecuted(uint256 indexed proposalId)`
- `ProposalCanceled(uint256 indexed proposalId)`
- `QuorumChanged(uint256 newQuorum)`

## Security Considerations

1. **Owner Privileges**: Many critical functions are restricted to contract owners
2. **Transaction Fees**: Automatically deducted from transfers to fee recipient
3. **Pausable**: Emergency pause mechanism for critical situations
4. **Quorum Requirements**: Governance proposals require minimum participation
5. **Time Locks**: Voting periods prevent hasty decision-making

## Integration with Existing Contracts

The Pi Stable Revoluter Core is designed to work alongside other Triumph-Synergy smart contracts:

- **Pi Nexus Autonomous Banking Network**: Stablecoin for banking operations
- **Pi Supernode**: Reserve management for node operations
- **Stellar Settlement**: Cross-chain stablecoin transfers

## Testing

```bash
# Run unit tests
pnpm test:unit

# Run integration tests
pnpm test

# Run with coverage
pnpm test:coverage
```

## Deployment

Deployment scripts are available in the `scripts/` directory:

```bash
# Deploy to Pi testnet
pnpm run deploy:pi-testnet

# Deploy to Pi mainnet
pnpm run deploy:pi-mainnet
```

## Contributing

To contribute to the Pi Stable Revoluter Core integration:

1. Follow the existing code structure
2. Maintain backward compatibility
3. Add tests for new features
4. Update documentation
5. Submit pull requests with clear descriptions

## License

MIT License - See LICENSE file for details

## Credits

Original smart contracts by [KOSASIH](https://github.com/KOSASIH/pi-stable-revoluter-core)  
Integration by Triumph-Synergy Team

## Support

For issues or questions:
- Open an issue on GitHub
- Contact: contracts@triumphsynergy.com
- Documentation: https://docs.triumphsynergy.com/pi-stable-revoluter-core

## Version History

- **v1.0.0** - Initial integration into Triumph-Synergy
  - StableCoin contract integration
  - ReserveManager integration
  - Governance system integration
  - TypeScript wrapper implementation
  - Comprehensive documentation
