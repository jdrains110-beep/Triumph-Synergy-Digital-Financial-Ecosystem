/**
 * TRIUMPH SYNERGY - Gaming & Health Platforms API
 * 
 * Comprehensive REST endpoints for:
 * - Gaming platform management and user rewards
 * - Health platform integration and payroll
 * - Streaming platform monetization
 * - Cross-platform reporting
 */

export type RequestPayload = Record<string, unknown>;
export type ResponseData = Record<string, unknown> | { success: boolean; data?: unknown; error?: string };

/**
 * Gaming Platforms API Endpoints
 * 
 * POST /api/platforms/gaming/register - Register gaming platform
 * GET /api/platforms/gaming/list - List all gaming platforms
 * POST /api/platforms/gaming/rewards - Track user engagement and distribute rewards
 * GET /api/platforms/gaming/stats - Get platform statistics
 * POST /api/platforms/gaming/tournaments - Create tournament
 * POST /api/platforms/gaming/streaming - Start streaming session
 * GET /api/platforms/gaming/leaderboard - Get cross-platform leaderboard
 */

export interface GamingApiRequest {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  payload?: RequestPayload;
}

export interface GamingApiResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  timestamp: Date;
}

/**
 * Health Platforms API Endpoints
 * 
 * POST /api/platforms/health/register-institution - Register health institution
 * GET /api/platforms/health/institutions - List institutions
 * POST /api/platforms/health/payroll - Process payroll
 * POST /api/platforms/health/policies - Create policy
 * GET /api/platforms/health/policy-stats - Get policy adoption stats
 * POST /api/platforms/health/contractor-payment - Process contractor payment
 * GET /api/platforms/health/reports - Generate compliance reports
 */

export interface HealthApiRequest {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  payload?: RequestPayload;
}

export interface HealthApiResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  timestamp: Date;
}

/**
 * Streaming API Endpoints
 * 
 * POST /api/platforms/streaming/session/start - Start streaming session
 * POST /api/platforms/streaming/session/update - Update stream metrics
 * POST /api/platforms/streaming/session/event - Record stream event
 * POST /api/platforms/streaming/session/end - End session and distribute earnings
 * GET /api/platforms/streaming/stats - Get streamer stats
 * GET /api/platforms/streaming/platform-stats - Get platform stats
 */

export interface StreamingApiRequest {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  payload?: RequestPayload;
}

export interface StreamingApiResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  timestamp: Date;
}

/**
 * Example API Request/Response Patterns
 */

// Gaming Platforms - Register GTA6
export interface RegisterGamingPlatformRequest {
  platformId: string; // 'gta6', 'ps5', 'battlefield-6'
  name: string;
  developer: string;
  apiEndpoint: string;
  genre: string;
  engagementRateMultiplier: number;
  supportedStreamingPlatforms: Array<{ id: string; name: string }>;
}

// Gaming Platforms - Track Engagement
export interface TrackEngagementRequest {
  platformId: string;
  userId: string;
  eventType: 'gameplay' | 'achievement' | 'purchase' | 'streaming' | 'social' | 'tournament';
  amount: number; // Pi reward
  description: string;
  metadata?: Record<string, unknown>;
}

// Health Platforms - Register Institution
export interface RegisterHealthInstitutionRequest {
  institutionId: string; // 'shands-hospital', 'uf-health'
  name: string;
  type: 'hospital' | 'clinic' | 'research' | 'wellness';
  locations: string[];
  piPaymentEnabled: boolean;
  triumphSynergyPartner: boolean;
  partnershipLevel: 'associate' | 'partner' | 'owner';
}

// Health Platforms - Register Employee
export interface RegisterEmployeeRequest {
  institutionId: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  role: string;
  salary: number;
  paymentFrequency: 'weekly' | 'biweekly' | 'monthly';
  piWalletAddress: string;
}

// Health Platforms - Process Payroll
export interface ProcessPayrollRequest {
  institutionId: string;
  date: string; // ISO date
  departmentId?: string; // Optional - department specific
}

// Health Platforms - Create Policy
export interface CreatePolicyRequest {
  institutionId: string;
  policyId: string;
  name: string;
  category: 'vaccination' | 'birthing' | 'treatment' | 'testing' | 'prevention';
  description: string;
  alternatives: Array<{
    id: string;
    name: string;
    description: string;
    isTraditional: boolean;
    isAlternative: boolean;
  }>;
}

// Health Platforms - Set Policy Preference
export interface SetPolicyPreferenceRequest {
  institutionId: string;
  personId: string;
  policyId: string;
  alternativeId: string; // User's choice
}

// Streaming - Start Session
export interface StartStreamingSessionRequest {
  streamerId: string;
  platform: 'twitch' | 'youtube' | 'kick' | 'trovo';
  gamingPlatform: string; // 'gta6', 'ps5', 'battlefield-6'
  channelUrl: string;
}

