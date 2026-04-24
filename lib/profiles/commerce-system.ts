/**
 * Commerce Transaction System
 * 
 * Secure buying and selling infrastructure for all profile types.
 * Integrates with Pi Network payments, QFS, and NESARA/GESARA compliance.
 */

import { EventEmitter } from "events";
import type { 
  BaseProfile, 
  IndividualProfile, 
  BusinessProfile, 
  MerchantProfile,
  MerchantCategory 
} from "./profile-system";

// ============================================================================
// Types
// ============================================================================

export type TransactionType =
  | "purchase"
  | "sale"
  | "refund"
  | "subscription"
  | "service"
  | "transfer"
  | "escrow"
  | "invoice"
  | "payout";

export type TransactionStatus =
  | "pending"
  | "processing"
  | "awaiting-payment"
  | "paid"
  | "shipped"
  | "delivered"
  | "completed"
  | "disputed"
  | "refunded"
  | "cancelled"
  | "failed";

export type PaymentMethod =
  | "pi"
  | "pi-tip"
  | "qfs"
  | "card"
  | "bank-transfer"
  | "crypto"
  | "cash"
  | "invoice"
  | "credit"
  | "escrow";

export type DisputeReason =
  | "item-not-received"
  | "item-not-as-described"
  | "damaged"
  | "wrong-item"
  | "quality-issue"
  | "service-incomplete"
  | "unauthorized"
  | "duplicate-charge"
  | "other";

// ============================================================================
// Product/Service Types
// ============================================================================

export interface Product {
  id: string;
  merchantId: string;
  name: string;
  description: string;
  category: MerchantCategory;
  subcategory?: string;
  
  // Pricing
  price: number;
  currency: "PI" | "USD" | "EUR" | "GBP";
  salePrice?: number;
  wholesalePrice?: number;
  minQuantity: number;
  maxQuantity?: number;
  
  // Inventory
  sku: string;
  inventoryType: "physical" | "digital" | "service";
  stockQuantity: number;
  reservedQuantity: number;
  lowStockThreshold: number;
  trackInventory: boolean;
  
  // Attributes
  attributes: Record<string, string | number | boolean>;
  variants?: ProductVariant[];
  images: string[];
  
  // Shipping
  weight?: number;
  dimensions?: { length: number; width: number; height: number };
  shippingClass?: string;
  freeShipping: boolean;
  
  // Status
  status: "draft" | "active" | "paused" | "discontinued";
  publishedAt?: Date;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, unknown>;
}

export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  price: number;
  stockQuantity: number;
  attributes: Record<string, string>;
}

export interface Service {
  id: string;
  providerId: string;
  name: string;
  description: string;
  category: MerchantCategory;
  
  // Pricing
  priceType: "fixed" | "hourly" | "daily" | "project" | "quote";
  price: number;
  currency: "PI" | "USD" | "EUR" | "GBP";
  
  // Duration
  estimatedDuration?: number; // minutes
  minDuration?: number;
  maxDuration?: number;
  
  // Availability
  availability: {
    days: ("monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday")[];
    startTime: string;
    endTime: string;
    timezone: string;
  };
  
  // Requirements
  requirements?: string[];
  deliverables?: string[];
  
  // Status
  status: "active" | "paused" | "discontinued";
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Order Types
// ============================================================================

export interface OrderItem {
  id: string;
  productId?: string;
  serviceId?: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  discount?: number;
  tax?: number;
  variantId?: string;
  attributes?: Record<string, string>;
}

export interface Order {
  id: string;
  orderNumber: string;
  type: TransactionType;
  status: TransactionStatus;
  
  // Parties
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  sellerId: string;
  sellerName: string;
  
  // Items
  items: OrderItem[];
  
  // Pricing
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  total: number;
  currency: "PI" | "USD" | "EUR" | "GBP";
  
  // Payment
  paymentMethod: PaymentMethod;
  paymentStatus: "pending" | "partial" | "paid" | "refunded";
  paymentId?: string;
  piPaymentId?: string;
  qfsTransactionId?: string;
  
