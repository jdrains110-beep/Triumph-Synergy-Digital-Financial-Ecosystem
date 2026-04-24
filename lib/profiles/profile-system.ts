/**
 * Unified Profile System
 * 
 * Secure, superior profiles for all entity types:
 * - Businesses (corporations, LLCs, partnerships, sole proprietors)
 * - Merchants (sellers on the platform)
 * - Customers (buyers/consumers)
 * - Employees (workers)
 * - Vendors (suppliers)
 * - Freelancers (independent contractors)
 * - Service Providers
 * 
 * All profiles integrate with NESARA/GESARA, QFS, Allodial, and Pi Network systems.
 */

import { EventEmitter } from "events";

// ============================================================================
// Types
// ============================================================================

export type EntityType = 
  | "individual"
  | "business"
  | "merchant"
  | "customer"
  | "employee"
  | "vendor"
  | "freelancer"
  | "service-provider"
  | "government"
  | "nonprofit"
  | "trust";

export type BusinessType =
  | "sole-proprietor"
  | "partnership"
  | "llc"
  | "corporation"
  | "s-corp"
  | "c-corp"
  | "cooperative"
  | "nonprofit"
  | "government-entity"
  | "trust"
  | "estate";

export type VerificationLevel = 0 | 1 | 2 | 3 | 4 | 5;

export type ProfileStatus = 
  | "pending"
  | "active"
  | "suspended"
  | "restricted"
  | "closed"
  | "under-review";

export type MerchantCategory =
  | "retail"
  | "food-beverage"
  | "grocery"
  | "health-wellness"
  | "beauty"
  | "electronics"
  | "home-garden"
  | "automotive"
  | "entertainment"
  | "travel"
  | "professional-services"
  | "education"
  | "financial-services"
  | "real-estate"
  | "construction"
  | "manufacturing"
  | "wholesale"
  | "agriculture"
  | "technology"
  | "media"
  | "other";

// ============================================================================
// Base Profile Interface
// ============================================================================

export interface BaseProfile {
  id: string;
  entityType: EntityType;
  status: ProfileStatus;
  verificationLevel: VerificationLevel;
  
  // Contact
  email: string;
  phone: string;
  alternatePhone?: string;
  
  // Address
  address: {
    street: string;
    unit?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    latitude?: number;
    longitude?: number;
  };
  
  // Pi Network Integration
  piUserId?: string;
  piUsername?: string;
  piWalletAddress?: string;
  piKycVerified: boolean;
  
  // Ecosystem Integration
  nesaraProfileId?: string;
  qfsAccountId?: string;
  citizenProfileId?: string;
  allodialPortfolioId?: string;
  
  // Security
  encryptionKey: string;
  twoFactorEnabled: boolean;
  lastLogin?: Date;
  loginAttempts: number;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  verifiedAt?: Date;
  lastActivityAt: Date;
  tags: string[];
  metadata: Record<string, unknown>;
}

// ============================================================================
// Individual Profile
// ============================================================================

export interface IndividualProfile extends BaseProfile {
  entityType: "individual" | "customer" | "employee" | "freelancer";
  
  // Personal Info
  firstName: string;
  middleName?: string;
  lastName: string;
  displayName: string;
  dateOfBirth: Date;
  gender?: "male" | "female" | "other" | "prefer-not-to-say";
  
  // Identity
  ssn?: string; // Encrypted
  governmentId?: {
    type: "passport" | "drivers-license" | "state-id" | "national-id";
    number: string; // Encrypted
    issuingCountry: string;
    issuingState?: string;
    expirationDate: Date;
    verified: boolean;
  };
  
  // Employment (for employees)
  employment?: {
    employerId: string;
    employerName: string;
    position: string;
    department?: string;
    startDate: Date;
    endDate?: Date;
    salary?: number;
    salaryFrequency?: "hourly" | "weekly" | "biweekly" | "monthly" | "annually";
    isActive: boolean;
  };
  
  // Freelancer Details
  freelancerDetails?: {
    skills: string[];
    hourlyRate: number;
    availability: "full-time" | "part-time" | "project-based";
    portfolio?: string;
    certifications: string[];
    rating: number;
    completedProjects: number;
  };
  
