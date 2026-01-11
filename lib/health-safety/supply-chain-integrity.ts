/**
 * SUPPLY CHAIN INTEGRITY SYSTEM
 *
 * Complete end-to-end traceability from farm/garden through delivery to hubs
 * Every product, every step, every timestamp, every handler
 * NO GAPS in the chain. NO EXCEPTIONS.
 */

export type FarmOriginRecord = {
  farmId: string;
  farmName: string;
  location: {
    address: string;
    latitude: number;
    longitude: number;
    region: string;
  };
  certifications: string[];
  securityClearance: {
    cleared: boolean;
    clearanceDate: Date;
    officer: string;
  };
  cropBatchId: string;
  cropType: string;
  plantingDate: Date;
  harvestDate: Date;
  totalYield: {
    quantity: number;
    unit: "kg" | "lbs" | "units";
  };
  qualityInspection: {
    inspectionDate: Date;
    inspector: string;
    visualRating: "excellent" | "good" | "acceptable" | "rejected";
    defectsFound: string[];
    overallApproval: boolean;
  };
};

export type ProcessingFacilityRecord = {
  facilityId: string;
  facilityName: string;
  location: string;
  certifications: string[];
  processedBatchId: string;
  receivedDate: Date;
  receivedQuantity: {
    quantity: number;
    unit: string;
  };
  processingMethod: string;
  processingStartDate: Date;
  processingEndDate: Date;
  qualityControlTests: Array<{
    testDate: Date;
    testType: string;
    result: "pass" | "fail";
    parameters: Record<string, number>;
  }>;
  packagingDate: Date;
  packagingMaterial:
    | "glass"
    | "ceramic"
    | "natural_fiber"
    | "aluminum_free_container";
  finalQuantity: {
    quantity: number;
    unit: string;
  };
  storageConditions: {
    temperature: number;
    humidity: number;
    lightExposure: string;
  };
};

export type DistributionCenterRecord = {
  centerId: string;
  centerName: string;
  location: string;
  receivedDate: Date;
  receivedBatchId: string;
  receivedQuantity: {
    quantity: number;
    unit: string;
  };
  storageLocation: string;
  temperatureControlledStorage: boolean;
  storageConditions: {
    temperature: number;
    humidity: number;
    airQuality: string;
  };
  inspectionDate: Date;
  inspectionOfficer: string;
  integrityCheck: {
    sealIntact: boolean;
    labelsCorrect: boolean;
    noMoistureDamage: boolean;
    noInsectInfestation: boolean;
    overallCondition: "excellent" | "good" | "acceptable" | "rejected";
  };
};

export type DeliveryTransportRecord = {
  transportId: string;
  shipmentBatchId: string;
  transportMethod: "truck" | "van" | "courier";
  vehicleId: string;
  driverId: string;
  departurePoint: string;
  destinationHub: string;
  departureTime: Date;
  estimatedArrival: Date;
  actualArrival?: Date;
  roadConditions: string;
  temperatureLog: Array<{
    timestamp: Date;
    temperature: number;
    humidity: number;
    status: "optimal" | "warning" | "critical";
  }>;
  gpsTracking: Array<{
    timestamp: Date;
    latitude: number;
    longitude: number;
    speed: number;
    direction: string;
  }>;
  securityEscort: {
    guardId: string;
    guardName: string;
    licenseVerified: boolean;
    startTime: Date;
    endTime: Date;
    incidentsReported: number;
  };
  deliveryProof: {
    arrivalTime: Date;
    recipientName: string;
    signature: string;
    photoWithTimestamp: string;
    conditionUponArrival: "perfect" | "good" | "acceptable" | "damaged";
  };
};

export type SupplyChainNode = {
  nodeId: string;
  nodeType: "farm" | "processing_facility" | "distribution_center" | "hub";
  nodeName: string;
  nodeLocation: string;
  securityClearance: {
    cleared: boolean;
    clearanceDate: Date;
    inspectionOfficer: string;
  };
  healthCompliance: {
    certified: boolean;
    lastAuditDate: Date;
    auditPassed: boolean;
  };
  operationalStatus: "active" | "suspended" | "closed";
};

