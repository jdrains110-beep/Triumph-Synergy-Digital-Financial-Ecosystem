/**
 * HEALTH PRIORITY OPERATIONAL DASHBOARD
 *
 * Enterprise-grade real-time monitoring system for health, safety, and product integrity.
 * NO EXCEPTIONS: All products tracked from origin through delivery
 *
 * Core Principles:
 * ✓ Health is the absolute first priority - non-negotiable
 * ✓ Complete transparency: farm/garden to customer
 * ✓ Real-time monitoring and alerting
 * ✓ Licensed security 24/7/365
 * ✓ No harmful substances ever
 * ✓ No drone tampering or overhead contamination
 * ✓ Complete audit trail for every product
 */

export type HealthMetric = {
  metricId: string;
  category:
    | "food_safety"
    | "ingredient_quality"
    | "storage_conditions"
    | "transport_integrity"
    | "worker_health";
  status: "compliant" | "warning" | "critical";
  value: number;
  threshold: number;
  timestamp: Date;
  location: string;
  description: string;
};

export type ProductOriginRecord = {
  productId: string;
  productName: string;
  originType: "farm" | "garden" | "greenhouse" | "certified_organic_facility";
  originLocation: {
    facility: string;
    address: string;
    coordinates: { latitude: number; longitude: number };
    certifications: string[];
  };
  plantingDate: Date;
  harvestDate: Date;
  harvestedBy: {
    workerId: string;
    name: string;
    healthStatus: "cleared" | "restricted";
    lastHealthCheckDate: Date;
  };
  soilTesting: {
    testedDate: Date;
    laboratory: string;
    results: {
      pesticides: "none_detected" | "trace" | "unsafe";
      heavyMetals: "compliant" | "warning" | "unsafe";
      microbialContent: "safe" | "warning" | "unsafe";
    };
  };
  securityChain: {
    harvestSecurityClearance: string;
    securityOfficer: string;
    photosWithTimestamp: Array<{ url: string; timestamp: Date }>;
  };
};

export type TransportIntegrityLog = {
  logId: string;
  productBatchId: string;
  vehicleId: string;
  driverId: string;
  route: string;
  departureLocation: string;
  destinationHub: string;
  departureTime: Date;
  estimatedArrival: Date;
  actualArrival?: Date;
  temperatureReadings: Array<{
    timestamp: Date;
    temperature: number;
    humidity: number;
    status: "optimal" | "warning" | "critical";
  }>;
  sealIntegrity: {
    sealCode: string;
    initialPhoto: { url: string; timestamp: Date };
    arrivalPhoto: { url: string; timestamp: Date };
    sealBroken: boolean;
    tampering: boolean;
  };
  gpsTracking: Array<{
    timestamp: Date;
    latitude: number;
    longitude: number;
    altitude: number;
    speed: number;
  }>;
  securityEscort?: {
    escortOfficerId: string;
    escortOfficerName: string;
    license: string;
    startTime: Date;
    endTime: Date;
    incidentsReported: number;
  };
};

export type SecurityMonitoringRecord = {
  guardId: string;
  guardName: string;
  licenseNumber: string;
  certifications: string[];
  location: string;
  shiftStartTime: Date;
  shiftEndTime: Date;
  status: "on_duty" | "break" | "incident_response" | "off_duty";
  activities: Array<{
    timestamp: Date;
    activityType:
      | "perimeter_check"
      | "facility_inspection"
      | "incident_report"
      | "visitor_screening"
      | "airspace_monitoring";
    description: string;
    severity?: "info" | "warning" | "critical";
    photosWithTimestamp?: Array<{ url: string; timestamp: Date }>;
  }>;
  incidentsDetected: Array<{
    incidentId: string;
    type:
      | "tampering_attempt"
      | "unauthorized_access"
      | "environmental_issue"
      | "drone_detected"
      | "suspicious_activity";
    timestamp: Date;
    description: string;
    actionTaken: string;
    resolved: boolean;
  }>;
};

export type HealthAlertThreshold = {
  thresholdId: string;
  category: string;
  parameter: string;
  minSafeValue: number;
  maxSafeValue: number;
  warningValue: number;
  criticalValue: number;
  alertActions: Array<{
    triggerLevel: "warning" | "critical";
    autoActions: string[];
    notificationRecipients: string[];
  }>;
};

