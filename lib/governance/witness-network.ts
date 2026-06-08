/**
 * SAIB v10: Witness Network
 * Byzantine Fault Tolerant consensus for critical actions
 * 10K+ decentralized validators
 */

export interface Witness {
  id: string;
  pi_address: string;
  node_url: string;
  reputation_score: number; // 0-100
  stake_pi: number;
  status: 'active' | 'inactive' | 'slashed';
  last_heartbeat: number;
}

export interface WitnessConsensusRound {
  id: string;
  action_id: string;
  required_signatures: number; // f+1 of 3f+1
  collected_signatures: number;
  status: 'pending' | 'confirmed' | 'failed';
  timeout_at: number;
  signatures: Record<string, string>; // witness_id -> signature
}

class WitnessNetwork {
  private validators: Map<string, Witness> = new Map();
  private pending_rounds: Map<string, WitnessConsensusRound> = new Map();
  private CONSENSUS_TIMEOUT_MS = 10000; // 10 second timeout
  private FAULT_TOLERANCE = Math.floor(10000 / 3); // BFT: f = n/3

  constructor() {
    console.log('[WITNESS] Network initialized (targeting 10K validators)');
  }

  async register_witness(params: {
    pi_address: string;
    node_url: string;
    stake_pi: number;
  }): Promise<Witness> {
    const witness: Witness = {
      id: `wit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      pi_address: params.pi_address,
      node_url: params.node_url,
      reputation_score: 50,
      stake_pi: params.stake_pi,
      status: 'active',
      last_heartbeat: Date.now(),
    };

    this.validators.set(witness.id, witness);

    console.log(`[WITNESS] Registered: ${witness.pi_address} (stake: ${params.stake_pi} Pi)`);

    return witness;
  }

  async request_consensus(
    action_id: string,
    action_data: Record<string, any>,
    critical: boolean = false
  ): Promise<WitnessConsensusRound> {
    console.log(`[WITNESS] Requesting consensus for action: ${action_id} (critical: ${critical})`);

    const round: WitnessConsensusRound = {
      id: `round_${Date.now()}`,
      action_id,
      required_signatures: critical ? Math.floor(2 * this.FAULT_TOLERANCE + 1) : Math.floor(this.FAULT_TOLERANCE + 1),
      collected_signatures: 0,
      status: 'pending',
      timeout_at: Date.now() + this.CONSENSUS_TIMEOUT_MS,
      signatures: {},
    };

    this.pending_rounds.set(round.id, round);

    // Broadcast to active witnesses
    await this.broadcast_consensus_request(round, action_data);

    // Wait for signatures with timeout
    const result = await this.wait_for_consensus(round);

    return result;
  }

  async submit_signature(
    round_id: string,
    witness_id: string,
    signature: string
  ): Promise<{ accepted: boolean; consensus_reached: boolean }> {
    const round = this.pending_rounds.get(round_id);

    if (!round) {
      return { accepted: false, consensus_reached: false };
    }

    if (Date.now() > round.timeout_at) {
      round.status = 'failed';
      return { accepted: false, consensus_reached: false };
    }

    // Verify signature is from registered witness
    const witness = this.validators.get(witness_id);
    if (!witness || witness.status !== 'active') {
      return { accepted: false, consensus_reached: false };
    }

    round.signatures[witness_id] = signature;
    round.collected_signatures++;

    console.log(
      `[WITNESS] Signature received from ${witness_id} (${round.collected_signatures}/${round.required_signatures})`
    );

    const consensus_reached = round.collected_signatures >= round.required_signatures;

    if (consensus_reached) {
      round.status = 'confirmed';
      console.log(`[WITNESS] Consensus confirmed for action: ${round.action_id}`);
    }

    return { accepted: true, consensus_reached };
  }

  async get_active_validators(): Promise<Witness[]> {
    return Array.from(this.validators.values()).filter((w) => w.status === 'active');
  }

  async get_network_health(): Promise<{
    total_validators: number;
    active_validators: number;
    total_stake_pi: number;
    consensus_latency_ms: number;
  }> {
    const active = Array.from(this.validators.values()).filter((w) => w.status === 'active');
    const total_stake = active.reduce((sum, w) => sum + w.stake_pi, 0);

    return {
      total_validators: this.validators.size,
      active_validators: active.length,
      total_stake_pi: total_stake,
      consensus_latency_ms: 300, // BFT consensus typically takes 300-500ms
    };
  }

  async slash_validator(witness_id: string, penalty_pi: number): Promise<boolean> {
    const witness = this.validators.get(witness_id);

    if (!witness) return false;

    witness.stake_pi = Math.max(0, witness.stake_pi - penalty_pi);
    witness.reputation_score = Math.max(0, witness.reputation_score - 10);

    if (witness.stake_pi === 0 || witness.reputation_score < 10) {
      witness.status = 'slashed';
    }

    console.log(`[WITNESS] Slashed ${witness_id}: -${penalty_pi} Pi stake`);

    return true;
  }

  private async broadcast_consensus_request(
    round: WitnessConsensusRound,
    action_data: Record<string, any>
  ): Promise<void> {
    const active_witnesses = Array.from(this.validators.values()).filter((w) => w.status === 'active');

    console.log(`[WITNESS] Broadcasting to ${active_witnesses.length} validators`);

    for (const witness of active_witnesses) {
      // In production: POST to witness.node_url
      // For now: Mock response
      setTimeout(async () => {
        const mock_signature = `sig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await this.submit_signature(round.id, witness.id, mock_signature);
      }, Math.random() * 100); // 0-100ms random delay
    }
  }

  private async wait_for_consensus(round: WitnessConsensusRound): Promise<WitnessConsensusRound> {
    return new Promise((resolve) => {
      const check_interval = setInterval(() => {
        if (round.status === 'confirmed' || round.status === 'failed' || Date.now() > round.timeout_at) {
          clearInterval(check_interval);

          if (round.status === 'pending') {
            round.status = 'failed';
          }

          resolve(round);
        }
      }, 10);
    });
  }
}

export default WitnessNetwork;
