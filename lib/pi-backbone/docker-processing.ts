/**
 * Docker Processing Integration
 * 
 * Containerized task execution for complex computational problems:
 * - Container orchestration
 * - Task containerization
 * - Resource management
 * - Distributed processing
 * - Auto-scaling
 */

import { EventEmitter } from "events";
import { distributedNodes, type ComputeNode, type ComputeTask, type TaskType } from "./distributed-nodes";

// ============================================================================
// Types
// ============================================================================

export type ContainerStatus = 
  | "creating"
  | "running"
  | "paused"
  | "stopped"
  | "completed"
  | "failed"
  | "removed";

export type ImageCategory = 
  | "compute"       // General computation
  | "ml-training"   // Machine learning training
  | "ml-inference"  // ML inference
  | "data-science"  // Data processing
  | "rendering"     // 3D/Video rendering
  | "blockchain"    // Blockchain operations
  | "crypto"        // Cryptographic operations
  | "analytics"     // Data analytics
  | "custom";       // Custom user images

export interface DockerImage {
  id: string;
  name: string;
  tag: string;
  category: ImageCategory;
  description: string;
  size: number;              // MB
  layers: number;
  entrypoint: string[];
  cmd: string[];
  env: Record<string, string>;
  ports: number[];
  volumes: string[];
  requirements: ImageRequirements;
  verified: boolean;
  securityScan: SecurityScan;
  createdAt: Date;
  downloads: number;
}

export interface ImageRequirements {
  minCPU: number;            // Cores
  minRAM: number;            // GB
  minStorage: number;        // GB
  requiresGPU: boolean;
  gpuType?: "nvidia" | "amd" | "any";
  minGPUVRAM?: number;       // GB
  networkAccess: boolean;
  privileged: boolean;
}

export interface SecurityScan {
  status: "pending" | "passed" | "warning" | "failed";
  vulnerabilities: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  lastScanned: Date;
}

export interface Container {
  id: string;
  name: string;
  imageId: string;
  status: ContainerStatus;
  nodeId: string;
  
  // Resource allocation
  resources: ContainerResources;
  
  // Network
  network: ContainerNetwork;
  
  // Execution
  taskId?: string;
  command?: string[];
  workingDir: string;
  env: Record<string, string>;
  
  // Metrics
  metrics: ContainerMetrics;
  
  // Logs
  logs: ContainerLog[];
  
  createdAt: Date;
  startedAt?: Date;
  finishedAt?: Date;
  exitCode?: number;
}

export interface ContainerResources {
  cpuCores: number;
  cpuShares: number;
  memoryMB: number;
  memorySwapMB: number;
  storageMB: number;
  gpuAccess: boolean;
  gpuDevices?: string[];
}

export interface ContainerNetwork {
  networkMode: "bridge" | "host" | "none" | "overlay";
  ipAddress?: string;
  ports: PortMapping[];
  dns?: string[];
}

export interface PortMapping {
  containerPort: number;
  hostPort: number;
  protocol: "tcp" | "udp";
}

export interface ContainerMetrics {
  cpuUsagePercent: number;
  memoryUsageMB: number;
  memoryPercent: number;
  networkRxBytes: number;
  networkTxBytes: number;
  blockReadBytes: number;
  blockWriteBytes: number;
  pidsCount: number;
}

export interface ContainerLog {
  timestamp: Date;
  stream: "stdout" | "stderr";
  message: string;
}

export interface DockerJob {
  id: string;
  name: string;
  type: JobType;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  priority: "low" | "normal" | "high" | "critical";
  
  // Image and execution
  imageId: string;
  command: string[];
  env: Record<string, string>;
  volumes: VolumeMount[];
  
  // Resource requirements
  resources: ContainerResources;
  
  // Parallelization
  parallelism: number;       // Number of parallel containers
  containers: string[];      // Container IDs
  
  // Input/Output
  inputData?: string;
  outputData?: string;
  artifacts: JobArtifact[];
  
  // Scheduling
  schedule?: JobSchedule;
  
  // Progress
  progress: number;          // 0-100
  attempts: number;
  maxAttempts: number;
  
  // Rewards
  reward: number;
  tokenReward: number;
  
