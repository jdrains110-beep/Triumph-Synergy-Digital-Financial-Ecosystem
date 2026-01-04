# 🔍 Triumph Synergy - Deployment Verification & Troubleshooting

## Post-Deployment Verification Checklist

### 1. Infrastructure Health

#### GCP Resources

```bash
# Check GKE cluster status
gcloud container clusters list
gcloud container clusters describe triumph-synergy-production --region us-central1

# Check Cloud SQL instance
gcloud sql instances list
gcloud sql instances describe triumph-synergy-db-production

# Check Redis instance
gcloud redis instances list --region=us-central1
gcloud redis instances describe triumph-redis --region=us-central1

# Check Cloud Storage buckets
gsutil ls
gsutil ls -L gs://triumph-synergy-assets
```

#### AWS Resources

```bash
# Check EKS cluster
aws eks list-clusters
aws eks describe-cluster --name triumph-synergy-production

# Check RDS instance
aws rds describe-db-instances --db-instance-identifier triumph-synergy-db-production

# Check ElastiCache
aws elasticache describe-cache-clusters --cache-cluster-id triumph-redis

# Check S3 buckets
aws s3 ls
aws s3 ls s3://triumph-synergy-backup/
```

### 2. Kubernetes Health


```bash
# Check all namespaces
kubectl get ns

# Check deployments
kubectl get deployments -n triumph-synergy
kubectl describe deployment triumph-app -n triumph-synergy
kubectl describe deployment payment-processor -n triumph-synergy

# Check pods
kubectl get pods -n triumph-synergy
kubectl logs -f deployment/triumph-app -n triumph-synergy

# Check services
kubectl get svc -n triumph-synergy

# Check persistent volumes
kubectl get pvc -n triumph-synergy
```

### 3. Application Health

```bash
# Port forward to test locally
kubectl port-forward svc/triumph-app 3000:3000 -n triumph-synergy

# Test health endpoint
curl http://localhost:3000/api/health

# Check application logs
kubectl logs -f deployment/triumph-app -n triumph-synergy --all-containers=true

# Get detailed pod info
kubectl get pod <pod-name> -n triumph-synergy -o yaml
```

### 4. Database Health

```bash
# Test PostgreSQL connection
kubectl exec -it deployment/triumph-app -n triumph-synergy -- \
  psql $POSTGRES_URL -c "SELECT NOW();"

# Check database size
kubectl exec -it deployment/triumph-app -n triumph-synergy -- \
  psql $POSTGRES_URL -c "SELECT pg_size_pretty(pg_database_size('triumph_synergy'));"

# List tables
kubectl exec -it deployment/triumph-app -n triumph-synergy -- \
  psql $POSTGRES_URL -c "\dt"

# Check replication status
kubectl exec -it deployment/triumph-app -n triumph-synergy -- \
  psql $POSTGRES_URL -c "SELECT * FROM pg_stat_replication;"
```

### 5. Cache Health

```bash
# Test Redis connection
kubectl exec -it deployment/triumph-app -n triumph-synergy -- \
  redis-cli -u $REDIS_URL ping

# Check Redis info
kubectl exec -it deployment/triumph-app -n triumph-synergy -- \
  redis-cli -u $REDIS_URL INFO

# Check key count
kubectl exec -it deployment/triumph-app -n triumph-synergy -- \
  redis-cli -u $REDIS_URL DBSIZE
```

### 6. API Endpoints

```bash
# Get load balancer IP
kubectl get svc triumph-app -n triumph-synergy

# Test all critical endpoints
BASE_URL="http://<LB-IP>:3000"

# Health check
curl $BASE_URL/api/health | jq .

# Pi Network integration
curl $BASE_URL/api/pi/value \
  -d '{"amount": 100, "source": "external_exchange"}' \
  -H "Content-Type: application/json"

# Stellar consensus
curl $BASE_URL/api/stellar/consensus | jq .

# Payment processing
curl $BASE_URL/api/pi/payment \
  -X POST \
  -H "Content-Type: application/json"
```

