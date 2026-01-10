/**
 * DYNAMIC PRICE ADJUSTMENT ENGINE
 * 
 * Automatically adjusts prices across entire ecosystem based on:
 * - Pi Network price announcements
 * - Market conditions
 * - Banking partner capacity
 * - Transaction volume patterns
 * - Ecosystem stability requirements
 */

export interface PriceAdjustmentRule {
  ruleId: string;
  ruleName: string;
  triggerMetric: 'pi_price' | 'volume' | 'capacity' | 'volatility' | 'demand';
  triggerThreshold: number;
  triggerDirection: 'above' | 'below' | 'both';
  adjustmentType: 'percentage' | 'fixed' | 'dynamic';
  adjustmentValue: number;
  maxAdjustmentPerDay: number;
  affectedEntities: ('all' | string)[];
  priority: number;
  enabled: boolean;
  createdDate: Date;
  lastModified: Date;
}

export interface PriceSnapshot {
  snapshotId: string;
  timestamp: Date;
  piPrice: number;
  piPriceUSD: number;
  piDEXPrice: number;
  marketCondition: 'bullish' | 'neutral' | 'bearish' | 'volatile';
  adjustmentsMade: Array<{
    entityId: string;
    oldPrice: number;
    newPrice: number;
    reason: string;
  }>;
  systemStability: number;
  bankingUtilization: number;
}

export interface EcosystemPricing {
  entityId: string;
  entityName: string;
  basePriceUSD: number;
  piPrice: number;
  piDEXPrice: number;
  priceHistory: Array<{
    date: Date;
    price: number;
    adjustment: number;
  }>;
  lastAdjustment: Date;
  adjustmentReason?: string;
  priceChange24h: number;
  priceChange7d: number;
}

/**
 * DYNAMIC PRICE ADJUSTMENT ENGINE
 */
export class DynamicPriceAdjustmentEngine {
  private static instance: DynamicPriceAdjustmentEngine;
  private priceRules: Map<string, PriceAdjustmentRule> = new Map();
  private priceSnapshots: Map<string, PriceSnapshot> = new Map();
  private ecosystemPricing: Map<string, EcosystemPricing> = new Map();
  private currentPiPrice: number = 314.0; // Starting price
  private priceAdjustmentLog: Array<{
    timestamp: Date;
    action: string;
    details: string;
    impact: number;
  }> = [];
  private stabilityMonitor: {
    currentStability: number;
    targetStability: number;
    volatilityIndex: number;
    riskLevel: string;
  } = {
    currentStability: 97,
    targetStability: 95,
    volatilityIndex: 2.5,
    riskLevel: 'LOW'
  };

  private constructor() {
    this.initializePricingRules();
    this.startPriceMonitoring();
  }

  static getInstance(): DynamicPriceAdjustmentEngine {
    if (!DynamicPriceAdjustmentEngine.instance) {
      DynamicPriceAdjustmentEngine.instance = new DynamicPriceAdjustmentEngine();
    }
    return DynamicPriceAdjustmentEngine.instance;
  }

  /**
   * Initialize pricing adjustment rules
   */
  private initializePricingRules(): void {
    const rulesConfig = [
      {
        name: 'Pi Price Up 5%+',
        metric: 'pi_price',
        threshold: 5,
        direction: 'above',
        adjustment: 2.5,
        maxDaily: 50000
      },
      {
        name: 'Pi Price Down 5%+',
        metric: 'pi_price',
        threshold: 5,
        direction: 'below',
        adjustment: -2.5,
        maxDaily: 50000
      },
      {
        name: 'High Banking Utilization',
        metric: 'capacity',
        threshold: 85,
        direction: 'above',
        adjustment: 1.5,
        maxDaily: 30000
      },
      {
        name: 'High Volume Detection',
        metric: 'volume',
        threshold: 120,
        direction: 'above',
        adjustment: 1.0,
        maxDaily: 25000
      },
      {
        name: 'Volatility High',
        metric: 'volatility',
        threshold: 10,
        direction: 'above',
        adjustment: 2.0,
        maxDaily: 40000
      },
      {
        name: 'Demand Surge',
        metric: 'demand',
        threshold: 150,
        direction: 'above',
        adjustment: 1.0,
        maxDaily: 20000
      },
      {
        name: 'Ecosystem Stabilization',
        metric: 'volatility',
        threshold: 5,
        direction: 'below',
        adjustment: -0.5,
        maxDaily: 15000
      }
    ];

    rulesConfig.forEach((config, index) => {
      const ruleId = `rule_${index + 1}`;

      const rule: PriceAdjustmentRule = {
        ruleId,
        ruleName: config.name,
        triggerMetric: config.metric as any,
        triggerThreshold: config.threshold,
        triggerDirection: config.direction as any,
        adjustmentType: 'percentage',
        adjustmentValue: config.adjustment,
        maxAdjustmentPerDay: config.maxDaily,
        affectedEntities: ['all'],
        priority: 10 - index,
        enabled: true,
        createdDate: new Date(),
        lastModified: new Date()
      };

      this.priceRules.set(ruleId, rule);
    });

    console.log(`[PRICING] Initialized ${this.priceRules.size} price adjustment rules`);
  }

