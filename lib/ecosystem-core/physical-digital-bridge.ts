/**
 * Physical-to-Digital Bridge
 * 
 * Triumph-Synergy bridges the physical and digital worlds:
 * - Real-world asset tokenization
 * - IoT device integration
 * - Physical identity verification
 * - Real-world event triggers
 * - Geolocation services
 * - Supply chain tracking
 */

import { EventEmitter } from "events";

// ============================================================================
// Types
// ============================================================================

export type AssetCategory = 
  | "real-estate"
  | "vehicle"
  | "equipment"
  | "inventory"
  | "art"
  | "collectible"
  | "commodity"
  | "precious-metal"
  | "document"
  | "certificate"
  | "identity"
  | "service-hours"
  | "custom";

export type DeviceType = 
  | "sensor"
  | "actuator"
  | "camera"
  | "scanner"
  | "beacon"
  | "tracker"
  | "gateway"
  | "controller"
  | "display"
  | "terminal";

export type VerificationType = 
  | "biometric"
  | "document"
  | "signature"
  | "witness"
  | "notary"
  | "government"
  | "blockchain"
  | "multi-factor";

export interface PhysicalAsset {
  id: string;
  name: string;
  description: string;
  category: AssetCategory;
  
  // Physical properties
  physical: {
    location?: GeoLocation;
    address?: string;
    serialNumber?: string;
    dimensions?: { width: number; height: number; depth: number; unit: string };
    weight?: { value: number; unit: string };
    condition: "new" | "excellent" | "good" | "fair" | "poor";
    images: string[];
    documents: string[];
  };
  
  // Digital representation
  digital: {
    tokenId?: string;
    tokenStandard?: "ERC-721" | "ERC-1155" | "PI-NFT";
    nftMetadata?: Record<string, unknown>;
    digitalTwinId?: string;
    blockchainRecords: BlockchainRecord[];
  };
  
  // Ownership
  ownership: {
    currentOwner: string;
    previousOwners: OwnershipRecord[];
    transferable: boolean;
    fractionalized: boolean;
    fractions?: number;
    fractionHolders?: { holder: string; fraction: number }[];
  };
  
  // Valuation
  valuation: {
    estimatedValue: number;
    currency: string;
    lastAppraisal?: Date;
    appraisedBy?: string;
    marketPrice?: number;
  };
  
  // Verification
  verification: {
    verified: boolean;
    verificationMethod?: VerificationType;
    verifiedBy?: string;
    verifiedAt?: Date;
    proofs: VerificationProof[];
  };
  
  registeredAt: Date;
  lastUpdated: Date;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  timestamp: Date;
}

export interface BlockchainRecord {
  chain: string;
  txHash: string;
  blockNumber: number;
  timestamp: Date;
  action: string;
}

export interface OwnershipRecord {
  owner: string;
  from: Date;
  to: Date;
  transferTxHash?: string;
  transferValue?: number;
}

export interface VerificationProof {
  id: string;
  type: VerificationType;
  data: string;
  timestamp: Date;
  verifier: string;
  valid: boolean;
}

export interface IoTDevice {
  id: string;
  name: string;
  type: DeviceType;
  manufacturer?: string;
  model?: string;
  
  // Connection
  connection: {
    status: "online" | "offline" | "error" | "maintenance";
    protocol: "mqtt" | "http" | "websocket" | "bluetooth" | "zigbee" | "lora";
    endpoint?: string;
    lastSeen?: Date;
    signalStrength?: number;
  };
  
  // Location
  location?: GeoLocation;
  boundToAsset?: string;
  
  // Capabilities
  capabilities: string[];
  sensors?: SensorSpec[];
  actuators?: ActuatorSpec[];
  
  // Data
  lastReading?: DeviceReading;
  readingHistory: DeviceReading[];
  
  // Security
  security: {
    encrypted: boolean;
    certificateId?: string;
    authenticationType: "key" | "certificate" | "oauth" | "none";
    lastSecurityAudit?: Date;
  };
  
  registeredAt: Date;
  firmware?: string;
}

export interface SensorSpec {
  name: string;
  type: "temperature" | "humidity" | "pressure" | "motion" | "light" | "sound" | "gps" | "custom";
  unit: string;
  range?: { min: number; max: number };
  accuracy?: number;
}

