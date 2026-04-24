/**
 * Triumph Synergy - Phygital Locations Hub
 *
 * Physical + Digital location infrastructure for:
 * - Hosting and holding all Triumph-Synergy products
 * - Integrated delivery services (USPS, UPS, FedEx, Trucking)
 * - Digital financial ecosystem infrastructure points
 * - Distribution and fulfillment centers
 *
 * @module lib/phygital/phygital-locations-hub
 * @version 1.0.0
 */

// ============================================================================
// CONSTANTS - DUAL PI VALUE SYSTEM
// ============================================================================

const PI_EXTERNAL_RATE = 314.159;
const PI_INTERNAL_RATE = 314_159;
const PI_INTERNAL_MULTIPLIER = 1000;

export type PiValueType = "internal" | "external";

export function getPiRate(type: PiValueType = "external"): number {
  return type === "internal" ? PI_INTERNAL_RATE : PI_EXTERNAL_RATE;
}

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type LocationType =
  | "flagship-hub"
  | "distribution-center"
  | "fulfillment-center"
  | "retail-store"
  | "service-center"
  | "pop-up"
  | "kiosk"
  | "warehouse"
  | "micro-hub";

export type LocationStatus =
  | "planning"
  | "construction"
  | "active"
  | "maintenance"
  | "closed";

export type DeliveryCarrier =
  | "usps"
  | "ups"
  | "fedex"
  | "dhl"
  | "trucking"
  | "local-courier"
  | "drone"
  | "autonomous";

export type DeliverySpeed =
  | "same-day"
  | "next-day"
  | "2-day"
  | "standard"
  | "economy"
  | "freight";

export type PhygitalLocation = {
  id: string;

  // Basic Info
  name: string;
  code: string;
  type: LocationType;
  status: LocationStatus;

  // Address
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };

  // Contact
  phone: string;
  email: string;
  managerId: string;

  // Operations
  operatingHours: OperatingHours;
  timezone: string;
  is24Hours: boolean;

  // Capacity
  squareFootage: number;
  storageCapacity: number; // cubic feet
  productCapacity: number; // units
  currentInventory: number;

  // Services
  services: LocationService[];
  deliveryCarriers: DeliveryCarrierConfig[];

  // Financial
  monthlyOperatingCost: number;
  monthlyRevenue: number;
  monthlyRevenueInPi: number;

  // Digital Infrastructure
  hasDigitalKiosk: boolean;
  hasPiPaymentTerminal: boolean;
  hasBlockchainNode: boolean;
  internetSpeed: number; // Mbps
  backupPower: boolean;

  // Performance
  ordersProcessedDaily: number;
  averageProcessingTime: number; // minutes
  customerSatisfaction: number;
  deliverySuccessRate: number;

  createdAt: Date;
  updatedAt: Date;
};

export type OperatingHours = {
  monday: { open: string; close: string } | null;
  tuesday: { open: string; close: string } | null;
  wednesday: { open: string; close: string } | null;
  thursday: { open: string; close: string } | null;
  friday: { open: string; close: string } | null;
  saturday: { open: string; close: string } | null;
  sunday: { open: string; close: string } | null;
};

export type LocationService =
  | "product-pickup"
  | "product-dropoff"
  | "returns"
  | "customer-service"
  | "pi-exchange"
  | "pi-wallet-setup"
  | "product-demo"
  | "repairs"
  | "custom-orders"
  | "b2b-fulfillment"
  | "cold-storage"
  | "hazmat-handling"
  | "international-shipping";

export type DeliveryCarrierConfig = {
  carrier: DeliveryCarrier;
  enabled: boolean;
  accountNumber: string;
  apiIntegrated: boolean;

  // Capabilities
  speedsAvailable: DeliverySpeed[];
  maxWeight: number; // lbs
  maxDimensions: { length: number; width: number; height: number };

  // Rates (negotiated)
  baseRate: number;
  piDiscountPercentage: number;

  // Performance
  onTimeDeliveryRate: number;
  damageRate: number;
  averageDeliveryDays: number;
};

