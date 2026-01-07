/**
 * Biometric Configuration
 * Central configuration for all biometric authentication settings
 */

// Type definitions for WebAuthn (defined first)
export type AuthenticatorTransport = 'usb' | 'nfc' | 'ble' | 'internal' | 'hybrid' | 'platform';
export type AttestationConveyanceFormat = 'direct' | 'indirect' | 'none' | 'enterprise';
export type AuthenticatorAttachment = 'platform' | 'cross-platform';
export type ResidentKeyRequirement = 'discouraged' | 'preferred' | 'required';

// Configuration object
export const BIOMETRIC_CONFIG = {
  webAuthn: {
    rp: {
      name: 'Triumph Synergy',
      id: typeof window !== 'undefined' 
        ? window.location.hostname 
        : process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost',
    },
  },
  registration: {
    timeout: 60000,
    attachmentMode: 'platform' as AuthenticatorAttachment,
    residentKey: 'preferred' as ResidentKeyRequirement,
  },
  authentication: {
    timeout: 60000,
  },
  securityPolicy: {
    lockoutAfterFailed: 5,
    lockoutDuration: 15 * 60 * 1000,
    forceRepromptAfter: 10,
  },
  tokens: {
    access: {
      duration: 60 * 60 * 1000,
    },
    refresh: {
      duration: 7 * 24 * 60 * 60 * 1000,
    },
    biometricSession: {
      duration: 30 * 60 * 1000,
    },
  },
  fallback: {
    pin: {
      length: 4,
    },
    password: {
      minLength: 8,
    },
    otp: {
      length: 6,
    },
  },
  biometricTypes: {
    fingerprint: 'Fingerprint',
    faceId: 'Face ID',
    windowsHello: 'Windows Hello',
    securityKey: 'Security Key',
  },
  errors: {
    BIOMETRIC_NOT_AVAILABLE: 'Biometric authentication is not available on this device',
    BIOMETRIC_NOT_ENROLLED: 'No biometric data enrolled on this device',
    REGISTRATION_FAILED: 'Failed to register biometric credential',
    AUTHENTICATION_FAILED: 'Biometric authentication failed',
    MAX_ATTEMPTS_EXCEEDED: 'Too many failed attempts',
    SESSION_EXPIRED: 'Session has expired',
    INVALID_CHALLENGE: 'Invalid authentication challenge',
  },
};

// Interface definitions
export interface BiometricCredential {
  id: string;
  userId: string;
  credentialId: ArrayBuffer;
  publicKey: ArrayBuffer;
  signCount: number;
  transports: AuthenticatorTransport[];
  type: string;
  biometricType: keyof typeof BIOMETRIC_CONFIG.biometricTypes;
  createdAt: Date;
  lastUsed: Date;
  isBackup: boolean;
}

export interface BiometricRegistrationOptions {
  userId: string;
  userName: string;
  userEmail: string;
  displayName: string;
  biometricType?: keyof typeof BIOMETRIC_CONFIG.biometricTypes;
}

export interface BiometricAuthenticationOptions {
  userId: string;
  credentialId?: string;
}

export interface BiometricSession {
  userId: string;
  sessionId: string;
  credentialId: string;
  biometricType: keyof typeof BIOMETRIC_CONFIG.biometricTypes;
  authenticated: boolean;
  operationCount: number;
  lastOperationTime: Date;
  expiresAt: Date;
  requiresReverification: boolean;
}

export interface SecureToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  scope: string;
  biometricRequired: boolean;
}

export interface BiometricError {
  code: keyof typeof BIOMETRIC_CONFIG.errors;
  message: string;
  details?: Record<string, any>;
  recoverable: boolean;
  suggestedAction: string;
}

export interface FallbackAuthOptions {
  method: 'pin' | 'password' | 'otp' | 'security_question';
  value: string;
  question?: string;
}

export interface PlatformBiometricConfig {
  platform: string;
  biometricTypes: string[];
  supports: {
    registration: boolean;
    authentication: boolean;
    conditionalUI: boolean;
  };
}

// Utility functions
export function generateChallenge(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

export function encodeArrayBuffer(buffer: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buffer.byteLength; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function decodeBase64Url(str: string): Uint8Array {
  const binary = atob(
    str
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(str.length + (4 - (str.length % 4)) % 4, '=')
  );
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function bufferToHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function detectBiometricTypes(): (keyof typeof BIOMETRIC_CONFIG.biometricTypes)[] {
  const types: (keyof typeof BIOMETRIC_CONFIG.biometricTypes)[] = [];

  if (typeof window === 'undefined') return types;

  const ua = navigator.userAgent.toLowerCase();

  if (ua.includes('windows')) {
    types.push('windowsHello');
  } else if (ua.includes('mac')) {
    types.push('faceId');
  }

  if (navigator.maxTouchPoints > 0) {
    types.push('fingerprint');
  }

  types.push('securityKey');

  return types;
}

export function getPlatformConfig(): PlatformBiometricConfig | null {
  if (typeof window === 'undefined') return null;

  const ua = navigator.userAgent.toLowerCase();
  let platform = 'unknown';

  if (ua.includes('windows')) platform = 'windows';
  else if (ua.includes('mac')) platform = 'macos';
  else if (ua.includes('linux')) platform = 'linux';
  else if (ua.includes('iphone') || ua.includes('ipad')) platform = 'ios';
  else if (ua.includes('android')) platform = 'android';

  const biometricTypes = detectBiometricTypes();

  return {
    platform,
    biometricTypes,
    supports: {
      registration: biometricTypes.length > 0,
      authentication: biometricTypes.length > 0,
      conditionalUI: platform === 'macos' || platform === 'windows' || platform === 'ios',
    },
  };
}