export interface ActuatorSpec {
  name: string;
  type: "switch" | "motor" | "valve" | "display" | "speaker" | "custom";
  states?: string[];
  range?: { min: number; max: number };
}

export interface DeviceReading {
  timestamp: Date;
  values: Record<string, number | string | boolean>;
  location?: GeoLocation;
  batteryLevel?: number;
}

export interface RealWorldEvent {
  id: string;
  type: "location-change" | "condition-change" | "ownership-transfer" | "verification" | "alert" | "custom";
  source: "device" | "user" | "system" | "oracle";
  sourceId: string;
  
  // Event data
  data: Record<string, unknown>;
  
  // Triggers
  triggers: EventTrigger[];
  
  // Blockchain
  recorded: boolean;
  txHash?: string;
  
  timestamp: Date;
  processed: boolean;
  processedAt?: Date;
}

export interface EventTrigger {
  id: string;
  condition: string;
  action: "notify" | "transfer" | "lock" | "unlock" | "execute-contract" | "custom";
  parameters: Record<string, unknown>;
  triggered: boolean;
  triggeredAt?: Date;
}

export interface DigitalTwin {
  id: string;
  physicalAssetId: string;
  
  // State
  state: Record<string, unknown>;
  lastSync: Date;
  syncFrequency: number;  // ms
  
  // Real-time data
  liveData: Record<string, unknown>;
  dataStreams: DataStream[];
  
  // Simulation
  simulationEnabled: boolean;
  predictions: Prediction[];
  
  // Integration
  connectedDevices: string[];
  
  createdAt: Date;
}

export interface DataStream {
  id: string;
  name: string;
  sourceDeviceId: string;
  dataType: string;
  frequency: number;
  active: boolean;
}

export interface Prediction {
  type: string;
  prediction: string;
  confidence: number;
  predictedAt: Date;
  forTime: Date;
}

export interface PhysicalIdentity {
  id: string;
  userId: string;
  
  // Identity verification
  verificationLevel: "basic" | "standard" | "enhanced" | "full";
  verifiedAt?: Date;
  
  // Biometrics (hashed)
  biometrics: {
    facialHash?: string;
    fingerprintHash?: string;
    voiceHash?: string;
    irisHash?: string;
  };
  
  // Documents
  documents: IdentityDocument[];
  
  // Physical presence
  lastKnownLocation?: GeoLocation;
  locationHistory: GeoLocation[];
  
  // Reputation
  physicalWorldRating: number;
  digitalWorldRating: number;
  crossWorldTrustScore: number;
  
  // Blockchain attestations
  attestations: Attestation[];
}

export interface IdentityDocument {
  type: "passport" | "id-card" | "drivers-license" | "utility-bill" | "bank-statement" | "other";
  documentHash: string;
  issuingAuthority: string;
  issueDate: Date;
  expiryDate?: Date;
  verified: boolean;
  verifiedBy?: string;
}

export interface Attestation {
  id: string;
  claim: string;
  attester: string;
  attesterType: "government" | "organization" | "individual" | "oracle";
  timestamp: Date;
  txHash: string;
  valid: boolean;
  revokedAt?: Date;
}

// ============================================================================
// Physical-Digital Bridge Manager
// ============================================================================

class PhysicalDigitalBridge extends EventEmitter {
  private static instance: PhysicalDigitalBridge;
  
  private assets: Map<string, PhysicalAsset> = new Map();
  private devices: Map<string, IoTDevice> = new Map();
  private events: Map<string, RealWorldEvent> = new Map();
  private digitalTwins: Map<string, DigitalTwin> = new Map();
  private identities: Map<string, PhysicalIdentity> = new Map();
  
  // Indexes
  private assetsByOwner: Map<string, Set<string>> = new Map();
  private devicesByAsset: Map<string, Set<string>> = new Map();
  private twinsByAsset: Map<string, string> = new Map();
  
  // Event processing
  private eventQueue: string[] = [];
  private processingInterval?: NodeJS.Timeout;
  
  private constructor() {
    super();
    this.setMaxListeners(100);
    this.startEventProcessing();
  }
  
  static getInstance(): PhysicalDigitalBridge {
    if (!PhysicalDigitalBridge.instance) {
      PhysicalDigitalBridge.instance = new PhysicalDigitalBridge();
    }
    return PhysicalDigitalBridge.instance;
  }
  
