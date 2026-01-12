/**
 * Triumph Synergy - Phygital Grocerant Platform
 *
 * Physical + Digital grocery/restaurant hybrid locations with
 * Pi Network payment integration and delivery services
 *
 * @module lib/grocerant/phygital-grocerant-platform
 * @version 1.0.0
 */

// ============================================================================
// CONSTANTS
// ============================================================================

// Dual Pi Value System
// Internally mined/contributed Pi = 1000x multiplier
// External/non-contributed Pi = base rate
const PI_EXTERNAL_RATE = 314.159; // External non-contributed Pi
const PI_INTERNAL_RATE = 314_159; // Internally mined/contributed Pi (1000x)
const PI_INTERNAL_MULTIPLIER = 1000;

export type PiValueType = "internal" | "external";

export function getPiRate(type: PiValueType = "external"): number {
  return type === "internal" ? PI_INTERNAL_RATE : PI_EXTERNAL_RATE;
}

export function convertToPi(
  usdAmount: number,
  type: PiValueType = "external"
): number {
  return usdAmount / getPiRate(type);
}

export function convertToUsd(
  piAmount: number,
  type: PiValueType = "external"
): number {
  return piAmount * getPiRate(type);
}

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type GrocerantLocation = {
  id: string;
  name: string;
  code: string;
  type: LocationType;

  // Address
  address: GrocerantAddress;

  // Operations
  operatingHours: OperatingHours;
  status: LocationStatus;

  // Capabilities
  capabilities: LocationCapabilities;

  // Inventory
  departments: Department[];

  // Staff
  managerId: string;
  staffCount: number;

  // Performance
  metrics: LocationMetrics;

  // Pi Integration
  acceptsPi: boolean;
  piDiscountRate: number;

  // Timestamps
  openedAt: Date;
  lastInventoryUpdate: Date;
};

export type LocationType =
  | "flagship"
  | "neighborhood"
  | "express"
  | "ghost-kitchen"
  | "cloud-store"
  | "kiosk"
  | "food-truck";

export type LocationStatus =
  | "open"
  | "closed"
  | "limited-hours"
  | "temporarily-closed"
  | "coming-soon";

export type GrocerantAddress = {
  street: string;
  unit: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
};

export type OperatingHours = {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
  holidays: HolidayHours[];
};

export type DayHours = {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  breakStart: string | null;
  breakEnd: string | null;
};

export type HolidayHours = {
  date: string;
  name: string;
  isOpen: boolean;
  openTime: string | null;
  closeTime: string | null;
};

export type LocationCapabilities = {
  // Grocery
  groceryPickup: boolean;
  groceryDelivery: boolean;
  selfCheckout: boolean;
  scanAndGo: boolean;

  // Restaurant
  dineIn: boolean;
  takeout: boolean;
  driveThrough: boolean;
  curbsidePickup: boolean;

  // Kitchen
  hotFood: boolean;
  madeToOrder: boolean;
  bakery: boolean;
  deli: boolean;
  butcher: boolean;
  seafoodCounter: boolean;

  // Services
  pharmacy: boolean;
  banking: boolean;
  fuelStation: boolean;
  evCharging: boolean;

  // Digital
  mobileOrdering: boolean;
  arNavigation: boolean;
  smartCart: boolean;
  aiRecommendations: boolean;

  // Pi Network
  piPaymentTerminal: boolean;
  piLoyaltyRewards: boolean;
  piMiningStation: boolean;
};

export type Department = {
  id: string;
  name: string;
  code: string;
  type: DepartmentType;
  products: Product[];
  manager: string | null;
  isActive: boolean;
};

export type DepartmentType =
  | "produce"
  | "dairy"
  | "meat"
  | "seafood"
  | "bakery"
  | "deli"
  | "frozen"
  | "beverages"
  | "snacks"
  | "pantry"
  | "household"
  | "health-beauty"
  | "baby"
  | "pet"
  | "prepared-foods"
  | "restaurant"
  | "cafe"
  | "bar";

export type Product = {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  subcategory: string;

  // Pricing
  price: number;
  priceInPi: number;
  salePrice: number | null;
  salePriceInPi: number | null;
  unit: string;

  // Inventory
  inStock: boolean;
  quantity: number;
  lowStockThreshold: number;

  // Details
  brand: string;
  weight: number | null;
  weightUnit: string | null;
  dimensions: ProductDimensions | null;

  // Attributes
  isOrganic: boolean;
  isLocal: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  isDairyFree: boolean;
  isNonGMO: boolean;

  // Nutrition
  nutrition: NutritionInfo | null;

  // Media
  images: string[];

  // Restaurant-specific
  isMenuItem: boolean;
  prepTime: number | null;
  ingredients: string[];
  allergens: string[];

  // Digital
  digitalAsset: DigitalAsset | null;
};

export type ProductDimensions = {
  length: number;
  width: number;
  height: number;
  unit: string;
};