export type DeliveryOrder = {
  id: string;
  locationId: string;

  // Order Info
  orderNumber: string;
  customerId: string;
  direction: "inbound" | "outbound";

  // Carrier
  carrier: DeliveryCarrier;
  speed: DeliverySpeed;
  trackingNumber: string;

  // Package
  packages: Package[];
  totalWeight: number;

  // Addresses
  origin: Address;
  destination: Address;

  // Status
  status:
    | "pending"
    | "picked-up"
    | "in-transit"
    | "out-for-delivery"
    | "delivered"
    | "returned"
    | "exception";
  statusHistory: StatusUpdate[];

  // Costs
  shippingCost: number;
  shippingCostInPi: number;
  insuranceValue: number;
  paidInPi: boolean;

  // Dates
  createdAt: Date;
  estimatedDelivery: Date;
  actualDelivery: Date | null;
};

export type Package = {
  id: string;
  weight: number;
  dimensions: { length: number; width: number; height: number };
  contents: string;
  value: number;
  requiresSignature: boolean;
};

export type Address = {
  name: string;
  company: string | null;
  street: string;
  street2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
};

export type StatusUpdate = {
  status: string;
  location: string;
  timestamp: Date;
  description: string;
};

export type TruckingPartner = {
  id: string;
  companyName: string;
  dotNumber: string;
  mcNumber: string;

  // Fleet
  fleetSize: number;
  truckTypes: ("box-truck" | "semi" | "flatbed" | "refrigerated" | "tanker")[];

  // Coverage
  serviceAreas: string[];
  nationwide: boolean;

  // Rates
  ratePerMile: number;
  minimumCharge: number;
  piDiscountPercentage: number;

  // Subscription
  subscriptionTier: "basic" | "professional" | "enterprise";
  monthlyFee: number;
  monthlyFeeInPi: number;

  // Performance
  onTimeRate: number;
  safetyRating: number;
  totalDeliveries: number;

  // Pi Integration
  acceptsPi: boolean;
  piWalletLinked: boolean;

  createdAt: Date;
};

export type LocationSubscriptionPlan = {
  tier: "micro" | "standard" | "flagship" | "distribution" | "enterprise";
  name: string;
  monthlyFee: number;
  monthlyFeeInPi: number;
  annualFee: number;
  annualFeeInPi: number;
  features: string[];

  // Limits
  maxSquareFootage: number | "unlimited";
  maxMonthlyOrders: number | "unlimited";
  maxCarriers: number;

  // Services
  services: LocationService[];

  // Support
  supportLevel: "standard" | "priority" | "dedicated";

  // Revenue Share
  platformFee: number;
  piTransactionBonus: number;
};

// ============================================================================
// PHYGITAL LOCATIONS HUB CLASS
// ============================================================================

class PhygitalLocationsHub {
  private readonly locations: Map<string, PhygitalLocation> = new Map();
  private readonly deliveryOrders: Map<string, DeliveryOrder> = new Map();
  private readonly truckingPartners: Map<string, TruckingPartner> = new Map();

  constructor() {
    this.initializeCarrierIntegrations();
  }

  private initializeCarrierIntegrations(): void {
    // Initialize carrier API integrations
    console.log("Phygital Locations Hub initialized with carrier integrations");
  }

  // ==========================================================================
  // SUBSCRIPTION PLANS
  // ==========================================================================

