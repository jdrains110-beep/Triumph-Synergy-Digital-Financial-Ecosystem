// Triumph Synergy Cloud Infrastructure Configuration
// Multi-cloud setup with GCP primary and AWS backup

export const cloudConfig = {
  // Primary: Google Cloud Platform
  gcp: {
    projectId: process.env.GCP_PROJECT_ID || 'triumph-synergy-prod',
    region: process.env.GCP_REGION || 'us-central1',
    
    // Compute & Kubernetes
    gke: {
      clusterName: 'triumph-synergy-cluster',
      nodeCount: 3,
      machineType: 'n2-standard-8',
      autoScaling: {
        minNodes: 3,
        maxNodes: 100
      }
    },
    
    // Cloud SQL (PostgreSQL)
    cloudSql: {
      instanceName: 'triumph-synergy-db',
      tier: 'db-n1-highmem-8',
      highAvailability: true,
      backupConfig: {
        enabled: true,
        startTime: '02:00',
        retentionDays: 30
      }
    },
    
    // Cloud Storage & CDN
    storage: {
      bucketName: 'triumph-synergy-assets',
      cdn: {
        enabled: true,
        cacheMode: 'CACHE_ALL_STATIC'
      }
    },
    
    // Cloud Functions for serverless
    functions: {
      runtime: 'nodejs20',
      memory: '2GB',
      timeout: 540
    },
    
    // BigQuery for data lake
    bigQuery: {
      datasetId: 'triumph_synergy_analytics',
      location: 'US',
      tables: {
        transactions: 'transactions',
        users: 'users',
        events: 'events',
        payments: 'payments'
      }
    },
    
    // Cloud Pub/Sub for event streaming
    pubsub: {
      topics: {
        payments: 'triumph-payments',
        transactions: 'triumph-transactions',
        userEvents: 'triumph-user-events',
        analytics: 'triumph-analytics'
      }
    },
    
    // Cloud Run for containerized services
    cloudRun: {
      services: ['api', 'payment-processor', 'analytics-engine'],
      concurrency: 1000,
      maxInstances: 100
    }
  },
  
  // Backup: Amazon Web Services
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    
    // EKS for Kubernetes
    eks: {
      clusterName: 'triumph-synergy-backup-cluster',
      nodeGroups: {
        general: {
          instanceTypes: ['m5.2xlarge'],
          minSize: 2,
          maxSize: 50,
          desiredSize: 3
        }
      }
    },
    
    // RDS PostgreSQL
    rds: {
      instanceClass: 'db.r5.2xlarge',
      multiAz: true,
      backupRetentionPeriod: 30,
      storageEncrypted: true
    },
    
    // S3 for object storage
    s3: {
      buckets: {
        assets: 'triumph-synergy-assets-backup',
        backups: 'triumph-synergy-backups',
        dataLake: 'triumph-synergy-datalake'
      },
      cloudFront: {
        enabled: true,
        priceClass: 'PriceClass_All'
      }
    },
    
    // ElastiCache Redis
    elasticache: {
      nodeType: 'cache.r5.2xlarge',
      numCacheNodes: 3,
      engineVersion: '7.0'
    },
    
    // Lambda for serverless
    lambda: {
      runtime: 'nodejs20.x',
      memory: 2048,
      timeout: 900
    }
  },
  
  // Disaster Recovery & Failover
  disasterRecovery: {
    enabled: true,
    rpo: 300, // Recovery Point Objective: 5 minutes
    rto: 900, // Recovery Time Objective: 15 minutes
    crossRegionReplication: true,
    autoFailover: true
  }
};

export const securityConfig = {
  // Identity & Access Management
  iam: {
    mfa: {
      enabled: true,
      required: true,
      methods: ['totp', 'sms', 'email', 'biometric']
    },
    
    roles: {
      admin: ['full_access'],
      developer: ['read', 'write', 'deploy'],
      support: ['read', 'customer_support'],
      analyst: ['read', 'analytics'],
      partner: ['read', 'api_access']
    },
    
    oauth2Providers: ['google', 'github', 'microsoft', 'apple'],
    
    sessionManagement: {
      maxDuration: 3600,
      idleTimeout: 900,
      concurrent: true,
      maxSessions: 5
    }
  },
  
  // Data encryption
  encryption: {
    atRest: {
      enabled: true,
      algorithm: 'AES-256-GCM',
      keyRotation: 90 // days
    },
    
    inTransit: {
      tlsVersion: '1.3',
      certificateProvider: 'lets-encrypt',
      hsts: true,
      hstsMaxAge: 31536000
    }
  },
  
  // Compliance & Privacy
  compliance: {
    standards: ['PCI-DSS', 'SOC2', 'GDPR', 'CCPA', 'HIPAA'],
    dataResidency: true,
    auditLogging: {
      enabled: true,
      retention: 2555, // 7 years
      tamperProof: true
    }
  },
  
  // DDoS & WAF protection
  protection: {
    ddos: {
      enabled: true,
      provider: 'cloudflare',
      rateLimit: {
        requests: 1000,
        window: 60
      }
    },
    
    waf: {
      enabled: true,
      rules: ['sql-injection', 'xss', 'csrf', 'bot-protection']
    }
  }
};

export default { cloudConfig, securityConfig };
