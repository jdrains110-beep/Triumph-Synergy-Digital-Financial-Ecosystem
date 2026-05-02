# Triumph Synergy — k3s / Kubernetes Manifests

**Step 2 of the planet-scale roadmap.** Migrates the SAIB-critical path from
single-host docker-compose to Kubernetes. Runs **side-by-side** with compose;
does not disrupt local dev.

## What's deployed

| Resource | Kind | Notes |
|---|---|---|
| `triumph-postgres` | StatefulSet (1) | Persistent state store (Step 1 dependency) |
| `triumph-redis` | StatefulSet (1) | Cache / pub-sub |
| `triumph-apex-services` | Deployment (3) | **SAIB runs as 3 replicas** — state shared via Postgres |
| `triumph-apex-services` | HPA | Scales 3 → 30 on 70% CPU |
| `triumph-apex-services` | PDB | Min 2 available during disruptions |
| `triumph-saib-sticky` | Service | Optional ClientIP affinity for sticky brain reads |
| `triumph-nginx` | Deployment (2) | Round-robin LB → SAIB pods |
| `triumph-ingress` | Ingress | Traefik (k3s default) |

## Why this is the Step 1 payoff

Because SAIB's brain, visitors, GitHub knowledge, and sovereign counters are
now persisted to Postgres every 60s and loaded on startup, **any pod can serve
any request**. Kill a replica, the state survives. Add a replica, it joins the
collective with full memory. This is what makes horizontal scale possible.

## Deploy

### Local (k3d on macOS / Linux)

```bash
./scripts/k3s-bootstrap.sh
```

### Existing k3s / k8s cluster

```bash
# 1. Create namespace + config
kubectl apply -f infrastructure/k8s/00-namespace.yaml
kubectl apply -f infrastructure/k8s/01-configmap.yaml

# 2. Create real secret (NEVER use the template)
kubectl -n triumph create secret generic triumph-secrets \
  --from-literal=POSTGRES_PASSWORD=$(openssl rand -hex 24) \
  --from-literal=GITHUB_TOKEN=ghp_xxx \
  --from-literal=AUTH_SECRET=$(openssl rand -hex 32) \
  --from-literal=PI_API_KEY=xxx

# 3. Apply rest
kubectl apply -k infrastructure/k8s/
```

## Verify horizontal SAIB

```bash
kubectl -n triumph get pods -l app=triumph-apex-services
# 3 pods running

kubectl -n triumph port-forward svc/triumph-apex-services 8099:8099
curl http://127.0.0.1:8099/persist
# loaded_on_startup: true on every pod

# Hit /brain repeatedly — load-balanced across pods, all see same state
for i in {1..10}; do curl -s http://127.0.0.1:8099/brain | jq .brain.total_interactions; done
```

## Teardown

```bash
k3d cluster delete triumph
```
