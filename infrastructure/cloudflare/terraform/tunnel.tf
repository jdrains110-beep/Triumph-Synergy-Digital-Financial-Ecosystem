# Cloudflare Tunnel — securely connect origin to Cloudflare without inbound ports
# `cloudflared tunnel create triumph-saib` creates the tunnel + credentials json

resource "cloudflare_tunnel" "saib" {
  account_id = var.account_id
  name       = "triumph-saib"
  secret     = base64encode(random_password.tunnel_secret.result)
}

resource "random_password" "tunnel_secret" {
  length  = 64
  special = false
}

# Route all hostnames to the tunnel's ingress
resource "cloudflare_tunnel_config" "saib" {
  account_id = var.account_id
  tunnel_id  = cloudflare_tunnel.saib.id

  config {
    ingress_rule {
      hostname = var.domain
      service  = var.origin_url
      origin_request {
        connect_timeout      = "10s"
        tls_timeout          = "10s"
        no_happy_eyeballs    = false
        keep_alive_timeout   = "1m30s"
        keep_alive_connections = 100
        http2_origin         = true
      }
    }
    ingress_rule {
      service = "http_status:404"
    }
  }
}

# DNS record pointing the domain at the tunnel
resource "cloudflare_record" "saib" {
  zone_id = var.zone_id
  name    = var.domain
  type    = "CNAME"
  value   = "${cloudflare_tunnel.saib.id}.cfargotunnel.com"
  proxied = true
  ttl     = 1
}

variable "account_id" { type = string }

output "tunnel_token" {
  value     = cloudflare_tunnel.saib.tunnel_token
  sensitive = true
}
