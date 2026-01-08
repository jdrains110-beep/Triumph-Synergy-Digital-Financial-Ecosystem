/**
 * Triumph Synergy - Enterprise Delivery Platform
 * 
 * Superior delivery service rivaling DoorDash, UberEats, Instacart, and Amazon Logistics
 * Features real-time tracking, intelligent routing, multi-modal delivery, and Pi payments
 * 
 * @module lib/delivery/delivery-platform
 * @version 1.0.0
 */

// ============================================================================
// CONSTANTS
// ============================================================================

const PI_TO_USD_RATE = 314.159;

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface DeliveryOrder {
  id: string;
  orderNumber: string;
  type: DeliveryType;
  status: DeliveryStatus;
  priority: "standard" | "express" | "scheduled" | "instant";
  
  // Customer
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  
  // Merchant/Origin
  merchantId: string;
  merchantName: string;
  pickupAddress: DeliveryAddress;
  pickupInstructions: string;
  
  // Destination
  dropoffAddress: DeliveryAddress;
  dropoffInstructions: string;
  deliveryWindow: { start: Date; end: Date } | null;
  
  // Items
  items: DeliveryItem[];
  totalItems: number;
  totalWeight: number;
  specialHandling: SpecialHandling[];
  
  // Pricing
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  tip: number;
  taxes: number;
  total: number;
  piEquivalent: number;
  currency: string;
  
  // Payment
  paymentMethod: "pi" | "card" | "cash";
  paymentStatus: "pending" | "authorized" | "captured" | "refunded";
  piTransactionId: string | null;
  
  // Assignment
  driverId: string | null;
  vehicleId: string | null;
  routeId: string | null;
  
  // Tracking
  tracking: TrackingUpdate[];
  currentLocation: GeoLocation | null;
  estimatedArrival: Date | null;
  actualArrival: Date | null;
  
  // Proof of Delivery
  proofOfDelivery: ProofOfDelivery | null;
  
  // Ratings
  customerRating: number | null;
  driverRating: number | null;
  merchantRating: number | null;
  
  // Timestamps
  placedAt: Date;
  acceptedAt: Date | null;
  pickedUpAt: Date | null;
  deliveredAt: Date | null;
  cancelledAt: Date | null;
  
  // Notes
  cancellationReason: string | null;
  notes: string;
}

export type DeliveryType =
  | "food"
  | "grocery"
  | "pharmacy"
  | "alcohol"
  | "package"
  | "document"
  | "retail"
  | "flowers"
  | "catering"
  | "furniture"
  | "appliance"
  | "custom";

export type DeliveryStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready-for-pickup"
  | "driver-assigned"
  | "driver-en-route-pickup"
  | "arrived-at-pickup"
  | "picked-up"
  | "in-transit"
  | "arrived-at-destination"
  | "delivered"
  | "cancelled"
  | "failed";

export interface DeliveryAddress {
  street: string;
  unit: string | null;
  city: string;
  state: string;
  zip: string;
  country: string;
  latitude: number;
  longitude: number;
  type: "residential" | "business" | "other";
  accessCode: string | null;
}

export interface DeliveryItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  weight: number;
  dimensions: { length: number; width: number; height: number } | null;
  imageUrl: string | null;
  specialInstructions: string;
  substitutionPreference: "allow" | "refund" | "contact";
  substitutedItem: string | null;
}

export type SpecialHandling =
  | "fragile"
  | "temperature-controlled"
  | "refrigerated"
  | "frozen"
  | "hazmat"
  | "signature-required"
  | "id-verification"
  | "age-verification"
  | "no-contact"
  | "heavy"
  | "oversized";

export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  heading: number | null;
  speed: number | null;
  timestamp: Date;
}

export interface TrackingUpdate {
  id: string;
  status: DeliveryStatus;
  location: GeoLocation | null;
  message: string;
  timestamp: Date;
  isPublic: boolean;
}

export interface ProofOfDelivery {
  type: "photo" | "signature" | "pin" | "none";
  photoUrl: string | null;
  signatureUrl: string | null;
  pinCode: string | null;
  recipientName: string | null;
  timestamp: Date;
  location: GeoLocation;
}

export interface Driver {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  profilePhoto: string;
  
  // Status
  status: "available" | "busy" | "offline" | "suspended";
  currentOrderId: string | null;
  currentLocation: GeoLocation | null;
  
  // Vehicle
  vehicleType: VehicleType;
  vehicleDetails: VehicleDetails;
  
