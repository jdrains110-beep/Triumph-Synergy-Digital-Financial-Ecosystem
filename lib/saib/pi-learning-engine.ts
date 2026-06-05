/**
 * SAIB Pi Learning Engine
 * 
 * Learns patterns from Pi Network activity and converts insights into
 * Triumph Synergy infrastructure improvements and real-world actions.
 * 
 * SAIB Responsibilities:
 * - Monitor Pi Network transaction patterns (volume, velocity, distribution)
 * - Detect economic anomalies and optimization opportunities
 * - Learn user behavior across payment types (credit, judicial, real-estate, transactions)
 * - Generate recommendations for ecosystem strengthening
 * - Execute learned patterns in real-world applications
 */

import { Horizon } from "@stellar/stellar-sdk";

export interface PiNetworkMetrics {
  timestamp: Date;
  totalVolume: number;
  activeUsers: number;
  averageTransactionValue: number;
  transactionVelocity: number; // tx/sec
  networkHealthScore: number; // 0-100
  geographicDistribution: Map<string, number>;
  paymentMethodMix: {
    internal: number; // %
    external: number; // %
  };
}

export interface SAIBLearningInsight {
  id: string;
  timestamp: Date;
  type:
    | "economic_pattern"
    | "user_behavior"
    | "market_anomaly"
    | "optimization_opportunity"
    | "risk_signal";
  confidence: number; // 0-1
  description: string;
  actionRecommendation: string;
  affectedDomains: (
    | "credit"
    | "judicial"
    | "real-estate"
    | "transactions"
    | "ecosystem"
  )[];
  realWorldAction?: {
    actionType: string;
    targetSystem: string;
    parameters: Record<string, unknown>;
    priority: "low" | "medium" | "high" | "critical";
  };
}

export interface SAIBLearningState {
  epoch: number;
  learningsGenerated: number;
  successfulActions: number;
  failedActions: number;
  totalValueProcessed: number; // Total Pi processed through learning
  dominantPatterns: string[];
  riskProfile: "low" | "medium" | "high";
}

/**
 * SAIB Pi Learning Engine
 * Analyzes Pi Network metrics and generates real-world actions
 */
export class SAIBPiLearningEngine {
  private readonly horizon: Horizon.Server;
  private readonly piSettlementAccount: string;
  private learningState: SAIBLearningState = {
    epoch: 0,
    learningsGenerated: 0,
    successfulActions: 0,
    failedActions: 0,
    totalValueProcessed: 0,
    dominantPatterns: [],
    riskProfile: "low",
  };

  // Learning history
  private learningHistory: SAIBLearningInsight[] = [];

  // Pattern recognition thresholds
  private readonly VOLUME_SPIKE_THRESHOLD = 1.5; // 50% increase = anomaly
  private readonly VELOCITY_THRESHOLD = 100; // tx/sec
  private readonly DISTRIBUTION_ENTROPY_THRESHOLD = 0.6; // Geographic concentration signal

  constructor() {
    const horizonUrl =
      process.env.STELLAR_HORIZON_URL || "https://horizon.stellar.org";
    this.horizon = new Horizon.Server(horizonUrl);
    this.piSettlementAccount =
      process.env.STELLAR_PAYMENT_ACCOUNT || "GBPX...";
  }

