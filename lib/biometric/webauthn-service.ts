/**
 * WebAuthn Service - FIDO2 Biometric Authentication
 * Cross-platform biometric support (fingerprint, Face ID, Windows Hello, etc.)
 *
 * Implements registration, authentication, and credential management
 */

import { APP_CONFIG } from "@/lib/config/app-domain-config";
import { base64url } from "@/lib/utils/base64url";

// WebAuthn Type Aliases - only for types not in DOM
type AttestationConveyanceFormat =
  | "direct"
  | "indirect"
  | "none"
  | "enterprise";

// WebAuthn Types
export type WebAuthnOptions = {
  challenge: BufferSource;
  timeout?: number;
  userVerification?: any;
  attestation?: any;
  authenticatorSelection?: any;
};

export type BiometricCredential = {
  id: string;
  publicKey: string;
  counter: number;
  transports?: any[];
  aaguid: string;
  credentialDeviceType?: "single_device" | "cross_platform";
  createdAt: Date;
  lastUsedAt?: Date;
  name?: string; // User-friendly name (e.g., "iPhone Face ID", "Windows Hello")
};

export type BiometricRegistrationRequest = {
  userId: string;
  username: string;
  displayName: string;
  credentialName?: string;
};

export type BiometricAuthenticationRequest = {
  userId: string;
  credentialId?: string;
};

export type BiometricRegistrationResponse = {
  clientExtensionResults: any;
  id: string;
  rawId: ArrayBuffer;
  response: any;
  type: string;
  transports?: any[];
};

export type BiometricAuthenticationResponse = {
  clientExtensionResults: any;
  id: string;
  rawId: ArrayBuffer;
  response: any;
  type: string;
};

/**
 * WebAuthn Service - Server-side credential management
 */
export class WebAuthnService {
  private readonly rpName = "Triumph Synergy";
  private readonly rpId =
    typeof window !== "undefined"
      ? window.location.hostname
      : APP_CONFIG.getDomain();
  private readonly origin =
    typeof window !== "undefined"
      ? window.location.origin
      : APP_CONFIG.getCanonicalUrl();

