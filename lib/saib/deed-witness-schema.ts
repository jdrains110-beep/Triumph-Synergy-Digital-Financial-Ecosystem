/**
 * Asymmetric Multi-Signature Witness Schema
 * 
 * Aggregates and verifies independent edge authorizations before title finalization.
 * Implements dual-witness consensus protocol for cryptographic deed authentication.
 * 
 * Architecture:
 * - SAIB Edge Server Witness A signs deed hash
 * - SAIB Edge Server Witness B signs deed hash
 * - Both signatures must verify independently for deed finalization
 */

import crypto from 'crypto';

/**
 * Witness signature pair structure
 */
export interface WitnessSignatures {
  signatureUnitA: string; // Hex-encoded HMAC-SHA256 from witness A
  signatureUnitB: string; // Hex-encoded HMAC-SHA256 from witness B
}

/**
 * Witness verification result
 */
export interface WitnessVerificationResult {
  bothWitnessesValid: boolean;
  witnessAVerified: boolean;
  witnessBVerified: boolean;
  verificationTimestamp: string;
  consensusStatus: 'DUAL_WITNESS_PASS' | 'WITNESS_A_FAIL' | 'WITNESS_B_FAIL' | 'BOTH_FAIL';
}

/**
 * DeedWitnessSchema
 * 
 * Validates dual-signature witness matrix over an Allodial Deed hash payload.
 * Ensures cryptographic consensus from independent edge servers before deed finalization.
 */
export class DeedWitnessSchema {
  /**
   * Generates a witness signature from a SAIB edge unit.
   * 
   * Used by edge servers to sign deed hashes independently.
   * 
   * @param {string} deedHashHex - The SHA-256 hash representing the deed metadata
   * @param {string} witnessSecretKey - The secret key for this witness unit
   * @returns {string} Hex-encoded HMAC-SHA256 signature
   */
  static generateWitnessSignature(deedHashHex: string, witnessSecretKey: string): string {
    const hmac = crypto
      .createHmac('sha256', witnessSecretKey)
      .update(deedHashHex)
      .digest('hex');

    return hmac;
  }

  /**
   * Verifies a single witness signature using the witness's secret key.
   * 
   * @param {string} deedHashHex - The SHA-256 hash of the deed
   * @param {string} signatureHex - The signature to verify (hex-encoded)
   * @param {string} witnessSecretKey - The witness's secret key
   * @returns {boolean} True if signature is valid
   */
  static verifyWitnessSignature(
    deedHashHex: string,
    signatureHex: string,
    witnessSecretKey: string
  ): boolean {
    try {
      // Regenerate expected signature
      const expectedSignature = this.generateWitnessSignature(deedHashHex, witnessSecretKey);

      // Use timing-safe comparison to prevent timing attacks
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(signatureHex, 'hex')
      );
    } catch {
      // Signature format error or mismatch
      return false;
    }
  }

  /**
   * Validates a dual-signature witness matrix over an Allodial Deed hash payload.
   * 
   * Both edge servers must independently verify the deed before finalization.
   * This prevents single-point-of-failure and establishes cryptographic consensus.
   * 
   * @param {string} deedHashHex - The SHA-256 hash representing the compiled deed metadata
   * @param {WitnessSignatures} witnessSignatures - Object containing hex signatures from individual SAIB units
   * @param {object} env - Environment namespace containing trusted witness secret keys
   * @returns {Promise<WitnessVerificationResult>} Detailed verification result with consensus status
   */
  static async verifyDualWitness(
    deedHashHex: string,
    witnessSignatures: WitnessSignatures,
    env: {
      SAIB_WITNESS_A_SECRET: string;
      SAIB_WITNESS_B_SECRET: string;
    }
  ): Promise<WitnessVerificationResult> {
    // Extract individual signatures
    const { signatureUnitA, signatureUnitB } = witnessSignatures;

    // Validate both signatures are present
    if (!signatureUnitA || !signatureUnitB) {
      return {
        bothWitnessesValid: false,
        witnessAVerified: false,
        witnessBVerified: false,
        verificationTimestamp: new Date().toISOString(),
        consensusStatus: 'BOTH_FAIL',
      };
    }

    // Verify witness A signature (timing-safe comparison)
    const witnessAVerified = this.verifyWitnessSignature(
      deedHashHex,
      signatureUnitA,
      env.SAIB_WITNESS_A_SECRET
    );

    // Verify witness B signature (timing-safe comparison)
    const witnessBVerified = this.verifyWitnessSignature(
      deedHashHex,
      signatureUnitB,
      env.SAIB_WITNESS_B_SECRET
    );

    // Determine consensus status
    let consensusStatus: 'DUAL_WITNESS_PASS' | 'WITNESS_A_FAIL' | 'WITNESS_B_FAIL' | 'BOTH_FAIL';
    if (witnessAVerified && witnessBVerified) {
      consensusStatus = 'DUAL_WITNESS_PASS';
    } else if (!witnessAVerified && !witnessBVerified) {
      consensusStatus = 'BOTH_FAIL';
    } else if (!witnessAVerified) {
      consensusStatus = 'WITNESS_A_FAIL';
    } else {
      consensusStatus = 'WITNESS_B_FAIL';
    }

    return {
      bothWitnessesValid: witnessAVerified && witnessBVerified,
      witnessAVerified,
      witnessBVerified,
      verificationTimestamp: new Date().toISOString(),
      consensusStatus,
    };
  }

  /**
   * Prepares a witness attestation certificate for deed finalization.
   * 
   * Records the timestamp and consensus status for immutable audit trail.
   * 
   * @param {string} deedCertificateId - The deed being witnessed
   * @param {WitnessVerificationResult} verificationResult - Result from verifyDualWitness
   * @returns {object} Witness attestation record
   */
  static createWitnessAttestation(
    deedCertificateId: string,
    verificationResult: WitnessVerificationResult
  ) {
    return {
      certificateId: deedCertificateId,
      witnessAStatus: verificationResult.witnessAVerified ? 'VALID' : 'INVALID',
      witnessBStatus: verificationResult.witnessBVerified ? 'VALID' : 'INVALID',
      consensusAchieved: verificationResult.bothWitnessesValid,
      consensusStatus: verificationResult.consensusStatus,
      attestationTimestamp: verificationResult.verificationTimestamp,
      deedFinalizedEligible: verificationResult.bothWitnessesValid,
    };
  }
}