  /**
   * Process Pi Network metrics and learn patterns
   * @param metrics Current Pi Network metrics snapshot
   * @returns Generated learning insights
   */
  async analyzeAndLearn(
    metrics: PiNetworkMetrics
  ): Promise<SAIBLearningInsight[]> {
    const insights: SAIBLearningInsight[] = [];

    // Pattern 1: Economic Volume Anomalies
    const volumeAnomaly = this.detectVolumeAnomalies(metrics);
    if (volumeAnomaly) insights.push(volumeAnomaly);

    // Pattern 2: User Distribution Shifts
    const distributionShift = this.detectDistributionShifts(metrics);
    if (distributionShift) insights.push(distributionShift);

    // Pattern 3: Transaction Velocity Patterns
    const velocityPattern = this.detectVelocityPatterns(metrics);
    if (velocityPattern) insights.push(velocityPattern);

    // Pattern 4: Payment Method Optimization Opportunities
    const methodOptimization = this.detectPaymentMethodOptimization(metrics);
    if (methodOptimization) insights.push(methodOptimization);

    // Pattern 5: Ecosystem Health Indicators
    const healthIndicator = this.evaluateEcosystemHealth(metrics);
    if (healthIndicator) insights.push(healthIndicator);

    // Store learnings
    this.learningHistory.push(...insights);
    this.learningState.learningsGenerated += insights.length;
    this.learningState.totalValueProcessed += metrics.totalVolume;
    this.learningState.epoch += 1;

    // Generate real-world actions for high-confidence insights
    for (const insight of insights) {
      if (insight.confidence > 0.8 && insight.realWorldAction) {
        await this.executeRealWorldAction(insight);
      }
    }

    return insights;
  }

  /**
   * Detect volume-based anomalies
   * @private
   */
  private detectVolumeAnomalies(metrics: PiNetworkMetrics): SAIBLearningInsight | null {
    // Calculate volume Z-score (simplified)
    const historicalAvg = this.getHistoricalAverageVolume();
    const stdDev = this.getHistoricalStdDev();
    const zScore = (metrics.totalVolume - historicalAvg) / stdDev;

    if (Math.abs(zScore) > 2) {
      const direction = zScore > 0 ? "spike" : "dip";
      const confidence = Math.min(1, Math.abs(zScore) / 4); // Normalize to 0-1

      return {
        id: `vol_anomaly_${Date.now()}`,
        timestamp: metrics.timestamp,
        type: "economic_pattern",
        confidence,
        description: `Volume ${direction} detected: ${metrics.totalVolume} Pi (${((zScore * 100).toFixed(1))}% deviation from mean)`,
        actionRecommendation:
          direction === "spike"
            ? "Increase transaction settlement frequency to handle higher throughput"
            : "Optimize gas costs and reduce settlement overhead during low-volume periods",
        affectedDomains: ["ecosystem", "transactions"],
        realWorldAction:
          direction === "spike" && confidence > 0.85
            ? {
                actionType: "increase_settlement_frequency",
                targetSystem: "stellar_settlement",
                parameters: {
                  newFrequencySeconds: 10, // More frequent settlements
                  batchSize: 100,
                },
                priority: "high",
              }
            : undefined,
      };
    }

    return null;
  }

  /**
   * Detect geographic distribution shifts
   * @private
   */
  private detectDistributionShifts(
    metrics: PiNetworkMetrics
  ): SAIBLearningInsight | null {
    // Calculate entropy of geographic distribution
    const entropy = this.calculateEntropy(metrics.geographicDistribution);

    if (entropy < this.DISTRIBUTION_ENTROPY_THRESHOLD) {
      // Concentration detected
      const topRegion = Array.from(metrics.geographicDistribution.entries())
        .sort((a, b) => b[1] - a[1])[0];

      return {
        id: `dist_shift_${Date.now()}`,
        timestamp: metrics.timestamp,
        type: "user_behavior",
        confidence: 1 - entropy / this.DISTRIBUTION_ENTROPY_THRESHOLD,
        description: `Geographic concentration detected: ${topRegion[0]} represents ${(topRegion[1] * 100).toFixed(1)}% of activity`,
        actionRecommendation: `Expand incentive programs in underrepresented regions to encourage broader adoption`,
        affectedDomains: ["ecosystem"],
        realWorldAction: {
          actionType: "geographic_incentive_adjustment",
          targetSystem: "pi_ecosystem",
          parameters: {
            concentratedRegion: topRegion[0],
            incentiveIncrease: 0.2, // 20% boost to underrep'd regions
            targetEntropy: 0.8,
          },
          priority: "medium",
        },
      };
    }

    return null;
  }