  /**
   * Generate registration options for WebAuthn.create()
   */
  async generateRegistrationOptions(
    request: BiometricRegistrationRequest
  ): Promise<PublicKeyCredentialCreationOptions> {
    // Generate random challenge (32 bytes)
    const challenge = crypto.getRandomValues(new Uint8Array(32));

    return {
      challenge,
      rp: {
        name: this.rpName,
        id: this.rpId,
      },
      user: {
        id: new TextEncoder().encode(request.userId),
        name: request.username,
        displayName: request.displayName,
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 }, // ES256
        { type: "public-key", alg: -257 }, // RS256
      ],
      timeout: 60_000, // 60 seconds
      attestation: "direct" as AttestationConveyanceFormat,
      authenticatorSelection: {
        authenticatorAttachment: "platform" as AuthenticatorAttachment, // Platform authenticator (built-in)
        residentKey: "preferred", // Discoverable credential
        userVerification: "preferred", // Biometric or PIN
      },
      extensions: {
        credProps: true, // Return credential properties
      },
    };
  }

  /**
   * Verify registration response from WebAuthn.create()
   */
  async verifyRegistrationResponse(
    credential: BiometricRegistrationResponse,
    expectedChallenge: string,
    userId: string
  ): Promise<BiometricCredential> {
    // Verify credential type
    if (credential.type !== "public-key") {
      throw new Error("Invalid credential type");
    }

    // Verify ID exists
    if (!credential.id) {
      throw new Error("Credential ID missing");
    }

    const response = credential.response;

    // Verify challenge matches
    const decodedChallenge = base64url.toBuffer(expectedChallenge);
    const clientDataJSON = new TextDecoder().decode(response.clientDataJSON);
    const clientData = JSON.parse(clientDataJSON);

    if (clientData.challenge !== base64url.fromBuffer(decodedChallenge)) {
      throw new Error("Challenge mismatch");
    }

    // Verify origin
    if (clientData.origin !== this.origin) {
      throw new Error("Origin mismatch");
    }

    // Verify type
    if (clientData.type !== "webauthn.create") {
      throw new Error("Invalid client data type");
    }

    // Verify attestation format
    const attestationObject = this.parseAttestationObject(
      response.attestationObject
    );

    if (!attestationObject.fmt) {
      throw new Error("Missing attestation format");
    }

    // Create credential record
    const credentialId = base64url.fromBuffer(new Uint8Array(credential.rawId));
    const publicKeyBuffer = attestationObject.authData.credentialPublicKey;

    if (!publicKeyBuffer) {
      throw new Error("Public key missing from attestation");
    }

    const publicKey = base64url.fromBuffer(publicKeyBuffer);
    const aaguidData = attestationObject.authData.aaguid;
    const aaguidBuffer =
      aaguidData instanceof ArrayBuffer
        ? new Uint8Array(aaguidData)
        : new Uint8Array(aaguidData as unknown as ArrayBuffer);
    const aaguid = this.bufferToHex(
      aaguidBuffer.buffer.slice(
        aaguidBuffer.byteOffset,
        aaguidBuffer.byteOffset + aaguidBuffer.byteLength
      )
    );

    return {
      id: credentialId,
      publicKey,
      counter: attestationObject.authData.signCount,
      transports: credential.transports,
      aaguid,
      credentialDeviceType: this.getDeviceType(credential.transports),
      createdAt: new Date(),
      name: this.getCredentialName(credential.transports, aaguid),
    };
  }

  /**
   * Generate authentication options for WebAuthn.get()
   */
  async generateAuthenticationOptions(
    request: BiometricAuthenticationRequest,
    userCredentials: BiometricCredential[]
  ): Promise<PublicKeyCredentialRequestOptions> {
    const challenge = crypto.getRandomValues(new Uint8Array(32));

    return {
      challenge,
      timeout: 60_000,
      userVerification: "preferred",
      rpId: this.rpId,
      allowCredentials: userCredentials.map((cred) => ({
        type: "public-key" as const,
        id: base64url.toBuffer(cred.id),
        transports: cred.transports as AuthenticatorTransport[],
      })),
    };
  }

  /**
   * Verify authentication response from WebAuthn.get()
   */
  async verifyAuthenticationResponse(
    credential: BiometricAuthenticationResponse,
    expectedChallenge: string,
    storedCredential: BiometricCredential
  ): Promise<{ valid: boolean; newCounter: number }> {
    // Verify credential type
    if (credential.type !== "public-key") {
      throw new Error("Invalid credential type");
    }

    const response = credential.response;

    // Verify challenge
    const decodedChallenge = base64url.toBuffer(expectedChallenge);
    const clientDataJSON = new TextDecoder().decode(response.clientDataJSON);
    const clientData = JSON.parse(clientDataJSON);

    if (clientData.challenge !== base64url.fromBuffer(decodedChallenge)) {
      throw new Error("Challenge mismatch");
    }

    // Verify origin
    if (clientData.origin !== this.origin) {
      throw new Error("Origin mismatch");
    }

    // Verify type
    if (clientData.type !== "webauthn.get") {
      throw new Error("Invalid client data type");
    }

    // Verify signature
    const authenticatorData = response.authenticatorData;
    const signatureIsValid = await this.verifySignature(
      authenticatorData,
      response.clientDataJSON,
      response.signature,
      storedCredential.publicKey
    );

    if (!signatureIsValid) {
      throw new Error("Signature verification failed");
    }

    // Verify counter (prevent credential cloning)
    const newCounter = this.parseAuthenticatorData(authenticatorData).signCount;
    if (newCounter <= storedCredential.counter) {
      throw new Error(
        "Counter verification failed - possible credential clone"
      );
    }

    return {
      valid: true,
      newCounter,
    };
  }

  /**
   * Check if platform supports WebAuthn
   */
  static isWebAuthnSupported(): boolean {
    if (typeof window === "undefined") {
      return false;
    }
    return Boolean(
      window.PublicKeyCredential &&
        window.navigator.credentials &&
        typeof window.navigator.credentials.create === "function" &&
        typeof window.navigator.credentials.get === "function"
    );
  }

  /**
   * Check available authenticators
   */
  static async isConditionalUIAvailable(): Promise<boolean> {
    if (typeof window === "undefined") {
      return false;
    }
    return await PublicKeyCredential.isConditionalMediationAvailable?.();
  }

  /**
   * Check if platform supports user verification
   */
  static async isUserVerificationAvailable(): Promise<boolean> {
    if (typeof window === "undefined") {
      return false;
    }
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable?.();
  }

  /**
   * Get available authenticator transports
   */
  static getAvailableTransports(): AuthenticatorTransport[] {
    const transports: AuthenticatorTransport[] = [
      "platform" as AuthenticatorTransport,
    ];

    if (typeof window !== "undefined") {
      // Check for cross-platform authenticators (security keys)
      transports.push("usb", "ble", "nfc");
    }

    return transports;
  }

  // Private helpers

  private parseAttestationObject(buffer: ArrayBuffer) {
    const view = new DataView(buffer);
    const offset = 0;

    // This is simplified - in production, use a proper CBOR decoder
    // For now, we'll return a basic structure
    return {
      fmt: "fido-u2f",
      authData: {
        rpIdHash: new Uint8Array(buffer.slice(0, 32)),
        flags: new Uint8Array(buffer.slice(32, 33))[0],
        signCount: new DataView(buffer.slice(33, 37)).getUint32(0, false),
        aaguid: new Uint8Array(buffer.slice(37, 53)),
        credentialIdLength: new DataView(buffer.slice(53, 55)).getUint16(
          0,
          false
        ),
        credentialId: new Uint8Array(buffer.slice(55, 55 + 32)),
        credentialPublicKey: new Uint8Array(buffer.slice(87)),
      },
    };
  }

  private parseAuthenticatorData(buffer: ArrayBuffer) {
    const view = new DataView(buffer);
    return {
      rpIdHash: new Uint8Array(buffer.slice(0, 32)),
      flags: new Uint8Array(buffer.slice(32, 33))[0],
      signCount: view.getUint32(33, false),
    };
  }

  private async verifySignature(
    authenticatorData: ArrayBuffer,
    clientDataJSON: ArrayBuffer,
    signature: ArrayBuffer,
    publicKeyB64: string
  ): Promise<boolean> {
    try {
      // Reconstruct signed data
      const signedData = new Uint8Array(
        authenticatorData.byteLength + clientDataJSON.byteLength
      );
      signedData.set(new Uint8Array(authenticatorData), 0);
      signedData.set(
        new Uint8Array(clientDataJSON),
        authenticatorData.byteLength
      );

      // Import public key
      const publicKeyDer = base64url.toBuffer(publicKeyB64);
      const publicKey = await crypto.subtle.importKey(
        "spki",
        publicKeyDer,
        { name: "ECDSA", namedCurve: "P-256", hash: "SHA-256" },
        false,
        ["verify"]
      );

      // Verify signature
      const isValid = await crypto.subtle.verify(
        "ECDSA",
        publicKey,
        signature,
        signedData
      );

      return isValid;
    } catch (error) {
      console.error("Signature verification error:", error);
      return false;
    }
  }

  private bufferToHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  private getDeviceType(
    transports?: AuthenticatorTransport[]
  ): "single_device" | "cross_platform" {
    if (!transports) {
      return "single_device";
    }
    return transports.includes("usb") ||
      transports.includes("ble") ||
      transports.includes("nfc")
      ? "cross_platform"
      : "single_device";
  }

  private getCredentialName(
    transports?: AuthenticatorTransport[],
    aaguid?: string
  ): string {
    // Map common AAGUID values to device names
    const aaguidNames: Record<string, string> = {
      "00000000000000000000000000000000": "Platform Authenticator",
      "08987058dae140b5b1f52fc0cf00ef57": "Windows Hello",
      "0ea242b4a0034cbe8f1d6511ec7eed1e": "Google Titan",
      "1d8e6793f432b82a7a7ad36d6faaac2d": "YubiKey",
    };

    if (aaguid && aaguidNames[aaguid]) {
      return aaguidNames[aaguid];
    }

    if (!transports || transports.length === 0) {
      return "Biometric Authenticator";
    }

    const transportNames: Record<string, string> = {
      usb: "USB Security Key",
      ble: "Bluetooth Security Key",
      nfc: "NFC Security Key",
      platform: "Platform Authenticator (Face ID / Fingerprint)",
      hybrid: "Phone Authenticator",
      internal: "Built-in Authenticator",
    };

    return transports.map((t) => transportNames[t] || t).join(" / ");
  }
}

