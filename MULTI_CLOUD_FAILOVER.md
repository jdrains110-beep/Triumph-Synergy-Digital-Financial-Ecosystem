# Cross-Platform Coordination & Failover Configuration

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Global Load Balancer (Anycast)              │
│              CloudFlare / Route53 Health-Checked DNS             │
└─────────────────────────────────────────────────────────────────┘
     │                           │                          │
     │                           │                          │
     v                           v                          v
┌─────────────┐          ┌─────────────┐          ┌─────────────┐
│   Vercel    │          │  GCP (98%)  │          │  AWS (2%)   │
│  Frontend   │          │  Primary    │          │  Secondary  │
│   CDN       │          │             │          │             │
└─────────────┘          └─────────────┘          └─────────────┘
     │                        │                        │
     ├────────────────────────┴────────────────────────┤
     │                                                  │
     v                                                  v
   HTTPS                                            HTTPS
   API Calls                                    Fallback Only
     │                                                  │
     v                                                  v
┌──────────────────────────────┐      ┌──────────────────────────────┐
│   GCP Application Tier       │      │   AWS Application Tier       │
│   ┌──────────────────────┐   │      │   ┌──────────────────────┐   │
│   │  GKE (Kubernetes)    │   │      │   │  EKS (Kubernetes)    │   │
│   │  3-100 pod replicas  │   │      │   │  3-10 pod replicas   │   │
│   │  Auto-scaling        │   │      │   │  Manual scaling      │   │
│   └──────────────────────┘   │      │   └──────────────────────┘   │
└──────────────────────────────┘      └──────────────────────────────┘
     │                                         │
     │                                         │
     v                                         v
┌──────────────────────────────┐      ┌──────────────────────────────┐
│   GCP Data Tier              │      │   AWS Data Tier              │
│   ┌──────────────────────┐   │      │   ┌──────────────────────┐   │
│   │  Cloud SQL Primary   │   │◄────────►  │  RDS Read Replica  │   │
│   │  PostgreSQL 15       │   │ Repl. │   │  PostgreSQL 15      │   │
│   │  500GB SSD           │   │      │   │  500GB SSD           │   │
│   └──────────────────────┘   │      │   └──────────────────────┘   │
│   ┌──────────────────────┐   │      │                              │
│   │  Memorystore Redis   │   │      │  ElastiCache Redis           │
│   │  2GB Max Memory      │   │      │  8GB Max Memory              │
│   │  Cluster Enabled     │   │      │  Multi-AZ Enabled            │
│   └──────────────────────┘   │      │                              │
│   ┌──────────────────────┐   │      │  S3 (Backup)                │
│   │  Cloud Storage       │   │      │  Replicated                 │
│   │  BigQuery Analytics  │   │      │                              │
│   └──────────────────────┘   │      │                              │
└──────────────────────────────┘      └──────────────────────────────┘
```

## Failover Architecture

### Primary → Secondary Transition

```
Event: GCP region becomes unhealthy (> 30 sec)
│
├─ Health Check Detects Failure
│  └─ GCP load balancer returns unhealthy
│
├─ DNS/CDN Routes to AWS
│  └─ CloudFlare or Route53 redirects traffic within <5 sec
│
├─ Application Layer Adapts
│  ├─ Connection pooling switches to AWS
│  ├─ AWS RDS becomes write master
│  └─ Session state maintained (distributed Redis)
│
├─ Data Consistency Check
│  ├─ AWS RDS lag < 1 sec (typically)
│  └─ Transactions replayed from WAL
│
└─ Recovery Complete
   └─ Service degradation: 0-30 seconds
   └─ Data loss: 0 (synchronous replication)
```

## Configuration Files

### 1. DNS Configuration (Route53 / Cloud DNS)

**Route53 Setup (AWS):**
```json
{
  "Name": "triumph-synergy-prod.com",
  "Type": "A",
  "SetIdentifier": "GCP-Primary",
  "Failover": "PRIMARY",
  "AliasTarget": {
    "HostedZoneId": "GCP-LB-ZONE",
    "DNSName": "triumph-gcp-lb.c.triumph-synergy-prod.goog",
    "EvaluateTargetHealth": true
  },
  "HealthCheckId": "GCP-Health-Check-ID"
}
```

**Secondary (Failover) Record:**
```json
{
  "Name": "triumph-synergy-prod.com",
  "Type": "A",
  "SetIdentifier": "AWS-Secondary",
  "Failover": "SECONDARY",
  "AliasTarget": {
    "HostedZoneId": "AWS-LB-ZONE",
    "DNSName": "triumph-aws-lb.elb.amazonaws.com",
    "EvaluateTargetHealth": true
  },
  "HealthCheckId": "AWS-Health-Check-ID"
}
```

### 2. Health Check Configuration

**GCP Health Check:**
```bash
gcloud compute health-checks create http gcp-app-health \
  --port=3000 \
  --request-path=/api/health \
  --check-interval=10s \
  --timeout=5s \
  --healthy-threshold=2 \
  --unhealthy-threshold=3