  /**
   * Detect transaction velocity patterns
   * @private
   */
  private detectVelocityPatterns(
    metrics: PiNetworkMetrics
  ): SAIBLearningInsight | null {
    if (metrics.transactionVelocity > this.VELOCITY_THRESHOLD) {
      return {
        id: `velocity_${Date.now()}`,
        timestamp: metrics.timestamp,
        type: "market_anomaly",
        confidence: Math.min(1, metrics.transactionVelocity / 200),
        description: `High transaction velocity detected: ${metrics.transactionVelocity.toFixed(2)} tx/sec (network is under load)`,
        actionRecommendation:
          "Trigger auto-scaling of settlement infrastructure and optimize smart contract batch processing",
        affectedDomains: ["transactions", "ecosystem"],
        realWorldAction: {
          actionType: "auto_scale_infrastructure",
          targetSystem: "cloudflare_workers",
          parameters: {
            scaleMultiplier: 1.5,
            priority: "high",
          },
          priority: "high",
        },
      };
    }

    return null;
  }

  /**
   * Detect payment method optimization opportunities
   * @private
   */
  private detectPaymentMethodOptimization(
    metrics: PiNetworkMetrics
  ): SAIBLearningInsight | null {
    const internalPct = metrics.paymentMethodMix.internal;

    // Target: 95% internal Pi usage (per config)
    if (internalPct < 0.9) {
      return {
        id: `method_opt_${Date.now()}`,
        timestamp: metrics.timestamp,
        type: "optimization_opportunity",
        confidence: 1 - internalPct / 0.95,
        description: `Internal Pi usage at ${(internalPct * 100).toFixed(1)}% - below 95% target`,
        actionRecommendation:
          "Increase internal Pi incentive multiplier (1.5x) and promote internal payment benefits",
        affectedDomains: ["transactions", "credit"],
        realWorldAction: {
          actionType: "adjust_payment_incentives",
          targetSystem: "pi_payment_processor",
          parameters: {
            internalMultiplier: 1.7, // Increase from 1.5 to 1.7
            promotionMessage: "Use internal Pi for exclusive ecosystem benefits",
          },
          priority: "medium",
        },
      };
    }

    return null;
  }

  /**
   * Evaluate overall ecosystem health
   * @private
   */
  private evaluateEcosystemHealth(
    metrics: PiNetworkMetrics
  ): SAIBLearningInsight | null {
    const health = metrics.networkHealthScore;

    if (health < 60) {
      // Network struggling
      return {
        id: `health_alert_${Date.now()}`,
        timestamp: metrics.timestamp,
        type: "risk_signal",
        confidence: 1 - health / 100,
        description: `Ecosystem health degraded to ${health}/100. Risk of settlement delays or payment failures.`,
        actionRecommendation:
          "Activate contingency protocols: reduce transaction limits, increase QoS monitoring, notify operators",
        affectedDomains: ["ecosystem", "transactions"],
        realWorldAction: {
          actionType: "activate_contingency",
          targetSystem: "payment_processor",
          parameters: {
            maxTransactionValue: 10000, // Reduce max from 100k
            enableStrictQoS: true,
            notifyOperators: true,
          },
          priority: "critical",
        },
      };
    }

    // Positive signal: Network healthy
    if (health > 85) {
      return {
        id: `health_good_${Date.now()}`,
        timestamp: metrics.timestamp,
        type: "optimization_opportunity",
        confidence: health / 100,
        description: `Ecosystem health strong at ${health}/100. Opportunity for feature expansion.`,
        actionRecommendation:
          "Increase transaction limits, reduce settlement fees, enable new payment corridors",
        affectedDomains: ["ecosystem"],
        realWorldAction: {
          actionType: "expand_ecosystem",
          targetSystem: "payment_processor",
          parameters: {
            maxTransactionValue: 200000, // Increase limits
            settlementFeeReduction: 0.15, // 15% fee reduction
            enableNewPaymentTypes: ["subscriptions", "recurring"],
          },
          priority: "medium",
        },
      };
    }

    return null;
  }