export type NutritionInfo = {
  servingSize: string;
  calories: number;
  fat: number;
  saturatedFat: number;
  transFat: number;
  cholesterol: number;
  sodium: number;
  carbohydrates: number;
  fiber: number;
  sugar: number;
  protein: number;
  vitaminA: number;
  vitaminC: number;
  calcium: number;
  iron: number;
};

export type DigitalAsset = {
  type: "recipe" | "nft" | "loyalty-reward" | "coupon";
  id: string;
  name: string;
  description: string;
  value: number;
  expiresAt: Date | null;
};

export type LocationMetrics = {
  dailyTransactions: number;
  averageBasketSize: number;
  piTransactionPercentage: number;
  customerSatisfaction: number;
  employeeSatisfaction: number;
  inventoryTurnover: number;
  wastePercentage: number;
  onlineOrderPercentage: number;
};

export type GrocerantOrder = {
  id: string;
  userId: string;
  locationId: string;

  // Order Type
  orderType: OrderType;
  channel: OrderChannel;

  // Items
  items: OrderItem[];

  // Pricing
  subtotal: number;
  tax: number;
  deliveryFee: number;
  serviceFee: number;
  discount: number;
  total: number;

  // Pi Payment
  paymentMethod: "pi" | "usd" | "hybrid";
  totalInPi: number;
  piDiscount: number;

  // Status
  status: OrderStatus;

  // Fulfillment
  fulfillment: OrderFulfillment;

  // Timestamps
  createdAt: Date;
  preparedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;

  // Loyalty
  pointsEarned: number;
  pointsRedeemed: number;
};

export type OrderType =
  | "grocery"
  | "restaurant"
  | "combo"
  | "catering"
  | "subscription";

export type OrderChannel =
  | "in-store"
  | "mobile-app"
  | "website"
  | "kiosk"
  | "voice"
  | "smart-cart";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "picked-up"
  | "out-for-delivery"
  | "delivered"
  | "completed"
  | "cancelled"
  | "refunded";

export type OrderItem = {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  price: number;
  priceInPi: number;
  total: number;

  // Customizations
  modifications: ItemModification[];
  specialInstructions: string | null;

  // Status
  status: "pending" | "preparing" | "ready" | "fulfilled";
};

export type ItemModification = {
  type: "add" | "remove" | "substitute";
  name: string;
  price: number;
};

export type OrderFulfillment = {
  type: "pickup" | "delivery" | "dine-in";

  // Pickup
  pickupLocation: string | null;
  pickupWindow: {
    start: Date;
    end: Date;
  } | null;

  // Delivery
  deliveryAddress: GrocerantAddress | null;
  deliveryWindow: {
    start: Date;
    end: Date;
  } | null;
  deliveryDriver: string | null;
  trackingUrl: string | null;

  // Dine-in
  tableNumber: string | null;
  partySize: number | null;
};

export type Customer = {
  id: string;
  piUid: string | null;

  // Profile
  firstName: string;
  lastName: string;
  email: string;
  phone: string;

  // Addresses
  addresses: GrocerantAddress[];
  defaultAddressIndex: number;

  // Preferences
  preferences: CustomerPreferences;

  // Loyalty
  loyaltyTier: LoyaltyTier;
  loyaltyPoints: number;
  piPoints: number;

  // History
  lifetimeSpend: number;
  lifetimeSpendPi: number;
  orderCount: number;
  averageOrderValue: number;

  // Favorites
  favoriteProducts: string[];
  favoriteLocations: string[];

  // Subscriptions
  subscriptions: Subscription[];

  // Timestamps
  createdAt: Date;
  lastOrderAt: Date | null;
};

export type CustomerPreferences = {
  dietary: string[];
  allergies: string[];
  preferredLanguage: string;
  preferredLocation: string | null;
  marketingOptIn: boolean;
  smsOptIn: boolean;
  pushOptIn: boolean;
};

export type LoyaltyTier = "bronze" | "silver" | "gold" | "platinum" | "diamond";

export type Subscription = {
  id: string;
  name: string;
  type: "meal-kit" | "grocery-box" | "snack-box" | "produce-box" | "meal-prep";
  frequency: "weekly" | "bi-weekly" | "monthly";
  products: string[];
  price: number;
  priceInPi: number;
  nextDelivery: Date;
  isActive: boolean;
};

export type Recipe = {
  id: string;
  name: string;
  description: string;
  cuisine: string;

  // Details
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: "easy" | "medium" | "hard";

  // Content
  ingredients: RecipeIngredient[];
  instructions: string[];
  tips: string[];

  // Media
  images: string[];
  video: string | null;

  // Nutrition
  nutrition: NutritionInfo;

  // Attributes
  isVegan: boolean;
  isVegetarian: boolean;
  isGlutenFree: boolean;
  isDairyFree: boolean;

  // Integration
  linkedProducts: string[];
  totalCost: number;
  totalCostInPi: number;

  // Engagement
  rating: number;
  reviews: number;
  saves: number;
};