  // Ratings & Stats
  rating: number;
  totalDeliveries: number;
  completionRate: number;
  onTimeRate: number;
  
  // Earnings
  walletAddress: string;
  lifetimeEarnings: number;
  weeklyEarnings: number;
  pendingPayout: number;
  
  // Documents
  driversLicense: DriverDocument;
  insurance: DriverDocument;
  vehicleRegistration: DriverDocument;
  backgroundCheck: BackgroundCheck;
  
  // Preferences
  maxDistance: number;
  preferredZones: string[];
  acceptedDeliveryTypes: DeliveryType[];
  
  // Account
  createdAt: Date;
  lastActiveAt: Date;
  isVerified: boolean;
}

export type VehicleType =
  | "bicycle"
  | "motorcycle"
  | "car"
  | "suv"
  | "van"
  | "truck"
  | "cargo-bike"
  | "scooter"
  | "walker";

export interface VehicleDetails {
  make: string;
  model: string;
  year: number;
  color: string;
  licensePlate: string;
  capacity: { weight: number; volume: number };
}

export interface DriverDocument {
  type: string;
  number: string;
  expirationDate: Date;
  verified: boolean;
  documentUrl: string;
}

export interface BackgroundCheck {
  status: "pending" | "passed" | "failed";
  provider: string;
  completedAt: Date | null;
  validUntil: Date | null;
}

export interface Merchant {
  id: string;
  businessName: string;
  category: string;
  subcategory: string;
  
  // Contact
  email: string;
  phone: string;
  contactName: string;
  
  // Location
  address: DeliveryAddress;
  
  // Operations
  operatingHours: OperatingHours[];
  prepTime: number; // average in minutes
  acceptsScheduled: boolean;
  
  // Ratings
  rating: number;
  totalOrders: number;
  
  // Payment
  piWalletAddress: string;
  commissionRate: number;
  
  // Settings
  autoAcceptOrders: boolean;
  minimumOrder: number;
  deliveryRadius: number;
  
  // Account
  isActive: boolean;
  isVerified: boolean;
  createdAt: Date;
}

export interface OperatingHours {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

export interface Route {
  id: string;
  driverId: string;
  orderIds: string[];
  status: "planning" | "active" | "completed";
  
  // Waypoints
  waypoints: RouteWaypoint[];
  totalDistance: number;
  totalDuration: number;
  
  // Optimization
  optimizationScore: number;
  fuelEstimate: number;
  
  // Tracking
  startedAt: Date | null;
  completedAt: Date | null;
}

export interface RouteWaypoint {
  orderId: string;
  type: "pickup" | "dropoff";
  address: DeliveryAddress;
  estimatedArrival: Date;
  actualArrival: Date | null;
  sequence: number;
}

export interface DeliveryZone {
  id: string;
  name: string;
  polygon: GeoLocation[];
  baseDeliveryFee: number;
  perMileFee: number;
  peakMultiplier: number;
  isActive: boolean;
}

// ============================================================================
// DELIVERY PLATFORM ENGINE
// ============================================================================

export class DeliveryPlatform {
  private static instance: DeliveryPlatform;
  
  private orders: Map<string, DeliveryOrder> = new Map();
  private drivers: Map<string, Driver> = new Map();
  private merchants: Map<string, Merchant> = new Map();
  private routes: Map<string, Route> = new Map();
  private zones: Map<string, DeliveryZone> = new Map();

  private constructor() {
    this.initializeDefaultZones();
  }

  static getInstance(): DeliveryPlatform {
    if (!DeliveryPlatform.instance) {
      DeliveryPlatform.instance = new DeliveryPlatform();
    }
    return DeliveryPlatform.instance;
  }

  private initializeDefaultZones(): void {
    const defaultZone: DeliveryZone = {
      id: "zone-default",
      name: "Default Zone",
      polygon: [],
      baseDeliveryFee: 4.99,
      perMileFee: 1.50,
      peakMultiplier: 1.5,
      isActive: true,
    };
    this.zones.set(defaultZone.id, defaultZone);
  }

  // ==========================================================================
  // ORDER MANAGEMENT
  // ==========================================================================