  getLocationSubscriptionPlans(): LocationSubscriptionPlan[] {
    return [
      {
        tier: "micro",
        name: "Micro Hub",
        monthlyFee: 299,
        monthlyFeeInPi: 299 / PI_EXTERNAL_RATE,
        annualFee: 2868,
        annualFeeInPi: 2868 / PI_EXTERNAL_RATE,
        features: [
          "Up to 500 sq ft",
          "Pi payment terminal",
          "2 delivery carriers",
          "100 orders/month",
          "Basic inventory system",
          "Standard support",
        ],
        maxSquareFootage: 500,
        maxMonthlyOrders: 100,
        maxCarriers: 2,
        services: ["product-pickup", "product-dropoff", "pi-exchange"],
        supportLevel: "standard",
        platformFee: 5,
        piTransactionBonus: 2,
      },
      {
        tier: "standard",
        name: "Standard Location",
        monthlyFee: 999,
        monthlyFeeInPi: 999 / PI_EXTERNAL_RATE,
        annualFee: 9588,
        annualFeeInPi: 9588 / PI_EXTERNAL_RATE,
        features: [
          "Up to 2,500 sq ft",
          "Full Pi infrastructure",
          "All major carriers",
          "1,000 orders/month",
          "Advanced inventory",
          "Customer service desk",
          "Priority support",
        ],
        maxSquareFootage: 2500,
        maxMonthlyOrders: 1000,
        maxCarriers: 5,
        services: [
          "product-pickup",
          "product-dropoff",
          "returns",
          "customer-service",
          "pi-exchange",
          "pi-wallet-setup",
        ],
        supportLevel: "priority",
        platformFee: 4,
        piTransactionBonus: 3,
      },
      {
        tier: "flagship",
        name: "Flagship Hub",
        monthlyFee: 4999,
        monthlyFeeInPi: 4999 / PI_EXTERNAL_RATE,
        annualFee: 47_988,
        annualFeeInPi: 47_988 / PI_EXTERNAL_RATE,
        features: [
          "Up to 10,000 sq ft",
          "Full digital ecosystem node",
          "All carriers + trucking",
          "10,000 orders/month",
          "Product demo center",
          "Repair services",
          "Dedicated support",
        ],
        maxSquareFootage: 10_000,
        maxMonthlyOrders: 10_000,
        maxCarriers: 10,
        services: [
          "product-pickup",
          "product-dropoff",
          "returns",
          "customer-service",
          "pi-exchange",
          "pi-wallet-setup",
          "product-demo",
          "repairs",
        ],
        supportLevel: "dedicated",
        platformFee: 3,
        piTransactionBonus: 4,
      },
      {
        tier: "distribution",
        name: "Distribution Center",
        monthlyFee: 14_999,
        monthlyFeeInPi: 14_999 / PI_EXTERNAL_RATE,
        annualFee: 143_988,
        annualFeeInPi: 143_988 / PI_EXTERNAL_RATE,
        features: [
          "Up to 50,000 sq ft",
          "Blockchain infrastructure node",
          "Full carrier network",
          "100,000 orders/month",
          "B2B fulfillment",
          "Cold storage capable",
          "24/7 operations",
        ],
        maxSquareFootage: 50_000,
        maxMonthlyOrders: 100_000,
        maxCarriers: 15,
        services: [
          "product-pickup",
          "product-dropoff",
          "returns",
          "customer-service",
          "pi-exchange",
          "b2b-fulfillment",
          "cold-storage",
          "international-shipping",
        ],
        supportLevel: "dedicated",
        platformFee: 2,
        piTransactionBonus: 5,
      },
      {
        tier: "enterprise",
        name: "Enterprise Complex",
        monthlyFee: 49_999,
        monthlyFeeInPi: 49_999 / PI_EXTERNAL_RATE,
        annualFee: 479_988,
        annualFeeInPi: 479_988 / PI_EXTERNAL_RATE,
        features: [
          "Unlimited square footage",
          "Full ecosystem infrastructure",
          "Unlimited carriers",
          "Unlimited orders",
          "All services included",
          "Autonomous delivery",
          "Drone delivery",
          "Hazmat handling",
        ],
        maxSquareFootage: "unlimited",
        maxMonthlyOrders: "unlimited",
        maxCarriers: 999,
        services: [
          "product-pickup",
          "product-dropoff",
          "returns",
          "customer-service",
          "pi-exchange",
          "pi-wallet-setup",
          "product-demo",
          "repairs",
          "custom-orders",
          "b2b-fulfillment",
          "cold-storage",
          "hazmat-handling",
          "international-shipping",
        ],
        supportLevel: "dedicated",
        platformFee: 1.5,
        piTransactionBonus: 6,
      },
    ];
  }

