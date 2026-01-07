/**
 * Biometric Authentication Error Handling
 * Comprehensive error definitions, recovery strategies, and diagnostics
 */

/**
 * Biometric-specific error codes
 */
export enum BiometricErrorCode {
  // WebAuthn/Hardware errors
  NOT_SUPPORTED = 'NOT_SUPPORTED',
  NOT_AVAILABLE = 'NOT_AVAILABLE',
  HARDWARE_UNAVAILABLE = 'HARDWARE_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
  NOT_ALLOWED = 'NOT_ALLOWED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  
  // User action errors
  CANCELLED = 'CANCELLED',
  INVALID_STATE = 'INVALID_STATE',
  CONSTRAINT_ERROR = 'CONSTRAINT_ERROR',
  DATA_ERROR = 'DATA_ERROR',
  OPERATION_ERROR = 'OPERATION_ERROR',
  
  // Authentication errors
  INVALID_CREDENTIAL = 'INVALID_CREDENTIAL',
  CREDENTIAL_MISMATCH = 'CREDENTIAL_MISMATCH',
  VERIFICATION_FAILED = 'VERIFICATION_FAILED',
  ATTESTATION_FAILED = 'ATTESTATION_FAILED',
  
  // Session errors
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  SESSION_INVALID = 'SESSION_INVALID',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  
  // Storage errors
  STORAGE_ERROR = 'STORAGE_ERROR',
  ENCRYPTION_ERROR = 'ENCRYPTION_ERROR',
  DECRYPTION_ERROR = 'DECRYPTION_ERROR',
  
  // Rate limiting
  RATE_LIMITED = 'RATE_LIMITED',
  TOO_MANY_ATTEMPTS = 'TOO_MANY_ATTEMPTS',
  
  // Server errors
  SERVER_ERROR = 'SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  
  // Unknown
  UNKNOWN = 'UNKNOWN',
}

/**
 * Biometric error with context
 */
export class BiometricError extends Error {
  constructor(
    public code: BiometricErrorCode,
    public message: string,
    public originalError?: Error,
    public context?: Record<string, any>,
    public userMessage?: string // User-friendly message
  ) {
    super(message);
    this.name = 'BiometricError';
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    return this.userMessage || this.getDefaultUserMessage();
  }

  /**
   * Get default user-friendly message based on error code
   */
  private getDefaultUserMessage(): string {
    const messages: Record<BiometricErrorCode, string> = {
      [BiometricErrorCode.NOT_SUPPORTED]: 'Biometric authentication is not supported on this device.',
      [BiometricErrorCode.NOT_AVAILABLE]: 'Biometric authentication is currently unavailable. Please try again.',
      [BiometricErrorCode.HARDWARE_UNAVAILABLE]: 'Your biometric hardware is not available. Please enable it in settings.',
      [BiometricErrorCode.TIMEOUT]: 'Authentication request timed out. Please try again.',
      [BiometricErrorCode.NOT_ALLOWED]: 'Biometric authentication was not allowed. Please check your permissions.',
      [BiometricErrorCode.NETWORK_ERROR]: 'Network error occurred. Please check your connection and try again.',
      [BiometricErrorCode.CANCELLED]: 'Biometric authentication was cancelled.',
      [BiometricErrorCode.INVALID_STATE]: 'An invalid state was encountered. Please try again.',
      [BiometricErrorCode.CONSTRAINT_ERROR]: 'Biometric constraint error. Please try again.',
      [BiometricErrorCode.DATA_ERROR]: 'Data error occurred during biometric operation.',
      [BiometricErrorCode.OPERATION_ERROR]: 'Operation error occurred. Please try again.',
      [BiometricErrorCode.INVALID_CREDENTIAL]: 'Invalid biometric credential. Please register again.',
      [BiometricErrorCode.CREDENTIAL_MISMATCH]: 'Biometric credential does not match. Please try again.',
      [BiometricErrorCode.VERIFICATION_FAILED]: 'Biometric verification failed. Please try again.',
      [BiometricErrorCode.ATTESTATION_FAILED]: 'Credential attestation failed. This credential may not be trustworthy.',
      [BiometricErrorCode.SESSION_EXPIRED]: 'Your session has expired. Please authenticate again.',
      [BiometricErrorCode.SESSION_INVALID]: 'Your session is invalid. Please authenticate again.',
      [BiometricErrorCode.INSUFFICIENT_PERMISSIONS]: 'You do not have permission to perform this action.',
      [BiometricErrorCode.STORAGE_ERROR]: 'Failed to store credential. Please try again.',
      [BiometricErrorCode.ENCRYPTION_ERROR]: 'Encryption error occurred. Please try again.',
      [BiometricErrorCode.DECRYPTION_ERROR]: 'Failed to decrypt credential. Please try again.',
      [BiometricErrorCode.RATE_LIMITED]: 'Too many attempts. Please wait before trying again.',
      [BiometricErrorCode.TOO_MANY_ATTEMPTS]: 'Too many failed attempts. Please use your PIN to authenticate.',
      [BiometricErrorCode.SERVER_ERROR]: 'Server error occurred. Please try again later.',
      [BiometricErrorCode.DATABASE_ERROR]: 'Database error occurred. Please try again later.',
      [BiometricErrorCode.CONFIGURATION_ERROR]: 'Configuration error occurred. Please contact support.',
      [BiometricErrorCode.UNKNOWN]: 'An unexpected error occurred. Please try again.',
    };

    return messages[this.code] || 'An error occurred during biometric authentication.';
  }

