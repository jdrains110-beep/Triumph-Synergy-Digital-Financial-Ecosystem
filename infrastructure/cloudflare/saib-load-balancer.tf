# =============================================================================
# Step 6 — Cloudflare Load Balancer for multi-region active-active
# -----------------------------------------------------------------------------
# Provisions a Cloudflare Load Balancer that geo-steers traffic between
# region-a (us-east) and region-b (us-west) origin pools, with health checks
# against SAIB's /region endpoint.
#
# Variables required (set via TF_VAR_* or terraform.tfvars):
#   cloudflare_api_token    - API token with Zone:Edit + Load Balancer:Edit
#   cloudflare_zone_id      - DNS zone for triumph-synergy.com (or your domain)
#   cloudflare_account_id   - Cloudflare account ID
#   region_a_origin_host    - region-a public hostname (e.g. a.api.triumph.io)
#   region_b_origin_host    - region-b public hostname (e.g. b.api.triumph.io)
# =============================================================================

terraform {
  required_version = ">= 1.5"
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.40"
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

variable "cloudflare_api_token"  { type = string  sensitive = true }
variable "cloudflare_zone_id"    { type = string }
variable "cloudflare_account_id" { type = string }
variable "region_a_origin_host"  { type = string }
variable "region_b_origin_host"  { type = string }
variable "lb_hostname"           { type = string  default = "api.triumph-synergy.com" }

# -----------------------------------------------------------------------------
# Health monitor — hits /region; expects 200 + JSON containing "saib_version"
# -----------------------------------------------------------------------------
resource "cloudflare_load_balancer_monitor" "saib_region" {
  account_id     = var.cloudflare_account_id
  type           = "https"
  method         = "GET"
  path           = "/region"
  expected_codes = "200"
  expected_body  = "saib_version"
  interval       = 30
  timeout        = 5
  retries        = 2
  follow_redirects = true
  description    = "SAIB /region health probe (Step 6 active-active)"
}

# -----------------------------------------------------------------------------
# Origin pools — one per region
# -----------------------------------------------------------------------------
resource "cloudflare_load_balancer_pool" "region_a" {
  account_id = var.cloudflare_account_id
  name       = "saib-region-a-us-east"
  monitor    = cloudflare_load_balancer_monitor.saib_region.id
  origins {
    name    = "saib-a-primary"
    address = var.region_a_origin_host
    enabled = true
    weight  = 1.0
  }
  notification_email = "ops@triumph-synergy.com"
}

resource "cloudflare_load_balancer_pool" "region_b" {
  account_id = var.cloudflare_account_id
  name       = "saib-region-b-us-west"
  monitor    = cloudflare_load_balancer_monitor.saib_region.id
  origins {
    name    = "saib-b-primary"
    address = var.region_b_origin_host
    enabled = true
    weight  = 1.0
  }
  notification_email = "ops@triumph-synergy.com"
}

# -----------------------------------------------------------------------------
# Load balancer — geo steering with proximity fallback
# -----------------------------------------------------------------------------
resource "cloudflare_load_balancer" "saib_global" {
  zone_id          = var.cloudflare_zone_id
  name             = var.lb_hostname
  fallback_pool_id = cloudflare_load_balancer_pool.region_a.id
  default_pool_ids = [
    cloudflare_load_balancer_pool.region_a.id,
    cloudflare_load_balancer_pool.region_b.id,
  ]
  description      = "SAIB active-active global load balancer (Step 6)"
  proxied          = true
  steering_policy  = "geo"

  # Continent → preferred pool order (closest first)
  region_pools {
    region   = "ENAM"  # Eastern North America
    pool_ids = [cloudflare_load_balancer_pool.region_a.id, cloudflare_load_balancer_pool.region_b.id]
  }
  region_pools {
    region   = "WNAM"  # Western North America
    pool_ids = [cloudflare_load_balancer_pool.region_b.id, cloudflare_load_balancer_pool.region_a.id]
  }
  region_pools {
    region   = "EU"
    pool_ids = [cloudflare_load_balancer_pool.region_a.id, cloudflare_load_balancer_pool.region_b.id]
  }
  region_pools {
    region   = "APAC"
    pool_ids = [cloudflare_load_balancer_pool.region_b.id, cloudflare_load_balancer_pool.region_a.id]
  }

  # Sticky sessions via cookie so a user stays in one region for short bursts
  session_affinity         = "cookie"
  session_affinity_ttl     = 1800
  session_affinity_attributes {
    samesite = "Auto"
    secure   = "Auto"
    drain_duration = 60
  }
}

output "lb_hostname"  { value = cloudflare_load_balancer.saib_global.name }
output "pool_a_id"    { value = cloudflare_load_balancer_pool.region_a.id }
output "pool_b_id"    { value = cloudflare_load_balancer_pool.region_b.id }
