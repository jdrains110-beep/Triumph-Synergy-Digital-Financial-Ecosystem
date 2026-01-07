/**
 * Biometric Authentication Manager
 * Handles WebAuthn registration, authentication, and credential management
 * 
 * NOTE: This is a reference implementation. Production deployment requires
 * proper database integration and cryptographic verification.
 */

import {
  BIOMETRIC_CONFIG,
  generateChallenge,
  BiometricCredential,
  BiometricRegistrationOptions,
  BiometricSession,
  SecureToken,
  BiometricError,
  FallbackAuthOptions,
} from "./biometric-config";

export class BiometricManager {
  private static instance: BiometricManager;
  private sessions: Map<string, BiometricSession> = new Map();
  private credentials: Map<string, BiometricCredential> = new Map();
  private failedAttempts: Map<string, number> = new Map();
  private lockedUsers: Map<string, Date> = new Map();

  private constructor() {
    this.initializeSessionCleanup();
  }

  static getInstance(): BiometricManager {
    if (!BiometricManager.instance) {
      BiometricManager.instance = new BiometricManager();
    }
    return BiometricManager.instance;
  }

  private initializeSessionCleanup(): void {
    if (typeof window === "undefined") return;

    setInterval(() => {
      const now = new Date();
      for (const [sessionId, session] of this.sessions.entries()) {
        if (session.expiresAt < now) {
          this.sessions.delete(sessionId);
        }
      }
    }, 60000);
  }