export type RecipeIngredient = {
  name: string;
  quantity: number;
  unit: string;
  productId: string | null;
  isOptional: boolean;
};

export type SmartCart = {
  id: string;
  locationId: string;
  customerId: string | null;

  // Hardware
  batteryLevel: number;
  isCharging: boolean;

  // Session
  sessionStartedAt: Date | null;
  items: SmartCartItem[];

  // AI
  recommendations: Product[];
  navigationPath: NavigationStep[];

  // Status
  status: "available" | "in-use" | "charging" | "maintenance";
};

export type SmartCartItem = {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  scannedAt: Date;
};

export type NavigationStep = {
  department: string;
  aisle: string;
  instruction: string;
  distance: number;
};

// ============================================================================
// PHYGITAL GROCERANT PLATFORM CLASS
// ============================================================================

class PhygitalGrocerantPlatform {
  private readonly locations: Map<string, GrocerantLocation> = new Map();
  private readonly products: Map<string, Product> = new Map();
  private readonly orders: Map<string, GrocerantOrder> = new Map();
  private readonly customers: Map<string, Customer> = new Map();
  private readonly recipes: Map<string, Recipe> = new Map();
  private readonly smartCarts: Map<string, SmartCart> = new Map();

  constructor() {
    this.initializeLocations();
    this.initializeProducts();
    this.initializeRecipes();
  }

