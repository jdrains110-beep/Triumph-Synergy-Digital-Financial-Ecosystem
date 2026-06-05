/**
 * Automated Dispatch Notification Engine
 * 
 * Handles real-time system broadcasts for decentralized network events.
 * Sends formatted webhook notifications when Allodial Deeds are finalized.
 * 
 * Supports multiple webhook endpoints for redundancy and integration flexibility.
 */

import { AllodialDeedCertificate } from './allodial-deed-factory';

/**
 * Webhook dispatch result
 */
export interface DispatchResult {
  success: boolean;
  timestamp: string;
  webhookUrl: string;
  statusCode?: number;
  error?: string;
}

/**
 * DispatchNotifier
 * 
 * Manages real-time system broadcasts via webhooks and external APIs.
 */
export class DispatchNotifier {
  /**
   * Dispatches a formatted deed finalization message to external webhooks.
   * 
   * Sends Discord-compatible webhook format (embeds) containing:
   * - Deed certificate details
   * - Owner wallet address
   * - GCV valuation
   * - Witness attestation status
   * 
   * @param {AllodialDeedCertificate} deedReport - The issued certificate data object
   * @param {string} webhookUrl - The secure external platform webhook endpoint URL
   * @param {object} witnessData - Optional witness attestation details
   * @returns {Promise<DispatchResult>} Dispatch outcome with status
   */
  static async broadcastDeedFinalization(
    deedReport: AllodialDeedCertificate,
    webhookUrl: string,
    witnessData?: {
      witnessAStatus: string;
      witnessBStatus: string;
      consensusAchieved: boolean;
    }
  ): Promise<DispatchResult> {
    // Skip dispatch if no webhook configured
    if (!webhookUrl) {
      return {
        success: false,
        timestamp: new Date().toISOString(),
        webhookUrl,
        error: 'No webhook URL provided',
      };
    }

    try {
      // Compile a highly scannable grid summary for administrative systems
      const messagePayload = {
        username: '🛡️ SAIB OPTIMUS CORE',
        avatar_url: 'https://pinet.com/logo.png',
        embeds: [
          {
            title: '📜 SOVEREIGN ALLODIAL TITLE DEED FINALIZED',
            description:
              'Absolute tenure ownership has been verified by dual edge witnesses and committed to the ledger matrix. Ownership transfer is immutable and cryptographically secured.',
            color: 13938487, // Hex #D4AF37 (Golden Sovereign Anchor)
            fields: [
              {
                name: '🎖️ CERTIFICATE ID',
                value: `\`${deedReport.deedCertificateId}\``,
                inline: true,
              },
              {
                name: '🏰 REAL ESTATE DOMAIN',
                value: `\`${deedReport.domainPlatform}\``,
                inline: true,
              },
              {
                name: '💰 GCV VALUATION',
                value: `**${deedReport.gcvEquityValuation}**`,
                inline: true,
              },
              {
                name: '👤 RIGHTFUL OWNER WALLET',
                value: `\`${deedReport.rightfulOwnerKey}\``,
                inline: false,
              },
              {
                name: '📋 TENURE STATUS',
                value: `**${deedReport.tenureStatus}**\n_Free and clear of all external liens and taxation_`,
                inline: false,
              },
              ...(witnessData
                ? [
                    {
                      name: '✅ WITNESS ATTESTATION',
                      value: `Witness A: ${witnessData.witnessAStatus}\nWitness B: ${witnessData.witnessBStatus}\nConsensus: ${witnessData.consensusAchieved ? '✓ DUAL CONSENSUS ACHIEVED' : '✗ CONSENSUS FAILED'}`,
                      inline: false,
                    },
                  ]
                : []),
            ],
            footer: {
              text: `Protocol Engine: ${deedReport.governingProtocol} | Ingestion Complete`,
            },
            timestamp: new Date().toISOString(),
          },
        ],
      };

      // Send webhook POST request
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messagePayload),
      });

      return {
        success: response.ok,
        timestamp: new Date().toISOString(),
        webhookUrl,
        statusCode: response.status,
        error: response.ok ? undefined : `HTTP ${response.status}`,
      };
    } catch (err) {
      console.error('Broadcast Pipeline Blocked:', err);
      return {
        success: false,
        timestamp: new Date().toISOString(),
        webhookUrl,
        error: err instanceof Error ? err.message : 'Unknown dispatch error',
      };
    }
  }

  /**
   * Broadcasts deed finalization to multiple webhook endpoints with fallback.
   * 
   * @param {AllodialDeedCertificate} deedReport - The deed certificate
   * @param {string[]} webhookUrls - Array of webhook endpoints to broadcast to
   * @param {object} witnessData - Optional witness attestation details
   * @returns {Promise<DispatchResult[]>} Results from all broadcast attempts
   */
  static async broadcastToMultiple(
    deedReport: AllodialDeedCertificate,
    webhookUrls: string[],
    witnessData?: {
      witnessAStatus: string;
      witnessBStatus: string;
      consensusAchieved: boolean;
    }
  ): Promise<DispatchResult[]> {
    const results = await Promise.all(
      webhookUrls.map((url) => this.broadcastDeedFinalization(deedReport, url, witnessData))
    );

    return results;
  }

  /**
   * Sends a critical alert if deed issuance fails.
   * 
   * @param {string} errorMessage - Description of the failure
   * @param {string} deedId - The deed certificate ID (if available)
   * @param {string} webhookUrl - Alert endpoint
   * @returns {Promise<DispatchResult>} Alert dispatch outcome
   */
  static async broadcastDeedFailureAlert(
    errorMessage: string,
    deedId: string | null,
    webhookUrl: string
  ): Promise<DispatchResult> {
    if (!webhookUrl) {
      return {
        success: false,
        timestamp: new Date().toISOString(),
        webhookUrl,
        error: 'No webhook URL provided',
      };
    }

    try {
      const messagePayload = {
        username: '🚨 SAIB OPTIMUS ALERT',
        embeds: [
          {
            title: '⚠️ ALLODIAL DEED ISSUANCE FAILED',
            description: 'An error occurred during allodial title deed generation or finalization.',
            color: 16711680, // Red
            fields: [
              {
                name: '❌ ERROR',
                value: `\`${errorMessage}\``,
                inline: false,
              },
              ...(deedId ? [{ name: '📋 DEED ID', value: `\`${deedId}\``, inline: false }] : []),
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messagePayload),
      });

      return {
        success: response.ok,
        timestamp: new Date().toISOString(),
        webhookUrl,
        statusCode: response.status,
      };
    } catch (err) {
      console.error('Alert Broadcast Failed:', err);
      return {
        success: false,
        timestamp: new Date().toISOString(),
        webhookUrl,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }
}
