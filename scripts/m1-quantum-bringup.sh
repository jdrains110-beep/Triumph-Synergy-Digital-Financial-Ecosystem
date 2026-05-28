#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE=".env"
STRICT_LOGS="false"
WITH_PI_NODE="false"
WITH_TESTNET2_BRIDGE="false"
ALLOW_LOW_RESOURCES="false"
WITH_BUILD="false"
WITH_PULL="false"

MIN_CPUS=8
MIN_MEM_GIB=20

usage() {
  cat <<'EOF'
Usage: bash scripts/m1-quantum-bringup.sh [options]

Options:
  --env-file PATH          Use a custom env file (default: .env)
  --with-pi-node           Start pi-mainnet-node as final phase
  --with-testnet2-bridge   Attach existing testnet2 container to compose networks
  --strict-logs            Fail if new startup logs contain error/warn patterns
  --allow-low-resources    Skip hard fail for low Docker Desktop CPU/RAM
  --build                  Build images during startup
  --pull                   Pull latest images before startup
  --help                   Show this help

Examples:
  bash scripts/m1-quantum-bringup.sh --strict-logs
  bash scripts/m1-quantum-bringup.sh --with-pi-node --strict-logs --build
  bash scripts/m1-quantum-bringup.sh --with-testnet2-bridge --strict-logs
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      ENV_FILE="$2"
      shift 2
      ;;
    --with-pi-node)
      WITH_PI_NODE="true"
      shift
      ;;
    --with-testnet2-bridge)
      WITH_TESTNET2_BRIDGE="true"
      shift
      ;;
    --strict-logs)
      STRICT_LOGS="true"
      shift
      ;;
    --allow-low-resources)
      ALLOW_LOW_RESOURCES="true"
      shift
      ;;
    --build)
      WITH_BUILD="true"
      shift
      ;;
    --pull)
      WITH_PULL="true"
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      usage
      exit 1
      ;;
  esac
done

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE"
  echo "Create it from .env.example first."
  exit 1
fi

required_env=(
  POSTGRES_PASSWORD
  PI_API_KEY
  PI_INTERNAL_API_KEY
  PI_MAINNET_API_KEY
  PI_API_SECRET
  AUTH_SECRET
  NEXTAUTH_SECRET
)

echo "Loading environment from $ENV_FILE"
set -a
source "$ENV_FILE"
set +a

for key in "${required_env[@]}"; do
  if [[ -z "${!key:-}" ]]; then
    echo "Missing required env var: $key"
    exit 1
  fi
done

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required but not found in PATH."
  exit 1
fi

echo "Checking Docker daemon..."
docker info >/dev/null

cpu_count="$(docker info --format '{{.NCPU}}')"
mem_total_bytes="$(docker info --format '{{.MemTotal}}')"
mem_total_gib="$((mem_total_bytes / 1024 / 1024 / 1024))"

echo "Docker CPUs: $cpu_count"
echo "Docker Memory: ${mem_total_gib}GiB"

if [[ "$ALLOW_LOW_RESOURCES" != "true" ]]; then
  if (( cpu_count < MIN_CPUS )); then
    echo "CPU allocation too low for target operation: need >= ${MIN_CPUS}, have ${cpu_count}."
    exit 1
  fi
  if (( mem_total_gib < MIN_MEM_GIB )); then
    echo "Memory allocation too low for target operation: need >= ${MIN_MEM_GIB}GiB, have ${mem_total_gib}GiB."
    exit 1
  fi
fi

compose_base=(
  docker compose
  --env-file "$ENV_FILE"
  -f docker-compose.yml
  -f docker-compose.override.yml
  -f docker-compose.quantum-cpu.yml
)

if [[ "$WITH_PI_NODE" == "true" ]]; then
  compose_base+=(--profile pi-node)
fi

if [[ "$WITH_PULL" == "true" ]]; then
  echo "Pulling latest images..."
  "${compose_base[@]}" pull
fi

check_container_state() {
  local service="$1"
  local timeout_seconds="$2"
  local waited=0

  while (( waited < timeout_seconds )); do
    local cid
    cid="$("${compose_base[@]}" ps -q "$service" | head -n 1)"

    if [[ -z "$cid" ]]; then
      sleep 3
      waited=$((waited + 3))
      continue
    fi

    local running health
    running="$(docker inspect -f '{{.State.Running}}' "$cid" 2>/dev/null || echo "false")"
    health="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$cid" 2>/dev/null || echo "none")"

    if [[ "$running" == "true" && ( "$health" == "healthy" || "$health" == "none" ) ]]; then
      return 0
    fi

    if [[ "$health" == "unhealthy" ]]; then
      echo "Service $service became unhealthy."
      docker logs --tail 120 "$cid" || true
      return 1
    fi

    if [[ "$running" != "true" ]]; then
      local status
      status="$(docker inspect -f '{{.State.Status}}' "$cid" 2>/dev/null || echo "unknown")"
      if [[ "$status" == "exited" || "$status" == "dead" ]]; then
        echo "Service $service is $status."
        docker logs --tail 120 "$cid" || true
        return 1
      fi
    fi

    sleep 3
    waited=$((waited + 3))
  done

  echo "Timed out waiting for service $service readiness after ${timeout_seconds}s."
  return 1
}