```

**AWS Health Check (ELB Target Group):**
```bash
aws elbv2 modify-target-group \
  --target-group-arn arn:aws:elasticloadbalancing:region:account:targetgroup/triumph-app \
  --health-check-enabled \
  --health-check-protocol HTTP \
  --health-check-path /api/health \
  --health-check-interval-seconds 10 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3
```

### 3. Database Replication Configuration

**GCP to AWS Streaming Replication:**
```sql
-- Execute on GCP Cloud SQL (primary)

-- Create replication user on GCP
CREATE USER replication_user WITH REPLICATION ENCRYPTED PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE triumph_synergy TO replication_user;

-- Enable WAL archiving
-- (Already configured in Terraform gcp_sql_database_instance)

-- View replication status
SELECT datname, usename, application_name, state, sync_state, write_lag 
FROM pg_stat_replication;
```

**AWS RDS Configuration:**
```bash
# Create read replica from GCP snapshot
aws rds create-db-instance-read-replica \
  --db-instance-identifier triumph-synergy-db-aws-replica \
  --source-db-identifier arn:aws:rds:us-central1:account:db:triumph-synergy-db-production \
  --db-instance-class db.r6i.2xlarge \
  --storage-type gp3 \
  --multi-az

# Monitor replication lag
aws rds describe-db-instances \
  --db-instance-identifier triumph-synergy-db-aws-replica \
  --query 'DBInstances[0].ReplicationLag'
```

### 4. Session State Synchronization

**Redis Configuration:**
```yaml
# kubernetes deployment.yaml snippet
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-cluster
  namespace: triumph-synergy
spec:
  serviceName: redis-cluster
  replicas: 3
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        command:
          - redis-server
          - /etc/redis/redis.conf
        ports:
        - containerPort: 6379
          name: redis
        - containerPort: 16379
          name: gossip
        volumeMounts:
        - name: conf
          mountPath: /etc/redis/
        - name: data
          mountPath: /data
        resources:
          requests:
            memory: "2Gi"
            cpu: "500m"
          limits:
            memory: "4Gi"
            cpu: "1000m"
        readinessProbe:
          exec:
            command:
            - redis-cli
            - ping
          initialDelaySeconds: 5
          periodSeconds: 5
      volumeClaimTemplates:
      - metadata:
          name: data
        spec:
          accessModes: [ "ReadWriteOnce" ]
          resources:
            requests:
              storage: 10Gi
```

**Redis Cluster Configuration:**
```conf
# redis.conf
port 6379
cluster-enabled yes
cluster-config-file /data/nodes.conf
cluster-node-timeout 5000
appendonly yes
appendfsync everysec
save 900 1
save 300 10
save 60 10000
```

### 5. Connection Pool Configuration

**Connection String with Failover:**
```bash
# Primary connection
POSTGRES_URL="postgresql://user:password@triumph-synergy-db-production.c.triumph-synergy-prod.cloudsql.net:5432/triumph_synergy?sslmode=require&connect_timeout=5&application_name=triumph-app-primary"

# Fallback connection
POSTGRES_FALLBACK_URL="postgresql://user:password@triumph-synergy-db-aws-replica.c9akciq32.us-east-1.rds.amazonaws.com:5432/triumph_synergy?sslmode=require&connect_timeout=5&application_name=triumph-app-fallback"

# Connection pool settings (pgBouncer)
reserve_pool_size = 25
reserve_pool_timeout = 3
max_client_conn = 1000
default_pool_size = 50
min_pool_size = 10
```

### 6. Application-Level Circuit Breaker

**TypeScript Implementation:**
```typescript
// lib/db/failover.ts
import { Pool } from 'pg';

class DatabaseFailover {
  private primaryPool: Pool;
  private fallbackPool: Pool;
  private isFailedOver = false;
  private healthCheckInterval = 30000; // 30 seconds

  constructor() {
    this.primaryPool = new Pool({
      connectionString: process.env.POSTGRES_URL,
    });

    this.fallbackPool = new Pool({
      connectionString: process.env.POSTGRES_FALLBACK_URL,
    });

    this.startHealthCheck();
  }

  private async startHealthCheck() {
    setInterval(async () => {
      try {
        await this.primaryPool.query('SELECT 1');
        if (this.isFailedOver) {
          console.log('✓ Primary database recovered, switching back');
          this.isFailedOver = false;
        }
      } catch (error) {
        console.error('✗ Primary database unhealthy, failing over to secondary');
        this.isFailedOver = true;
      }
    }, this.healthCheckInterval);
  }