export type ComplianceReport = {
  reportId: string;
  reportDate: Date;
  periodCovered: { startDate: Date; endDate: Date };
  hubId: string;
  productCategories: string[];
  metrics: {
    totalProductsTracked: number;
    compliantProducts: number;
    warningProducts: number;
    criticalProducts: number;
    compliancePercentage: number;
  };
  incidentsReported: number;
  securityIncidents: number;
  remedialActions: Array<{
    actionId: string;
    issue: string;
    actionTaken: string;
    resolutionDate: Date;
    verifiedCompliant: boolean;
  }>;
  certifications: {
    organic: boolean;
    foodSafety: boolean;
    healthCompliance: boolean;
    securityAudit: boolean;
  };
};

export type RealTimeAlertEvent = {
  alertId: string;
  timestamp: Date;
  severity: "info" | "warning" | "critical" | "emergency";
  category: string;
  title: string;
  description: string;
  affectedProducts: string[];
  affectedHubs: string[];
  recommendedAction: string;
  statusUpdates: Array<{
    timestamp: Date;
    status: string;
    officer: string;
  }>;
  resolved: boolean;
  resolutionTime?: Date;
};

/**
 * HEALTH PRIORITY DASHBOARD ENGINE
 *
 * No exceptions. Every product monitored from farm/garden to customer.
 * Real-time alerts for any deviation from perfect health standards.
 */
export class HealthPriorityDashboardEngine {
  private static instance: HealthPriorityDashboardEngine;
  private readonly healthMetrics: Map<string, HealthMetric[]> = new Map();
  private readonly productOriginRecords: Map<string, ProductOriginRecord> =
    new Map();
  private readonly transportLogs: Map<string, TransportIntegrityLog> =
    new Map();
  private readonly securityMonitoring: Map<string, SecurityMonitoringRecord> =
    new Map();
  private readonly alertThresholds: Map<string, HealthAlertThreshold> =
    new Map();
  private readonly complianceReports: Map<string, ComplianceReport> = new Map();
  private readonly realTimeAlerts: RealTimeAlertEvent[] = [];
  private readonly alertHistory: RealTimeAlertEvent[] = [];

  private constructor() {
    this.initializeDefaultThresholds();
  }

  static getInstance(): HealthPriorityDashboardEngine {
    if (!HealthPriorityDashboardEngine.instance) {
      HealthPriorityDashboardEngine.instance =
        new HealthPriorityDashboardEngine();
    }
    return HealthPriorityDashboardEngine.instance;
  }

  /**
   * Initialize default health thresholds - NO EXCEPTIONS
   */
  private initializeDefaultThresholds(): void {
    // Food Safety Temperature Thresholds
    this.alertThresholds.set("food_storage_temperature", {
      thresholdId: "fst_001",
      category: "food_safety",
      parameter: "storage_temperature_celsius",
      minSafeValue: 0,
      maxSafeValue: 4,
      warningValue: 5,
      criticalValue: 8,
      alertActions: [
        {
          triggerLevel: "warning",
          autoActions: ["notify_hub_manager", "increase_monitoring_frequency"],
          notificationRecipients: ["hub_manager", "health_officer"],
        },
        {
          triggerLevel: "critical",
          autoActions: [
            "quarantine_product",
            "notify_authorities",
            "initiate_recall",
          ],
          notificationRecipients: [
            "emergency_response",
            "health_authorities",
            "CEO",
          ],
        },
      ],
    });

    // Ingredient Contamination Thresholds
    this.alertThresholds.set("ingredient_contamination", {
      thresholdId: "ic_001",
      category: "ingredient_quality",
      parameter: "contamination_detection_ppm",
      minSafeValue: 0,
      maxSafeValue: 0,
      warningValue: 0,
      criticalValue: 0,
      alertActions: [
        {
          triggerLevel: "critical",
          autoActions: [
            "immediate_product_recall",
            "facility_inspection",
            "alert_customers",
          ],
          notificationRecipients: [
            "emergency_response",
            "health_authorities",
            "legal_team",
          ],
        },
      ],
    });

    // Perimeter Security Breach
    this.alertThresholds.set("perimeter_breach", {
      thresholdId: "pb_001",
      category: "security",
      parameter: "unauthorized_access_detected",
      minSafeValue: 0,
      maxSafeValue: 0,
      warningValue: 0,
      criticalValue: 0,
      alertActions: [
        {
          triggerLevel: "critical",
          autoActions: [
            "lockdown_facility",
            "police_notification",
            "product_quarantine",
          ],
          notificationRecipients: [
            "security_chief",
            "police",
            "facility_manager",
          ],
        },
      ],
    });

    // Drone Detection
    this.alertThresholds.set("drone_detection", {
      thresholdId: "dd_001",
      category: "security",
      parameter: "unauthorized_aerial_device",
      minSafeValue: 0,
      maxSafeValue: 0,
      warningValue: 0,
      criticalValue: 0,
      alertActions: [
        {
          triggerLevel: "critical",
          autoActions: [
            "activate_airspace_defense",
            "document_incident",
            "retrieve_evidence",
          ],
          notificationRecipients: [
            "security_chief",
            "airspace_authority",
            "law_enforcement",
          ],
        },
      ],
    });
  }