  async createOrder(orderData: {
    type: DeliveryType;
    priority: DeliveryOrder["priority"];
    customerId: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    merchantId: string;
    dropoffAddress: DeliveryAddress;
    dropoffInstructions: string;
    items: Omit<DeliveryItem, "id">[];
    specialHandling: SpecialHandling[];
    paymentMethod: DeliveryOrder["paymentMethod"];
    tip: number;
    deliveryWindow?: { start: Date; end: Date };
  }): Promise<DeliveryOrder> {
    const merchant = this.merchants.get(orderData.merchantId);
    if (!merchant) {
      throw new Error("Merchant not found");
    }

    const id = `order-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const orderNumber = `TS-${Date.now().toString().slice(-8)}`;

    // Process items
    const items: DeliveryItem[] = orderData.items.map((item, idx) => ({
      ...item,
      id: `item-${id}-${idx}`,
    }));

    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const totalWeight = items.reduce((sum, item) => sum + item.weight * item.quantity, 0);
    
    // Calculate fees
    const distance = this.calculateDistance(merchant.address, orderData.dropoffAddress);
    const deliveryFee = this.calculateDeliveryFee(distance, orderData.priority);
    const serviceFee = subtotal * 0.05;
    const taxes = (subtotal + deliveryFee + serviceFee) * 0.08;
    const total = subtotal + deliveryFee + serviceFee + orderData.tip + taxes;

    const order: DeliveryOrder = {
      id,
      orderNumber,
      type: orderData.type,
      status: "pending",
      priority: orderData.priority,
      customerId: orderData.customerId,
      customerName: orderData.customerName,
      customerPhone: orderData.customerPhone,
      customerEmail: orderData.customerEmail,
      merchantId: orderData.merchantId,
      merchantName: merchant.businessName,
      pickupAddress: merchant.address,
      pickupInstructions: "",
      dropoffAddress: orderData.dropoffAddress,
      dropoffInstructions: orderData.dropoffInstructions,
      deliveryWindow: orderData.deliveryWindow || null,
      items,
      totalItems: items.reduce((sum, i) => sum + i.quantity, 0),
      totalWeight,
      specialHandling: orderData.specialHandling,
      subtotal,
      deliveryFee,
      serviceFee,
      tip: orderData.tip,
      taxes,
      total,
      piEquivalent: total / PI_TO_USD_RATE,
      currency: "USD",
      paymentMethod: orderData.paymentMethod,
      paymentStatus: "pending",
      piTransactionId: null,
      driverId: null,
      vehicleId: null,
      routeId: null,
      tracking: [],
      currentLocation: null,
      estimatedArrival: null,
      actualArrival: null,
      proofOfDelivery: null,
      customerRating: null,
      driverRating: null,
      merchantRating: null,
      placedAt: new Date(),
      acceptedAt: null,
      pickedUpAt: null,
      deliveredAt: null,
      cancelledAt: null,
      cancellationReason: null,
      notes: "",
    };

    // Initial tracking
    order.tracking.push({
      id: `track-${Date.now()}`,
      status: "pending",
      location: null,
      message: "Order placed successfully",
      timestamp: new Date(),
      isPublic: true,
    });

    this.orders.set(id, order);
    return order;
  }

  async getOrder(orderId: string): Promise<DeliveryOrder | null> {
    return this.orders.get(orderId) || null;
  }

  async updateOrderStatus(orderId: string, status: DeliveryStatus, message?: string): Promise<DeliveryOrder> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    order.status = status;
    
    const trackingUpdate: TrackingUpdate = {
      id: `track-${Date.now()}`,
      status,
      location: order.currentLocation,
      message: message || this.getStatusMessage(status),
      timestamp: new Date(),
      isPublic: true,
    };
    order.tracking.push(trackingUpdate);

    // Update timestamps
    if (status === "confirmed") {
      order.acceptedAt = new Date();
    } else if (status === "picked-up") {
      order.pickedUpAt = new Date();
    } else if (status === "delivered") {
      order.deliveredAt = new Date();
      order.actualArrival = new Date();
    } else if (status === "cancelled") {
      order.cancelledAt = new Date();
    }

    return order;
  }

  async assignDriver(orderId: string, driverId: string): Promise<DeliveryOrder> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    const driver = this.drivers.get(driverId);
    if (!driver) {
      throw new Error("Driver not found");
    }

    if (driver.status !== "available") {
      throw new Error("Driver is not available");
    }

    order.driverId = driverId;
    order.vehicleId = driver.id;
    order.status = "driver-assigned";
    
    driver.status = "busy";
    driver.currentOrderId = orderId;

    // Calculate ETA - use driver's current location if available, otherwise use pickup address
    const fromLat = driver.currentLocation?.latitude ?? order.pickupAddress.latitude;
    const fromLon = driver.currentLocation?.longitude ?? order.pickupAddress.longitude;
    const distance = this.calculateDistanceFromCoords(fromLat, fromLon, order.dropoffAddress.latitude, order.dropoffAddress.longitude);
    const durationMinutes = (distance / 25) * 60 + 15; // Assume 25mph avg + 15min buffer
    order.estimatedArrival = new Date(Date.now() + durationMinutes * 60 * 1000);

    order.tracking.push({
      id: `track-${Date.now()}`,
      status: "driver-assigned",
      location: driver.currentLocation,
      message: `${driver.firstName} is on the way!`,
      timestamp: new Date(),
      isPublic: true,
    });

    return order;
  }

  async trackOrder(orderId: string): Promise<{ order: DeliveryOrder; eta: Date | null; driverLocation: GeoLocation | null }> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    let driverLocation: GeoLocation | null = null;
    if (order.driverId) {
      const driver = this.drivers.get(order.driverId);
      if (driver) {
        driverLocation = driver.currentLocation;
      }
    }

    return {
      order,
      eta: order.estimatedArrival,
      driverLocation,
    };
  }

  async completeDelivery(orderId: string, proof: Omit<ProofOfDelivery, "timestamp">): Promise<DeliveryOrder> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    order.proofOfDelivery = {
      ...proof,
      timestamp: new Date(),
    };

    order.status = "delivered";
    order.deliveredAt = new Date();
    order.actualArrival = new Date();

    // Release driver
    if (order.driverId) {
      const driver = this.drivers.get(order.driverId);
      if (driver) {
        driver.status = "available";
        driver.currentOrderId = null;
        driver.totalDeliveries++;
      }
    }

    order.tracking.push({
      id: `track-${Date.now()}`,
      status: "delivered",
      location: proof.location,
      message: "Order delivered successfully!",
      timestamp: new Date(),
      isPublic: true,
    });

    return order;
  }

  // ==========================================================================
  // DRIVER MANAGEMENT
  // ==========================================================================

  async registerDriver(driverData: Omit<Driver, "id" | "status" | "currentOrderId" | "currentLocation" | "rating" | "totalDeliveries" | "completionRate" | "onTimeRate" | "lifetimeEarnings" | "weeklyEarnings" | "pendingPayout" | "createdAt" | "lastActiveAt" | "isVerified">): Promise<Driver> {
    const id = `driver-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const driver: Driver = {
      ...driverData,
      id,
      status: "offline",
      currentOrderId: null,
      currentLocation: null,
      rating: 0,
      totalDeliveries: 0,
      completionRate: 100,
      onTimeRate: 100,
      lifetimeEarnings: 0,
      weeklyEarnings: 0,
      pendingPayout: 0,
      createdAt: new Date(),
      lastActiveAt: new Date(),
      isVerified: false,
    };

    this.drivers.set(id, driver);
    return driver;
  }