  // Shipping
  shippingAddress?: {
    name: string;
    street: string;
    unit?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
  };
  shippingMethod?: string;
  trackingNumber?: string;
  estimatedDelivery?: Date;
  
  // Billing
  billingAddress?: {
    name: string;
    street: string;
    unit?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  
  // Notes
  customerNotes?: string;
  sellerNotes?: string;
  internalNotes?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  paidAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  
  // Metadata
  metadata: Record<string, unknown>;
}

// ============================================================================
// Invoice Types
// ============================================================================

export interface Invoice {
  id: string;
  invoiceNumber: string;
  orderId?: string;
  
  // Parties
  issuerId: string;
  issuerName: string;
  recipientId: string;
  recipientName: string;
  
  // Items
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  
  // Totals
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  currency: "PI" | "USD" | "EUR" | "GBP";
  
  // Terms
  issueDate: Date;
  dueDate: Date;
  terms?: string;
  
  // Status
  status: "draft" | "sent" | "viewed" | "partial" | "paid" | "overdue" | "cancelled";
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Dispute Types
// ============================================================================

export interface Dispute {
  id: string;
  orderId: string;
  
  // Parties
  raisedBy: string;
  respondent: string;
  
  // Details
  reason: DisputeReason;
  description: string;
  evidence: string[];
  
  // Resolution
  status: "open" | "under-review" | "resolved" | "escalated" | "closed";
  resolution?: "buyer-wins" | "seller-wins" | "split" | "withdrawn";
  resolutionNotes?: string;
  refundAmount?: number;
  
  // Process
  messages: {
    senderId: string;
    message: string;
    attachments?: string[];
    timestamp: Date;
  }[];
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

// ============================================================================
// Escrow Types
// ============================================================================

export interface EscrowTransaction {
  id: string;
  orderId: string;
  
  // Parties
  buyerId: string;
  sellerId: string;
  
  // Funds
  amount: number;
  currency: "PI" | "USD" | "EUR" | "GBP";
  
  // Status
  status: "holding" | "released" | "refunded" | "disputed";
  
  // Conditions
  releaseConditions: string[];
  conditionsMet: boolean[];
  autoReleaseDate?: Date;
  
  // Timestamps
  fundedAt: Date;
  releasedAt?: Date;
  refundedAt?: Date;
}

// ============================================================================
// Review Types
// ============================================================================

export interface Review {
  id: string;
  orderId: string;
  reviewerId: string;
  reviewerName: string;
  targetId: string; // merchant, product, or service ID
  targetType: "merchant" | "product" | "service";
  
  // Ratings
  overallRating: number; // 1-5
  qualityRating?: number;
  serviceRating?: number;
  valueRating?: number;
  
  // Content
  title?: string;
  content: string;
  pros?: string[];
  cons?: string[];
  images?: string[];
  
  // Status
  status: "pending" | "published" | "flagged" | "removed";
  verified: boolean; // verified purchase
  
  // Responses
  sellerResponse?: {
    content: string;
    respondedAt: Date;
  };
  
  // Metadata
  helpful: number;
  notHelpful: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Commerce System Manager
// ============================================================================

class CommerceSystemManager extends EventEmitter {
  private static instance: CommerceSystemManager;
  
  private products: Map<string, Product> = new Map();
  private services: Map<string, Service> = new Map();
  private orders: Map<string, Order> = new Map();
  private invoices: Map<string, Invoice> = new Map();
  private disputes: Map<string, Dispute> = new Map();
  private escrows: Map<string, EscrowTransaction> = new Map();
  private reviews: Map<string, Review> = new Map();
  
  // Counters for order/invoice numbers
  private orderCounter = 1000000;
  private invoiceCounter = 100000;
  
  private constructor() {
    super();
    this.setMaxListeners(50);
  }
  
  static getInstance(): CommerceSystemManager {
    if (!CommerceSystemManager.instance) {
      CommerceSystemManager.instance = new CommerceSystemManager();
    }
    return CommerceSystemManager.instance;
  }
  