  /**
   * Register product origin - complete traceability from farm/garden
   */
  async registerProductOrigin(record: ProductOriginRecord): Promise<string> {
    // Validate origin certifications
    if (
      !this.validateOrganicCertifications(record.originLocation.certifications)
    ) {
      throw new Error(
        `HEALTH PRIORITY VIOLATION: Product ${record.productName} does not have valid organic certifications`
      );
    }

    // Verify soil testing - no pesticides allowed
    if (record.soilTesting.results.pesticides !== "none_detected") {
      throw new Error(
        `HEALTH PRIORITY VIOLATION: Pesticide detected in soil for ${record.productName}`
      );
    }

    // Verify worker health status
    if (record.harvestedBy.healthStatus !== "cleared") {
      throw new Error(
        `HEALTH PRIORITY VIOLATION: Worker harvesting ${record.productName} is not health cleared`
      );
    }

    this.productOriginRecords.set(record.productId, record);

    // Create health metric for origin registration
    this.recordHealthMetric({
      metricId: `origin_${record.productId}`,
      category: "food_safety",
      status: "compliant",
      value: 100,
      threshold: 100,
      timestamp: new Date(),
      location: record.originLocation.facility,
      description: `Product registered at origin: ${record.productName} from ${record.originLocation.facility}`,
    });

    return record.productId;
  }

  /**
   * Log transport with complete integrity verification
   */
  async logTransportIntegrity(log: TransportIntegrityLog): Promise<string> {
    // Verify seal integrity - tampering is unacceptable
    if (log.sealIntegrity.tampering) {
      const alert = await this.createAlert({
        alertId: `tampering_${log.logId}`,
        timestamp: new Date(),
        severity: "emergency",
        category: "security",
        title: "PRODUCT TAMPERING DETECTED",
        description: `CRITICAL: Seal integrity compromised for batch ${log.productBatchId}. Entire shipment must be quarantined.`,
        affectedProducts: [log.productBatchId],
        affectedHubs: [log.destinationHub],
        recommendedAction:
          "IMMEDIATE: Quarantine all products. Do not release. Investigate tampering. Notify authorities.",
        statusUpdates: [],
        resolved: false,
      });
      throw new Error("PRODUCT TAMPERING DETECTED - SHIPMENT REJECTED");
    }

    // Verify temperature integrity
    const tempViolations = log.temperatureReadings.filter(
      (r) => r.status !== "optimal"
    );
    if (tempViolations.length > 0) {
      await this.createAlert({
        alertId: `temp_${log.logId}`,
        timestamp: new Date(),
        severity: "warning",
        category: "food_safety",
        title: "Temperature Deviation During Transport",
        description: `${tempViolations.length} temperature readings outside optimal range during transport of batch ${log.productBatchId}`,
        affectedProducts: [log.productBatchId],
        affectedHubs: [log.destinationHub],
        recommendedAction: "Enhanced quality testing required upon arrival",
        statusUpdates: [],
        resolved: false,
      });
    }

    // Verify security escort was present for entire journey
    if (!log.securityEscort) {
      throw new Error(
        `HEALTH PRIORITY VIOLATION: No security escort recorded for batch ${log.productBatchId}`
      );
    }

    // Verify escort license and certifications
    if (!this.validateSecurityLicense(log.securityEscort.license)) {
      throw new Error(
        `HEALTH PRIORITY VIOLATION: Security escort license invalid for batch ${log.productBatchId}`
      );
    }

    this.transportLogs.set(log.logId, log);

    this.recordHealthMetric({
      metricId: `transport_${log.logId}`,
      category: "transport_integrity",
      status: tempViolations.length === 0 ? "compliant" : "warning",
      value: 95 - tempViolations.length * 5,
      threshold: 90,
      timestamp: new Date(),
      location: log.route,
      description: `Transport integrity verified for batch ${log.productBatchId}`,
    });

    return log.logId;
  }

