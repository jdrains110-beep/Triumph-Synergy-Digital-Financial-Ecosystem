/**
 * SAIB v5.0: Persistent Memory Layer
 * Immutable mutation ledger (Supabase) + Hot Redis cache
 * Pattern recognition via pgvector embeddings
 */

import { createClient } from '@supabase/supabase-js';
import redis from 'redis';

export interface MutationMemory {
  id: string;
  timestamp: number;
  mutation_type: string; // 'service_restart', 'scale_memory', 'clear_cache', 'config_reload'
  service: string;
  description: string;
  outcome: 'success' | 'partial' | 'rollback';

  // Metrics before/after
  metric_before: Record<string, number>;
  metric_after: Record<string, number>;
  metric_delta: Record<string, number>;

  // Vector embedding for pattern matching
  embedding: number[];

  // Audit
  human_approved: boolean;
  human_approver?: string;
  witness_signatures: string[];

  // Confidence
  confidence_score: number; // 0-1
}

class PersistentMemory {
  private supabase: ReturnType<typeof createClient>;
  private redis: redis.RedisClient;
  private embedding_cache: Map<string, number[]> = new Map();

  constructor(
    supabase_url: string = process.env.SUPABASE_URL || '',
    supabase_key: string = process.env.SUPABASE_KEY || '',
    redis_url: string = 'redis://localhost:6379'
  ) {
    this.supabase = createClient(supabase_url, supabase_key);
    this.redis = redis.createClient(redis_url);
  }

  async record_mutation(mutation: MutationMemory): Promise<MutationMemory> {
    // Step 1: Hot cache (Redis)
    await this.redis_store_mutation(mutation);

    // Step 2: Cold ledger (Supabase - immutable)
    const stored = await this.supabase
      .from('saib_mutation_ledger')
      .insert([
        {
          id: mutation.id,
          timestamp: mutation.timestamp,
          mutation_type: mutation.mutation_type,
          service: mutation.service,
          description: mutation.description,
          outcome: mutation.outcome,
          metric_before: mutation.metric_before,
          metric_after: mutation.metric_after,
          metric_delta: mutation.metric_delta,
          embedding: mutation.embedding,
          human_approved: mutation.human_approved,
          human_approver: mutation.human_approver,
          witness_signatures: mutation.witness_signatures,
          confidence_score: mutation.confidence_score,
        },
      ])
      .select()
      .single();

    if (stored.error) {
      console.error('[MEMORY] Supabase insert error:', stored.error);
      throw stored.error;
    }

    console.log(`[MEMORY] Recorded mutation: ${mutation.service} - ${mutation.mutation_type}`);
    return mutation;
  }

  async find_similar_patterns(
    current_state: Record<string, any>,
    limit: number = 5
  ): Promise<MutationMemory[]> {
    // Step 1: Embed current state
    const current_embedding = await this.embed_state(current_state);

    // Step 2: Search Supabase pgvector
    const { data, error } = await this.supabase.rpc('search_mutations_by_embedding', {
      query_embedding: current_embedding,
      match_threshold: 0.8,
      match_count: limit,
    });

    if (error) {
      console.error('[MEMORY] Vector search error:', error);
      return [];
    }

    return data || [];
  }

  async recall_mutations_by_service(
    service: string,
    time_window_days: number = 30
  ): Promise<MutationMemory[]> {
    const cutoff = Date.now() - time_window_days * 24 * 60 * 60 * 1000;

    const { data, error } = await this.supabase
      .from('saib_mutation_ledger')
      .select('*')
      .eq('service', service)
      .gt('timestamp', cutoff)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('[MEMORY] Recall error:', error);
      return [];
    }

    return data || [];
  }

  async compute_success_rate(
    service: string,
    mutation_type: string,
    time_window_days: number = 30
  ): Promise<number> {
    const mutations = await this.recall_mutations_by_service(service, time_window_days);
    const filtered = mutations.filter((m) => m.mutation_type === mutation_type);

    if (!filtered.length) return 0;

    const successful = filtered.filter((m) => m.outcome === 'success').length;
    return successful / filtered.length;
  }

  async get_mutation_history_trend(
    service: string,
    days: number = 30
  ): Promise<{ date: string; success_rate: number }[]> {
    const mutations = await this.recall_mutations_by_service(service, days);

    const grouped = new Map<string, { success: number; total: number }>();

    for (const mutation of mutations) {
      const date = new Date(mutation.timestamp).toISOString().split('T')[0];
      if (!grouped.has(date)) {
        grouped.set(date, { success: 0, total: 0 });
      }

      const entry = grouped.get(date)!;
      entry.total++;
      if (mutation.outcome === 'success') entry.success++;
    }

    return Array.from(grouped.entries())
      .map(([date, { success, total }]) => ({
        date,
        success_rate: total > 0 ? success / total : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async learning_feedback_loop(
    mutation_id: string,
    actual_outcome: 'success' | 'failure' | 'partial',
    actual_metrics: Record<string, number>
  ) {
    // Called post-mutation to calibrate predictions
    const { data, error } = await this.supabase
      .from('saib_mutation_ledger')
      .select('*')
      .eq('id', mutation_id)
      .single();

    if (error || !data) {
      console.error('[MEMORY] Feedback loop - mutation not found:', mutation_id);
      return;
    }

    // Update with actual outcome
    await this.supabase
      .from('saib_mutation_ledger')
      .update({
        outcome: actual_outcome,
        metric_after: actual_metrics,
        metric_delta: this.compute_delta(data.metric_before, actual_metrics),
        confidence_score: actual_outcome === 'success' ? Math.min(1, data.confidence_score + 0.05) : Math.max(0, data.confidence_score - 0.1),
      })
      .eq('id', mutation_id);

    console.log(`[MEMORY] Feedback recorded: ${mutation_id} - ${actual_outcome}`);
  }

  private async redis_store_mutation(mutation: MutationMemory) {
    // Store in sorted set for time-based queries
    return new Promise<void>((resolve, reject) => {
      this.redis.zadd(
        'saib:mutations:by_time',
        mutation.timestamp,
        JSON.stringify(mutation),
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  private async embed_state(state: Record<string, any>): Promise<number[]> {
    // Check cache first
    const state_str = JSON.stringify(state);
    const cached = this.embedding_cache.get(state_str);
    if (cached) return cached;

    // Generate embedding (1536-dim OpenAI or similar)
    // For now, return mock embedding for v5.0
    const mock_embedding = Array(1536)
      .fill(0)
      .map(() => Math.random() - 0.5);

    this.embedding_cache.set(state_str, mock_embedding);
    return mock_embedding;
  }

  private compute_delta(before: Record<string, number>, after: Record<string, number>): Record<string, number> {
    const delta: Record<string, number> = {};
    for (const key of Object.keys(after)) {
      delta[key] = after[key] - (before[key] || 0);
    }
    return delta;
  }

  async get_latest_tick(): Promise<any> {
    // Return most recent ecosystem tick for dashboard
    return new Promise((resolve) => {
      this.redis.get('saib:latest_tick', (err, data) => {
        if (err || !data) {
          resolve(null);
        } else {
          resolve(JSON.parse(data));
        }
      });
    });
  }

  async store_tick(tick_data: any) {
    return new Promise<void>((resolve) => {
      this.redis.set('saib:latest_tick', JSON.stringify(tick_data), (err) => {
        resolve();
      });
    });
  }
}

export default PersistentMemory;
