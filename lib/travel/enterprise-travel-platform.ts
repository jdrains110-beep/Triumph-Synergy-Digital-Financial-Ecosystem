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
const PI_EXTERNAL_RATE = 314.159;  // External non-contributed Pi
const PI_INTERNAL_RATE = 314159;   // Internally mined/contributed Pi (1000x)
const PI_INTERNAL_MULTIPLIER = 1000;

export type PiValueType = "internal" | "external";

export function getPiRate(type: PiValueType = "external"): number {
  return type === "internal" ? PI_INTERNAL_RATE : PI_EXTERNAL_RATE;
}

export function convertToPi(usdAmount: number, type: PiValueType = "external"): number {
  return usdAmount / getPiRate(type);
}

export function convertToUsd(piAmount: number, type: PiValueType = "external"): number {
  return piAmount * getPiRate(type);
}

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface TravelBooking {
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
}

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

export interface Traveler {
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
}

export interface FrequentFlyer {
  airline: string;
  airlineCode: string;
  memberNumber: string;
  tier: string;
}

export interface Itinerary {
  id: string;
  segments: TravelSegment[];
  origin: Location;
  destination: Location;
  departureDate: Date;
  returnDate: Date | null;
  tripType: "one-way" | "round-trip" | "multi-city";
}

export interface TravelSegment {
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
}

export interface Carrier {
  code: string;
  name: string;
  type: "airline" | "cruise-line" | "air-taxi" | "train" | "bus" | "car-rental";
  logo: string | null;
  alliance: string | null;
}

export interface SegmentPoint {
  location: Location;
  dateTime: Date;
  terminal: string | null;
  gate: string | null;
}

export interface Location {
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
}

export interface BaggageAllowance {
  carryOn: number;
  carryOnWeight: number;
  checkedBags: number;
  checkedBagWeight: number;
  personalItem: boolean;
}

export interface TravelPricing {
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
}

export interface FareBreakdown {
  travelerType: "adult" | "child" | "infant";
  quantity: number;
  baseFare: number;
  taxes: number;
  fees: number;
  total: number;
}

export interface TravelDocument {
  id: string;
  type: "e-ticket" | "boarding-pass" | "hotel-voucher" | "cruise-ticket" | "car-voucher" | "invoice" | "receipt";
  url: string;
  format: "pdf" | "pkpass" | "image";
  createdAt: Date;
}

export interface Airport {
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
}

export interface Terminal {
  name: string;
  code: string;
  gates: string[];
  airlines: string[];
  amenities: string[];
}

export interface TSAWaitTime {
  checkpoint: string;
  terminal: string;
  standard: number; // minutes
  preCheck: number; // minutes
  clear: number; // minutes
  lastUpdated: Date;
}

export interface AirportLounge {
  name: string;
  terminal: string;
  operator: string;
  accessTypes: ("membership" | "day-pass" | "class-of-service" | "credit-card")[];
  amenities: string[];
  hours: string;
  dayPassPrice: number;
}

export interface CruiseLine {
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
}

export interface CruiseShip {
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
}

export interface CabinCategory {
  code: string;
  name: string;
  type: "inside" | "oceanview" | "balcony" | "suite";
  squareFeet: number;
  maxOccupancy: number;
  amenities: string[];
}

export interface CruiseItinerary {
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
}

export interface CruisePort {
  port: Location;
  arrivalTime: string | null;
  departureTime: string | null;
  dayNumber: number;
  isSeaDay: boolean;
}

export interface AirTaxiOperator {
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
}

export interface Aircraft {
  id: string;
  type: string;
  model: string;
  capacity: number;
  range: number; // miles
  cruiseSpeed: number; // mph
  amenities: string[];
}

export interface Vertiport {
  id: string;
  name: string;
  code: string;
  location: Location;
  type: "helipad" | "vertiport" | "airport" | "marina";
  operatingHours: string;
  services: string[];
}

export interface LoyaltyProgram {
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
}

// ============================================================================
// ENTERPRISE TRAVEL PLATFORM CLASS
// ============================================================================

