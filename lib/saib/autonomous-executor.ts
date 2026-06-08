/**
 * SAIB v5.0: Autonomous Executor
 * Low-risk mutations auto-applied, mid-risk escalated to Guardian
 * High-risk requires human review
 */

import PersistentMemory, { MutationMemory } from './persistent-memory';
import { QuantumBuilder, Diagnosis } from './quantum-builder';

export interface ExecutionResult {
  status: 'applied' | 'escalated' | 'pending_human_review' | 'failed';
  applied_by: 'autonomous_executor' | 'guardian_watchdog' | 'human' | 'none';
  risk_score: number;
  mutation_id: string;
  result?: any;
  reason?: string;
}

class AutonomousExecutor {
  private memory: PersistentMemory;
  private quantum_builder: QuantumBuilder;
  private RISK_AUTO_APPLY_THRESHOLD = 0.3;
  private RISK_ESCALATE_THRESHOLD = 0.7;

  constructor(memory: PersistentMemory, quantum_builder: QuantumBuilder) {
    this.memory = memory;
    this.quantum_builder = quantum_builder;
  }

  async evaluate_and_execute(diagnosis: Diagnosis): Promise<ExecutionResult> {
    // Step 1: Calculate risk score (0-1)
    const risk_score = await this.calculate_risk_score(diagnosis);

    console.log(`[EXECUTOR] Evaluating: ${diagnosis.service} - ${diagnosis.issue} (risk: ${risk_score.toFixed(2)})`);

    // Step 2: Route based on risk
    if (risk_score < this.RISK_AUTO_APPLY_THRESHOLD) {
      return await this.auto_apply_low_risk(diagnosis, risk_score);
    } else if (risk_score < this.RISK_ESCALATE_THRESHOLD) {
      return await this.escalate_to_guardian(diagnosis, risk_score);
    } else {
      return await this.request_human_review(diagnosis, risk_score);
    }
  }

  private async auto_apply_low_risk(diagnosis: Diagnosis, risk_score: number): Promise<ExecutionResult> {
    const mutation_id = this.generate_mutation_id();

    console.log(`[AUTO-APPLY] ${diagnosis.service}: ${diagnosis.recommendation}`);

    try {
      // Capture metrics before
      const metric_before = await this.capture_service_metrics(diagnosis.service);

      // Apply mutation
      const result = await this.apply_mutation(diagnosis);

      // Capture metrics after
      const metric_after = await this.capture_service_metrics(diagnosis.service);

      // Record in memory
      const mutation: MutationMemory = {
        id: mutation_id,
        timestamp: Date.now(),
        mutation_type: diagnosis.mutation_type,
        service: diagnosis.service,
        description: diagnosis.recommendation,
        outcome: result.success ? 'success' : 'partial',
        metric_before,
        metric_after,
        metric_delta: this.compute_delta(metric_before, metric_after),
        embedding: [],
        human_approved: false,
        witness_signatures: [],
        confidence_score: 1 - risk_score,
      };

      await this.memory.record_mutation(mutation);

      return {
        status: 'applied',
        applied_by: 'autonomous_executor',
        risk_score,
        mutation_id,
        result,
      };
    } catch (err) {
      console.error(`[EXECUTOR] Auto-apply failed:`, err);
      return await this.escalate_to_guardian(diagnosis, Math.min(1, risk_score + 0.3));
    }
  }

  private async escalate_to_guardian(diagnosis: Diagnosis, risk_score: number): Promise<ExecutionResult> {
    const mutation_id = this.generate_mutation_id();

    console.log(`[ESCALATE] Guardian review required: ${diagnosis.service} (risk: ${risk_score.toFixed(2)})`);

    // In full system: Guardian Watchdog makes decision
    // For now: Return escalated status
    return {
      status: 'escalated',
      applied_by: 'guardian_watchdog',
      risk_score,
      mutation_id,
      reason: `Risk score ${risk_score.toFixed(2)} exceeds auto-apply threshold. Awaiting Guardian review.`,
    };
  }

