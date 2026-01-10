/**
 * lib/ecosystem/example-applications.ts
 * Example applications that can integrate with Triumph Synergy ecosystem
 * 
 * These demonstrate how third-party apps can connect to the ecosystem
 * while maintaining consistent Pi Payment handling
 */

import {
  ApplicationIntegration,
  RegisteredApplication,
  PaymentExecutionConfig,
  PaymentResult,
  ApplicationStatus,
} from "./application-registry";
import {
  OfficialPiPayments,
  createPiPayments,
  PiPaymentRequest,
} from "@/lib/payments/pi-payments-official";

// =============================================================================
// EXAMPLE: E-COMMERCE APPLICATION
// =============================================================================

export class ECommerceAppIntegration implements ApplicationIntegration {
  readonly appId = "ecommerce-app";
  readonly name = "Pi E-Commerce Store";
  private piPayments: OfficialPiPayments;

  constructor() {
    this.piPayments = createPiPayments({
      appId: this.appId,
      apiKey: process.env.NEXT_PUBLIC_PI_API_KEY || "",
      apiSecret: process.env.PI_API_SECRET || "",
      sandbox: true,
      completeCallback: async (paymentId: string, txid: string) => {
        console.log(`[E-Commerce] Payment completed: ${txid}`);
        // Handle order fulfillment
      },
    });
  }