  async updateDriverStatus(driverId: string, status: Driver["status"]): Promise<Driver> {
    const driver = this.drivers.get(driverId);
    if (!driver) {
      throw new Error("Driver not found");
    }

    driver.status = status;
    driver.lastActiveAt = new Date();
    return driver;
  }

  async updateDriverLocation(driverId: string, location: GeoLocation): Promise<Driver> {
    const driver = this.drivers.get(driverId);
    if (!driver) {
      throw new Error("Driver not found");
    }

    driver.currentLocation = location;
    driver.lastActiveAt = new Date();

    // Update order tracking if driver has active order
    if (driver.currentOrderId) {
      const order = this.orders.get(driver.currentOrderId);
      if (order) {
        order.currentLocation = location;
      }
    }

    return driver;
  }

  async findNearbyDrivers(location: GeoLocation, maxDistance: number = 10): Promise<Driver[]> {
    const availableDrivers = Array.from(this.drivers.values())
      .filter(d => d.status === "available" && d.currentLocation);

    const nearbyDrivers = availableDrivers.filter(driver => {
      if (!driver.currentLocation) return false;
      const distance = this.calculateDistanceFromCoords(
        location.latitude, location.longitude,
        driver.currentLocation.latitude, driver.currentLocation.longitude
      );
      return distance <= maxDistance;
    });

    return nearbyDrivers.sort((a, b) => {
      const distA = this.calculateDistanceFromCoords(
        location.latitude, location.longitude,
        a.currentLocation!.latitude, a.currentLocation!.longitude
      );
      const distB = this.calculateDistanceFromCoords(
        location.latitude, location.longitude,
        b.currentLocation!.latitude, b.currentLocation!.longitude
      );
      return distA - distB;
    });
  }