export type SupplyChainNode = {
  nodeId: string;
  nodeType: "farm" | "processing_facility" | "distribution_center" | "hub";
  nodeName: string;
  nodeLocation: string;
};

export type SupplyChainTrace = {
  traceId: string;
  productBatchId: string;
  productName: string;
  createdDate: Date;
  lastUpdated: Date;
  chainSteps: Array<{
    stepNumber: number;
    nodeId: string;
    nodeType: string;
    nodeName: string;
    entryTime: Date;
    exitTime?: Date;
    handler: string;
    quality: {
      condition: string;
      integrityChecked: boolean;
      testsPassed: boolean;
    };
    notes: string;
  }>;
  currentLocation: string;
  status: "in_supply_chain" | "at_hub" | "delivered_to_customer";
  integrityVerified: boolean;
  issues: Array<{
    issueId: string;
    timestamp: Date;
    issue: string;
    severity: "low" | "medium" | "high" | "critical" | "emergency";
    resolved: boolean;
    resolution?: string;
  }>;
};

/**
 * SUPPLY CHAIN INTEGRITY SYSTEM
 *
 * Complete traceability and verification from origin to delivery
 */
export class SupplyChainIntegritySystem {
  private static instance: SupplyChainIntegritySystem;
  private readonly farmRecords: Map<string, FarmOriginRecord> = new Map();
  private readonly processingRecords: Map<string, ProcessingFacilityRecord> =
    new Map();
  private readonly distributionRecords: Map<string, DistributionCenterRecord> =
    new Map();
  private readonly transportRecords: Map<string, DeliveryTransportRecord> =
    new Map();
  private readonly supplyChainNodes: Map<string, SupplyChainNode> = new Map();
  private readonly supplyChainTraces: Map<string, SupplyChainTrace> = new Map();
  private readonly auditLog: Array<{
    timestamp: Date;
    action: string;
    batchId?: string;
    details?: string;
  }> = [];

  private constructor() {}

  static getInstance(): SupplyChainIntegritySystem {
    if (!SupplyChainIntegritySystem.instance) {
      SupplyChainIntegritySystem.instance = new SupplyChainIntegritySystem();
    }
    return SupplyChainIntegritySystem.instance;
  }

  /**
   * Register supply chain node (farm, facility, center, hub)
   */
  async registerSupplyChainNode(node: SupplyChainNode): Promise<string> {
    // Verify security clearance
    if (!node.securityClearance?.cleared) {
      throw new Error(
        `SUPPLY CHAIN ERROR: Node ${node.nodeName} not security cleared`
      );
    }

    // Verify health compliance
    if (!node.healthCompliance?.certified) {
      throw new Error(
        `SUPPLY CHAIN ERROR: Node ${node.nodeName} not health certified`
      );
    }

    this.supplyChainNodes.set(node.nodeId, node);

    this.auditLog.push({
      timestamp: new Date(),
      action: `Registered supply chain node: ${node.nodeName}`,
      details: `Type: ${node.nodeType}, Location: ${node.nodeLocation}`,
    });

    return node.nodeId;
  }

