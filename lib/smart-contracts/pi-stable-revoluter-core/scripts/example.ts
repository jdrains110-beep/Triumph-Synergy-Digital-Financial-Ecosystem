/**
 * Pi Stable Revoluter Core - Usage Example
 * 
 * Example script demonstrating how to use the Pi Stable Revoluter Core integration
 * 
 * @module lib/smart-contracts/pi-stable-revoluter-core/scripts/example
 */

import { getPiStableRevoluterCore } from "../index";

async function main() {
  console.log("🚀 Pi Stable Revoluter Core - Example Usage\n");

  // Initialize the Pi Stable Revoluter Core
  console.log("1. Initializing Pi Stable Revoluter Core...");
  const piStable = getPiStableRevoluterCore("pi-testnet");
  
  await piStable.initialize({
    stableCoin: "0x1234567890123456789012345678901234567890",
    reserveManager: "0x2345678901234567890123456789012345678901",
    governance: "0x3456789012345678901234567890123456789012",
  });

  console.log("✅ Initialized successfully\n");

  // Get network information
  console.log("2. Network Information:");
  const networkInfo = piStable.getNetworkInfo();
  console.log(`   Network: ${networkInfo.network}`);
  console.log(`   Version: ${networkInfo.version}\n`);

  // Get contract addresses
  console.log("3. Contract Addresses:");
  const addresses = piStable.getContractAddresses();
  console.log(`   StableCoin: ${addresses.stableCoin}`);
  console.log(`   ReserveManager: ${addresses.reserveManager}`);
  console.log(`   Governance: ${addresses.governance}\n`);

  // Example: Mint tokens
  console.log("4. Minting tokens...");
  const mintTx = await piStable.mint(
    "0x9876543210987654321098765432109876543210",
    "1000000000000000000" // 1 PST token
  );
  console.log(`   Transaction Hash: ${mintTx.txHash}`);
  console.log(`   Block Number: ${mintTx.blockNumber}`);
  console.log(`   Status: ${mintTx.status}\n`);

  // Example: Set transaction fee
  console.log("5. Setting transaction fee to 3%...");
  const feeTx = await piStable.setTransactionFee(3);
  console.log(`   Transaction Hash: ${feeTx.txHash}`);
  console.log(`   Status: ${feeTx.status}\n`);

  // Example: Add reserve
  console.log("6. Adding reserve asset...");
  const reserveTx = await piStable.addReserve({
    asset: "0x1111111111111111111111111111111111111111",
    amount: "1000000000000000000", // 1 unit
    ratio: 25, // 25%
  });
  console.log(`   Transaction Hash: ${reserveTx.txHash}`);
  console.log(`   Status: ${reserveTx.status}\n`);

  // Example: Create governance proposal
  console.log("7. Creating governance proposal...");
  const proposalTx = await piStable.createProposal({
    title: "Increase Transaction Fee",
    description: "Proposal to increase transaction fee from 3% to 5%",
  });
  console.log(`   Transaction Hash: ${proposalTx.txHash}`);
  console.log(`   Status: ${proposalTx.status}\n`);

  // Example: Vote on proposal
  console.log("8. Voting on proposal...");
  const voteTx = await piStable.vote({
    proposalId: 1,
    support: true,
  });
  console.log(`   Transaction Hash: ${voteTx.txHash}`);
  console.log(`   Status: ${voteTx.status}\n`);

  console.log("✅ All operations completed successfully!");
  console.log("\n📚 For more information, see:");
  console.log("   - Documentation: docs/README.md");
  console.log("   - Type Definitions: types/index.ts");
  console.log("   - Tests: tests/index.test.ts");
}

// Run the example
main().catch(console.error);