  async registerCredential(
    options: BiometricRegistrationOptions
  ): Promise<{
    challengeId: string;
    publicKey: any;
  }> {
    if (this.isUserLockedOut(options.userId)) {
      throw this.createError(
        "MAX_ATTEMPTS_EXCEEDED",
        "Too many failed attempts. Please try again later.",
        false
      );
    }

    try {
      const challenge = generateChallenge();
      const challengeId = `challenge_${Date.now()}_${Math.random().toString(36)}`;

      const registrationOptions: any = {
        challenge: challenge,
        rp: {
          name: BIOMETRIC_CONFIG.webAuthn.rp.name,
          id: BIOMETRIC_CONFIG.webAuthn.rp.id,
        },
        user: {
          id: new TextEncoder().encode(options.userId),
          name: options.userName,
          displayName: options.displayName || options.userEmail,
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" },
          { alg: -257, type: "public-key" },
        ],
        timeout: BIOMETRIC_CONFIG.registration.timeout,
        attestation: "direct" as const,
        authenticatorSelection: {
          authenticatorAttachment: BIOMETRIC_CONFIG.registration.attachmentMode,
          userVerification: "preferred",
          residentKey: BIOMETRIC_CONFIG.registration.residentKey,
        },
      };

      return {
        challengeId,
        publicKey: registrationOptions,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw this.createError(
        "REGISTRATION_FAILED",
        message,
        true
      );
    }
  }

  async completeRegistration(
    userId: string,
    attestationResponse: any,
    biometricType?: string
  ): Promise<BiometricCredential> {
    try {
      const credential: BiometricCredential = {
        id: `cred_${Date.now()}`,
        userId,
        credentialId: new ArrayBuffer(0),
        publicKey: new ArrayBuffer(0),
        signCount: 0,
        transports: [],
        type: "public-key",
        biometricType: "fingerprint",
        createdAt: new Date(),
        lastUsed: new Date(),
        isBackup: false,
      };

      this.credentials.set(credential.id, credential);
      this.failedAttempts.set(userId, 0);

      return credential;
    } catch (error) {
      this.incrementFailedAttempts(userId);
      const message = error instanceof Error ? error.message : String(error);
      throw this.createError(
        "REGISTRATION_FAILED",
        `Failed to complete registration: ${message}`,
        true
      );
    }
  }

  async getAuthenticationChallenge(
    userId?: string
  ): Promise<{
    challengeId: string;
    publicKey: any;
  }> {
    if (userId && this.isUserLockedOut(userId)) {
      throw this.createError(
        "MAX_ATTEMPTS_EXCEEDED",
        "Too many failed attempts. Please try again later.",
        false
      );
    }

    try {
      const challenge = generateChallenge();
      const challengeId = `challenge_${Date.now()}_${Math.random().toString(36)}`;

      const authenticationOptions: any = {
        challenge: challenge,
        timeout: BIOMETRIC_CONFIG.authentication.timeout,
        rpId: BIOMETRIC_CONFIG.webAuthn.rp.id,
        userVerification: "preferred",
        allowCredentials: [],
      };

      return {
        challengeId,
        publicKey: authenticationOptions,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw this.createError(
        "INVALID_CHALLENGE",
        message,
        true
      );
    }
  }

  async verifyAuthentication(
    userId: string,
    assertionResponse: any
  ): Promise<{
    session: BiometricSession;
    token: SecureToken;
  }> {
    try {
      const session: BiometricSession = {
        userId,
        sessionId: `session_${Date.now()}`,
        credentialId: "default",
        biometricType: "fingerprint",
        authenticated: true,
        operationCount: 0,
        lastOperationTime: new Date(),
        expiresAt: new Date(
          Date.now() + BIOMETRIC_CONFIG.tokens.biometricSession.duration
        ),
        requiresReverification: false,
      };

      this.sessions.set(session.sessionId, session);

      const token: SecureToken = {
        accessToken: this.generateAccessToken(userId, session.sessionId),
        refreshToken: this.generateRefreshToken(userId),
        expiresIn: BIOMETRIC_CONFIG.tokens.access.duration / 1000,
        tokenType: "Bearer",
        scope: "biometric:verified",
        biometricRequired: true,
      };

      this.failedAttempts.set(userId, 0);

      return { session, token };
    } catch (error) {
      this.incrementFailedAttempts(userId);
      const message = error instanceof Error ? error.message : String(error);
      throw this.createError(
        "AUTHENTICATION_FAILED",
        message,
        true
      );
    }
  }

  async handleFallbackAuth(
    userId: string,
    options: FallbackAuthOptions
  ): Promise<{
    session: BiometricSession;
    token: SecureToken;
  }> {
    if (this.isUserLockedOut(userId)) {
      throw this.createError(
        "MAX_ATTEMPTS_EXCEEDED",
        "Too many failed attempts. Please try again later.",
        false
      );
    }

    try {
      const session: BiometricSession = {
        userId,
        sessionId: `session_${Date.now()}_fallback`,
        credentialId: "fallback",
        biometricType: "fingerprint",
        authenticated: true,
        operationCount: 0,
        lastOperationTime: new Date(),
        expiresAt: new Date(
          Date.now() + BIOMETRIC_CONFIG.tokens.biometricSession.duration / 2
        ),
        requiresReverification: true,
      };

      this.sessions.set(session.sessionId, session);

      const token: SecureToken = {
        accessToken: this.generateAccessToken(userId, session.sessionId),
        refreshToken: this.generateRefreshToken(userId),
        expiresIn: BIOMETRIC_CONFIG.tokens.access.duration / 1000,
        tokenType: "Bearer",
        scope: "fallback:verified",
        biometricRequired: true,
      };

      this.failedAttempts.set(userId, 0);

      return { session, token };
    } catch (error) {
      this.incrementFailedAttempts(userId);
      const message = error instanceof Error ? error.message : String(error);
      throw this.createError(
        "AUTHENTICATION_FAILED",
        message,
        true
      );
    }
  }

  verifySession(sessionId: string): BiometricSession | null {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return null;
    }

    if (session.expiresAt < new Date()) {
      this.sessions.delete(sessionId);
      return null;
    }

    if (
      session.operationCount >= BIOMETRIC_CONFIG.securityPolicy.forceRepromptAfter
    ) {
      session.requiresReverification = true;
    }

    return session;
  }

  recordOperation(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.operationCount++;
      session.lastOperationTime = new Date();
    }
  }

  getUserCredentials(userId: string): BiometricCredential[] {
    return Array.from(this.credentials.values()).filter(
      (c) => c.userId === userId
    );
  }

  removeCredential(userId: string, credentialId: string): boolean {
    const credential = Array.from(this.credentials.values()).find(
      (c) => c.userId === userId && c.id === credentialId
    );

    if (credential) {
      this.credentials.delete(credentialId);
      return true;
    }

    return false;
  }

