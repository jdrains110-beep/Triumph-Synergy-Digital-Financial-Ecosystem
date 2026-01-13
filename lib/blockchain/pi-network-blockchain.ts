// Stub PiNetworkBlockchain used for build-time when real blockchain client
// is not available. This file provides minimal interfaces to satisfy
// TypeScript and allow serverless builds. Replace with real client in production.

export class PiNetworkBlockchain {
	async getTotalCirculation(): Promise<number> {
		return 1_000_000; // placeholder
	}

	async getBalance(_address: string): Promise<number> {
		return 0;
	}

	async burnTokens(_address: string, _amount: number): Promise<any> {
		return { success: true };
	}

	async query(_path: string): Promise<any> {
		return null;
	}

	async someOtherMethod(..._args: any[]): Promise<any> {
		return null;
	}

	// Additional helper methods used across the codebase
	async verifyAddress(address: string): Promise<any> {
		return { address, kycVerified: false, reputation: 0 };
	}

	async verifySignature(_from: string, _signature: string): Promise<boolean> {
		return true;
	}

	async isTransactionInBlockchain(_txHash: string): Promise<boolean> {
		return true;
	}

	async getConfirmationCount(_txHash: string): Promise<number> {
		return 6;
	}

	async queryTransaction(_txHash: string): Promise<any> {
		return null;
	}
}
