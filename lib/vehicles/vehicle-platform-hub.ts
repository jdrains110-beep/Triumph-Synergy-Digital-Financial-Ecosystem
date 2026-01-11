/**
 * Triumph Synergy - Vehicle Platform Hub
 *
 * Superior automotive marketplace hub for:
 * - Car dealers to sell vehicles
 * - Salesmen with Pi incentives and commissions
 * - Subscription programs for dealerships
 * - Pi Network integrated payments
 *
 * @module lib/vehicles/vehicle-platform-hub
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

export type DealerType =
  | "franchise"
  | "independent"
  | "certified-pre-owned"
  | "luxury"
  | "electric-specialty"
  | "commercial";
export type DealerSubscriptionTier =
  | "starter"
  | "professional"
  | "premier"
  | "enterprise"
  | "mega-dealer";
export type SalesmanTier =
  | "associate"
  | "senior"
  | "master"
  | "elite"
  | "platinum";

export type VehicleType =
  | "sedan"
  | "suv"
  | "truck"
  | "van"
  | "coupe"
  | "convertible"
  | "wagon"
  | "hatchback"
  | "electric"
  | "hybrid"
  | "commercial"
  | "motorcycle"
  | "rv";
export type VehicleCondition =
  | "new"
  | "certified-pre-owned"
  | "used-excellent"
  | "used-good"
  | "used-fair";

export type Dealership = {
  id: string;
  userId: string;

  // Business Info
  dealershipName: string;
  legalName: string;
  dealerType: DealerType;
  dealerLicense: string;

  // Location
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  phone: string;
  email: string;
  website: string | null;

  // Brands
  brandsCarried: string[];
  primaryBrand: string | null;

  // Subscription
  subscriptionTier: DealerSubscriptionTier;
  subscriptionStatus: "trial" | "active" | "past_due" | "cancelled";
  subscriptionStartDate: Date;
  subscriptionEndDate: Date;
  monthlyFee: number;
  monthlyFeeInPi: number;

  // Team
  salesTeam: string[]; // Salesman IDs
  totalSalesmen: number;

  // Inventory
  totalInventory: number;
  activeListings: number;

  // Performance
  totalSales: number;
  totalRevenue: number;
  totalRevenueInPi: number;
  averageRating: number;
  totalReviews: number;

  // Commission Structure
  basePlatformFee: number; // percentage
  piSaleBonus: number; // percentage discount for Pi sales

  // Pi Integration
  piWalletLinked: boolean;
  acceptsPi: boolean;
  piOnlyInventory: number;

  // Features
  featuredDealer: boolean;
  virtualShowroom: boolean;
  homeDelivery: boolean;
  financing: boolean;
  tradeIn: boolean;

  createdAt: Date;
  lastActiveAt: Date;
};

export type Salesman = {
  id: string;
  userId: string;
  dealershipId: string;

  // Profile
  name: string;
  email: string;
  phone: string;
  photo: string;
  bio: string;

  // Tier & Subscription
  tier: SalesmanTier;
  subscriptionActive: boolean;
  monthlyFee: number;
  monthlyFeeInPi: number;

  // Certifications
  certifications: SalesmanCertification[];
  yearsExperience: number;
  specializations: string[];

  // Performance
  totalSales: number;
  totalVolume: number;
  totalVolumeInPi: number;
  monthlyQuota: number;
  quotaProgress: number;
  averageRating: number;
  totalReviews: number;

  // Commission
  commissionRate: number;
  piSalesBonusRate: number;
  totalEarnings: number;
  totalEarningsInPi: number;
  pendingCommissions: number;

  // Incentives
  currentIncentives: Incentive[];
  achievedIncentives: Incentive[];
  lifetimeIncentiveValue: number;

  // Leads
  activeLeads: number;
  convertedLeads: number;
  conversionRate: number;

  // Availability
  available: boolean;
  schedule: SalesmanSchedule;

  createdAt: Date;
  lastActiveAt: Date;
};

export type SalesmanCertification = {
  id: string;
  name: string;
  issuer: string;
  issuedAt: Date;
  expiresAt: Date | null;
  verified: boolean;
};

export type SalesmanSchedule = {
  monday: { start: string; end: string } | null;
  tuesday: { start: string; end: string } | null;
  wednesday: { start: string; end: string } | null;
  thursday: { start: string; end: string } | null;
  friday: { start: string; end: string } | null;
  saturday: { start: string; end: string } | null;
  sunday: { start: string; end: string } | null;
};

export type Incentive = {
  id: string;
  name: string;
  description: string;
  type: "cash" | "pi" | "gift" | "trip" | "bonus-commission";
  value: number;
  valueInPi: number;
  requirements: string;
  targetSales: number;
  currentProgress: number;
  startDate: Date;
  endDate: Date;
  achieved: boolean;
  achievedAt: Date | null;
};

export type Vehicle = {
  id: string;
  dealershipId: string;
  salesmanId: string | null;

  // Basic Info
  vin: string;
  stockNumber: string;
  year: number;
  make: string;
  model: string;
  trim: string;
  vehicleType: VehicleType;
  condition: VehicleCondition;

  // Details
  exteriorColor: string;
  interiorColor: string;
  mileage: number;
  fuelType:
    | "gasoline"
    | "diesel"
    | "electric"
    | "hybrid"
    | "plugin-hybrid"
    | "hydrogen";
  transmission: "automatic" | "manual" | "cvt";
  drivetrain: "fwd" | "rwd" | "awd" | "4wd";
  engine: string;

  // Features
  features: string[];
  packages: string[];

  // Pricing
  msrp: number;
  listPrice: number;
  listPriceInPi: number;
  minimumPrice: number;
  piOnlyPrice: number | null;

  // Media
  images: string[];
  videos: string[];
  virtualTourUrl: string | null;

  // Status
  status: "available" | "pending" | "sold" | "reserved" | "in-transit";
  daysOnLot: number;
  views: number;
  inquiries: number;
  testDrives: number;

  // Carfax/History
  carfaxAvailable: boolean;
  accidents: number;
  owners: number;
  serviceRecords: boolean;

  // Warranty
  warrantyRemaining: string | null;
  extendedWarrantyAvailable: boolean;

  createdAt: Date;
  updatedAt: Date;
};

export type VehicleSale = {
  id: string;
  dealershipId: string;
  salesmanId: string;
  vehicleId: string;
  customerId: string;

  // Vehicle Info
  vehicleInfo: {
    year: number;
    make: string;
    model: string;
    vin: string;
  };

  // Pricing
  salePrice: number;
  salePriceInPi: number;
  paidInPi: number;
  paidInFiat: number;
  paymentMethod: "pi-full" | "pi-partial" | "fiat" | "financing";

  // Trade-In
  hasTradeIn: boolean;
  tradeInValue: number;
  tradeInVehicle: string | null;

  // Fees
  platformFee: number;
  dealershipEarnings: number;
  salesmanCommission: number;
  salesmanCommissionInPi: number;
  piBonus: number;

  // Add-Ons
  addOns: { name: string; price: number }[];
  warranty: { type: string; price: number } | null;

  // Status
  status: "pending" | "approved" | "completed" | "cancelled";

  createdAt: Date;
  completedAt: Date | null;
};

export type DealerSubscriptionPlan = {
  tier: DealerSubscriptionTier;
  name: string;
  monthlyPrice: number;
  monthlyPriceInPi: number;
  annualPrice: number;
  annualPriceInPi: number;
  features: string[];

  // Limits
  maxVehicleListings: number | "unlimited";
  maxSalesmen: number | "unlimited";

  // Fees
  platformFeePerSale: number;
  piSaleDiscount: number;

  // Features
  virtualShowroom: boolean;
  featuredListings: number;
  homeDelivery: boolean;
  financing: boolean;
  analytics: "basic" | "advanced" | "enterprise";
  support: "standard" | "priority" | "dedicated";
};

export type SalesmanSubscriptionPlan = {
  tier: SalesmanTier;
  name: string;
  monthlyPrice: number;
  monthlyPriceInPi: number;
  features: string[];

  // Commission
  baseCommission: number;
  piSalesBonus: number;

  // Leads
  leadAllocation: number | "unlimited";
  priorityLeads: boolean;

  // Tools
  crmAccess: boolean;
  mobileApp: boolean;
  customerInsights: boolean;
};

// ============================================================================
// VEHICLE PLATFORM HUB CLASS
// ============================================================================

class VehiclePlatformHub {
  private readonly dealerships: Map<string, Dealership> = new Map();
  private readonly salesmen: Map<string, Salesman> = new Map();
  private readonly vehicles: Map<string, Vehicle> = new Map();
  private readonly sales: Map<string, VehicleSale> = new Map();

  // ==========================================================================
  // SUBSCRIPTION PLANS
  // ==========================================================================

  getDealerSubscriptionPlans(): DealerSubscriptionPlan[] {
    return [
      {
        tier: "starter",
        name: "Starter Dealer",
        monthlyPrice: 299,
        monthlyPriceInPi: 299 / PI_EXTERNAL_RATE,
        annualPrice: 2868,
        annualPriceInPi: 2868 / PI_EXTERNAL_RATE,
        features: [
          "Up to 25 vehicle listings",
          "3 salesman accounts",
          "Basic analytics",
          "Pi payment acceptance",
          "Standard support",
        ],
        maxVehicleListings: 25,
        maxSalesmen: 3,
        platformFeePerSale: 500,
        piSaleDiscount: 10,
        virtualShowroom: false,
        featuredListings: 0,
        homeDelivery: false,
        financing: false,
        analytics: "basic",
        support: "standard",
      },
      {
        tier: "professional",
        name: "Professional Dealer",
        monthlyPrice: 799,
        monthlyPriceInPi: 799 / PI_EXTERNAL_RATE,
        annualPrice: 7668,
        annualPriceInPi: 7668 / PI_EXTERNAL_RATE,
        features: [
          "Up to 100 vehicle listings",
          "10 salesman accounts",
          "Advanced analytics",
          "Virtual showroom",
          "5 featured listings",
          "Priority support",
          "15% Pi sale discount",
        ],
        maxVehicleListings: 100,
        maxSalesmen: 10,
        platformFeePerSale: 400,
        piSaleDiscount: 15,
        virtualShowroom: true,
        featuredListings: 5,
        homeDelivery: false,
        financing: false,
        analytics: "advanced",
        support: "priority",
      },
      {
        tier: "premier",
        name: "Premier Dealer",
        monthlyPrice: 1999,
        monthlyPriceInPi: 1999 / PI_EXTERNAL_RATE,
        annualPrice: 19_188,
        annualPriceInPi: 19_188 / PI_EXTERNAL_RATE,
        features: [
          "Up to 500 vehicle listings",
          "50 salesman accounts",
          "Enterprise analytics",
          "Virtual showroom",
          "20 featured listings",
          "Home delivery service",
          "Financing integration",
          "Dedicated support",
          "20% Pi sale discount",
        ],
        maxVehicleListings: 500,
        maxSalesmen: 50,
        platformFeePerSale: 300,
        piSaleDiscount: 20,
        virtualShowroom: true,
        featuredListings: 20,
        homeDelivery: true,
        financing: true,
        analytics: "enterprise",
        support: "dedicated",
      },
      {
        tier: "enterprise",
        name: "Enterprise Dealer",
        monthlyPrice: 4999,
        monthlyPriceInPi: 4999 / PI_EXTERNAL_RATE,
        annualPrice: 47_988,
        annualPriceInPi: 47_988 / PI_EXTERNAL_RATE,
        features: [
          "Unlimited vehicle listings",
          "Unlimited salesman accounts",
          "All features included",
          "Multi-location support",
          "100 featured listings",
          "API access",
          "White-label options",
          "25% Pi sale discount",
        ],
        maxVehicleListings: "unlimited",
        maxSalesmen: "unlimited",
        platformFeePerSale: 200,
        piSaleDiscount: 25,
        virtualShowroom: true,
        featuredListings: 100,
        homeDelivery: true,
        financing: true,
        analytics: "enterprise",
        support: "dedicated",
      },
      {
        tier: "mega-dealer",
        name: "Mega Dealer Network",
        monthlyPrice: 14_999,
        monthlyPriceInPi: 14_999 / PI_EXTERNAL_RATE,
        annualPrice: 143_988,
        annualPriceInPi: 143_988 / PI_EXTERNAL_RATE,
        features: [
          "Everything in Enterprise",
          "Dealer group management",
          "Cross-dealership inventory",
          "National advertising",
          "Manufacturer direct programs",
          "Exclusive Pi incentives",
          "30% Pi sale discount",
          "$100 flat platform fee",
        ],
        maxVehicleListings: "unlimited",
        maxSalesmen: "unlimited",
        platformFeePerSale: 100,
        piSaleDiscount: 30,
        virtualShowroom: true,
        featuredListings: 500,
        homeDelivery: true,
        financing: true,
        analytics: "enterprise",
        support: "dedicated",
      },
    ];
  }

  getSalesmanSubscriptionPlans(): SalesmanSubscriptionPlan[] {
    return [
      {
        tier: "associate",
        name: "Associate",
        monthlyPrice: 0,
        monthlyPriceInPi: 0,
        features: [
          "Basic CRM access",
          "5 leads/month",
          "Standard commission (3%)",
          "Mobile app",
        ],
        baseCommission: 3,
        piSalesBonus: 0.5,
        leadAllocation: 5,
        priorityLeads: false,
        crmAccess: true,
        mobileApp: true,
        customerInsights: false,
      },
      {
        tier: "senior",
        name: "Senior Sales",
        monthlyPrice: 49,
        monthlyPriceInPi: 49 / PI_EXTERNAL_RATE,
        features: [
          "Full CRM access",
          "20 leads/month",
          "Enhanced commission (4%)",
          "Customer insights",
          "1% Pi bonus",
        ],
        baseCommission: 4,
        piSalesBonus: 1,
        leadAllocation: 20,
        priorityLeads: false,
        crmAccess: true,
        mobileApp: true,
        customerInsights: true,
      },
      {
        tier: "master",
        name: "Master Sales",
        monthlyPrice: 99,
        monthlyPriceInPi: 99 / PI_EXTERNAL_RATE,
        features: [
          "Full CRM access",
          "50 leads/month",
          "Priority leads",
          "Enhanced commission (5%)",
          "1.5% Pi bonus",
          "Training resources",
        ],
        baseCommission: 5,
        piSalesBonus: 1.5,
        leadAllocation: 50,
        priorityLeads: true,
        crmAccess: true,
        mobileApp: true,
        customerInsights: true,
      },
      {
        tier: "elite",
        name: "Elite Sales",
        monthlyPrice: 199,
        monthlyPriceInPi: 199 / PI_EXTERNAL_RATE,
        features: [
          "Unlimited leads",
          "Top priority leads",
          "Premium commission (6%)",
          "2% Pi bonus",
          "Personal branding",
          "VIP customer access",
        ],
        baseCommission: 6,
        piSalesBonus: 2,
        leadAllocation: "unlimited",
        priorityLeads: true,
        crmAccess: true,
        mobileApp: true,
        customerInsights: true,
      },
      {
        tier: "platinum",
        name: "Platinum Sales",
        monthlyPrice: 399,
        monthlyPriceInPi: 399 / PI_EXTERNAL_RATE,
        features: [
          "Everything in Elite",
          "Exclusive inventory access",
          "Premium commission (7%)",
          "3% Pi bonus",
          "Mentorship program",
          "Annual trip incentive",
          "Platinum recognition",
        ],
        baseCommission: 7,
        piSalesBonus: 3,
        leadAllocation: "unlimited",
        priorityLeads: true,
        crmAccess: true,
        mobileApp: true,
        customerInsights: true,
      },
    ];
  }

  // ==========================================================================
  // DEALERSHIP MANAGEMENT
  // ==========================================================================

  async registerDealership(data: {
    userId: string;
    dealershipName: string;
    legalName: string;
    dealerType: DealerType;
    dealerLicense: string;
    address: Dealership["address"];
    phone: string;
    email: string;
    brandsCarried: string[];
    subscriptionTier: DealerSubscriptionTier;
  }): Promise<Dealership> {
    const id = `dealer-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const plans = this.getDealerSubscriptionPlans();
    const plan = plans.find((p) => p.tier === data.subscriptionTier)!;

    const dealership: Dealership = {
      id,
      userId: data.userId,
      dealershipName: data.dealershipName,
      legalName: data.legalName,
      dealerType: data.dealerType,
      dealerLicense: data.dealerLicense,
      address: data.address,
      phone: data.phone,
      email: data.email,
      website: null,
      brandsCarried: data.brandsCarried,
      primaryBrand: data.brandsCarried[0] || null,
      subscriptionTier: data.subscriptionTier,
      subscriptionStatus: "trial",
      subscriptionStartDate: new Date(),
      subscriptionEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      monthlyFee: plan.monthlyPrice,
      monthlyFeeInPi: plan.monthlyPriceInPi,
      salesTeam: [],
      totalSalesmen: 0,
      totalInventory: 0,
      activeListings: 0,
      totalSales: 0,
      totalRevenue: 0,
      totalRevenueInPi: 0,
      averageRating: 0,
      totalReviews: 0,
      basePlatformFee: plan.platformFeePerSale,
      piSaleBonus: plan.piSaleDiscount,
      piWalletLinked: false,
      acceptsPi: true,
      piOnlyInventory: 0,
      featuredDealer: false,
      virtualShowroom: plan.virtualShowroom,
      homeDelivery: plan.homeDelivery,
      financing: plan.financing,
      tradeIn: true,
      createdAt: new Date(),
      lastActiveAt: new Date(),
    };

    this.dealerships.set(id, dealership);
    return dealership;
  }

  async getDealership(dealershipId: string): Promise<Dealership | null> {
    return this.dealerships.get(dealershipId) || null;
  }

  // ==========================================================================
  // SALESMAN MANAGEMENT
  // ==========================================================================

  async registerSalesman(
    dealershipId: string,
    data: {
      userId: string;
      name: string;
      email: string;
      phone: string;
      tier: SalesmanTier;
      yearsExperience: number;
      specializations?: string[];
    }
  ): Promise<Salesman> {
    const dealership = this.dealerships.get(dealershipId);
    if (!dealership) {
      throw new Error("Dealership not found");
    }

    const id = `salesman-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const plans = this.getSalesmanSubscriptionPlans();
    const plan = plans.find((p) => p.tier === data.tier)!;

    const salesman: Salesman = {
      id,
      userId: data.userId,
      dealershipId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      photo: "",
      bio: "",
      tier: data.tier,
      subscriptionActive: true,
      monthlyFee: plan.monthlyPrice,
      monthlyFeeInPi: plan.monthlyPriceInPi,
      certifications: [],
      yearsExperience: data.yearsExperience,
      specializations: data.specializations || [],
      totalSales: 0,
      totalVolume: 0,
      totalVolumeInPi: 0,
      monthlyQuota: 10,
      quotaProgress: 0,
      averageRating: 0,
      totalReviews: 0,
      commissionRate: plan.baseCommission,
      piSalesBonusRate: plan.piSalesBonus,
      totalEarnings: 0,
      totalEarningsInPi: 0,
      pendingCommissions: 0,
      currentIncentives: this.generateDefaultIncentives(),
      achievedIncentives: [],
      lifetimeIncentiveValue: 0,
      activeLeads: 0,
      convertedLeads: 0,
      conversionRate: 0,
      available: true,
      schedule: {
        monday: { start: "09:00", end: "18:00" },
        tuesday: { start: "09:00", end: "18:00" },
        wednesday: { start: "09:00", end: "18:00" },
        thursday: { start: "09:00", end: "18:00" },
        friday: { start: "09:00", end: "18:00" },
        saturday: { start: "10:00", end: "16:00" },
        sunday: null,
      },
      createdAt: new Date(),
      lastActiveAt: new Date(),
    };

    this.salesmen.set(id, salesman);
    dealership.salesTeam.push(id);
    dealership.totalSalesmen += 1;

    return salesman;
  }

  private generateDefaultIncentives(): Incentive[] {
    return [
      {
        id: "inc-1",
        name: "Quick Start Bonus",
        description: "Sell 3 vehicles in your first month",
        type: "pi",
        value: 500,
        valueInPi: 500 / PI_EXTERNAL_RATE,
        requirements: "3 vehicle sales in first 30 days",
        targetSales: 3,
        currentProgress: 0,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        achieved: false,
        achievedAt: null,
      },
      {
        id: "inc-2",
        name: "Pi Champion",
        description: "Complete 5 sales paid in Pi",
        type: "bonus-commission",
        value: 1000,
        valueInPi: 1000 / PI_EXTERNAL_RATE,
        requirements: "5 vehicles sold with Pi payment",
        targetSales: 5,
        currentProgress: 0,
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        achieved: false,
        achievedAt: null,
      },
      {
        id: "inc-3",
        name: "Monthly MVP",
        description: "Top salesperson of the month",
        type: "trip",
        value: 5000,
        valueInPi: 5000 / PI_EXTERNAL_RATE,
        requirements: "Highest sales volume in the month",
        targetSales: 15,
        currentProgress: 0,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        achieved: false,
        achievedAt: null,
      },
    ];
  }

  async getSalesman(salesmanId: string): Promise<Salesman | null> {
    return this.salesmen.get(salesmanId) || null;
  }

  // ==========================================================================
  // VEHICLE MANAGEMENT
  // ==========================================================================

  async listVehicle(
    dealershipId: string,
    data: {
      vin: string;
      year: number;
      make: string;
      model: string;
      trim: string;
      vehicleType: VehicleType;
      condition: VehicleCondition;
      exteriorColor: string;
      interiorColor: string;
      mileage: number;
      fuelType: Vehicle["fuelType"];
      transmission: Vehicle["transmission"];
      drivetrain: Vehicle["drivetrain"];
      engine: string;
      msrp: number;
      listPrice: number;
      features?: string[];
      images?: string[];
      piOnlyPrice?: number;
    }
  ): Promise<Vehicle> {
    const dealership = this.dealerships.get(dealershipId);
    if (!dealership) {
      throw new Error("Dealership not found");
    }

    const id = `vehicle-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const stockNumber = `STK-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const vehicle: Vehicle = {
      id,
      dealershipId,
      salesmanId: null,
      vin: data.vin,
      stockNumber,
      year: data.year,
      make: data.make,
      model: data.model,
      trim: data.trim,
      vehicleType: data.vehicleType,
      condition: data.condition,
      exteriorColor: data.exteriorColor,
      interiorColor: data.interiorColor,
      mileage: data.mileage,
      fuelType: data.fuelType,
      transmission: data.transmission,
      drivetrain: data.drivetrain,
      engine: data.engine,
      features: data.features || [],
      packages: [],
      msrp: data.msrp,
      listPrice: data.listPrice,
      listPriceInPi: data.listPrice / PI_EXTERNAL_RATE,
      minimumPrice: data.listPrice * 0.9,
      piOnlyPrice: data.piOnlyPrice || null,
      images: data.images || [],
      videos: [],
      virtualTourUrl: null,
      status: "available",
      daysOnLot: 0,
      views: 0,
      inquiries: 0,
      testDrives: 0,
      carfaxAvailable: true,
      accidents: 0,
      owners: data.condition === "new" ? 0 : 1,
      serviceRecords: true,
      warrantyRemaining:
        data.condition === "new" ? "Full manufacturer warranty" : null,
      extendedWarrantyAvailable: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.vehicles.set(id, vehicle);
    dealership.totalInventory += 1;
    dealership.activeListings += 1;
    if (data.piOnlyPrice) {
      dealership.piOnlyInventory += 1;
    }

    return vehicle;
  }

  async getVehicle(vehicleId: string): Promise<Vehicle | null> {
    return this.vehicles.get(vehicleId) || null;
  }

  // ==========================================================================
  // SALES MANAGEMENT
  // ==========================================================================

  async recordSale(data: {
    dealershipId: string;
    salesmanId: string;
    vehicleId: string;
    customerId: string;
    salePrice: number;
    paymentMethod: VehicleSale["paymentMethod"];
    paidInPi?: number;
    hasTradeIn?: boolean;
    tradeInValue?: number;
    tradeInVehicle?: string;
    addOns?: { name: string; price: number }[];
    warranty?: { type: string; price: number };
  }): Promise<VehicleSale> {
    const dealership = this.dealerships.get(data.dealershipId);
    const salesman = this.salesmen.get(data.salesmanId);
    const vehicle = this.vehicles.get(data.vehicleId);

    if (!dealership || !salesman || !vehicle) {
      throw new Error("Invalid sale data");
    }

    const id = `sale-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    // Calculate fees and commissions
    const isPiSale =
      data.paymentMethod === "pi-full" || data.paymentMethod === "pi-partial";
    const platformFee = isPiSale
      ? dealership.basePlatformFee * (1 - dealership.piSaleBonus / 100)
      : dealership.basePlatformFee;

    const commission = data.salePrice * (salesman.commissionRate / 100);
    const piBonus = isPiSale
      ? data.salePrice * (salesman.piSalesBonusRate / 100)
      : 0;

    const sale: VehicleSale = {
      id,
      dealershipId: data.dealershipId,
      salesmanId: data.salesmanId,
      vehicleId: data.vehicleId,
      customerId: data.customerId,
      vehicleInfo: {
        year: vehicle.year,
        make: vehicle.make,
        model: vehicle.model,
        vin: vehicle.vin,
      },
      salePrice: data.salePrice,
      salePriceInPi: data.salePrice / PI_EXTERNAL_RATE,
      paidInPi: data.paidInPi || 0,
      paidInFiat: data.salePrice - (data.paidInPi || 0) * PI_EXTERNAL_RATE,
      paymentMethod: data.paymentMethod,
      hasTradeIn: data.hasTradeIn || false,
      tradeInValue: data.tradeInValue || 0,
      tradeInVehicle: data.tradeInVehicle || null,
      platformFee,
      dealershipEarnings: data.salePrice - platformFee - commission - piBonus,
      salesmanCommission: commission,
      salesmanCommissionInPi: commission / PI_EXTERNAL_RATE,
      piBonus,
      addOns: data.addOns || [],
      warranty: data.warranty || null,
      status: "pending",
      createdAt: new Date(),
      completedAt: null,
    };

    this.sales.set(id, sale);

    // Update vehicle status
    vehicle.status = "sold";

    // Update dealership stats
    dealership.totalSales += 1;
    dealership.totalRevenue += data.salePrice;
    if (isPiSale) {
      dealership.totalRevenueInPi += sale.salePriceInPi;
    }
    dealership.activeListings -= 1;

    // Update salesman stats
    salesman.totalSales += 1;
    salesman.totalVolume += data.salePrice;
    salesman.quotaProgress += 1;
    salesman.totalEarnings += commission + piBonus;
    if (isPiSale) {
      salesman.totalVolumeInPi += sale.salePriceInPi;
      salesman.totalEarningsInPi += sale.salesmanCommissionInPi;
    }

    // Check incentive progress
    for (const incentive of salesman.currentIncentives) {
      incentive.currentProgress += 1;
      if (
        incentive.currentProgress >= incentive.targetSales &&
        !incentive.achieved
      ) {
        incentive.achieved = true;
        incentive.achievedAt = new Date();
        salesman.achievedIncentives.push(incentive);
        salesman.lifetimeIncentiveValue += incentive.value;
      }
    }

    return sale;
  }

  // ==========================================================================
  // DASHBOARD
  // ==========================================================================

  async getDealerDashboard(dealershipId: string): Promise<{
    dealership: Dealership;
    salesTeam: Salesman[];
    inventory: Vehicle[];
    recentSales: VehicleSale[];
    subscriptionPlan: DealerSubscriptionPlan | null;
  }> {
    const dealership = this.dealerships.get(dealershipId);
    if (!dealership) {
      throw new Error("Dealership not found");
    }

    const salesTeam = dealership.salesTeam
      .map((id) => this.salesmen.get(id))
      .filter((s): s is Salesman => s !== undefined);

    const inventory = Array.from(this.vehicles.values()).filter(
      (v) => v.dealershipId === dealershipId && v.status === "available"
    );

    const recentSales = Array.from(this.sales.values())
      .filter((s) => s.dealershipId === dealershipId)
      .slice(-20);

    const plans = this.getDealerSubscriptionPlans();

    return {
      dealership,
      salesTeam,
      inventory,
      recentSales,
      subscriptionPlan:
        plans.find((p) => p.tier === dealership.subscriptionTier) || null,
    };
  }

  // ==========================================================================
  // UTILITIES
  // ==========================================================================

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

export const vehiclePlatformHub = new VehiclePlatformHub();

// Export helper functions
export function getDealerPlans(): DealerSubscriptionPlan[] {
  return vehiclePlatformHub.getDealerSubscriptionPlans();
}

export function getSalesmanPlans(): SalesmanSubscriptionPlan[] {
  return vehiclePlatformHub.getSalesmanSubscriptionPlans();
}

export async function registerDealer(
  data: Parameters<typeof vehiclePlatformHub.registerDealership>[0]
): Promise<Dealership> {
  return vehiclePlatformHub.registerDealership(data);
}

export async function hireSalesman(
  dealershipId: string,
  data: Parameters<typeof vehiclePlatformHub.registerSalesman>[1]
): Promise<Salesman> {
  return vehiclePlatformHub.registerSalesman(dealershipId, data);
}