  private startEventProcessing(): void {
    this.processingInterval = setInterval(() => {
      this.processEventQueue();
    }, 1000);
  }
  
  // ==========================================================================
  // Physical Asset Management
  // ==========================================================================
  
  /**
   * Register a physical asset
   */
  registerAsset(params: {
    name: string;
    description: string;
    category: AssetCategory;
    owner: string;
    physical: PhysicalAsset["physical"];
    valuation?: Partial<PhysicalAsset["valuation"]>;
  }): PhysicalAsset {
    const id = `asset-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    const asset: PhysicalAsset = {
      id,
      name: params.name,
      description: params.description,
      category: params.category,
      physical: params.physical,
      digital: {
        blockchainRecords: [],
      },
      ownership: {
        currentOwner: params.owner,
        previousOwners: [],
        transferable: true,
        fractionalized: false,
      },
      valuation: {
        estimatedValue: params.valuation?.estimatedValue || 0,
        currency: params.valuation?.currency || "PI",
        ...params.valuation,
      },
      verification: {
        verified: false,
        proofs: [],
      },
      registeredAt: new Date(),
      lastUpdated: new Date(),
    };
    
    this.assets.set(id, asset);
    
    // Index by owner
    if (!this.assetsByOwner.has(params.owner)) {
      this.assetsByOwner.set(params.owner, new Set());
    }
    this.assetsByOwner.get(params.owner)!.add(id);
    
    // Record on blockchain
    this.recordOnBlockchain(id, "asset-registered");
    
    this.emit("asset-registered", { asset });
    return asset;
  }
  
  /**
   * Tokenize a physical asset
   */
  tokenizeAsset(assetId: string, tokenStandard: PhysicalAsset["digital"]["tokenStandard"] = "PI-NFT"): PhysicalAsset {
    const asset = this.assets.get(assetId);
    if (!asset) throw new Error("Asset not found");
    
    if (asset.digital.tokenId) {
      throw new Error("Asset already tokenized");
    }
    
    const tokenId = `token-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    asset.digital.tokenId = tokenId;
    asset.digital.tokenStandard = tokenStandard;
    asset.digital.nftMetadata = {
      name: asset.name,
      description: asset.description,
      category: asset.category,
      physicalProperties: asset.physical,
      valuationHistory: [asset.valuation],
      registrationDate: asset.registeredAt,
      tokenizationDate: new Date(),
    };
    
    // Record on blockchain
    this.recordOnBlockchain(assetId, "asset-tokenized");
    
    asset.lastUpdated = new Date();
    this.emit("asset-tokenized", { asset, tokenId });
    return asset;
  }
  
  /**
   * Fractionalize a tokenized asset
   */
  fractionalizeAsset(assetId: string, fractions: number): PhysicalAsset {
    const asset = this.assets.get(assetId);
    if (!asset) throw new Error("Asset not found");
    
    if (!asset.digital.tokenId) {
      throw new Error("Asset must be tokenized first");
    }
    
    if (asset.ownership.fractionalized) {
      throw new Error("Asset already fractionalized");
    }
    
    asset.ownership.fractionalized = true;
    asset.ownership.fractions = fractions;
    asset.ownership.fractionHolders = [
      { holder: asset.ownership.currentOwner, fraction: fractions }
    ];
    
    // Record on blockchain
    this.recordOnBlockchain(assetId, "asset-fractionalized");
    
    asset.lastUpdated = new Date();
    this.emit("asset-fractionalized", { asset, fractions });
    return asset;
  }
  
  /**
   * Transfer asset ownership
   */
  transferAsset(assetId: string, newOwner: string, value?: number): PhysicalAsset {
    const asset = this.assets.get(assetId);
    if (!asset) throw new Error("Asset not found");
    
    if (!asset.ownership.transferable) {
      throw new Error("Asset is not transferable");
    }
    
    const previousOwner = asset.ownership.currentOwner;
    
    // Update ownership history
    asset.ownership.previousOwners.push({
      owner: previousOwner,
      from: asset.ownership.previousOwners.length > 0 
        ? asset.ownership.previousOwners[asset.ownership.previousOwners.length - 1].to 
        : asset.registeredAt,
      to: new Date(),
      transferValue: value,
    });
    
    asset.ownership.currentOwner = newOwner;
    
    // Update indexes
    this.assetsByOwner.get(previousOwner)?.delete(assetId);
    if (!this.assetsByOwner.has(newOwner)) {
      this.assetsByOwner.set(newOwner, new Set());
    }
    this.assetsByOwner.get(newOwner)!.add(assetId);
    
    // Record on blockchain
    const record = this.recordOnBlockchain(assetId, "ownership-transferred");
    asset.ownership.previousOwners[asset.ownership.previousOwners.length - 1].transferTxHash = record.txHash;
    
    asset.lastUpdated = new Date();
    this.emit("asset-transferred", { asset, previousOwner, newOwner, value });
    return asset;
  }
  
