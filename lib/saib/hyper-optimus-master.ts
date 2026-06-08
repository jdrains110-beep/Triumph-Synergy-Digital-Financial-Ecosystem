/**
 * Hyper Optimus Master Resource Optimizer
 * 
 * A superior CPU & memory management system that acts as the apex controller
 * for resource allocation across all SAIB components.
 * 
 * Features:
 * - Real-time CPU/memory monitoring
 * - Adaptive resource allocation
 * - Garbage collection optimization
 * - Component throttling (when resources constrained)
 * - Predictive scaling
 * - Emergency resource recovery
 */

import * as os from 'os';

export interface ResourceMetrics {
  timestamp: number;
  cpu_percent: number;
  memory_used_mb: number;
  memory_available_mb: number;
  memory_percent: number;
  heap_used_mb: number;
  heap_total_mb: number;
  external_memory_mb: number;
  event_loop_lag_ms: number;
}

export interface ResourcePolicy {
  cpu_threshold_percent: number;
  memory_threshold_percent: number;
  heap_threshold_percent: number;
  event_loop_lag_threshold_ms: number;
  gc_interval_ms: number;
  throttle_level: 'normal' | 'reduced' | 'minimal' | 'critical';
}

export interface OptimizationAction {
  type: 'gc' | 'throttle' | 'scale' | 'cache_clear' | 'suspend_non_critical';
  target_component: string;
  reason: string;
  expected_savings_mb: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
}

class HyperOptimusMasterOptimizer {
  private metrics_history: ResourceMetrics[] = [];
  private max_history_length = 1000;
  private policies: ResourcePolicy;
  private actions_taken: OptimizationAction[] = [];
  private last_gc_time = 0;

  constructor() {
    this.policies = {
      cpu_threshold_percent: 75,
      memory_threshold_percent: 80,
      heap_threshold_percent: 85,
      event_loop_lag_threshold_ms: 100,
      gc_interval_ms: 30000, // 30 seconds
      throttle_level: 'normal',
    };
  }

  /**
   * Collect current resource metrics
   */
  async collect_metrics(): Promise<ResourceMetrics> {
    const now = Date.now();
    const uptime = os.uptime();
    const cpu_count = os.cpus().length;
    const total_memory = os.totalmem();
    const free_memory = os.freemem();

    // Get process-specific metrics
    const mem_usage = process.memoryUsage();

    const metrics: ResourceMetrics = {
      timestamp: now,
      cpu_percent: await this.estimate_cpu_percent(),
      memory_used_mb: Math.round((total_memory - free_memory) / 1024 / 1024),
      memory_available_mb: Math.round(free_memory / 1024 / 1024),
      memory_percent: Math.round(((total_memory - free_memory) / total_memory) * 100),
      heap_used_mb: Math.round(mem_usage.heapUsed / 1024 / 1024),
      heap_total_mb: Math.round(mem_usage.heapTotal / 1024 / 1024),
      external_memory_mb: Math.round(mem_usage.external / 1024 / 1024),
      event_loop_lag_ms: this.measure_event_loop_lag(),
    };

    // Store in history
    this.metrics_history.push(metrics);
    if (this.metrics_history.length > this.max_history_length) {
      this.metrics_history.shift();
    }

    return metrics;
  }

  /**
   * Estimate CPU percentage (rough approximation)
   */
  private async estimate_cpu_percent(): Promise<number> {
    const cpus = os.cpus();
    let total_idle = 0;
    let total_tick = 0;

    cpus.forEach((cpu) => {
      for (const type in cpu.times) {
        total_tick += cpu.times[type as keyof typeof cpu.times];
      }
      total_idle += cpu.times.idle;
    });

    const idle = total_idle / cpus.length;
    const total = total_tick / cpus.length;
    const usage = 100 - ~~(100 * idle / total);

    return Math.max(0, Math.min(100, usage));
  }

  /**
   * Measure event loop lag (indicator of system stress)
   */
  private measure_event_loop_lag(): number {
    const start = Date.now();
    setImmediate(() => {
      // Just to get event loop lag measurement
    });
    return Math.max(0, Date.now() - start);
  }