  /**
   * Record product at farm origin
   */
  async recordFarmOrigin(farm: FarmOriginRecord): Promise<string> {
    // Verify farm is registered in supply chain
    const farmNode = this.supplyChainNodes.get(farm.farmId);
    if (!farmNode) {
      throw new Error(`SUPPLY CHAIN ERROR: Farm ${farm.farmId} not registered`);
    }

    // Verify quality inspection passed
    if (!farm.qualityInspection.overallApproval) {
      this.auditLog.push({
        timestamp: new Date(),
        action: "REJECTED farm product batch",
        batchId: farm.cropBatchId,
        details: `Quality inspection failed. Defects: ${farm.qualityInspection.defectsFound.join(", ")}`,
      });
      throw new Error("QUALITY REJECTION: Farm batch failed inspection");
    }

    this.farmRecords.set(farm.cropBatchId, farm);

    // Create initial supply chain trace
    const trace: SupplyChainTrace = {
      traceId: `trace_${farm.cropBatchId}`,
      productBatchId: farm.cropBatchId,
      productName: farm.cropType,
      createdDate: new Date(),
      lastUpdated: new Date(),
      chainSteps: [
        {
          stepNumber: 1,
          nodeId: farm.farmId,
          nodeType: "farm",
          nodeName: farm.farmName,
          entryTime: farm.plantingDate,
          exitTime: farm.harvestDate,
          handler: farm.qualityInspection.inspector,
          quality: {
            condition: farm.qualityInspection.visualRating,
            integrityChecked: true,
            testsPassed: farm.qualityInspection.overallApproval,
          },
          notes: `Harvested: ${farm.totalYield.quantity} ${farm.totalYield.unit}`,
        },
      ],
      currentLocation: farm.farmName,
      status: "in_supply_chain",
      integrityVerified: true,
      issues: [],
    };

    this.supplyChainTraces.set(trace.traceId, trace);

    this.auditLog.push({
      timestamp: new Date(),
      action: "Recorded farm origin",
      batchId: farm.cropBatchId,
      details: `Farm: ${farm.farmName}, Yield: ${farm.totalYield.quantity} ${farm.totalYield.unit}`,
    });

    return farm.cropBatchId;
  }

  /**
   * Record product at processing facility
   */
  async recordProcessingFacility(
    processing: ProcessingFacilityRecord
  ): Promise<void> {
    // Get current trace
    const traces = Array.from(this.supplyChainTraces.values()).filter(
      (t) => t.productBatchId === processing.processedBatchId
    );

    if (traces.length === 0) {
      throw new Error(
        `SUPPLY CHAIN ERROR: No trace found for batch ${processing.processedBatchId}`
      );
    }

    const trace = traces[0];

    // Verify all quality control tests passed
    const failedTests = processing.qualityControlTests.filter(
      (t) => t.result === "fail"
    );
    if (failedTests.length > 0) {
      trace.issues.push({
        issueId: `issue_${Date.now()}`,
        timestamp: new Date(),
        issue: `Quality control tests failed: ${failedTests.map((t) => t.testType).join(", ")}`,
        severity: "critical",
        resolved: false,
      });

      this.auditLog.push({
        timestamp: new Date(),
        action: "QUALITY CONTROL FAILURE",
        batchId: processing.processedBatchId,
        details: `Tests failed: ${failedTests.map((t) => t.testType).join(", ")}`,
      });

      throw new Error("Quality control tests failed at processing facility");
    }

    // Verify packaging material is safe
    if (
      ![
        "glass",
        "ceramic",
        "natural_fiber",
        "aluminum_free_container",
      ].includes(processing.packagingMaterial)
    ) {
      throw new Error(
        `PACKAGING ERROR: Unsafe packaging material: ${processing.packagingMaterial}`
      );
    }

    // Record storage conditions
    if (
      processing.storageConditions.temperature > 25 ||
      processing.storageConditions.temperature < 0
    ) {
      trace.issues.push({
        issueId: `issue_${Date.now()}`,
        timestamp: new Date(),
        issue: `Storage temperature out of range: ${processing.storageConditions.temperature}°C`,
        severity: "medium",
        resolved: false,
      });
    }

    this.processingRecords.set(processing.facilityId, processing);

    // Add to trace
    trace.chainSteps.push({
      stepNumber: trace.chainSteps.length + 1,
      nodeId: processing.facilityId,
      nodeType: "processing_facility",
      nodeName: processing.facilityName,
      entryTime: processing.receivedDate,
      exitTime: processing.packagingDate,
      handler: processing.facilityName,
      quality: {
        condition: "processed",
        integrityChecked: true,
        testsPassed: true,
      },
      notes: `Processed with ${processing.processingMethod}. Packaged in ${processing.packagingMaterial}`,
    });

    trace.lastUpdated = new Date();
    trace.currentLocation = processing.facilityName;

    this.auditLog.push({
      timestamp: new Date(),
      action: "Recorded processing facility step",
      batchId: processing.processedBatchId,
      details: `Facility: ${processing.facilityName}, Quantity: ${processing.finalQuantity.quantity} ${processing.finalQuantity.unit}`,
    });
  }

