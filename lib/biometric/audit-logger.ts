/**
 * Biometric Audit Logging System
 * Records all biometric operations for security and compliance
 */

import { NextRequest } from 'next/server';

export enum BiometricAuditEventType {
  // Registration events
  REGISTRATION_INITIATED = 'REGISTRATION_INITIATED',
  REGISTRATION_COMPLETED = 'REGISTRATION_COMPLETED',
  REGISTRATION_FAILED = 'REGISTRATION_FAILED',
  REGISTRATION_CANCELLED = 'REGISTRATION_CANCELLED',

  // Authentication events
  AUTHENTICATION_ATTEMPTED = 'AUTHENTICATION_ATTEMPTED',
  AUTHENTICATION_SUCCESS = 'AUTHENTICATION_SUCCESS',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  AUTHENTICATION_FALLBACK = 'AUTHENTICATION_FALLBACK',
  AUTHENTICATION_CANCELLED = 'AUTHENTICATION_CANCELLED',

  // Session events
  SESSION_CREATED = 'SESSION_CREATED',
  SESSION_REFRESHED = 'SESSION_REFRESHED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  SESSION_REVOKED = 'SESSION_REVOKED',

  // Credential management events
  CREDENTIAL_CREATED = 'CREDENTIAL_CREATED',
  CREDENTIAL_DELETED = 'CREDENTIAL_DELETED',
  CREDENTIAL_UPDATED = 'CREDENTIAL_UPDATED',
  CREDENTIAL_LISTED = 'CREDENTIAL_LISTED',

  // Security events
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  VERIFICATION_FAILED = 'VERIFICATION_FAILED',
  ATTESTATION_FAILED = 'ATTESTATION_FAILED',

  // Error events
  ERROR_OCCURRED = 'ERROR_OCCURRED',
  HARDWARE_ERROR = 'HARDWARE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
}

export enum BiometricAuditSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

export interface BiometricAuditLog {
  id: string;
  timestamp: Date;
  eventType: BiometricAuditEventType;
  severity: BiometricAuditSeverity;
  userId?: string;
  sessionId?: string;
  credentialId?: string;
  operation: string;
  status: 'success' | 'failure';
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: {
    os?: string;
    browser?: string;
    platform?: string;
  };
  errorCode?: string;
  errorMessage?: string;
  context?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Extract client information from request
 */
export function getClientInfo(request: NextRequest) {
  const ip = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || undefined;

  return { ip, userAgent };
}

/**
 * Get client IP from request
 */
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  return request.headers.get('x-real-ip') || request.headers.get('cf-connecting-ip') || 'unknown';
}

/**
 * Parse device info from user agent
 */
export function parseDeviceInfo(userAgent?: string): BiometricAuditLog['deviceInfo'] {
  if (!userAgent) return undefined;

  const deviceInfo: BiometricAuditLog['deviceInfo'] = {};

  // OS detection
  if (userAgent.includes('Windows')) deviceInfo.os = 'Windows';
  else if (userAgent.includes('Mac')) deviceInfo.os = 'macOS';
  else if (userAgent.includes('iPhone')) deviceInfo.os = 'iOS';
  else if (userAgent.includes('Android')) deviceInfo.os = 'Android';
  else if (userAgent.includes('Linux')) deviceInfo.os = 'Linux';

  // Browser detection
  if (userAgent.includes('Chrome')) deviceInfo.browser = 'Chrome';
  else if (userAgent.includes('Safari')) deviceInfo.browser = 'Safari';
  else if (userAgent.includes('Firefox')) deviceInfo.browser = 'Firefox';
  else if (userAgent.includes('Edge')) deviceInfo.browser = 'Edge';

  // Platform
  if (userAgent.includes('Mobile')) deviceInfo.platform = 'Mobile';
  else if (userAgent.includes('Tablet')) deviceInfo.platform = 'Tablet';
  else deviceInfo.platform = 'Desktop';

  return deviceInfo;
}

/**
 * Generate audit log ID
 */
