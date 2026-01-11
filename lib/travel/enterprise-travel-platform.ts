/**
 * Triumph Synergy - Enterprise Travel Platform
 *
 * Superior enterprise travel platform connecting TSA, global airports,
 * cruise lines, air taxis, and more with Pi Network payment integration
 *
 * @module lib/travel/enterprise-travel-platform
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

export type TravelBooking = {
  id: string;
  userId: string;
  bookingType: BookingType;
  status: BookingStatus;

  // Travel Details
  travelers: Traveler[];
  itinerary: Itinerary;

  // Pricing
  pricing: TravelPricing;

  // Documents
  documents: TravelDocument[];

  // Loyalty
  loyaltyPointsEarned: number;
  loyaltyPointsRedeemed: number;

  // Timestamps
  createdAt: Date;
  confirmedAt: Date | null;
  cancelledAt: Date | null;

  // Metadata
  bookingReference: string;
  confirmationNumber: string | null;
  metadata: Record<string, unknown>;
};

export type BookingType =
  | "flight"
  | "hotel"
  | "car-rental"
  | "cruise"
  | "air-taxi"
  | "train"
  | "bus"
  | "vacation-package"
  | "experience";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "ticketed"
  | "checked-in"
  | "completed"
  | "cancelled"
  | "refunded";

export type Traveler = {
  id: string;
  type: "adult" | "child" | "infant";

  // Personal Info
  firstName: string;
  middleName: string | null;
  lastName: string;
  dateOfBirth: Date;
  gender: "male" | "female" | "other";
  nationality: string;

  // Documents
  passportNumber: string | null;
  passportExpiry: Date | null;
  passportCountry: string | null;

  // TSA Info
  tsaPreCheck: boolean;
  tsaKnownTravelerNumber: string | null;
  globalEntry: boolean;
  globalEntryNumber: string | null;
  clearMe: boolean;

  // Contact
  email: string;
  phone: string;

  // Preferences
  seatPreference: "window" | "aisle" | "middle" | "no-preference";
  mealPreference: string | null;
  specialAssistance: string[];
  frequentFlyerNumbers: FrequentFlyer[];
};

export type FrequentFlyer = {
  airline: string;
  airlineCode: string;
  memberNumber: string;
  tier: string;
};

export type Itinerary = {
  id: string;
  segments: TravelSegment[];
  origin: Location;
  destination: Location;
  departureDate: Date;
  returnDate: Date | null;
  tripType: "one-way" | "round-trip" | "multi-city";
};

export type TravelSegment = {
  id: string;
  segmentType: BookingType;

  // Carrier Info
  carrier: Carrier;

  // Route
  departure: SegmentPoint;
  arrival: SegmentPoint;

  // Details
  classOfService: string;
  cabinClass: "economy" | "premium-economy" | "business" | "first";

  // Status
  status: "scheduled" | "delayed" | "cancelled" | "completed";

  // Extras
  baggageAllowance: BaggageAllowance;
  amenities: string[];
};

export type Carrier = {
  code: string;
  name: string;
  type: "airline" | "cruise-line" | "air-taxi" | "train" | "bus" | "car-rental";
  logo: string | null;
  alliance: string | null;
};

export type SegmentPoint = {
  location: Location;
  dateTime: Date;
  terminal: string | null;
  gate: string | null;
};

export type Location = {
  code: string;
  name: string;
  type: "airport" | "port" | "station" | "helipad" | "vertiport" | "address";
  city: string;
  country: string;
  countryCode: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  timezone: string;
};

export type BaggageAllowance = {
  carryOn: number;
  carryOnWeight: number;
  checkedBags: number;
  checkedBagWeight: number;
  personalItem: boolean;
};

export type TravelPricing = {
  currency: string;
  baseFare: number;
  taxes: number;
  fees: number;
  total: number;

  // Pi Network
  totalInPi: number;
  piDiscount: number;

  // Breakdown
  fareBreakdown: FareBreakdown[];

  // Payment
  paymentStatus: "unpaid" | "partial" | "paid" | "refunded";
  paymentMethod: "pi" | "usd" | "hybrid";
  piAmount: number;
  usdAmount: number;
};

export type FareBreakdown = {
  travelerType: "adult" | "child" | "infant";
  quantity: number;
  baseFare: number;
  taxes: number;
  fees: number;
  total: number;
};

export type TravelDocument = {
  id: string;
  type:
    | "e-ticket"
    | "boarding-pass"
    | "hotel-voucher"
    | "cruise-ticket"
    | "car-voucher"
    | "invoice"
    | "receipt";
  url: string;
  format: "pdf" | "pkpass" | "image";
  createdAt: Date;
};

export type Airport = {
  code: string;
  iata: string;
  icao: string;
  name: string;
  city: string;
  country: string;
  countryCode: string;

  // Location
  coordinates: {
    latitude: number;
    longitude: number;
  };

  // Details
  terminals: Terminal[];
  timezone: string;
  type: "international" | "domestic" | "regional";

  // TSA
  tsaWaitTimes: TSAWaitTime[];
  tsaPreCheckAvailable: boolean;
  clearMeAvailable: boolean;

  // Services
  lounges: AirportLounge[];
  services: string[];

  // Airlines
  airlinesServed: string[];
};

export type Terminal = {
  name: string;
  code: string;
  gates: string[];
  airlines: string[];
  amenities: string[];
};

export type TSAWaitTime = {
  checkpoint: string;
  terminal: string;
  standard: number; // minutes
  preCheck: number; // minutes
  clear: number; // minutes
  lastUpdated: Date;
};

export type AirportLounge = {
  name: string;
  terminal: string;
  operator: string;
  accessTypes: (
    | "membership"
    | "day-pass"
    | "class-of-service"
    | "credit-card"
  )[];
  amenities: string[];
  hours: string;
  dayPassPrice: number;
};

export type CruiseLine = {
  id: string;
  name: string;
  code: string;
  logo: string;

  // Fleet
  ships: CruiseShip[];

  // Destinations
  destinations: string[];
  homeports: string[];

  // Loyalty
  loyaltyProgram: string;

  // Pi Integration
  acceptsPi: boolean;
  piDiscount: number;
};

export type CruiseShip = {
  id: string;
  name: string;
  cruiseLineId: string;

  // Specs
  passengerCapacity: number;
  crew: number;
  grossTonnage: number;
  yearBuilt: number;
  yearRefurbished: number | null;

  // Amenities
  decks: number;
  restaurants: number;
  pools: number;
  amenities: string[];

  // Cabins
  cabinCategories: CabinCategory[];
};

export type CabinCategory = {
  code: string;
  name: string;
  type: "inside" | "oceanview" | "balcony" | "suite";
  squareFeet: number;
  maxOccupancy: number;
  amenities: string[];
};

export type CruiseItinerary = {
  id: string;
  cruiseLineId: string;
  shipId: string;

  // Route
  name: string;
  duration: number; // nights
  departurePort: string;
  arrivalPort: string;
  ports: CruisePort[];

  // Dates
  sailDates: Date[];

  // Pricing
  startingPrice: number;
  startingPriceInPi: number;
};

export type CruisePort = {
  port: Location;
  arrivalTime: string | null;
  departureTime: string | null;
  dayNumber: number;
  isSeaDay: boolean;
};

export type AirTaxiOperator = {
  id: string;
  name: string;
  code: string;
  type: "helicopter" | "evtol" | "seaplane" | "private-jet";

  // Fleet
  aircraft: Aircraft[];

  // Service Area
  serviceAreas: string[];
  vertiports: Vertiport[];

  // Pi Integration
  acceptsPi: boolean;
  piDiscount: number;

  // Booking
  minimumNotice: number; // hours
  cancellationPolicy: string;
};

export type Aircraft = {
  id: string;
  type: string;
  model: string;
  capacity: number;
  range: number; // miles
  cruiseSpeed: number; // mph
  amenities: string[];
};

export type Vertiport = {
  id: string;
  name: string;
  code: string;
  location: Location;
  type: "helipad" | "vertiport" | "airport" | "marina";
  operatingHours: string;
  services: string[];
};

export type LoyaltyProgram = {
  id: string;
  userId: string;
  programName: string;
  memberNumber: string;
  tier: string;
  pointsBalance: number;
  milesBalance: number;

  // Status
  qualifyingMiles: number;
  qualifyingSegments: number;
  qualifyingSpend: number;

  // Benefits
  benefits: string[];

  // Pi Integration
  piPointsEarned: number;
  piMilesEarned: number;
};

// ============================================================================
// TRAVEL AGENT HUB - SUBSCRIPTION & PARTNERSHIP SYSTEM
// ============================================================================

export type AgentSubscriptionTier =
  | "starter"
  | "professional"
  | "enterprise"
  | "elite";
export type AgentStatus = "pending" | "active" | "suspended" | "expired";
export type AgentSpecialty =
  | "leisure"
  | "corporate"
  | "luxury"
  | "adventure"
  | "cruise"
  | "honeymoon"
  | "family"
  | "group"
  | "sports"
  | "wellness"
  | "eco-tourism"
  | "cultural";

export type TravelAgent = {
  id: string;
  userId: string;

  // Profile
  agencyName: string;
  agentName: string;
  email: string;
  phone: string;
  website: string | null;

  // Credentials
  iataNumber: string | null;
  arcNumber: string | null;
  cliaNumber: string | null;
  hostAgencyId: string | null;

  // Location
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };

  // Subscription
  subscriptionTier: AgentSubscriptionTier;
  subscriptionStatus: AgentStatus;
  subscriptionStartDate: Date;
  subscriptionEndDate: Date;
  monthlyFee: number;
  monthlyFeeInPi: number;

  // Commission Structure
  commissionRate: number;
  piCommissionBonus: number;
  overrideCommission: number;

  // Performance
  totalBookings: number;
  totalRevenue: number;
  totalCommissionEarned: number;
  totalPiEarned: number;
  averageBookingValue: number;
  clientSatisfactionScore: number;

  // Clients
  clients: AgentClient[];
  totalClients: number;
  activeClients: number;

  // Specialties
  specialties: AgentSpecialty[];
  certifications: AgentCertification[];
  preferredSuppliers: string[];

  // Tools Access
  accessLevel: string[];
  apiAccess: boolean;
  whitelabelEnabled: boolean;

  // Timestamps
  createdAt: Date;
  lastActiveAt: Date;
  verifiedAt: Date | null;
};

export type AgentClient = {
  id: string;
  agentId: string;

  // Client Info
  firstName: string;
  lastName: string;
  email: string;
  phone: string;

  // Preferences
  preferredAirlines: string[];
  preferredHotels: string[];
  seatPreference: string;
  mealPreference: string;

  // Loyalty
  loyaltyNumbers: Record<string, string>;

  // History
  totalBookings: number;
  totalSpend: number;
  lastBookingDate: Date | null;

  // Documents
  passportExpiry: Date | null;
  tsaPreCheckNumber: string | null;
  globalEntryNumber: string | null;

  createdAt: Date;
};

export type AgentCertification = {
  name: string;
  issuer: string;
  issuedAt: Date;
  expiresAt: Date | null;
  certificateNumber: string;
};

export type AgentSubscriptionPlan = {
  tier: AgentSubscriptionTier;
  name: string;
  monthlyPrice: number;
  monthlyPriceInPi: number;
  annualPrice: number;
  annualPriceInPi: number;
  commissionRate: number;
  piBonus: number;
  features: string[];
  maxClients: number | "unlimited";
  apiAccess: boolean;
  whitelabelAccess: boolean;
  supportLevel: "email" | "priority" | "dedicated" | "24/7";
};

// ============================================================================
// ENTERPRISE TRAVEL PLATFORM CLASS
// ============================================================================

class EnterpriseTravelPlatform {
  private readonly bookings: Map<string, TravelBooking> = new Map();
  private readonly agents: Map<string, TravelAgent> = new Map();
  private readonly agentClients: Map<string, AgentClient> = new Map();
  private readonly airports: Map<string, Airport> = new Map();
  private readonly cruiseLines: Map<string, CruiseLine> = new Map();
  private readonly airTaxiOperators: Map<string, AirTaxiOperator> = new Map();
  private readonly loyaltyPrograms: Map<string, LoyaltyProgram> = new Map();

  constructor() {
    this.initializeData();
  }

  private initializeData(): void {
    // Initialize major airports
    this.initializeAirports();

    // Initialize cruise lines
    this.initializeCruiseLines();

    // Initialize air taxi operators
    this.initializeAirTaxiOperators();
  }

  private initializeAirports(): void {
    const airports: Airport[] = [
      {
        code: "JFK",
        iata: "JFK",
        icao: "KJFK",
        name: "John F. Kennedy International Airport",
        city: "New York",
        country: "United States",
        countryCode: "US",
        coordinates: { latitude: 40.6413, longitude: -73.7781 },
        terminals: [
          {
            name: "Terminal 1",
            code: "T1",
            gates: ["1-12"],
            airlines: ["Lufthansa", "Korean Air"],
            amenities: ["lounges", "shops", "restaurants"],
          },
          {
            name: "Terminal 4",
            code: "T4",
            gates: ["A1-A12", "B20-B47"],
            airlines: ["Delta", "Emirates"],
            amenities: ["lounges", "shops", "restaurants", "spa"],
          },
          {
            name: "Terminal 5",
            code: "T5",
            gates: ["1-31"],
            airlines: ["JetBlue"],
            amenities: ["shops", "restaurants"],
          },
          {
            name: "Terminal 7",
            code: "T7",
            gates: ["1-12"],
            airlines: ["British Airways"],
            amenities: ["lounges", "shops"],
          },
          {
            name: "Terminal 8",
            code: "T8",
            gates: ["1-50"],
            airlines: ["American Airlines"],
            amenities: ["lounges", "shops", "restaurants"],
          },
        ],
        timezone: "America/New_York",
        type: "international",
        tsaWaitTimes: [
          {
            checkpoint: "Main",
            terminal: "T4",
            standard: 25,
            preCheck: 8,
            clear: 5,
            lastUpdated: new Date(),
          },
        ],
        tsaPreCheckAvailable: true,
        clearMeAvailable: true,
        lounges: [
          {
            name: "Delta Sky Club",
            terminal: "T4",
            operator: "Delta",
            accessTypes: ["membership", "class-of-service"],
            amenities: ["food", "drinks", "wifi", "showers"],
            hours: "5:00 AM - 11:00 PM",
            dayPassPrice: 59,
          },
        ],
        services: [
          "wifi",
          "currency-exchange",
          "medical",
          "lost-and-found",
          "pet-relief",
        ],
        airlinesServed: [
          "Delta",
          "American",
          "JetBlue",
          "United",
          "Emirates",
          "British Airways",
        ],
      },
      {
        code: "LAX",
        iata: "LAX",
        icao: "KLAX",
        name: "Los Angeles International Airport",
        city: "Los Angeles",
        country: "United States",
        countryCode: "US",
        coordinates: { latitude: 33.9425, longitude: -118.4081 },
        terminals: [
          {
            name: "Tom Bradley International",
            code: "TBIT",
            gates: ["130-159"],
            airlines: ["International"],
            amenities: ["lounges", "shops", "restaurants"],
          },
        ],
        timezone: "America/Los_Angeles",
        type: "international",
        tsaWaitTimes: [],
        tsaPreCheckAvailable: true,
        clearMeAvailable: true,
        lounges: [],
        services: ["wifi", "currency-exchange"],
        airlinesServed: ["Delta", "American", "United", "Southwest"],
      },
    ];

    airports.forEach((airport) => this.airports.set(airport.code, airport));
  }

  private initializeCruiseLines(): void {
    const cruiseLines: CruiseLine[] = [
      {
        id: "rcl",
        name: "Royal Caribbean International",
        code: "RCL",
        logo: "/images/cruise/royal-caribbean.png",
        ships: [
          {
            id: "wonder",
            name: "Wonder of the Seas",
            cruiseLineId: "rcl",
            passengerCapacity: 6988,
            crew: 2300,
            grossTonnage: 236_857,
            yearBuilt: 2022,
            yearRefurbished: null,
            decks: 18,
            restaurants: 20,
            pools: 4,
            amenities: [
              "waterpark",
              "broadway-shows",
              "casino",
              "spa",
              "rock-climbing",
            ],
            cabinCategories: [
              {
                code: "IS",
                name: "Interior",
                type: "inside",
                squareFeet: 150,
                maxOccupancy: 4,
                amenities: ["tv", "safe", "bathroom"],
              },
              {
                code: "OS",
                name: "Ocean View",
                type: "oceanview",
                squareFeet: 180,
                maxOccupancy: 4,
                amenities: ["tv", "safe", "bathroom", "window"],
              },
              {
                code: "BC",
                name: "Balcony",
                type: "balcony",
                squareFeet: 200,
                maxOccupancy: 4,
                amenities: ["tv", "safe", "bathroom", "balcony"],
              },
              {
                code: "SU",
                name: "Suite",
                type: "suite",
                squareFeet: 350,
                maxOccupancy: 6,
                amenities: [
                  "tv",
                  "safe",
                  "bathroom",
                  "balcony",
                  "concierge",
                  "priority-boarding",
                ],
              },
            ],
          },
        ],
        destinations: ["Caribbean", "Mediterranean", "Alaska", "Bahamas"],
        homeports: ["Miami", "Fort Lauderdale", "Barcelona", "Southampton"],
        loyaltyProgram: "Crown & Anchor Society",
        acceptsPi: true,
        piDiscount: 0.05,
      },
      {
        id: "ccl",
        name: "Carnival Cruise Line",
        code: "CCL",
        logo: "/images/cruise/carnival.png",
        ships: [
          {
            id: "celebration",
            name: "Carnival Celebration",
            cruiseLineId: "ccl",
            passengerCapacity: 5374,
            crew: 1735,
            grossTonnage: 183_521,
            yearBuilt: 2022,
            yearRefurbished: null,
            decks: 17,
            restaurants: 15,
            pools: 3,
            amenities: [
              "waterslides",
              "casino",
              "spa",
              "comedy-club",
              "roller-coaster",
            ],
            cabinCategories: [
              {
                code: "IS",
                name: "Interior",
                type: "inside",
                squareFeet: 145,
                maxOccupancy: 4,
                amenities: ["tv", "safe", "bathroom"],
              },
              {
                code: "BC",
                name: "Balcony",
                type: "balcony",
                squareFeet: 185,
                maxOccupancy: 4,
                amenities: ["tv", "safe", "bathroom", "balcony"],
              },
            ],
          },
        ],
        destinations: ["Caribbean", "Mexico", "Bahamas", "Alaska"],
        homeports: ["Miami", "Galveston", "Long Beach", "New Orleans"],
        loyaltyProgram: "VIFP Club",
        acceptsPi: true,
        piDiscount: 0.05,
      },
    ];

    cruiseLines.forEach((line) => this.cruiseLines.set(line.id, line));
  }

  private initializeAirTaxiOperators(): void {
    const operators: AirTaxiOperator[] = [
      {
        id: "blade",
        name: "BLADE Urban Air Mobility",
        code: "BLADE",
        type: "helicopter",
        aircraft: [
          {
            id: "bell429",
            type: "helicopter",
            model: "Bell 429",
            capacity: 6,
            range: 411,
            cruiseSpeed: 161,
            amenities: ["leather-seats", "noise-cancelling"],
          },
          {
            id: "airbus135",
            type: "helicopter",
            model: "Airbus H135",
            capacity: 5,
            range: 380,
            cruiseSpeed: 155,
            amenities: ["leather-seats", "panoramic-windows"],
          },
        ],
        serviceAreas: ["New York", "Los Angeles", "Miami", "Hamptons"],
        vertiports: [
          {
            id: "jfk-blade",
            name: "BLADE Lounge JFK",
            code: "JFK-BL",
            location: {
              code: "JFK",
              name: "JFK Airport",
              type: "airport",
              city: "New York",
              country: "United States",
              countryCode: "US",
              coordinates: { latitude: 40.6413, longitude: -73.7781 },
              timezone: "America/New_York",
            },
            type: "helipad",
            operatingHours: "6AM-10PM",
            services: ["lounge", "valet", "refreshments"],
          },
          {
            id: "manhattan-west30",
            name: "West 30th Street Heliport",
            code: "W30",
            location: {
              code: "W30",
              name: "West 30th St Heliport",
              type: "helipad",
              city: "New York",
              country: "United States",
              countryCode: "US",
              coordinates: { latitude: 40.7549, longitude: -74.0074 },
              timezone: "America/New_York",
            },
            type: "helipad",
            operatingHours: "7AM-7PM",
            services: ["lounge"],
          },
        ],
        acceptsPi: true,
        piDiscount: 0.1,
        minimumNotice: 2,
        cancellationPolicy:
          "Full refund if cancelled 24 hours before departure",
      },
      {
        id: "joby",
        name: "Joby Aviation",
        code: "JOBY",
        type: "evtol",
        aircraft: [
          {
            id: "joby-s4",
            type: "evtol",
            model: "Joby S4",
            capacity: 4,
            range: 150,
            cruiseSpeed: 200,
            amenities: ["quiet-flight", "panoramic-views", "climate-control"],
          },
        ],
        serviceAreas: ["Los Angeles", "San Francisco", "New York"],
        vertiports: [
          {
            id: "lax-joby",
            name: "LAX Vertiport",
            code: "LAX-V",
            location: {
              code: "LAX",
              name: "LAX Vertiport",
              type: "vertiport",
              city: "Los Angeles",
              country: "United States",
              countryCode: "US",
              coordinates: { latitude: 33.9425, longitude: -118.4081 },
              timezone: "America/Los_Angeles",
            },
            type: "vertiport",
            operatingHours: "6AM-10PM",
            services: ["lounge", "charging"],
          },
        ],
        acceptsPi: true,
        piDiscount: 0.15,
        minimumNotice: 1,
        cancellationPolicy:
          "Full refund if cancelled 12 hours before departure",
      },
    ];

    operators.forEach((op) => this.airTaxiOperators.set(op.id, op));
  }

  // ==========================================================================
  // BOOKING MANAGEMENT
  // ==========================================================================

  async createBooking(bookingData: {
    userId: string;
    bookingType: BookingType;
    travelers: Traveler[];
    itinerary: Itinerary;
    paymentMethod: "pi" | "usd" | "hybrid";
    piAmount?: number;
    usdAmount?: number;
  }): Promise<TravelBooking> {
    const id = `booking-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const bookingReference = `TST${Date.now().toString().slice(-8)}`;

    // Calculate pricing
    const baseFare = this.calculateBaseFare(
      bookingData.itinerary,
      bookingData.travelers.length
    );
    const taxes = baseFare * 0.12;
    const fees = baseFare * 0.05;
    const total = baseFare + taxes + fees;

    const piDiscount = bookingData.paymentMethod === "pi" ? 0.05 : 0;
    const totalAfterDiscount = total * (1 - piDiscount);
    const totalInPi = totalAfterDiscount / PI_EXTERNAL_RATE;

    const pricing: TravelPricing = {
      currency: "USD",
      baseFare,
      taxes,
      fees,
      total: totalAfterDiscount,
      totalInPi,
      piDiscount,
      fareBreakdown: bookingData.travelers.map((t) => ({
        travelerType: t.type,
        quantity: 1,
        baseFare: baseFare / bookingData.travelers.length,
        taxes: taxes / bookingData.travelers.length,
        fees: fees / bookingData.travelers.length,
        total: totalAfterDiscount / bookingData.travelers.length,
      })),
      paymentStatus: "unpaid",
      paymentMethod: bookingData.paymentMethod,
      piAmount:
        bookingData.piAmount ||
        (bookingData.paymentMethod === "pi" ? totalInPi : 0),
      usdAmount:
        bookingData.usdAmount ||
        (bookingData.paymentMethod === "usd" ? totalAfterDiscount : 0),
    };

    const booking: TravelBooking = {
      id,
      userId: bookingData.userId,
      bookingType: bookingData.bookingType,
      status: "pending",
      travelers: bookingData.travelers,
      itinerary: bookingData.itinerary,
      pricing,
      documents: [],
      loyaltyPointsEarned: Math.floor(total / 10),
      loyaltyPointsRedeemed: 0,
      createdAt: new Date(),
      confirmedAt: null,
      cancelledAt: null,
      bookingReference,
      confirmationNumber: null,
      metadata: {},
    };

    this.bookings.set(id, booking);
    return booking;
  }

  private calculateBaseFare(
    itinerary: Itinerary,
    travelerCount: number
  ): number {
    // Base calculation
    let baseFare = 250; // Base per segment

    // Multiply by segments
    baseFare *= itinerary.segments.length;

    // Multiply by travelers
    baseFare *= travelerCount;

    // Adjust for trip type
    if (itinerary.tripType === "round-trip") {
      baseFare *= 1.8; // Slight discount for round trip
    } else if (itinerary.tripType === "multi-city") {
      baseFare *= 1.2; // Premium for complexity
    }

    return baseFare;
  }

  async confirmBooking(bookingId: string): Promise<TravelBooking> {
    const booking = this.bookings.get(bookingId);
    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.pricing.paymentStatus !== "paid") {
      throw new Error("Payment required before confirmation");
    }

    booking.status = "confirmed";
    booking.confirmedAt = new Date();
    booking.confirmationNumber = `CNF${Date.now().toString().slice(-10)}`;

    // Generate documents
    booking.documents.push({
      id: `doc-${Date.now()}`,
      type: "e-ticket",
      url: `/api/travel/documents/${booking.id}/e-ticket.pdf`,
      format: "pdf",
      createdAt: new Date(),
    });

    return booking;
  }

  async cancelBooking(
    bookingId: string,
    reason?: string
  ): Promise<TravelBooking> {
    const booking = this.bookings.get(bookingId);
    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.status === "completed") {
      throw new Error("Cannot cancel completed booking");
    }

    booking.status = "cancelled";
    booking.cancelledAt = new Date();
    booking.metadata.cancellationReason = reason;

    // Process refund
    if (booking.pricing.paymentStatus === "paid") {
      booking.pricing.paymentStatus = "refunded";
    }

    return booking;
  }

  async getBooking(bookingId: string): Promise<TravelBooking | null> {
    return this.bookings.get(bookingId) || null;
  }

  async getUserBookings(userId: string): Promise<TravelBooking[]> {
    return Array.from(this.bookings.values())
      .filter((b) => b.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // ==========================================================================
  // AIRPORT SERVICES
  // ==========================================================================

  async getAirport(code: string): Promise<Airport | null> {
    return this.airports.get(code) || null;
  }

  async searchAirports(query: string): Promise<Airport[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.airports.values()).filter(
      (airport) =>
        airport.code.toLowerCase().includes(lowerQuery) ||
        airport.name.toLowerCase().includes(lowerQuery) ||
        airport.city.toLowerCase().includes(lowerQuery)
    );
  }

  async getTSAWaitTimes(airportCode: string): Promise<TSAWaitTime[]> {
    const airport = this.airports.get(airportCode);
    return airport?.tsaWaitTimes || [];
  }

  async getAirportLounges(airportCode: string): Promise<AirportLounge[]> {
    const airport = this.airports.get(airportCode);
    return airport?.lounges || [];
  }

  // ==========================================================================
  // CRUISE SERVICES
  // ==========================================================================

  async getCruiseLine(id: string): Promise<CruiseLine | null> {
    return this.cruiseLines.get(id) || null;
  }

  async getAllCruiseLines(): Promise<CruiseLine[]> {
    return Array.from(this.cruiseLines.values());
  }

  async searchCruises(filters: {
    destination?: string;
    departurePort?: string;
    duration?: number;
    cruiseLineId?: string;
  }): Promise<CruiseItinerary[]> {
    const cruiseLines = Array.from(this.cruiseLines.values());
    const itineraries: CruiseItinerary[] = [];

    for (const line of cruiseLines) {
      if (filters.cruiseLineId && line.id !== filters.cruiseLineId) {
        continue;
      }

      // Generate sample itineraries
      for (const ship of line.ships) {
        const itinerary: CruiseItinerary = {
          id: `itin-${ship.id}-${Date.now()}`,
          cruiseLineId: line.id,
          shipId: ship.id,
          name: "7-Night Caribbean Cruise",
          duration: filters.duration || 7,
          departurePort: filters.departurePort || "Miami",
          arrivalPort: filters.departurePort || "Miami",
          ports: [
            {
              port: {
                code: "MIA",
                name: "Miami",
                type: "port",
                city: "Miami",
                country: "United States",
                countryCode: "US",
                coordinates: { latitude: 25.7617, longitude: -80.1918 },
                timezone: "America/New_York",
              },
              arrivalTime: null,
              departureTime: "5:00 PM",
              dayNumber: 1,
              isSeaDay: false,
            },
            {
              port: {
                code: "CZM",
                name: "Cozumel",
                type: "port",
                city: "Cozumel",
                country: "Mexico",
                countryCode: "MX",
                coordinates: { latitude: 20.4318, longitude: -86.9203 },
                timezone: "America/Cancun",
              },
              arrivalTime: "8:00 AM",
              departureTime: "5:00 PM",
              dayNumber: 3,
              isSeaDay: false,
            },
          ],
          sailDates: [
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          ],
          startingPrice: 799,
          startingPriceInPi: 799 / PI_EXTERNAL_RATE,
        };
        itineraries.push(itinerary);
      }
    }

    return itineraries;
  }

  // ==========================================================================
  // AIR TAXI SERVICES
  // ==========================================================================

  async getAirTaxiOperator(id: string): Promise<AirTaxiOperator | null> {
    return this.airTaxiOperators.get(id) || null;
  }

  async getAllAirTaxiOperators(): Promise<AirTaxiOperator[]> {
    return Array.from(this.airTaxiOperators.values());
  }

  async searchAirTaxiRoutes(
    origin: string,
    destination: string
  ): Promise<
    {
      operator: AirTaxiOperator;
      aircraft: Aircraft;
      estimatedDuration: number;
      estimatedPrice: number;
      estimatedPriceInPi: number;
    }[]
  > {
    const results = [];

    for (const operator of this.airTaxiOperators.values()) {
      for (const aircraft of operator.aircraft) {
        const estimatedDuration = 30; // Simplified
        const estimatedPrice = 495;
        const discount = operator.acceptsPi ? operator.piDiscount : 0;
        const estimatedPriceInPi =
          (estimatedPrice * (1 - discount)) / PI_EXTERNAL_RATE;

        results.push({
          operator,
          aircraft,
          estimatedDuration,
          estimatedPrice,
          estimatedPriceInPi,
        });
      }
    }

    return results;
  }

  // ==========================================================================
  // LOYALTY PROGRAM
  // ==========================================================================

  async createLoyaltyProgram(data: {
    userId: string;
    programName: string;
    memberNumber: string;
    tier?: string;
  }): Promise<LoyaltyProgram> {
    const program: LoyaltyProgram = {
      id: `loyalty-${Date.now()}`,
      userId: data.userId,
      programName: data.programName,
      memberNumber: data.memberNumber,
      tier: data.tier || "Member",
      pointsBalance: 0,
      milesBalance: 0,
      qualifyingMiles: 0,
      qualifyingSegments: 0,
      qualifyingSpend: 0,
      benefits: [],
      piPointsEarned: 0,
      piMilesEarned: 0,
    };

    this.loyaltyPrograms.set(program.id, program);
    return program;
  }

  async getUserLoyaltyPrograms(userId: string): Promise<LoyaltyProgram[]> {
    return Array.from(this.loyaltyPrograms.values()).filter(
      (p) => p.userId === userId
    );
  }

  async earnPoints(
    programId: string,
    points: number,
    source: "pi-payment" | "booking" | "bonus"
  ): Promise<LoyaltyProgram> {
    const program = this.loyaltyPrograms.get(programId);
    if (!program) {
      throw new Error("Loyalty program not found");
    }

    program.pointsBalance += points;
    if (source === "pi-payment") {
      program.piPointsEarned += points;
    }

    return program;
  }

  // ==========================================================================
  // TRAVEL AGENT HUB - SUBSCRIPTION & MANAGEMENT
  // ==========================================================================

  getAgentSubscriptionPlans(): AgentSubscriptionPlan[] {
    return [
      {
        tier: "starter",
        name: "Starter Agent",
        monthlyPrice: 49,
        monthlyPriceInPi: 49 / PI_EXTERNAL_RATE,
        annualPrice: 470,
        annualPriceInPi: 470 / PI_EXTERNAL_RATE,
        commissionRate: 0.08,
        piBonus: 0.02,
        features: [
          "Access to booking platform",
          "Up to 50 client profiles",
          "Basic reporting dashboard",
          "Email support",
          "Standard commission rates",
          "Pi payment acceptance",
        ],
        maxClients: 50,
        apiAccess: false,
        whitelabelAccess: false,
        supportLevel: "email",
      },
      {
        tier: "professional",
        name: "Professional Agent",
        monthlyPrice: 149,
        monthlyPriceInPi: 149 / PI_EXTERNAL_RATE,
        annualPrice: 1430,
        annualPriceInPi: 1430 / PI_EXTERNAL_RATE,
        commissionRate: 0.1,
        piBonus: 0.03,
        features: [
          "All Starter features",
          "Up to 500 client profiles",
          "Advanced analytics",
          "Priority support",
          "Enhanced commission rates",
          "Cruise booking access",
          "Air taxi booking access",
          "Custom branding on invoices",
          "Marketing materials",
        ],
        maxClients: 500,
        apiAccess: false,
        whitelabelAccess: false,
        supportLevel: "priority",
      },
      {
        tier: "enterprise",
        name: "Enterprise Agency",
        monthlyPrice: 499,
        monthlyPriceInPi: 499 / PI_EXTERNAL_RATE,
        annualPrice: 4790,
        annualPriceInPi: 4790 / PI_EXTERNAL_RATE,
        commissionRate: 0.12,
        piBonus: 0.04,
        features: [
          "All Professional features",
          "Unlimited client profiles",
          "Full API access",
          "White-label booking portal",
          "Dedicated account manager",
          "Premium commission rates",
          "Override commissions",
          "Multi-agent management",
          "Custom integrations",
          "Advanced CRM tools",
        ],
        maxClients: "unlimited",
        apiAccess: true,
        whitelabelAccess: true,
        supportLevel: "dedicated",
      },
      {
        tier: "elite",
        name: "Elite Partner",
        monthlyPrice: 999,
        monthlyPriceInPi: 999 / PI_EXTERNAL_RATE,
        annualPrice: 9590,
        annualPriceInPi: 9590 / PI_EXTERNAL_RATE,
        commissionRate: 0.15,
        piBonus: 0.05,
        features: [
          "All Enterprise features",
          "Exclusive supplier rates",
          "First access to new features",
          "24/7 VIP support",
          "Revenue sharing on referrals",
          "Joint marketing opportunities",
          "Custom Pi payment solutions",
          "Blockchain-verified bookings",
          "Premium placement in directory",
          "Annual strategy sessions",
        ],
        maxClients: "unlimited",
        apiAccess: true,
        whitelabelAccess: true,
        supportLevel: "24/7",
      },
    ];
  }

  async registerTravelAgent(data: {
    userId: string;
    agencyName: string;
    agentName: string;
    email: string;
    phone: string;
    website?: string;
    iataNumber?: string;
    arcNumber?: string;
    cliaNumber?: string;
    address: TravelAgent["address"];
    subscriptionTier: AgentSubscriptionTier;
    specialties: AgentSpecialty[];
    payWithPi?: boolean;
  }): Promise<TravelAgent> {
    const id = `agent-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const plans = this.getAgentSubscriptionPlans();
    const plan = plans.find((p) => p.tier === data.subscriptionTier)!;

    const agent: TravelAgent = {
      id,
      userId: data.userId,
      agencyName: data.agencyName,
      agentName: data.agentName,
      email: data.email,
      phone: data.phone,
      website: data.website || null,
      iataNumber: data.iataNumber || null,
      arcNumber: data.arcNumber || null,
      cliaNumber: data.cliaNumber || null,
      hostAgencyId: null,
      address: data.address,
      subscriptionTier: data.subscriptionTier,
      subscriptionStatus: "active",
      subscriptionStartDate: new Date(),
      subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      monthlyFee: plan.monthlyPrice,
      monthlyFeeInPi: plan.monthlyPriceInPi,
      commissionRate: plan.commissionRate,
      piCommissionBonus: plan.piBonus,
      overrideCommission: 0,
      totalBookings: 0,
      totalRevenue: 0,
      totalCommissionEarned: 0,
      totalPiEarned: 0,
      averageBookingValue: 0,
      clientSatisfactionScore: 0,
      clients: [],
      totalClients: 0,
      activeClients: 0,
      specialties: data.specialties,
      certifications: [],
      preferredSuppliers: [],
      accessLevel: plan.features,
      apiAccess: plan.apiAccess,
      whitelabelEnabled: plan.whitelabelAccess,
      createdAt: new Date(),
      lastActiveAt: new Date(),
      verifiedAt: null,
    };

    this.agents.set(id, agent);
    return agent;
  }

  async getAgent(agentId: string): Promise<TravelAgent | null> {
    return this.agents.get(agentId) || null;
  }

  async getAgentByUserId(userId: string): Promise<TravelAgent | null> {
    return (
      Array.from(this.agents.values()).find((a) => a.userId === userId) || null
    );
  }

  async listAgents(filters?: {
    status?: AgentStatus;
    tier?: AgentSubscriptionTier;
    specialty?: AgentSpecialty;
  }): Promise<TravelAgent[]> {
    let agents = Array.from(this.agents.values());

    if (filters?.status) {
      agents = agents.filter((a) => a.subscriptionStatus === filters.status);
    }
    if (filters?.tier) {
      agents = agents.filter((a) => a.subscriptionTier === filters.tier);
    }
    if (filters?.specialty) {
      agents = agents.filter((a) => a.specialties.includes(filters.specialty!));
    }

    return agents;
  }

  async addAgentClient(
    agentId: string,
    clientData: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      preferredAirlines?: string[];
      preferredHotels?: string[];
      seatPreference?: string;
      mealPreference?: string;
      passportExpiry?: Date;
      tsaPreCheckNumber?: string;
      globalEntryNumber?: string;
    }
  ): Promise<AgentClient> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error("Agent not found");
    }

    const id = `client-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const client: AgentClient = {
      id,
      agentId,
      firstName: clientData.firstName,
      lastName: clientData.lastName,
      email: clientData.email,
      phone: clientData.phone,
      preferredAirlines: clientData.preferredAirlines || [],
      preferredHotels: clientData.preferredHotels || [],
      seatPreference: clientData.seatPreference || "no preference",
      mealPreference: clientData.mealPreference || "no preference",
      loyaltyNumbers: {},
      totalBookings: 0,
      totalSpend: 0,
      lastBookingDate: null,
      passportExpiry: clientData.passportExpiry || null,
      tsaPreCheckNumber: clientData.tsaPreCheckNumber || null,
      globalEntryNumber: clientData.globalEntryNumber || null,
      createdAt: new Date(),
    };

    agent.clients.push(client);
    agent.totalClients += 1;
    agent.activeClients += 1;
    this.agentClients.set(id, client);

    return client;
  }

  async getAgentClients(agentId: string): Promise<AgentClient[]> {
    const agent = this.agents.get(agentId);
    return agent?.clients || [];
  }

  async recordAgentBooking(
    agentId: string,
    bookingData: {
      bookingId: string;
      bookingValue: number;
      paidWithPi: boolean;
      piAmount?: number;
      clientId?: string;
    }
  ): Promise<{ commission: number; piBonus: number }> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error("Agent not found");
    }

    const commission = bookingData.bookingValue * agent.commissionRate;
    const piBonus = bookingData.paidWithPi
      ? bookingData.bookingValue * agent.piCommissionBonus
      : 0;

    agent.totalBookings += 1;
    agent.totalRevenue += bookingData.bookingValue;
    agent.totalCommissionEarned += commission;
    agent.totalPiEarned += piBonus;
    agent.averageBookingValue = agent.totalRevenue / agent.totalBookings;
    agent.lastActiveAt = new Date();

    if (bookingData.clientId) {
      const client = this.agentClients.get(bookingData.clientId);
      if (client) {
        client.totalBookings += 1;
        client.totalSpend += bookingData.bookingValue;
        client.lastBookingDate = new Date();
      }
    }

    return { commission, piBonus };
  }

  async upgradeAgentSubscription(
    agentId: string,
    newTier: AgentSubscriptionTier
  ): Promise<TravelAgent> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error("Agent not found");
    }

    const plans = this.getAgentSubscriptionPlans();
    const plan = plans.find((p) => p.tier === newTier)!;

    agent.subscriptionTier = newTier;
    agent.monthlyFee = plan.monthlyPrice;
    agent.monthlyFeeInPi = plan.monthlyPriceInPi;
    agent.commissionRate = plan.commissionRate;
    agent.piCommissionBonus = plan.piBonus;
    agent.apiAccess = plan.apiAccess;
    agent.whitelabelEnabled = plan.whitelabelAccess;
    agent.accessLevel = plan.features;
    agent.subscriptionEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    return agent;
  }

  async getAgentDashboard(agentId: string): Promise<{
    agent: TravelAgent;
    recentBookings: TravelBooking[];
    monthlyStats: {
      bookings: number;
      revenue: number;
      commission: number;
      piEarned: number;
    };
    clientGrowth: number;
    upcomingRenewals: AgentClient[];
  }> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error("Agent not found");
    }

    return {
      agent,
      recentBookings: Array.from(this.bookings.values())
        .filter((b) => b.metadata?.agentId === agentId)
        .slice(0, 10),
      monthlyStats: {
        bookings: agent.totalBookings,
        revenue: agent.totalRevenue,
        commission: agent.totalCommissionEarned,
        piEarned: agent.totalPiEarned,
      },
      clientGrowth: agent.totalClients,
      upcomingRenewals: agent.clients.filter(
        (c) =>
          c.passportExpiry &&
          c.passportExpiry < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      ),
    };
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

export const enterpriseTravelPlatform = new EnterpriseTravelPlatform();

// Export helper functions
export async function createTravelBooking(
  data: Parameters<typeof enterpriseTravelPlatform.createBooking>[0]
): Promise<TravelBooking> {
  return enterpriseTravelPlatform.createBooking(data);
}

export async function confirmTravelBooking(
  bookingId: string
): Promise<TravelBooking> {
  return enterpriseTravelPlatform.confirmBooking(bookingId);
}

export async function searchAirports(query: string): Promise<Airport[]> {
  return enterpriseTravelPlatform.searchAirports(query);
}

export async function searchCruises(
  filters: Parameters<typeof enterpriseTravelPlatform.searchCruises>[0]
): Promise<CruiseItinerary[]> {
  return enterpriseTravelPlatform.searchCruises(filters);
}

export async function searchAirTaxis(
  origin: string,
  destination: string
): ReturnType<typeof enterpriseTravelPlatform.searchAirTaxiRoutes> {
  return enterpriseTravelPlatform.searchAirTaxiRoutes(origin, destination);
}