  // Buying/Selling Stats
  buyingStats: {
    totalOrders: number;
    totalSpent: number;
    averageOrder: number;
    lastOrderDate?: Date;
    favoriteCategories: string[];
    loyaltyPoints: number;
  };
  
  sellingStats?: {
    totalSales: number;
    totalRevenue: number;
    averageSale: number;
    lastSaleDate?: Date;
    rating: number;
    reviewCount: number;
  };
}

// ============================================================================
// Business Profile
// ============================================================================

export interface BusinessProfile extends BaseProfile {
  entityType: "business" | "nonprofit" | "government" | "trust";
  businessType: BusinessType;
  
  // Business Info
  legalName: string;
  tradeName?: string;
  displayName: string;
  description: string;
  website?: string;
  logo?: string;
  
  // Registration
  ein?: string; // Encrypted
  stateRegistrationNumber?: string;
  incorporationState?: string;
  incorporationDate?: Date;
  
  // Licenses
  licenses: {
    type: string;
    number: string;
    issuingAuthority: string;
    issuedDate: Date;
    expirationDate: Date;
    verified: boolean;
  }[];
  
  // Ownership
  owners: {
    profileId: string;
    name: string;
    ownershipPercentage: number;
    role: "owner" | "partner" | "shareholder" | "director" | "officer";
    title?: string;
    isPrimary: boolean;
  }[];
  
  // Authorized Representatives
  authorizedReps: {
    profileId: string;
    name: string;
    title: string;
    permissions: ("buy" | "sell" | "manage" | "admin" | "finance")[];
    addedAt: Date;
    isActive: boolean;
  }[];
  
  // Financial
  financialInfo: {
    annualRevenue?: number;
    employeeCount?: number;
    yearEstablished?: number;
    creditRating?: string;
    dunsNumber?: string;
    acceptedPaymentMethods: ("pi" | "card" | "bank" | "crypto" | "cash")[];
  };
  
  // Operating Hours
  operatingHours?: {
    timezone: string;
    schedule: {
      day: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
      open: string;
      close: string;
      isClosed: boolean;
    }[];
  };
  
  // Departments
  departments: {
    id: string;
    name: string;
    managerId?: string;
    employeeCount: number;
  }[];
}

// ============================================================================
// Merchant Profile
// ============================================================================

export interface MerchantProfile extends BaseProfile {
  entityType: "merchant" | "vendor" | "service-provider";
  
  // Business Reference
  businessProfileId?: string;
  
  // Merchant Info
  merchantName: string;
  description: string;
  category: MerchantCategory;
  subcategories: string[];
  logo?: string;
  banner?: string;
  
  // Store Details
  store: {
    type: "online" | "physical" | "hybrid";
    name: string;
    url?: string;
    physicalLocations: {
      id: string;
      name: string;
      address: BaseProfile["address"];
      phone: string;
      isHeadquarters: boolean;
    }[];
  };
  
  // Catalog
  catalogStats: {
    totalProducts: number;
    activeProducts: number;
    categories: string[];
    priceRange: { min: number; max: number };
    averagePrice: number;
  };
  
  // Selling Stats
  sellingStats: {
    totalSales: number;
    totalRevenue: number;
    averageOrderValue: number;
    conversionRate: number;
    returnRate: number;
    lastSaleDate?: Date;
  };
  
  // Ratings & Reviews
  ratings: {
    overall: number;
    quality: number;
    service: number;
    shipping: number;
    value: number;
    totalReviews: number;
    responseRate: number;
    responseTime: number; // Average hours
  };
  
  // Fulfillment
  fulfillment: {
    methods: ("self" | "third-party" | "dropship" | "digital")[];
    averageProcessingTime: number; // Hours
    shippingProviders: string[];
    freeShippingThreshold?: number;
    returnPolicy?: string;
    warranty?: string;
  };
  
  // Fees & Commissions
  fees: {
    platformFeePercent: number;
    transactionFeePercent: number;
    payoutFrequency: "daily" | "weekly" | "biweekly" | "monthly";
    minimumPayout: number;
    pendingBalance: number;
    availableBalance: number;
  };
  
  // Compliance
  compliance: {
    taxExempt: boolean;
    taxId?: string;
    salesTaxPermits: string[];
    licenses: string[];
    insuranceVerified: boolean;
    backgroundCheckPassed: boolean;
  };
  