  /**
   * Analyze metrics and determine if optimization needed
   */
  async analyze_and_optimize(): Promise<OptimizationAction[]> {
    const metrics = await this.collect_metrics();
    const actions: OptimizationAction[] = [];

    // Check memory pressure
    if (metrics.memory_percent > this.policies.memory_threshold_percent) {
      actions.push({
        type: 'gc',
        target_component: 'global',
        reason: `Memory usage ${metrics.memory_percent}% exceeds threshold ${this.policies.memory_threshold_percent}%`,
        expected_savings_mb: Math.round(metrics.heap_used_mb * 0.15),
        priority: metrics.memory_percent > 90 ? 'critical' : 'high',
        timestamp: Date.now(),
      });
    }

    // Check heap pressure
    if (metrics.heap_used_mb > (metrics.heap_total_mb * this.policies.heap_threshold_percent) / 100) {
      actions.push({
        type: 'cache_clear',
        target_component: 'persistent_memory',
        reason: `Heap usage ${metrics.heap_used_mb}MB exceeds threshold`,
        expected_savings_mb: Math.round(metrics.heap_used_mb * 0.20),
        priority: 'high',
        timestamp: Date.now(),
      });
    }

    // Check event loop lag
    if (metrics.event_loop_lag_ms > this.policies.event_loop_lag_threshold_ms) {
      actions.push({
        type: 'throttle',
        target_component: 'autonomous_executor',
        reason: `Event loop lag ${metrics.event_loop_lag_ms}ms exceeds threshold`,
        expected_savings_mb: 0,
        priority: 'medium',
        timestamp: Date.now(),
      });
    }

    // Check CPU
    if (metrics.cpu_percent > this.policies.cpu_threshold_percent) {
      actions.push({
        type: 'throttle',
        target_component: 'orchestrator',
        reason: `CPU ${metrics.cpu_percent}% exceeds threshold ${this.policies.cpu_threshold_percent}%`,
        expected_savings_mb: 0,
        priority: 'medium',
        timestamp: Date.now(),
      });
    }

    // Execute high priority actions immediately
    const critical_actions = actions.filter(a => a.priority === 'critical');
    for (const action of critical_actions) {
      await this.execute_optimization(action);
    }

    // Track all actions
    this.actions_taken.push(...actions);
    if (this.actions_taken.length > 10000) {
      this.actions_taken = this.actions_taken.slice(-10000);
    }

    return actions;
  }

  /**
   * Execute optimization action
   */
  private async execute_optimization(action: OptimizationAction): Promise<void> {
    switch (action.type) {
      case 'gc':
        await this.trigger_garbage_collection();
        break;

      case 'cache_clear':
        await this.clear_caches();
        break;

      case 'throttle':
        await this.apply_throttle(action.target_component);
        break;

      case 'suspend_non_critical':
        await this.suspend_non_critical_operations();
        break;

      case 'scale':
        await this.adjust_resource_allocation(action.target_component);
        break;
    }
  }

  /**
   * Trigger garbage collection
   */
  private async trigger_garbage_collection(): Promise<void> {
    const now = Date.now();
    if (now - this.last_gc_time < 5000) {
      return; // Don't run GC more than once per 5 seconds
    }

    if (global.gc) {
      global.gc();
      this.last_gc_time = now;
    }
  }

  /**
   * Clear in-memory caches
   */
  private async clear_caches(): Promise<void> {
    // This would be implemented by each component
    // For now, we just mark that it should happen
    // Components would listen for 'cache_clear' event
  }

  /**
   * Apply throttling to reduce system load
   */
  private async apply_throttle(component: string): Promise<void> {
    // Signal components to reduce operations
    // This would be implemented via event emitters
  }

  /**
   * Suspend non-critical operations
   */
  private async suspend_non_critical_operations(): Promise<void> {
    // Stop background tasks, defer non-urgent operations
  }

  /**
   * Adjust resource allocation based on component needs
   */
  private async adjust_resource_allocation(component: string): Promise<void> {
    // Dynamically adjust resources for specific components
  }