  async connect(): Promise<void> {
    try {
      await this.piPayments.connect();
      console.log("[E-Commerce] Connected to Pi Network");
    } catch (error) {
      console.error("[E-Commerce] Connection failed:", error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.piPayments.disconnect();
    console.log("[E-Commerce] Disconnected");
  }

  async executePayment(config: PaymentExecutionConfig): Promise<PaymentResult> {
    const paymentRequest: PiPaymentRequest = {
      amount: config.amount,
      memo: config.memo || "Product Purchase",
      metadata: {
        ...config.metadata,
        appId: this.appId,
        userId: config.userId,
      },
    };

    const result = await this.piPayments.createPayment(paymentRequest);

    return {
      transactionId: result.paymentId,
      status: result.status as any,
      amount: result.amount,
      timestamp: result.timestamp,
      blockchainHash: result.txid,
    };
  }

  async getStatus(): Promise<ApplicationStatus> {
    const health = await this.piPayments.healthCheck();
    return {
      appId: this.appId,
      connected: health.connected,
      healthy: health.sdkAvailable && health.connected,
      lastChecked: new Date(),
      piPaymentReady: health.sdkAvailable,
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const health = await this.piPayments.healthCheck();
      return health.sdkAvailable && health.connected;
    } catch {
      return false;
    }
  }
}

export const eCommerceApp: RegisteredApplication = {
  id: "ecommerce-app",
  name: "Pi E-Commerce Store",
  description: "Buy and sell physical products using Pi payments",
  version: "1.0.0",
  author: "Triumph Synergy",
  apiEndpoint: "https://triumphsynergy.app/api/ecommerce",
  paymentConfig: {
    appId: "ecommerce-app",
    callbackUrl: "https://triumphsynergy.app/api/ecommerce/pi-callback",
    sandbox: true,
  },
  categories: ["commerce", "retail"],
  enabled: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  features: [
    "Product Catalog",
    "Shopping Cart",
    "Pi Payments",
    "Order Tracking",
    "Shipping Integration",
  ],
};

// =============================================================================
// EXAMPLE: MARKETPLACE APPLICATION
// =============================================================================

export class MarketplaceAppIntegration implements ApplicationIntegration {
  readonly appId = "marketplace-app";
  readonly name = "Pi Marketplace";
  private piPayments: OfficialPiPayments;

  constructor() {
    this.piPayments = createPiPayments({
      appId: this.appId,
      apiKey: process.env.NEXT_PUBLIC_PI_API_KEY || "",
      apiSecret: process.env.PI_API_SECRET || "",
      sandbox: true,
    });
  }

  async connect(): Promise<void> {
    await this.piPayments.connect();
    console.log("[Marketplace] Connected to Pi Network");
  }

  async disconnect(): Promise<void> {
    await this.piPayments.disconnect();
  }

  async executePayment(config: PaymentExecutionConfig): Promise<PaymentResult> {
    const paymentRequest: PiPaymentRequest = {
      amount: config.amount,
      memo: config.memo || "Marketplace Transaction",
      metadata: {
        ...config.metadata,
        appId: this.appId,
        seller: config.metadata?.seller,
      },
    };

    const result = await this.piPayments.createPayment(paymentRequest);

    return {
      transactionId: result.paymentId,
      status: result.status as any,
      amount: result.amount,
      timestamp: result.timestamp,
      blockchainHash: result.txid,
    };
  }

  async getStatus(): Promise<ApplicationStatus> {
    const health = await this.piPayments.healthCheck();
    return {
      appId: this.appId,
      connected: health.connected,
      healthy: health.sdkAvailable && health.connected,
      lastChecked: new Date(),
      piPaymentReady: health.sdkAvailable,
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const health = await this.piPayments.healthCheck();
      return health.sdkAvailable;
    } catch {
      return false;
    }
  }
}

export const marketplaceApp: RegisteredApplication = {
  id: "marketplace-app",
  name: "Pi Marketplace",
  description: "Peer-to-peer marketplace for trading goods and services",
  version: "1.0.0",
  author: "Triumph Synergy",
  apiEndpoint: "https://triumphsynergy.app/api/marketplace",
  paymentConfig: {
    appId: "marketplace-app",
    callbackUrl: "https://triumphsynergy.app/api/marketplace/pi-callback",
    sandbox: true,
  },
  categories: ["marketplace", "p2p"],
  enabled: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  features: [
    "Seller Profiles",
    "Listings",
    "Pi Payments",
    "Reputation System",
    "Escrow",
  ],
};

// =============================================================================
// EXAMPLE: GAMING APPLICATION
// =============================================================================

export class GamingAppIntegration implements ApplicationIntegration {
  readonly appId = "gaming-app";
  readonly name = "Pi Gaming Hub";
  private piPayments: OfficialPiPayments;

  constructor() {
    this.piPayments = createPiPayments({
      appId: this.appId,
      apiKey: process.env.NEXT_PUBLIC_PI_API_KEY || "",
      apiSecret: process.env.PI_API_SECRET || "",
      sandbox: true,
    });
  }

  async connect(): Promise<void> {
    await this.piPayments.connect();
    console.log("[Gaming] Connected to Pi Network");
  }

  async disconnect(): Promise<void> {
    await this.piPayments.disconnect();
  }

  async executePayment(config: PaymentExecutionConfig): Promise<PaymentResult> {
    const paymentRequest: PiPaymentRequest = {
      amount: config.amount,
      memo: config.memo || "In-Game Purchase",
      metadata: {
        ...config.metadata,
        appId: this.appId,
        gameId: config.metadata?.gameId,
        itemType: config.metadata?.itemType,
      },
    };

    const result = await this.piPayments.createPayment(paymentRequest);

    return {
      transactionId: result.paymentId,
      status: result.status as any,
      amount: result.amount,
      timestamp: result.timestamp,
      blockchainHash: result.txid,
    };
  }

  async getStatus(): Promise<ApplicationStatus> {
    const health = await this.piPayments.healthCheck();
    return {
      appId: this.appId,
      connected: health.connected,
      healthy: health.sdkAvailable && health.connected,
      lastChecked: new Date(),
      piPaymentReady: health.sdkAvailable,
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const health = await this.piPayments.healthCheck();
      return health.sdkAvailable;
    } catch {
      return false;
    }
  }
}

export const gamingApp: RegisteredApplication = {
  id: "gaming-app",
  name: "Pi Gaming Hub",
  description: "Browser-based games with Pi payment integration",
  version: "1.0.0",
  author: "Triumph Synergy",
  apiEndpoint: "https://triumphsynergy.app/api/gaming",
  paymentConfig: {
    appId: "gaming-app",
    callbackUrl: "https://triumphsynergy.app/api/gaming/pi-callback",
    sandbox: true,
  },
  categories: ["gaming", "entertainment"],
  enabled: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  features: ["Game Titles", "Leaderboards", "In-Game Purchases", "Pi Rewards"],
};

// =============================================================================
// EXPORT ALL EXAMPLE APPLICATIONS
// =============================================================================

export const exampleApplications = [
  {
    app: eCommerceApp,
    integration: new ECommerceAppIntegration() as ApplicationIntegration,
  },
  {
    app: marketplaceApp,
    integration: new MarketplaceAppIntegration() as ApplicationIntegration,
  },
  {
    app: gamingApp,
    integration: new GamingAppIntegration() as ApplicationIntegration,
  },
];
