# Ruleset: cache rules (modern Cloudflare Rulesets API)
resource "cloudflare_ruleset" "saib_cache" {
  zone_id = var.zone_id
  name    = "SAIB cache policy"
  kind    = "zone"
  phase   = "http_request_cache_settings"

  rules {
    description = "high-volume probes (10s edge, 30s SWR)"
    expression  = "(http.request.uri.path in {\"/health\" \"/status\"})"
    action      = "set_cache_settings"
    action_parameters {
      cache = true
      edge_ttl   { mode = "override_origin"  default = 10 }
      browser_ttl { mode = "override_origin" default = 5 }
      serve_stale { disable_stale_while_updating = false }
      respect_strong_etags = true
    }
  }

  rules {
    description = "read-heavy slow-changing (60s edge, 5m SWR)"
    expression  = "(http.request.uri.path in {\"/codebase\" \"/network\" \"/loopholes\"})"
    action      = "set_cache_settings"
    action_parameters {
      cache = true
      edge_ttl    { mode = "override_origin"  default = 60 }
      browser_ttl { mode = "override_origin"  default = 30 }
      serve_stale { disable_stale_while_updating = false }
    }
  }

  rules {
    description = "live state burst absorber (5s edge, 60s SWR)"
    expression  = "(http.request.uri.path in {\"/brain\" \"/visitors\" \"/persist\" \"/learning\" \"/report\" \"/gold\" \"/metrics\"})"
    action      = "set_cache_settings"
    action_parameters {
      cache = true
      edge_ttl    { mode = "override_origin" default = 5 }
      browser_ttl { mode = "override_origin" default = 0 }
      serve_stale { disable_stale_while_updating = false }
    }
  }

  rules {
    description = "mutations bypass cache"
    expression  = "(http.request.method in {\"POST\" \"PUT\" \"PATCH\" \"DELETE\"}) or (http.request.uri.path in {\"/execute\" \"/scan\" \"/feedback\" \"/teach\" \"/persist/save\" \"/network/switch\" \"/codebase/sync\" \"/emergency-lockdown\"}) or starts_with(http.request.uri.path, \"/heal/\")"
    action      = "set_cache_settings"
    action_parameters { cache = false }
  }
}

# ── WAF rate limiting ──────────────────────────────────────────────────────────
resource "cloudflare_ruleset" "saib_ratelimit" {
  zone_id = var.zone_id
  name    = "SAIB rate limits"
  kind    = "zone"
  phase   = "http_ratelimit"

  rules {
    description = "GET burst per IP — 1000 req/min, challenge on exceed"
    expression  = "(http.request.method eq \"GET\")"
    action      = "managed_challenge"
    ratelimit {
      characteristics     = ["ip.src"]
      period              = 60
      requests_per_period = 1000
      mitigation_timeout  = 60
    }
  }

  rules {
    description = "Mutation flood — 60 req/min, block on exceed"
    expression  = "(http.request.method ne \"GET\")"
    action      = "block"
    ratelimit {
      characteristics     = ["ip.src"]
      period              = 60
      requests_per_period = 60
      mitigation_timeout  = 600
    }
  }
}

# ── Managed WAF: enable Cloudflare + OWASP ─────────────────────────────────────
resource "cloudflare_ruleset" "saib_waf" {
  zone_id = var.zone_id
  name    = "SAIB WAF managed"
  kind    = "zone"
  phase   = "http_request_firewall_managed"

  rules {
    description = "Enable Cloudflare managed ruleset"
    expression  = "true"
    action      = "execute"
    action_parameters {
      id = "efb7b8c949ac4650a09736fc376e9aee"   # Cloudflare Managed Ruleset
    }
  }

  rules {
    description = "Enable OWASP Core ruleset"
    expression  = "true"
    action      = "execute"
    action_parameters {
      id = "4814384a9e5d4991b9815dcfc25d2f1f"   # OWASP Core Ruleset
    }
  }
}
