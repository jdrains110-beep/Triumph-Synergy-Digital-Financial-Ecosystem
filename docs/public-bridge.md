# Public Bridge — Docker Desktop ↔ Public Sites

Real-time, **bidirectional**, outbound-only link between the local Docker Desktop
stack and the public sites:

- `https://triumphsynergy.com` (Pi Network production)
- `https://Triumph-Synergy.replit.app`     (Replit staging)

Both directions are **initiated from Docker Desktop**, so this works behind
any NAT/CGNAT (Starlink, mobile hotspot, residential ISP) without port
forwarding.

```
┌──────────────────────┐         HTTPS POST (every 10s)         ┌──────────────────────────┐
│                      │ ───────────────────────────────────▶  │ /api/bridge/ingest       │
│ Docker Desktop       │                                         │ → Redis cache + pub      │
│ pi-bridge-connector  │                                         │                          │
│ (public_bridge.py)   │ ◀───────────────────────────────────  │ /api/bridge/stream (SSE) │
│                      │       SSE long-lived (Docker→site)      │ ← Redis sub              │
└──────────────────────┘                                         └──────────────────────────┘
                                                                            ▲
                                                                            │ POST
                                                                 ┌──────────────────────┐
                                                                 │ /api/bridge/command  │
                                                                 │ (apps / dashboards)  │
                                                                 └──────────────────────┘
```

## Components

| Side   | File                                                   | Role                                                   |
| ------ | ------------------------------------------------------ | ------------------------------------------------------ |
| Docker | `docker/pi-bridge-connector/public_bridge.py`          | Outbound POST loop + SSE consumer                      |
| Docker | `docker/pi-bridge-connector/main.py` (`_startup`)      | Spawns the two tasks on FastAPI startup                |
| Site   | `app/api/bridge/ingest/route.ts`                       | Receives Docker snapshots, stores in Redis             |
| Site   | `app/api/bridge/stream/route.ts`                       | SSE stream Docker subscribes to                        |
| Site   | `app/api/bridge/command/route.ts`                      | Publishes commands to the SSE channel                  |
| Both   | `app/api/bridge/_auth.ts`                              | Shared bearer-token check + channel naming             |

## Configuration

Set the **same** token on every side:

```bash
# .env (Docker Desktop)
PUBLIC_BRIDGE_TOKEN=$(openssl rand -hex 32)
PUBLIC_BRIDGE_URLS=https://triumphsynergy.com,https://Triumph-Synergy.replit.app
PUBLIC_BRIDGE_NODE_ID=docker-desktop-primary
```

- **Replit**: add `PUBLIC_BRIDGE_TOKEN` to *Tools → Secrets*.
- **Pi App Studio / pinet.com**: add `PUBLIC_BRIDGE_TOKEN` to the deployment env.

Both public sites also need access to Redis (`REDIS_URL`). Default is the
internal Docker `redis://triumph-redis:6379`; on Replit/pinet point it to a
hosted Redis (Upstash, Redis Cloud, etc.).

## Start

```bash
docker compose up -d --build pi-bridge-connector
docker logs -f triumph-pi-bridge-connector | grep -E '\[bridge\]|\[public-bridge\]'
```

Expected log lines once enabled:

```
[bridge]   public-bridge ENABLED for https://triumphsynergy.com, https://Triumph-Synergy.replit.app
[public-bridge] push loop -> https://triumphsynergy.com (every 10s)
[public-bridge] SSE connecting -> https://Triumph-Synergy.replit.app/api/bridge/stream
[public-bridge] SSE connected  -> https://Triumph-Synergy.replit.app
```

## Test end-to-end

**1. Docker → public site** (latest snapshot stored in Redis):

```bash
curl -H "Authorization: Bearer $PUBLIC_BRIDGE_TOKEN" \
     https://Triumph-Synergy.replit.app/api/bridge/ingest
# → { ok: true, nodes: { "docker-desktop-primary": { ...latest snapshot... } } }
```

**2. Public site → Docker** (command appears in Docker logs):

```bash
curl -X POST \
     -H "Authorization: Bearer $PUBLIC_BRIDGE_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"node_id":"broadcast","action":"ping","params":{"hello":"docker"}}' \
     https://Triumph-Synergy.replit.app/api/bridge/command
# → { ok: true, queued: true, subscribers: 1, ... }
```

Docker container will log:

```
[bridge] public command from https://Triumph-Synergy.replit.app: event=command data={"id":"...","action":"ping",...}
```

## Security

- `PUBLIC_BRIDGE_TOKEN` is checked with constant-time comparison on every
  request to `/api/bridge/{ingest,stream,command}`.
- If the token is unset on a public site, **all bridge endpoints return 401**
  (fail-closed).
- The SSE stream sends `event: command` frames only — Docker has no inbound
  port and cannot be reached directly from the internet.
- All traffic is HTTPS, so the token is never sent in clear text.

## Extending command handling

Edit `_public_bridge_command_handler()` in
`docker/pi-bridge-connector/main.py`. Today it logs and re-publishes the
command on the local Redis channel `triumph:public-bridge:commands`; any
service in the docker-compose stack can subscribe and act on it (e.g.
trigger a Horizon refresh, submit a transaction, rotate keys).