  // ==========================================================================
  // Product Management
  // ==========================================================================
  
  /**
   * Create a new product listing
   */
  createProduct(params: {
    merchantId: string;
    name: string;
    description: string;
    category: MerchantCategory;
    subcategory?: string;
    price: number;
    currency?: "PI" | "USD" | "EUR" | "GBP";
    inventoryType?: "physical" | "digital" | "service";
    stockQuantity?: number;
    sku?: string;
    images?: string[];
    attributes?: Record<string, string | number | boolean>;
    weight?: number;
    dimensions?: { length: number; width: number; height: number };
  }): Product {
    const id = `prd-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();
    
    const product: Product = {
      id,
      merchantId: params.merchantId,
      name: params.name,
      description: params.description,
      category: params.category,
      subcategory: params.subcategory,
      
      // Pricing
      price: params.price,
      currency: params.currency || "PI",
      minQuantity: 1,
      
      // Inventory
      sku: params.sku || `SKU-${id.slice(-8).toUpperCase()}`,
      inventoryType: params.inventoryType || "physical",
      stockQuantity: params.stockQuantity ?? 0,
      reservedQuantity: 0,
      lowStockThreshold: 5,
      trackInventory: true,
      
      // Attributes
      attributes: params.attributes || {},
      images: params.images || [],
      
      // Shipping
      weight: params.weight,
      dimensions: params.dimensions,
      freeShipping: false,
      
      // Status
      status: "draft",
      
      // Timestamps
      createdAt: now,
      updatedAt: now,
      metadata: {},
    };
    
    this.products.set(id, product);
    this.emit("product-created", { product });
    return product;
  }
  
  /**
   * Update product
   */
  updateProduct(productId: string, updates: Partial<Omit<Product, "id" | "merchantId" | "createdAt">>): Product {
    const product = this.products.get(productId);
    if (!product) throw new Error("Product not found");
    
    Object.assign(product, updates, { updatedAt: new Date() });
    this.emit("product-updated", { product });
    return product;
  }
  
  /**
   * Publish product
   */
  publishProduct(productId: string): Product {
    const product = this.products.get(productId);
    if (!product) throw new Error("Product not found");
    
    product.status = "active";
    product.publishedAt = new Date();
    product.updatedAt = new Date();
    
    this.emit("product-published", { product });
    return product;
  }
  
  /**
   * Search products
   */
  searchProducts(params: {
    merchantId?: string;
    category?: MerchantCategory;
    query?: string;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
    status?: Product["status"];
    limit?: number;
  }): Product[] {
    let results = Array.from(this.products.values());
    
    if (params.merchantId) {
      results = results.filter(p => p.merchantId === params.merchantId);
    }
    
    if (params.category) {
      results = results.filter(p => p.category === params.category);
    }
    
    if (params.query) {
      const query = params.query.toLowerCase();
      results = results.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query)
      );
    }
    
    if (params.minPrice !== undefined) {
      results = results.filter(p => p.price >= params.minPrice!);
    }
    
    if (params.maxPrice !== undefined) {
      results = results.filter(p => p.price <= params.maxPrice!);
    }
    
    if (params.inStock !== undefined) {
      results = results.filter(p => params.inStock ? p.stockQuantity > 0 : p.stockQuantity === 0);
    }
    
    if (params.status) {
      results = results.filter(p => p.status === params.status);
    }
    
    return results.slice(0, params.limit || 50);
  }
  
  // ==========================================================================
  // Service Management
  // ==========================================================================
  
  /**
   * Create a service listing
   */
  createService(params: {
    providerId: string;
    name: string;
    description: string;
    category: MerchantCategory;
    priceType: Service["priceType"];
    price: number;
    currency?: "PI" | "USD" | "EUR" | "GBP";
    estimatedDuration?: number;
    availability?: Service["availability"];
    requirements?: string[];
    deliverables?: string[];
  }): Service {
    const id = `svc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();
    
    const service: Service = {
      id,
      providerId: params.providerId,
      name: params.name,
      description: params.description,
      category: params.category,
      
      priceType: params.priceType,
      price: params.price,
      currency: params.currency || "PI",
      
      estimatedDuration: params.estimatedDuration,
      
      availability: params.availability || {
        days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
        startTime: "09:00",
        endTime: "17:00",
        timezone: "UTC",
      },
      
      requirements: params.requirements,
      deliverables: params.deliverables,
      
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    
    this.services.set(id, service);
    this.emit("service-created", { service });
    return service;
  }
  
  // ==========================================================================
  // Order Management
  // ==========================================================================
  
  /**
   * Create a new order
   */
  createOrder(params: {
    buyerId: string;
    buyerName: string;
    buyerEmail: string;
    sellerId: string;
    sellerName: string;
    items: Omit<OrderItem, "id">[];
    paymentMethod: PaymentMethod;
    shippingAddress?: Order["shippingAddress"];
    billingAddress?: Order["billingAddress"];
    customerNotes?: string;
    currency?: "PI" | "USD" | "EUR" | "GBP";
  }): Order {
    const id = `ord-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const orderNumber = `TS-${++this.orderCounter}`;
    const now = new Date();
    
    // Process items
    const items: OrderItem[] = params.items.map((item, index) => ({
      ...item,
      id: `item-${index + 1}`,
    }));
    
    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const tax = subtotal * 0.0314; // Pi-inspired tax rate
    const shipping = params.shippingAddress ? 5 : 0; // Base shipping
    const discount = items.reduce((sum, item) => sum + (item.discount || 0), 0);
    const total = subtotal + tax + shipping - discount;
    
    const order: Order = {
      id,
      orderNumber,
      type: "purchase",
      status: "pending",
      
      buyerId: params.buyerId,
      buyerName: params.buyerName,
      buyerEmail: params.buyerEmail,
      sellerId: params.sellerId,
      sellerName: params.sellerName,
      
      items,
      
      subtotal,
      discount,
      tax,
      shipping,
      total,
      currency: params.currency || "PI",
      
      paymentMethod: params.paymentMethod,
      paymentStatus: "pending",
      
      shippingAddress: params.shippingAddress,
      billingAddress: params.billingAddress,
      customerNotes: params.customerNotes,
      
      createdAt: now,
      updatedAt: now,
      metadata: {},
    };
    
    this.orders.set(id, order);
    
    // Reserve inventory
    for (const item of items) {
      if (item.productId) {
        const product = this.products.get(item.productId);
        if (product && product.trackInventory) {
          product.reservedQuantity += item.quantity;
          product.updatedAt = now;
        }
      }
    }
    
    this.emit("order-created", { order });
    return order;
  }
  
  /**
   * Process payment for order
   */
  processPayment(orderId: string, paymentDetails: {
    paymentId?: string;
    piPaymentId?: string;
    qfsTransactionId?: string;
    amount: number;
  }): Order {
    const order = this.orders.get(orderId);
    if (!order) throw new Error("Order not found");
    
    const now = new Date();
    
    if (paymentDetails.amount >= order.total) {
      order.paymentStatus = "paid";
      order.status = "paid";
    } else if (paymentDetails.amount > 0) {
      order.paymentStatus = "partial";
    }
    
    order.paymentId = paymentDetails.paymentId;
    order.piPaymentId = paymentDetails.piPaymentId;
    order.qfsTransactionId = paymentDetails.qfsTransactionId;
    order.paidAt = now;
    order.updatedAt = now;
    
    // Update inventory - convert reserved to sold
    for (const item of order.items) {
      if (item.productId) {
        const product = this.products.get(item.productId);
        if (product && product.trackInventory) {
          product.reservedQuantity -= item.quantity;
          product.stockQuantity -= item.quantity;
          product.updatedAt = now;
        }
      }
    }
    
    this.emit("payment-processed", { order, paymentDetails });
    return order;
  }
  
  /**
   * Ship order
   */
  shipOrder(orderId: string, shipmentDetails: {
    trackingNumber: string;
    shippingMethod: string;
    estimatedDelivery?: Date;
  }): Order {
    const order = this.orders.get(orderId);
    if (!order) throw new Error("Order not found");
    
    const now = new Date();
    
    order.status = "shipped";
    order.trackingNumber = shipmentDetails.trackingNumber;
    order.shippingMethod = shipmentDetails.shippingMethod;
    order.estimatedDelivery = shipmentDetails.estimatedDelivery;
    order.shippedAt = now;
    order.updatedAt = now;
    
    this.emit("order-shipped", { order, shipmentDetails });
    return order;
  }
  
  /**
   * Mark order as delivered
   */
  markDelivered(orderId: string): Order {
    const order = this.orders.get(orderId);
    if (!order) throw new Error("Order not found");
    
    const now = new Date();
    
    order.status = "delivered";
    order.deliveredAt = now;
    order.updatedAt = now;
    
    this.emit("order-delivered", { order });
    return order;
  }
  
  /**
   * Complete order
   */
  completeOrder(orderId: string): Order {
    const order = this.orders.get(orderId);
    if (!order) throw new Error("Order not found");
    
    const now = new Date();
    
    order.status = "completed";
    order.completedAt = now;
    order.updatedAt = now;
    
    // Release escrow if applicable
    const escrow = Array.from(this.escrows.values()).find(e => e.orderId === orderId);
    if (escrow && escrow.status === "holding") {
      escrow.status = "released";
      escrow.releasedAt = now;
      this.emit("escrow-released", { escrow });
    }
    
    this.emit("order-completed", { order });
    return order;
  }
  
  /**
   * Cancel order
   */
  cancelOrder(orderId: string, reason: string): Order {
    const order = this.orders.get(orderId);
    if (!order) throw new Error("Order not found");
    
    const now = new Date();
    
    order.status = "cancelled";
    order.cancelledAt = now;
    order.updatedAt = now;
    order.internalNotes = (order.internalNotes || "") + `\nCancelled: ${reason}`;
    
    // Release reserved inventory
    for (const item of order.items) {
      if (item.productId) {
        const product = this.products.get(item.productId);
        if (product && product.trackInventory) {
          product.reservedQuantity -= item.quantity;
          product.updatedAt = now;
        }
      }
    }
    
    // Refund escrow if applicable
    const escrow = Array.from(this.escrows.values()).find(e => e.orderId === orderId);
    if (escrow && escrow.status === "holding") {
      escrow.status = "refunded";
      escrow.refundedAt = now;
      this.emit("escrow-refunded", { escrow });
    }
    
    this.emit("order-cancelled", { order, reason });
    return order;
  }
  
  /**
   * Refund order
   */
  refundOrder(orderId: string, amount: number, reason: string): Order {
    const order = this.orders.get(orderId);
    if (!order) throw new Error("Order not found");
    
    const now = new Date();
    
    order.status = "refunded";
    order.paymentStatus = "refunded";
    order.updatedAt = now;
    
    order.metadata.refund = {
      amount,
      reason,
      date: now,
    };
    
    this.emit("order-refunded", { order, amount, reason });
    return order;
  }
  
  /**
   * Get orders for a buyer or seller
   */
  getOrders(params: {
    buyerId?: string;
    sellerId?: string;
    status?: TransactionStatus;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Order[] {
    let results = Array.from(this.orders.values());
    
    if (params.buyerId) {
      results = results.filter(o => o.buyerId === params.buyerId);
    }
    
    if (params.sellerId) {
      results = results.filter(o => o.sellerId === params.sellerId);
    }
    
    if (params.status) {
      results = results.filter(o => o.status === params.status);
    }
    
    if (params.startDate) {
      results = results.filter(o => o.createdAt >= params.startDate!);
    }
    
    if (params.endDate) {
      results = results.filter(o => o.createdAt <= params.endDate!);
    }
    
    // Sort by date descending
    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    return results.slice(0, params.limit || 50);
  }
  
  // ==========================================================================
  // Invoice Management
  // ==========================================================================
  
  /**
   * Create an invoice
   */
  createInvoice(params: {
    issuerId: string;
    issuerName: string;
    recipientId: string;
    recipientName: string;
    items: Invoice["items"];
    dueDate: Date;
    orderId?: string;
    terms?: string;
    currency?: "PI" | "USD" | "EUR" | "GBP";
  }): Invoice {
    const id = `inv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const invoiceNumber = `INV-${++this.invoiceCounter}`;
    const now = new Date();
    
    const subtotal = params.items.reduce((sum, item) => sum + item.total, 0);
    const tax = subtotal * 0.0314;
    
    const invoice: Invoice = {
      id,
      invoiceNumber,
      orderId: params.orderId,
      
      issuerId: params.issuerId,
      issuerName: params.issuerName,
      recipientId: params.recipientId,
      recipientName: params.recipientName,
      
      items: params.items,
      
      subtotal,
      tax,
      discount: 0,
      total: subtotal + tax,
      amountPaid: 0,
      amountDue: subtotal + tax,
      currency: params.currency || "PI",
      
      issueDate: now,
      dueDate: params.dueDate,
      terms: params.terms,
      
      status: "draft",
      createdAt: now,
      updatedAt: now,
    };
    
    this.invoices.set(id, invoice);
    this.emit("invoice-created", { invoice });
    return invoice;
  }
  
  /**
   * Send invoice
   */
  sendInvoice(invoiceId: string): Invoice {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) throw new Error("Invoice not found");
    
    invoice.status = "sent";
    invoice.updatedAt = new Date();
    
    this.emit("invoice-sent", { invoice });
    return invoice;
  }
  
