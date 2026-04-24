// Stub WalletManager for build-time. Replace with real implementation in production.
export class WalletManager {
  async createWallet(ownerId: string): Promise<any> {
    return { id: `wallet-${ownerId}`, owner: ownerId };
  }

  async getWallet(walletId: string): Promise<any> {
    return { id: walletId, balance: 0 };
  }

  async signTransaction(_walletId: string, payload: any): Promise<any> {
    return { signed: true, payload };
  }

  async sendTransaction(_signedTx: any): Promise<any> {
    return { success: true, txId: "tx-placeholder" };
  }
}