  /**
   * Verify a physical asset
   */
  verifyAsset(
    assetId: string, 
    verifier: string,
    method: VerificationType,
    proofData: string
  ): PhysicalAsset {
    const asset = this.assets.get(assetId);
    if (!asset) throw new Error("Asset not found");
    
    const proofId = `proof-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    const proof: VerificationProof = {
      id: proofId,
      type: method,
      data: proofData,
      timestamp: new Date(),
      verifier,
      valid: true,
    };
    
    asset.verification.proofs.push(proof);
    asset.verification.verified = true;
    asset.verification.verificationMethod = method;
    asset.verification.verifiedBy = verifier;
    asset.verification.verifiedAt = new Date();
    
    // Record on blockchain
    this.recordOnBlockchain(assetId, "asset-verified");
    
    asset.lastUpdated = new Date();
    this.emit("asset-verified", { asset, proof });
    return asset;
  }
  
  private recordOnBlockchain(assetId: string, action: string): BlockchainRecord {
    const record: BlockchainRecord = {
      chain: "pi-network",
      txHash: `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`,
      blockNumber: Math.floor(Date.now() / 1000),
      timestamp: new Date(),
      action,
    };
    
    const asset = this.assets.get(assetId);
    if (asset) {
      asset.digital.blockchainRecords.push(record);
    }
    
    return record;
  }
  
  // ==========================================================================
  // IoT Device Management
  // ==========================================================================
  
  /**
   * Register an IoT device
   */
  registerDevice(params: {
    name: string;
    type: DeviceType;
    manufacturer?: string;
    model?: string;
    protocol: IoTDevice["connection"]["protocol"];
    endpoint?: string;
    capabilities: string[];
    sensors?: SensorSpec[];
    actuators?: ActuatorSpec[];
    boundToAsset?: string;
    location?: GeoLocation;
  }): IoTDevice {
    const id = `device-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    const device: IoTDevice = {
      id,
      name: params.name,
      type: params.type,
      manufacturer: params.manufacturer,
      model: params.model,
      connection: {
        status: "offline",
        protocol: params.protocol,
        endpoint: params.endpoint,
      },
      location: params.location,
      boundToAsset: params.boundToAsset,
      capabilities: params.capabilities,
      sensors: params.sensors,
      actuators: params.actuators,
      readingHistory: [],
      security: {
        encrypted: true,
        authenticationType: "certificate",
      },
      registeredAt: new Date(),
    };
    
    this.devices.set(id, device);
    
    // Index by asset
    if (params.boundToAsset) {
      if (!this.devicesByAsset.has(params.boundToAsset)) {
        this.devicesByAsset.set(params.boundToAsset, new Set());
      }
      this.devicesByAsset.get(params.boundToAsset)!.add(id);
    }
    
    this.emit("device-registered", { device });
    return device;
  }
  
  /**
   * Update device connection status
   */
  updateDeviceStatus(deviceId: string, status: IoTDevice["connection"]["status"]): IoTDevice {
    const device = this.devices.get(deviceId);
    if (!device) throw new Error("Device not found");
    
    const oldStatus = device.connection.status;
    device.connection.status = status;
    device.connection.lastSeen = new Date();
    
    if (status === "online" && oldStatus !== "online") {
      this.emit("device-online", { device });
    } else if (status === "offline" && oldStatus === "online") {
      this.emit("device-offline", { device });
    }
    
    return device;
  }
  