  /**
   * Register security guard for 24/7 monitoring
   */
  async registerSecurityGuard(
    record: SecurityMonitoringRecord
  ): Promise<string> {
    // Validate guard license
    if (!this.validateSecurityLicense(record.licenseNumber)) {
      throw new Error(
        `SECURITY VIOLATION: Invalid license for guard ${record.guardName}`
      );
    }

    // Validate required certifications
    const requiredCerts = [
      "health_safety",
      "facility_security",
      "tamper_detection",
      "incident_response",
    ];
    const hasCerts = requiredCerts.every((cert) =>
      record.certifications.includes(cert)
    );
    if (!hasCerts) {
      throw new Error(
        `SECURITY VIOLATION: Guard ${record.guardName} missing required certifications`
      );
    }

    this.securityMonitoring.set(record.guardId, record);

    return record.guardId;
  }

  /**
   * Record security activity - every check logged with timestamp and evidence
   */
  async recordSecurityActivity(
    guardId: string,
    activityType: string,
    description: string,
    severity?: string,
    photosWithTimestamp?: Array<{ url: string; timestamp: Date }>
  ): Promise<void> {
    const guard = this.securityMonitoring.get(guardId);
    if (!guard) {
      throw new Error(`SECURITY ERROR: Guard ${guardId} not found`);
    }

    const activity = {
      timestamp: new Date(),
      activityType: activityType as any,
      description,
      severity: (severity as any) || "info",
      photosWithTimestamp,
    };

    guard.activities.push(activity);

    // If incident detected, escalate immediately
    if (severity === "critical") {
      await this.handleSecurityIncident(guardId, description);
    }
  }

  /**
   * Handle security incidents - immediate response protocol
   */
  private async handleSecurityIncident(
    guardId: string,
    description: string
  ): Promise<void> {
    const guard = this.securityMonitoring.get(guardId);
    if (!guard) {
      return;
    }

    let incidentType = "suspicious_activity";
    if (description.toLowerCase().includes("drone")) {
      incidentType = "drone_detected";
    } else if (description.toLowerCase().includes("tampering")) {
      incidentType = "tampering_attempt";
    } else if (description.toLowerCase().includes("unauthorized")) {
      incidentType = "unauthorized_access";
    }

    const incident = {
      incidentId: `incident_${Date.now()}`,
      type: incidentType as any,
      timestamp: new Date(),
      description,
      actionTaken: "IMMEDIATE RESPONSE ACTIVATED",
      resolved: false,
    };

    guard.incidentsDetected.push(incident);

    // Create critical alert
    await this.createAlert({
      alertId: `security_${incident.incidentId}`,
      timestamp: new Date(),
      severity: "emergency",
      category: "security",
      title: `SECURITY INCIDENT: ${incidentType.toUpperCase()}`,
      description: `Guard ${guard.guardName} at ${guard.location} detected: ${description}`,
      affectedProducts: [],
      affectedHubs: [guard.location],
      recommendedAction:
        "IMMEDIATE: Activate emergency protocol. Secure facility. Isolate products. Contact authorities.",
      statusUpdates: [],
      resolved: false,
    });
  }

  /**
   * Record health metric with automatic threshold checking
   */
  async recordHealthMetric(metric: HealthMetric): Promise<void> {
    const metricsByCategory = this.healthMetrics.get(metric.category) || [];
    metricsByCategory.push(metric);
    this.healthMetrics.set(metric.category, metricsByCategory);

    // Check against thresholds
    const threshold = this.alertThresholds.get(metric.category);
    if (threshold && metric.value > threshold.maxSafeValue) {
      await this.createAlert({
        alertId: `metric_${metric.metricId}`,
        timestamp: new Date(),
        severity:
          metric.value > threshold.criticalValue ? "critical" : "warning",
        category: metric.category,
        title: `Health Metric Deviation: ${metric.category}`,
        description: metric.description,
        affectedProducts: [],
        affectedHubs: [metric.location],
        recommendedAction: "Investigation required immediately",
        statusUpdates: [],
        resolved: false,
      });
    }
  }