  /**
   * Record payment on invoice
   */
  recordInvoicePayment(invoiceId: string, amount: number): Invoice {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) throw new Error("Invoice not found");
    
    invoice.amountPaid += amount;
    invoice.amountDue = Math.max(0, invoice.total - invoice.amountPaid);
    
    if (invoice.amountDue === 0) {
      invoice.status = "paid";
    } else if (invoice.amountPaid > 0) {
      invoice.status = "partial";
    }
    
    invoice.updatedAt = new Date();
    
    this.emit("invoice-payment-recorded", { invoice, amount });
    return invoice;
  }
  
  // ==========================================================================
  // Escrow Management
  // ==========================================================================
  
  /**
   * Create escrow for an order
   */
  createEscrow(params: {
    orderId: string;
    buyerId: string;
    sellerId: string;
    amount: number;
    currency?: "PI" | "USD" | "EUR" | "GBP";
    releaseConditions: string[];
    autoReleaseDate?: Date;
  }): EscrowTransaction {
    const id = `esc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    const escrow: EscrowTransaction = {
      id,
      orderId: params.orderId,
      buyerId: params.buyerId,
      sellerId: params.sellerId,
      amount: params.amount,
      currency: params.currency || "PI",
      status: "holding",
      releaseConditions: params.releaseConditions,
      conditionsMet: params.releaseConditions.map(() => false),
      autoReleaseDate: params.autoReleaseDate,
      fundedAt: new Date(),
    };
    
    this.escrows.set(id, escrow);
    this.emit("escrow-created", { escrow });
    return escrow;
  }
  
  /**
   * Mark escrow condition as met
   */
  markConditionMet(escrowId: string, conditionIndex: number): EscrowTransaction {
    const escrow = this.escrows.get(escrowId);
    if (!escrow) throw new Error("Escrow not found");
    
    if (conditionIndex < 0 || conditionIndex >= escrow.conditionsMet.length) {
      throw new Error("Invalid condition index");
    }
    
    escrow.conditionsMet[conditionIndex] = true;
    
    // Check if all conditions are met
    if (escrow.conditionsMet.every(c => c)) {
      escrow.status = "released";
      escrow.releasedAt = new Date();
      this.emit("escrow-released", { escrow });
    }
    
    this.emit("escrow-condition-met", { escrow, conditionIndex });
    return escrow;
  }
  
  // ==========================================================================
  // Dispute Management
  // ==========================================================================
  
  /**
   * Create a dispute
   */
  createDispute(params: {
    orderId: string;
    raisedBy: string;
    respondent: string;
    reason: DisputeReason;
    description: string;
    evidence?: string[];
  }): Dispute {
    const id = `dsp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();
    
    const dispute: Dispute = {
      id,
      orderId: params.orderId,
      raisedBy: params.raisedBy,
      respondent: params.respondent,
      reason: params.reason,
      description: params.description,
      evidence: params.evidence || [],
      status: "open",
      messages: [{
        senderId: params.raisedBy,
        message: params.description,
        timestamp: now,
      }],
      createdAt: now,
      updatedAt: now,
    };
    
    this.disputes.set(id, dispute);
    
    // Update order status
    const order = this.orders.get(params.orderId);
    if (order) {
      order.status = "disputed";
      order.updatedAt = now;
    }
    
    // Mark escrow as disputed if exists
    const escrow = Array.from(this.escrows.values()).find(e => e.orderId === params.orderId);
    if (escrow) {
      escrow.status = "disputed";
    }
    
    this.emit("dispute-created", { dispute });
    return dispute;
  }
  