  /**
   * Record device reading
   */
  recordDeviceReading(deviceId: string, reading: Omit<DeviceReading, "timestamp">): IoTDevice {
    const device = this.devices.get(deviceId);
    if (!device) throw new Error("Device not found");
    
    const fullReading: DeviceReading = {
      ...reading,
      timestamp: new Date(),
    };
    
    device.lastReading = fullReading;
    device.readingHistory.push(fullReading);
    
    // Keep last 1000 readings
    if (device.readingHistory.length > 1000) {
      device.readingHistory = device.readingHistory.slice(-1000);
    }
    
    device.connection.status = "online";
    device.connection.lastSeen = new Date();
    
    // Check for event triggers
    this.checkDeviceTriggers(device, fullReading);
    
    // Update digital twin if exists
    if (device.boundToAsset) {
      const twinId = this.twinsByAsset.get(device.boundToAsset);
      if (twinId) {
        this.updateDigitalTwin(twinId, device.id, fullReading);
      }
    }
    
    this.emit("device-reading", { device, reading: fullReading });
    return device;
  }
  
  private checkDeviceTriggers(device: IoTDevice, reading: DeviceReading): void {
    // Check for alert conditions
    for (const [key, value] of Object.entries(reading.values)) {
      // Temperature alerts
      if (key === "temperature" && typeof value === "number") {
        if (value > 100 || value < -40) {
          this.createEvent({
            type: "alert",
            source: "device",
            sourceId: device.id,
            data: { alertType: "temperature-extreme", value, threshold: value > 100 ? 100 : -40 },
          });
        }
      }
      
      // Motion detection
      if (key === "motion" && value === true) {
        this.createEvent({
          type: "alert",
          source: "device",
          sourceId: device.id,
          data: { alertType: "motion-detected", location: reading.location },
        });
      }
    }
  }
  
  // ==========================================================================
  // Digital Twin Management
  // ==========================================================================
  
  /**
   * Create a digital twin
   */
  createDigitalTwin(assetId: string, syncFrequency: number = 60000): DigitalTwin {
    const asset = this.assets.get(assetId);
    if (!asset) throw new Error("Asset not found");
    
    const id = `twin-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    const twin: DigitalTwin = {
      id,
      physicalAssetId: assetId,
      state: {
        name: asset.name,
        category: asset.category,
        location: asset.physical.location,
        condition: asset.physical.condition,
        owner: asset.ownership.currentOwner,
        value: asset.valuation.estimatedValue,
      },
      lastSync: new Date(),
      syncFrequency,
      liveData: {},
      dataStreams: [],
      simulationEnabled: false,
      predictions: [],
      connectedDevices: [],
      createdAt: new Date(),
    };
    
    // Connect existing devices
    const deviceIds = this.devicesByAsset.get(assetId);
    if (deviceIds) {
      twin.connectedDevices = Array.from(deviceIds);
      
      // Create data streams
      for (const deviceId of deviceIds) {
        const device = this.devices.get(deviceId);
        if (device?.sensors) {
          for (const sensor of device.sensors) {
            twin.dataStreams.push({
              id: `stream-${deviceId}-${sensor.name}`,
              name: sensor.name,
              sourceDeviceId: deviceId,
              dataType: sensor.type,
              frequency: syncFrequency,
              active: true,
            });
          }
        }
      }
    }
    
    // Update asset
    asset.digital.digitalTwinId = id;
    
    this.digitalTwins.set(id, twin);
    this.twinsByAsset.set(assetId, id);
    
    this.emit("digital-twin-created", { twin, asset });
    return twin;
  }
  
  /**
   * Update digital twin with device data
   */
  private updateDigitalTwin(twinId: string, deviceId: string, reading: DeviceReading): void {
    const twin = this.digitalTwins.get(twinId);
    if (!twin) return;
    
    // Update live data
    twin.liveData[deviceId] = {
      ...reading.values,
      timestamp: reading.timestamp,
      location: reading.location,
    };
    
    // Update state
    if (reading.location) {
      twin.state.location = reading.location;
    }
    
    twin.lastSync = new Date();
    
    this.emit("digital-twin-updated", { twin, deviceId, reading });
  }
  
  /**
   * Run simulation on digital twin
   */
  runSimulation(twinId: string, scenarioData: Record<string, unknown>): Prediction[] {
    const twin = this.digitalTwins.get(twinId);
    if (!twin) throw new Error("Digital twin not found");
    
    // Simple simulation/prediction
    const predictions: Prediction[] = [];
    
    // Predict based on historical data
    for (const deviceId of twin.connectedDevices) {
      const device = this.devices.get(deviceId);
      if (!device || device.readingHistory.length < 10) continue;
      
      // Simple trend prediction
      const recentReadings = device.readingHistory.slice(-10);
      for (const key of Object.keys(recentReadings[0].values)) {
        const values = recentReadings
          .map(r => r.values[key])
          .filter(v => typeof v === "number") as number[];
        
        if (values.length < 5) continue;
        
        const trend = (values[values.length - 1] - values[0]) / values.length;
        const predicted = values[values.length - 1] + trend * 10;
        
        predictions.push({
          type: `${deviceId}:${key}`,
          prediction: `${predicted.toFixed(2)}`,
          confidence: 0.7,
          predictedAt: new Date(),
          forTime: new Date(Date.now() + 3600000), // 1 hour ahead
        });
      }
    }
    
    twin.predictions = predictions;
    twin.simulationEnabled = true;
    
    this.emit("simulation-run", { twin, predictions });
    return predictions;
  }
  
  // ==========================================================================
  // Real World Events
  // ==========================================================================
  
  /**
   * Create a real-world event
   */
  createEvent(params: {
    type: RealWorldEvent["type"];
    source: RealWorldEvent["source"];
    sourceId: string;
    data: Record<string, unknown>;
    triggers?: EventTrigger[];
  }): RealWorldEvent {
    const id = `event-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    const event: RealWorldEvent = {
      id,
      type: params.type,
      source: params.source,
      sourceId: params.sourceId,
      data: params.data,
      triggers: params.triggers || [],
      recorded: false,
      timestamp: new Date(),
      processed: false,
    };
    
    this.events.set(id, event);
    this.eventQueue.push(id);
    
    this.emit("event-created", { event });
    return event;
  }
  