### 7. Vercel Integration

```bash
# Check Vercel deployment
vercel projects list
vercel deployments

# Test Vercel frontend
curl https://triumph-synergy-prod.vercel.app

# Check environment variables in Vercel
vercel env list

# Verify pointing to cloud databases
# Settings → Environment Variables
# POSTGRES_URL should point to GCP Cloud SQL or AWS RDS
# REDIS_URL should point to GCP Memorystore or AWS ElastiCache
```

### 8. GitHub Actions

```bash
# List workflow runs
gh run list --repo <org>/<repo>

# Check specific workflow
gh run view <run-id>

# View workflow logs
gh run view <run-id> --log
```

---

## Troubleshooting Guide

### Issue: Pods not starting

**Symptoms:**

- `kubectl get pods` shows `Pending`, `CrashLoopBackOff`, or `ImagePullBackOff`

**Solutions:**


```bash
# 1. Check pod events
kubectl describe pod <pod-name> -n triumph-synergy

# 2. Check pod logs
kubectl logs <pod-name> -n triumph-synergy

# 3. Check image pull
kubectl get events -n triumph-synergy --sort-by='.lastTimestamp'

# 4. Verify image exists in registry
gcloud container images list --repository=gcr.io/$GCP_PROJECT_ID

# 5. Check resource limits
kubectl describe nodes
kubectl top nodes
kubectl top pods -n triumph-synergy

# 6. If image issue, rebuild and push
docker build -t gcr.io/$GCP_PROJECT_ID/app:latest .
docker push gcr.io/$GCP_PROJECT_ID/app:latest

# 7. Restart deployment
kubectl rollout restart deployment/triumph-app -n triumph-synergy
```

### Issue: Database connection failed

**Symptoms:**

- Pod logs show "connection refused"
- `POSTGRES_URL` connection errors

**Solutions:**


```bash
# 1. Verify secret is created
kubectl get secret triumph-secrets -n triumph-synergy

# 2. Check secret values
kubectl get secret triumph-secrets -n triumph-synergy \
  -o jsonpath='{.data.POSTGRES_URL}' | base64 -d

# 3. Test database connectivity from pod
kubectl exec -it deployment/triumph-app -n triumph-synergy -- \
  bash -c "ping <db-host>"

# 4. Check database instance status
gcloud sql instances describe triumph-synergy-db-production \
  --format="value(state)"

# 5. Verify firewall rules
gcloud compute firewall-rules list --filter="network:triumph-synergy"

# 6. Check private network configuration
gcloud compute networks peering list

# 7. Restart Cloud SQL proxy if using
kubectl rollout restart deployment/cloudsql-proxy -n triumph-synergy
```

### Issue: Redis connection failed

**Symptoms:**

- Cache operations failing
- "Redis connection timeout"

**Solutions:**


```bash
# 1. Check Redis instance status
gcloud redis instances describe triumph-redis --region=us-central1

# 2. Verify Redis URL format
kubectl get secret triumph-secrets -n triumph-synergy \
  -o jsonpath='{.data.REDIS_URL}' | base64 -d

# 3. Test Redis connectivity
kubectl exec -it deployment/triumph-app -n triumph-synergy -- \
  redis-cli -u <REDIS_URL> ping

# 4. Check Redis memory usage
kubectl exec -it deployment/triumph-app -n triumph-synergy -- \
  redis-cli -u <REDIS_URL> INFO memory

# 5. Check authorized network
gcloud redis instances describe triumph-redis \
  --region=us-central1 \
  --format="value(authorizedNetwork)"
```

### Issue: Load Balancer not accessible

**Symptoms:**

- `curl http://<LB-IP>` times out or refuses connection
- External IP shows `<pending>`

**Solutions:**