  // ==========================================================================
  // LOCATION MANAGEMENT
  // ==========================================================================

  async createLocation(data: {
    name: string;
    type: LocationType;
    address: PhygitalLocation["address"];
    phone: string;
    email: string;
    managerId: string;
    squareFootage: number;
    subscriptionTier: LocationSubscriptionPlan["tier"];
  }): Promise<PhygitalLocation> {
    const id = `loc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const code = `TS-${data.address.state.toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const plans = this.getLocationSubscriptionPlans();
    const plan = plans.find((p) => p.tier === data.subscriptionTier)!;

    // Default carrier configurations
    const defaultCarriers: DeliveryCarrierConfig[] = [
      {
        carrier: "usps",
        enabled: true,
        accountNumber: "",
        apiIntegrated: true,
        speedsAvailable: ["standard", "2-day", "next-day"],
        maxWeight: 70,
        maxDimensions: { length: 108, width: 60, height: 60 },
        baseRate: 5.99,
        piDiscountPercentage: 5,
        onTimeDeliveryRate: 94,
        damageRate: 0.5,
        averageDeliveryDays: 3,
      },
      {
        carrier: "ups",
        enabled: true,
        accountNumber: "",
        apiIntegrated: true,
        speedsAvailable: ["standard", "2-day", "next-day", "same-day"],
        maxWeight: 150,
        maxDimensions: { length: 165, width: 130, height: 130 },
        baseRate: 8.99,
        piDiscountPercentage: 6,
        onTimeDeliveryRate: 97,
        damageRate: 0.3,
        averageDeliveryDays: 2,
      },
      {
        carrier: "fedex",
        enabled: true,
        accountNumber: "",
        apiIntegrated: true,
        speedsAvailable: ["standard", "2-day", "next-day", "same-day"],
        maxWeight: 150,
        maxDimensions: { length: 119, width: 119, height: 119 },
        baseRate: 8.49,
        piDiscountPercentage: 6,
        onTimeDeliveryRate: 96,
        damageRate: 0.4,
        averageDeliveryDays: 2,
      },
    ];

    const location: PhygitalLocation = {
      id,
      name: data.name,
      code,
      type: data.type,
      status: "active",
      address: data.address,
      phone: data.phone,
      email: data.email,
      managerId: data.managerId,
      operatingHours: {
        monday: { open: "09:00", close: "21:00" },
        tuesday: { open: "09:00", close: "21:00" },
        wednesday: { open: "09:00", close: "21:00" },
        thursday: { open: "09:00", close: "21:00" },
        friday: { open: "09:00", close: "21:00" },
        saturday: { open: "10:00", close: "18:00" },
        sunday: { open: "12:00", close: "17:00" },
      },
      timezone: "America/New_York",
      is24Hours:
        data.type === "distribution-center" || data.type === "warehouse",
      squareFootage: data.squareFootage,
      storageCapacity: data.squareFootage * 10,
      productCapacity: data.squareFootage * 50,
      currentInventory: 0,
      services: plan.services,
      deliveryCarriers: defaultCarriers.slice(0, plan.maxCarriers),
      monthlyOperatingCost: plan.monthlyFee,
      monthlyRevenue: 0,
      monthlyRevenueInPi: 0,
      hasDigitalKiosk: true,
      hasPiPaymentTerminal: true,
      hasBlockchainNode:
        data.subscriptionTier === "distribution" ||
        data.subscriptionTier === "enterprise",
      internetSpeed: 1000,
      backupPower: true,
      ordersProcessedDaily: 0,
      averageProcessingTime: 15,
      customerSatisfaction: 0,
      deliverySuccessRate: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.locations.set(id, location);
    return location;
  }

  async getLocation(locationId: string): Promise<PhygitalLocation | null> {
    return this.locations.get(locationId) || null;
  }

  async getAllLocations(): Promise<PhygitalLocation[]> {
    return Array.from(this.locations.values());
  }

  // ==========================================================================
  // DELIVERY ORDER MANAGEMENT
  // ==========================================================================

  async createDeliveryOrder(data: {
    locationId: string;
    customerId: string;
    direction: "inbound" | "outbound";
    carrier: DeliveryCarrier;
    speed: DeliverySpeed;
    packages: Omit<Package, "id">[];
    origin: Address;
    destination: Address;
    payInPi?: boolean;
  }): Promise<DeliveryOrder> {
    const location = this.locations.get(data.locationId);
    if (!location) {
      throw new Error("Location not found");
    }

    const id = `del-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const orderNumber = `DEL-${Date.now().toString(36).toUpperCase()}`;
    const trackingNumber = `TS${Math.random().toString(36).slice(2, 12).toUpperCase()}`;

    // Calculate shipping cost
    const packages: Package[] = data.packages.map((pkg, i) => ({
      ...pkg,
      id: `pkg-${i}-${Date.now()}`,
    }));

    const totalWeight = packages.reduce((sum, p) => sum + p.weight, 0);
    const carrierConfig = location.deliveryCarriers.find(
      (c) => c.carrier === data.carrier
    );
    let shippingCost = carrierConfig?.baseRate || 10;
    shippingCost += totalWeight * 0.5; // Weight surcharge

    // Apply Pi discount
    if (data.payInPi && carrierConfig) {
      shippingCost *= 1 - carrierConfig.piDiscountPercentage / 100;
    }

    // Calculate delivery estimate
    const deliveryDays =
      data.speed === "same-day"
        ? 0
        : data.speed === "next-day"
          ? 1
          : data.speed === "2-day"
            ? 2
            : data.speed === "standard"
              ? 5
              : 7;

    const order: DeliveryOrder = {
      id,
      locationId: data.locationId,
      orderNumber,
      customerId: data.customerId,
      direction: data.direction,
      carrier: data.carrier,
      speed: data.speed,
      trackingNumber,
      packages,
      totalWeight,
      origin: data.origin,
      destination: data.destination,
      status: "pending",
      statusHistory: [
        {
          status: "pending",
          location: data.origin.city,
          timestamp: new Date(),
          description: "Order created, awaiting pickup",
        },
      ],
      shippingCost,
      shippingCostInPi: shippingCost / PI_EXTERNAL_RATE,
      insuranceValue: packages.reduce((sum, p) => sum + p.value, 0),
      paidInPi: data.payInPi || false,
      createdAt: new Date(),
      estimatedDelivery: new Date(
        Date.now() + deliveryDays * 24 * 60 * 60 * 1000
      ),
      actualDelivery: null,
    };

    this.deliveryOrders.set(id, order);

    // Update location stats
    location.ordersProcessedDaily += 1;
    if (data.payInPi) {
      location.monthlyRevenueInPi += order.shippingCostInPi;
    }
    location.monthlyRevenue += order.shippingCost;

    return order;
  }

  async updateDeliveryStatus(
    orderId: string,
    status: DeliveryOrder["status"],
    location: string,
    description: string
  ): Promise<DeliveryOrder> {
    const order = this.deliveryOrders.get(orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    order.status = status;
    order.statusHistory.push({
      status,
      location,
      timestamp: new Date(),
      description,
    });

    if (status === "delivered") {
      order.actualDelivery = new Date();
      const loc = this.locations.get(order.locationId);
      if (loc) {
        loc.deliverySuccessRate =
          (loc.deliverySuccessRate * (loc.ordersProcessedDaily - 1) + 100) /
          loc.ordersProcessedDaily;
      }
    }

    return order;
  }

  async trackDelivery(trackingNumber: string): Promise<DeliveryOrder | null> {
    return (
      Array.from(this.deliveryOrders.values()).find(
        (o) => o.trackingNumber === trackingNumber
      ) || null
    );
  }

  // ==========================================================================
  // TRUCKING PARTNER MANAGEMENT
  // ==========================================================================

  async registerTruckingPartner(data: {
    companyName: string;
    dotNumber: string;
    mcNumber: string;
    fleetSize: number;
    truckTypes: TruckingPartner["truckTypes"];
    serviceAreas: string[];
    nationwide: boolean;
    ratePerMile: number;
    subscriptionTier: TruckingPartner["subscriptionTier"];
  }): Promise<TruckingPartner> {
    const id = `truck-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const tierFees = {
      basic: { monthly: 199, piDiscount: 5 },
      professional: { monthly: 499, piDiscount: 8 },
      enterprise: { monthly: 1499, piDiscount: 12 },
    };

    const partner: TruckingPartner = {
      id,
      companyName: data.companyName,
      dotNumber: data.dotNumber,
      mcNumber: data.mcNumber,
      fleetSize: data.fleetSize,
      truckTypes: data.truckTypes,
      serviceAreas: data.serviceAreas,
      nationwide: data.nationwide,
      ratePerMile: data.ratePerMile,
      minimumCharge: 250,
      piDiscountPercentage: tierFees[data.subscriptionTier].piDiscount,
      subscriptionTier: data.subscriptionTier,
      monthlyFee: tierFees[data.subscriptionTier].monthly,
      monthlyFeeInPi:
        tierFees[data.subscriptionTier].monthly / PI_EXTERNAL_RATE,
      onTimeRate: 0,
      safetyRating: 0,
      totalDeliveries: 0,
      acceptsPi: true,
      piWalletLinked: false,
      createdAt: new Date(),
    };

    this.truckingPartners.set(id, partner);
    return partner;
  }

  async getTruckingPartners(): Promise<TruckingPartner[]> {
    return Array.from(this.truckingPartners.values());
  }

  // ==========================================================================
  // UTILITIES
  // ==========================================================================

  getCarrierOptions(): {
    carrier: DeliveryCarrier;
    name: string;
    logo: string;
  }[] {
    return [
      {
        carrier: "usps",
        name: "USPS - United States Postal Service",
        logo: "/carriers/usps.png",
      },
      {
        carrier: "ups",
        name: "UPS - United Parcel Service",
        logo: "/carriers/ups.png",
      },
      { carrier: "fedex", name: "FedEx", logo: "/carriers/fedex.png" },
      { carrier: "dhl", name: "DHL Express", logo: "/carriers/dhl.png" },
      {
        carrier: "trucking",
        name: "Freight & Trucking Partners",
        logo: "/carriers/trucking.png",
      },
      {
        carrier: "local-courier",
        name: "Local Courier Services",
        logo: "/carriers/local.png",
      },
      {
        carrier: "drone",
        name: "Drone Delivery (Coming Soon)",
        logo: "/carriers/drone.png",
      },
      {
        carrier: "autonomous",
        name: "Autonomous Vehicle Delivery",
        logo: "/carriers/autonomous.png",
      },
    ];
  }

  getPiToUsdRate(type: PiValueType = "external"): number {
    return getPiRate(type);
  }

  getDualRateInfo(): {
    internal: number;
    external: number;
    multiplier: number;
  } {
    return {
      internal: PI_INTERNAL_RATE,
      external: PI_EXTERNAL_RATE,
      multiplier: PI_INTERNAL_MULTIPLIER,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const phygitalLocationsHub = new PhygitalLocationsHub();

// Export helper functions
export function getLocationPlans(): LocationSubscriptionPlan[] {
  return phygitalLocationsHub.getLocationSubscriptionPlans();
}

export async function createPhygitalLocation(
  data: Parameters<typeof phygitalLocationsHub.createLocation>[0]
): Promise<PhygitalLocation> {
  return phygitalLocationsHub.createLocation(data);
}

export async function shipOrder(
  data: Parameters<typeof phygitalLocationsHub.createDeliveryOrder>[0]
): Promise<DeliveryOrder> {
  return phygitalLocationsHub.createDeliveryOrder(data);
}