  private processEventQueue(): void {
    while (this.eventQueue.length > 0) {
      const eventId = this.eventQueue.shift()!;
      this.processEvent(eventId);
    }
  }
  
  private processEvent(eventId: string): void {
    const event = this.events.get(eventId);
    if (!event || event.processed) return;
    
    // Process triggers
    for (const trigger of event.triggers) {
      // Simple condition evaluation
      if (this.evaluateTriggerCondition(trigger.condition, event)) {
        trigger.triggered = true;
        trigger.triggeredAt = new Date();
        
        this.executeTriggerAction(trigger, event);
      }
    }
    
    // Record on blockchain
    event.recorded = true;
    event.txHash = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;
    
    event.processed = true;
    event.processedAt = new Date();
    
    this.emit("event-processed", { event });
  }
  
  private evaluateTriggerCondition(condition: string, event: RealWorldEvent): boolean {
    // Simple condition evaluation
    return condition === "always" || event.type === condition;
  }
  
  private executeTriggerAction(trigger: EventTrigger, event: RealWorldEvent): void {
    switch (trigger.action) {
      case "notify":
        this.emit("trigger-notification", { trigger, event });
        break;
      case "execute-contract":
        this.emit("trigger-contract", { trigger, event });
        break;
      default:
        this.emit("trigger-executed", { trigger, event });
    }
  }
  
  // ==========================================================================
  // Physical Identity
  // ==========================================================================
  