log_gate() {
  local service="$1"
  local cid
  cid="$("${compose_base[@]}" ps -q "$service" | head -n 1)"

  if [[ -z "$cid" ]]; then
    echo "No container id found for $service while scanning logs."
    return 1
  fi

  local patterns='(error|warn|fatal|traceback|exception|panic)'
  local filtered
  filtered="$(docker logs --since 2m "$cid" 2>&1 | grep -Ein "$patterns" || true)"

  if [[ -n "$filtered" ]]; then
    echo "Detected startup warnings/errors in $service logs:"
    echo "$filtered" | head -n 40
    if [[ "$STRICT_LOGS" == "true" ]]; then
      return 1
    fi
  fi

  return 0
}

phase_up() {
  local phase_name="$1"
  local timeout_seconds="$2"
  shift 2
  local services=("$@")

  echo
  echo "=== Phase: ${phase_name} ==="
  echo "Services: ${services[*]}"

  local up_args=(up -d)
  if [[ "$WITH_BUILD" == "true" ]]; then
    up_args+=(--build)
  fi
  up_args+=("${services[@]}")

  "${compose_base[@]}" "${up_args[@]}"

  for svc in "${services[@]}"; do
    echo "Waiting for $svc..."
    check_container_state "$svc" "$timeout_seconds"
    log_gate "$svc"
  done

  echo "Phase ${phase_name} complete."
}

phase_up "Infra Core" 180 postgres redis
phase_up "Core Chain Services" 240 pi-bridge-connector governance-shield settlement-core quantum-intel-fortress vault
phase_up "App Edge" 240 app nginx observability-stack
phase_up "Apex Mesh" 300 horizon-stream supernode-peer-2 guardian-watchdog-nexus apex-services sovereign-life apex-sovereign-nexus sovereign-military-bridge sovereign-mesh-hub

if [[ "$WITH_TESTNET2_BRIDGE" == "true" ]]; then
  echo
  echo "=== Phase: Testnet2 Bridge Attach ==="
  if ! docker ps -a --format '{{.Names}}' | grep -qx 'testnet2'; then
    echo "testnet2 container not found. Start your Pi testnet2 node first, then rerun with --with-testnet2-bridge."
    exit 1
  fi

  if [[ "$(docker inspect -f '{{.State.Running}}' testnet2 2>/dev/null || echo false)" != "true" ]]; then
    echo "testnet2 container exists but is not running."
    exit 1
  fi

  for net in pi-bridge triumph-net; do
    if docker network inspect "$net" >/dev/null 2>&1; then
      if ! docker network inspect "$net" --format '{{range .Containers}}{{println .Name}}{{end}}' | grep -qx 'testnet2'; then
        echo "Connecting testnet2 to network: $net"
        docker network connect "$net" testnet2
      else
        echo "testnet2 already connected to: $net"
      fi
    else
      echo "Required network missing: $net"
      exit 1
    fi
  done

  bridge_cid="$(${compose_base[@]} ps -q pi-bridge-connector | head -n 1)"
  if [[ -z "$bridge_cid" ]]; then
    echo "pi-bridge-connector container not found while validating testnet2 connectivity."
    exit 1
  fi

  echo "Validating testnet2 Horizon reachability from pi-bridge-connector..."
  if ! docker exec "$bridge_cid" python -c "import urllib.request; urllib.request.urlopen('http://testnet2:8000/', timeout=20); print('ok')" >/dev/null 2>&1; then
    echo "pi-bridge-connector cannot reach http://testnet2:8000 after network attach."
    exit 1
  fi

  echo "Testnet2 bridge attach complete."
fi

if [[ "$WITH_PI_NODE" == "true" ]]; then
  phase_up "Pi Mainnet Node" 1800 pi-mainnet-node

  echo "Checking Pi node info endpoint..."
  if ! curl -fsS "http://localhost:${PI_NODE_HORIZON_PORT:-31501}/" >/dev/null; then
    echo "Pi node horizon endpoint is not reachable on localhost:${PI_NODE_HORIZON_PORT:-31501}."
    exit 1
  fi
fi

echo
echo "All phases completed successfully."
echo "Final container status:"
"${compose_base[@]}" ps