  /**
   * Start price monitoring
   */
  private startPriceMonitoring(): void {
    // Simulate real-time price monitoring
    setInterval(() => {
      this.updatePiPrice();
      this.checkPricingRules();
      this.createPriceSnapshot();
    }, 60000); // Check every minute

    console.log(`[PRICING] Price monitoring started`);
  }

  /**
   * Update Pi price based on market conditions
   */
  private updatePiPrice(): void {
    const volatility = (Math.random() - 0.5) * 2; // -1% to +1% random change
    const trendFactor = Math.random() > 0.5 ? 0.1 : -0.1; // Slight trend
    const priceChange = volatility + trendFactor;

    this.currentPiPrice = this.currentPiPrice * (1 + priceChange / 100);

    // Keep price realistic
    if (this.currentPiPrice < 100) this.currentPiPrice = 100;
    if (this.currentPiPrice > 1000) this.currentPiPrice = 1000;

    this.priceAdjustmentLog.push({
      timestamp: new Date(),
      action: 'Pi price updated',
      details: `New price: $${this.currentPiPrice.toFixed(2)}`,
      impact: priceChange
    });
  }

  /**
   * Check pricing rules and apply adjustments
   */
  private checkPricingRules(): void {
    for (const rule of this.priceRules.values()) {
      if (!rule.enabled) continue;

      let shouldApply = false;

      // Simulate metric checks
      const randomMetric = Math.random() * 100;

      if (rule.triggerMetric === 'pi_price') {
        const priceChange = Math.random() * 10; // 0-10% change
        if (rule.triggerDirection === 'above' && priceChange > rule.triggerThreshold) {
          shouldApply = true;
        }
        if (rule.triggerDirection === 'below' && priceChange < -rule.triggerThreshold) {
          shouldApply = true;
        }
      } else if (randomMetric > 70 && rule.triggerThreshold < 80) {
        shouldApply = true;
      }

      if (shouldApply) {
        this.applyPricingAdjustment(rule);
      }
    }
  }

  /**
   * Apply pricing adjustment
   */
  private applyPricingAdjustment(rule: PriceAdjustmentRule): void {
    let adjustmentCount = 0;

    for (const pricing of this.ecosystemPricing.values()) {
      if (rule.affectedEntities.includes('all') || rule.affectedEntities.includes(pricing.entityId)) {
        const oldPrice = pricing.piPrice;

        if (rule.adjustmentType === 'percentage') {
          const adjustment = (oldPrice * rule.adjustmentValue) / 100;
          pricing.piPrice = oldPrice + adjustment;
          pricing.piDEXPrice = pricing.piPrice * 0.98; // Slight discount for DEX
        } else if (rule.adjustmentType === 'fixed') {
          pricing.piPrice = oldPrice + rule.adjustmentValue;
        }

        pricing.lastAdjustment = new Date();
        pricing.adjustmentReason = rule.ruleName;

        // Track price change
        pricing.priceHistory.push({
          date: new Date(),
          price: pricing.piPrice,
          adjustment: rule.adjustmentValue
        });

        adjustmentCount++;
      }
    }

    // Update stability based on adjustments
    if (Math.abs(rule.adjustmentValue) > 2) {
      this.stabilityMonitor.volatilityIndex += 0.5;
    } else {
      this.stabilityMonitor.volatilityIndex = Math.max(0, this.stabilityMonitor.volatilityIndex - 0.1);
    }

    this.priceAdjustmentLog.push({
      timestamp: new Date(),
      action: `Applied rule: ${rule.ruleName}`,
      details: `Adjusted ${adjustmentCount} entities`,
      impact: rule.adjustmentValue
    });

    console.log(`[PRICING ADJUSTMENT] ${rule.ruleName}: ${adjustmentCount} entities updated`);
  }