export function generateAuditLogId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get severity level based on event type
 */
export function getSeverityForEvent(eventType: BiometricAuditEventType): BiometricAuditSeverity {
  const criticalEvents = [
    BiometricAuditEventType.SUSPICIOUS_ACTIVITY,
    BiometricAuditEventType.RATE_LIMIT_EXCEEDED,
    BiometricAuditEventType.ATTESTATION_FAILED,
    BiometricAuditEventType.VERIFICATION_FAILED,
  ];

  const warningEvents = [
    BiometricAuditEventType.AUTHENTICATION_FAILED,
    BiometricAuditEventType.REGISTRATION_FAILED,
    BiometricAuditEventType.REGISTRATION_CANCELLED,
    BiometricAuditEventType.AUTHENTICATION_CANCELLED,
    BiometricAuditEventType.HARDWARE_ERROR,
    BiometricAuditEventType.NETWORK_ERROR,
  ];

  if (criticalEvents.includes(eventType)) {
    return BiometricAuditSeverity.CRITICAL;
  }

  if (warningEvents.includes(eventType)) {
    return BiometricAuditSeverity.WARNING;
  }

  return BiometricAuditSeverity.INFO;
}

/**
 * Biometric audit logger
 */
export class BiometricAuditLogger {
  private static logs: BiometricAuditLog[] = [];
  private static maxLogs = 10000; // Keep last 10000 logs in memory

  /**
   * Log an audit event
   */
  static async log(
    eventType: BiometricAuditEventType,
    operation: string,
    options: {
      userId?: string;
      sessionId?: string;
      credentialId?: string;
      status?: 'success' | 'failure';
      errorCode?: string;
      errorMessage?: string;
      ipAddress?: string;
      userAgent?: string;
      context?: Record<string, any>;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<BiometricAuditLog> {
    const log: BiometricAuditLog = {
      id: generateAuditLogId(),
      timestamp: new Date(),
      eventType,
      severity: getSeverityForEvent(eventType),
      operation,
      status: options.status || 'success',
      userId: options.userId,
      sessionId: options.sessionId,
      credentialId: options.credentialId,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      errorCode: options.errorCode,
      errorMessage: options.errorMessage,
      deviceInfo: parseDeviceInfo(options.userAgent),
      context: options.context,
      metadata: options.metadata,
    };

    // Store in memory
    this.logs.push(log);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Send to backend for persistent storage
    try {
      await this.persistLog(log);
    } catch (error) {
      console.error('Failed to persist audit log:', error);
    }

    // Log critical events
    if (log.severity === BiometricAuditSeverity.CRITICAL) {
      console.warn('[BIOMETRIC AUDIT CRITICAL]', log);
    }

    return log;
  }

  /**
   * Persist log to backend
   */
  private static async persistLog(log: BiometricAuditLog): Promise<void> {
    try {
      const response = await fetch('/api/biometric/audit/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to persist audit log:', error);
      // In production, implement a queue for retry
    }
  }

  /**
   * Get logs (in-memory, for debugging)
   */
  static getLogs(
    filter?: {
      userId?: string;
      eventType?: BiometricAuditEventType;
      severity?: BiometricAuditSeverity;
      status?: 'success' | 'failure';
      limit?: number;
    }
  ): BiometricAuditLog[] {
    let filtered = [...this.logs];

    if (filter?.userId) {
      filtered = filtered.filter((log) => log.userId === filter.userId);
    }

    if (filter?.eventType) {
      filtered = filtered.filter((log) => log.eventType === filter.eventType);
    }

    if (filter?.severity) {
      filtered = filtered.filter((log) => log.severity === filter.severity);
    }

    if (filter?.status) {
      filtered = filtered.filter((log) => log.status === filter.status);
    }

    // Return most recent first
    filtered.reverse();

    if (filter?.limit) {
      filtered = filtered.slice(0, filter.limit);
    }

    return filtered;
  }

  /**
   * Clear old logs
   */
  static clearOldLogs(olderThanDays: number = 90): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    this.logs = this.logs.filter((log) => log.timestamp > cutoffDate);
  }

  /**
   * Get statistics
   */
  static getStats(userId?: string): {
    total: number;
    successes: number;
    failures: number;
    byEventType: Record<string, number>;
    bySeverity: Record<string, number>;
  } {
    let logs = this.logs;

    if (userId) {
      logs = logs.filter((log) => log.userId === userId);
    }

    const stats = {
      total: logs.length,
      successes: logs.filter((log) => log.status === 'success').length,
      failures: logs.filter((log) => log.status === 'failure').length,
      byEventType: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
    };

    logs.forEach((log) => {
      stats.byEventType[log.eventType] = (stats.byEventType[log.eventType] || 0) + 1;
      stats.bySeverity[log.severity] = (stats.bySeverity[log.severity] || 0) + 1;
    });

    return stats;
  }

  /**
   * Detect suspicious activity
   */
  static detectSuspiciousActivity(userId: string, windowMinutes: number = 5): boolean {
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowMinutes * 60 * 1000);

    const recentLogs = this.logs.filter(
      (log) =>
        log.userId === userId &&
        log.timestamp >= windowStart &&
        log.status === 'failure'
    );

    // Flag if more than 5 failed attempts in the window
    return recentLogs.length > 5;
  }
}