  private initializeLocations(): void {
    const locations: GrocerantLocation[] = [
      {
        id: "loc-flagship-1",
        name: "Triumph Grocerant - Downtown Flagship",
        code: "TG-DT01",
        type: "flagship",
        address: {
          street: "100 Pi Network Plaza",
          unit: null,
          city: "New York",
          state: "NY",
          postalCode: "10001",
          country: "United States",
          coordinates: { latitude: 40.7484, longitude: -73.9967 },
        },
        operatingHours: {
          monday: {
            isOpen: true,
            openTime: "6:00 AM",
            closeTime: "11:00 PM",
            breakStart: null,
            breakEnd: null,
          },
          tuesday: {
            isOpen: true,
            openTime: "6:00 AM",
            closeTime: "11:00 PM",
            breakStart: null,
            breakEnd: null,
          },
          wednesday: {
            isOpen: true,
            openTime: "6:00 AM",
            closeTime: "11:00 PM",
            breakStart: null,
            breakEnd: null,
          },
          thursday: {
            isOpen: true,
            openTime: "6:00 AM",
            closeTime: "11:00 PM",
            breakStart: null,
            breakEnd: null,
          },
          friday: {
            isOpen: true,
            openTime: "6:00 AM",
            closeTime: "12:00 AM",
            breakStart: null,
            breakEnd: null,
          },
          saturday: {
            isOpen: true,
            openTime: "7:00 AM",
            closeTime: "12:00 AM",
            breakStart: null,
            breakEnd: null,
          },
          sunday: {
            isOpen: true,
            openTime: "7:00 AM",
            closeTime: "10:00 PM",
            breakStart: null,
            breakEnd: null,
          },
          holidays: [],
        },
        status: "open",
        capabilities: {
          groceryPickup: true,
          groceryDelivery: true,
          selfCheckout: true,
          scanAndGo: true,
          dineIn: true,
          takeout: true,
          driveThrough: false,
          curbsidePickup: true,
          hotFood: true,
          madeToOrder: true,
          bakery: true,
          deli: true,
          butcher: true,
          seafoodCounter: true,
          pharmacy: true,
          banking: true,
          fuelStation: false,
          evCharging: true,
          mobileOrdering: true,
          arNavigation: true,
          smartCart: true,
          aiRecommendations: true,
          piPaymentTerminal: true,
          piLoyaltyRewards: true,
          piMiningStation: true,
        },
        departments: [
          {
            id: "dept-1",
            name: "Fresh Produce",
            code: "PROD",
            type: "produce",
            products: [],
            manager: null,
            isActive: true,
          },
          {
            id: "dept-2",
            name: "Artisan Bakery",
            code: "BAKE",
            type: "bakery",
            products: [],
            manager: null,
            isActive: true,
          },
          {
            id: "dept-3",
            name: "Gourmet Deli",
            code: "DELI",
            type: "deli",
            products: [],
            manager: null,
            isActive: true,
          },
          {
            id: "dept-4",
            name: "Prime Butcher",
            code: "MEAT",
            type: "meat",
            products: [],
            manager: null,
            isActive: true,
          },
          {
            id: "dept-5",
            name: "Fresh Seafood",
            code: "SEA",
            type: "seafood",
            products: [],
            manager: null,
            isActive: true,
          },
          {
            id: "dept-6",
            name: "Chef's Kitchen",
            code: "CHEF",
            type: "prepared-foods",
            products: [],
            manager: null,
            isActive: true,
          },
          {
            id: "dept-7",
            name: "Pi Café & Bar",
            code: "CAFE",
            type: "cafe",
            products: [],
            manager: null,
            isActive: true,
          },
        ],
        managerId: "manager-1",
        staffCount: 150,
        metrics: {
          dailyTransactions: 3500,
          averageBasketSize: 78.5,
          piTransactionPercentage: 35,
          customerSatisfaction: 4.7,
          employeeSatisfaction: 4.5,
          inventoryTurnover: 12.5,
          wastePercentage: 1.2,
          onlineOrderPercentage: 42,
        },
        acceptsPi: true,
        piDiscountRate: 0.05,
        openedAt: new Date("2024-01-15"),
        lastInventoryUpdate: new Date(),
      },
      {
        id: "loc-express-1",
        name: "Triumph Grocerant Express - Midtown",
        code: "TG-EX01",
        type: "express",
        address: {
          street: "500 5th Avenue",
          unit: "Ground Floor",
          city: "New York",
          state: "NY",
          postalCode: "10018",
          country: "United States",
          coordinates: { latitude: 40.7549, longitude: -73.984 },
        },
        operatingHours: {
          monday: {
            isOpen: true,
            openTime: "6:00 AM",
            closeTime: "9:00 PM",
            breakStart: null,
            breakEnd: null,
          },
          tuesday: {
            isOpen: true,
            openTime: "6:00 AM",
            closeTime: "9:00 PM",
            breakStart: null,
            breakEnd: null,
          },
          wednesday: {
            isOpen: true,
            openTime: "6:00 AM",
            closeTime: "9:00 PM",
            breakStart: null,
            breakEnd: null,
          },
          thursday: {
            isOpen: true,
            openTime: "6:00 AM",
            closeTime: "9:00 PM",
            breakStart: null,
            breakEnd: null,
          },
          friday: {
            isOpen: true,
            openTime: "6:00 AM",
            closeTime: "10:00 PM",
            breakStart: null,
            breakEnd: null,
          },
          saturday: {
            isOpen: true,
            openTime: "7:00 AM",
            closeTime: "10:00 PM",
            breakStart: null,
            breakEnd: null,
          },
          sunday: {
            isOpen: true,
            openTime: "8:00 AM",
            closeTime: "8:00 PM",
            breakStart: null,
            breakEnd: null,
          },
          holidays: [],
        },
        status: "open",
        capabilities: {
          groceryPickup: true,
          groceryDelivery: true,
          selfCheckout: true,
          scanAndGo: true,
          dineIn: false,
          takeout: true,
          driveThrough: false,
          curbsidePickup: false,
          hotFood: true,
          madeToOrder: true,
          bakery: false,
          deli: true,
          butcher: false,
          seafoodCounter: false,
          pharmacy: false,
          banking: false,
          fuelStation: false,
          evCharging: false,
          mobileOrdering: true,
          arNavigation: false,
          smartCart: false,
          aiRecommendations: true,
          piPaymentTerminal: true,
          piLoyaltyRewards: true,
          piMiningStation: false,
        },
        departments: [
          {
            id: "dept-e1",
            name: "Grab & Go",
            code: "GNG",
            type: "prepared-foods",
            products: [],
            manager: null,
            isActive: true,
          },
          {
            id: "dept-e2",
            name: "Fresh Express",
            code: "FREX",
            type: "produce",
            products: [],
            manager: null,
            isActive: true,
          },
          {
            id: "dept-e3",
            name: "Coffee Bar",
            code: "CAFE",
            type: "cafe",
            products: [],
            manager: null,
            isActive: true,
          },
        ],
        managerId: "manager-2",
        staffCount: 25,
        metrics: {
          dailyTransactions: 1200,
          averageBasketSize: 22.5,
          piTransactionPercentage: 45,
          customerSatisfaction: 4.5,
          employeeSatisfaction: 4.3,
          inventoryTurnover: 18.0,
          wastePercentage: 2.1,
          onlineOrderPercentage: 65,
        },
        acceptsPi: true,
        piDiscountRate: 0.05,
        openedAt: new Date("2024-06-01"),
        lastInventoryUpdate: new Date(),
      },
    ];

    locations.forEach((loc) => { this.locations.set(loc.id, loc); });
  }