  /**
   * Check if error is recoverable
   */
  isRecoverable(): boolean {
    const recoverableErrors = [
      BiometricErrorCode.TIMEOUT,
      BiometricErrorCode.NOT_AVAILABLE,
      BiometricErrorCode.NETWORK_ERROR,
      BiometricErrorCode.CANCELLED,
      BiometricErrorCode.VERIFICATION_FAILED,
      BiometricErrorCode.CONSTRAINT_ERROR,
      BiometricErrorCode.OPERATION_ERROR,
    ];

    return recoverableErrors.includes(this.code);
  }

  /**
   * Suggest recovery action
   */
  suggestRecovery(): string {
    const suggestions: Record<BiometricErrorCode, string> = {
      [BiometricErrorCode.NOT_SUPPORTED]: 'Use password authentication instead.',
      [BiometricErrorCode.NOT_AVAILABLE]: 'Try again or use PIN authentication.',
      [BiometricErrorCode.HARDWARE_UNAVAILABLE]: 'Enable biometric hardware in device settings.',
      [BiometricErrorCode.TIMEOUT]: 'Try the biometric scan again.',
      [BiometricErrorCode.NOT_ALLOWED]: 'Grant biometric permissions in settings.',
      [BiometricErrorCode.NETWORK_ERROR]: 'Check internet connection and retry.',
      [BiometricErrorCode.CANCELLED]: 'Try biometric authentication again.',
      [BiometricErrorCode.INVALID_STATE]: 'Refresh the page and try again.',
      [BiometricErrorCode.CONSTRAINT_ERROR]: 'Try biometric authentication again.',
      [BiometricErrorCode.DATA_ERROR]: 'Try biometric authentication again.',
      [BiometricErrorCode.OPERATION_ERROR]: 'Try biometric authentication again.',
      [BiometricErrorCode.INVALID_CREDENTIAL]: 'Register a new biometric credential.',
      [BiometricErrorCode.CREDENTIAL_MISMATCH]: 'Try biometric authentication again.',
      [BiometricErrorCode.VERIFICATION_FAILED]: 'Try biometric authentication again or use PIN.',
      [BiometricErrorCode.ATTESTATION_FAILED]: 'Use a different biometric method or PIN.',
      [BiometricErrorCode.SESSION_EXPIRED]: 'Authenticate again to continue.',
      [BiometricErrorCode.SESSION_INVALID]: 'Authenticate again to continue.',
      [BiometricErrorCode.INSUFFICIENT_PERMISSIONS]: 'Contact support for permission changes.',
      [BiometricErrorCode.STORAGE_ERROR]: 'Try again or use PIN authentication.',
      [BiometricErrorCode.ENCRYPTION_ERROR]: 'Try again or use PIN authentication.',
      [BiometricErrorCode.DECRYPTION_ERROR]: 'Try again or use PIN authentication.',
      [BiometricErrorCode.RATE_LIMITED]: 'Wait a few minutes before trying again.',
      [BiometricErrorCode.TOO_MANY_ATTEMPTS]: 'Use your PIN to authenticate instead.',
      [BiometricErrorCode.SERVER_ERROR]: 'Try again later.',
      [BiometricErrorCode.DATABASE_ERROR]: 'Try again later.',
      [BiometricErrorCode.CONFIGURATION_ERROR]: 'Contact support for assistance.',
      [BiometricErrorCode.UNKNOWN]: 'Try again or use alternative authentication.',
    };

    return suggestions[this.code] || 'Please contact support.';
  }