  /**
   * Add message to dispute
   */
  addDisputeMessage(disputeId: string, senderId: string, message: string, attachments?: string[]): Dispute {
    const dispute = this.disputes.get(disputeId);
    if (!dispute) throw new Error("Dispute not found");
    
    dispute.messages.push({
      senderId,
      message,
      attachments,
      timestamp: new Date(),
    });
    dispute.updatedAt = new Date();
    
    this.emit("dispute-message-added", { dispute, senderId, message });
    return dispute;
  }
  
  /**
   * Resolve dispute
   */
  resolveDispute(disputeId: string, resolution: {
    outcome: Dispute["resolution"];
    notes: string;
    refundAmount?: number;
  }): Dispute {
    const dispute = this.disputes.get(disputeId);
    if (!dispute) throw new Error("Dispute not found");
    
    const now = new Date();
    
    dispute.status = "resolved";
    dispute.resolution = resolution.outcome;
    dispute.resolutionNotes = resolution.notes;
    dispute.refundAmount = resolution.refundAmount;
    dispute.resolvedAt = now;
    dispute.updatedAt = now;
    
    // Process refund if applicable
    if (resolution.refundAmount && resolution.refundAmount > 0) {
      const order = this.orders.get(dispute.orderId);
      if (order) {
        this.refundOrder(dispute.orderId, resolution.refundAmount, `Dispute ${disputeId} resolved`);
      }
    }
    
    this.emit("dispute-resolved", { dispute, resolution });
    return dispute;
  }
  
