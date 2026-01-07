/**
 * Secure Storage & Token Management
 * Handles encrypted storage of biometric credentials and session tokens
 */

import crypto from 'crypto';

export interface SecureStorageOptions {
  algorithm?: string;
  encoding?: BufferEncoding;
  keyDerivation?: 'pbkdf2' | 'scrypt';
}

/**
 * Secure storage for sensitive tokens
 */
export class SecureStorageService {
  private algorithm = 'aes-256-gcm';
  private keyDerivation = 'pbkdf2';
  private iterations = 100000;
  private saltLength = 16;
  private ivLength = 12;
  private tagLength = 16;

  /**
   * Encrypt data with AES-256-GCM
   */
  encryptToken(data: string, password: string): string {
    try {
      // Generate salt
      const salt = crypto.randomBytes(this.saltLength);

      // Derive key from password
      const key = crypto.pbkdf2Sync(
        password,
        salt,
        this.iterations,
        32, // 256 bits for AES-256
        'sha256'
      );

      // Generate IV
      const iv = crypto.randomBytes(this.ivLength);

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, key, iv) as any;

      // Encrypt data
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get auth tag
      const authTag = cipher.getAuthTag();

      // Combine: salt + iv + tag + encrypted
      const combined = Buffer.concat([salt, iv, authTag, Buffer.from(encrypted, 'hex')]);

      // Return as base64
      return combined.toString('base64');
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypt data with AES-256-GCM
   */
  decryptToken(encrypted: string, password: string): string {
    try {
      // Decode from base64
      const combined = Buffer.from(encrypted, 'base64');

      // Extract components
      const salt = combined.slice(0, this.saltLength);
      const iv = combined.slice(this.saltLength, this.saltLength + this.ivLength);
      const authTag = combined.slice(
        this.saltLength + this.ivLength,
        this.saltLength + this.ivLength + this.tagLength
      );
      const encryptedData = combined.slice(this.saltLength + this.ivLength + this.tagLength);

      // Derive key
      const key = crypto.pbkdf2Sync(
        password,
        salt,
        this.iterations,
        32,
        'sha256'
      );

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv) as any;
      decipher.setAuthTag(authTag);

      // Decrypt
      let decrypted = decipher.update(encryptedData.toString('hex'), 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Hash password with bcrypt-style hashing
   */
  hashPassword(password: string, salt?: string): string {
    const saltBytes = salt ? Buffer.from(salt, 'base64') : crypto.randomBytes(16);
    const hash = crypto.pbkdf2Sync(password, saltBytes, this.iterations, 32, 'sha256');
    return Buffer.concat([saltBytes, hash]).toString('base64');
  }

  /**
   * Verify hashed password
   */
  verifyPassword(password: string, hash: string): boolean {
    try {
      const combined = Buffer.from(hash, 'base64');
      const salt = combined.slice(0, 16);
      const hashToVerify = combined.slice(16);

      const newHash = crypto.pbkdf2Sync(password, salt, this.iterations, 32, 'sha256');
      return crypto.timingSafeEqual(hashToVerify, newHash);
    } catch {
      return false;
    }
  }
}

/**
 * Session storage with encryption
 */
export class SessionStorageService {
  private storage: SecureStorageService;
  private prefix = 'triumph_session_';

  constructor(storage?: SecureStorageService) {
    this.storage = storage || new SecureStorageService();
  }

  /**
   * Store encrypted session token
   */
  storeSessionToken(sessionId: string, token: string, password: string): void {
    if (typeof localStorage === 'undefined') {
      console.warn('localStorage not available');
      return;
    }

    const encrypted = this.storage.encryptToken(token, password);
    localStorage.setItem(this.prefix + sessionId, encrypted);
  }

  /**
   * Retrieve and decrypt session token
   */
  getSessionToken(sessionId: string, password: string): string | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    const encrypted = localStorage.getItem(this.prefix + sessionId);
    if (!encrypted) {
      return null;
    }

    try {
      return this.storage.decryptToken(encrypted, password);
    } catch {
      console.error('Failed to decrypt session token');
      this.clearSessionToken(sessionId);
      return null;
    }
  }

  /**
   * Clear session token
   */
  clearSessionToken(sessionId: string): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.removeItem(this.prefix + sessionId);
  }

  /**
   * Clear all session tokens
   */
  clearAllSessionTokens(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key);
      }
    });
  }

  /**
   * Check if session exists
   */
  hasSession(sessionId: string): boolean {
    if (typeof localStorage === 'undefined') {
      return false;
    }

    return localStorage.getItem(this.prefix + sessionId) !== null;
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): string[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }

    const sessions: string[] = [];
    const keys = Object.keys(localStorage);

    keys.forEach((key) => {
      if (key.startsWith(this.prefix)) {
        const sessionId = key.slice(this.prefix.length);
        sessions.push(sessionId);
      }
    });

    return sessions;
  }
}

/**
 * Credential storage for local caching
 */
export class CredentialStorageService {
  private prefix = 'triumph_cred_';
  private ttl = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Store credential metadata (non-sensitive)
   */
  storeCredentialMetadata(credentialId: string, metadata: Record<string, any>): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    const data = {
      ...metadata,
      storedAt: Date.now(),
    };

    localStorage.setItem(this.prefix + credentialId, JSON.stringify(data));
  }

  /**
   * Get credential metadata
   */
  getCredentialMetadata(credentialId: string): Record<string, any> | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    const stored = localStorage.getItem(this.prefix + credentialId);
    if (!stored) {
      return null;
    }

    try {
      const data = JSON.parse(stored);

      // Check TTL
      if (Date.now() - data.storedAt > this.ttl) {
        this.clearCredentialMetadata(credentialId);
        return null;
      }

      return data;
    } catch {
      console.error('Failed to parse credential metadata');
      return null;
    }
  }

  /**
   * Clear credential metadata
   */
  clearCredentialMetadata(credentialId: string): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.removeItem(this.prefix + credentialId);
  }

  /**
   * Clear all credential metadata
   */
  clearAllCredentialMetadata(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key);
      }
    });
  }
}

// Singleton instances
let secureStorageInstance: SecureStorageService;
let sessionStorageInstance: SessionStorageService;
let credentialStorageInstance: CredentialStorageService;

export function getSecureStorage(): SecureStorageService {
  if (!secureStorageInstance) {
    secureStorageInstance = new SecureStorageService();
  }
  return secureStorageInstance;
}

export function getSessionStorage(): SessionStorageService {
  if (!sessionStorageInstance) {
    sessionStorageInstance = new SessionStorageService();
  }
  return sessionStorageInstance;
}

export function getCredentialStorage(): CredentialStorageService {
  if (!credentialStorageInstance) {
    credentialStorageInstance = new CredentialStorageService();
  }
  return credentialStorageInstance;
}