```bash
# 1. Check service status
kubectl get svc triumph-app -n triumph-synergy

# 2. Wait for external IP to be assigned
kubectl get svc triumph-app -n triumph-synergy --watch

# 3. Check service endpoints
kubectl get endpoints triumph-app -n triumph-synergy

# 4. Verify service is pointing to pods
kubectl describe svc triumph-app -n triumph-synergy

# 5. Check firewall rules allow traffic
gcloud compute firewall-rules list \
  --filter="targetTags:triumph-synergy"

# 6. Check health check status
gcloud compute backend-services list
gcloud compute backend-services get-health triumph-app-backend

# 7. Check pod serving traffic
kubectl logs -f deployment/triumph-app -n triumph-synergy

# 8. If still pending, check quota
gcloud compute project-info describe --project=$GCP_PROJECT_ID | grep -A5 QUOTA
```

### Issue: API returning 500 errors

**Symptoms:**

- `curl http://<LB-IP>/api/health` returns 500
- Application endpoints fail

**Solutions:**


```bash
# 1. Check application logs
kubectl logs -f deployment/triumph-app -n triumph-synergy --all-containers=true

# 2. Check for OOM kills
kubectl describe pod <pod-name> -n triumph-synergy | grep -i memory

# 3. Increase resource limits if needed
kubectl edit deployment triumph-app -n triumph-synergy
# Increase limits in spec.template.spec.containers[0].resources.limits

# 4. Check environment variables
kubectl exec -it deployment/triumph-app -n triumph-synergy -- \
  env | grep -E "POSTGRES_URL|REDIS_URL|API_KEY"

# 5. Check application startup time
kubectl get pod <pod-name> -n triumph-synergy \
  -o jsonpath='{.status.containerStatuses[0].state}'

# 6. Restart pod to clear state
kubectl delete pod <pod-name> -n triumph-synergy
```

### Issue: Database replication lag

**Symptoms:**

- AWS reads show stale data
- Replication lag in monitoring

**Solutions:**


```bash
# 1. Check replication status (on primary)
gcloud sql instances describe triumph-synergy-db-production

# 2. Check replica status (AWS)
aws rds describe-db-instances \
  --db-instance-identifier triumph-synergy-db-production-replica

# 3. Check replication lag
# For PostgreSQL
SELECT now() - pg_last_xact_replay_timestamp() as replication_lag;

# 4. Verify network connectivity between regions
gcloud compute networks peering list --filter="network:triumph-synergy"

# 5. Check VPC peering status
gcloud compute networks peering describe <peering-name> \
  --network=triumph-synergy

# 6. Monitor replication metrics
gcloud monitoring time-series list \
  --filter='resource.type="cloudsql_database"'
```

### Issue: Vercel deployment failing

**Symptoms:**

- Vercel build failing
- Preview deployments not working

**Solutions:**


```bash
# 1. Check environment variables in Vercel
vercel env list

# 2. Test database connectivity from local
POSTGRES_URL="..." pnpm db:migrate

# 3. Rebuild locally
pnpm clean
pnpm install
pnpm build

# 4. Check build logs in Vercel dashboard
# Deployments → <deployment> → View Details

# 5. Verify buildCommand and installCommand
cat vercel.json | jq '{buildCommand, installCommand}'

# 6. If database migration issue:
# Make sure POSTGRES_URL points to accessible database
# Test: psql $POSTGRES_URL -c "SELECT 1"

# 7. If image pull issue:
# Ensure Docker registry credentials are set
vercel env list | grep DOCKER
```

### Issue: GitHub Actions workflow failing

**Symptoms:**

- Workflow shows red X
- Deployment didn't trigger

**Solutions:**