  private async request_human_review(diagnosis: Diagnosis, risk_score: number): Promise<ExecutionResult> {
    const mutation_id = this.generate_mutation_id();

    console.log(`[HUMAN-REVIEW] ${diagnosis.service}: ${diagnosis.recommendation} (risk: ${risk_score.toFixed(2)})`);

    // In full system: Post to Slack, create GitHub issue
    const message = `
🔴 HIGH RISK MUTATION REQUIRES HUMAN REVIEW
Service: ${diagnosis.service}
Issue: ${diagnosis.issue}
Recommendation: ${diagnosis.recommendation}
Risk Score: ${(risk_score * 100).toFixed(0)}/100

Approve: [YES] [NO] [IGNORE]
    `;

    console.log(message);

    return {
      status: 'pending_human_review',
      applied_by: 'none',
      risk_score,
      mutation_id,
      reason: 'High-risk mutation pending human review',
    };
  }

  private async calculate_risk_score(diagnosis: Diagnosis): Promise<number> {
    // Risk factors:
    // 1. Historical success rate of this fix (0-50% risk weight)
    // 2. Impact scope (0-20% risk weight)
    // 3. Data mutation (0-20% risk weight)
    // 4. Reversibility (0-10% risk weight)

    const success_rate = await this.memory.compute_success_rate(
      diagnosis.service,
      diagnosis.mutation_type,
      30
    );

    const base_risk = 1 - success_rate; // If 80% success = 0.2 base risk

    const impact_factor = diagnosis.scope === 'single_service' ? 1 : 1.5;
    const data_factor = diagnosis.writes_data ? 1.5 : 0.8;
    const reversibility_factor = diagnosis.reversible ? 0.8 : 1.2;

    let adjusted_risk = base_risk * impact_factor * data_factor * reversibility_factor;

    // Clamp to 0-1
    adjusted_risk = Math.max(0, Math.min(1, adjusted_risk));

    console.log(
      `[RISK] ${diagnosis.service}: base=${base_risk.toFixed(2)} adjusted=${adjusted_risk.toFixed(2)} (success_rate=${(success_rate * 100).toFixed(0)}%)`
    );

    return adjusted_risk;
  }

  private async apply_mutation(diagnosis: Diagnosis): Promise<{ success: boolean; error?: string }> {
    switch (diagnosis.mutation_type) {
      case 'service_restart':
        return await this.restart_service(diagnosis.service);
      case 'scale_memory':
        return await this.scale_memory(diagnosis);
      case 'clear_cache':
        return await this.clear_cache(diagnosis);
      case 'reload_config':
        return await this.reload_config(diagnosis);
      default:
        throw new Error(`Unknown mutation type: ${diagnosis.mutation_type}`);
    }
  }

  private async restart_service(service: string): Promise<{ success: boolean }> {
    console.log(`[RESTART] Service: ${service}`);
    // In production: docker-compose restart {service}
    // For now: mock success
    return { success: true };
  }

  private async scale_memory(diagnosis: Diagnosis): Promise<{ success: boolean }> {
    const match = diagnosis.recommendation.match(/(\d+)\s*(GB|MB)/i);
    if (!match) return { success: false, error: 'Cannot parse memory from recommendation' };

    const amount = match[1];
    const unit = match[2];

    console.log(`[SCALE] ${diagnosis.service}: ${amount}${unit}`);
    // In production: Update docker-compose or Kubernetes
    return { success: true };
  }

  private async clear_cache(diagnosis: Diagnosis): Promise<{ success: boolean }> {
    console.log(`[CACHE] Clearing: ${diagnosis.service}`);
    // In production: Redis FLUSHDB or targeted key cleanup
    return { success: true };
  }

  private async reload_config(diagnosis: Diagnosis): Promise<{ success: boolean }> {
    console.log(`[CONFIG] Reloading: ${diagnosis.service}`);
    // In production: Send SIGHUP or config reload endpoint
    return { success: true };
  }

  private async capture_service_metrics(service: string): Promise<Record<string, number>> {
    // Capture current metrics from service
    return {
      latency_ms: Math.random() * 100,
      cpu_percent: Math.random() * 80,
      memory_mb: Math.random() * 500 + 100,
      uptime_seconds: Math.random() * 1000000,
    };
  }

  private compute_delta(
    before: Record<string, number>,
    after: Record<string, number>
  ): Record<string, number> {
    const delta: Record<string, number> = {};
    for (const key of Object.keys(after)) {
      delta[key] = after[key] - (before[key] || 0);
    }
    return delta;
  }

  private generate_mutation_id(): string {
    return `mut_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default AutonomousExecutor;
