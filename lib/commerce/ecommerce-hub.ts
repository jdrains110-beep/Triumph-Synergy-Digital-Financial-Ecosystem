/**
 * Triumph Synergy - Enterprise E-Commerce Hub
 * 
 * Multi-vendor marketplace with Pi Network payment integration
 * Supports physical goods, digital products, services, and subscriptions
 * 
 * @module lib/commerce/ecommerce-hub
 * @version 1.0.0
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface Vendor {
  id: string;
  name: string;
  slug: string;
  description: string;
  logo: string;
  coverImage: string;
  category: VendorCategory;
  rating: number;
  reviewCount: number;
  piWalletAddress: string;
  verified: boolean;
  featured: boolean;
  createdAt: Date;
  settings: VendorSettings;
  stats: VendorStats;
  contact: VendorContact;
}

export type VendorCategory = 
  | "retail"
  | "electronics"
  | "fashion"
  | "food-beverage"
  | "real-estate"
  | "services"
  | "digital"
  | "automotive"
  | "home-garden"
  | "health-beauty"
  | "enterprise";

export interface VendorSettings {
  commissionRate: number;
  shippingEnabled: boolean;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  internationalShipping: boolean;
  taxCollection: boolean;
  autoFulfillment: boolean;
}

export interface VendorStats {
  totalSales: number;
  totalOrders: number;
  totalProducts: number;
  avgOrderValue: number;
  conversionRate: number;
}

export interface VendorContact {
  email: string;
  phone: string;
  address: Address;
  supportHours: string;
}

export interface Address {
  street: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  coordinates?: { lat: number; lng: number };
}

export interface Product {
  id: string;
  vendorId: string;
  sku: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  category: ProductCategory;
  subcategory: string;
  images: ProductImage[];
  pricing: ProductPricing;
  inventory: ProductInventory;
  variants: ProductVariant[];
  attributes: Record<string, string>;
  tags: string[];
  status: "draft" | "active" | "inactive" | "out-of-stock";
  featured: boolean;
  createdAt: Date;
  updatedAt: Date;
  seo: ProductSEO;
  shipping: ProductShipping;
}

export type ProductCategory =
  | "physical"
  | "digital"
  | "service"
  | "subscription"
  | "real-estate"
  | "vehicle"
  | "event-ticket"
  | "gift-card";

export interface ProductImage {
  id: string;
  url: string;
  alt: string;
  isPrimary: boolean;
  order: number;
}

export interface ProductPricing {
  basePrice: number;
  salePrice: number | null;
  currency: "PI" | "USD" | "EUR" | "GBP";
  piEquivalent: number;
  costPrice: number;
  margin: number;
  taxable: boolean;
  taxRate: number;
}

export interface ProductInventory {
  tracked: boolean;
  quantity: number;
  lowStockThreshold: number;
  allowBackorder: boolean;
  maxPerOrder: number;
}

export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  price: number;
  inventory: number;
  attributes: Record<string, string>;
  image?: string;
}

export interface ProductSEO {
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  keywords: string[];
}

export interface ProductShipping {
  weight: number;
  dimensions: { length: number; width: number; height: number };
  shippingClass: string;
  freeShipping: boolean;
  handlingTime: number;
}

export interface CartItem {
  id: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  price: number;
  piPrice: number;
  name: string;
  image: string;
  vendorId: string;
}

export interface ShoppingCart {
  id: string;
  userId: string;
  items: CartItem[];
  subtotal: number;
  piSubtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  piTotal: number;
  couponCode: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  vendorId: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  piTotal: number;
  currency: "PI" | "USD";
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: "pi-network" | "credit-card" | "bank-transfer" | "crypto";
  piTransactionId: string | null;
  shippingAddress: Address;
  billingAddress: Address;
  fulfillment: OrderFulfillment;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "out-for-delivery"
  | "delivered"
  | "cancelled"
  | "refunded";

export type PaymentStatus =
  | "pending"
  | "authorized"
  | "captured"
  | "failed"
  | "refunded"
  | "partially-refunded";

export interface OrderItem {
  id: string;
  productId: string;
  variantId: string | null;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  total: number;
  image: string;
}

export interface OrderFulfillment {
  status: "unfulfilled" | "partial" | "fulfilled";
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  estimatedDelivery: Date | null;
}

export interface Coupon {
  id: string;
  code: string;
  type: "percentage" | "fixed" | "free-shipping";
  value: number;
  minOrderAmount: number;
  maxUses: number;
  usedCount: number;
  validFrom: Date;
  validTo: Date;
  applicableVendors: string[];
  applicableProducts: string[];
  isActive: boolean;
}

// ============================================================================
// E-COMMERCE ENGINE
// ============================================================================

export class ECommerceHub {
  private static instance: ECommerceHub;
  
  private vendors: Map<string, Vendor> = new Map();
  private products: Map<string, Product> = new Map();
  private carts: Map<string, ShoppingCart> = new Map();
  private orders: Map<string, Order> = new Map();
  private coupons: Map<string, Coupon> = new Map();

  private readonly PI_TO_USD_RATE = 314.159; // Pi value

  private constructor() {
    this.initializeDefaultVendors();
  }

  static getInstance(): ECommerceHub {
    if (!ECommerceHub.instance) {
      ECommerceHub.instance = new ECommerceHub();
    }
    return ECommerceHub.instance;
  }

  private initializeDefaultVendors(): void {
    const triumphStore: Vendor = {
      id: "triumph-official-001",
      name: "Triumph Synergy Official Store",
      slug: "triumph-official",
      description: "Official Triumph Synergy merchandise and digital products",
      logo: "/images/triumph-logo.png",
      coverImage: "/images/triumph-cover.jpg",
      category: "retail",
      rating: 5.0,
      reviewCount: 0,
      piWalletAddress: "GTRIUMPH...",
      verified: true,
      featured: true,
      createdAt: new Date(),
      settings: {
        commissionRate: 0,
        shippingEnabled: true,
        pickupEnabled: true,
        deliveryEnabled: true,
        internationalShipping: true,
        taxCollection: true,
        autoFulfillment: false,
      },
      stats: {
        totalSales: 0,
        totalOrders: 0,
        totalProducts: 0,
        avgOrderValue: 0,
        conversionRate: 0,
      },
      contact: {
        email: "store@triumphsynergy.com",
        phone: "+1-800-TRIUMPH",
        address: {
          street: "123 Pi Network Blvd",
          city: "San Francisco",
          state: "CA",
          zip: "94105",
          country: "USA",
        },
        supportHours: "24/7",
      },
    };

    this.vendors.set(triumphStore.id, triumphStore);
  }

  // ==========================================================================
  // VENDOR MANAGEMENT
  // ==========================================================================

  async registerVendor(vendorData: Omit<Vendor, "id" | "createdAt" | "stats" | "verified">): Promise<Vendor> {
    const id = `vendor-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    const vendor: Vendor = {
      ...vendorData,
      id,
      createdAt: new Date(),
      verified: false,
      stats: {
        totalSales: 0,
        totalOrders: 0,
        totalProducts: 0,
        avgOrderValue: 0,
        conversionRate: 0,
      },
    };

    this.vendors.set(id, vendor);
    return vendor;
  }

  async getVendor(vendorId: string): Promise<Vendor | null> {
    return this.vendors.get(vendorId) || null;
  }

  async listVendors(options: {
    category?: VendorCategory;
    verified?: boolean;
    featured?: boolean;
    limit?: number;
  } = {}): Promise<Vendor[]> {
    let vendors = Array.from(this.vendors.values());

    if (options.category) {
      vendors = vendors.filter(v => v.category === options.category);
    }
    if (options.verified !== undefined) {
      vendors = vendors.filter(v => v.verified === options.verified);
    }
    if (options.featured !== undefined) {
      vendors = vendors.filter(v => v.featured === options.featured);
    }
    if (options.limit) {
      vendors = vendors.slice(0, options.limit);
    }

    return vendors;
  }

  // ==========================================================================
  // PRODUCT MANAGEMENT
  // ==========================================================================

  async createProduct(productData: Omit<Product, "id" | "createdAt" | "updatedAt">): Promise<Product> {
    const id = `prod-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    const product: Product = {
      ...productData,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.products.set(id, product);

    // Update vendor stats
    const vendor = this.vendors.get(product.vendorId);
    if (vendor) {
      vendor.stats.totalProducts++;
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
    limit?: number;
    offset?: number;
  }): Promise<{ products: Product[]; total: number }> {
    let products = Array.from(this.products.values()).filter(p => p.status === "active");

    if (query.search) {
      const searchLower = query.search.toLowerCase();
      products = products.filter(p =>
        p.name.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower) ||
        p.tags.some(t => t.toLowerCase().includes(searchLower))
      );
    }
    if (query.category) {
      products = products.filter(p => p.category === query.category);
    }
    if (query.vendorId) {
      products = products.filter(p => p.vendorId === query.vendorId);
    }
    if (query.minPrice !== undefined) {
      products = products.filter(p => p.pricing.basePrice >= query.minPrice!);
    }
    if (query.maxPrice !== undefined) {
      products = products.filter(p => p.pricing.basePrice <= query.maxPrice!);
    }
    if (query.inStock) {
      products = products.filter(p => !p.inventory.tracked || p.inventory.quantity > 0);
    }
    if (query.featured) {
      products = products.filter(p => p.featured);
    }

    // Sort
    switch (query.sortBy) {
      case "price-asc":
        products.sort((a, b) => a.pricing.basePrice - b.pricing.basePrice);
        break;
      case "price-desc":
        products.sort((a, b) => b.pricing.basePrice - a.pricing.basePrice);
        break;
      case "newest":
        products.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        break;
      default:
        // Popular - by featured status
        products.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    }

    const total = products.length;
    const offset = query.offset || 0;
    const limit = query.limit || 20;
    products = products.slice(offset, offset + limit);

    return { products, total };
  }

  // ==========================================================================
  // SHOPPING CART
  // ==========================================================================

  async getOrCreateCart(userId: string): Promise<ShoppingCart> {
    let cart = this.carts.get(userId);
    
    if (!cart) {
      cart = {
        id: `cart-${Date.now()}`,
        userId,
        items: [],
        subtotal: 0,
        piSubtotal: 0,
        tax: 0,
        shipping: 0,
        discount: 0,
        total: 0,
        piTotal: 0,
        couponCode: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.carts.set(userId, cart);
    }

    return cart;
  }

  async addToCart(userId: string, productId: string, quantity: number, variantId?: string): Promise<ShoppingCart> {
    const cart = await this.getOrCreateCart(userId);
    const product = await this.getProduct(productId);

    if (!product) {
      throw new Error("Product not found");
    }

    const existingItem = cart.items.find(i => i.productId === productId && i.variantId === (variantId || null));

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      const variant = variantId ? product.variants.find(v => v.id === variantId) : null;
      const price = variant?.price || product.pricing.salePrice || product.pricing.basePrice;

      cart.items.push({
        id: `item-${Date.now()}`,
        productId,
        variantId: variantId || null,
        quantity,
        price,
        piPrice: price / this.PI_TO_USD_RATE,
        name: product.name + (variant ? ` - ${variant.name}` : ""),
        image: product.images[0]?.url || "",
        vendorId: product.vendorId,
      });
    }

    this.recalculateCart(cart);
    return cart;
  }

  async updateCartItem(userId: string, itemId: string, quantity: number): Promise<ShoppingCart> {
    const cart = await this.getOrCreateCart(userId);
    const item = cart.items.find(i => i.id === itemId);

    if (!item) {
      throw new Error("Cart item not found");
    }

    if (quantity <= 0) {
      cart.items = cart.items.filter(i => i.id !== itemId);
    } else {
      item.quantity = quantity;
    }

    this.recalculateCart(cart);
    return cart;
  }

  async removeFromCart(userId: string, itemId: string): Promise<ShoppingCart> {
    return this.updateCartItem(userId, itemId, 0);
  }

  async applyCoupon(userId: string, couponCode: string): Promise<ShoppingCart> {
    const cart = await this.getOrCreateCart(userId);
    const coupon = Array.from(this.coupons.values()).find(c => c.code === couponCode);

    if (!coupon || !coupon.isActive) {
      throw new Error("Invalid coupon code");
    }

    if (new Date() < coupon.validFrom || new Date() > coupon.validTo) {
      throw new Error("Coupon expired");
    }

    if (cart.subtotal < coupon.minOrderAmount) {
      throw new Error(`Minimum order amount: $${coupon.minOrderAmount}`);
    }

    cart.couponCode = couponCode;
    this.recalculateCart(cart);
    return cart;
  }

  private recalculateCart(cart: ShoppingCart): void {
    cart.subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    cart.piSubtotal = cart.subtotal / this.PI_TO_USD_RATE;

    // Calculate tax (average 8%)
    cart.tax = cart.subtotal * 0.08;

    // Calculate shipping
    cart.shipping = cart.subtotal >= 50 ? 0 : 9.99;

    // Apply coupon
    cart.discount = 0;
    if (cart.couponCode) {
      const coupon = Array.from(this.coupons.values()).find(c => c.code === cart.couponCode);
      if (coupon) {
        if (coupon.type === "percentage") {
          cart.discount = cart.subtotal * (coupon.value / 100);
        } else if (coupon.type === "fixed") {
          cart.discount = coupon.value;
        } else if (coupon.type === "free-shipping") {
          cart.shipping = 0;
        }
      }
    }

    cart.total = cart.subtotal + cart.tax + cart.shipping - cart.discount;
    cart.piTotal = cart.total / this.PI_TO_USD_RATE;
    cart.updatedAt = new Date();
  }

  // ==========================================================================
  // CHECKOUT & ORDERS
  // ==========================================================================

  async checkout(
    userId: string,
    paymentMethod: Order["paymentMethod"],
    shippingAddress: Address,
    billingAddress?: Address
  ): Promise<Order[]> {
    const cart = await this.getOrCreateCart(userId);

    if (cart.items.length === 0) {
      throw new Error("Cart is empty");
    }

    // Group items by vendor
    const itemsByVendor = new Map<string, CartItem[]>();
    for (const item of cart.items) {
      const vendorItems = itemsByVendor.get(item.vendorId) || [];
      vendorItems.push(item);
      itemsByVendor.set(item.vendorId, vendorItems);
    }

    const orders: Order[] = [];

    // Create order for each vendor
    for (const [vendorId, items] of itemsByVendor) {
      const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const tax = subtotal * 0.08;
      const shipping = subtotal >= 50 ? 0 : 9.99;
      const total = subtotal + tax + shipping;

      const order: Order = {
        id: `order-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        orderNumber: `TS-${Date.now().toString(36).toUpperCase()}`,
        userId,
        vendorId,
        items: items.map(item => ({
          id: item.id,
          productId: item.productId,
          variantId: item.variantId,
          name: item.name,
          sku: "",
          quantity: item.quantity,
          unitPrice: item.price,
          total: item.price * item.quantity,
          image: item.image,
        })),
        subtotal,
        tax,
        shipping,
        discount: 0,
        total,
        piTotal: total / this.PI_TO_USD_RATE,
        currency: paymentMethod === "pi-network" ? "PI" : "USD",
        status: "pending",
        paymentStatus: "pending",
        paymentMethod,
        piTransactionId: null,
        shippingAddress,
        billingAddress: billingAddress || shippingAddress,
        fulfillment: {
          status: "unfulfilled",
          carrier: null,
          trackingNumber: null,
          trackingUrl: null,
          shippedAt: null,
          deliveredAt: null,
          estimatedDelivery: null,
        },
        notes: "",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.orders.set(order.id, order);
      orders.push(order);

      // Update vendor stats
      const vendor = this.vendors.get(vendorId);
      if (vendor) {
        vendor.stats.totalOrders++;
        vendor.stats.totalSales += total;
        vendor.stats.avgOrderValue = vendor.stats.totalSales / vendor.stats.totalOrders;
      }
    }

    // Clear cart
    cart.items = [];
    this.recalculateCart(cart);

    return orders;
  }

  async getOrder(orderId: string): Promise<Order | null> {
    return this.orders.get(orderId) || null;
  }

  async getUserOrders(userId: string): Promise<Order[]> {
    return Array.from(this.orders.values())
      .filter(o => o.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    order.status = status;
    order.updatedAt = new Date();

    if (status === "shipped") {
      order.fulfillment.status = "fulfilled";
      order.fulfillment.shippedAt = new Date();
    }
    if (status === "delivered") {
      order.fulfillment.deliveredAt = new Date();
    }

    return order;
  }

  async processPayment(orderId: string, piTransactionId?: string): Promise<Order> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    order.paymentStatus = "captured";
    order.status = "confirmed";
    order.piTransactionId = piTransactionId || null;
    order.updatedAt = new Date();

    return order;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const ecommerceHub = ECommerceHub.getInstance();

export async function createVendor(vendorData: Omit<Vendor, "id" | "createdAt" | "stats" | "verified">): Promise<Vendor> {
  return ecommerceHub.registerVendor(vendorData);
}

export async function listProducts(query: Parameters<typeof ecommerceHub.searchProducts>[0]): Promise<{ products: Product[]; total: number }> {
  return ecommerceHub.searchProducts(query);
}

export async function addToCart(userId: string, productId: string, quantity: number): Promise<ShoppingCart> {
  return ecommerceHub.addToCart(userId, productId, quantity);
}

export async function checkout(userId: string, paymentMethod: Order["paymentMethod"], shippingAddress: Address): Promise<Order[]> {
  return ecommerceHub.checkout(userId, paymentMethod, shippingAddress);
}
