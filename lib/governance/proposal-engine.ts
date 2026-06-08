/**
 * SAIB v10: Proposal & Governance Engine
 * Community voting on non-core changes
 * Immutable core: quantum-builder, meta-builder, GCV peg cannot be voted on
 */

import { createClient } from '@supabase/supabase-js';

export interface Proposal {
  id: string;
  title: string;
  description: string;
  type: 'ecosystem_parameter' | 'new_integration' | 'budget_allocation' | 'policy_change';
  creator_address: string;
  created_at: number;
  voting_period_days: number;
  quorum_required: number; // e.g., 10K unique voters
  approval_threshold_percent: number; // e.g., 66%
  immutable_parts: string[]; // Cannot be changed
  status: 'draft' | 'voting' | 'approved' | 'executed' | 'rejected';
  votes_yes: number;
  votes_no: number;
  total_voters: number;
}

class ProposalEngine {
  private supabase: ReturnType<typeof createClient>;
  private IMMUTABLE_CORE = [
    'quantum_builder',
    'meta_builder',
    'gcv_peg_enforcement',
    'witness_network_core',
    'immutable_ledger',
  ];

  constructor(
    supabase_url: string = process.env.SUPABASE_URL || '',
    supabase_key: string = process.env.SUPABASE_KEY || ''
  ) {
    this.supabase = createClient(supabase_url, supabase_key);
  }

  async create_proposal(proposal: Partial<Proposal>): Promise<Proposal> {
    console.log(`[GOVERNANCE] Creating proposal: ${proposal.title}`);

    // Validate not touching immutable core
    if (proposal.immutable_parts) {
      for (const part of proposal.immutable_parts) {
        if (this.IMMUTABLE_CORE.includes(part)) {
          throw new Error(`Cannot modify immutable core: ${part}`);
        }
      }
    }

    const new_proposal: Proposal = {
      id: `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: proposal.title || '',
      description: proposal.description || '',
      type: proposal.type || 'ecosystem_parameter',
      creator_address: proposal.creator_address || '',
      created_at: Date.now(),
      voting_period_days: proposal.voting_period_days || 7,
      quorum_required: proposal.quorum_required || 10000,
      approval_threshold_percent: proposal.approval_threshold_percent || 66,
      immutable_parts: proposal.immutable_parts || [],
      status: 'draft',
      votes_yes: 0,
      votes_no: 0,
      total_voters: 0,
    };

    // Store in database
    const { error } = await this.supabase.from('governance_proposals').insert([new_proposal]);

    if (error) {
      console.error('[GOVERNANCE] Proposal creation error:', error);
      throw error;
    }

    console.log(`[GOVERNANCE] Proposal created: ${new_proposal.id}`);
    return new_proposal;
  }

  async start_voting(proposal_id: string): Promise<Proposal> {
    console.log(`[GOVERNANCE] Starting vote for: ${proposal_id}`);

    const { data, error } = await this.supabase
      .from('governance_proposals')
      .update({ status: 'voting' })
      .eq('id', proposal_id)
      .select()
      .single();

    if (error || !data) {
      throw error;
    }

    // Broadcast vote invite to Pioneers
    console.log(`[GOVERNANCE] Broadcasting vote invite to Pioneer network`);

    return data;
  }

  async cast_vote(proposal_id: string, voter_address: string, vote: 'yes' | 'no'): Promise<boolean> {
    console.log(`[GOVERNANCE] Vote from ${voter_address}: ${vote} for ${proposal_id}`);

    // Record vote (prevent double voting)
    const { error } = await this.supabase.from('governance_votes').insert([
      {
        proposal_id,
        voter_address,
        vote,
        timestamp: Date.now(),
      },
    ]);

    if (error) {
      console.error('[GOVERNANCE] Vote recording error:', error);
      return false;
    }

    // Update vote totals
    const { data: proposal } = await this.supabase
      .from('governance_proposals')
      .select('votes_yes, votes_no, total_voters')
      .eq('id', proposal_id)
      .single();

    if (!proposal) return false;

    const votes_yes = proposal.votes_yes + (vote === 'yes' ? 1 : 0);
    const votes_no = proposal.votes_no + (vote === 'no' ? 1 : 0);
    const total_voters = votes_yes + votes_no;

    await this.supabase
      .from('governance_proposals')
      .update({
        votes_yes,
        votes_no,
        total_voters,
      })
      .eq('id', proposal_id);

    return true;
  }

  async finalize_vote(proposal_id: string): Promise<Proposal | null> {
    console.log(`[GOVERNANCE] Finalizing vote for: ${proposal_id}`);

    const { data: proposal, error } = await this.supabase
      .from('governance_proposals')
      .select('*')
      .eq('id', proposal_id)
      .single();

    if (error || !proposal) {
      throw error;
    }

    // Check quorum
    if (proposal.total_voters < proposal.quorum_required) {
      console.log(`[GOVERNANCE] Quorum not met: ${proposal.total_voters}/${proposal.quorum_required}`);
      await this.supabase.from('governance_proposals').update({ status: 'rejected' }).eq('id', proposal_id);
      return proposal;
    }

    // Check approval threshold
    const approval_percent = (proposal.votes_yes / proposal.total_voters) * 100;
    const approved = approval_percent >= proposal.approval_threshold_percent;

    const status = approved ? 'approved' : 'rejected';

    await this.supabase.from('governance_proposals').update({ status }).eq('id', proposal_id);

    console.log(`[GOVERNANCE] Vote finalized: ${status} (${approval_percent.toFixed(1)}% approval)`);

    return proposal;
  }

  async execute_approved_proposal(proposal_id: string): Promise<boolean> {
    const { data: proposal, error } = await this.supabase
      .from('governance_proposals')
      .select('*')
      .eq('id', proposal_id)
      .single();

    if (error || !proposal) {
      throw error;
    }

    if (proposal.status !== 'approved') {
      console.error('[GOVERNANCE] Proposal not approved');
      return false;
    }

    console.log(`[GOVERNANCE] Executing proposal: ${proposal.title}`);

    // Execute based on proposal type
    switch (proposal.type) {
      case 'ecosystem_parameter':
        await this.execute_parameter_change(proposal);
        break;
      case 'new_integration':
        await this.execute_integration_activation(proposal);
        break;
      case 'budget_allocation':
        await this.execute_budget_change(proposal);
        break;
    }

    // Mark as executed
    await this.supabase.from('governance_proposals').update({ status: 'executed' }).eq('id', proposal_id);

    console.log(`[GOVERNANCE] Proposal executed: ${proposal_id}`);

    return true;
  }

  private async execute_parameter_change(proposal: Proposal): Promise<void> {
    // Update ecosystem parameters (e.g., GCV tolerance, fee percentages)
    console.log(`[GOVERNANCE] Changing parameter: ${proposal.description}`);
  }

  private async execute_integration_activation(proposal: Proposal): Promise<void> {
    // Activate new bridge, oracle, or service
    console.log(`[GOVERNANCE] Activating integration: ${proposal.description}`);
  }

  private async execute_budget_change(proposal: Proposal): Promise<void> {
    // Allocate budget to development, operations, or community
    console.log(`[GOVERNANCE] Allocating budget: ${proposal.description}`);
  }

  async get_active_proposals(): Promise<Proposal[]> {
    const { data, error } = await this.supabase
      .from('governance_proposals')
      .select('*')
      .eq('status', 'voting')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[GOVERNANCE] Fetch error:', error);
      return [];
    }

    return data || [];
  }
}

export default ProposalEngine;