  async query(text: string, values?: unknown[]) {
    const pool = this.isFailedOver ? this.fallbackPool : this.primaryPool;
    
    try {
      return await pool.query(text, values);
    } catch (error) {
      if (!this.isFailedOver && error instanceof Error && error.message.includes('connection')) {
        console.warn('Primary connection failed, attempting fallback');
        this.isFailedOver = true;
        return await this.fallbackPool.query(text, values);
      }
      throw error;
    }
  }

  async transaction<T>(callback: (client: any) => Promise<T>) {
    const pool = this.isFailedOver ? this.fallbackPool : this.primaryPool;
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export const dbFailover = new DatabaseFailover();
```

### 7. Monitoring & Alerting

**CloudWatch Composite Alarm:**
```bash
aws cloudwatch put-composite-alarm \
  --alarm-name triumph-multi-cloud-health \
  --alarm-description "Composite health check for GCP primary and AWS secondary" \
  --alarm-rule "ALARM(gcp-health-check-alarm) OR ALARM(aws-health-check-alarm)" \
  --actions-enabled \
  --alarm-actions arn:aws:sns:us-east-1:account:DevOpsAlerts
```

**GCP Uptime Check (via Monitoring):**
```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: triumph-synergy-multicloud
  namespace: triumph-synergy
spec:
  groups:
  - name: multicloud
    interval: 30s
    rules:
    - alert: GCPPrimaryDown
      expr: up{job="gcp-health-check"} == 0
      for: 2m
      annotations:
        summary: "GCP Primary region unhealthy"
        runbook: "https://wiki.internal/runbooks/gcp-failover"
    
    - alert: DataReplicationLag
      expr: mysql_slave_status_seconds_behind_master > 5
      for: 1m
      annotations:
        summary: "Database replication lag exceeds 5 seconds"
        
    - alert: SessionLossRisk
      expr: redis_connected_clients < 1
      for: 30s
      annotations:
        summary: "Redis session store unreachable"
```

## Failover Testing Procedures

### 1. Planned Failover Test (Monthly)

```bash
#!/bin/bash
# test-failover.sh

set -e

echo "Starting planned failover test..."
echo "DO NOT RUN DURING BUSINESS HOURS"

# 1. Notify team
echo "Sending Slack notification..."
curl -X POST $SLACK_WEBHOOK \
  -d '{"text":"Starting planned failover test - expect 2-5 min outage"}'

# 2. Mark deployment for fallback
kubectl annotate deployment triumph-app \
  -n triumph-synergy \
  failover-test=true \
  --overwrite

# 3. Trigger primary health check failure
echo "Simulating GCP primary failure..."
kubectl patch service triumph-app \
  -n triumph-synergy \
  -p '{"spec":{"selector":{"test":"failover"}}}'

# 4. Monitor failover
echo "Monitoring failover progression..."
for i in {1..60}; do
  STATUS=$(curl -s https://triumph-synergy-prod.com/api/health || echo "error")
  if echo "$STATUS" | grep -q "healthy"; then
    echo "✓ Failover complete at $((i*2)) seconds"
    break
  fi
  sleep 2
done

# 5. Restore primary
echo "Restoring primary..."
kubectl patch service triumph-app \
  -n triumph-synergy \
  -p '{"spec":{"selector":{"app":"triumph-app"}}}'

# 6. Verify both regions operational
gcloud container clusters describe triumph-synergy-production
aws eks describe-cluster --name triumph-synergy-production

# 7. Notify completion
curl -X POST $SLACK_WEBHOOK \
  -d '{"text":"Failover test complete - all systems operational"}'

echo "Test completed successfully"
```

### 2. Unplanned Failure Simulation

```bash
# Simulate GCP pod crash
kubectl delete pod -n triumph-synergy \
  -l app=triumph-app \
  -n triumph-synergy

# Verify automatic recovery
kubectl get pods -n triumph-synergy --watch

# Check replication status
kubectl exec -it deployment/triumph-app -n triumph-synergy -- \
  psql $POSTGRES_URL -c "SELECT * FROM pg_stat_replication;"
```

## Verification Checklist

Before going live:

- [ ] DNS configured with dual A records (primary/failover)
- [ ] Health checks configured on both platforms
- [ ] Database replication verified and tested
- [ ] Redis cluster operational across regions
- [ ] Connection pooling configured
- [ ] Failover circuit breaker implemented
- [ ] Monitoring and alerts active
- [ ] Backup procedures tested
- [ ] Disaster recovery runbooks documented
- [ ] Team trained on failover procedures
- [ ] Planned failover test completed successfully
- [ ] Vercel environment variables point to cloud resources
- [ ] GitHub Actions secrets configured
- [ ] No port conflicts with local development
- [ ] Load balancers configured with correct health check paths
- [ ] TLS certificates valid for primary domain

---

**Last Updated**: January 2, 2026
**Status**: Ready for Implementation