  private initializeProducts(): void {
    const products: Product[] = [
      {
        id: "prod-1",
        sku: "TG-ORG-AVOCADO-001",
        name: "Organic Hass Avocados",
        description:
          "Premium organic Hass avocados, perfectly ripe and ready to eat",
        category: "Produce",
        subcategory: "Organic",
        price: 2.99,
        priceInPi: 2.99 / PI_EXTERNAL_RATE,
        salePrice: null,
        salePriceInPi: null,
        unit: "each",
        inStock: true,
        quantity: 250,
        lowStockThreshold: 50,
        brand: "Triumph Farms",
        weight: 0.5,
        weightUnit: "lb",
        dimensions: null,
        isOrganic: true,
        isLocal: false,
        isVegan: true,
        isGlutenFree: true,
        isDairyFree: true,
        isNonGMO: true,
        nutrition: {
          servingSize: "1/3 avocado (50g)",
          calories: 80,
          fat: 7,
          saturatedFat: 1,
          transFat: 0,
          cholesterol: 0,
          sodium: 0,
          carbohydrates: 4,
          fiber: 3,
          sugar: 0,
          protein: 1,
          vitaminA: 0,
          vitaminC: 4,
          calcium: 0,
          iron: 2,
        },
        images: ["/images/products/avocado.jpg"],
        isMenuItem: false,
        prepTime: null,
        ingredients: [],
        allergens: [],
        digitalAsset: null,
      },
      {
        id: "prod-2",
        sku: "TG-CHEF-BOWL-001",
        name: "Chef's Signature Poke Bowl",
        description:
          "Fresh ahi tuna, avocado, edamame, cucumber, and sesame over sushi rice",
        category: "Prepared Foods",
        subcategory: "Bowls",
        price: 16.99,
        priceInPi: 16.99 / PI_EXTERNAL_RATE,
        salePrice: null,
        salePriceInPi: null,
        unit: "bowl",
        inStock: true,
        quantity: 30,
        lowStockThreshold: 10,
        brand: "Chef's Kitchen",
        weight: 14,
        weightUnit: "oz",
        dimensions: null,
        isOrganic: false,
        isLocal: true,
        isVegan: false,
        isGlutenFree: false,
        isDairyFree: true,
        isNonGMO: false,
        nutrition: {
          servingSize: "1 bowl (396g)",
          calories: 520,
          fat: 18,
          saturatedFat: 3,
          transFat: 0,
          cholesterol: 45,
          sodium: 890,
          carbohydrates: 55,
          fiber: 6,
          sugar: 8,
          protein: 35,
          vitaminA: 15,
          vitaminC: 20,
          calcium: 8,
          iron: 15,
        },
        images: ["/images/products/poke-bowl.jpg"],
        isMenuItem: true,
        prepTime: 8,
        ingredients: [
          "ahi tuna",
          "sushi rice",
          "avocado",
          "edamame",
          "cucumber",
          "sesame seeds",
          "ponzu",
        ],
        allergens: ["fish", "soy", "sesame"],
        digitalAsset: {
          type: "recipe",
          id: "recipe-poke",
          name: "Make It At Home: Poke Bowl",
          description: "Learn to make our signature poke bowl at home",
          value: 0,
          expiresAt: null,
        },
      },
      {
        id: "prod-3",
        sku: "TG-CAFE-LATTE-001",
        name: "Pi Signature Latte",
        description:
          "Our house-roasted espresso with steamed milk and optional flavors",
        category: "Beverages",
        subcategory: "Coffee",
        price: 5.5,
        priceInPi: 5.5 / PI_EXTERNAL_RATE,
        salePrice: null,
        salePriceInPi: null,
        unit: "16oz",
        inStock: true,
        quantity: 999,
        lowStockThreshold: 0,
        brand: "Pi Café",
        weight: null,
        weightUnit: null,
        dimensions: null,
        isOrganic: true,
        isLocal: true,
        isVegan: false,
        isGlutenFree: true,
        isDairyFree: false,
        isNonGMO: true,
        nutrition: {
          servingSize: "16 oz",
          calories: 190,
          fat: 7,
          saturatedFat: 4.5,
          transFat: 0,
          cholesterol: 30,
          sodium: 170,
          carbohydrates: 19,
          fiber: 0,
          sugar: 18,
          protein: 12,
          vitaminA: 10,
          vitaminC: 0,
          calcium: 40,
          iron: 0,
        },
        images: ["/images/products/latte.jpg"],
        isMenuItem: true,
        prepTime: 3,
        ingredients: ["espresso", "milk"],
        allergens: ["milk"],
        digitalAsset: null,
      },
    ];

    products.forEach((prod) => { this.products.set(prod.id, prod); });
  }