  /**
   * Create physical identity
   */
  createPhysicalIdentity(params: {
    userId: string;
    documents?: IdentityDocument[];
    biometrics?: Partial<PhysicalIdentity["biometrics"]>;
  }): PhysicalIdentity {
    const id = `identity-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    const identity: PhysicalIdentity = {
      id,
      userId: params.userId,
      verificationLevel: "basic",
      biometrics: params.biometrics || {},
      documents: params.documents || [],
      locationHistory: [],
      physicalWorldRating: 50,
      digitalWorldRating: 50,
      crossWorldTrustScore: 50,
      attestations: [],
    };
    
    this.identities.set(id, identity);
    
    this.emit("identity-created", { identity });
    return identity;
  }
  
  /**
   * Verify identity document
   */
  verifyIdentityDocument(
    identityId: string,
    documentIndex: number,
    verifier: string
  ): PhysicalIdentity {
    const identity = this.identities.get(identityId);
    if (!identity) throw new Error("Identity not found");
    
    if (documentIndex >= identity.documents.length) {
      throw new Error("Document not found");
    }
    
    identity.documents[documentIndex].verified = true;
    identity.documents[documentIndex].verifiedBy = verifier;
    
    // Upgrade verification level
    const verifiedDocs = identity.documents.filter(d => d.verified).length;
    if (verifiedDocs >= 3 && identity.biometrics.facialHash) {
      identity.verificationLevel = "full";
    } else if (verifiedDocs >= 2) {
      identity.verificationLevel = "enhanced";
    } else if (verifiedDocs >= 1) {
      identity.verificationLevel = "standard";
    }
    
    identity.verifiedAt = new Date();
    
    // Update trust score
    identity.crossWorldTrustScore = Math.min(100, identity.crossWorldTrustScore + 10);
    
    this.emit("identity-verified", { identity });
    return identity;
  }
  
  /**
   * Add attestation
   */
  addAttestation(
    identityId: string,
    claim: string,
    attester: string,
    attesterType: Attestation["attesterType"]
  ): PhysicalIdentity {
    const identity = this.identities.get(identityId);
    if (!identity) throw new Error("Identity not found");
    
    const attestation: Attestation = {
      id: `attest-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      claim,
      attester,
      attesterType,
      timestamp: new Date(),
      txHash: `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`,
      valid: true,
    };
    
    identity.attestations.push(attestation);
    
    // Update trust based on attester type
    const trustBonus = {
      government: 20,
      organization: 15,
      oracle: 10,
      individual: 5,
    };
    identity.crossWorldTrustScore = Math.min(100, 
      identity.crossWorldTrustScore + trustBonus[attesterType]);
    
    this.emit("attestation-added", { identity, attestation });
    return identity;
  }
  
  // ==========================================================================
  // Queries
  // ==========================================================================
  
  getAsset(assetId: string): PhysicalAsset | undefined {
    return this.assets.get(assetId);
  }
  
  getAssetsByOwner(owner: string): PhysicalAsset[] {
    const assetIds = this.assetsByOwner.get(owner);
    if (!assetIds) return [];
    return Array.from(assetIds).map(id => this.assets.get(id)!).filter(a => a);
  }
  
  getDevice(deviceId: string): IoTDevice | undefined {
    return this.devices.get(deviceId);
  }
  
  getDevicesByAsset(assetId: string): IoTDevice[] {
    const deviceIds = this.devicesByAsset.get(assetId);
    if (!deviceIds) return [];
    return Array.from(deviceIds).map(id => this.devices.get(id)!).filter(d => d);
  }
  
  getDigitalTwin(twinId: string): DigitalTwin | undefined {
    return this.digitalTwins.get(twinId);
  }
  
  getIdentity(identityId: string): PhysicalIdentity | undefined {
    return this.identities.get(identityId);
  }
  
  getStatistics(): {
    totalAssets: number;
    tokenizedAssets: number;
    fractionalizedAssets: number;
    totalDevices: number;
    onlineDevices: number;
    digitalTwins: number;
    totalEvents: number;
    processedEvents: number;
    identities: number;
    verifiedIdentities: number;
  } {
    let tokenizedAssets = 0;
    let fractionalizedAssets = 0;
    let onlineDevices = 0;
    let processedEvents = 0;
    let verifiedIdentities = 0;
    
    for (const asset of this.assets.values()) {
      if (asset.digital.tokenId) tokenizedAssets++;
      if (asset.ownership.fractionalized) fractionalizedAssets++;
    }
    
    for (const device of this.devices.values()) {
      if (device.connection.status === "online") onlineDevices++;
    }
    
    for (const event of this.events.values()) {
      if (event.processed) processedEvents++;
    }
    
    for (const identity of this.identities.values()) {
      if (identity.verificationLevel !== "basic") verifiedIdentities++;
    }
    
    return {
      totalAssets: this.assets.size,
      tokenizedAssets,
      fractionalizedAssets,
      totalDevices: this.devices.size,
      onlineDevices,
      digitalTwins: this.digitalTwins.size,
      totalEvents: this.events.size,
      processedEvents,
      identities: this.identities.size,
      verifiedIdentities,
    };
  }
}

// ============================================================================
// Exports
// ============================================================================

export const physicalDigitalBridge = PhysicalDigitalBridge.getInstance();

export { PhysicalDigitalBridge };