  // Features
  features: {
    acceptsPi: boolean;
    acceptsCards: boolean;
    acceptsCrypto: boolean;
    offersDelivery: boolean;
    offersPickup: boolean;
    offersInstallation: boolean;
    offersFinancing: boolean;
    acceptsReturns: boolean;
    offerWarranty: boolean;
  };
}

// ============================================================================
// Profile System Manager
// ============================================================================

class ProfileSystemManager extends EventEmitter {
  private static instance: ProfileSystemManager;
  
  private individuals: Map<string, IndividualProfile> = new Map();
  private businesses: Map<string, BusinessProfile> = new Map();
  private merchants: Map<string, MerchantProfile> = new Map();
  
  // Indexes for fast lookup
  private emailIndex: Map<string, string> = new Map(); // email -> profileId
  private piUserIndex: Map<string, string> = new Map(); // piUserId -> profileId
  private phoneIndex: Map<string, string> = new Map(); // phone -> profileId
  
  private constructor() {
    super();
    this.setMaxListeners(50);
  }
  
  static getInstance(): ProfileSystemManager {
    if (!ProfileSystemManager.instance) {
      ProfileSystemManager.instance = new ProfileSystemManager();
    }
    return ProfileSystemManager.instance;
  }
  
  // ==========================================================================
  // Individual Profiles
  // ==========================================================================
  
