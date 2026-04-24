/**
 * Triumph Synergy - E-Commerce Marketplace Hub
 *
 * Superior worldwide marketplace hub for:
 * - Companies to sell products and services
 * - Global vendor subscriptions
 * - Pi Network integrated payments
 * - Multi-vendor marketplace management
 *
 * @module lib/commerce/ecommerce-marketplace-hub
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

export type VendorType =
  | "individual"
  | "small-business"
  | "enterprise"
  | "manufacturer"
  | "wholesaler"
  | "service-provider";
export type VendorCategory =
  | "electronics"
  | "fashion"
  | "home-garden"
  | "health-beauty"
  | "sports-outdoors"
  | "automotive"
  | "food-beverage"
  | "digital-goods"
  | "services"
  | "b2b-supplies"
  | "handmade"
  | "vintage"
  | "art-collectibles"
  | "other";

export type VendorSubscriptionTier =
  | "starter"
  | "professional"
  | "business"
  | "enterprise"
  | "global";
export type VendorStatus = "pending" | "active" | "suspended" | "terminated";
export type ListingStatus =
  | "draft"
  | "pending-review"
  | "active"
  | "paused"
  | "sold-out"
  | "removed";
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "returned"
  | "cancelled"
  | "refunded";

export type Vendor = {
  id: string;
  userId: string;

  // Business Profile
  businessName: string;
  legalName: string;
  vendorType: VendorType;
  categories: VendorCategory[];
  description: string;
  logo: string;
  banner: string;

  // Contact
  email: string;
  phone: string;
  website: string | null;

  // Location
  country: string;
  region: string;
  city: string;
  address: string;
  postalCode: string;

  // Subscription
  subscriptionTier: VendorSubscriptionTier;
  subscriptionStatus: "trial" | "active" | "past_due" | "cancelled";
  subscriptionStartDate: Date;
  subscriptionEndDate: Date;
  monthlyFee: number;
  monthlyFeeInPi: number;

  // Commission Structure
  commissionRate: number; // percentage
  piCommissionBonus: number; // percentage discount when paid in Pi

  // Performance
  totalSales: number;
  totalRevenue: number;
  totalRevenueInPi: number;
  averageRating: number;
  totalReviews: number;

  // Status
  status: VendorStatus;
  verificationStatus: "unverified" | "pending" | "verified" | "premium";
  taxCompliant: boolean;

  // Pi Integration
  piWalletLinked: boolean;
  acceptsPi: boolean;
  piOnlyMode: boolean;

  // Stats
  totalProducts: number;
  activeListings: number;
  totalOrders: number;
  pendingOrders: number;

  // Features
  featuredVendor: boolean;
  storefront: boolean;
  apiAccess: boolean;
  bulkUploads: boolean;
  analyticsAccess: "basic" | "advanced" | "enterprise";

  createdAt: Date;
  lastActiveAt: Date;
};

export type Product = {
  id: string;
  vendorId: string;

  // Basic Info
  name: string;
  description: string;
  shortDescription: string;
  brand: string | null;

  // Categorization
  category: VendorCategory;
  subcategory: string;
  tags: string[];

  // Pricing
  price: number;
  priceInPi: number;
  compareAtPrice: number | null;
  costPerItem: number | null;

  // Inventory
  sku: string;
  barcode: string | null;
  trackInventory: boolean;
  quantity: number;
  lowStockThreshold: number;

  // Variants
  hasVariants: boolean;
  variants: ProductVariant[];

  // Media
  images: string[];
  videos: string[];

  // Shipping
  weight: number;
  weightUnit: "kg" | "lb";
  dimensions: {
    length: number;
    width: number;
    height: number;
    unit: "cm" | "in";
  };
  shippingRequired: boolean;
  shippingClass: string;

  // Digital
  isDigital: boolean;
  digitalUrl: string | null;

  // Status
  status: ListingStatus;
  publishedAt: Date | null;

  // SEO
  seoTitle: string | null;
  seoDescription: string | null;
  slug: string;

  // Stats
  views: number;
  sales: number;
  revenue: number;
  rating: number;
  reviewCount: number;

  createdAt: Date;
  updatedAt: Date;
};

export type ProductVariant = {
  id: string;
  productId: string;
  name: string;
  sku: string;
  price: number;
  priceInPi: number;
  quantity: number;
  options: Record<string, string>;
  image: string | null;
};

export type Order = {
  id: string;
  orderNumber: string;
  vendorId: string;
  customerId: string;

  // Items
  items: OrderItem[];

  // Pricing
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  totalInPi: number;

  // Payment
  paymentMethod: "pi" | "card" | "crypto" | "hybrid";
  paidInPi: number;
  paidInFiat: number;
  paymentStatus: "pending" | "paid" | "refunded" | "failed";

  // Status
  status: OrderStatus;

  // Shipping
  shippingAddress: ShippingAddress;
  shippingMethod: string;
  trackingNumber: string | null;
  estimatedDelivery: Date | null;
  actualDelivery: Date | null;

  // Fees
  platformFee: number;
  vendorEarnings: number;
  vendorEarningsInPi: number;

  // Notes
  customerNotes: string | null;
  vendorNotes: string | null;

  createdAt: Date;
  updatedAt: Date;
};

export type OrderItem = {
  id: string;
  productId: string;
  variantId: string | null;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  priceInPi: number;
  total: number;
};

export type ShippingAddress = {
  name: string;
  company: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
};

export type VendorSubscriptionPlan = {
  tier: VendorSubscriptionTier;
  name: string;
  monthlyPrice: number;
  monthlyPriceInPi: number;
  annualPrice: number;
  annualPriceInPi: number;
  features: string[];

  // Limits
  maxProducts: number | "unlimited";
  maxMonthlyOrders: number | "unlimited";
  maxStaff: number;

  // Fees
  commissionRate: number;
  transactionFee: number;
  piTransactionBonus: number;

  // Features
  storefront: boolean;
  customDomain: boolean;
  apiAccess: boolean;
  bulkUploads: boolean;
  inventoryManagement: boolean;
  analytics: "basic" | "advanced" | "enterprise";
  support: "community" | "email" | "priority" | "dedicated";

  // Marketing
  featuredListings: number;
  adsCredits: number;
};

export type VendorAnalytics = {
  vendorId: string;
  period: "day" | "week" | "month" | "year";

  // Sales
  totalSales: number;
  totalRevenue: number;
  totalRevenueInPi: number;
  averageOrderValue: number;

  // Traffic
  storeViews: number;
  productViews: number;
  conversionRate: number;

  // Products
  topProducts: {
    productId: string;
    name: string;
    sales: number;
    revenue: number;
  }[];
  lowStockProducts: { productId: string; name: string; quantity: number }[];

  // Customers
  newCustomers: number;
  returningCustomers: number;

  // Ratings
  averageRating: number;
  newReviews: number;
};

// ============================================================================
// E-COMMERCE MARKETPLACE HUB CLASS
// ============================================================================

class EcommerceMarketplaceHub {
  private readonly vendors: Map<string, Vendor> = new Map();
  private readonly products: Map<string, Product> = new Map();
  private readonly orders: Map<string, Order> = new Map();

  // ==========================================================================
  // SUBSCRIPTION PLANS
  // ==========================================================================

  getVendorSubscriptionPlans(): VendorSubscriptionPlan[] {
    return [
      {
        tier: "starter",
        name: "Starter Seller",
        monthlyPrice: 0,
        monthlyPriceInPi: 0,
        annualPrice: 0,
        annualPriceInPi: 0,
        features: [
          "Up to 25 product listings",
          "Basic storefront",
          "Pi payments accepted",
          "Community support",
          "Basic analytics",
        ],
        maxProducts: 25,
        maxMonthlyOrders: 100,
        maxStaff: 1,
        commissionRate: 15,
        transactionFee: 2.9,
        piTransactionBonus: 2,
        storefront: true,
        customDomain: false,
        apiAccess: false,
        bulkUploads: false,
        inventoryManagement: false,
        analytics: "basic",
        support: "community",
        featuredListings: 0,
        adsCredits: 0,
      },
      {
        tier: "professional",
        name: "Professional Vendor",
        monthlyPrice: 49,
        monthlyPriceInPi: 49 / PI_EXTERNAL_RATE,
        annualPrice: 470,
        annualPriceInPi: 470 / PI_EXTERNAL_RATE,
        features: [
          "Up to 250 product listings",
          "Custom storefront",
          "Bulk product uploads",
          "Inventory management",
          "Advanced analytics",
          "Email support",
          "Pi payment priority",
          "3% Pi transaction bonus",
        ],
        maxProducts: 250,
        maxMonthlyOrders: 500,
        maxStaff: 3,
        commissionRate: 12,
        transactionFee: 2.5,
        piTransactionBonus: 3,
        storefront: true,
        customDomain: false,
        apiAccess: false,
        bulkUploads: true,
        inventoryManagement: true,
        analytics: "advanced",
        support: "email",
        featuredListings: 5,
        adsCredits: 50,
      },
      {
        tier: "business",
        name: "Business Pro",
        monthlyPrice: 149,
        monthlyPriceInPi: 149 / PI_EXTERNAL_RATE,
        annualPrice: 1428,
        annualPriceInPi: 1428 / PI_EXTERNAL_RATE,
        features: [
          "Up to 1,000 product listings",
          "Custom domain",
          "API access",
          "Priority support",
          "Dedicated account manager",
          "4% Pi transaction bonus",
          "Featured store placement",
          "5 staff accounts",
        ],
        maxProducts: 1000,
        maxMonthlyOrders: 2000,
        maxStaff: 5,
        commissionRate: 10,
        transactionFee: 2.0,
        piTransactionBonus: 4,
        storefront: true,
        customDomain: true,
        apiAccess: true,
        bulkUploads: true,
        inventoryManagement: true,
        analytics: "advanced",
        support: "priority",
        featuredListings: 15,
        adsCredits: 200,
      },
      {
        tier: "enterprise",
        name: "Enterprise",
        monthlyPrice: 499,
        monthlyPriceInPi: 499 / PI_EXTERNAL_RATE,
        annualPrice: 4788,
        annualPriceInPi: 4788 / PI_EXTERNAL_RATE,
        features: [
          "Up to 10,000 product listings",
          "All Business features",
          "Custom integrations",
          "Multi-warehouse support",
          "White-label options",
          "5% Pi transaction bonus",
          "10 staff accounts",
          "SLA guarantee",
        ],
        maxProducts: 10_000,
        maxMonthlyOrders: 10_000,
        maxStaff: 10,
        commissionRate: 8,
        transactionFee: 1.5,
        piTransactionBonus: 5,
        storefront: true,
        customDomain: true,
        apiAccess: true,
        bulkUploads: true,
        inventoryManagement: true,
        analytics: "enterprise",
        support: "dedicated",
        featuredListings: 50,
        adsCredits: 500,
      },
      {
        tier: "global",
        name: "Global Marketplace",
        monthlyPrice: 1499,
        monthlyPriceInPi: 1499 / PI_EXTERNAL_RATE,
        annualPrice: 14_388,
        annualPriceInPi: 14_388 / PI_EXTERNAL_RATE,
        features: [
          "Unlimited product listings",
          "Unlimited orders",
          "Multi-currency support",
          "Global fulfillment network",
          "International tax compliance",
          "6% Pi transaction bonus",
          "Unlimited staff accounts",
          "24/7 dedicated support",
          "Custom development",
        ],
        maxProducts: "unlimited",
        maxMonthlyOrders: "unlimited",
        maxStaff: 999,
        commissionRate: 6,
        transactionFee: 1.0,
        piTransactionBonus: 6,
        storefront: true,
        customDomain: true,
        apiAccess: true,
        bulkUploads: true,
        inventoryManagement: true,
        analytics: "enterprise",
        support: "dedicated",
        featuredListings: 200,
        adsCredits: 2000,
      },
    ];
  }

  // ==========================================================================
  // VENDOR MANAGEMENT
  // ==========================================================================

  async registerVendor(data: {
    userId: string;
    businessName: string;
    legalName: string;
    vendorType: VendorType;
    categories: VendorCategory[];
    description: string;
    email: string;
    phone: string;
    country: string;
    region: string;
    city: string;
    address: string;
    postalCode: string;
    subscriptionTier: VendorSubscriptionTier;
    acceptsPi?: boolean;
    payWithPi?: boolean;
  }): Promise<Vendor> {
    const id = `vendor-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const plans = this.getVendorSubscriptionPlans();
    const plan = plans.find((p) => p.tier === data.subscriptionTier)!;

    const vendor: Vendor = {
      id,
      userId: data.userId,
      businessName: data.businessName,
      legalName: data.legalName,
      vendorType: data.vendorType,
      categories: data.categories,
      description: data.description,
      logo: "",
      banner: "",
      email: data.email,
      phone: data.phone,
      website: null,
      country: data.country,
      region: data.region,
      city: data.city,
      address: data.address,
      postalCode: data.postalCode,
      subscriptionTier: data.subscriptionTier,
      subscriptionStatus: "trial",
      subscriptionStartDate: new Date(),
      subscriptionEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      monthlyFee: plan.monthlyPrice,
      monthlyFeeInPi: plan.monthlyPriceInPi,
      commissionRate: plan.commissionRate,
      piCommissionBonus: plan.piTransactionBonus,
      totalSales: 0,
      totalRevenue: 0,
      totalRevenueInPi: 0,
      averageRating: 0,
      totalReviews: 0,
      status: "pending",
      verificationStatus: "unverified",
      taxCompliant: false,
      piWalletLinked: data.payWithPi || false,
      acceptsPi: data.acceptsPi ?? true,
      piOnlyMode: false,
      totalProducts: 0,
      activeListings: 0,
      totalOrders: 0,
      pendingOrders: 0,
      featuredVendor: false,
      storefront: plan.storefront,
      apiAccess: plan.apiAccess,
      bulkUploads: plan.bulkUploads,
      analyticsAccess: plan.analytics,
      createdAt: new Date(),
      lastActiveAt: new Date(),
    };

    this.vendors.set(id, vendor);
    return vendor;
  }

  async getVendor(vendorId: string): Promise<Vendor | null> {
    return this.vendors.get(vendorId) || null;
  }

  async upgradeVendorSubscription(
    vendorId: string,
    newTier: VendorSubscriptionTier
  ): Promise<Vendor> {
    const vendor = this.vendors.get(vendorId);
    if (!vendor) {
      throw new Error("Vendor not found");
    }

    const plans = this.getVendorSubscriptionPlans();
    const newPlan = plans.find((p) => p.tier === newTier)!;

    vendor.subscriptionTier = newTier;
    vendor.monthlyFee = newPlan.monthlyPrice;
    vendor.monthlyFeeInPi = newPlan.monthlyPriceInPi;
    vendor.commissionRate = newPlan.commissionRate;
    vendor.piCommissionBonus = newPlan.piTransactionBonus;
    vendor.storefront = newPlan.storefront;
    vendor.apiAccess = newPlan.apiAccess;
    vendor.bulkUploads = newPlan.bulkUploads;
    vendor.analyticsAccess = newPlan.analytics;

    return vendor;
  }

  // ==========================================================================
  // PRODUCT MANAGEMENT
  // ==========================================================================

  async createProduct(
    vendorId: string,
    data: {
      name: string;
      description: string;
      shortDescription: string;
      brand?: string;
      category: VendorCategory;
      subcategory: string;
      tags?: string[];
      price: number;
      compareAtPrice?: number;
      costPerItem?: number;
      sku: string;
      quantity: number;
      images?: string[];
      weight?: number;
      shippingRequired?: boolean;
      isDigital?: boolean;
    }
  ): Promise<Product> {
    const vendor = this.vendors.get(vendorId);
    if (!vendor) {
      throw new Error("Vendor not found");
    }

    const id = `product-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const slug = data.name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    const product: Product = {
      id,
      vendorId,
      name: data.name,
      description: data.description,
      shortDescription: data.shortDescription,
      brand: data.brand || null,
      category: data.category,
      subcategory: data.subcategory,
      tags: data.tags || [],
      price: data.price,
      priceInPi: data.price / PI_EXTERNAL_RATE,
      compareAtPrice: data.compareAtPrice || null,
      costPerItem: data.costPerItem || null,
      sku: data.sku,
      barcode: null,
      trackInventory: true,
      quantity: data.quantity,
      lowStockThreshold: 10,
      hasVariants: false,
      variants: [],
      images: data.images || [],
      videos: [],
      weight: data.weight || 0,
      weightUnit: "kg",
      dimensions: { length: 0, width: 0, height: 0, unit: "cm" },
      shippingRequired: data.shippingRequired ?? true,
      shippingClass: "standard",
      isDigital: data.isDigital || false,
      digitalUrl: null,
      status: "pending-review",
      publishedAt: null,
      seoTitle: null,
      seoDescription: null,
      slug,
      views: 0,
      sales: 0,
      revenue: 0,
      rating: 0,
      reviewCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.products.set(id, product);
    vendor.totalProducts += 1;

    return product;
  }

  async getProduct(productId: string): Promise<Product | null> {
    return this.products.get(productId) || null;
  }

  async publishProduct(productId: string): Promise<Product> {
    const product = this.products.get(productId);
    if (!product) {
      throw new Error("Product not found");
    }

    const vendor = this.vendors.get(product.vendorId);
    if (!vendor) {
      throw new Error("Vendor not found");
    }

    product.status = "active";
    product.publishedAt = new Date();
    vendor.activeListings += 1;

    return product;
  }

  async searchProducts(filters: {
    category?: VendorCategory;
    subcategory?: string;
    minPrice?: number;
    maxPrice?: number;
    vendorId?: string;
    searchTerm?: string;
    acceptsPi?: boolean;
  }): Promise<Product[]> {
    let products = Array.from(this.products.values()).filter(
      (p) => p.status === "active"
    );

    if (filters.category) {
      products = products.filter((p) => p.category === filters.category);
    }
    if (filters.subcategory) {
      products = products.filter((p) => p.subcategory === filters.subcategory);
    }
    if (filters.minPrice !== undefined) {
      products = products.filter((p) => p.price >= filters.minPrice!);
    }
    if (filters.maxPrice !== undefined) {
      products = products.filter((p) => p.price <= filters.maxPrice!);
    }
    if (filters.vendorId) {
      products = products.filter((p) => p.vendorId === filters.vendorId);
    }
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.description.toLowerCase().includes(term) ||
          p.tags.some((t) => t.toLowerCase().includes(term))
      );
    }

    return products;
  }

  // ==========================================================================
  // ORDER MANAGEMENT
  // ==========================================================================

  async createOrder(data: {
    vendorId: string;
    customerId: string;
    items: { productId: string; variantId?: string; quantity: number }[];
    shippingAddress: ShippingAddress;
    shippingMethod: string;
    paymentMethod: "pi" | "card" | "crypto" | "hybrid";
    customerNotes?: string;
  }): Promise<Order> {
    const vendor = this.vendors.get(data.vendorId);
    if (!vendor) {
      throw new Error("Vendor not found");
    }

    const id = `order-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;

    // Calculate order items
    const orderItems: OrderItem[] = [];
    let subtotal = 0;

    for (const item of data.items) {
      const product = this.products.get(item.productId);
      if (!product) {
        continue;
      }

      const orderItem: OrderItem = {
        id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 4)}`,
        productId: item.productId,
        variantId: item.variantId || null,
        name: product.name,
        sku: product.sku,
        quantity: item.quantity,
        price: product.price,
        priceInPi: product.priceInPi,
        total: product.price * item.quantity,
      };

      orderItems.push(orderItem);
      subtotal += orderItem.total;
    }

    const tax = subtotal * 0.08; // 8% tax
    const shipping = 9.99; // Standard shipping
    const discount = 0;
    const total = subtotal + tax + shipping - discount;

    // Calculate fees
    const commissionRate =
      data.paymentMethod === "pi"
        ? vendor.commissionRate - vendor.piCommissionBonus
        : vendor.commissionRate;
    const platformFee = total * (commissionRate / 100);
    const vendorEarnings = total - platformFee;

    const order: Order = {
      id,
      orderNumber,
      vendorId: data.vendorId,
      customerId: data.customerId,
      items: orderItems,
      subtotal,
      tax,
      shipping,
      discount,
      total,
      totalInPi: total / PI_EXTERNAL_RATE,
      paymentMethod: data.paymentMethod,
      paidInPi: data.paymentMethod === "pi" ? total / PI_EXTERNAL_RATE : 0,
      paidInFiat: data.paymentMethod === "pi" ? 0 : total,
      paymentStatus: "pending",
      status: "pending",
      shippingAddress: data.shippingAddress,
      shippingMethod: data.shippingMethod,
      trackingNumber: null,
      estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      actualDelivery: null,
      platformFee,
      vendorEarnings,
      vendorEarningsInPi: vendorEarnings / PI_EXTERNAL_RATE,
      customerNotes: data.customerNotes || null,
      vendorNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.orders.set(id, order);
    vendor.totalOrders += 1;
    vendor.pendingOrders += 1;

    return order;
  }

  async getOrder(orderId: string): Promise<Order | null> {
    return this.orders.get(orderId) || null;
  }

  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    trackingNumber?: string
  ): Promise<Order> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    const vendor = this.vendors.get(order.vendorId);

    order.status = status;
    order.updatedAt = new Date();

    if (trackingNumber) {
      order.trackingNumber = trackingNumber;
    }

    if (status === "delivered") {
      order.actualDelivery = new Date();
      if (vendor) {
        vendor.pendingOrders -= 1;
        vendor.totalSales += 1;
        vendor.totalRevenue += order.vendorEarnings;
        if (order.paymentMethod === "pi") {
          vendor.totalRevenueInPi += order.vendorEarningsInPi;
        }
      }
    }

    return order;
  }

  // ==========================================================================
  // VENDOR DASHBOARD
  // ==========================================================================

  async getVendorDashboard(vendorId: string): Promise<{
    vendor: Vendor;
    recentOrders: Order[];
    topProducts: Product[];
    analytics: VendorAnalytics;
    subscriptionInfo: VendorSubscriptionPlan | null;
  }> {
    const vendor = this.vendors.get(vendorId);
    if (!vendor) {
      throw new Error("Vendor not found");
    }

    const vendorProducts = Array.from(this.products.values()).filter(
      (p) => p.vendorId === vendorId
    );
    const vendorOrders = Array.from(this.orders.values()).filter(
      (o) => o.vendorId === vendorId
    );

    const plans = this.getVendorSubscriptionPlans();

    return {
      vendor,
      recentOrders: vendorOrders.slice(-10),
      topProducts: vendorProducts.sort((a, b) => b.sales - a.sales).slice(0, 5),
      analytics: {
        vendorId,
        period: "month",
        totalSales: vendor.totalSales,
        totalRevenue: vendor.totalRevenue,
        totalRevenueInPi: vendor.totalRevenueInPi,
        averageOrderValue:
          vendor.totalSales > 0 ? vendor.totalRevenue / vendor.totalSales : 0,
        storeViews: 0,
        productViews: vendorProducts.reduce((sum, p) => sum + p.views, 0),
        conversionRate: 0,
        topProducts: vendorProducts.slice(0, 5).map((p) => ({
          productId: p.id,
          name: p.name,
          sales: p.sales,
          revenue: p.revenue,
        })),
        lowStockProducts: vendorProducts
          .filter((p) => p.quantity <= p.lowStockThreshold)
          .map((p) => ({
            productId: p.id,
            name: p.name,
            quantity: p.quantity,
          })),
        newCustomers: 0,
        returningCustomers: 0,
        averageRating: vendor.averageRating,
        newReviews: 0,
      },
      subscriptionInfo:
        plans.find((p) => p.tier === vendor.subscriptionTier) || null,
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

export const ecommerceMarketplaceHub = new EcommerceMarketplaceHub();

// Export helper functions
export async function registerCompany(
  data: Parameters<typeof ecommerceMarketplaceHub.registerVendor>[0]
): Promise<Vendor> {
  return ecommerceMarketplaceHub.registerVendor(data);
}

export function getVendorPlans(): VendorSubscriptionPlan[] {
  return ecommerceMarketplaceHub.getVendorSubscriptionPlans();
}