  // ==========================================================================
  // Review Management
  // ==========================================================================
  
  /**
   * Create a review
   */
  createReview(params: {
    orderId: string;
    reviewerId: string;
    reviewerName: string;
    targetId: string;
    targetType: Review["targetType"];
    overallRating: number;
    qualityRating?: number;
    serviceRating?: number;
    valueRating?: number;
    title?: string;
    content: string;
    pros?: string[];
    cons?: string[];
    images?: string[];
  }): Review {
    const id = `rev-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();
    
    // Verify purchase
    const order = this.orders.get(params.orderId);
    const verified = order && order.buyerId === params.reviewerId && order.status === "completed";
    
    const review: Review = {
      id,
      orderId: params.orderId,
      reviewerId: params.reviewerId,
      reviewerName: params.reviewerName,
      targetId: params.targetId,
      targetType: params.targetType,
      
      overallRating: Math.min(5, Math.max(1, params.overallRating)),
      qualityRating: params.qualityRating,
      serviceRating: params.serviceRating,
      valueRating: params.valueRating,
      
      title: params.title,
      content: params.content,
      pros: params.pros,
      cons: params.cons,
      images: params.images,
      
      status: "pending",
      verified: !!verified,
      
      helpful: 0,
      notHelpful: 0,
      createdAt: now,
      updatedAt: now,
    };
    
    this.reviews.set(id, review);
    this.emit("review-created", { review });
    return review;
  }
  
  /**
   * Publish review (after moderation)
   */
  publishReview(reviewId: string): Review {
    const review = this.reviews.get(reviewId);
    if (!review) throw new Error("Review not found");
    
    review.status = "published";
    review.updatedAt = new Date();
    
    this.emit("review-published", { review });
    return review;
  }
  
  /**
   * Add seller response to review
   */
  respondToReview(reviewId: string, response: string): Review {
    const review = this.reviews.get(reviewId);
    if (!review) throw new Error("Review not found");
    
    review.sellerResponse = {
      content: response,
      respondedAt: new Date(),
    };
    review.updatedAt = new Date();
    
    this.emit("review-responded", { review, response });
    return review;
  }
  
  /**
   * Get reviews for a target
   */
  getReviews(targetId: string, status?: Review["status"]): Review[] {
    let results = Array.from(this.reviews.values())
      .filter(r => r.targetId === targetId);
    
    if (status) {
      results = results.filter(r => r.status === status);
    }
    
    return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  /**
   * Calculate average rating
   */
  calculateAverageRating(targetId: string): {
    overall: number;
    quality: number;
    service: number;
    value: number;
    count: number;
  } {
    const reviews = this.getReviews(targetId, "published");
    
    if (reviews.length === 0) {
      return { overall: 0, quality: 0, service: 0, value: 0, count: 0 };
    }
    
    const sum = (arr: (number | undefined)[]) => {
      const valid = arr.filter((n): n is number => n !== undefined);
      return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : 0;
    };
    
    return {
      overall: sum(reviews.map(r => r.overallRating)),
      quality: sum(reviews.map(r => r.qualityRating)),
      service: sum(reviews.map(r => r.serviceRating)),
      value: sum(reviews.map(r => r.valueRating)),
      count: reviews.length,
    };
  }
  
  // ==========================================================================
  // Statistics
  // ==========================================================================
  
  /**
   * Get commerce statistics
   */
  getStatistics(): {
    products: { total: number; active: number; totalValue: number };
    services: { total: number; active: number };
    orders: {
      total: number;
      byStatus: Record<string, number>;
      totalRevenue: number;
      averageOrderValue: number;
    };
    disputes: { total: number; open: number; resolved: number };
    reviews: { total: number; averageRating: number };
  } {
    const products = Array.from(this.products.values());
    const services = Array.from(this.services.values());
    const orders = Array.from(this.orders.values());
    const disputes = Array.from(this.disputes.values());
    const reviews = Array.from(this.reviews.values());
    
    const statusCounts: Record<string, number> = {};
    let totalRevenue = 0;
    
    for (const order of orders) {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
      if (order.status === "completed" || order.status === "delivered") {
        totalRevenue += order.total;
      }
    }
    
    const completedOrders = orders.filter(o => o.status === "completed" || o.status === "delivered");
    const avgOrderValue = completedOrders.length > 0
      ? totalRevenue / completedOrders.length
      : 0;
    
    const publishedReviews = reviews.filter(r => r.status === "published");
    const avgRating = publishedReviews.length > 0
      ? publishedReviews.reduce((sum, r) => sum + r.overallRating, 0) / publishedReviews.length
      : 0;
    
    return {
      products: {
        total: products.length,
        active: products.filter(p => p.status === "active").length,
        totalValue: products.reduce((sum, p) => sum + p.price * p.stockQuantity, 0),
      },
      services: {
        total: services.length,
        active: services.filter(s => s.status === "active").length,
      },
      orders: {
        total: orders.length,
        byStatus: statusCounts,
        totalRevenue,
        averageOrderValue: avgOrderValue,
      },
      disputes: {
        total: disputes.length,
        open: disputes.filter(d => d.status === "open" || d.status === "under-review").length,
        resolved: disputes.filter(d => d.status === "resolved" || d.status === "closed").length,
      },
      reviews: {
        total: reviews.length,
        averageRating: avgRating,
      },
    };
  }
}

// ============================================================================
// Exports
// ============================================================================

export const commerceSystem = CommerceSystemManager.getInstance();

export { CommerceSystemManager };