  /**
   * Create a new individual profile (customer, employee, freelancer)
   */
  createIndividualProfile(params: {
    firstName: string;
    lastName: string;
    middleName?: string;
    email: string;
    phone: string;
    dateOfBirth: Date;
    address: BaseProfile["address"];
    entityType?: "individual" | "customer" | "employee" | "freelancer";
    piUserId?: string;
    piUsername?: string;
  }): IndividualProfile {
    // Check for duplicates
    if (this.emailIndex.has(params.email.toLowerCase())) {
      throw new Error("Email already registered");
    }
    
    const id = `ind-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();
    
    const profile: IndividualProfile = {
      id,
      entityType: params.entityType || "individual",
      status: "pending",
      verificationLevel: 0,
      
      // Personal
      firstName: params.firstName,
      middleName: params.middleName,
      lastName: params.lastName,
      displayName: `${params.firstName} ${params.lastName}`,
      dateOfBirth: params.dateOfBirth,
      
      // Contact
      email: params.email.toLowerCase(),
      phone: params.phone,
      address: params.address,
      
      // Pi Network
      piUserId: params.piUserId,
      piUsername: params.piUsername,
      piKycVerified: false,
      
      // Security
      encryptionKey: this.generateEncryptionKey(),
      twoFactorEnabled: false,
      loginAttempts: 0,
      
      // Stats
      buyingStats: {
        totalOrders: 0,
        totalSpent: 0,
        averageOrder: 0,
        favoriteCategories: [],
        loyaltyPoints: 0,
      },
      
      // Timestamps
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now,
      tags: [],
      metadata: {},
    };
    
    this.individuals.set(id, profile);
    this.emailIndex.set(params.email.toLowerCase(), id);
    this.phoneIndex.set(params.phone, id);
    if (params.piUserId) {
      this.piUserIndex.set(params.piUserId, id);
    }
    
    this.emit("profile-created", { type: "individual", profile });
    return profile;
  }
  
  /**
   * Create customer profile (convenience wrapper)
   */
  createCustomerProfile(params: Parameters<typeof this.createIndividualProfile>[0]): IndividualProfile {
    return this.createIndividualProfile({ ...params, entityType: "customer" });
  }
  
  /**
   * Create employee profile
   */
  createEmployeeProfile(params: Parameters<typeof this.createIndividualProfile>[0] & {
    employerId: string;
    employerName: string;
    position: string;
    department?: string;
    salary?: number;
    salaryFrequency?: "hourly" | "weekly" | "biweekly" | "monthly" | "annually";
  }): IndividualProfile {
    const profile = this.createIndividualProfile({ ...params, entityType: "employee" });
    
    profile.employment = {
      employerId: params.employerId,
      employerName: params.employerName,
      position: params.position,
      department: params.department,
      startDate: new Date(),
      salary: params.salary,
      salaryFrequency: params.salaryFrequency,
      isActive: true,
    };
    
    return profile;
  }
  
  /**
   * Create freelancer profile
   */
  createFreelancerProfile(params: Parameters<typeof this.createIndividualProfile>[0] & {
    skills: string[];
    hourlyRate: number;
    availability?: "full-time" | "part-time" | "project-based";
    portfolio?: string;
    certifications?: string[];
  }): IndividualProfile {
    const profile = this.createIndividualProfile({ ...params, entityType: "freelancer" });
    
    profile.freelancerDetails = {
      skills: params.skills,
      hourlyRate: params.hourlyRate,
      availability: params.availability || "project-based",
      portfolio: params.portfolio,
      certifications: params.certifications || [],
      rating: 0,
      completedProjects: 0,
    };
    
    // Enable selling for freelancers
    profile.sellingStats = {
      totalSales: 0,
      totalRevenue: 0,
      averageSale: 0,
      rating: 0,
      reviewCount: 0,
    };
    
    return profile;
  }
  
  // ==========================================================================
  // Business Profiles
  // ==========================================================================
  
  /**
   * Create a new business profile
   */
  createBusinessProfile(params: {
    legalName: string;
    tradeName?: string;
    businessType: BusinessType;
    description: string;
    email: string;
    phone: string;
    address: BaseProfile["address"];
    website?: string;
    ein?: string;
    incorporationState?: string;
    incorporationDate?: Date;
    primaryOwner: {
      profileId: string;
      name: string;
      ownershipPercentage: number;
      title?: string;
    };
    piUserId?: string;
    piUsername?: string;
  }): BusinessProfile {
    if (this.emailIndex.has(params.email.toLowerCase())) {
      throw new Error("Email already registered");
    }
    
    const id = `biz-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();
    
    const entityType = params.businessType === "nonprofit" ? "nonprofit" :
                       params.businessType === "government-entity" ? "government" :
                       params.businessType === "trust" || params.businessType === "estate" ? "trust" : "business";
    
    const profile: BusinessProfile = {
      id,
      entityType,
      businessType: params.businessType,
      status: "pending",
      verificationLevel: 0,
      
      // Business Info
      legalName: params.legalName,
      tradeName: params.tradeName,
      displayName: params.tradeName || params.legalName,
      description: params.description,
      website: params.website,
      
      // Contact
      email: params.email.toLowerCase(),
      phone: params.phone,
      address: params.address,
      
      // Registration
      ein: params.ein,
      incorporationState: params.incorporationState,
      incorporationDate: params.incorporationDate,
      
      // Owners
      owners: [{
        profileId: params.primaryOwner.profileId,
        name: params.primaryOwner.name,
        ownershipPercentage: params.primaryOwner.ownershipPercentage,
        role: "owner",
        title: params.primaryOwner.title,
        isPrimary: true,
      }],
      
      // Authorized Reps (primary owner is auto-authorized)
      authorizedReps: [{
        profileId: params.primaryOwner.profileId,
        name: params.primaryOwner.name,
        title: params.primaryOwner.title || "Owner",
        permissions: ["buy", "sell", "manage", "admin", "finance"],
        addedAt: now,
        isActive: true,
      }],
      
      // Licenses
      licenses: [],
      
      // Financial
      financialInfo: {
        acceptedPaymentMethods: ["pi", "card", "bank"],
      },
      
      // Departments
      departments: [
        { id: "general", name: "General", employeeCount: 0 },
      ],
      
      // Pi Network
      piUserId: params.piUserId,
      piUsername: params.piUsername,
      piKycVerified: false,
      
      // Security
      encryptionKey: this.generateEncryptionKey(),
      twoFactorEnabled: false,
      loginAttempts: 0,
      
      // Timestamps
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now,
      tags: [],
      metadata: {},
    };
    
    this.businesses.set(id, profile);
    this.emailIndex.set(params.email.toLowerCase(), id);
    this.phoneIndex.set(params.phone, id);
    if (params.piUserId) {
      this.piUserIndex.set(params.piUserId, id);
    }
    
    this.emit("profile-created", { type: "business", profile });
    return profile;
  }
  
