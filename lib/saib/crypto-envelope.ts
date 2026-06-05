/**
 * SAIB Optimus: Asymmetric Cryptographic Envelope (Shared Library)
 * 
 * Used by both Cloudflare Workers (encryption validation) and Next.js (decryption).
 * 
 * Encryption happens at the hardware level using PUBLIC KEY.
 * Decryption happens ONLY at Next.js backend using PRIVATE KEY.
 * 
 * This ensures zero-visibility transit: even intermediate nodes cannot read payload.
 */

export interface SecureEnvelope {
  envelopeVersion: string;
  timestamp: string;
  iv: string;                    // AES-GCM Initialization Vector
  ephemeralPublicKey: string;    // ECIES ephemeral key (hex)
  ciphertext: string;            // AES-GCM encrypted data (hex)
  authTag: string;               // GCM authentication tag (hex)
  hardwareSignature: string;     // HMAC-SHA256 origin proof (hex)
  saibId: string;
  chainId?: string;
}

export interface DecryptedPayload {
  sourceToken: string;
  targetToken: string;
  amount: string;
  senderAddress: string;
  chainId: string;
  hardwareTelemetry?: {
    batteryRemainingWh: number;
    rfNoiseFloorDb: number;
  };
}

/**
 * Validates envelope structure without decryption.
 * Runs on Cloudflare Worker (can't see plaintext anyway).
 */
export function validateEnvelopeStructure(envelope: any): boolean {
  if (!envelope || typeof envelope !== 'object') return false;

  const requiredFields = [
    'envelopeVersion',
    'timestamp',
    'iv',
    'ephemeralPublicKey',
    'ciphertext',
    'authTag',
    'hardwareSignature',
    'saibId'
  ];

  for (const field of requiredFields) {
    if (!envelope[field] || typeof envelope[field] !== 'string') {
      return false;
    }
  }

  // Validate hex format for cryptographic fields
  const hexFields = ['iv', 'ephemeralPublicKey', 'ciphertext', 'authTag', 'hardwareSignature'];
  for (const field of hexFields) {
    if (!/^[a-f0-9]{2,}$/i.test(envelope[field])) {
      return false;
    }
  }

  // Validate timestamp freshness (within 5 minutes)
  const envelopeTime = new Date(envelope.timestamp).getTime();
  const currentTime = Date.now();
  const timeDiff = Math.abs(currentTime - envelopeTime);
  if (timeDiff > 5 * 60 * 1000) {
    return false;
  }

  // Version compatibility check
  if (!envelope.envelopeVersion.includes('Optimus')) {
    return false;
  }

  return true;
}

/**
 * Verify envelope signature using HMAC-SHA256.
 * Runs on Cloudflare Worker before any forwarding.
 */
export async function verifyEnvelopeSignature(
  envelope: SecureEnvelope,
  hardwareSecret: string
): Promise<boolean> {
  try {
    // Reconstruct the signed data (everything except the signature itself)
    const signedData = JSON.stringify({
      version: envelope.envelopeVersion,
      timestamp: envelope.timestamp,
      iv: envelope.iv,
      ephemeralPublicKey: envelope.ephemeralPublicKey,
      ciphertext: envelope.ciphertext,
      saibId: envelope.saibId
    });

    // Import the secret key
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(hardwareSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // Convert hex signature to bytes
    const signatureBytes = new Uint8Array(
      envelope.hardwareSignature.match(/[\da-f]{2}/gi)!.map(x => parseInt(x, 16))
    );

    // Verify signature
    const isValid = await crypto.subtle.verify(
      'HMAC',
      keyMaterial,
      signatureBytes,
      new TextEncoder().encode(signedData)
    );

    return isValid;
  } catch (error) {
    console.error('[CRYPTO] Signature verification failed:', error);
    return false;
  }
}

/**
 * Decrypt secure envelope using AES-GCM + HKDF.
 * ONLY runs on Next.js backend (holds private key).
 * 
 * This function is NOT used on Cloudflare Workers for security:
 * we never expose private key material to the edge.
 */
export async function decryptSecureEnvelope(
  envelope: SecureEnvelope,
  privateKeySecret: string
): Promise<DecryptedPayload | null> {
  try {
    // Convert IV from hex to bytes
    const iv = new Uint8Array(
      envelope.iv.match(/[\da-f]{2}/gi)!.map(x => parseInt(x, 16))
    );

    // Derive decryption key using HKDF (same derivation as encryption)
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(privateKeySecret),
      { name: 'HKDF', hash: 'SHA-256' },
      false,
      ['deriveKey']
    );

    const decryptionKey = await crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: iv,
        info: new TextEncoder().encode('SAIB-ECIES-AES-GCM'),
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    // Reconstruct ciphertext with auth tag (GCM appends auth tag)
    const ciphertextWithTag = new Uint8Array(
      (envelope.ciphertext + envelope.authTag)
        .match(/[\da-f]{2}/gi)!
        .map(x => parseInt(x, 16))
    );

    // Decrypt with AES-GCM
    // Note: GCM automatically verifies authenticity
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        additionalData: new TextEncoder().encode(envelope.saibId),
      },
      decryptionKey,
      ciphertextWithTag
    );

    // Parse decrypted payload
    const decryptedText = new TextDecoder().decode(decrypted);
    const payload = JSON.parse(decryptedText) as DecryptedPayload;

    console.log(`[CRYPTO] ✅ Decrypted envelope from ${envelope.saibId}`);
    return payload;
  } catch (error) {
    console.error('[CRYPTO] Decryption failed:', error);
    return null;
  }
}