  // ==========================================================================
  // MERCHANT MANAGEMENT
  // ==========================================================================

  async registerMerchant(merchantData: Omit<Merchant, "id" | "rating" | "totalOrders" | "isActive" | "isVerified" | "createdAt">): Promise<Merchant> {
    const id = `merchant-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const merchant: Merchant = {
      ...merchantData,
      id,
      rating: 0,
      totalOrders: 0,
      isActive: true,
      isVerified: false,
      createdAt: new Date(),
    };

    this.merchants.set(id, merchant);
    return merchant;
  }

  async getMerchant(merchantId: string): Promise<Merchant | null> {
    return this.merchants.get(merchantId) || null;
  }

  async searchMerchants(query: {
    category?: string;
    location?: GeoLocation;
    maxDistance?: number;
    isOpen?: boolean;
  }): Promise<Merchant[]> {
    let merchants = Array.from(this.merchants.values()).filter(m => m.isActive);

    if (query.category) {
      merchants = merchants.filter(m => 
        m.category.toLowerCase().includes(query.category!.toLowerCase())
      );
    }

    if (query.location && query.maxDistance) {
      merchants = merchants.filter(m => {
        const distance = this.calculateDistanceFromCoords(
          query.location!.latitude, query.location!.longitude,
          m.address.latitude, m.address.longitude
        );
        return distance <= query.maxDistance!;
      });
    }

    if (query.isOpen) {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
      
      merchants = merchants.filter(m => {
        const todayHours = m.operatingHours.find(h => h.dayOfWeek === dayOfWeek);
        if (!todayHours || todayHours.isClosed) return false;
        return currentTime >= todayHours.openTime && currentTime <= todayHours.closeTime;
      });
    }

    return merchants.sort((a, b) => b.rating - a.rating);
  }

  // ==========================================================================
  // ROUTE OPTIMIZATION
  // ==========================================================================

  async optimizeRoute(driverId: string, orderIds: string[]): Promise<Route> {
    const driver = this.drivers.get(driverId);
    if (!driver) {
      throw new Error("Driver not found");
    }

    const orders = orderIds.map(id => this.orders.get(id)).filter(Boolean) as DeliveryOrder[];
    if (orders.length !== orderIds.length) {
      throw new Error("Some orders not found");
    }

    // Create waypoints (pickup then dropoff for each order)
    const waypoints: RouteWaypoint[] = [];
    let sequence = 0;

    // Add all pickups first (grouped by merchant)
    const merchantOrders = new Map<string, DeliveryOrder[]>();
    orders.forEach(order => {
      const existing = merchantOrders.get(order.merchantId) || [];
      existing.push(order);
      merchantOrders.set(order.merchantId, existing);
    });

    merchantOrders.forEach((merchantOrderList) => {
      merchantOrderList.forEach(order => {
        waypoints.push({
          orderId: order.id,
          type: "pickup",
          address: order.pickupAddress,
          estimatedArrival: new Date(),
          actualArrival: null,
          sequence: sequence++,
        });
      });
    });

    // Add dropoffs (optimized by proximity)
    const dropoffs = orders.map(order => ({
      orderId: order.id,
      address: order.dropoffAddress,
    }));

    // Simple nearest-neighbor optimization
    let currentPos = orders[0].pickupAddress;
    const orderedDropoffs: typeof dropoffs = [];
    const remaining = [...dropoffs];

    while (remaining.length > 0) {
      let nearestIdx = 0;
      let nearestDist = Infinity;

      remaining.forEach((dropoff, idx) => {
        const dist = this.calculateDistance(currentPos, dropoff.address);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIdx = idx;
        }
      });

      const nearest = remaining.splice(nearestIdx, 1)[0];
      orderedDropoffs.push(nearest);
      currentPos = nearest.address;
    }

    orderedDropoffs.forEach(dropoff => {
      waypoints.push({
        orderId: dropoff.orderId,
        type: "dropoff",
        address: dropoff.address,
        estimatedArrival: new Date(),
        actualArrival: null,
        sequence: sequence++,
      });
    });

    // Calculate totals
    let totalDistance = 0;
    for (let i = 1; i < waypoints.length; i++) {
      totalDistance += this.calculateDistance(waypoints[i-1].address, waypoints[i].address);
    }
    const totalDuration = (totalDistance / 25) * 60 + waypoints.length * 5; // 25mph + 5min per stop

    const route: Route = {
      id: `route-${Date.now()}`,
      driverId,
      orderIds,
      status: "planning",
      waypoints,
      totalDistance,
      totalDuration,
      optimizationScore: 85,
      fuelEstimate: totalDistance * 0.15,
      startedAt: null,
      completedAt: null,
    };

    this.routes.set(route.id, route);
    
    // Link route to orders
    orders.forEach(order => {
      order.routeId = route.id;
    });

    return route;
  }

  // ==========================================================================
  // ANALYTICS
  // ==========================================================================

  async getDeliveryStats(timeRange: { start: Date; end: Date }): Promise<{
    totalOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    totalRevenue: number;
    avgDeliveryTime: number;
    avgRating: number;
  }> {
    const orders = Array.from(this.orders.values()).filter(o =>
      o.placedAt >= timeRange.start && o.placedAt <= timeRange.end
    );

    const completedOrders = orders.filter(o => o.status === "delivered");
    const cancelledOrders = orders.filter(o => o.status === "cancelled");

    const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0);
    
    const deliveryTimes = completedOrders
      .filter(o => o.placedAt && o.deliveredAt)
      .map(o => (o.deliveredAt!.getTime() - o.placedAt.getTime()) / 60000);
    const avgDeliveryTime = deliveryTimes.length > 0
      ? deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length
      : 0;

    const ratings = completedOrders.filter(o => o.customerRating).map(o => o.customerRating!);
    const avgRating = ratings.length > 0
      ? ratings.reduce((a, b) => a + b, 0) / ratings.length
      : 0;

    return {
      totalOrders: orders.length,
      completedOrders: completedOrders.length,
      cancelledOrders: cancelledOrders.length,
      totalRevenue,
      avgDeliveryTime,
      avgRating,
    };
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private calculateDistance(from: DeliveryAddress, to: DeliveryAddress): number {
    return this.calculateDistanceFromCoords(
      from.latitude, from.longitude,
      to.latitude, to.longitude
    );
  }

  private calculateDistanceFromCoords(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private calculateDeliveryFee(distance: number, priority: DeliveryOrder["priority"]): number {
    const baseFee = 4.99;
    const perMile = 1.50;
    let fee = baseFee + distance * perMile;

    switch (priority) {
      case "instant":
        fee *= 2.0;
        break;
      case "express":
        fee *= 1.5;
        break;
      case "scheduled":
        fee *= 0.9;
        break;
    }

    return Math.round(fee * 100) / 100;
  }

  private getStatusMessage(status: DeliveryStatus): string {
    const messages: Record<DeliveryStatus, string> = {
      "pending": "Order received and pending confirmation",
      "confirmed": "Order confirmed by merchant",
      "preparing": "Your order is being prepared",
      "ready-for-pickup": "Order ready for pickup",
      "driver-assigned": "Driver assigned to your order",
      "driver-en-route-pickup": "Driver is heading to pickup location",
      "arrived-at-pickup": "Driver arrived at pickup location",
      "picked-up": "Order picked up and on the way",
      "in-transit": "Order is on the way to you",
      "arrived-at-destination": "Driver has arrived at your location",
      "delivered": "Order delivered successfully!",
      "cancelled": "Order has been cancelled",
      "failed": "Delivery attempt failed",
    };
    return messages[status];
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const deliveryPlatform = DeliveryPlatform.getInstance();

export async function placeDeliveryOrder(orderData: Parameters<typeof deliveryPlatform.createOrder>[0]): Promise<DeliveryOrder> {
  return deliveryPlatform.createOrder(orderData);
}

export async function trackDelivery(orderId: string): Promise<ReturnType<typeof deliveryPlatform.trackOrder>> {
  return deliveryPlatform.trackOrder(orderId);
}

export async function registerDriver(driverData: Parameters<typeof deliveryPlatform.registerDriver>[0]): Promise<Driver> {
  return deliveryPlatform.registerDriver(driverData);
}

export async function registerMerchant(merchantData: Parameters<typeof deliveryPlatform.registerMerchant>[0]): Promise<Merchant> {
  return deliveryPlatform.registerMerchant(merchantData);
}

export async function findNearbyMerchants(location: GeoLocation, category?: string): Promise<Merchant[]> {
  return deliveryPlatform.searchMerchants({ location, maxDistance: 10, category, isOpen: true });
}