  /**
   * Add owner to business
   */
  addBusinessOwner(businessId: string, owner: BusinessProfile["owners"][0]): BusinessProfile {
    const business = this.businesses.get(businessId);
    if (!business) throw new Error("Business not found");
    
    const totalOwnership = business.owners.reduce((sum, o) => sum + o.ownershipPercentage, 0);
    if (totalOwnership + owner.ownershipPercentage > 100) {
      throw new Error("Total ownership cannot exceed 100%");
    }
    
    business.owners.push(owner);
    business.updatedAt = new Date();
    
    this.emit("business-owner-added", { businessId, owner });
    return business;
  }
  
  /**
   * Add authorized representative
   */
  addAuthorizedRep(businessId: string, rep: Omit<BusinessProfile["authorizedReps"][0], "addedAt" | "isActive">): BusinessProfile {
    const business = this.businesses.get(businessId);
    if (!business) throw new Error("Business not found");
    
    business.authorizedReps.push({
      ...rep,
      addedAt: new Date(),
      isActive: true,
    });
    business.updatedAt = new Date();
    
    this.emit("authorized-rep-added", { businessId, rep });
    return business;
  }
  
  /**
   * Add employee to business
   */
  addEmployee(businessId: string, employeeProfileId: string, department: string, position: string): void {
    const business = this.businesses.get(businessId);
    if (!business) throw new Error("Business not found");
    
    const employee = this.individuals.get(employeeProfileId);
    if (!employee) throw new Error("Employee profile not found");
    
    // Update employee profile
    employee.entityType = "employee";
    employee.employment = {
      employerId: businessId,
      employerName: business.displayName,
      position,
      department,
      startDate: new Date(),
      isActive: true,
    };
    employee.updatedAt = new Date();
    
    // Update department count
    const dept = business.departments.find(d => d.name === department || d.id === department);
    if (dept) {
      dept.employeeCount++;
    }
    
    business.updatedAt = new Date();
    
    this.emit("employee-added", { businessId, employeeProfileId, department, position });
  }
  
  // ==========================================================================
  // Merchant Profiles
  // ==========================================================================
  