  /**
   * Serialize error for logging
   */
  toJSON() {
    return {
      code: this.code,
      message: this.message,
      userMessage: this.getUserMessage(),
      suggestion: this.suggestRecovery(),
      isRecoverable: this.isRecoverable(),
      context: this.context,
      originalError: this.originalError?.message,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Error recovery strategies
 */
export interface RecoveryStrategy {
  action: 'retry' | 'fallback' | 'refresh' | 'redirect';
  delay?: number; // ms to wait before retry
  maxAttempts?: number;
  redirectTo?: string;
}

/**
 * Get recovery strategy for error code
 */
export function getRecoveryStrategy(code: BiometricErrorCode): RecoveryStrategy {
  const strategies: Record<BiometricErrorCode, RecoveryStrategy> = {
    [BiometricErrorCode.NOT_SUPPORTED]: { action: 'fallback' },
    [BiometricErrorCode.NOT_AVAILABLE]: { action: 'retry', delay: 1000, maxAttempts: 3 },
    [BiometricErrorCode.HARDWARE_UNAVAILABLE]: { action: 'fallback' },
    [BiometricErrorCode.TIMEOUT]: { action: 'retry', delay: 500, maxAttempts: 2 },
    [BiometricErrorCode.NOT_ALLOWED]: { action: 'redirect', redirectTo: '/settings/biometric' },
    [BiometricErrorCode.NETWORK_ERROR]: { action: 'retry', delay: 2000, maxAttempts: 3 },
    [BiometricErrorCode.CANCELLED]: { action: 'retry' },
    [BiometricErrorCode.INVALID_STATE]: { action: 'refresh' },
    [BiometricErrorCode.CONSTRAINT_ERROR]: { action: 'retry', delay: 500, maxAttempts: 2 },
    [BiometricErrorCode.DATA_ERROR]: { action: 'retry', delay: 500, maxAttempts: 2 },
    [BiometricErrorCode.OPERATION_ERROR]: { action: 'retry', delay: 500, maxAttempts: 2 },
    [BiometricErrorCode.INVALID_CREDENTIAL]: { action: 'redirect', redirectTo: '/settings/biometric' },
    [BiometricErrorCode.CREDENTIAL_MISMATCH]: { action: 'retry', delay: 1000, maxAttempts: 2 },
    [BiometricErrorCode.VERIFICATION_FAILED]: { action: 'retry', delay: 1000, maxAttempts: 2 },
    [BiometricErrorCode.ATTESTATION_FAILED]: { action: 'fallback' },
    [BiometricErrorCode.SESSION_EXPIRED]: { action: 'redirect', redirectTo: '/login' },
    [BiometricErrorCode.SESSION_INVALID]: { action: 'redirect', redirectTo: '/login' },
    [BiometricErrorCode.INSUFFICIENT_PERMISSIONS]: { action: 'redirect', redirectTo: '/login' },
    [BiometricErrorCode.STORAGE_ERROR]: { action: 'fallback' },
    [BiometricErrorCode.ENCRYPTION_ERROR]: { action: 'fallback' },
    [BiometricErrorCode.DECRYPTION_ERROR]: { action: 'fallback' },
    [BiometricErrorCode.RATE_LIMITED]: { action: 'retry', delay: 30000, maxAttempts: 1 },
    [BiometricErrorCode.TOO_MANY_ATTEMPTS]: { action: 'fallback' },
    [BiometricErrorCode.SERVER_ERROR]: { action: 'retry', delay: 3000, maxAttempts: 2 },
    [BiometricErrorCode.DATABASE_ERROR]: { action: 'retry', delay: 3000, maxAttempts: 2 },
    [BiometricErrorCode.CONFIGURATION_ERROR]: { action: 'redirect', redirectTo: '/support' },
    [BiometricErrorCode.UNKNOWN]: { action: 'fallback' },
  };

  return strategies[code] || { action: 'fallback' };
}

/**
 * Map WebAuthn DOMException to BiometricErrorCode
 */
export function mapWebAuthnError(error: unknown): BiometricErrorCode {
  if (error instanceof DOMException) {
    switch (error.name) {
      case 'NotSupportedError':
        return BiometricErrorCode.NOT_SUPPORTED;
      case 'InvalidStateError':
        return BiometricErrorCode.INVALID_STATE;
      case 'NetworkError':
        return BiometricErrorCode.NETWORK_ERROR;
      case 'TimeoutError':
        return BiometricErrorCode.TIMEOUT;
      case 'NotAllowedError':
        return BiometricErrorCode.NOT_ALLOWED;
      case 'AbortError':
        return BiometricErrorCode.CANCELLED;
      case 'SecurityError':
        return BiometricErrorCode.NOT_ALLOWED;
      case 'UnknownError':
        return BiometricErrorCode.UNKNOWN;
      default:
        return BiometricErrorCode.UNKNOWN;
    }
  }

  if (error instanceof Error) {
    if (error.message.includes('timeout')) {
      return BiometricErrorCode.TIMEOUT;
    }
    if (error.message.includes('network')) {
      return BiometricErrorCode.NETWORK_ERROR;
    }
  }

  return BiometricErrorCode.UNKNOWN;
}

/**
 * Create BiometricError from various error types
 */
export function createBiometricError(
  error: unknown,
  defaultCode: BiometricErrorCode = BiometricErrorCode.UNKNOWN,
  context?: Record<string, any>
): BiometricError {
  if (error instanceof BiometricError) {
    return error;
  }

  if (error instanceof DOMException) {
    const code = mapWebAuthnError(error);
    return new BiometricError(code, error.message, error, context);
  }

  if (error instanceof Error) {
    return new BiometricError(defaultCode, error.message, error, context);
  }

  return new BiometricError(
    defaultCode,
    String(error),
    undefined,
    context
  );
}

/**
 * Error logger for auditing
 */
export interface BiometricErrorLog {
  timestamp: Date;
  code: BiometricErrorCode;
  message: string;
  userId?: string;
  operation: string;
  context?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log biometric error for audit trail
 */
export async function logBiometricError(
  error: BiometricError,
  userId: string | undefined,
  operation: string
): Promise<void> {
  try {
    const log: BiometricErrorLog = {
      timestamp: new Date(),
      code: error.code,
      message: error.message,
      userId,
      operation,
      context: error.context,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    };

    // Send to backend for persistent logging
    await fetch('/api/biometric/errors/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(log),
    }).catch((err) => {
      console.error('Failed to log biometric error:', err);
    });
  } catch (err) {
    console.error('Error logging biometric error:', err);
  }
}