  /**
   * Create price snapshot for historical tracking
   */
  private createPriceSnapshot(): void {
    const snapshotId = `snapshot_${Date.now()}`;

    const snapshot: PriceSnapshot = {
      snapshotId,
      timestamp: new Date(),
      piPrice: this.currentPiPrice,
      piPriceUSD: this.currentPiPrice,
      piDEXPrice: this.currentPiPrice * 0.98,
      marketCondition: this.getMarketCondition(),
      adjustmentsMade: [],
      systemStability: this.stabilityMonitor.currentStability,
      bankingUtilization: Math.random() * 100
    };

    this.priceSnapshots.set(snapshotId, snapshot);

    // Keep only last 1440 snapshots (daily data)
    if (this.priceSnapshots.size > 1440) {
      const firstKey = this.priceSnapshots.keys().next().value as string;
      this.priceSnapshots.delete(firstKey);
    }
  }

  /**
   * Determine market condition
   */
  private getMarketCondition(): 'bullish' | 'neutral' | 'bearish' | 'volatile' {
    if (this.stabilityMonitor.volatilityIndex > 8) return 'volatile';
    if (this.currentPiPrice > 350) return 'bullish';
    if (this.currentPiPrice < 280) return 'bearish';
    return 'neutral';
  }

  /**
   * Register ecosystem pricing
   */
  registerEcosystemPricing(entityId: string, entityName: string, basePrice: number): void {
    if (!this.ecosystemPricing.has(entityId)) {
      this.ecosystemPricing.set(entityId, {
        entityId,
        entityName,
        basePriceUSD: basePrice,
        piPrice: basePrice / this.currentPiPrice,
        piDEXPrice: (basePrice / this.currentPiPrice) * 0.98,
        priceHistory: [],
        lastAdjustment: new Date(),
        priceChange24h: 0,
        priceChange7d: 0
      });
    }
  }

  /**
   * Get current ecosystem pricing
   */
  getEcosystemPricing(entityId?: string): EcosystemPricing[] {
    if (entityId) {
      const pricing = this.ecosystemPricing.get(entityId);
      return pricing ? [pricing] : [];
    }
    return Array.from(this.ecosystemPricing.values());
  }

  /**
   * Get current Pi price
   */
  getCurrentPiPrice(): number {
    return this.currentPiPrice;
  }

  /**
   * Get stability monitor status
   */
  getStabilityMonitor(): {
    currentStability: number;
    targetStability: number;
    volatilityIndex: number;
    riskLevel: string;
  } {
    // Update risk level
    if (this.stabilityMonitor.volatilityIndex > 10) {
      this.stabilityMonitor.riskLevel = 'CRITICAL';
    } else if (this.stabilityMonitor.volatilityIndex > 7) {
      this.stabilityMonitor.riskLevel = 'HIGH';
    } else if (this.stabilityMonitor.volatilityIndex > 4) {
      this.stabilityMonitor.riskLevel = 'MEDIUM';
    } else {
      this.stabilityMonitor.riskLevel = 'LOW';
    }

    return this.stabilityMonitor;
  }

  /**
   * Get pricing rules
   */
  getPricingRules(): PriceAdjustmentRule[] {
    return Array.from(this.priceRules.values());
  }

  /**
   * Get price adjustment log
   */
  getPriceAdjustmentLog(limit: number = 100): Array<{
    timestamp: Date;
    action: string;
    details: string;
    impact: number;
  }> {
    return this.priceAdjustmentLog.slice(-limit);
  }

  /**
   * Get price history
   */
  getPriceHistory(hours: number = 24): Array<{
    timestamp: Date;
    price: number;
    condition: string;
  }> {
    const now = Date.now();
    const cutoff = now - hours * 60 * 60 * 1000;

    return Array.from(this.priceSnapshots.values())
      .filter(s => s.timestamp.getTime() > cutoff)
      .map(s => ({
        timestamp: s.timestamp,
        price: s.piPrice,
        condition: s.marketCondition
      }));
  }
}

export default DynamicPriceAdjustmentEngine.getInstance();