  /**
   * Record product at distribution center
   */
  async recordDistributionCenter(
    distribution: DistributionCenterRecord
  ): Promise<void> {
    // Get current trace
    const traces = Array.from(this.supplyChainTraces.values()).filter(
      (t) => t.productBatchId === distribution.receivedBatchId
    );

    if (traces.length === 0) {
      throw new Error(
        `SUPPLY CHAIN ERROR: No trace found for batch ${distribution.receivedBatchId}`
      );
    }

    const trace = traces[0];

    // Verify integrity check
    if (
      !distribution.integrityCheck.overallCondition ||
      distribution.integrityCheck.overallCondition === "rejected"
    ) {
      trace.issues.push({
        issueId: `issue_${Date.now()}`,
        timestamp: new Date(),
        issue: "Integrity check failed at distribution center",
        severity: "critical",
        resolved: false,
      });

      throw new Error("Product integrity compromised at distribution center");
    }

    // Check for contamination indicators
    if (
      !distribution.integrityCheck.noInsectInfestation ||
      !distribution.integrityCheck.noMoistureDamage
    ) {
      trace.issues.push({
        issueId: `issue_${Date.now()}`,
        timestamp: new Date(),
        issue: "Contamination detected: Insects or moisture damage",
        severity: "critical",
        resolved: false,
      });

      throw new Error("Product contamination detected - batch quarantined");
    }

    this.distributionRecords.set(distribution.centerId, distribution);

    // Add to trace
    trace.chainSteps.push({
      stepNumber: trace.chainSteps.length + 1,
      nodeId: distribution.centerId,
      nodeType: "distribution_center",
      nodeName: distribution.centerName,
      entryTime: distribution.receivedDate,
      exitTime: undefined,
      handler: distribution.inspectionOfficer,
      quality: {
        condition: distribution.integrityCheck.overallCondition,
        integrityChecked: true,
        testsPassed: true,
      },
      notes: `Storage conditions: ${distribution.storageConditions.temperature}°C, ${distribution.storageConditions.humidity}% humidity`,
    });

    trace.lastUpdated = new Date();
    trace.currentLocation = distribution.centerName;

    this.auditLog.push({
      timestamp: new Date(),
      action: "Recorded distribution center receipt",
      batchId: distribution.receivedBatchId,
      details: `Center: ${distribution.centerName}, Quantity: ${distribution.receivedQuantity.quantity}`,
    });
  }

  /**
   * Record product delivery to hub
   */
  async recordDeliveryTransport(
    transport: DeliveryTransportRecord
  ): Promise<string> {
    // Get current trace
    const traces = Array.from(this.supplyChainTraces.values()).filter(
      (t) => t.productBatchId === transport.shipmentBatchId
    );

    if (traces.length === 0) {
      throw new Error(
        `SUPPLY CHAIN ERROR: No trace found for shipment ${transport.shipmentBatchId}`
      );
    }

    const trace = traces[0];

    // Verify security escort was present
    if (
      !transport.securityEscort.guardId ||
      !transport.securityEscort.licenseVerified
    ) {
      throw new Error(
        `DELIVERY ERROR: No verified security escort for shipment ${transport.shipmentBatchId}`
      );
    }

    // Verify temperature integrity during transport
    const tempViolations = transport.temperatureLog.filter(
      (t) => t.status !== "optimal"
    );
    if (tempViolations.length > 0) {
      trace.issues.push({
        issueId: `issue_${Date.now()}`,
        timestamp: new Date(),
        issue: `Temperature violations during transport: ${tempViolations.length} readings`,
        severity: "medium",
        resolved: false,
      });
    }

    // Verify seal was intact upon arrival
    if (transport.deliveryProof.conditionUponArrival === "damaged") {
      trace.issues.push({
        issueId: `issue_${Date.now()}`,
        timestamp: new Date(),
        issue: "Product damaged upon arrival at hub",
        severity: "critical",
        resolved: false,
      });

      throw new Error("Product damaged during transport - batch rejected");
    }

    this.transportRecords.set(transport.transportId, transport);

    // Add to trace
    trace.chainSteps.push({
      stepNumber: trace.chainSteps.length + 1,
      nodeId: transport.destinationHub,
      nodeType: "hub",
      nodeName: transport.destinationHub,
      entryTime: transport.departureTime,
      exitTime: transport.actualArrival || transport.departureTime,
      handler: transport.driverId,
      quality: {
        condition: transport.deliveryProof.conditionUponArrival,
        integrityChecked: true,
        testsPassed:
          transport.deliveryProof.conditionUponArrival === "perfect" ||
          transport.deliveryProof.conditionUponArrival === "good",
      },
      notes: `Delivered by ${transport.securityEscort.guardName}. Escort incidents: ${transport.securityEscort.incidentsReported}`,
    });

    trace.lastUpdated = new Date();
    trace.currentLocation = transport.destinationHub;
    trace.status = "at_hub";
    trace.integrityVerified = trace.issues.length === 0;

    this.auditLog.push({
      timestamp: new Date(),
      action: "Recorded delivery to hub",
      batchId: transport.shipmentBatchId,
      details: `Hub: ${transport.destinationHub}, Arrival: ${transport.deliveryProof.arrivalTime.toISOString()}`,
    });

    return transport.transportId;
  }

