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
  # Reads CLOUDFLARE_API_TOKEN env
}

variable "zone_id"   { type = string }
variable "domain"    { type = string }
variable "origin_url" {
  type    = string
  default = "https://origin.triumphsynergy.example"
}

# ── Zone-level settings ───────────────────────────────────────────────────────
resource "cloudflare_zone_settings_override" "triumph" {
  zone_id = var.zone_id
  settings {
    ssl                      = "strict"
    always_use_https         = "on"
    automatic_https_rewrites = "on"
    min_tls_version          = "1.2"
    tls_1_3                  = "on"
    http3                    = "on"
    zero_rtt                 = "on"
    brotli                   = "on"
    early_hints              = "on"
    websockets               = "on"
    opportunistic_encryption = "on"
    cache_level              = "aggressive"
    browser_cache_ttl        = 0   # honor origin Cache-Control
    challenge_ttl            = 1800
    security_level           = "medium"
  }
}
