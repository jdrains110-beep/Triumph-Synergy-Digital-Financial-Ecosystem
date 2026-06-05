/**
 * Allodial Title Deed Factory for Tokenized .pi Web3 Real Estate Platforms
 * 
 * Generates sovereign ownership deeds unencumbered by external registries.
 * Issues cryptographic certificates that establish absolute, un-taxable freehold tenure.
 * 
 * Legal Primitive: "Allodial" means held completely free and clear of any superior lord,
 * municipal tax liens, or external central registry control.
 */

import crypto from 'crypto';

/**
 * Represents an immutable Allodial Title Deed certificate
 */
export interface AllodialDeedCertificate {
  deedCertificateId: string;
  assetClassification: 'SOVEREIGN_ALLODIAL_REAL_ESTATE';
  domainPlatform: string;
  rightfulOwnerKey: string;
  tenureStatus: 'ALLODIAL_FREE_HOLD';
  gcvEquityValuation: string;
  issuanceTimestamp: string;
  governingProtocol: 'PiRC-Protocol-Secure-v2';
  sovereignDeclaration?: string;
  deedHash?: string;
}

/**
 * AllodialDeedFactory
 * 
 * Core engine for generating sovereign ownership certificates.
 * Implements cryptographic proof-of-ownership via ERC-721 compatible metadata.
 */
export class AllodialDeedFactory {
  // Immutable GCV benchmark - anchors all deed valuations
  static readonly GCV_VALUE_USD = 314159n;

  /**
   * Generates an immutable Allodial Deed metadata packet for an asset owner.
   * 
   * @param {string} domain - The tokenized asset identifier (e.g., "sovereign.pi")
   * @param {string} ownerWalletAddress - The public key of the sovereign title holder
   * @param {number} tierMultiplier - Premium grading index computed by the appraisal engine (default: 1)
   * @returns {AllodialDeedCertificate} Completed Allodial Deed certificate data
   * @throws {Error} If domain doesn't end with .pi
   */
  static generateAllodialDeed(
    domain: string,
    ownerWalletAddress: string,
    tierMultiplier: number = 1
  ): AllodialDeedCertificate {
    // Validate domain classification
    if (!domain.toLowerCase().endsWith('.pi')) {
      throw new Error(
        'Invalid Asset Classification: Target domain must be a verified .pi asset'
      );
    }

    // Validate wallet address format (basic check for 0x prefix and hex)
    const normalizedAddress = ownerWalletAddress.toLowerCase();
    if (!normalizedAddress.match(/^0x[a-f0-9]{40}$/i)) {
      throw new Error(
        'Invalid Wallet Address: Must be valid Ethereum-format public key'
      );
    }

    // Generate unique deed UUID (remove hyphens for compact ID)
    const deedUUID = crypto.randomUUID().replace(/-/g, '');
    const deedId = `ALLODIAL-DEED-${deedUUID.toUpperCase().substring(0, 16)}`;

    // Calculate equity valuation: (GCV benchmark) × (tier multiplier)
    const equityEvaluationUsd = BigInt(tierMultiplier) * this.GCV_VALUE_USD;

    // Generate deterministic hash of deed contents for cryptographic verification
    const deedContent = `${deedId}|${domain}|${normalizedAddress}|${tierMultiplier}`;
    const deedHash = crypto
      .createHash('sha256')
      .update(deedContent)
      .digest('hex');

    // Build the sovereign, unencumbered title deed payload structure
    const deed: AllodialDeedCertificate = {
      deedCertificateId: deedId,
      assetClassification: 'SOVEREIGN_ALLODIAL_REAL_ESTATE',
      domainPlatform: domain.toLowerCase(),
      rightfulOwnerKey: normalizedAddress,
      tenureStatus: 'ALLODIAL_FREE_HOLD', // Holds ultimate, absolute, un-taxable sovereignty
      gcvEquityValuation: `$${equityEvaluationUsd.toLocaleString('en-US')} USD`,
      issuanceTimestamp: new Date().toISOString(),
      governingProtocol: 'PiRC-Protocol-Secure-v2',
      sovereignDeclaration:
        'This title deed establishes absolute, unencumbered ownership, free from all external liens, municipal taxation, or superior registry control.',
      deedHash,
    };

    return deed;
  }

  /**
   * Computes the deterministic cryptographic hash of a deed for witness verification.
   * 
   * @param {AllodialDeedCertificate} deed - The deed certificate to hash
   * @returns {string} SHA-256 hex hash of deed contents
   */
  static computeDeedHash(deed: AllodialDeedCertificate): string {
    const deedContent = JSON.stringify({
      certificateId: deed.deedCertificateId,
      domain: deed.domainPlatform,
      owner: deed.rightfulOwnerKey,
      tenureStatus: deed.tenureStatus,
      issuanceTimestamp: deed.issuanceTimestamp,
    });

    return crypto.createHash('sha256').update(deedContent).digest('hex');
  }

  /**
   * Validates deed format compliance.
   * 
   * @param {AllodialDeedCertificate} deed - The deed to validate
   * @returns {boolean} True if deed passes all format checks
   */
  static validateDeedFormat(deed: AllodialDeedCertificate): boolean {
    if (!deed.deedCertificateId || !deed.deedCertificateId.startsWith('ALLODIAL-DEED-')) {
      return false;
    }

    if (deed.assetClassification !== 'SOVEREIGN_ALLODIAL_REAL_ESTATE') {
      return false;
    }

    if (!deed.domainPlatform.endsWith('.pi')) {
      return false;
    }

    if (!deed.rightfulOwnerKey.match(/^0x[a-f0-9]{40}$/i)) {
      return false;
    }

    if (deed.tenureStatus !== 'ALLODIAL_FREE_HOLD') {
      return false;
    }

    if (deed.governingProtocol !== 'PiRC-Protocol-Secure-v2') {
      return false;
    }

    return true;
  }

  /**
   * Generates metadata suitable for ERC-721 NFT minting.
   * 
   * @param {AllodialDeedCertificate} deed - The deed certificate
   * @param {string} imageUri - IPFS or storage URI for deed visualization
   * @returns {object} ERC-721 compliant metadata object
   */
  static generateERC721Metadata(deed: AllodialDeedCertificate, imageUri: string) {
    return {
      name: `Allodial Title Deed: ${deed.domainPlatform}`,
      description: `Sovereign, unencumbered freehold title for ${deed.domainPlatform}. Issued under PiRC Protocol. GCV valuation: ${deed.gcvEquityValuation}`,
      image: imageUri,
      attributes: [
        {
          trait_type: 'Asset Type',
          value: 'Sovereign Web3 Real Estate',
        },
        {
          trait_type: 'Domain',
          value: deed.domainPlatform,
        },
        {
          trait_type: 'Tenure Status',
          value: 'Allodial Freehold',
        },
        {
          trait_type: 'GCV Valuation',
          value: deed.gcvEquityValuation,
        },
        {
          trait_type: 'Certificate ID',
          value: deed.deedCertificateId,
        },
        {
          trait_type: 'Issuance Date',
          value: new Date(deed.issuanceTimestamp).toISOString().split('T')[0],
        },
      ],
      properties: {
        certificateId: deed.deedCertificateId,
        ownerWallet: deed.rightfulOwnerKey,
        deedHash: deed.deedHash,
        protocol: deed.governingProtocol,
      },
    };
  }
}