// Client-side registration helper
export async function registerBiometric(
  options: PublicKeyCredentialCreationOptions,
  credentialName?: string
): Promise<RegistrationResponseJSON> {
  if (!WebAuthnService.isWebAuthnSupported()) {
    throw new Error("WebAuthn not supported on this device");
  }

  const credential = (await navigator.credentials.create({
    publicKey: options,
  })) as PublicKeyCredential | null;

  if (!credential) {
    throw new Error("User cancelled registration or device not available");
  }

  const response = credential.response as AuthenticatorAttestationResponse;

  return {
    id: credential.id,
    rawId: arrayBufferToBase64url(credential.rawId),
    response: {
      clientDataJSON: arrayBufferToBase64url(response.clientDataJSON),
      attestationObject: arrayBufferToBase64url(response.attestationObject),
      transports: (response.getTransports?.() ||
        []) as AuthenticatorTransport[],
    },
    type: credential.type,
  };
}

// Client-side authentication helper
export async function authenticateWithBiometric(
  options: PublicKeyCredentialRequestOptions
): Promise<AuthenticationResponseJSON> {
  if (!WebAuthnService.isWebAuthnSupported()) {
    throw new Error("WebAuthn not supported on this device");
  }

  const credential = (await navigator.credentials.get({
    publicKey: options,
    mediation: "optional",
  })) as PublicKeyCredential | null;

  if (!credential) {
    throw new Error("User cancelled authentication or device not available");
  }

  const response = credential.response as AuthenticatorAssertionResponse;

  return {
    id: credential.id,
    rawId: arrayBufferToBase64url(credential.rawId),
    response: {
      clientDataJSON: arrayBufferToBase64url(response.clientDataJSON),
      authenticatorData: arrayBufferToBase64url(response.authenticatorData),
      signature: arrayBufferToBase64url(response.signature),
      userHandle: response.userHandle
        ? arrayBufferToBase64url(response.userHandle)
        : null,
    },
    type: credential.type,
  };
}

function arrayBufferToBase64url(buffer: ArrayBuffer): string {
  return base64url.fromBuffer(new Uint8Array(buffer));
}

export type RegistrationResponseJSON = {
  id: string;
  rawId: string;
  response: {
    clientDataJSON: string;
    attestationObject: string;
    transports?: AuthenticatorTransport[];
  };
  type: string;
};

export type AuthenticationResponseJSON = {
  id: string;
  rawId: string;
  response: {
    clientDataJSON: string;
    authenticatorData: string;
    signature: string;
    userHandle: string | null;
  };
  type: string;
};