  private initializeRecipes(): void {
    const recipes: Recipe[] = [
      {
        id: "recipe-1",
        name: "Avocado Toast with Poached Eggs",
        description:
          "Elevated avocado toast with perfectly poached eggs and everything bagel seasoning",
        cuisine: "American",
        prepTime: 10,
        cookTime: 5,
        servings: 2,
        difficulty: "easy",
        ingredients: [
          {
            name: "Sourdough bread",
            quantity: 2,
            unit: "slices",
            productId: null,
            isOptional: false,
          },
          {
            name: "Organic Hass Avocados",
            quantity: 1,
            unit: "whole",
            productId: "prod-1",
            isOptional: false,
          },
          {
            name: "Eggs",
            quantity: 2,
            unit: "large",
            productId: null,
            isOptional: false,
          },
          {
            name: "Everything bagel seasoning",
            quantity: 1,
            unit: "tbsp",
            productId: null,
            isOptional: false,
          },
          {
            name: "Red pepper flakes",
            quantity: 0.5,
            unit: "tsp",
            productId: null,
            isOptional: true,
          },
        ],
        instructions: [
          "Toast the sourdough bread until golden brown",
          "Bring a pot of water to a gentle simmer with a splash of vinegar",
          "Crack eggs into the water and poach for 3-4 minutes",
          "Mash avocado with salt and pepper",
          "Spread avocado on toast, top with poached egg",
          "Finish with everything seasoning and red pepper flakes",
        ],
        tips: ["Fresh eggs poach better", "Use a slotted spoon to drain eggs"],
        images: ["/images/recipes/avo-toast.jpg"],
        video: null,
        nutrition: {
          servingSize: "1 toast",
          calories: 310,
          fat: 18,
          saturatedFat: 4,
          transFat: 0,
          cholesterol: 186,
          sodium: 420,
          carbohydrates: 26,
          fiber: 7,
          sugar: 2,
          protein: 12,
          vitaminA: 6,
          vitaminC: 10,
          calcium: 4,
          iron: 10,
        },
        isVegan: false,
        isVegetarian: true,
        isGlutenFree: false,
        isDairyFree: true,
        linkedProducts: ["prod-1"],
        totalCost: 8.5,
        totalCostInPi: 8.5 / PI_EXTERNAL_RATE,
        rating: 4.8,
        reviews: 342,
        saves: 1250,
      },
    ];

    recipes.forEach((r) => { this.recipes.set(r.id, r); });
  }

  // ==========================================================================
  // LOCATION MANAGEMENT
  // ==========================================================================

  async getLocation(locationId: string): Promise<GrocerantLocation | null> {
    return this.locations.get(locationId) || null;
  }

  async getAllLocations(): Promise<GrocerantLocation[]> {
    return Array.from(this.locations.values());
  }

  async searchLocations(filters: {
    city?: string;
    type?: LocationType;
    capability?: keyof LocationCapabilities;
    acceptsPi?: boolean;
  }): Promise<GrocerantLocation[]> {
    return Array.from(this.locations.values()).filter((loc) => {
      if (
        filters.city &&
        !loc.address.city.toLowerCase().includes(filters.city.toLowerCase())
      ) {
        return false;
      }
      if (filters.type && loc.type !== filters.type) {
        return false;
      }
      if (filters.capability && !loc.capabilities[filters.capability]) {
        return false;
      }
      if (
        filters.acceptsPi !== undefined &&
        loc.acceptsPi !== filters.acceptsPi
      ) {
        return false;
      }
      return true;
    });
  }

