// Stub PiNetworkBlockchain used for build-time when real blockchain client
// is not available. This file provides minimal interfaces to satisfy
// TypeScript and allow serverless builds. Replace with real client in production.

export class PiNetworkBlockchain {
  constructor(endpoint?: string, apiKey?: string) {}

  async getTotalCirculation(): Promise<number> {
    return 1_000_000; // placeholder
  }

  async getBalance(address: string): Promise<number> {
    return 0;
  }

  async burnTokens(address: string, amount: number): Promise<any> {
    return { success: true };
  }

  async query(path: string): Promise<any> {
    return null;
  }

  async someOtherMethod(...args: any[]): Promise<any> {
    return null;
  }

  // Additional helper methods used across the codebase
  async verifyAddress(address: string): Promise<any> {
    return { address, kycVerified: false, reputation: 0 };
  }

  async verifySignature(from: string, signature: string): Promise<boolean> {
    return true;
  }

  async isTransactionInBlockchain(txHash: string): Promise<boolean> {
    return true;
  }

  async getConfirmationCount(txHash: string): Promise<number> {
    return 6;
  }

  async queryTransaction(txHash: string): Promise<any> {
    return null;
  }
}
