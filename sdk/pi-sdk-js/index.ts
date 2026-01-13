/**
 * Pi Network Server-Side SDK
 * For server-side payment approval and completion
 */

const PI_API_BASE_URL = process.env.PI_API_URL || "https://api.minepi.com";

export type PiServerPayment = {
  identifier: string;
  user_uid: string;
  amount: number;
  memo: string;
  metadata: Record<string, unknown>;
  status: {
    developer_approved: boolean;
    transaction_verified: boolean;
    developer_completed: boolean;
    cancelled: boolean;
    user_cancelled: boolean;
  };
  to_address: string;
  transaction?: {
    txid: string;
    verified: boolean;
    _link: string;
  };
  created_at: string;
  network: "Pi Network" | "Pi Testnet";
};

export type ApprovePaymentOptions = {
  paymentId: string;
  apiKey?: string;
  appId?: string;
};

export type CompletePaymentOptions = {
  paymentId: string;
  txid: string;
  apiKey?: string;
  appId?: string;
};

/**
 * Pi Network Server SDK
 */
export const Pi = {
  /**
   * Get API key from environment or options
   */
  getApiKey(options?: { apiKey?: string }): string {
    return options?.apiKey || process.env.PI_API_KEY || "";
  },

  /**
   * Approve a payment (server-side)
   */
  async ApprovePayment(
    options: ApprovePaymentOptions
  ): Promise<PiServerPayment> {
    const apiKey = this.getApiKey(options);

    if (!apiKey) {
      throw new Error("PI_API_KEY is required for server-side operations");
    }

    const response = await fetch(
      `${PI_API_BASE_URL}/v2/payments/${options.paymentId}/approve`,
      {
        method: "POST",
        headers: {
          Authorization: `Key ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to approve payment: ${error}`);
    }

    return response.json();
  },

  /**
   * Complete a payment (server-side)
   */
  async CompletePayment(
    options: CompletePaymentOptions
  ): Promise<PiServerPayment> {
    const apiKey = this.getApiKey(options);

    if (!apiKey) {
      throw new Error("PI_API_KEY is required for server-side operations");
    }

    const response = await fetch(
      `${PI_API_BASE_URL}/v2/payments/${options.paymentId}/complete`,
      {
        method: "POST",
        headers: {
          Authorization: `Key ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ txid: options.txid }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to complete payment: ${error}`);
    }

    return response.json();
  },

  /**
   * Get payment details
   */
  async getPayment(
    paymentId: string,
    apiKey?: string
  ): Promise<PiServerPayment> {
    const key = apiKey || process.env.PI_API_KEY || "";

    if (!key) {
      throw new Error("PI_API_KEY is required");
    }

    const response = await fetch(
      `${PI_API_BASE_URL}/v2/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Key ${key}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get payment: ${error}`);
    }

    return response.json();
  },
};

export default Pi;