class EnterpriseTravelPlatform {
  private bookings: Map<string, TravelBooking> = new Map();
  private airports: Map<string, Airport> = new Map();
  private cruiseLines: Map<string, CruiseLine> = new Map();
  private airTaxiOperators: Map<string, AirTaxiOperator> = new Map();
  private loyaltyPrograms: Map<string, LoyaltyProgram> = new Map();

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
          { name: "Terminal 1", code: "T1", gates: ["1-12"], airlines: ["Lufthansa", "Korean Air"], amenities: ["lounges", "shops", "restaurants"] },
          { name: "Terminal 4", code: "T4", gates: ["A1-A12", "B20-B47"], airlines: ["Delta", "Emirates"], amenities: ["lounges", "shops", "restaurants", "spa"] },
          { name: "Terminal 5", code: "T5", gates: ["1-31"], airlines: ["JetBlue"], amenities: ["shops", "restaurants"] },
          { name: "Terminal 7", code: "T7", gates: ["1-12"], airlines: ["British Airways"], amenities: ["lounges", "shops"] },
          { name: "Terminal 8", code: "T8", gates: ["1-50"], airlines: ["American Airlines"], amenities: ["lounges", "shops", "restaurants"] },
        ],
        timezone: "America/New_York",
        type: "international",
        tsaWaitTimes: [
          { checkpoint: "Main", terminal: "T4", standard: 25, preCheck: 8, clear: 5, lastUpdated: new Date() },
        ],
        tsaPreCheckAvailable: true,
        clearMeAvailable: true,
        lounges: [
          { name: "Delta Sky Club", terminal: "T4", operator: "Delta", accessTypes: ["membership", "class-of-service"], amenities: ["food", "drinks", "wifi", "showers"], hours: "5:00 AM - 11:00 PM", dayPassPrice: 59 },
        ],
        services: ["wifi", "currency-exchange", "medical", "lost-and-found", "pet-relief"],
        airlinesServed: ["Delta", "American", "JetBlue", "United", "Emirates", "British Airways"],
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
          { name: "Tom Bradley International", code: "TBIT", gates: ["130-159"], airlines: ["International"], amenities: ["lounges", "shops", "restaurants"] },
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
            grossTonnage: 236857,
            yearBuilt: 2022,
            yearRefurbished: null,
            decks: 18,
            restaurants: 20,
            pools: 4,
            amenities: ["waterpark", "broadway-shows", "casino", "spa", "rock-climbing"],
            cabinCategories: [
              { code: "IS", name: "Interior", type: "inside", squareFeet: 150, maxOccupancy: 4, amenities: ["tv", "safe", "bathroom"] },
              { code: "OS", name: "Ocean View", type: "oceanview", squareFeet: 180, maxOccupancy: 4, amenities: ["tv", "safe", "bathroom", "window"] },
              { code: "BC", name: "Balcony", type: "balcony", squareFeet: 200, maxOccupancy: 4, amenities: ["tv", "safe", "bathroom", "balcony"] },
              { code: "SU", name: "Suite", type: "suite", squareFeet: 350, maxOccupancy: 6, amenities: ["tv", "safe", "bathroom", "balcony", "concierge", "priority-boarding"] },
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
            grossTonnage: 183521,
            yearBuilt: 2022,
            yearRefurbished: null,
            decks: 17,
            restaurants: 15,
            pools: 3,
            amenities: ["waterslides", "casino", "spa", "comedy-club", "roller-coaster"],
            cabinCategories: [
              { code: "IS", name: "Interior", type: "inside", squareFeet: 145, maxOccupancy: 4, amenities: ["tv", "safe", "bathroom"] },
              { code: "BC", name: "Balcony", type: "balcony", squareFeet: 185, maxOccupancy: 4, amenities: ["tv", "safe", "bathroom", "balcony"] },
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
          { id: "bell429", type: "helicopter", model: "Bell 429", capacity: 6, range: 411, cruiseSpeed: 161, amenities: ["leather-seats", "noise-cancelling"] },
          { id: "airbus135", type: "helicopter", model: "Airbus H135", capacity: 5, range: 380, cruiseSpeed: 155, amenities: ["leather-seats", "panoramic-windows"] },
        ],
        serviceAreas: ["New York", "Los Angeles", "Miami", "Hamptons"],
        vertiports: [
          { id: "jfk-blade", name: "BLADE Lounge JFK", code: "JFK-BL", location: { code: "JFK", name: "JFK Airport", type: "airport", city: "New York", country: "United States", countryCode: "US", coordinates: { latitude: 40.6413, longitude: -73.7781 }, timezone: "America/New_York" }, type: "helipad", operatingHours: "6AM-10PM", services: ["lounge", "valet", "refreshments"] },
          { id: "manhattan-west30", name: "West 30th Street Heliport", code: "W30", location: { code: "W30", name: "West 30th St Heliport", type: "helipad", city: "New York", country: "United States", countryCode: "US", coordinates: { latitude: 40.7549, longitude: -74.0074 }, timezone: "America/New_York" }, type: "helipad", operatingHours: "7AM-7PM", services: ["lounge"] },
        ],
        acceptsPi: true,
        piDiscount: 0.10,
        minimumNotice: 2,
        cancellationPolicy: "Full refund if cancelled 24 hours before departure",
      },
      {
        id: "joby",
        name: "Joby Aviation",
        code: "JOBY",
        type: "evtol",
        aircraft: [
          { id: "joby-s4", type: "evtol", model: "Joby S4", capacity: 4, range: 150, cruiseSpeed: 200, amenities: ["quiet-flight", "panoramic-views", "climate-control"] },
        ],
        serviceAreas: ["Los Angeles", "San Francisco", "New York"],
        vertiports: [
          { id: "lax-joby", name: "LAX Vertiport", code: "LAX-V", location: { code: "LAX", name: "LAX Vertiport", type: "vertiport", city: "Los Angeles", country: "United States", countryCode: "US", coordinates: { latitude: 33.9425, longitude: -118.4081 }, timezone: "America/Los_Angeles" }, type: "vertiport", operatingHours: "6AM-10PM", services: ["lounge", "charging"] },
        ],
        acceptsPi: true,
        piDiscount: 0.15,
        minimumNotice: 1,
        cancellationPolicy: "Full refund if cancelled 12 hours before departure",
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
    const baseFare = this.calculateBaseFare(bookingData.itinerary, bookingData.travelers.length);
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
      piAmount: bookingData.piAmount || (bookingData.paymentMethod === "pi" ? totalInPi : 0),
      usdAmount: bookingData.usdAmount || (bookingData.paymentMethod === "usd" ? totalAfterDiscount : 0),
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

  private calculateBaseFare(itinerary: Itinerary, travelerCount: number): number {
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

  async cancelBooking(bookingId: string, reason?: string): Promise<TravelBooking> {
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
      if (filters.cruiseLineId && line.id !== filters.cruiseLineId) continue;

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
              port: { code: "MIA", name: "Miami", type: "port", city: "Miami", country: "United States", countryCode: "US", coordinates: { latitude: 25.7617, longitude: -80.1918 }, timezone: "America/New_York" },
              arrivalTime: null,
              departureTime: "5:00 PM",
              dayNumber: 1,
              isSeaDay: false,
            },
            {
              port: { code: "CZM", name: "Cozumel", type: "port", city: "Cozumel", country: "Mexico", countryCode: "MX", coordinates: { latitude: 20.4318, longitude: -86.9203 }, timezone: "America/Cancun" },
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

  async searchAirTaxiRoutes(origin: string, destination: string): Promise<{
    operator: AirTaxiOperator;
    aircraft: Aircraft;
    estimatedDuration: number;
    estimatedPrice: number;
    estimatedPriceInPi: number;
  }[]> {
    const results = [];

    for (const operator of this.airTaxiOperators.values()) {
      for (const aircraft of operator.aircraft) {
        const estimatedDuration = 30; // Simplified
        const estimatedPrice = 495;
        const discount = operator.acceptsPi ? operator.piDiscount : 0;
        const estimatedPriceInPi = (estimatedPrice * (1 - discount)) / PI_EXTERNAL_RATE;

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

  getDualRateInfo(): { internal: number; external: number; multiplier: number } {
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
export async function createTravelBooking(data: Parameters<typeof enterpriseTravelPlatform.createBooking>[0]): Promise<TravelBooking> {
  return enterpriseTravelPlatform.createBooking(data);
}

export async function confirmTravelBooking(bookingId: string): Promise<TravelBooking> {
  return enterpriseTravelPlatform.confirmBooking(bookingId);
}

export async function searchAirports(query: string): Promise<Airport[]> {
  return enterpriseTravelPlatform.searchAirports(query);
}

export async function searchCruises(filters: Parameters<typeof enterpriseTravelPlatform.searchCruises>[0]): Promise<CruiseItinerary[]> {
  return enterpriseTravelPlatform.searchCruises(filters);
}

export async function searchAirTaxis(origin: string, destination: string): ReturnType<typeof enterpriseTravelPlatform.searchAirTaxiRoutes> {
  return enterpriseTravelPlatform.searchAirTaxiRoutes(origin, destination);
}