// Streaming - Update Metrics
export interface UpdateStreamingMetricsRequest {
  sessionId: string;
  currentViewers: number;
  avgWatchTimeMinutes: number;
  peakViewers?: number;
}

// Streaming - Record Event
export interface RecordStreamingEventRequest {
  sessionId: string;
  eventType: 'subscribe' | 'donate' | 'cheer' | 'raid';
  userId: string;
  amount?: number;
}

// Streaming - End Session
export interface EndStreamingSessionRequest {
  sessionId: string;
}

/**
 * API Response Examples
 */

// Success Response
export interface SuccessResponse<T> {
  success: true;
  data: T;
  timestamp: string;
  message?: string;
}

// Error Response
export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

/**
 * Unified Platform Response Types
 */

export interface PlatformListResponse {
  platforms: Array<{
    id: string;
    name: string;
    type: 'gaming' | 'health' | 'streaming';
    status: 'active' | 'inactive' | 'maintenance';
    users: number;
    totalEarnings?: number;
    totalPayments?: number;
    lastActivity: string;
  }>;
  summary: {
    totalPlatforms: number;
    activeUsers: number;
    totalEarnings: number;
    totalPayments: number;
  };
}

export interface UserStatsResponse {
  userId: string;
  platforms: Array<{
    platformId: string;
    platformName: string;
    earnings: number;
    engagementHours?: number;
    streams?: number;
    lastActivity: string;
  }>;
  totalEarnings: number;
  totalEngagement: number;
}

export interface PayrollReportResponse {
  institutionId: string;
  periodStart: string;
  periodEnd: string;
  totalPaid: number;
  employeeCount: number;
  contractorPayments: number;
  transactions: Array<{
    id: string;
    recipient: string;
    amount: number;
    type: string;
    blockchainHash?: string;
  }>;
}

export interface PolicyStatsResponse {
  policyId: string;
  policyName: string;
  category: string;
  totalAffected: number;
  adoptionRates: Record<string, number>;
  alternatives: Array<{
    id: string;
    name: string;
    adoptionCount: number;
    adoptionPercent: number;
  }>;
}

export interface StreamingStatsResponse {
  streamerId: string;
  totalEarnings: number;
  activeSessions: number;
  totalSessions: number;
  sessions: Array<{
    sessionId: string;
    platform: string;
    gamingPlatform: string;
    viewers: number;
    peakViewers: number;
    duration: number; // minutes
    earnings: number;
    status: string;
  }>;
}

export interface CrossPlatformReportResponse {
  reportDate: string;
  gamingMetrics: {
    activePlatforms: number;
    totalUsers: number;
    totalEarnings: number;
    topGame: string;
    topStreamer: string;
  };
  healthMetrics: {
    activeInstitutions: number;
    totalPersonnel: number;
    totalPayroll: number;
    topInstitution: string;
    policyComplianceRate: number;
  };
  streamingMetrics: {
    activeSessions: number;
    totalStreamers: number;
    totalViewers: number;
    totalStreamingEarnings: number;
    topPlatform: string;
  };
  combinedMetrics: {
    totalPiDistributed: number;
    uniqueUsers: number;
    totalTransactions: number;
    averageTransactionValue: number;
  };
}

/**
 * Error Codes
 */
export enum ApiErrorCode {
  PLATFORM_NOT_FOUND = 'PLATFORM_NOT_FOUND',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  INVALID_PAYMENT_AMOUNT = 'INVALID_PAYMENT_AMOUNT',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

/**
 * API Authentication
 */
export interface ApiAuthContext {
  userId?: string;
  institutionId?: string;
  role: 'user' | 'admin' | 'system';
  scopes: string[];
  timestamp: Date;
}

/**
 * Request Middleware Types
 */
export interface ApiMiddlewareContext {
  auth: ApiAuthContext;
  metadata: {
    ip: string;
    userAgent: string;
    timestamp: Date;
    requestId: string;
  };
}

/**
 * Batch Operation Support
 */
export interface BatchApiRequest {
  operations: Array<{
    id: string;
    type: 'gaming' | 'health' | 'streaming';
    endpoint: string;
    payload: RequestPayload;
  }>;
}

export interface BatchApiResponse {
  results: Array<{
    operationId: string;
    success: boolean;
    data?: unknown;
    error?: string;
  }>;
  summary: {
    total: number;
    succeeded: number;
    failed: number;
  };
}

/**
 * Real-time Updates via WebSocket
 */
export interface WebSocketMessage {
  type: 'session_started' | 'session_updated' | 'earnings_distributed' | 'policy_update' | 'payment_processed';
  data: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Webhook Events
 */
export interface WebhookEvent {
  eventId: string;
  eventType: string;
  platform: 'gaming' | 'health' | 'streaming';
  data: Record<string, unknown>;
  timestamp: Date;
  signature: string; // HMAC-SHA256
}
