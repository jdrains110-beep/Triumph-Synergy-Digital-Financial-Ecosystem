/**
 * Triumph Synergy - Enterprise E-commerce & Commerce Hub
 *
 * Complete e-commerce platform with:
 * - Product catalog management
 * - Order processing & fulfillment
 * - Inventory management
 * - Multi-vendor marketplace
 * - Pi Network payment integration
 * - B2B & B2C capabilities
 *
 * @module lib/commerce/ecommerce-platform
 * @version 1.0.0
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type Product = {
  id: string;
  sku: string;
  name: string;
  description: string;
  shortDescription: string;
  category: ProductCategory;
  subcategory: string;
  brand: string;
  vendorId: string;

  // Pricing
  basePrice: number;
  salePrice: number | null;
  currency: "PI" | "USD" | "EUR" | "GBP";
  piEquivalent: number;
  taxCategory: TaxCategory;

  // Inventory
  stockQuantity: number;
  stockStatus:
    | "in-stock"
    | "low-stock"
    | "out-of-stock"
    | "backorder"
    | "preorder";
  trackInventory: boolean;
  lowStockThreshold: number;

  // Attributes
  attributes: ProductAttribute[];
  variants: ProductVariant[];
  images: ProductImage[];

  // Shipping
  weight: number;
  dimensions: { length: number; width: number; height: number };
  shippingClass: string;
  freeShipping: boolean;

  // Status
  status: "draft" | "pending" | "published" | "archived";
  visibility: "public" | "private" | "hidden";
  featured: boolean;

  // Metadata
  tags: string[];
  seoTitle: string;
  seoDescription: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ProductCategory =
  | "electronics"
  | "clothing"
  | "home-garden"
  | "automotive"
  | "health-beauty"
  | "sports"
  | "toys"
  | "books"
  | "food-beverage"
  | "real-estate"
  | "services"
  | "digital"
  | "other";

export type TaxCategory = "standard" | "reduced" | "zero" | "exempt";

export type ProductAttribute = {
  name: string;
  value: string;
  visible: boolean;
  variation: boolean;
};

export type ProductVariant = {
  id: string;
  sku: string;
  attributes: Record<string, string>;
  price: number;
  stockQuantity: number;
  image: string | null;
};

export type ProductImage = {
  id: string;
  url: string;
  alt: string;
  position: number;
  isMain: boolean;
};

export type Vendor = {
  id: string;
  name: string;
  slug: string;
  description: string;
  logo: string;
  banner: string;
  contactEmail: string;
  contactPhone: string;
  address: VendorAddress;
  rating: number;
  totalSales: number;
  totalProducts: number;
  commissionRate: number;
  status: "pending" | "active" | "suspended" | "closed";
  verificationStatus: "unverified" | "pending" | "verified";
  piWalletAddress: string;
  createdAt: Date;
};

export type VendorAddress = {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
};

export type Order = {
  id: string;
  orderNumber: string;
  customerId: string;
  vendorId: string;

  // Items
  items: OrderItem[];

  // Pricing
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  discountAmount: number;
  total: number;
  currency: "PI" | "USD";
  piPaymentAmount: number | null;

  // Payment
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  paymentTransactionId: string | null;
  piTransactionHash: string | null;

  // Shipping
  shippingAddress: ShippingAddress;
  billingAddress: ShippingAddress;
  shippingMethod: string;
  trackingNumber: string | null;

  // Status
  status: OrderStatus;
  fulfillmentStatus: FulfillmentStatus;

  // Notes
  customerNote: string | null;
  internalNote: string | null;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  paidAt: Date | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
};

export type OrderItem = {
  id: string;
  productId: string;
  variantId: string | null;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxAmount: number;
};

export type PaymentStatus =
  | "pending"
  | "authorized"
  | "paid"
  | "partially-refunded"
  | "refunded"
  | "failed";
export type PaymentMethod =
  | "pi-network"
  | "credit-card"
  | "bank-transfer"
  | "crypto"
  | "cash-on-delivery";
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";
export type FulfillmentStatus =
  | "unfulfilled"
  | "partially-fulfilled"
  | "fulfilled"
  | "returned";

export type ShippingAddress = {
  firstName: string;
  lastName: string;
  company: string | null;
  street1: string;
  street2: string | null;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone: string;
  email: string;
};

export type Cart = {
  id: string;
  customerId: string | null;
  sessionId: string;
  items: CartItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  currency: "PI" | "USD";
  couponCode: string | null;
  discountAmount: number;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
};

export type CartItem = {
  productId: string;
  variantId: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

export type Coupon = {
  id: string;
  code: string;
  type: "percentage" | "fixed" | "free-shipping";
  value: number;
  minOrderAmount: number | null;
  maxDiscount: number | null;
  usageLimit: number | null;
  usageCount: number;
  validFrom: Date;
  validTo: Date;
  isActive: boolean;
};

export type Review = {
  id: string;
  productId: string;
  customerId: string;
  rating: number;
  title: string;
  content: string;
  verified: boolean;
  helpful: number;
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
};

// ============================================================================
// E-COMMERCE ENGINE
// ============================================================================

export class EcommercePlatform {
  private static instance: EcommercePlatform;

  private readonly products: Map<string, Product> = new Map();
  private readonly vendors: Map<string, Vendor> = new Map();
  private readonly orders: Map<string, Order> = new Map();
  private readonly carts: Map<string, Cart> = new Map();
  private readonly coupons: Map<string, Coupon> = new Map();

  private constructor() {
    this.initializeSampleData();
  }

  static getInstance(): EcommercePlatform {
    if (!EcommercePlatform.instance) {
      EcommercePlatform.instance = new EcommercePlatform();
    }
    return EcommercePlatform.instance;
  }

  private initializeSampleData(): void {
    // Initialize default vendor (Triumph Synergy)
    const triumphVendor: Vendor = {
      id: "vendor-triumph-001",
      name: "Triumph Synergy Official",
      slug: "triumph-synergy",
      description: "Official Triumph Synergy marketplace",
      logo: "/logos/triumph-synergy.png",
      banner: "/banners/triumph-synergy.jpg",
      contactEmail: "marketplace@triumphsynergy.com",
      contactPhone: "+1-800-TRIUMPH",
      address: {
        street: "100 Innovation Drive",
        city: "Tech City",
        state: "CA",
        zip: "90210",
        country: "USA",
      },
      rating: 5.0,
      totalSales: 0,
      totalProducts: 0,
      commissionRate: 0,
      status: "active",
      verificationStatus: "verified",
      piWalletAddress: "GTRIUMPHSYNERGYWALLETADDRESS",
      createdAt: new Date(),
    };
    this.vendors.set(triumphVendor.id, triumphVendor);
  }

  // ==========================================================================
  // PRODUCT MANAGEMENT
  // ==========================================================================

  async createProduct(
    productData: Omit<Product, "id" | "createdAt" | "updatedAt">
  ): Promise<Product> {
    const id = `prod-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const product: Product = {
      ...productData,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.products.set(id, product);

    // Update vendor product count
    const vendor = this.vendors.get(product.vendorId);
    if (vendor) {
      vendor.totalProducts++;
    }

    return product;
  }

  async getProduct(productId: string): Promise<Product | null> {
    return this.products.get(productId) || null;
  }

  async searchProducts(query: {
    search?: string;
    category?: ProductCategory;
    vendorId?: string;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
    featured?: boolean;
    sortBy?: "price-asc" | "price-desc" | "newest" | "popular";
    page?: number;
    limit?: number;
  }): Promise<{
    products: Product[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    let results = Array.from(this.products.values()).filter(
      (p) => p.status === "published"
    );

    if (query.search) {
      const searchLower = query.search.toLowerCase();
      results = results.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.description.toLowerCase().includes(searchLower) ||
          p.tags.some((t) => t.toLowerCase().includes(searchLower))
      );
    }

    if (query.category) {
      results = results.filter((p) => p.category === query.category);
    }

    if (query.vendorId) {
      results = results.filter((p) => p.vendorId === query.vendorId);
    }

    if (query.minPrice !== undefined) {
      results = results.filter(
        (p) => (p.salePrice || p.basePrice) >= query.minPrice!
      );
    }

    if (query.maxPrice !== undefined) {
      results = results.filter(
        (p) => (p.salePrice || p.basePrice) <= query.maxPrice!
      );
    }

    if (query.inStock) {
      results = results.filter(
        (p) => p.stockStatus === "in-stock" || p.stockStatus === "low-stock"
      );
    }

    if (query.featured) {
      results = results.filter((p) => p.featured);
    }

    // Sort
    switch (query.sortBy) {
      case "price-asc":
        results.sort(
          (a, b) => (a.salePrice || a.basePrice) - (b.salePrice || b.basePrice)
        );
        break;
      case "price-desc":
        results.sort(
          (a, b) => (b.salePrice || b.basePrice) - (a.salePrice || a.basePrice)
        );
        break;
      case "newest":
        results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        break;
      default:
        break;
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const total = results.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;

    return {
      products: results.slice(offset, offset + limit),
      total,
      page,
      totalPages,
    };
  }

  async updateInventory(
    productId: string,
    quantityChange: number
  ): Promise<Product | null> {
    const product = this.products.get(productId);
    if (!product) {
      return null;
    }

    product.stockQuantity += quantityChange;

    if (product.stockQuantity <= 0) {
      product.stockStatus = "out-of-stock";
    } else if (product.stockQuantity <= product.lowStockThreshold) {
      product.stockStatus = "low-stock";
    } else {
      product.stockStatus = "in-stock";
    }

    product.updatedAt = new Date();
    return product;
  }

  // ==========================================================================
  // CART MANAGEMENT
  // ==========================================================================

  async createCart(
    customerId: string | null,
    sessionId: string
  ): Promise<Cart> {
    const id = `cart-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const cart: Cart = {
      id,
      customerId,
      sessionId,
      items: [],
      subtotal: 0,
      taxAmount: 0,
      total: 0,
      currency: "USD",
      couponCode: null,
      discountAmount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    };
    this.carts.set(id, cart);
    return cart;
  }

  async addToCart(
    cartId: string,
    productId: string,
    quantity: number,
    variantId?: string
  ): Promise<Cart | null> {
    const cart = this.carts.get(cartId);
    const product = this.products.get(productId);

    if (!cart || !product) {
      return null;
    }

    const price = product.salePrice || product.basePrice;
    const existingItem = cart.items.find(
      (i) => i.productId === productId && i.variantId === (variantId || null)
    );

    if (existingItem) {
      existingItem.quantity += quantity;
      existingItem.totalPrice = existingItem.quantity * existingItem.unitPrice;
    } else {
      cart.items.push({
        productId,
        variantId: variantId || null,
        quantity,
        unitPrice: price,
        totalPrice: price * quantity,
      });
    }

    this.recalculateCart(cart);
    return cart;
  }

  async removeFromCart(
    cartId: string,
    productId: string,
    variantId?: string
  ): Promise<Cart | null> {
    const cart = this.carts.get(cartId);
    if (!cart) {
      return null;
    }

    cart.items = cart.items.filter(
      (i) => !(i.productId === productId && i.variantId === (variantId || null))
    );

    this.recalculateCart(cart);
    return cart;
  }

  private recalculateCart(cart: Cart): void {
    cart.subtotal = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
    cart.taxAmount = cart.subtotal * 0.08; // 8% tax rate
    cart.total = cart.subtotal + cart.taxAmount - cart.discountAmount;
    cart.updatedAt = new Date();
  }

  // ==========================================================================
  // ORDER MANAGEMENT
  // ==========================================================================

  async createOrder(
    cartId: string,
    shippingAddress: ShippingAddress,
    paymentMethod: PaymentMethod
  ): Promise<Order | null> {
    const cart = this.carts.get(cartId);
    if (!cart || cart.items.length === 0) {
      return null;
    }

    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;
    const id = `order-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const orderItems: OrderItem[] = cart.items.map((item, index) => {
      const product = this.products.get(item.productId);
      return {
        id: `item-${id}-${index}`,
        productId: item.productId,
        variantId: item.variantId,
        name: product?.name || "Unknown Product",
        sku: product?.sku || "",
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        taxAmount: item.totalPrice * 0.08,
      };
    });

    const order: Order = {
      id,
      orderNumber,
      customerId: cart.customerId || "guest",
      vendorId: "vendor-triumph-001",
      items: orderItems,
      subtotal: cart.subtotal,
      taxAmount: cart.taxAmount,
      shippingAmount: 0,
      discountAmount: cart.discountAmount,
      total: cart.total,
      currency: cart.currency,
      piPaymentAmount: paymentMethod === "pi-network" ? cart.total : null,
      paymentStatus: "pending",
      paymentMethod,
      paymentTransactionId: null,
      piTransactionHash: null,
      shippingAddress,
      billingAddress: shippingAddress,
      shippingMethod: "standard",
      trackingNumber: null,
      status: "pending",
      fulfillmentStatus: "unfulfilled",
      customerNote: null,
      internalNote: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      paidAt: null,
      shippedAt: null,
      deliveredAt: null,
    };

    this.orders.set(id, order);

    // Clear cart
    this.carts.delete(cartId);

    // Update inventory
    for (const item of orderItems) {
      await this.updateInventory(item.productId, -item.quantity);
    }

    return order;
  }

  async getOrder(orderId: string): Promise<Order | null> {
    return this.orders.get(orderId) || null;
  }

  async updateOrderStatus(
    orderId: string,
    status: OrderStatus
  ): Promise<Order | null> {
    const order = this.orders.get(orderId);
    if (!order) {
      return null;
    }

    order.status = status;
    order.updatedAt = new Date();

    if (status === "shipped") {
      order.shippedAt = new Date();
      order.fulfillmentStatus = "fulfilled";
    } else if (status === "delivered") {
      order.deliveredAt = new Date();
    }

    return order;
  }

  async processPayment(
    orderId: string,
    transactionId: string,
    piHash?: string
  ): Promise<Order | null> {
    const order = this.orders.get(orderId);
    if (!order) {
      return null;
    }

    order.paymentStatus = "paid";
    order.paymentTransactionId = transactionId;
    order.piTransactionHash = piHash || null;
    order.paidAt = new Date();
    order.status = "confirmed";
    order.updatedAt = new Date();

    // Update vendor sales
    const vendor = this.vendors.get(order.vendorId);
    if (vendor) {
      vendor.totalSales += order.total;
    }

    return order;
  }

  // ==========================================================================
  // VENDOR MANAGEMENT
  // ==========================================================================

  async registerVendor(
    vendorData: Omit<
      Vendor,
      "id" | "rating" | "totalSales" | "totalProducts" | "createdAt"
    >
  ): Promise<Vendor> {
    const id = `vendor-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const vendor: Vendor = {
      ...vendorData,
      id,
      rating: 0,
      totalSales: 0,
      totalProducts: 0,
      createdAt: new Date(),
    };
    this.vendors.set(id, vendor);
    return vendor;
  }

  async getVendor(vendorId: string): Promise<Vendor | null> {
    return this.vendors.get(vendorId) || null;
  }

  async listVendors(status?: Vendor["status"]): Promise<Vendor[]> {
    const vendors = Array.from(this.vendors.values());
    if (status) {
      return vendors.filter((v) => v.status === status);
    }
    return vendors;
  }

  // ==========================================================================
  // COUPON MANAGEMENT
  // ==========================================================================

  async createCoupon(
    couponData: Omit<Coupon, "id" | "usageCount">
  ): Promise<Coupon> {
    const id = `coupon-${Date.now()}`;
    const coupon: Coupon = {
      ...couponData,
      id,
      usageCount: 0,
    };
    this.coupons.set(coupon.code.toUpperCase(), coupon);
    return coupon;
  }

  async applyCoupon(
    cartId: string,
    code: string
  ): Promise<{ success: boolean; message: string; discount?: number }> {
    const cart = this.carts.get(cartId);
    const coupon = this.coupons.get(code.toUpperCase());

    if (!cart) {
      return { success: false, message: "Cart not found" };
    }

    if (!coupon) {
      return { success: false, message: "Invalid coupon code" };
    }

    if (!coupon.isActive) {
      return { success: false, message: "Coupon is inactive" };
    }

    const now = new Date();
    if (now < coupon.validFrom || now > coupon.validTo) {
      return { success: false, message: "Coupon has expired" };
    }

    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return { success: false, message: "Coupon usage limit reached" };
    }

    if (coupon.minOrderAmount && cart.subtotal < coupon.minOrderAmount) {
      return {
        success: false,
        message: `Minimum order amount is $${coupon.minOrderAmount}`,
      };
    }

    let discount = 0;
    if (coupon.type === "percentage") {
      discount = cart.subtotal * (coupon.value / 100);
    } else if (coupon.type === "fixed") {
      discount = coupon.value;
    }

    if (coupon.maxDiscount && discount > coupon.maxDiscount) {
      discount = coupon.maxDiscount;
    }

    cart.couponCode = code.toUpperCase();
    cart.discountAmount = discount;
    this.recalculateCart(cart);
    coupon.usageCount++;

    return { success: true, message: "Coupon applied", discount };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const ecommercePlatform = EcommercePlatform.getInstance();

export async function createProduct(
  data: Omit<Product, "id" | "createdAt" | "updatedAt">
): Promise<Product> {
  return ecommercePlatform.createProduct(data);
}

export async function searchProducts(
  query: Parameters<EcommercePlatform["searchProducts"]>[0]
) {
  return ecommercePlatform.searchProducts(query);
}

export async function createOrder(
  cartId: string,
  address: ShippingAddress,
  payment: PaymentMethod
): Promise<Order | null> {
  return ecommercePlatform.createOrder(cartId, address, payment);
}