```bash
# 1. Check workflow status
gh run list --repo <org>/<repo>

# 2. View specific run logs
gh run view <run-id> --log

# 3. Check secrets are set
gh secret list

# 4. Verify permissions
# Settings → Actions → General → Workflow permissions

# 5. Check event that triggers workflow
cat .github/workflows/<workflow>.yml | grep "on:"

# 6. View workflow file for syntax errors
yq eval '.jobs' .github/workflows/<workflow>.yml

# 7. Re-run failed workflow
gh run rerun <run-id>
```

---

## Performance Verification

### 1. Load Testing

```bash
# Install k6 if not already
brew install k6  # or your OS equivalent

# Run load test
k6 run tests/load-test.js \
  --vus 100 \
  --duration 30s

# Monitor metrics during test
kubectl top pods -n triumph-synergy --watch

# Check application metrics
kubectl exec -it deployment/triumph-app -n triumph-synergy -- \
  curl localhost:3000/metrics
```

### 2. Database Performance

```bash
# Analyze slow queries
kubectl exec -it deployment/triumph-app -n triumph-synergy -- \
  psql $POSTGRES_URL << 'EOF'
SELECT query, calls, mean_time, max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
EOF

# Check index usage
psql $POSTGRES_URL << 'EOF'
SELECT tablename, indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
EOF

# Check table bloat
psql $POSTGRES_URL << 'EOF'
SELECT schemaname, tablename, 
  round(100*pg_relation_size(schemaname||'.'||tablename)::bigint/
  pg_total_relation_size(schemaname||'.'||tablename)::bigint) AS ratio
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY ratio;
EOF
```

### 3. Redis Performance

```bash
# Check memory efficiency
kubectl exec -it deployment/triumph-app -n triumph-synergy -- \
  redis-cli -u $REDIS_URL << 'EOF'
INFO memory
INFO stats
EOF

# Monitor key operations
kubectl exec -it deployment/triumph-app -n triumph-synergy -- \
  redis-cli -u $REDIS_URL --latency
```

### 4. Application Metrics

```bash
# CPU usage
kubectl top pod <pod-name> -n triumph-synergy

# Memory usage
kubectl get pod <pod-name> -n triumph-synergy \
  -o jsonpath='{.spec.containers[0].resources.limits.memory}'

# Network I/O
kubectl exec -it deployment/triumph-app -n triumph-synergy -- \
  cat /proc/net/dev | grep eth0
```

---

## Disaster Recovery Verification

### 1. Backup Verification

```bash
# GCP Cloud SQL backups
gcloud sql backups list --instance=triumph-synergy-db-production

# AWS RDS snapshots
aws rds describe-db-snapshots \
  --db-instance-identifier triumph-synergy-db-production

# Test restore (do not run in production)
# Create test instance from backup
gcloud sql instances clone triumph-synergy-db-production \
  triumph-synergy-db-test-restore
```

### 2. Failover Verification

```bash
# Test DNS failover (without actually failing over)
# Update local /etc/hosts to point to backup
echo "<AWS-LB-IP> triumph-synergy-prod.com" | sudo tee -a /etc/hosts

# Test connectivity
curl https://triumph-synergy-prod.com/api/health

# Remove test entry
sudo sed -i '/<AWS-LB-IP>/d' /etc/hosts
```

### 3. Recovery Time Objective (RTO)

```bash
# Document current state
kubectl get all -n triumph-synergy > rto-baseline.txt

# Simulate failure (in non-prod environment)
# kubectl delete deployment triumph-app -n triumph-synergy

# Time how long to recover
time kubectl rollout status deployment/triumph-app -n triumph-synergy

# Expected RTO: < 5 minutes for full recovery
```

---

## Monitoring & Alerting Setup

### 1. GCP Cloud Monitoring

```bash
# List existing dashboards
gcloud monitoring dashboards list

# Create monitoring alert for CPU
gcloud alpha monitoring policies create \
  --notification-channels=<CHANNEL_ID> \
  --display-name="High CPU Usage" \
  --condition-display-name="CPU > 80%" \
  --condition-threshold-value=80.0
```