  private isUserLockedOut(userId: string): boolean {
    const lockoutTime = this.lockedUsers.get(userId);
    if (!lockoutTime) return false;

    if (new Date() > lockoutTime) {
      this.lockedUsers.delete(userId);
      return false;
    }

    return true;
  }

  private incrementFailedAttempts(userId: string): void {
    const attempts = (this.failedAttempts.get(userId) || 0) + 1;
    this.failedAttempts.set(userId, attempts);

    if (attempts >= BIOMETRIC_CONFIG.securityPolicy.lockoutAfterFailed) {
      const lockoutTime = new Date(
        Date.now() + BIOMETRIC_CONFIG.securityPolicy.lockoutDuration
      );
      this.lockedUsers.set(userId, lockoutTime);
    }
  }

  private generateAccessToken(userId: string, sessionId: string): string {
    const header = btoa(
      JSON.stringify({
        alg: "HS256",
        typ: "JWT",
        biometric: true,
      })
    );

    const payload = btoa(
      JSON.stringify({
        sub: userId,
        sid: sessionId,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(
          (Date.now() + BIOMETRIC_CONFIG.tokens.access.duration) / 1000
        ),
        aud: "triumph-synergy",
        scope: "biometric:verified",
      })
    );

    const signature = btoa(
      `${header}.${payload}.signature`
    );

    return `${header}.${payload}.${signature}`;
  }

  private generateRefreshToken(userId: string): string {
    return btoa(
      JSON.stringify({
        sub: userId,
        type: "refresh",
        iat: Date.now(),
        exp: Date.now() + BIOMETRIC_CONFIG.tokens.refresh.duration,
      })
    );
  }

  private createError(
    code: keyof typeof BIOMETRIC_CONFIG.errors,
    details?: string,
    recoverable: boolean = true
  ): BiometricError {
    return {
      code,
      message: BIOMETRIC_CONFIG.errors[code],
      details: details ? { originalError: details } : undefined,
      recoverable,
      suggestedAction: this.getSuggestedAction(code),
    };
  }

  private getSuggestedAction(
    code: keyof typeof BIOMETRIC_CONFIG.errors
  ): string {
    switch (code) {
      case "BIOMETRIC_NOT_AVAILABLE":
        return "Use fallback authentication method";
      case "BIOMETRIC_NOT_ENROLLED":
        return "Enroll biometric data in device settings";
      case "REGISTRATION_FAILED":
        return "Try registering again with a different biometric";
      case "AUTHENTICATION_FAILED":
        return "Try again or use fallback authentication";
      case "MAX_ATTEMPTS_EXCEEDED":
        return "Wait before trying again";
      case "SESSION_EXPIRED":
        return "Authenticate again";
      default:
        return "Try again later";
    }
  }

  clear(): void {
    this.sessions.clear();
    this.credentials.clear();
    this.failedAttempts.clear();
    this.lockedUsers.clear();
  }
}

