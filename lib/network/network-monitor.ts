/**
 * Network Monitor - Real-time Fraud Detection & Anomaly Detection
 *
 * Monitors entire Triumph-Synergy ecosystem for:
 * - Stolen Pi detection
 * - Account manipulation
 * - Suspicious transaction patterns
 * - Double-spending attempts
 * - Network manipulation
 * - Stolen mining rewards
 * - Exchange-bought Pi washing
 * - Mass account creation attempts
 *
 * Real-time threat assessment and mitigation
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

export type ThreatLevel = "low" | "medium" | "high" | "critical";
export type ThreatType =
  | "stolen_pi"
  | "duplicate_account"
  | "unusual_transfer"
  | "rapid_exchanges"
  | "ip_spoofing"
  | "biometric_replay"
  | "mass_account_creation"
  | "double_spend"
  | "account_takeover"
  | "value_manipulation";

export interface NetworkThreat {
  id: string;
  type: ThreatType;
  level: ThreatLevel;
  accountIds: string[];
  details: Record<string, any>;
  detectedAt: number;
  status: "detected" | "investigating" | "confirmed" | "resolved" | "false_positive";
  affectedPiAmount?: number;
}

export interface TransactionAnomalyDetection {
  fromAddress: string;
  toAddress: string;
  amount: string;
  timestamp: number;
  anomalyScore: number; // 0-100
  isAnomaly: boolean;
  reasons: string[];
}

export interface AccountAnomalyMetrics {
  accountId: string;
  loginAnomalies: number;
  transferAnomalies: number;
  deviceAnomalies: number;
  geoAnomalies: number;
  biometricFailures: number;
  overallRiskScore: number;
}

export interface NetworkSnapshot {
  timestamp: number;
  totalAccounts: number;
  suspiciousAccounts: number;
  totalThreats: number;
  criticalThreats: number;
  stolenPiDetected: string;
  networkHealth: number; // 0-100
}

// ============================================================================
// Network Monitor Implementation
// ============================================================================

export class NetworkMonitor {
  private threats: Map<string, NetworkThreat> = new Map();
  private accountMetrics: Map<string, AccountAnomalyMetrics> = new Map();
  private transactionHistory: Array<{
    from: string;
    to: string;
    amount: string;
    timestamp: number;
  }> = [];
  private networkSnapshots: NetworkSnapshot[] = [];

  private static instance: NetworkMonitor;

  private constructor() {
    // Start monitoring loop
    this.startMonitoring();
  }

  static getInstance(): NetworkMonitor {
    if (!NetworkMonitor.instance) {
      NetworkMonitor.instance = new NetworkMonitor();
    }
    return NetworkMonitor.instance;
  }

  /**
   * Start continuous network monitoring
   */
  private startMonitoring(): void {
    // Monitor every 10 seconds
    setInterval(() => {
      this.analyzeNetwork();
    }, 10000);
  }

  /**
   * Analyze entire network for threats
   */
  private analyzeNetwork(): void {
    const snapshot: NetworkSnapshot = {
      timestamp: Date.now(),
      totalAccounts: 0, // Would be populated from account system
      suspiciousAccounts: Array.from(this.accountMetrics.values()).filter(
        m => m.overallRiskScore > 50
      ).length,
      totalThreats: this.threats.size,
      criticalThreats: Array.from(this.threats.values()).filter(t => t.level === "critical")
        .length,
      stolenPiDetected: "", // Sum of stolen amounts
      networkHealth: this.calculateNetworkHealth(),
    };

    this.networkSnapshots.push(snapshot);

    // Keep only last 1000 snapshots
    if (this.networkSnapshots.length > 1000) {
      this.networkSnapshots.shift();
    }
  }

  /**
   * Detect stolen Pi
   * Looks for sudden transfers after account creation or unusual patterns
   */
  async detectStolenPi(
    accountId: string,
    piSource: "mined" | "exchanged",
    accountCreationTime: number,
    currentBalance: string
  ): Promise<NetworkThreat | null> {
    // Rule 1: Mined Pi transferred immediately after account creation = suspicious
    if (piSource === "mined") {
      const timeSinceCreation = Date.now() - accountCreationTime;
      if (timeSinceCreation < 3600000) {
        // Less than 1 hour
        const threat: NetworkThreat = {
          id: `threat_${Date.now()}`,
          type: "stolen_pi",
          level: "high",
          accountIds: [accountId],
          details: {
            reason: "Mined Pi transferred immediately after account creation",
            timeSinceCreation,
            balance: currentBalance,
          },
          detectedAt: Date.now(),
          status: "detecting",
          affectedPiAmount: parseFloat(currentBalance),
        };
        this.threats.set(threat.id, threat);
        return threat;
      }
    }

    // Rule 2: Exchanged Pi from CEX with suspicious pattern
    if (piSource === "exchanged") {
      const recentTransactions = this.transactionHistory.filter(
        t => t.from === accountId && Date.now() - t.timestamp < 86400000 // Last 24 hours
      );

      if (recentTransactions.length > 10) {
        // More than 10 transfers in 24 hours = suspicious
        const threat: NetworkThreat = {
          id: `threat_${Date.now()}`,
          type: "rapid_exchanges",
          level: "medium",
          accountIds: [accountId],
          details: {
            reason: "Rapid exchange patterns detected",
            transactionCount: recentTransactions.length,
            timeWindow: "24 hours",
          },
          detectedAt: Date.now(),
          status: "detecting",
        };
        this.threats.set(threat.id, threat);
        return threat;
      }
    }

    return null;
  }

  /**
   * Detect account takeover attempts
   */
  async detectAccountTakeover(
    accountId: string,
    newDevice: {
      ipAddress: string;
      deviceFingerprint: string;
      geolocation?: { latitude: number; longitude: number };
    },
    previousDevices: Array<{ ipAddress: string; geolocation?: { latitude: number; longitude: number } }>
  ): Promise<NetworkThreat | null> {
    let threatLevel: ThreatLevel = "low";
    const reasons: string[] = [];

    // Check IP change
    const previousIPs = previousDevices.map(d => d.ipAddress);
    if (!previousIPs.includes(newDevice.ipAddress)) {
      reasons.push("New IP address detected");
      threatLevel = "medium";
    }

    // Check geolocation anomaly (impossible travel)
    if (
      previousDevices.length > 0 &&
      newDevice.geolocation &&
      previousDevices[previousDevices.length - 1].geolocation
    ) {
      const distance = this.calculateDistance(
        previousDevices[previousDevices.length - 1].geolocation,
        newDevice.geolocation
      );
      const timeDiff = 1; // Assuming 1 hour has passed
      const requiredSpeed = distance / timeDiff;

      if (requiredSpeed > 900) {
        // Faster than commercial airplane
        reasons.push(`Impossible travel detected: ${requiredSpeed} km/h`);
        threatLevel = "high";
      }
    }

    // Check rapid device additions
    const metrics = this.accountMetrics.get(accountId);
    if (metrics && metrics.deviceAnomalies > 3) {
      reasons.push("Multiple device additions in short time");
      threatLevel = "high";
    }

    if (threatLevel !== "low") {
      const threat: NetworkThreat = {
        id: `threat_${Date.now()}`,
        type: "account_takeover",
        level: threatLevel,
        accountIds: [accountId],
        details: {
          reasons,
          newDevice,
          previousDeviceCount: previousDevices.length,
        },
        detectedAt: Date.now(),
        status: "detecting",
      };
      this.threats.set(threat.id, threat);
      return threat;
    }

    return null;
  }

  /**
   * Detect unusual transfer patterns
   */
  async detectUnusualTransfer(
    accountId: string,
    amount: string,
    recipient: string,
    piSource: "mined" | "exchanged"
  ): Promise<TransactionAnomalyDetection> {
    const accountMetrics = this.accountMetrics.get(accountId) || this.initializeMetrics(accountId);
    const numericAmount = parseFloat(amount);

    let anomalyScore = 0;
    const reasons: string[] = [];

    // Mined Pi should move slowly and deliberately
    if (piSource === "mined") {
      // Rule: Mined Pi transferred immediately = high anomaly
      const accountAge = Date.now() - (accountMetrics as any).createdAt || 0;
      if (accountAge < 86400000 && numericAmount > 100) {
        // New account transferring large mined amount
        anomalyScore += 40;
        reasons.push("New account transferring large mined Pi immediately");
      }

      // Rule: Mined Pi to exchange address
      if (this.isExchangeAddress(recipient)) {
        anomalyScore += 30;
        reasons.push("Mined Pi being transferred to exchange");
      }
    }

    // Exchanged Pi patterns
    if (piSource === "exchanged") {
      // Rule: Multiple rapid exchanges
      const recentTransfers = this.transactionHistory.filter(
        t => t.from === accountId && Date.now() - t.timestamp < 3600000 // Last hour
      );

      if (recentTransfers.length > 5) {
        anomalyScore += 50;
        reasons.push("Rapid exchange pattern detected");
      }

      // Rule: Large amount transfer
      if (numericAmount > 10000) {
        anomalyScore += 20;
        reasons.push("Large exchange Pi transfer");
      }
    }

    // Record transaction
    this.transactionHistory.push({
      from: accountId,
      to: recipient,
      amount,
      timestamp: Date.now(),
    });

    return {
      fromAddress: accountId,
      toAddress: recipient,
      amount,
      timestamp: Date.now(),
      anomalyScore: Math.min(100, anomalyScore),
      isAnomaly: anomalyScore > 30,
      reasons,
    };
  }

  /**
   * Detect biometric replay attacks
   */
  async detectBiometricReplay(
    accountId: string,
    biometricQuality: number,
    previousBiometrics: Array<{ quality: number; timestamp: number }>
  ): Promise<NetworkThreat | null> {
    const reasons: string[] = [];
    let threatLevel: ThreatLevel = "low";

    // Too-perfect quality might indicate replay
    if (biometricQuality > 99) {
      reasons.push("Biometric quality suspiciously perfect");
      threatLevel = "medium";
    }

    // Rapid biometric attempts with same quality
    const recentAttempts = previousBiometrics.filter(
      b => Date.now() - b.timestamp < 600000 // Last 10 minutes
    );

    if (recentAttempts.length > 5) {
      reasons.push("Rapid biometric submission attempts");
      threatLevel = "high";
    }

    if (threatLevel !== "low") {
      const threat: NetworkThreat = {
        id: `threat_${Date.now()}`,
        type: "biometric_replay",
        level: threatLevel,
        accountIds: [accountId],
        details: {
          reasons,
          quality: biometricQuality,
          recentAttempts: recentAttempts.length,
        },
        detectedAt: Date.now(),
        status: "detecting",
      };
      this.threats.set(threat.id, threat);
      return threat;
    }

    return null;
  }

  /**
   * Report threat status
   */
  async reportThreat(threatId: string, status: "confirmed" | "resolved" | "false_positive"): Promise<void> {
    const threat = this.threats.get(threatId);
    if (threat) {
      threat.status = status;
      console.log(`[NETWORK MONITOR] Threat ${threatId} reported as ${status}`);
    }
  }

  /**
   * Get network health score
   */
  calculateNetworkHealth(): number {
    const totalThreats = this.threats.size;
    const criticalThreats = Array.from(this.threats.values()).filter(t => t.level === "critical")
      .length;

    // Health = 100 - (threats * 2) - (critical * 10)
    let health = 100 - totalThreats * 2 - criticalThreats * 10;
    return Math.max(0, Math.min(100, health));
  }

  /**
   * Get threats by level
   */
  getThreatsByLevel(level: ThreatLevel): NetworkThreat[] {
    return Array.from(this.threats.values()).filter(t => t.level === level);
  }

  /**
   * Get all active threats
   */
  getActiveThreats(): NetworkThreat[] {
    return Array.from(this.threats.values()).filter(
      t => t.status === "detected" || t.status === "investigating"
    );
  }

  /**
   * Helper: Initialize metrics for new account
   */
  private initializeMetrics(accountId: string): AccountAnomalyMetrics {
    const metrics: AccountAnomalyMetrics = {
      accountId,
      loginAnomalies: 0,
      transferAnomalies: 0,
      deviceAnomalies: 0,
      geoAnomalies: 0,
      biometricFailures: 0,
      overallRiskScore: 0,
    };
    this.accountMetrics.set(accountId, metrics);
    return metrics;
  }

  /**
   * Helper: Calculate distance between two geolocation points
   */
  private calculateDistance(
    point1: { latitude: number; longitude: number },
    point2: { latitude: number; longitude: number }
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((point2.latitude - point1.latitude) * Math.PI) / 180;
    const dLon = ((point2.longitude - point1.longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((point1.latitude * Math.PI) / 180) *
        Math.cos((point2.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Helper: Check if address is known exchange
   */
  private isExchangeAddress(address: string): boolean {
    const knownExchanges = [
      "0xexchange", // Placeholder
      // Add known exchange addresses
    ];
    return knownExchanges.includes(address.toLowerCase());
  }

  /**
   * Get latest network snapshot
   */
  getLatestSnapshot(): NetworkSnapshot | null {
    return this.networkSnapshots[this.networkSnapshots.length - 1] || null;
  }
}

// ============================================================================
// Singleton & Exports
// ============================================================================

export const networkMonitor = NetworkMonitor.getInstance();
