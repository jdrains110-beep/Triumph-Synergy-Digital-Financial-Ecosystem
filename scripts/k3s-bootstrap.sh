#!/usr/bin/env bash
# k3s-bootstrap.sh — Stand up Triumph stack on local k3s (via k3d) for testing
# Step 2 of the planet-scale roadmap. Runs side-by-side with docker-compose.
set -euo pipefail

CLUSTER="${CLUSTER:-triumph}"
K8S_DIR="$(cd "$(dirname "$0")/.." && pwd)/infrastructure/k8s"
NS="triumph"

need() { command -v "$1" >/dev/null 2>&1 || { echo "❌ Missing: $1"; exit 1; }; }

echo "→ Checking prerequisites…"
need docker
need kubectl

if ! command -v k3d >/dev/null 2>&1; then
  echo "→ Installing k3d…"
  if [[ "$(uname)" == "Darwin" ]] && command -v brew >/dev/null 2>&1; then
    brew install k3d
  else
    curl -sfL https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | bash
  fi
fi

echo "→ Creating k3d cluster '${CLUSTER}'…"
if ! k3d cluster list | grep -q "^${CLUSTER}\b"; then
  k3d cluster create "${CLUSTER}" \
    --servers 1 --agents 2 \
    --port "8080:80@loadbalancer" \
    --port "8443:443@loadbalancer" \
    --k3s-arg "--disable=traefik@server:0" \
    --wait
  # Re-enable traefik via the standard helm install (cleaner than k3s default)
  kubectl apply -f https://raw.githubusercontent.com/traefik/traefik/v3.1/docs/content/reference/dynamic-configuration/kubernetes-crd-definition-v1.yml || true
fi

echo "→ Loading local apex-services image into k3d…"
if docker image inspect triumph-synergy-apex-services:latest >/dev/null 2>&1; then
  k3d image import triumph-synergy-apex-services:latest -c "${CLUSTER}"
else
  echo "⚠  Image triumph-synergy-apex-services:latest not built locally. Run: docker compose build apex-services"
fi

echo "→ Applying namespace + ConfigMap…"
kubectl apply -f "${K8S_DIR}/00-namespace.yaml"
kubectl apply -f "${K8S_DIR}/01-configmap.yaml"

echo "→ Creating Secret (interactive)…"
if ! kubectl -n "${NS}" get secret triumph-secrets >/dev/null 2>&1; then
  if [[ -n "${POSTGRES_PASSWORD:-}" ]]; then PG_PW="$POSTGRES_PASSWORD"; else read -rsp "POSTGRES_PASSWORD: " PG_PW; echo; fi
  if [[ -n "${GITHUB_TOKEN:-}" ]]; then GH_TK="$GITHUB_TOKEN"; else read -rsp "GITHUB_TOKEN (PAT, blank to skip): " GH_TK; echo; fi
  AUTH_SECRET="$(openssl rand -hex 32)"
  kubectl -n "${NS}" create secret generic triumph-secrets \
    --from-literal="POSTGRES_PASSWORD=${PG_PW}" \
    --from-literal="GITHUB_TOKEN=${GH_TK:-}" \
    --from-literal="AUTH_SECRET=${AUTH_SECRET}" \
    --from-literal="PI_API_KEY=${PI_API_KEY:-changeme}"
else
  echo "✓ Secret triumph-secrets exists"
fi

echo "→ Applying remaining manifests via kustomize…"
kubectl apply -k "${K8S_DIR}" \
  --prune-allowlist=core/v1/Service \
  --prune-allowlist=apps/v1/Deployment \
  --prune-allowlist=apps/v1/StatefulSet \
  || kubectl apply -k "${K8S_DIR}"

echo "→ Waiting for Postgres…"
kubectl -n "${NS}" rollout status statefulset/triumph-postgres --timeout=180s

echo "→ Waiting for Redis…"
kubectl -n "${NS}" rollout status statefulset/triumph-redis --timeout=120s

echo "→ Waiting for SAIB (apex-services) — 3 replicas…"
kubectl -n "${NS}" rollout status deployment/triumph-apex-services --timeout=300s || true

echo
echo "════════════════════════════════════════════════════════════════"
echo "  ✓ Triumph k3s stack live"
echo "════════════════════════════════════════════════════════════════"
kubectl -n "${NS}" get pods -o wide
echo
echo "  Test SAIB persistence across replicas:"
echo "    kubectl -n ${NS} port-forward svc/triumph-apex-services 8099:8099"
echo "    curl http://127.0.0.1:8099/persist"
echo "    curl http://127.0.0.1:8099/brain    # state shared via Postgres"
echo
echo "  Watch HPA scale-out:"
echo "    kubectl -n ${NS} get hpa -w"
echo
echo "  Tear down:"
echo "    k3d cluster delete ${CLUSTER}"
