# Triumph Synergy CPU Tuning

## Overview
Maximum CPU efficiency achieved through strategic core pinning and scheduling weights.

## Architecture
- **Core 0**: Redis (I/O bound, cache), Vault (secrets, low contention)
- **Core 0-1**: Pi-Bridge (network polling), App (Node.js frontend), Sovereign-Life (3-svc pod)
- **Core 1-2**: Quantum-Intel-Fortress (ML-KEM, SPHINCS+), Settlement-Core, Supernode-Peer
- **Core 2-3**: Governance-Shield (SCP consensus), Postgres (indexing), Nginx
- **Core 0-3**: Pi-Mainnet-Node (stellar-core 4x threads), Apex-Services (18 microservices)
- **Core 1,3**: Observability-Stack (Prometheus scraping)
- **Core 3**: Horizon-Stream (oracle polling), Guardian-Watchdog, Testnet2

## Optimization Levels

### Polling/Scan Intervals (CPU cycle reduction)
| Service | Before | After | Savings |
|---------|--------|-------|---------|
| governance-shield VERSION_CHECK | 60s | 600s | 90% |
| governance-shield PARAMETER_SYNC | 30s | 300s | 90% |
| observability-stack SCRAPE | 15s | 120s | 92% |
| horizon-stream MARKET_POLL | 5s | 10s | 50% |
| saib QUANTUM_CODE_SCAN | 1800s | 7200s | 75% |
| saib QUANTUM_IMAGE_SCAN | 3600s | 14400s | 75% |

### CPU Shares (Weighted Fair Scheduling)
- Pi-Mainnet-Node: 1536 shares (1.5x core priority)
- Apex-Services: 1024 shares (1x core, all 4 cores access)
- Testnet2: 1024 shares (1x core, core 3 pinned)
- Governance-Shield: 819 shares (0.8x core)
- Pi-Bridge-Connector: 614 shares (0.6x core)
- Apex-Sovereign-Nexus: 614 shares (0.6x core)
- Quantum-Intel-Fortress: 512 shares (0.5x core)
- Postgres: 512 shares (0.5x core)
- Redis: 512 shares (0.5x core)
- Observability-Stack: 563 shares (0.55x core)
- Settlement-Core: 460 shares (0.45x core)
- Supernode-Peer-2: 358 shares (0.35x core)
- Guardian-Watchdog: 307 shares (0.3x core)
- Sovereign-Life: 307 shares (0.3x core)
- Vault: 204 shares (0.2x core)
- Nginx: 204 shares (0.2x core)
- Sovereign-Mesh-Hub: 409 shares (0.4x core)
- Sovereign-Military-Bridge: 512 shares (0.5x core)

### Thread Pool Tuning
- Pi-Mainnet-Node: STELLAR_CORE_THREADS=4 (all cores)
- Quantum-Intel: OMP_NUM_THREADS=2, SPHINCS_THREADS=2
- Postgres: max_parallel_workers=2, max_worker_processes=2, shared_buffers=256MB
- App/Apex-Services: NODE_OPTIONS="--max-old-space-size=1024"

## Deployment

### Apply CPU Tuning Overrides
```bash
docker compose -f docker-compose.yml -f docker-compose.cpu-tuning.yml up -d
```

### Monitor CPU Distribution
```bash
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# Or with focus on high-CPU services:
docker stats triumph-pi-mainnet-node triumph-apex-services triumph-governance-shield --no-stream
```

### CPU Pinning (Live Adjustment)
```bash
# Pin app to cores 0-1
docker update --cpuset-cpus="0,1" triumph-app

# Adjust cpu_shares for apex-services (increase priority)
docker update --cpu-shares=1024 triumph-apex-services

# Monitor per-container CPU usage
docker stats triumph-quantum-intel-fortress --no-stream --format "{{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"
```

## Performance Targets
- **CPU Utilization**: 65-75% ceiling (headroom for spikes)
- **Latency**: Sub-100ms P99 (SCP consensus, tx settlement)
- **Memory Footprint**: ~7GB live (36% headroom vs 11GB ceiling)
- **Context Switches**: <500/sec per container (avoid thrashing)

## Troubleshooting

### High CPU Spike
1. Check which container: `docker stats`
2. Reduce polling interval or cpu_shares
3. Increase cpus weight in compose file

### Memory Pressure
1. Check OOM events: `docker inspect <container> --format='{{.State.OOMKilled}}'`
2. Bump mem_limit (already optimized per tier)
3. Reduce cache sizes (REDIS_SOCKET_POOL_SIZE, etc.)

### Uneven Core Utilization
- Docker Desktop VMs may oversubscribe CPUs; pin services explicitly
- Use `--cpuset-cpus` instead of relying on `cpus` weights alone

## See Also
- docker-compose.yml: Service definitions with mem_limit, cpus
- docker-compose.cpu-tuning.yml: CPU affinity overrides
