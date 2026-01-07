/**
 * Biometric Authentication React Hook
 * Manages WebAuthn registration and authentication flows
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  WebAuthnService,
  BiometricCredential,
  registerBiometric,
  authenticateWithBiometric,
} from '@/lib/biometric/webauthn-service';
import {
  getSecureStorage,
  getSessionStorage,
  getCredentialStorage,
} from '@/lib/biometric/secure-storage';

// Try to import usePi if available, otherwise use a stub
let usePi: any;
try {
  ({ usePi } = require('@/lib/context/PiContext'));
} catch {
  // Fallback if PiContext is not available
  usePi = () => ({ user: null });
}

export interface UseBiometricState {
  // Feature detection
  isSupported: boolean;
  isConditionalUIAvailable: boolean;
  isUserVerificationAvailable: boolean;

  // Registration
  isRegistering: boolean;
  registerError: string | null;
  registeredCredentials: BiometricCredential[];

  // Authentication
  isAuthenticating: boolean;
  authenticateError: string | null;
  isAuthenticated: boolean;

  // Session
  sessionToken: string | null;
  sessionExpiry: Date | null;

  // Loading states
  isLoading: boolean;
}

export interface UseBiometricCallbacks {
  // Registration
  initiateRegistration: (credentialName?: string) => Promise<void>;
  completeRegistration: (
    credentialName?: string
  ) => Promise<BiometricCredential | null>;
  removeCredential: (credentialId: string) => Promise<void>;

  // Authentication
  authenticateBiometric: () => Promise<boolean>;
  authenticateWithFallback: (pin: string) => Promise<boolean>;

  // Session
  getSessionToken: () => string | null;
  clearSession: () => void;
  refreshSession: () => Promise<void>;

  // State management
  fetchCredentials: () => Promise<void>;
  resetErrors: () => void;
}

export function useBiometric(): UseBiometricState & UseBiometricCallbacks {
  const { user } = usePi();

  // State
  const [state, setState] = useState<UseBiometricState>({
    isSupported: false,
    isConditionalUIAvailable: false,
    isUserVerificationAvailable: false,
    isRegistering: false,
    registerError: null,
    registeredCredentials: [],
    isAuthenticating: false,
    authenticateError: null,
    isAuthenticated: false,
    sessionToken: null,
    sessionExpiry: null,
    isLoading: true,
  });

  const [registrationChallenge, setRegistrationChallenge] = useState<string>('');
  const [authenticationChallenge, setAuthenticationChallenge] = useState<string>('');

  // Initialize WebAuthn support detection
  useEffect(() => {
    const checkSupport = async () => {
      try {
        const isSupported = WebAuthnService.isWebAuthnSupported();
        const isConditionalUIAvailable =
          await WebAuthnService.isConditionalUIAvailable();
        const isUserVerificationAvailable =
          await WebAuthnService.isUserVerificationAvailable();

        setState((prev) => ({
          ...prev,
          isSupported,
          isConditionalUIAvailable,
          isUserVerificationAvailable,
          isLoading: false,
        }));

        if (isSupported && user) {
          await fetchCredentials();
        }
      } catch (error) {
        console.error('WebAuthn support check failed:', error);
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    };

    checkSupport();
  }, [user]);

  /**
   * Fetch user's registered credentials from server
   */
  const fetchCredentials = useCallback(async () => {
    if (!user) return;

    try {
      setState((prev) => ({ ...prev, isLoading: true }));

      const response = await fetch('/api/biometric/credentials', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch credentials');
      }

      const { credentials } = await response.json();

      setState((prev) => ({
        ...prev,
        registeredCredentials: credentials || [],
      }));
    } catch (error) {
      console.error('Failed to fetch credentials:', error);
    } finally {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [user]);

  /**
   * Initiate biometric registration
   */
  const initiateRegistration = useCallback(async (credentialName?: string) => {
    if (!user) {
      setState((prev) => ({
        ...prev,
        registerError: 'User not authenticated',
      }));
      return;
    }

    try {
      setState((prev) => ({
        ...prev,
        isRegistering: true,
        registerError: null,
      }));

      // Request registration options from server
      const response = await fetch('/api/biometric/register/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          username: user.email || user.id,
          displayName: user.displayName || user.email || user.id,
          credentialName,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get registration options');
      }

      const { options, challenge } = await response.json();

      // Store challenge for verification
      setRegistrationChallenge(challenge);

      // Convert challenge string to buffer
      const challengeBuffer = Uint8Array.from(
        atob(challenge.replace(/[-_]/g, (c: string) => (c === '-' ? '+' : '/'))),
        (c: string) => c.charCodeAt(0)
      );

      options.challenge = challengeBuffer;

      setState((prev) => ({
        ...prev,
        isRegistering: true,
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Registration initiation failed';
      setState((prev) => ({
        ...prev,
        isRegistering: false,
        registerError: message,
      }));
    }
  }, [user]);

  /**
   * Complete biometric registration
   */
  const completeRegistration = useCallback(
    async (credentialName?: string): Promise<BiometricCredential | null> => {
      if (!user || !registrationChallenge) {
        setState((prev) => ({
          ...prev,
          registerError: 'Registration not initiated',
        }));
        return null;
      }

      try {
        // Get registration options
        const response = await fetch('/api/biometric/register/initiate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            username: user.email || user.id,
            displayName: user.displayName || user.email || user.id,
            credentialName,
          }),
        });

        const { options } = await response.json();

        // Convert challenge to buffer
        const challengeBuffer = Uint8Array.from(
          atob(options.challenge.replace(/[-_]/g, (c: string) => (c === '-' ? '+' : '/'))),
          (c: string) => c.charCodeAt(0)
        );

        options.challenge = challengeBuffer;

        // Create credential
        const credential = await registerBiometric(options, credentialName);

        // Verify with server
        const verifyResponse = await fetch('/api/biometric/register/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            credential,
            challenge: registrationChallenge,
            credentialName,
          }),
        });

        if (!verifyResponse.ok) {
          throw new Error('Server verification failed');
        }

        const { biometricCredential } = await verifyResponse.json();

        // Update state
        setState((prev) => ({
          ...prev,
          registeredCredentials: [...prev.registeredCredentials, biometricCredential],
          registerError: null,
        }));

        // Store credential metadata locally
        getCredentialStorage().storeCredentialMetadata(biometricCredential.id, {
          name: biometricCredential.name,
          createdAt: biometricCredential.createdAt,
        });

        setRegistrationChallenge('');
        return biometricCredential;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Registration failed';
        setState((prev) => ({
          ...prev,
          registerError: message,
        }));
        return null;
      } finally {
        setState((prev) => ({ ...prev, isRegistering: false }));
      }
    },
    [user, registrationChallenge]
  );

  /**
   * Remove credential
   */
  const removeCredential = useCallback(
    async (credentialId: string) => {
      try {
        const response = await fetch(`/api/biometric/credentials/${credentialId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to remove credential');
        }

        setState((prev) => ({
          ...prev,
          registeredCredentials: prev.registeredCredentials.filter(
            (c) => c.id !== credentialId
          ),
        }));

        getCredentialStorage().clearCredentialMetadata(credentialId);
      } catch (error) {
        console.error('Failed to remove credential:', error);
      }
    },
    []
  );

  /**
   * Authenticate with biometric
   */
  const authenticateBiometric = useCallback(async (): Promise<boolean> => {
    if (!user || state.registeredCredentials.length === 0) {
      setState((prev) => ({
        ...prev,
        authenticateError: 'No biometric credentials registered',
      }));
      return false;
    }

    try {
      setState((prev) => ({
        ...prev,
        isAuthenticating: true,
        authenticateError: null,
      }));

      // Request authentication options
      const response = await fetch('/api/biometric/authenticate/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get authentication options');
      }

      const { options, challenge } = await response.json();

      // Store challenge
      setAuthenticationChallenge(challenge);

      // Convert challenge to buffer
      const challengeBuffer = Uint8Array.from(
        atob(challenge.replace(/[-_]/g, (c: string) => (c === '-' ? '+' : '/'))),
        (c: string) => c.charCodeAt(0)
      );

      options.challenge = challengeBuffer;

      // Authenticate
      const credential = await authenticateWithBiometric(options);

      // Verify with server
      const verifyResponse = await fetch('/api/biometric/authenticate/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          credential,
          challenge,
        }),
      });

      if (!verifyResponse.ok) {
        throw new Error('Authentication verification failed');
      }

      const { sessionToken, expiresAt } = await verifyResponse.json();

      // Store session token
      const sessionId = user.id;
      const password = user.id; // In production, use a stronger password

      getSessionStorage().storeSessionToken(sessionId, sessionToken, password);

      // Update state
      setState((prev) => ({
        ...prev,
        sessionToken,
        sessionExpiry: new Date(expiresAt),
        isAuthenticated: true,
        authenticateError: null,
      }));

      setAuthenticationChallenge('');
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Authentication failed';
      setState((prev) => ({
        ...prev,
        authenticateError: message,
        isAuthenticated: false,
      }));
      return false;
    } finally {
      setState((prev) => ({ ...prev, isAuthenticating: false }));
    }
  }, [user, state.registeredCredentials.length]);

  /**
   * Authenticate with fallback PIN
   */
  const authenticateWithFallback = useCallback(
    async (pin: string): Promise<boolean> => {
      if (!user) {
        setState((prev) => ({
          ...prev,
          authenticateError: 'User not authenticated',
        }));
        return false;
      }

      try {
        setState((prev) => ({
          ...prev,
          isAuthenticating: true,
          authenticateError: null,
        }));

        const response = await fetch('/api/biometric/authenticate/fallback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            pin,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'PIN authentication failed');
        }

        const { sessionToken, expiresAt } = await response.json();

        // Store session
        const sessionId = user.id;
        getSessionStorage().storeSessionToken(sessionId, sessionToken, pin);

        setState((prev) => ({
          ...prev,
          sessionToken,
          sessionExpiry: new Date(expiresAt),
          isAuthenticated: true,
        }));

        return true;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'PIN authentication failed';
        setState((prev) => ({
          ...prev,
          authenticateError: message,
        }));
        return false;
      } finally {
        setState((prev) => ({ ...prev, isAuthenticating: false }));
      }
    },
    [user]
  );

  /**
   * Get current session token
   */
  const getSessionToken = useCallback((): string | null => {
    if (!user) return null;

    try {
      const sessionId = user.id;
      const password = user.id;
      return getSessionStorage().getSessionToken(sessionId, password);
    } catch {
      return null;
    }
  }, [user]);

  /**
   * Clear session
   */
  const clearSession = useCallback(() => {
    if (!user) return;

    const sessionId = user.id;
    getSessionStorage().clearSessionToken(sessionId);

    setState((prev) => ({
      ...prev,
      sessionToken: null,
      sessionExpiry: null,
      isAuthenticated: false,
    }));
  }, [user]);

  /**
   * Refresh session
   */
  const refreshSession = useCallback(async () => {
    if (!user || !state.sessionToken) return;

    try {
      const response = await fetch('/api/biometric/authenticate/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${state.sessionToken}`,
        },
        body: JSON.stringify({
          userId: user.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Session refresh failed');
      }

      const { sessionToken, expiresAt } = await response.json();

      // Update stored token
      const sessionId = user.id;
      const password = user.id;
      getSessionStorage().storeSessionToken(sessionId, sessionToken, password);

      setState((prev) => ({
        ...prev,
        sessionToken,
        sessionExpiry: new Date(expiresAt),
      }));
    } catch (error) {
      console.error('Failed to refresh session:', error);
      clearSession();
    }
  }, [user, state.sessionToken, clearSession]);

  /**
   * Reset errors
   */
  const resetErrors = useCallback(() => {
    setState((prev) => ({
      ...prev,
      registerError: null,
      authenticateError: null,
    }));
  }, []);

  return {
    // State
    ...state,

    // Callbacks
    initiateRegistration,
    completeRegistration,
    removeCredential,
    authenticateBiometric,
    authenticateWithFallback,
    getSessionToken,
    clearSession,
    refreshSession,
    fetchCredentials,
    resetErrors,
  };
}