export const biometricManager = BiometricManager.getInstance();

  /**
   * Initialize periodic cleanup of expired sessions
   */
  private initializeSessionCleanup(): void {
    if (typeof window === "undefined") return;

    setInterval(() => {
      const now = new Date();
      for (const [sessionId, session] of this.sessions.entries()) {
        if (session.expiresAt < now) {
          this.sessions.delete(sessionId);
        }
      }
    }, 60000); // Check every minute
  }

  /**
   * Register new biometric credential
   */
  async registerCredential(
    options: BiometricRegistrationOptions
  ): Promise<{
    challengeId: string;
    publicKey: any;
  }> {
    // Check if user is locked out
    if (this.isUserLockedOut(options.userId)) {
      throw this.createError(
        "MAX_ATTEMPTS_EXCEEDED",
        "Too many failed attempts. Please try again later.",
        false
      );
    }

    try {
      const challenge = generateChallenge();
      const challengeId = `challenge_${Date.now()}_${Math.random().toString(36)}`;

      // Store challenge temporarily (should be stored in Redis/DB)
      const registrationOptions: any = {
        challenge: challenge,
        rp: {
          name: BIOMETRIC_CONFIG.webAuthn.rp.name,
          id: BIOMETRIC_CONFIG.webAuthn.rp.id,
        },
        user: {
          id: new TextEncoder().encode(options.userId),
          name: options.userName,
          displayName: options.displayName || options.userEmail,
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" }, // ES256
          { alg: -257, type: "public-key" }, // RS256
        ],
        timeout: BIOMETRIC_CONFIG.registration.timeout,
        attestation: "direct",
        authenticatorSelection: {
          authenticatorAttachment: BIOMETRIC_CONFIG.registration.attachmentMode,
          userVerification: "preferred",
          residentKey: BIOMETRIC_CONFIG.registration.residentKey,
        },
        signal: new AbortController().signal,
      };

      return {
        challengeId,
        publicKey: registrationOptions,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw this.createError(
        "REGISTRATION_FAILED",
        message,
        true
      );
    }
  }

  /**
   * Complete credential registration
   */
  async completeRegistration(
    userId: string,
    attestationResponse: PublicKeyCredential,
    biometricType?: keyof typeof BIOMETRIC_CONFIG.biometricTypes
  ): Promise<BiometricCredential> {
    try {
      const response = attestationResponse.response as AuthenticatorAttestationResponse;

      if (!response.getTransports || !response.getPublicKey) {
        throw new Error("Invalid attestation response");
      }

      const credentialId = bufferToHex(
        attestationResponse.rawId
      );
      const transports = response.getTransports?.() || [];
      const publicKey = response.getPublicKey();

      if (!publicKey) {
        throw new Error("Failed to extract public key");
      }

      const credential: BiometricCredential = {
        id: `cred_${Date.now()}`,
        userId,
        credentialId: attestationResponse.rawId as ArrayBuffer,
        publicKey: publicKey as ArrayBuffer,
        signCount: response.getTransports?.length || 0,
        transports: transports || [],
        type: BIOMETRIC_CONFIG.registration.attachmentMode,
        biometricType: biometricType || "fingerprint",
        createdAt: new Date(),
        lastUsed: new Date(),
        isBackup: false,
      };

      // Store credential (should be stored in DB)
      this.credentials.set(credential.id, credential);

      // Reset failed attempts
      this.failedAttempts.set(userId, 0);

      return credential;
    } catch (error) {
      this.incrementFailedAttempts(userId);
      const message = error instanceof Error ? error.message : String(error);
      throw this.createError(
        "REGISTRATION_FAILED",
        `Failed to complete registration: ${message}`,
        true
      );
    }
  }

  /**
   * Get authentication challenge
   */
  async getAuthenticationChallenge(
    userId?: string
  ): Promise<{
    challengeId: string;
    publicKey: any;
  }> {
    // Check if user is locked out
    if (userId && this.isUserLockedOut(userId)) {
      throw this.createError(
        "MAX_ATTEMPTS_EXCEEDED",
        "Too many failed attempts. Please try again later.",
        false
      );
    }

    try {
      const challenge = generateChallenge();
      const challengeId = `challenge_${Date.now()}_${Math.random().toString(36)}`;

      const allowedCredentials = userId
        ? Array.from(this.credentials.values())
            .filter((c) => c.userId === userId)
            .map((c) => ({
              type: "public-key" as const,
              id: c.credentialId,
              transports: (c.transports || []) as AuthenticatorTransport[],
            }))
        : [];

      const authenticationOptions: any = {
        challenge: challenge,
        timeout: BIOMETRIC_CONFIG.authentication.timeout,
        rpId: BIOMETRIC_CONFIG.webAuthn.rp.id,
        userVerification: "preferred",
        allowCredentials: allowedCredentials,
        signal: new AbortController().signal,
      };

      return {
        challengeId,
        publicKey: authenticationOptions,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw this.createError(
        "INVALID_CHALLENGE",
        message,
        true
      );
    }
  }

  /**
   * Verify authentication response
   */
  async verifyAuthentication(
    userId: string,
    assertionResponse: PublicKeyCredential
  ): Promise<{
    session: BiometricSession;
    token: SecureToken;
  }> {
    try {
      // Find matching credential
      const userCredentials = Array.from(this.credentials.values()).filter(
        (c) => c.userId === userId
      );

      if (userCredentials.length === 0) {
        throw new Error("No biometric credentials found");
      }

      const response = assertionResponse.response as AuthenticatorAssertionResponse;
      const credentialId = bufferToHex(assertionResponse.rawId);

      // Find matching credential by ID
      let credential = userCredentials.find((c) => bufferToHex(c.credentialId) === credentialId);

      if (!credential && userCredentials.length > 0) {
        credential = userCredentials[0]; // Fallback to first credential
      }

      if (!credential) {
        throw new Error("Credential not found");
      }

      // Update sign count and last used
      credential.signCount++;
      credential.lastUsed = new Date();

      // Create biometric session
      const session: BiometricSession = {
        userId,
        sessionId: `session_${Date.now()}`,
        credentialId: credential.id,
        biometricType: credential.biometricType,
        authenticated: true,
        operationCount: 0,
        lastOperationTime: new Date(),
        expiresAt: new Date(
          Date.now() + BIOMETRIC_CONFIG.tokens.biometricSession.duration
        ),
        requiresReverification: false,
      };

      this.sessions.set(session.sessionId, session);

      // Generate secure token
      const token: SecureToken = {
        accessToken: this.generateAccessToken(userId, session.sessionId),
        refreshToken: this.generateRefreshToken(userId),
        expiresIn: BIOMETRIC_CONFIG.tokens.access.duration / 1000,
        tokenType: "Bearer",
        scope: "biometric:verified",
        biometricRequired: true,
      };

      // Reset failed attempts
      this.failedAttempts.set(userId, 0);

      return { session, token };
    } catch (error) {
      this.incrementFailedAttempts(userId);
      const message = error instanceof Error ? error.message : String(error);
      throw this.createError(
        "AUTHENTICATION_FAILED",
        message,
        true
      );
    }
  }

  /**
   * Handle fallback authentication (PIN, password, OTP)
   */
  async handleFallbackAuth(
    userId: string,
    options: FallbackAuthOptions
  ): Promise<{
    session: BiometricSession;
    token: SecureToken;
  }> {
    // Check if user is locked out
    if (this.isUserLockedOut(userId)) {
      throw this.createError(
        "MAX_ATTEMPTS_EXCEEDED",
        "Too many failed attempts. Please try again later.",
        false
      );
    }

    try {
      switch (options.method) {
        case "pin":
          if (options.value.length !== BIOMETRIC_CONFIG.fallback.pin.length) {
            throw new Error("Invalid PIN length");
          }
          // Validate PIN against stored hash
          break;

        case "password":
          if (options.value.length < BIOMETRIC_CONFIG.fallback.password.minLength) {
            throw new Error("Invalid password");
          }
          // Validate password against stored hash
          break;

        case "otp":
          if (options.value.length !== BIOMETRIC_CONFIG.fallback.otp.length) {
            throw new Error("Invalid OTP length");
          }
          // Validate OTP expiration
          break;

        case "security_question":
          // Validate security question answer
          break;
      }

      // Create fallback session
      const session: BiometricSession = {
        userId,
        sessionId: `session_${Date.now()}_fallback`,
        credentialId: "fallback",
        biometricType: "fingerprint",
        authenticated: true,
        operationCount: 0,
        lastOperationTime: new Date(),
        expiresAt: new Date(
          Date.now() + BIOMETRIC_CONFIG.tokens.biometricSession.duration / 2
        ), // Shorter duration for fallback
        requiresReverification: true,
      };

      this.sessions.set(session.sessionId, session);

      const token: SecureToken = {
        accessToken: this.generateAccessToken(userId, session.sessionId),
        refreshToken: this.generateRefreshToken(userId),
        expiresIn: BIOMETRIC_CONFIG.tokens.access.duration / 1000,
        tokenType: "Bearer",
        scope: "fallback:verified",
        biometricRequired: true,
      };

      this.failedAttempts.set(userId, 0);

      return { session, token };
    } catch (error) {
      this.incrementFailedAttempts(userId);
      const message = error instanceof Error ? error.message : String(error);
      throw this.createError(
        "AUTHENTICATION_FAILED",
        message,
        true
      );
    }
  }

  /**
   * Verify biometric session is still valid
   */
  verifySession(sessionId: string): BiometricSession | null {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return null;
    }

    if (session.expiresAt < new Date()) {
      this.sessions.delete(sessionId);
      return null;
    }

    // Check if re-verification is needed
    if (
      session.operationCount >= BIOMETRIC_CONFIG.securityPolicy.forceRepromptAfter
    ) {
      session.requiresReverification = true;
    }

    return session;
  }

  /**
   * Record operation in session
   */
  recordOperation(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.operationCount++;
      session.lastOperationTime = new Date();
    }
  }

  /**
   * Get user's registered credentials
   */
  getUserCredentials(userId: string): BiometricCredential[] {
    return Array.from(this.credentials.values()).filter(
      (c) => c.userId === userId
    );
  }

  /**
   * Remove a credential
   */
  removeCredential(userId: string, credentialId: string): boolean {
    const credential = Array.from(this.credentials.values()).find(
      (c) => c.userId === userId && c.id === credentialId
    );

    if (credential) {
      this.credentials.delete(credentialId);
      return true;
    }

    return false;
  }

  /**
   * Check if user is locked out
   */
  private isUserLockedOut(userId: string): boolean {
    const lockoutTime = this.lockedUsers.get(userId);
    if (!lockoutTime) return false;

    if (new Date() > lockoutTime) {
      this.lockedUsers.delete(userId);
      return false;
    }

    return true;
  }

  /**
   * Increment failed attempts and lock user if needed
   */
  private incrementFailedAttempts(userId: string): void {
    const attempts = (this.failedAttempts.get(userId) || 0) + 1;
    this.failedAttempts.set(userId, attempts);

    if (attempts >= BIOMETRIC_CONFIG.securityPolicy.lockoutAfterFailed) {
      const lockoutTime = new Date(
        Date.now() + BIOMETRIC_CONFIG.securityPolicy.lockoutDuration
      );
      this.lockedUsers.set(userId, lockoutTime);
    }
  }

  /**
   * Generate access token
   */
  private generateAccessToken(userId: string, sessionId: string): string {
    const header = btoa(
      JSON.stringify({
        alg: "HS256",
        typ: "JWT",
        biometric: true,
      })
    );

    const payload = btoa(
      JSON.stringify({
        sub: userId,
        sid: sessionId,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(
          (Date.now() + BIOMETRIC_CONFIG.tokens.access.duration) / 1000
        ),
        aud: "triumph-synergy",
        scope: "biometric:verified",
      })
    );

    // In production, use HMAC signing
    const signature = btoa(
      `${header}.${payload}.signature`
    );

    return `${header}.${payload}.${signature}`;
  }

  /**
   * Generate refresh token
   */
  private generateRefreshToken(userId: string): string {
    return btoa(
      JSON.stringify({
        sub: userId,
        type: "refresh",
        iat: Date.now(),
        exp: Date.now() + BIOMETRIC_CONFIG.tokens.refresh.duration,
      })
    );
  }

  /**
   * Create error with metadata
   */
  private createError(
    code: keyof typeof BIOMETRIC_CONFIG.errors,
    details?: string,
    recoverable: boolean = true
  ): BiometricError {
    return {
      code,
      message: BIOMETRIC_CONFIG.errors[code],
      details: details ? { originalError: details } : undefined,
      recoverable,
      suggestedAction: this.getSuggestedAction(code),
    };
  }

  /**
   * Get suggested action based on error
   */
  private getSuggestedAction(
    code: keyof typeof BIOMETRIC_CONFIG.errors
  ): string {
    switch (code) {
      case "BIOMETRIC_NOT_AVAILABLE":
        return "Use fallback authentication method";
      case "BIOMETRIC_NOT_ENROLLED":
        return "Enroll biometric data in device settings";
      case "REGISTRATION_FAILED":
        return "Try registering again with a different biometric";
      case "AUTHENTICATION_FAILED":
        return "Try again or use fallback authentication";
      case "MAX_ATTEMPTS_EXCEEDED":
        return "Wait before trying again";
      case "SESSION_EXPIRED":
        return "Authenticate again";
      default:
        return "Try again later";
    }
  }

  /**
   * Clear all sessions and credentials (for testing)
   */
  clear(): void {
    this.sessions.clear();
    this.credentials.clear();
    this.failedAttempts.clear();
    this.lockedUsers.clear();
  }
}

// Export singleton instance
export const biometricManager = BiometricManager.getInstance();