  /**
   * Execute a real-world action based on SAIB learning
   * @private
   */
  private async executeRealWorldAction(insight: SAIBLearningInsight): Promise<void> {
    if (!insight.realWorldAction) return;

    try {
      const action = insight.realWorldAction;

      // Route to appropriate system
      switch (action.targetSystem) {
        case "stellar_settlement":
          await this.executeStellarSettlementAction(action);
          break;
        case "pi_payment_processor":
          await this.executePiPaymentAction(action);
          break;
        case "pi_ecosystem":
          await this.executePiEcosystemAction(action);
          break;
        case "cloudflare_workers":
          await this.executeCloudflareAction(action);
          break;
        case "payment_processor":
          await this.executePaymentProcessorAction(action);
          break;
        default:
          console.warn(
            `Unknown target system: ${action.targetSystem}`
          );
      }

      this.learningState.successfulActions += 1;
    } catch (error) {
      console.error("Failed to execute real-world action:", error);
      this.learningState.failedActions += 1;
    }
  }

  /**
   * Execute Stellar settlement adjustments
   * @private
   */
  private async executeStellarSettlementAction(
    action: SAIBLearningInsight["realWorldAction"]
  ): Promise<void> {
    if (!action) return;
    // Store settlement strategy in environment/database
    // Actual execution happens in settlement service
    console.log(
      `[SAIB Learning] Updating Stellar settlement strategy:`,
      action.parameters
    );

    // In production: Store to config/database and notify settlement service
    // await updateSettlementConfig(action.parameters);
  }

  /**
   * Execute Pi payment processor adjustments
   * @private
   */
  private async executePiPaymentAction(
    action: SAIBLearningInsight["realWorldAction"]
  ): Promise<void> {
    if (!action) return;
    console.log(`[SAIB Learning] Adjusting Pi payment parameters:`, action.parameters);

    // In production: Update payment processor configuration
    // Would involve updating piNetworkConfig multipliers, limits, etc.
  }

  /**
   * Execute Pi ecosystem-wide actions
   * @private
   */
  private async executePiEcosystemAction(
    action: SAIBLearningInsight["realWorldAction"]
  ): Promise<void> {
    if (!action) return;
    console.log(`[SAIB Learning] Executing Pi ecosystem action:`, action.parameters);

    // Broadcast to ecosystem coordination system
  }

  /**
   * Execute Cloudflare Worker scaling actions
   * @private
   */
  private async executeCloudflareAction(
    action: SAIBLearningInsight["realWorldAction"]
  ): Promise<void> {
    if (!action) return;
    console.log(
      `[SAIB Learning] Triggering Cloudflare auto-scaling:`,
      action.parameters
    );

    // Signal to Cloudflare Workers autoscaling system
  }

  /**
   * Execute payment processor contingency actions
   * @private
   */
  private async executePaymentProcessorAction(
    action: SAIBLearningInsight["realWorldAction"]
  ): Promise<void> {
    if (!action) return;
    console.log(
      `[SAIB Learning] Executing payment processor action (priority: ${action.priority}):`,
      action.parameters
    );

    // Execute immediately if critical
    if (action.priority === "critical") {
      // Notify ops, activate emergency protocols
    }
  }

  /**
   * Get current learning state
   */
  getState(): SAIBLearningState {
    return { ...this.learningState };
  }

  /**
   * Get recent learnings
   */
  getRecentLearnings(count: number = 10): SAIBLearningInsight[] {
    return this.learningHistory.slice(-count);
  }

  /**
   * Helper: Calculate entropy of distribution
   * @private
   */
  private calculateEntropy(distribution: Map<string, number>): number {
    if (distribution.size === 0) return 0;

    let entropy = 0;
    for (const [, value] of distribution) {
      const prob = value;
      if (prob > 0) {
        entropy -= prob * Math.log2(prob);
      }
    }

    // Normalize by max entropy
    return entropy / Math.log2(distribution.size);
  }

  /**
   * Helper: Get historical average volume (mock)
   * @private
   */
  private getHistoricalAverageVolume(): number {
    return 50000; // Mock value
  }

  /**
   * Helper: Get historical std dev (mock)
   * @private
   */
  private getHistoricalStdDev(): number {
    return 15000; // Mock value
  }
}

export default SAIBPiLearningEngine;