### 2. AWS CloudWatch

```bash
# List CloudWatch dashboards
aws cloudwatch list-dashboards

# Create alarm for RDS CPU
aws cloudwatch put-metric-alarm \
  --alarm-name triumph-rds-cpu-high \
  --alarm-description "Alert when RDS CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold
```

---

## Common Scenarios

### Scenario: Complete GCP Outage

1. **Immediate** (< 5 min)
   - DNS automatically routes to AWS
   - Load balancer detects GCP health check failure
   - Traffic redirects to AWS

2. **Short-term** (5-30 min)
   - AWS database becomes write master
   - All write traffic now goes to AWS RDS
   - Read replicas maintain consistency

3. **Recovery**
   - GCP comes back online
   - Promote GCP to primary (if still desired)
   - Sync data from AWS back to GCP
   - Resume normal primary-secondary setup

```bash
# Commands to execute during recovery:
# 1. Verify GCP cluster is healthy
gcloud container clusters describe triumph-synergy-production

# 2. Restore database from backup
gcloud sql instances clone triumph-synergy-db-production \
  triumph-synergy-db-restore-from-aws

# 3. Promote AWS database back to primary
aws rds promote-read-replica --db-instance-identifier triumph-synergy-db-aws-primary

# 4. Sync data
# Use database-specific replication tools

# 5. Update DNS
# Point primary back to GCP once synced

# 6. Verify no data loss
# Compare records between GCP and AWS
```

### Scenario: Database Corruption

1. **Detection**
   - Application reports data inconsistency
   - Database integrity checks fail

2. **Response**
   - Stop writes to database
   - Restore from backup
   - Replay transactions from backup log

```bash
# Restore from backup
gcloud sql backups restore <BACKUP_ID> \
  --backup-instance=triumph-synergy-db-production

# Check transaction logs
psql $POSTGRES_URL -c "SELECT * FROM pg_controldata"

# Run integrity check
psql $POSTGRES_URL -c "REINDEX DATABASE triumph_synergy"
```

### Scenario: Kubernetes Node Failure

**Automatic handling:**

- Kubernetes automatically reschedules pods
- Pod Disruption Budgets prevent cascading failures
- New nodes provisioned by cluster autoscaler

```bash
# Monitor node status
kubectl get nodes
kubectl describe node <failed-node>

# Manually drain node if needed
kubectl drain <failed-node> --ignore-daemonsets --delete-emptydir-data

# Cordon node to prevent new pods
kubectl cordon <failed-node>

# Allow GCP/AWS to replace node
# Cluster autoscaler will provision new node automatically
```

---

## Cleanup & Teardown

**WARNING: These commands will delete all resources. Use only when decommissioning.**

```bash
# Delete Kubernetes resources
kubectl delete namespace triumph-synergy

# Destroy AWS infrastructure
cd infrastructure/terraform
terraform destroy -target=aws_eks_cluster.primary

# Destroy GCP infrastructure
terraform destroy -target=google_container_cluster.primary

# Delete state files
gsutil rm -r gs://triumph-synergy-tfstate-prod/

# Delete secrets from Secret Manager
gcloud secrets delete triumph-secrets
aws secretsmanager delete-secret --secret-id triumph-secrets

# Verify cleanup
kubectl get ns | grep triumph
gcloud container clusters list
aws eks list-clusters
```

---

## Support Contacts

- **GCP Support**: [Cloud Support](https://cloud.google.com/support)
- **AWS Support**: [AWS Support Console](https://console.aws.amazon.com/support)
- **Kubernetes Issues**: [Kubernetes Debug Guide](https://kubernetes.io/docs/tasks/debug/)
- **Application Issues**: Check application logs via kubectl
- **On-call Engineering**: [Add contact info]

---

**Last Updated**: January 2, 2026
**Maintained By**: DevOps Team
**Next Review**: Quarterly