  /**
   * Get complete supply chain trace for product
   */
  getSupplyChainTrace(batchId: string): SupplyChainTrace | null {
    const traces = Array.from(this.supplyChainTraces.values()).filter(
      (t) => t.productBatchId === batchId
    );

    return traces.length > 0 ? traces[0] : null;
  }

  /**
   * Verify complete chain integrity
   */
  verifyChainIntegrity(batchId: string): {
    isIntact: boolean;
    allStepsCompleted: boolean;
    issuesFound: number;
    criticalIssues: number;
    integrity: number;
  } {
    const trace = this.getSupplyChainTrace(batchId);
    if (!trace) {
      throw new Error(`Batch not found: ${batchId}`);
    }

    const criticalIssues = trace.issues.filter(
      (i) => i.severity === "critical"
    ).length;
    const totalIssues = trace.issues.length;

    return {
      isIntact: trace.integrityVerified && criticalIssues === 0,
      allStepsCompleted: trace.chainSteps.length >= 4,
      issuesFound: totalIssues,
      criticalIssues,
      integrity: 100 - totalIssues * 10,
    };
  }

  /**
   * Generate supply chain report
   */
  generateSupplyChainReport(): {
    totalBatchesTracked: number;
    batchesCompleted: number;
    batchesInProgress: number;
    integrityPercentage: number;
    issuesResolved: number;
    criticalIssuesOpen: number;
    timestamp: Date;
  } {
    const traces = Array.from(this.supplyChainTraces.values());
    const completed = traces.filter(
      (t) => t.status === "delivered_to_customer"
    ).length;
    const inProgress = traces.filter(
      (t) => t.status !== "delivered_to_customer"
    ).length;
    const allIssues = traces.reduce((sum, t) => sum + t.issues.length, 0);
    const resolvedIssues = traces.reduce(
      (sum, t) => sum + t.issues.filter((i) => i.resolved).length,
      0
    );
    const criticalOpen = traces.reduce(
      (sum, t) =>
        sum +
        t.issues.filter((i) => !i.resolved && i.severity === "critical").length,
      0
    );

    return {
      totalBatchesTracked: traces.length,
      batchesCompleted: completed,
      batchesInProgress: inProgress,
      integrityPercentage:
        traces.length > 0
          ? (traces.filter((t) => t.integrityVerified).length / traces.length) *
            100
          : 0,
      issuesResolved: resolvedIssues,
      criticalIssuesOpen: criticalOpen,
      timestamp: new Date(),
    };
  }

  /**
   * Get audit log
   */
  getAuditLog(limit = 100): Array<{
    timestamp: Date;
    action: string;
    batchId?: string;
    details?: string;
  }> {
    return this.auditLog.slice(-limit);
  }
}

export default SupplyChainIntegritySystem.getInstance();