  /**
   * Create real-time alert
   */
  async createAlert(alert: RealTimeAlertEvent): Promise<string> {
    this.realTimeAlerts.push(alert);
    this.alertHistory.push(alert);

    console.log(`[ALERT] ${alert.severity.toUpperCase()}: ${alert.title}`);
    console.log(`[${alert.timestamp.toISOString()}] ${alert.description}`);

    // If critical or emergency, trigger immediate actions
    if (alert.severity === "critical" || alert.severity === "emergency") {
      console.log(
        `[ACTION] Emergency protocol activated: ${alert.recommendedAction}`
      );
    }

    return alert.alertId;
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    hubId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ComplianceReport> {
    const productsTracked = Array.from(this.productOriginRecords.values());
    const metricsInPeriod = Array.from(this.healthMetrics.values())
      .flat()
      .filter((m) => m.timestamp >= startDate && m.timestamp <= endDate);

    const compliant = metricsInPeriod.filter(
      (m) => m.status === "compliant"
    ).length;
    const warning = metricsInPeriod.filter(
      (m) => m.status === "warning"
    ).length;
    const critical = metricsInPeriod.filter(
      (m) => m.status === "critical"
    ).length;

    const report: ComplianceReport = {
      reportId: `report_${hubId}_${Date.now()}`,
      reportDate: new Date(),
      periodCovered: { startDate, endDate },
      hubId,
      productCategories: ["organic", "natural", "certified_pesticide_free"],
      metrics: {
        totalProductsTracked: productsTracked.length,
        compliantProducts: compliant,
        warningProducts: warning,
        criticalProducts: critical,
        compliancePercentage: (compliant / metricsInPeriod.length) * 100,
      },
      incidentsReported: this.realTimeAlerts.filter((a) =>
        a.affectedHubs.includes(hubId)
      ).length,
      securityIncidents: Array.from(this.securityMonitoring.values()).reduce(
        (sum, guard) => sum + guard.incidentsDetected.length,
        0
      ),
      remedialActions: [],
      certifications: {
        organic: true,
        foodSafety: true,
        healthCompliance: true,
        securityAudit: true,
      },
    };

    this.complianceReports.set(report.reportId, report);
    return report;
  }

  /**
   * Get real-time dashboard data
   */
  getDashboardData(hubId?: string): {
    activeAlerts: RealTimeAlertEvent[];
    totalProducts: number;
    compliancePercentage: number;
    activeGuards: number;
    transportInProgress: number;
    recentMetrics: HealthMetric[];
  } {
    const filteredAlerts = this.realTimeAlerts.filter(
      (a) => !hubId || a.affectedHubs.includes(hubId)
    );

    const activeGuards = Array.from(this.securityMonitoring.values()).filter(
      (g) => g.status === "on_duty"
    ).length;

    const metricsArray = Array.from(this.healthMetrics.values()).flat();
    const compliantMetrics = metricsArray.filter(
      (m) => m.status === "compliant"
    ).length;
    const compliancePercentage =
      metricsArray.length > 0
        ? (compliantMetrics / metricsArray.length) * 100
        : 0;

    return {
      activeAlerts: filteredAlerts,
      totalProducts: this.productOriginRecords.size,
      compliancePercentage,
      activeGuards,
      transportInProgress: Array.from(this.transportLogs.values()).filter(
        (t) => !t.actualArrival
      ).length,
      recentMetrics: metricsArray.slice(-10),
    };
  }

  /**
   * Validation helpers
   */
  private validateOrganicCertifications(certifications: string[]): boolean {
    const requiredCerts = [
      "USDA_Organic",
      "organic_certified",
      "pesticide_free",
    ];
    return certifications.some((cert) =>
      requiredCerts.some((req) => cert.includes(req))
    );
  }

  private validateSecurityLicense(licenseNumber: string): boolean {
    // In production, verify against government/private security databases
    return licenseNumber.length > 0 && /^[A-Z0-9]{6,20}$/.test(licenseNumber);
  }

  /**
   * Get system health status
   */
  getSystemHealthStatus(): {
    overallStatus: "healthy" | "warning" | "critical";
    criticalAlerts: number;
    warningAlerts: number;
    compliancePercentage: number;
    lastUpdate: Date;
  } {
    const criticalAlerts = this.realTimeAlerts.filter(
      (a) => a.severity === "critical" || a.severity === "emergency"
    ).length;
    const warningAlerts = this.realTimeAlerts.filter(
      (a) => a.severity === "warning"
    ).length;

    const metricsArray = Array.from(this.healthMetrics.values()).flat();
    const compliantMetrics = metricsArray.filter(
      (m) => m.status === "compliant"
    ).length;
    const compliancePercentage =
      metricsArray.length > 0
        ? (compliantMetrics / metricsArray.length) * 100
        : 0;

    return {
      overallStatus:
        criticalAlerts > 0
          ? "critical"
          : warningAlerts > 0
            ? "warning"
            : "healthy",
      criticalAlerts,
      warningAlerts,
      compliancePercentage,
      lastUpdate: new Date(),
    };
  }
}

export default HealthPriorityDashboardEngine.getInstance();
