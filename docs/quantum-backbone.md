# Quantum Motherboard Backbone

This document defines the continuous quantum-resistant backbone added to Triumph Synergy.

## Reality constraint

No network can guarantee a literal "never disconnect" condition under all physical failures. The implemented design is self-healing and continuously reconnecting with automatic failover and quantum session-key rotation.

## Implemented behavior

- Continuous route probing every few seconds.
- Automatic failover to secondary routes after repeated probe failures.
- Kyber session-key reseed on reconnect/failover events.
- Global event broadcast over Redis channel `quantum:motherboard`.
- Backbone status API for observability and operations.

## APIs

- `GET /quantum/backbone/status`
- `POST /quantum/backbone/reseed`
- `GET /quantum/status` includes `motherboard_backbone`

## Compose tuning variables

- `BACKBONE_INTERVAL_S`
- `BACKBONE_TIMEOUT_S`
- `BACKBONE_MAX_FAILURES`
- `BACKBONE_ENDPOINTS`

## Suggested operations sequence

```powershell
docker compose build quantum-shield

docker compose up -d --no-deps quantum-shield

curl.exe -s http://localhost:8094/quantum/backbone/status
curl.exe -s http://localhost:8094/quantum/status
```

## Prometheus signals

- `quantum_backbone_connected`
- `quantum_backbone_failovers_total`
- `quantum_backbone_reconnects_total`