  submittedBy: string;
  submittedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export type JobType = 
  | "single"         // Single container job
  | "parallel"       // Multiple parallel containers
  | "map-reduce"     // Map-reduce style processing
  | "pipeline"       // Sequential pipeline
  | "dag";           // Directed acyclic graph

export interface VolumeMount {
  hostPath: string;
  containerPath: string;
  readOnly: boolean;
}

export interface JobArtifact {
  name: string;
  path: string;
  size: number;
  checksum: string;
  createdAt: Date;
}

export interface JobSchedule {
  type: "immediate" | "delayed" | "cron";
  delay?: number;            // ms
  cronExpression?: string;
  timezone?: string;
  maxRuns?: number;
  currentRuns: number;
}

export interface ContainerRegistry {
  id: string;
  name: string;
  url: string;
  type: "public" | "private";
  credentials?: {
    username: string;
    password: string;
  };
  images: string[];          // Image IDs
}

export interface ResourcePool {
  id: string;
  name: string;
  nodeIds: string[];
  
  // Aggregated resources
  totalCPU: number;
  totalRAM: number;          // GB
  totalStorage: number;      // GB
  totalGPUs: number;
  
  // Available resources
  availableCPU: number;
  availableRAM: number;
  availableStorage: number;
  availableGPUs: number;
  
  // Active containers
  activeContainers: string[];
  
  // Limits
  maxContainers: number;
  maxCPUPerContainer: number;
  maxRAMPerContainer: number;
}

// ============================================================================
// Docker Processing Manager
// ============================================================================

class DockerProcessingManager extends EventEmitter {
  private static instance: DockerProcessingManager;
  
  private images: Map<string, DockerImage> = new Map();
  private containers: Map<string, Container> = new Map();
  private jobs: Map<string, DockerJob> = new Map();
  private registries: Map<string, ContainerRegistry> = new Map();
  private resourcePools: Map<string, ResourcePool> = new Map();
  
  // Container tracking
  private containersByNode: Map<string, Set<string>> = new Map();
  private containersByJob: Map<string, Set<string>> = new Map();
  private containersByImage: Map<string, Set<string>> = new Map();
  
  // Job queues
  private jobQueues: {
    critical: string[];
    high: string[];
    normal: string[];
    low: string[];
  } = { critical: [], high: [], normal: [], low: [] };
  
  private constructor() {
    super();
    this.setMaxListeners(100);
    this.initializeDefaultImages();
  }
  
  static getInstance(): DockerProcessingManager {
    if (!DockerProcessingManager.instance) {
      DockerProcessingManager.instance = new DockerProcessingManager();
    }
    return DockerProcessingManager.instance;
  }
  