  /**
   * Create a merchant profile
   */
  createMerchantProfile(params: {
    merchantName: string;
    description: string;
    category: MerchantCategory;
    subcategories?: string[];
    email: string;
    phone: string;
    address: BaseProfile["address"];
    businessProfileId?: string;
    storeType: "online" | "physical" | "hybrid";
    storeUrl?: string;
    piUserId?: string;
    piUsername?: string;
    entityType?: "merchant" | "vendor" | "service-provider";
  }): MerchantProfile {
    if (this.emailIndex.has(params.email.toLowerCase()) && !params.businessProfileId) {
      throw new Error("Email already registered");
    }
    
    const id = `mer-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();
    
    const profile: MerchantProfile = {
      id,
      entityType: params.entityType || "merchant",
      businessProfileId: params.businessProfileId,
      status: "pending",
      verificationLevel: 0,
      
      // Merchant Info
      merchantName: params.merchantName,
      description: params.description,
      category: params.category,
      subcategories: params.subcategories || [],
      
      // Store
      store: {
        type: params.storeType,
        name: params.merchantName,
        url: params.storeUrl,
        physicalLocations: params.storeType !== "online" ? [{
          id: "primary",
          name: "Primary Location",
          address: params.address,
          phone: params.phone,
          isHeadquarters: true,
        }] : [],
      },
      
      // Catalog
      catalogStats: {
        totalProducts: 0,
        activeProducts: 0,
        categories: [],
        priceRange: { min: 0, max: 0 },
        averagePrice: 0,
      },
      
      // Selling
      sellingStats: {
        totalSales: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        conversionRate: 0,
        returnRate: 0,
      },
      
      // Ratings
      ratings: {
        overall: 0,
        quality: 0,
        service: 0,
        shipping: 0,
        value: 0,
        totalReviews: 0,
        responseRate: 0,
        responseTime: 0,
      },
      
      // Fulfillment
      fulfillment: {
        methods: ["self"],
        averageProcessingTime: 24,
        shippingProviders: [],
      },
      
      // Fees
      fees: {
        platformFeePercent: 3.14, // Pi-inspired fee
        transactionFeePercent: 0.5,
        payoutFrequency: "weekly",
        minimumPayout: 10,
        pendingBalance: 0,
        availableBalance: 0,
      },
      
      // Compliance
      compliance: {
        taxExempt: false,
        salesTaxPermits: [],
        licenses: [],
        insuranceVerified: false,
        backgroundCheckPassed: false,
      },
      
      // Features
      features: {
        acceptsPi: true,
        acceptsCards: true,
        acceptsCrypto: true,
        offersDelivery: params.storeType !== "online",
        offersPickup: params.storeType !== "online",
        offersInstallation: false,
        offersFinancing: false,
        acceptsReturns: true,
        offerWarranty: false,
      },
      
      // Contact
      email: params.email.toLowerCase(),
      phone: params.phone,
      address: params.address,
      
      // Pi Network
      piUserId: params.piUserId,
      piUsername: params.piUsername,
      piKycVerified: false,
      
      // Security
      encryptionKey: this.generateEncryptionKey(),
      twoFactorEnabled: false,
      loginAttempts: 0,
      
      // Timestamps
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now,
      tags: [],
      metadata: {},
    };
    
    this.merchants.set(id, profile);
    if (!params.businessProfileId) {
      this.emailIndex.set(params.email.toLowerCase(), id);
      this.phoneIndex.set(params.phone, id);
    }
    if (params.piUserId) {
      this.piUserIndex.set(params.piUserId, id);
    }
    
    this.emit("profile-created", { type: "merchant", profile });
    return profile;
  }
  
  /**
   * Create vendor profile (convenience wrapper)
   */
  createVendorProfile(params: Parameters<typeof this.createMerchantProfile>[0]): MerchantProfile {
    return this.createMerchantProfile({ ...params, entityType: "vendor" });
  }
  
  /**
   * Create service provider profile
   */
  createServiceProviderProfile(params: Parameters<typeof this.createMerchantProfile>[0]): MerchantProfile {
    return this.createMerchantProfile({ ...params, entityType: "service-provider" });
  }
  
  // ==========================================================================
  // Verification
  // ==========================================================================
  
  /**
   * Verify profile with Pi KYC
   */
  verifyWithPiKYC(profileId: string): boolean {
    const profile = this.getProfile(profileId);
    if (!profile) return false;
    
    profile.piKycVerified = true;
    profile.verificationLevel = Math.max(profile.verificationLevel, 1) as VerificationLevel;
    profile.status = "active";
    profile.verifiedAt = new Date();
    profile.updatedAt = new Date();
    
    this.emit("profile-verified", { profileId, level: profile.verificationLevel, method: "pi-kyc" });
    return true;
  }
  
  /**
   * Increase verification level
   */
  upgradeVerification(profileId: string, newLevel: VerificationLevel, reason: string): boolean {
    const profile = this.getProfile(profileId);
    if (!profile) return false;
    
    if (newLevel <= profile.verificationLevel) return false;
    
    profile.verificationLevel = newLevel;
    profile.status = "active";
    profile.updatedAt = new Date();
    profile.metadata.verificationHistory = [
      ...(profile.metadata.verificationHistory as Array<{level: number; date: Date; reason: string}> || []),
      { level: newLevel, date: new Date(), reason },
    ];
    
    this.emit("verification-upgraded", { profileId, newLevel, reason });
    return true;
  }
  
  // ==========================================================================
  // Ecosystem Integration
  // ==========================================================================
  
  /**
   * Link NESARA profile
   */
  linkNESARAProfile(profileId: string, nesaraProfileId: string): void {
    const profile = this.getProfile(profileId);
    if (!profile) throw new Error("Profile not found");
    
    profile.nesaraProfileId = nesaraProfileId;
    profile.updatedAt = new Date();
    
    this.emit("nesara-linked", { profileId, nesaraProfileId });
  }
  
  /**
   * Link QFS account
   */
  linkQFSAccount(profileId: string, qfsAccountId: string): void {
    const profile = this.getProfile(profileId);
    if (!profile) throw new Error("Profile not found");
    
    profile.qfsAccountId = qfsAccountId;
    profile.updatedAt = new Date();
    
    this.emit("qfs-linked", { profileId, qfsAccountId });
  }
  
  /**
   * Link citizen profile
   */
  linkCitizenProfile(profileId: string, citizenProfileId: string): void {
    const profile = this.getProfile(profileId);
    if (!profile) throw new Error("Profile not found");
    
    profile.citizenProfileId = citizenProfileId;
    profile.updatedAt = new Date();
    
    this.emit("citizen-linked", { profileId, citizenProfileId });
  }
  
  /**
   * Link allodial portfolio
   */
  linkAllodialPortfolio(profileId: string, portfolioId: string): void {
    const profile = this.getProfile(profileId);
    if (!profile) throw new Error("Profile not found");
    
    profile.allodialPortfolioId = portfolioId;
    profile.updatedAt = new Date();
    
    this.emit("allodial-linked", { profileId, portfolioId });
  }
  
  /**
   * Link Pi wallet
   */
  linkPiWallet(profileId: string, piUserId: string, piUsername: string, walletAddress?: string): void {
    const profile = this.getProfile(profileId);
    if (!profile) throw new Error("Profile not found");
    
    profile.piUserId = piUserId;
    profile.piUsername = piUsername;
    profile.piWalletAddress = walletAddress;
    profile.updatedAt = new Date();
    
    this.piUserIndex.set(piUserId, profileId);
    
    this.emit("pi-linked", { profileId, piUserId, piUsername });
  }
  
  // ==========================================================================
  // Queries
  // ==========================================================================
  
  /**
   * Get any profile by ID
   */
  getProfile(profileId: string): BaseProfile | null {
    return (
      this.individuals.get(profileId) ||
      this.businesses.get(profileId) ||
      this.merchants.get(profileId) ||
      null
    );
  }
  
  /**
   * Get individual profile
   */
  getIndividual(profileId: string): IndividualProfile | undefined {
    return this.individuals.get(profileId);
  }
  
  /**
   * Get business profile
   */
  getBusiness(profileId: string): BusinessProfile | undefined {
    return this.businesses.get(profileId);
  }
  
  /**
   * Get merchant profile
   */
  getMerchant(profileId: string): MerchantProfile | undefined {
    return this.merchants.get(profileId);
  }
  
  /**
   * Find profile by email
   */
  findByEmail(email: string): BaseProfile | null {
    const profileId = this.emailIndex.get(email.toLowerCase());
    return profileId ? this.getProfile(profileId) : null;
  }
  
  /**
   * Find profile by Pi user ID
   */
  findByPiUserId(piUserId: string): BaseProfile | null {
    const profileId = this.piUserIndex.get(piUserId);
    return profileId ? this.getProfile(profileId) : null;
  }
  
  /**
   * Find profile by phone
   */
  findByPhone(phone: string): BaseProfile | null {
    const profileId = this.phoneIndex.get(phone);
    return profileId ? this.getProfile(profileId) : null;
  }
  
  /**
   * Search merchants by category
   */
  searchMerchants(params: {
    category?: MerchantCategory;
    subcategory?: string;
    query?: string;
    status?: ProfileStatus;
    minRating?: number;
    acceptsPi?: boolean;
    limit?: number;
  }): MerchantProfile[] {
    let results = Array.from(this.merchants.values());
    
    if (params.category) {
      results = results.filter(m => m.category === params.category);
    }
    
    if (params.subcategory) {
      results = results.filter(m => m.subcategories.includes(params.subcategory!));
    }
    
    if (params.query) {
      const query = params.query.toLowerCase();
      results = results.filter(m => 
        m.merchantName.toLowerCase().includes(query) ||
        m.description.toLowerCase().includes(query)
      );
    }
    
    if (params.status) {
      results = results.filter(m => m.status === params.status);
    }
    
    if (params.minRating) {
      results = results.filter(m => m.ratings.overall >= params.minRating!);
    }
    
    if (params.acceptsPi !== undefined) {
      results = results.filter(m => m.features.acceptsPi === params.acceptsPi);
    }
    
    return results.slice(0, params.limit || 50);
  }
  
  /**
   * Get employees of a business
   */
  getBusinessEmployees(businessId: string): IndividualProfile[] {
    return Array.from(this.individuals.values())
      .filter(p => p.employment?.employerId === businessId && p.employment.isActive);
  }
  
  // ==========================================================================
  // Statistics
  // ==========================================================================
  
  /**
   * Get system statistics
   */
  getStatistics(): {
    individuals: {
      total: number;
      byType: Record<string, number>;
      verified: number;
      active: number;
    };
    businesses: {
      total: number;
      byType: Record<string, number>;
      verified: number;
      active: number;
    };
    merchants: {
      total: number;
      byCategory: Record<string, number>;
      verified: number;
      active: number;
      acceptingPi: number;
    };
  } {
    const individuals = Array.from(this.individuals.values());
    const businesses = Array.from(this.businesses.values());
    const merchants = Array.from(this.merchants.values());
    
    const countByKey = <T>(items: T[], key: keyof T) => {
      const counts: Record<string, number> = {};
      for (const item of items) {
        const value = String(item[key]);
        counts[value] = (counts[value] || 0) + 1;
      }
      return counts;
    };
    
    return {
      individuals: {
        total: individuals.length,
        byType: countByKey(individuals, "entityType"),
        verified: individuals.filter(p => p.verificationLevel > 0).length,
        active: individuals.filter(p => p.status === "active").length,
      },
      businesses: {
        total: businesses.length,
        byType: countByKey(businesses, "businessType"),
        verified: businesses.filter(p => p.verificationLevel > 0).length,
        active: businesses.filter(p => p.status === "active").length,
      },
      merchants: {
        total: merchants.length,
        byCategory: countByKey(merchants, "category"),
        verified: merchants.filter(p => p.verificationLevel > 0).length,
        active: merchants.filter(p => p.status === "active").length,
        acceptingPi: merchants.filter(p => p.features.acceptsPi).length,
      },
    };
  }
  
  // ==========================================================================
  // Security
  // ==========================================================================
  
  /**
   * Generate encryption key
   */
  private generateEncryptionKey(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let key = "";
    for (let i = 0; i < 64; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  }
  
  /**
   * Enable two-factor authentication
   */
  enableTwoFactor(profileId: string): { secret: string; qrCode: string } {
    const profile = this.getProfile(profileId);
    if (!profile) throw new Error("Profile not found");
    
    const secret = this.generateEncryptionKey().slice(0, 32);
    profile.twoFactorEnabled = true;
    profile.metadata.twoFactorSecret = secret;
    profile.updatedAt = new Date();
    
    // Generate simulated QR code URL
    const qrCode = `otpauth://totp/TriumphSynergy:${profileId}?secret=${secret}&issuer=TriumphSynergy`;
    
    this.emit("two-factor-enabled", { profileId });
    return { secret, qrCode };
  }
  