/**
 * Convenient logging helpers
 */
export const BiometricAuditEvents = {
  registrationInitiated: (userId: string, context?: Record<string, any>) =>
    BiometricAuditLogger.log(
      BiometricAuditEventType.REGISTRATION_INITIATED,
      'User initiated biometric registration',
      { userId, context }
    ),

  registrationCompleted: (userId: string, credentialId: string, context?: Record<string, any>) =>
    BiometricAuditLogger.log(
      BiometricAuditEventType.REGISTRATION_COMPLETED,
      'Biometric credential successfully registered',
      { userId, credentialId, status: 'success', context }
    ),

  registrationFailed: (userId: string, errorCode: string, errorMessage: string, ipAddress?: string) =>
    BiometricAuditLogger.log(
      BiometricAuditEventType.REGISTRATION_FAILED,
      'Biometric registration failed',
      { userId, status: 'failure', errorCode, errorMessage, ipAddress }
    ),

  authenticationAttempted: (userId: string, ipAddress?: string) =>
    BiometricAuditLogger.log(
      BiometricAuditEventType.AUTHENTICATION_ATTEMPTED,
      'User attempted biometric authentication',
      { userId, ipAddress }
    ),

  authenticationSuccess: (userId: string, sessionId: string, ipAddress?: string) =>
    BiometricAuditLogger.log(
      BiometricAuditEventType.AUTHENTICATION_SUCCESS,
      'User authenticated successfully with biometric',
      { userId, sessionId, status: 'success', ipAddress }
    ),

  authenticationFailed: (userId: string, errorCode: string, ipAddress?: string) =>
    BiometricAuditLogger.log(
      BiometricAuditEventType.AUTHENTICATION_FAILED,
      'Biometric authentication failed',
      { userId, status: 'failure', errorCode, ipAddress }
    ),

  credentialDeleted: (userId: string, credentialId: string, ipAddress?: string) =>
    BiometricAuditLogger.log(
      BiometricAuditEventType.CREDENTIAL_DELETED,
      'Biometric credential deleted',
      { userId, credentialId, status: 'success', ipAddress }
    ),

  rateLimitExceeded: (userId: string, ipAddress?: string) =>
    BiometricAuditLogger.log(
      BiometricAuditEventType.RATE_LIMIT_EXCEEDED,
      'Rate limit exceeded for biometric authentication',
      { userId, status: 'failure', ipAddress }
    ),

  suspiciousActivity: (userId: string, reason: string, ipAddress?: string) =>
    BiometricAuditLogger.log(
      BiometricAuditEventType.SUSPICIOUS_ACTIVITY,
      `Suspicious activity detected: ${reason}`,
      { userId, status: 'failure', ipAddress, context: { reason } }
    ),
};