  private initializeDefaultImages(): void {
    // Pre-built optimized images
    const defaultImages: Omit<DockerImage, "id" | "createdAt" | "downloads">[] = [
      {
        name: "triumph-synergy/compute-base",
        tag: "latest",
        category: "compute",
        description: "Base image for general computation with Python, Node.js, and common libraries",
        size: 512,
        layers: 8,
        entrypoint: ["/bin/sh", "-c"],
        cmd: [],
        env: { NODE_ENV: "production", PYTHONUNBUFFERED: "1" },
        ports: [],
        volumes: ["/data", "/output"],
        requirements: {
          minCPU: 1,
          minRAM: 1,
          minStorage: 2,
          requiresGPU: false,
          networkAccess: true,
          privileged: false,
        },
        verified: true,
        securityScan: { status: "passed", vulnerabilities: { critical: 0, high: 0, medium: 0, low: 2 }, lastScanned: new Date() },
      },
      {
        name: "triumph-synergy/ml-gpu",
        tag: "latest",
        category: "ml-training",
        description: "GPU-accelerated machine learning with PyTorch, TensorFlow, and CUDA support",
        size: 4096,
        layers: 15,
        entrypoint: ["python3"],
        cmd: [],
        env: { CUDA_VISIBLE_DEVICES: "all", TF_CPP_MIN_LOG_LEVEL: "2" },
        ports: [6006],
        volumes: ["/data", "/models", "/output"],
        requirements: {
          minCPU: 4,
          minRAM: 16,
          minStorage: 20,
          requiresGPU: true,
          gpuType: "nvidia",
          minGPUVRAM: 8,
          networkAccess: true,
          privileged: false,
        },
        verified: true,
        securityScan: { status: "passed", vulnerabilities: { critical: 0, high: 0, medium: 1, low: 5 }, lastScanned: new Date() },
      },
      {
        name: "triumph-synergy/data-science",
        tag: "latest",
        category: "data-science",
        description: "Data science toolkit with Pandas, NumPy, Spark, and visualization libraries",
        size: 2048,
        layers: 12,
        entrypoint: ["python3"],
        cmd: [],
        env: { PYTHONPATH: "/app" },
        ports: [8888],
        volumes: ["/data", "/notebooks", "/output"],
        requirements: {
          minCPU: 2,
          minRAM: 8,
          minStorage: 10,
          requiresGPU: false,
          networkAccess: true,
          privileged: false,
        },
        verified: true,
        securityScan: { status: "passed", vulnerabilities: { critical: 0, high: 0, medium: 2, low: 3 }, lastScanned: new Date() },
      },
      {
        name: "triumph-synergy/blockchain-node",
        tag: "latest",
        category: "blockchain",
        description: "Blockchain operations including validation, indexing, and smart contract execution",
        size: 1024,
        layers: 10,
        entrypoint: ["/entrypoint.sh"],
        cmd: [],
        env: { NETWORK: "pi-mainnet" },
        ports: [8545, 30303],
        volumes: ["/data", "/keystore"],
        requirements: {
          minCPU: 4,
          minRAM: 8,
          minStorage: 100,
          requiresGPU: false,
          networkAccess: true,
          privileged: false,
        },
        verified: true,
        securityScan: { status: "passed", vulnerabilities: { critical: 0, high: 0, medium: 0, low: 1 }, lastScanned: new Date() },
      },
      {
        name: "triumph-synergy/rendering",
        tag: "latest",
        category: "rendering",
        description: "3D rendering with Blender, FFmpeg, and GPU acceleration",
        size: 3072,
        layers: 14,
        entrypoint: ["blender", "-b"],
        cmd: [],
        env: {},
        ports: [],
        volumes: ["/projects", "/output"],
        requirements: {
          minCPU: 8,
          minRAM: 32,
          minStorage: 50,
          requiresGPU: true,
          gpuType: "any",
          minGPUVRAM: 8,
          networkAccess: false,
          privileged: false,
        },
        verified: true,
        securityScan: { status: "passed", vulnerabilities: { critical: 0, high: 0, medium: 0, low: 0 }, lastScanned: new Date() },
      },
      {
        name: "triumph-synergy/crypto-ops",
        tag: "latest",
        category: "crypto",
        description: "Cryptographic operations including hashing, signing, and zero-knowledge proofs",
        size: 256,
        layers: 6,
        entrypoint: ["/crypto-engine"],
        cmd: [],
        env: { SECURITY_LEVEL: "high" },
        ports: [],
        volumes: ["/keys", "/output"],
        requirements: {
          minCPU: 2,
          minRAM: 4,
          minStorage: 1,
          requiresGPU: false,
          networkAccess: false,
          privileged: false,
        },
        verified: true,
        securityScan: { status: "passed", vulnerabilities: { critical: 0, high: 0, medium: 0, low: 0 }, lastScanned: new Date() },
      },
      {
        name: "triumph-synergy/analytics",
        tag: "latest",
        category: "analytics",
        description: "Real-time analytics with Apache Kafka, Flink, and time-series databases",
        size: 1536,
        layers: 11,
        entrypoint: ["/analytics-engine"],
        cmd: [],
        env: { KAFKA_BROKERS: "localhost:9092" },
        ports: [9092, 8081],
        volumes: ["/data", "/config"],
        requirements: {
          minCPU: 4,
          minRAM: 16,
          minStorage: 50,
          requiresGPU: false,
          networkAccess: true,
          privileged: false,
        },
        verified: true,
        securityScan: { status: "passed", vulnerabilities: { critical: 0, high: 0, medium: 1, low: 2 }, lastScanned: new Date() },
      },
    ];
    
    for (const imageData of defaultImages) {
      const id = `img-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const image: DockerImage = {
        id,
        ...imageData,
        createdAt: new Date(),
        downloads: 0,
      };
      this.images.set(id, image);
    }
  }
  
  // ==========================================================================
  // Image Management
  // ==========================================================================
  
  /**
   * Register a custom Docker image
   */
  registerImage(params: {
    name: string;
    tag: string;
    category: ImageCategory;
    description: string;
    size: number;
    layers: number;
    entrypoint: string[];
    cmd?: string[];
    env?: Record<string, string>;
    ports?: number[];
    volumes?: string[];
    requirements: ImageRequirements;
  }): DockerImage {
    const id = `img-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    const image: DockerImage = {
      id,
      name: params.name,
      tag: params.tag,
      category: params.category,
      description: params.description,
      size: params.size,
      layers: params.layers,
      entrypoint: params.entrypoint,
      cmd: params.cmd || [],
      env: params.env || {},
      ports: params.ports || [],
      volumes: params.volumes || [],
      requirements: params.requirements,
      verified: false,
      securityScan: {
        status: "pending",
        vulnerabilities: { critical: 0, high: 0, medium: 0, low: 0 },
        lastScanned: new Date(),
      },
      createdAt: new Date(),
      downloads: 0,
    };
    
    this.images.set(id, image);
    this.containersByImage.set(id, new Set());
    
    this.emit("image-registered", { image });
    return image;
  }
  
  /**
   * Scan image for vulnerabilities
   */
  scanImage(imageId: string): SecurityScan {
    const image = this.images.get(imageId);
    if (!image) throw new Error("Image not found");
    
    // Simulate security scan
    const scan: SecurityScan = {
      status: "passed",
      vulnerabilities: {
        critical: Math.floor(Math.random() * 2),
        high: Math.floor(Math.random() * 3),
        medium: Math.floor(Math.random() * 5),
        low: Math.floor(Math.random() * 10),
      },
      lastScanned: new Date(),
    };
    
    if (scan.vulnerabilities.critical > 0) {
      scan.status = "failed";
    } else if (scan.vulnerabilities.high > 0) {
      scan.status = "warning";
    }
    
    image.securityScan = scan;
    this.emit("image-scanned", { imageId, scan });
    return scan;
  }
  
  /**
   * Get image by category
   */
  getImagesByCategory(category: ImageCategory): DockerImage[] {
    return Array.from(this.images.values()).filter(img => img.category === category);
  }
  
  // ==========================================================================
  // Container Management
  // ==========================================================================
  
  /**
   * Create a container
   */
  createContainer(params: {
    name: string;
    imageId: string;
    nodeId: string;
    resources: ContainerResources;
    command?: string[];
    env?: Record<string, string>;
    volumes?: VolumeMount[];
    network?: Partial<ContainerNetwork>;
    taskId?: string;
  }): Container {
    const image = this.images.get(params.imageId);
    if (!image) throw new Error("Image not found");
    
    const node = distributedNodes.getNode(params.nodeId);
    if (!node) throw new Error("Node not found");
    
    // Validate resources
    this.validateResources(params.resources, params.nodeId);
    
    const id = `container-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    const container: Container = {
      id,
      name: params.name,
      imageId: params.imageId,
      status: "creating",
      nodeId: params.nodeId,
      resources: params.resources,
      network: {
        networkMode: params.network?.networkMode || "bridge",
        ipAddress: this.assignIP(),
        ports: params.network?.ports || [],
        dns: params.network?.dns,
      },
      taskId: params.taskId,
      command: params.command || image.cmd,
      workingDir: "/app",
      env: { ...image.env, ...params.env },
      metrics: {
        cpuUsagePercent: 0,
        memoryUsageMB: 0,
        memoryPercent: 0,
        networkRxBytes: 0,
        networkTxBytes: 0,
        blockReadBytes: 0,
        blockWriteBytes: 0,
        pidsCount: 1,
      },
      logs: [],
      createdAt: new Date(),
    };
    
    this.containers.set(id, container);
    
    // Index by node
    if (!this.containersByNode.has(params.nodeId)) {
      this.containersByNode.set(params.nodeId, new Set());
    }
    this.containersByNode.get(params.nodeId)!.add(id);
    
    // Index by image
    this.containersByImage.get(params.imageId)?.add(id);
    
    // Update image downloads
    image.downloads++;
    
    this.emit("container-created", { container });
    return container;
  }
  
  private validateResources(resources: ContainerResources, nodeId: string): void {
    const node = distributedNodes.getNode(nodeId);
    if (!node) throw new Error("Node not found");
    
    if (resources.cpuCores > node.specs.cpuCores) {
      throw new Error("Insufficient CPU cores on node");
    }
    if (resources.memoryMB / 1024 > node.performance.availableRAM) {
      throw new Error("Insufficient RAM on node");
    }
    if (resources.storageMB / 1024 > node.performance.availableStorage) {
      throw new Error("Insufficient storage on node");
    }
    if (resources.gpuAccess && !node.specs.gpuModel) {
      throw new Error("Node does not have GPU");
    }
  }
  
  private assignIP(): string {
    return `172.17.0.${Math.floor(Math.random() * 254) + 2}`;
  }
  
  /**
   * Start a container
   */
  startContainer(containerId: string): Container {
    const container = this.containers.get(containerId);
    if (!container) throw new Error("Container not found");
    
    if (container.status !== "creating" && container.status !== "stopped") {
      throw new Error(`Cannot start container in ${container.status} state`);
    }
    
    container.status = "running";
    container.startedAt = new Date();
    
    this.addLog(containerId, "stdout", "Container started");
    this.emit("container-started", { container });
    return container;
  }
  
  /**
   * Stop a container
   */
  stopContainer(containerId: string): Container {
    const container = this.containers.get(containerId);
    if (!container) throw new Error("Container not found");
    
    if (container.status !== "running" && container.status !== "paused") {
      throw new Error(`Cannot stop container in ${container.status} state`);
    }
    
    container.status = "stopped";
    container.finishedAt = new Date();
    container.exitCode = 0;
    
    this.addLog(containerId, "stdout", "Container stopped");
    this.emit("container-stopped", { container });
    return container;
  }
  
  /**
   * Pause a container
   */
  pauseContainer(containerId: string): Container {
    const container = this.containers.get(containerId);
    if (!container) throw new Error("Container not found");
    
    if (container.status !== "running") {
      throw new Error("Can only pause running containers");
    }
    
    container.status = "paused";
    this.addLog(containerId, "stdout", "Container paused");
    this.emit("container-paused", { container });
    return container;
  }
  
  /**
   * Resume a paused container
   */
  resumeContainer(containerId: string): Container {
    const container = this.containers.get(containerId);
    if (!container) throw new Error("Container not found");
    
    if (container.status !== "paused") {
      throw new Error("Can only resume paused containers");
    }
    
    container.status = "running";
    this.addLog(containerId, "stdout", "Container resumed");
    this.emit("container-resumed", { container });
    return container;
  }
  
  /**
   * Remove a container
   */
  removeContainer(containerId: string): void {
    const container = this.containers.get(containerId);
    if (!container) throw new Error("Container not found");
    
    if (container.status === "running") {
      throw new Error("Stop the container before removing");
    }
    
    // Clean up indexes
    this.containersByNode.get(container.nodeId)?.delete(containerId);
    this.containersByImage.get(container.imageId)?.delete(containerId);
    if (container.taskId) {
      this.containersByJob.get(container.taskId)?.delete(containerId);
    }
    
    this.containers.delete(containerId);
    this.emit("container-removed", { containerId });
  }
  
  /**
   * Execute command in running container
   */
  execInContainer(containerId: string, command: string[]): string {
    const container = this.containers.get(containerId);
    if (!container) throw new Error("Container not found");
    
    if (container.status !== "running") {
      throw new Error("Container is not running");
    }
    
    // Simulate command execution
    const output = `Executed: ${command.join(" ")}`;
    this.addLog(containerId, "stdout", output);
    
    this.emit("container-exec", { containerId, command, output });
    return output;
  }
  
  /**
   * Update container metrics
   */
  updateContainerMetrics(containerId: string, metrics: Partial<ContainerMetrics>): Container {
    const container = this.containers.get(containerId);
    if (!container) throw new Error("Container not found");
    
    container.metrics = { ...container.metrics, ...metrics };
    return container;
  }
  
  private addLog(containerId: string, stream: "stdout" | "stderr", message: string): void {
    const container = this.containers.get(containerId);
    if (container) {
      container.logs.push({
        timestamp: new Date(),
        stream,
        message,
      });
      
      // Keep last 1000 logs
      if (container.logs.length > 1000) {
        container.logs = container.logs.slice(-1000);
      }
    }
  }
  
  // ==========================================================================
  // Job Management
  // ==========================================================================
  
  /**
   * Submit a Docker job
   */
  submitJob(params: {
    name: string;
    type: JobType;
    priority?: DockerJob["priority"];
    imageId: string;
    command: string[];
    env?: Record<string, string>;
    volumes?: VolumeMount[];
    resources: ContainerResources;
    parallelism?: number;
    inputData?: string;
    schedule?: JobSchedule;
    reward: number;
    tokenReward?: number;
    submittedBy: string;
    maxAttempts?: number;
  }): DockerJob {
    const image = this.images.get(params.imageId);
    if (!image) throw new Error("Image not found");
    
    const id = `job-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    const job: DockerJob = {
      id,
      name: params.name,
      type: params.type,
      status: "pending",
      priority: params.priority || "normal",
      imageId: params.imageId,
      command: params.command,
      env: params.env || {},
      volumes: params.volumes || [],
      resources: params.resources,
      parallelism: params.parallelism || 1,
      containers: [],
      inputData: params.inputData,
      artifacts: [],
      schedule: params.schedule,
      progress: 0,
      attempts: 0,
      maxAttempts: params.maxAttempts || 3,
      reward: params.reward,
      tokenReward: params.tokenReward || 0,
      submittedBy: params.submittedBy,
      submittedAt: new Date(),
    };
    
    this.jobs.set(id, job);
    this.jobQueues[job.priority].push(id);
    this.containersByJob.set(id, new Set());
    
    // Auto-start if immediate
    if (!params.schedule || params.schedule.type === "immediate") {
      this.startJob(id);
    }
    
    this.emit("job-submitted", { job });
    return job;
  }
  
  /**
   * Start a pending job
   */
  startJob(jobId: string): DockerJob {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error("Job not found");
    
    if (job.status !== "pending") {
      throw new Error(`Cannot start job in ${job.status} state`);
    }
    
    job.status = "running";
    job.startedAt = new Date();
    job.attempts++;
    
    // Find suitable nodes and create containers
    const nodes = this.findSuitableNodes(job);
    if (nodes.length === 0) {
      job.status = "pending";
      this.emit("job-waiting", { jobId, reason: "No suitable nodes available" });
      return job;
    }
    
    // Create containers based on job type
    switch (job.type) {
      case "single":
        this.createJobContainers(job, nodes, 1);
        break;
      case "parallel":
        this.createJobContainers(job, nodes, job.parallelism);
        break;
      case "map-reduce":
        this.createMapReduceContainers(job, nodes);
        break;
      case "pipeline":
        this.createPipelineContainers(job, nodes);
        break;
      case "dag":
        this.createDAGContainers(job, nodes);
        break;
    }
    
    this.emit("job-started", { job });
    return job;
  }
  
  private findSuitableNodes(job: DockerJob): ComputeNode[] {
    const stats = distributedNodes.getNetworkStats();
    const allNodes: ComputeNode[] = [];
    
    // Get all online nodes with required capabilities
    for (let i = 0; i < stats.totalNodes; i++) {
      // Would normally iterate through actual nodes
    }
    
    // For now, return capability-based nodes
    const computeNodes = distributedNodes.getNodesByCapability("compute");
    
    return computeNodes.filter(node => {
      if (node.status !== "online") return false;
      if (node.specs.cpuCores < job.resources.cpuCores) return false;
      if (node.performance.availableRAM * 1024 < job.resources.memoryMB) return false;
      if (job.resources.gpuAccess && !node.specs.gpuModel) return false;
      return true;
    });
  }
  
  private createJobContainers(job: DockerJob, nodes: ComputeNode[], count: number): void {
    const nodeIndex = 0;
    for (let i = 0; i < count; i++) {
      const node = nodes[i % nodes.length];
      
      const container = this.createContainer({
        name: `${job.name}-${i}`,
        imageId: job.imageId,
        nodeId: node.id,
        resources: job.resources,
        command: job.command,
        env: { ...job.env, TASK_INDEX: String(i), TASK_COUNT: String(count) },
        volumes: job.volumes,
        taskId: job.id,
      });
      
      job.containers.push(container.id);
      this.containersByJob.get(job.id)!.add(container.id);
      
      this.startContainer(container.id);
    }
  }
  
  private createMapReduceContainers(job: DockerJob, nodes: ComputeNode[]): void {
    // Map phase
    const mappers = Math.min(job.parallelism, nodes.length);
    for (let i = 0; i < mappers; i++) {
      const node = nodes[i];
      const container = this.createContainer({
        name: `${job.name}-mapper-${i}`,
        imageId: job.imageId,
        nodeId: node.id,
        resources: job.resources,
        command: [...job.command, "--phase=map", `--partition=${i}`],
        env: { ...job.env, PHASE: "map", PARTITION: String(i) },
        taskId: job.id,
      });
      
      job.containers.push(container.id);
      this.startContainer(container.id);
    }
    
    // Reducer will be created after mappers complete
    this.emit("map-phase-started", { jobId: job.id, mappers });
  }
  
  private createPipelineContainers(job: DockerJob, nodes: ComputeNode[]): void {
    // Sequential pipeline - create first stage
    const node = nodes[0];
    const container = this.createContainer({
      name: `${job.name}-stage-0`,
      imageId: job.imageId,
      nodeId: node.id,
      resources: job.resources,
      command: [...job.command, "--stage=0"],
      env: { ...job.env, STAGE: "0", TOTAL_STAGES: String(job.parallelism) },
      taskId: job.id,
    });
    
    job.containers.push(container.id);
    this.startContainer(container.id);
    
    this.emit("pipeline-stage-started", { jobId: job.id, stage: 0 });
  }
  
  private createDAGContainers(job: DockerJob, nodes: ComputeNode[]): void {
    // DAG execution - start with root nodes (no dependencies)
    // For simplicity, treating as parallel for now
    this.createJobContainers(job, nodes, job.parallelism);
  }
  
  /**
   * Update job progress
   */
  updateJobProgress(jobId: string, progress: number): DockerJob {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error("Job not found");
    
    job.progress = Math.min(100, Math.max(0, progress));
    this.emit("job-progress", { jobId, progress: job.progress });
    return job;
  }
  
  /**
   * Complete a job
   */
  completeJob(jobId: string, outputData?: string): DockerJob {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error("Job not found");
    
    job.status = "completed";
    job.progress = 100;
    job.outputData = outputData;
    job.completedAt = new Date();
    
    // Stop and cleanup containers
    for (const containerId of job.containers) {
      const container = this.containers.get(containerId);
      if (container && container.status === "running") {
        this.stopContainer(containerId);
      }
    }
    
    // Remove from queue
    this.removeFromQueue(jobId, job.priority);
    
    // Create distributed compute task for rewards
    distributedNodes.completeTask(jobId, outputData || "Job completed");
    
    this.emit("job-completed", { job });
    return job;
  }
  
  /**
   * Fail a job
   */
  failJob(jobId: string, error: string): DockerJob {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error("Job not found");
    
    // Stop containers
    for (const containerId of job.containers) {
      const container = this.containers.get(containerId);
      if (container && container.status === "running") {
        this.stopContainer(containerId);
      }
    }
    
    if (job.attempts < job.maxAttempts) {
      // Retry
      job.status = "pending";
      job.containers = [];
      this.emit("job-retrying", { jobId, attempt: job.attempts });
      this.startJob(jobId);
    } else {
      // Final failure
      job.status = "failed";
      job.completedAt = new Date();
      this.removeFromQueue(jobId, job.priority);
      this.emit("job-failed", { job, error });
    }
    
    return job;
  }
  
  /**
   * Cancel a job
   */
  cancelJob(jobId: string): DockerJob {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error("Job not found");
    
    job.status = "cancelled";
    job.completedAt = new Date();
    
    // Stop and remove containers
    for (const containerId of job.containers) {
      const container = this.containers.get(containerId);
      if (container) {
        if (container.status === "running") {
          this.stopContainer(containerId);
        }
      }
    }
    
    this.removeFromQueue(jobId, job.priority);
    this.emit("job-cancelled", { job });
    return job;
  }
  
  private removeFromQueue(jobId: string, priority: DockerJob["priority"]): void {
    const queue = this.jobQueues[priority];
    const index = queue.indexOf(jobId);
    if (index > -1) {
      queue.splice(index, 1);
    }
  }
  
  // ==========================================================================
  // Resource Pool Management
  // ==========================================================================
  
  /**
   * Create a resource pool
   */
  createResourcePool(params: {
    name: string;
    nodeIds: string[];
    maxContainers?: number;
    maxCPUPerContainer?: number;
    maxRAMPerContainer?: number;
  }): ResourcePool {
    const id = `pool-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    let totalCPU = 0;
    let totalRAM = 0;
    let totalStorage = 0;
    let totalGPUs = 0;
    
    for (const nodeId of params.nodeIds) {
      const node = distributedNodes.getNode(nodeId);
      if (node) {
        totalCPU += node.specs.cpuCores;
        totalRAM += node.specs.ramGB;
        totalStorage += node.specs.storageGB;
        if (node.specs.gpuModel) totalGPUs++;
      }
    }
    
    const pool: ResourcePool = {
      id,
      name: params.name,
      nodeIds: params.nodeIds,
      totalCPU,
      totalRAM,
      totalStorage,
      totalGPUs,
      availableCPU: totalCPU,
      availableRAM: totalRAM,
      availableStorage: totalStorage,
      availableGPUs: totalGPUs,
      activeContainers: [],
      maxContainers: params.maxContainers || 100,
      maxCPUPerContainer: params.maxCPUPerContainer || 16,
      maxRAMPerContainer: params.maxRAMPerContainer || 64,
    };
    
    this.resourcePools.set(id, pool);
    this.emit("pool-created", { pool });
    return pool;
  }
  
  // ==========================================================================
  // Queries
  // ==========================================================================
  
  getImage(imageId: string): DockerImage | undefined {
    return this.images.get(imageId);
  }
  
  getAllImages(): DockerImage[] {
    return Array.from(this.images.values());
  }
  
  getContainer(containerId: string): Container | undefined {
    return this.containers.get(containerId);
  }
  
  getContainerLogs(containerId: string, tail?: number): ContainerLog[] {
    const container = this.containers.get(containerId);
    if (!container) return [];
    
    return tail ? container.logs.slice(-tail) : container.logs;
  }
  
  getJob(jobId: string): DockerJob | undefined {
    return this.jobs.get(jobId);
  }
  
  getNodeContainers(nodeId: string): Container[] {
    const containerIds = this.containersByNode.get(nodeId);
    if (!containerIds) return [];
    
    return Array.from(containerIds)
      .map(id => this.containers.get(id)!)
      .filter(c => c);
  }
  
  getJobContainers(jobId: string): Container[] {
    const containerIds = this.containersByJob.get(jobId);
    if (!containerIds) return [];
    
    return Array.from(containerIds)
      .map(id => this.containers.get(id)!)
      .filter(c => c);
  }
  
  getStatistics(): {
    totalImages: number;
    totalContainers: number;
    runningContainers: number;
    totalJobs: number;
    runningJobs: number;
    completedJobs: number;
    failedJobs: number;
    totalResourcePools: number;
  } {
    let runningContainers = 0;
    let runningJobs = 0;
    let completedJobs = 0;
    let failedJobs = 0;
    
    for (const container of this.containers.values()) {
      if (container.status === "running") runningContainers++;
    }
    
    for (const job of this.jobs.values()) {
      switch (job.status) {
        case "running":
          runningJobs++;
          break;
        case "completed":
          completedJobs++;
          break;
        case "failed":
          failedJobs++;
          break;
      }
    }
    
    return {
      totalImages: this.images.size,
      totalContainers: this.containers.size,
      runningContainers,
      totalJobs: this.jobs.size,
      runningJobs,
      completedJobs,
      failedJobs,
      totalResourcePools: this.resourcePools.size,
    };
  }
}

// ============================================================================
// Exports
// ============================================================================

export const dockerProcessing = DockerProcessingManager.getInstance();

export { DockerProcessingManager };