  /**
   * Record login attempt
   */
  recordLoginAttempt(profileId: string, success: boolean, ipAddress?: string): void {
    const profile = this.getProfile(profileId);
    if (!profile) return;
    
    if (success) {
      profile.loginAttempts = 0;
      profile.lastLogin = new Date();
      profile.lastActivityAt = new Date();
    } else {
      profile.loginAttempts++;
      
      // Lock account after 5 failed attempts
      if (profile.loginAttempts >= 5) {
        profile.status = "suspended";
        this.emit("account-locked", { profileId, reason: "Too many failed login attempts" });
      }
    }
    
    profile.updatedAt = new Date();
    profile.metadata.loginHistory = [
      ...(profile.metadata.loginHistory as Array<{date: Date; success: boolean; ip?: string}> || []).slice(-100),
      { date: new Date(), success, ip: ipAddress },
    ];
  }
  
  /**
   * Update profile status
   */
  updateStatus(profileId: string, status: ProfileStatus, reason?: string): void {
    const profile = this.getProfile(profileId);
    if (!profile) throw new Error("Profile not found");
    
    const previousStatus = profile.status;
    profile.status = status;
    profile.updatedAt = new Date();
    
    if (reason) {
      profile.metadata.statusHistory = [
        ...(profile.metadata.statusHistory as Array<{from: string; to: string; date: Date; reason: string}> || []),
        { from: previousStatus, to: status, date: new Date(), reason },
      ];
    }
    
    this.emit("status-changed", { profileId, previousStatus, newStatus: status, reason });
  }
}

// ============================================================================
// Exports
// ============================================================================

export const profileSystem = ProfileSystemManager.getInstance();

export { ProfileSystemManager };

// Type exports
export type AnyProfile = IndividualProfile | BusinessProfile | MerchantProfile;