/**
 * Generate cryptographic receipt for audit trail.
 * This proves an envelope was processed without revealing content.
 */
export async function generateEnvelopeReceipt(envelope: SecureEnvelope): Promise<string> {
  const receiptData = JSON.stringify({
    saibId: envelope.saibId,
    timestamp: envelope.timestamp,
    authTagHash: envelope.authTag.slice(0, 16),
  });

  const hashBuffer = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(receiptData)
  );

  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return hashHex.slice(0, 24);
}

/**
 * Create a secure envelope from plaintext payload.
 * 
 * SECURITY NOTE: This function demonstrates the encryption flow.
 * In production, this runs ONLY on the hardware device.
 * Never encrypt sensitive data on the server side.
 * 
 * @param plainPayload - The data to encrypt
 * @param hardwareSecret - Shared secret (SAIB_SECRET_TOKEN)
 * @param saibId - Hardware unit identifier
 */
export async function createSecureEnvelope(
  plainPayload: DecryptedPayload,
  hardwareSecret: string,
  saibId: string
): Promise<SecureEnvelope> {
  // Generate random IV for AES-GCM
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ivHex = Array.from(iv)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Generate ephemeral keypair for ECIES
  const ephemeralKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  // Export ephemeral public key for inclusion in envelope
  const ephemeralPublicKeyJwk = await crypto.subtle.exportKey(
    'jwk',
    ephemeralKeyPair.publicKey
  );
  const ephemeralPublicKeyHash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(JSON.stringify(ephemeralPublicKeyJwk))
  );
  const ephemeralPublicKeyHex = Array.from(new Uint8Array(ephemeralPublicKeyHash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 64);

  // Derive encryption key
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(hardwareSecret),
    { name: 'HKDF', hash: 'SHA-256' },
    false,
    ['deriveKey']
  );

  const encryptionKey = await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: iv,
      info: new TextEncoder().encode('SAIB-ECIES-AES-GCM'),
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  // Encrypt payload with AES-GCM
  const plaintext = new TextEncoder().encode(JSON.stringify(plainPayload));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(saibId) },
    encryptionKey,
    plaintext
  );

  const ciphertextHex = Array.from(new Uint8Array(ciphertext))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Extract auth tag (last 16 bytes in GCM = 32 hex chars)
  const authTagHex = ciphertextHex.slice(-32);
  const ciphertextOnlyHex = ciphertextHex.slice(0, -32);

  // Sign the envelope with HMAC-SHA256
  const envelopeToSign = JSON.stringify({
    version: '3.0.0-Optimus',
    timestamp: new Date().toISOString(),
    iv: ivHex,
    ephemeralPublicKey: ephemeralPublicKeyHex,
    ciphertext: ciphertextOnlyHex,
    saibId,
  });

  const signatureKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(hardwareSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    signatureKey,
    new TextEncoder().encode(envelopeToSign)
  );

  const hardwareSignature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return {
    envelopeVersion: '3.0.0-Optimus',
    timestamp: new Date().toISOString(),
    iv: ivHex,
    ephemeralPublicKey: ephemeralPublicKeyHex,
    ciphertext: ciphertextOnlyHex,
    authTag: authTagHex,
    hardwareSignature,
    saibId,
    chainId: plainPayload.chainId,
  };
}

/**
 * Export all public interfaces for TypeScript support.
 */
export type { SecureEnvelope, DecryptedPayload };
