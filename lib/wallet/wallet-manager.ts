// Stub WalletManager for build-time. Replace with real implementation in production.
export class WalletManager {
  constructor(options?: any) {}

  async createWallet(ownerId: string): Promise<any> {
    return { id: `wallet-${ownerId}`, owner: ownerId };
  }

  async getWallet(walletId: string): Promise<any> {
    return { id: walletId, balance: 0 };
  }

  async signTransaction(walletId: string, payload: any): Promise<any> {
    return { signed: true, payload };
  }

  async sendTransaction(signedTx: any): Promise<any> {
    return { success: true, txId: 'tx-placeholder' };
  }
}
