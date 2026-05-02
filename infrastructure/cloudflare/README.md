# Step 3 — Cloudflare CDN + Edge Caching

Pushes static + cacheable SAIB read endpoints to Cloudflare's 300+ edge POPs.
Origin (k3s ingress from Step 2) only sees cache-misses → ~95% origin offload at scale.

## What's in here

| Path | Purpose |
|---|---|
| `terraform/` | IaC for Cloudflare zone: cache rules, page rules, WAF, rate limiting, tunnel |
| `workers/saib-edge.js` | Cloudflare Worker — KV-backed edge cache for SAIB reads with stale-while-revalidate |
| `workers/wrangler.toml` | Worker deployment config (deploy with `wrangler deploy`) |
| `tunnel/cloudflared.yml` | Cloudflare Tunnel config (zero-trust origin connect; no inbound ports) |
| `cache-rules.yaml` | Human-readable cache policy (mirrors Terraform) |

## Caching strategy (origin Cache-Control headers)

The SAIB FastAPI app emits `Cache-Control` via middleware (added in Step 3 to
`docker/sovereign-ai-bot/main.py`). Cloudflare honors origin headers by default.

| Endpoint | Cache-Control | Edge TTL | Why |
|---|---|---|---|
| `/health`, `/status` | `public, max-age=10, stale-while-revalidate=30` | 10s | High-volume probe, rarely changes |
| `/codebase`, `/network` | `public, max-age=60, stale-while-revalidate=300` | 60s | Read-heavy, slow-changing |
| `/brain`, `/visitors`, `/persist`, `/learning`, `/report`, `/gold`, `/metrics` | `public, max-age=5, stale-while-revalidate=60` | 5s | Live state — burst absorber |
| `/loopholes` | `public, max-age=300` | 5m | Effectively static |
| `POST *`, `/execute`, `/heal/*`, `/scan`, `/feedback`, `/teach`, `/persist/save`, `/network/switch`, `/codebase/sync`, `/emergency-lockdown` | `no-store` | — | Mutations bypass cache |

At 1M req/s on `/health`, origin sees ~100K req/s → 90%+ offload.
With Worker layer (KV + SWR), origin sees <10K req/s → 99%+ offload.

## Deploy

### Prerequisites
```bash
# Cloudflare account + zone already provisioned for your domain
export CF_API_TOKEN="..."          # scoped: Zone:Edit, Workers:Edit, Tunnel:Edit
export CF_ZONE_ID="..."
export CF_ACCOUNT_ID="..."
export DOMAIN="triumphsynergy.example"
```

### 1. Apply Cloudflare config (Terraform)
```bash
cd infrastructure/cloudflare/terraform
terraform init
terraform apply -var "zone_id=$CF_ZONE_ID" -var "domain=$DOMAIN"
```

### 2. Deploy Worker (edge cache)
```bash
cd infrastructure/cloudflare/workers
npm i -g wrangler
wrangler kv namespace create SAIB_CACHE       # paste the id into wrangler.toml
wrangler deploy
```

### 3. Connect origin via Tunnel (no public IPs needed)
```bash
docker compose -f docker-compose.yml -f docker-compose.tunnel.yml up -d cloudflared
# OR in k3s: kubectl apply -f tunnel/k8s-cloudflared.yaml
```

### 4. Verify
```bash
# Cache-Control header from origin
curl -I https://$DOMAIN/health  | grep -iE 'cache-control|cf-cache'
# Expected: cf-cache-status: HIT  (after 1st request)

# SAIB still works
curl https://$DOMAIN/brain | jq .brain.intelligence_level
```

## Why this is the Step 2 payoff

Step 2 gave horizontal compute (3→30 SAIB pods).
Step 3 gives geographic scale: the *same* 3 pods now serve the planet because
Cloudflare absorbs 95-99% of read traffic at the edge.

**Combined effect:** 30 SAIB pods × 100× edge multiplier ≈ 3000× capacity vs Step 1.

## Teardown
```bash
cd infrastructure/cloudflare/terraform && terraform destroy
cd ../workers && wrangler delete
```