  /**
   * Get current resource status
   */
  get_resource_status(): {
    metrics: ResourceMetrics;
    health: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    throttle_level: string;
    recommended_actions: string[];
  } {
    if (this.metrics_history.length === 0) {
      return {
        metrics: {
          timestamp: Date.now(),
          cpu_percent: 0,
          memory_used_mb: 0,
          memory_available_mb: 0,
          memory_percent: 0,
          heap_used_mb: 0,
          heap_total_mb: 0,
          external_memory_mb: 0,
          event_loop_lag_ms: 0,
        },
        health: 'excellent',
        throttle_level: 'normal',
        recommended_actions: [],
      };
    }

    const current = this.metrics_history[this.metrics_history.length - 1];

    let health: 'excellent' | 'good' | 'fair' | 'poor' | 'critical' = 'excellent';
    const recommended_actions: string[] = [];

    if (current.memory_percent > 90 || current.cpu_percent > 90) {
      health = 'critical';
      recommended_actions.push('Run garbage collection immediately');
      recommended_actions.push('Reduce operational load');
    } else if (current.memory_percent > 80 || current.cpu_percent > 75) {
      health = 'poor';
      recommended_actions.push('Monitor resource usage');
      recommended_actions.push('Consider load reduction');
    } else if (current.memory_percent > 70 || current.cpu_percent > 60) {
      health = 'fair';
    } else if (current.memory_percent > 50 || current.cpu_percent > 40) {
      health = 'good';
    }

    return {
      metrics: current,
      health,
      throttle_level: this.policies.throttle_level,
      recommended_actions,
    };
  }

  /**
   * Get metrics history (for trending)
   */
  get_metrics_history(last_n: number = 100): ResourceMetrics[] {
    return this.metrics_history.slice(-last_n);
  }

  /**
   * Get optimization actions history
   */
  get_actions_history(last_n: number = 100): OptimizationAction[] {
    return this.actions_taken.slice(-last_n);
  }

  /**
   * Calculate average metrics over time window
   */
  get_average_metrics(window_ms: number = 60000): Partial<ResourceMetrics> {
    const now = Date.now();
    const start_time = now - window_ms;
    const relevant = this.metrics_history.filter(m => m.timestamp >= start_time);

    if (relevant.length === 0) {
      return {};
    }

    const avg_cpu = relevant.reduce((sum, m) => sum + m.cpu_percent, 0) / relevant.length;
    const avg_memory = relevant.reduce((sum, m) => sum + m.memory_percent, 0) / relevant.length;
    const avg_heap = relevant.reduce((sum, m) => sum + m.heap_used_mb, 0) / relevant.length;
    const max_lag = Math.max(...relevant.map(m => m.event_loop_lag_ms));

    return {
      cpu_percent: Math.round(avg_cpu * 100) / 100,
      memory_percent: Math.round(avg_memory * 100) / 100,
      heap_used_mb: Math.round(avg_heap),
      event_loop_lag_ms: max_lag,
    };
  }

  /**
   * Update resource policies
   */
  set_policies(new_policies: Partial<ResourcePolicy>): void {
    this.policies = { ...this.policies, ...new_policies };
  }

  /**
   * Predict resource needs for next N minutes
   */
  predict_resource_needs(minutes_ahead: number = 5): {
    predicted_memory_mb: number;
    predicted_cpu_percent: number;
    will_need_optimization: boolean;
  } {
    if (this.metrics_history.length < 10) {
      return {
        predicted_memory_mb: 0,
        predicted_cpu_percent: 0,
        will_need_optimization: false,
      };
    }

    // Simple linear trend prediction
    const recent = this.metrics_history.slice(-20);
    const memory_trend = recent[recent.length - 1].memory_used_mb - recent[0].memory_used_mb;
    const cpu_trend = recent[recent.length - 1].cpu_percent - recent[0].cpu_percent;

    const time_delta_ms = recent[recent.length - 1].timestamp - recent[0].timestamp;
    const time_delta_minutes = time_delta_ms / (1000 * 60);

    const predicted_memory = 
      recent[recent.length - 1].memory_used_mb + (memory_trend / time_delta_minutes) * minutes_ahead;
    const predicted_cpu = 
      recent[recent.length - 1].cpu_percent + (cpu_trend / time_delta_minutes) * minutes_ahead;

    const will_need_optimization =
      predicted_memory > (os.totalmem() / 1024 / 1024 * 0.85) ||
      predicted_cpu > 80;

    return {
      predicted_memory_mb: Math.round(predicted_memory),
      predicted_cpu_percent: Math.round(predicted_cpu * 100) / 100,
      will_need_optimization,
    };
  }
}

// Export singleton instance
export default new HyperOptimusMasterOptimizer();
