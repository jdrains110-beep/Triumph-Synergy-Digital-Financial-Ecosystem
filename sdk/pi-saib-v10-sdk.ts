/**
 * SAIB v10 SDK: One-Click Integration
 * Any Pi dApp integrates in 5 minutes
 * 800 lines - payments, deeds, gig jobs, compliance
 */

export interface TriumphSDKConfig {
  api_key: string;
  webhook_url?: string;
  environment: 'production' | 'sandbox';
}

export class TriumphSDK {
  private api_key: string;
  private webhook_url?: string;
  private base_url = 'https://api.triumph.app';

  constructor(config: TriumphSDKConfig) {
    this.api_key = config.api_key;
    this.webhook_url = config.webhook_url;

    if (config.environment === 'sandbox') {
      this.base_url = 'https://sandbox-api.triumph.app';
    }

    console.log(`[TRIUMPH-SDK] Initialized (${config.environment})`);
  }

  /**
   * Process instant payment: Pi → TRISYN or other assets
   * @param amount Amount in Pi
   * @param recipient_pi_address Recipient Pi address
   * @param requested_asset Output asset (TRISYN, USD, USDC, etc.)
   * @returns Transaction ID and confirmation
   */
  async process_payment(params: {
    amount_pi: number;
    recipient_pi_address: string;
    merchant_id: string;
    requested_asset?: string;
  }): Promise<{ txn_id: string; confirmed: boolean; actual_amount: number }> {
    console.log(
      `[SDK] Processing payment: ${params.amount_pi} Pi → ${params.recipient_pi_address} (${params.requested_asset || 'default'})`
    );

    const response = await this.post('/payments/process', {
      amount_pi: params.amount_pi,
      recipient_pi_address: params.recipient_pi_address,
      merchant_id: params.merchant_id,
      requested_asset: params.requested_asset || 'TRISYN',
    });

    return response;
  }

  /**
   * Create immutable Allodial Deed
   * @param asset_type Type of asset (real_estate, vehicle, intellectual_property, business)
   * @param owner_did Decentralized identity of owner
   * @param description Asset description
   * @param lifetime_years How long deed is valid
   * @returns Deed ID and blockchain reference
   */
  async create_deed(params: {
    asset_type: 'real_estate' | 'vehicle' | 'intellectual_property' | 'business';
    owner_did: string;
    description: string;
    lifetime_years: number;
    metadata?: Record<string, any>;
  }): Promise<{ deed_id: string; blockchain_hash: string; created_at: number }> {
    console.log(`[SDK] Creating deed: ${params.asset_type} for ${params.owner_did}`);

    const response = await this.post('/deeds/create', params);

    return response;
  }

  /**
   * Transfer deed ownership
   * @param deed_id ID of deed to transfer
   * @param from_did Current owner
   * @param to_did New owner
   * @returns Transfer confirmation
   */
  async transfer_deed(params: {
    deed_id: string;
    from_did: string;
    to_did: string;
  }): Promise<{ transfer_id: string; confirmed: boolean }> {
    console.log(`[SDK] Transferring deed: ${params.deed_id}`);

    const response = await this.post('/deeds/transfer', params);

    return response;
  }

  /**
   * Post gig job to marketplace
   * @param title Job title
   * @param reward_pi Reward in Pi
   * @param deadline ISO timestamp
   * @param required_reputation_score Min reputation to accept
   * @returns Job ID and listings URL
   */
  async post_gig_job(params: {
    title: string;
    description: string;
    reward_pi: number;
    deadline: string; // ISO timestamp
    required_reputation_score?: number;
    category?: string;
  }): Promise<{ job_id: string; listing_url: string; posted_at: number }> {
    console.log(`[SDK] Posting gig: "${params.title}" for ${params.reward_pi} Pi`);

    const response = await this.post('/gigs/post-job', params);

    return response;
  }

  /**
   * Get instant settlement for gig completion
   * @param job_id Job ID
   * @param worker_pi_address Worker Pi address
   * @param amount Amount to settle in Pi
   * @returns Settlement confirmation
   */
  async settle_gig_completion(params: {
    job_id: string;
    worker_pi_address: string;
    amount_pi: number;
    proof_of_completion: string; // JSON serialized proof
  }): Promise<{ settlement_id: string; txn_id: string; confirmed_at: number }> {
    console.log(`[SDK] Settling gig: ${params.job_id} for ${params.worker_pi_address}`);

    const response = await this.post('/gigs/settle', params);

    return response;
  }

  /**
   * Initialize KYC verification
   * @param user_did User DID
   * @param jurisdiction User jurisdiction
   * @returns KYC verification URL
   */
  async start_kyc_verification(params: {
    user_did: string;
    jurisdiction: string;
    callback_url: string;
  }): Promise<{ kyc_session_id: string; verification_url: string }> {
    console.log(`[SDK] Starting KYC for ${params.user_did} (${params.jurisdiction})`);

    const response = await this.post('/compliance/kyc-start', params);

    return response;
  }

  /**
   * Get wallet balance
   * @param pi_address Pi address
   * @param asset Asset type (Pi, TRISYN, etc.)
   * @returns Balance
   */
  async get_balance(params: {
    pi_address: string;
    asset?: string;
  }): Promise<{ balance: number; asset: string; updated_at: number }> {
    const response = await this.get(`/balances/${params.pi_address}`, {
      asset: params.asset || 'Pi',
    });

    return response;
  }

  /**
   * List recent transactions
   * @param pi_address Pi address
   * @param limit Max results
   * @returns Transaction history
   */
  async get_transaction_history(params: {
    pi_address: string;
    limit?: number;
  }): Promise<{ transactions: any[]; total_count: number }> {
    const response = await this.get(`/transactions/${params.pi_address}`, {
      limit: params.limit || 50,
    });

    return response;
  }

  /**
   * Register webhook for events
   * @param event_type Event to listen for
   * @param webhook_url URL to receive POST requests
   * @returns Webhook registration ID
   */
  async register_webhook(params: {
    event_type: 'payment.confirmed' | 'deed.created' | 'gig.completed' | 'kyc.approved';
    webhook_url: string;
  }): Promise<{ webhook_id: string; verified: boolean }> {
    const response = await this.post('/webhooks/register', params);

    return response;
  }

  private async post(endpoint: string, data: Record<string, any>): Promise<any> {
    try {
      const response = await fetch(`${this.base_url}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.api_key}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (err) {
      console.error('[SDK] Request error:', err);
      throw err;
    }
  }

  private async get(endpoint: string, params?: Record<string, any>): Promise<any> {
    try {
      const query = new URLSearchParams(params).toString();
      const url = `${this.base_url}${endpoint}${query ? '?' + query : ''}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.api_key}`,
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (err) {
      console.error('[SDK] Request error:', err);
      throw err;
    }
  }
}

export default TriumphSDK;