  async getNearbyLocations(
    latitude: number,
    longitude: number,
    radiusMiles = 10
  ): Promise<{ location: GrocerantLocation; distance: number }[]> {
    const results = [];
    for (const location of this.locations.values()) {
      const distance = this.calculateDistance(
        latitude,
        longitude,
        location.address.coordinates.latitude,
        location.address.coordinates.longitude
      );
      if (distance <= radiusMiles) {
        results.push({ location, distance });
      }
    }
    return results.sort((a, b) => a.distance - b.distance);
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  // ==========================================================================
  // PRODUCT MANAGEMENT
  // ==========================================================================

  async getProduct(productId: string): Promise<Product | null> {
    return this.products.get(productId) || null;
  }

  async searchProducts(filters: {
    query?: string;
    category?: string;
    isOrganic?: boolean;
    isVegan?: boolean;
    isGlutenFree?: boolean;
    isMenuItem?: boolean;
    maxPrice?: number;
  }): Promise<Product[]> {
    return Array.from(this.products.values()).filter((prod) => {
      if (filters.query) {
        const q = filters.query.toLowerCase();
        if (
          !prod.name.toLowerCase().includes(q) &&
          !prod.description.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      if (filters.category && prod.category !== filters.category) {
        return false;
      }
      if (
        filters.isOrganic !== undefined &&
        prod.isOrganic !== filters.isOrganic
      ) {
        return false;
      }
      if (filters.isVegan !== undefined && prod.isVegan !== filters.isVegan) {
        return false;
      }
      if (
        filters.isGlutenFree !== undefined &&
        prod.isGlutenFree !== filters.isGlutenFree
      ) {
        return false;
      }
      if (
        filters.isMenuItem !== undefined &&
        prod.isMenuItem !== filters.isMenuItem
      ) {
        return false;
      }
      if (filters.maxPrice !== undefined && prod.price > filters.maxPrice) {
        return false;
      }
      return true;
    });
  }

  async getMenuItems(): Promise<Product[]> {
    return Array.from(this.products.values()).filter((p) => p.isMenuItem);
  }

  // ==========================================================================
  // ORDER MANAGEMENT
  // ==========================================================================

  async createOrder(orderData: {
    userId: string;
    locationId: string;
    orderType: OrderType;
    channel: OrderChannel;
    items: {
      productId: string;
      quantity: number;
      modifications?: ItemModification[];
      specialInstructions?: string;
    }[];
    fulfillment: Omit<OrderFulfillment, "deliveryDriver" | "trackingUrl">;
    paymentMethod: "pi" | "usd" | "hybrid";
    piAmount?: number;
  }): Promise<GrocerantOrder> {
    const id = `order-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const location = this.locations.get(orderData.locationId);
    if (!location) {
      throw new Error("Location not found");
    }

    // Build order items
    const orderItems: OrderItem[] = [];
    let subtotal = 0;

    for (const item of orderData.items) {
      const product = this.products.get(item.productId);
      if (!product) {
        continue;
      }

      const itemPrice = product.salePrice || product.price;
      const modPrice = (item.modifications || []).reduce(
        (sum, m) => sum + m.price,
        0
      );
      const itemTotal = (itemPrice + modPrice) * item.quantity;

      orderItems.push({
        id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        productId: item.productId,
        name: product.name,
        quantity: item.quantity,
        price: itemPrice,
        priceInPi: itemPrice / PI_EXTERNAL_RATE,
        total: itemTotal,
        modifications: item.modifications || [],
        specialInstructions: item.specialInstructions || null,
        status: "pending",
      });

      subtotal += itemTotal;
    }

    const tax = subtotal * 0.08;
    const deliveryFee = orderData.fulfillment.type === "delivery" ? 5.99 : 0;
    const serviceFee = subtotal * 0.02;
    const piDiscount =
      orderData.paymentMethod === "pi" ? location.piDiscountRate : 0;
    const discount = subtotal * piDiscount;
    const total = subtotal + tax + deliveryFee + serviceFee - discount;
    const totalInPi = total / PI_EXTERNAL_RATE;

    const order: GrocerantOrder = {
      id,
      userId: orderData.userId,
      locationId: orderData.locationId,
      orderType: orderData.orderType,
      channel: orderData.channel,
      items: orderItems,
      subtotal,
      tax,
      deliveryFee,
      serviceFee,
      discount,
      total,
      paymentMethod: orderData.paymentMethod,
      totalInPi,
      piDiscount,
      status: "pending",
      fulfillment: {
        ...orderData.fulfillment,
        deliveryDriver: null,
        trackingUrl: null,
      },
      createdAt: new Date(),
      preparedAt: null,
      completedAt: null,
      cancelledAt: null,
      pointsEarned: Math.floor(total),
      pointsRedeemed: 0,
    };

    this.orders.set(id, order);
    return order;
  }

  async getOrder(orderId: string): Promise<GrocerantOrder | null> {
    return this.orders.get(orderId) || null;
  }

  async getUserOrders(userId: string): Promise<GrocerantOrder[]> {
    return Array.from(this.orders.values())
      .filter((o) => o.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateOrderStatus(
    orderId: string,
    status: OrderStatus
  ): Promise<GrocerantOrder> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    order.status = status;

    if (status === "ready" || status === "picked-up") {
      order.preparedAt = new Date();
    }
    if (status === "completed" || status === "delivered") {
      order.completedAt = new Date();
    }
    if (status === "cancelled") {
      order.cancelledAt = new Date();
    }

    return order;
  }

  // ==========================================================================
  // CUSTOMER MANAGEMENT
  // ==========================================================================

  async createCustomer(customerData: {
    piUid?: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address?: GrocerantAddress;
  }): Promise<Customer> {
    const id = `cust-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const customer: Customer = {
      id,
      piUid: customerData.piUid || null,
      firstName: customerData.firstName,
      lastName: customerData.lastName,
      email: customerData.email,
      phone: customerData.phone,
      addresses: customerData.address ? [customerData.address] : [],
      defaultAddressIndex: 0,
      preferences: {
        dietary: [],
        allergies: [],
        preferredLanguage: "en",
        preferredLocation: null,
        marketingOptIn: true,
        smsOptIn: true,
        pushOptIn: true,
      },
      loyaltyTier: "bronze",
      loyaltyPoints: 0,
      piPoints: 0,
      lifetimeSpend: 0,
      lifetimeSpendPi: 0,
      orderCount: 0,
      averageOrderValue: 0,
      favoriteProducts: [],
      favoriteLocations: [],
      subscriptions: [],
      createdAt: new Date(),
      lastOrderAt: null,
    };

    this.customers.set(id, customer);
    return customer;
  }

  async getCustomer(customerId: string): Promise<Customer | null> {
    return this.customers.get(customerId) || null;
  }

  async updateLoyaltyPoints(
    customerId: string,
    points: number,
    isPi = false
  ): Promise<Customer> {
    const customer = this.customers.get(customerId);
    if (!customer) {
      throw new Error("Customer not found");
    }

    if (isPi) {
      customer.piPoints += points;
    }
    customer.loyaltyPoints += points;

    // Update tier
    if (customer.loyaltyPoints >= 10_000) {
      customer.loyaltyTier = "diamond";
    } else if (customer.loyaltyPoints >= 5000) {
      customer.loyaltyTier = "platinum";
    } else if (customer.loyaltyPoints >= 2500) {
      customer.loyaltyTier = "gold";
    } else if (customer.loyaltyPoints >= 1000) {
      customer.loyaltyTier = "silver";
    }

    return customer;
  }

  // ==========================================================================
  // RECIPES
  // ==========================================================================

  async getRecipe(recipeId: string): Promise<Recipe | null> {
    return this.recipes.get(recipeId) || null;
  }

  async searchRecipes(filters: {
    cuisine?: string;
    difficulty?: string;
    isVegan?: boolean;
    isGlutenFree?: boolean;
    maxPrepTime?: number;
  }): Promise<Recipe[]> {
    return Array.from(this.recipes.values()).filter((r) => {
      if (filters.cuisine && r.cuisine !== filters.cuisine) {
        return false;
      }
      if (filters.difficulty && r.difficulty !== filters.difficulty) {
        return false;
      }
      if (filters.isVegan !== undefined && r.isVegan !== filters.isVegan) {
        return false;
      }
      if (
        filters.isGlutenFree !== undefined &&
        r.isGlutenFree !== filters.isGlutenFree
      ) {
        return false;
      }
      if (
        filters.maxPrepTime !== undefined &&
        r.prepTime > filters.maxPrepTime
      ) {
        return false;
      }
      return true;
    });
  }

  // ==========================================================================
  // SMART CART
  // ==========================================================================

  async startSmartCartSession(
    locationId: string,
    customerId: string
  ): Promise<SmartCart> {
    const cartId = `cart-${Date.now()}`;
    const cart: SmartCart = {
      id: cartId,
      locationId,
      customerId,
      batteryLevel: 100,
      isCharging: false,
      sessionStartedAt: new Date(),
      items: [],
      recommendations: [],
      navigationPath: [],
      status: "in-use",
    };

    this.smartCarts.set(cartId, cart);
    return cart;
  }

  async scanItemToCart(cartId: string, productId: string): Promise<SmartCart> {
    const cart = this.smartCarts.get(cartId);
    if (!cart) {
      throw new Error("Smart cart not found");
    }

    const product = this.products.get(productId);
    if (!product) {
      throw new Error("Product not found");
    }

    // Check if item already in cart
    const existingItem = cart.items.find((i) => i.productId === productId);
    if (existingItem) {
      existingItem.quantity++;
    } else {
      cart.items.push({
        productId,
        name: product.name,
        quantity: 1,
        price: product.salePrice || product.price,
        scannedAt: new Date(),
      });
    }

    // Generate AI recommendations
    cart.recommendations = await this.getSmartRecommendations(
      cart.items.map((i) => i.productId)
    );

    return cart;
  }

  private async getSmartRecommendations(
    productIds: string[]
  ): Promise<Product[]> {
    // AI-powered recommendations based on cart contents
    return Array.from(this.products.values())
      .filter((p) => !productIds.includes(p.id))
      .slice(0, 3);
  }

  // ==========================================================================
  // UTILITIES - DUAL PI VALUE SYSTEM
  // ==========================================================================

  getPiToUsdRate(type: PiValueType = "external"): number {
    return getPiRate(type);
  }

  getInternalPiRate(): number {
    return PI_INTERNAL_RATE;
  }

  getExternalPiRate(): number {
    return PI_EXTERNAL_RATE;
  }

  convertPiToUsd(piAmount: number, type: PiValueType = "external"): number {
    return piAmount * getPiRate(type);
  }

  convertUsdToPi(usdAmount: number, type: PiValueType = "external"): number {
    return usdAmount / getPiRate(type);
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

export const phygitalGrocerantPlatform = new PhygitalGrocerantPlatform();

// Export helper functions
export async function getAllGrocerantLocations(): Promise<GrocerantLocation[]> {
  return phygitalGrocerantPlatform.getAllLocations();
}

export async function searchGrocerantProducts(
  filters: Parameters<typeof phygitalGrocerantPlatform.searchProducts>[0]
): Promise<Product[]> {
  return phygitalGrocerantPlatform.searchProducts(filters);
}

export async function createGrocerantOrder(
  data: Parameters<typeof phygitalGrocerantPlatform.createOrder>[0]
): Promise<GrocerantOrder> {
  return phygitalGrocerantPlatform.createOrder(data);
}

export async function getMenuItems(): Promise<Product[]> {
  return phygitalGrocerantPlatform.getMenuItems();
}
