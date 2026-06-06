#!/usr/bin/env bash
# =============================================================================
# Triumph Synergy — Email DNS Setup (Cloudflare Email Routing)
# Domain:  triumphsynergy.com
# Forward: @triumphsynergy.com → jdrains110@gmail.com
#
# Usage:
#   export CLOUDFLARE_API_TOKEN="your_token_here"
#   bash scripts/setup-email-dns.sh
#
# Get token at: https://dash.cloudflare.com/profile/api-tokens
# Required token permissions:
#   Zone → DNS → Edit
#   Zone → Email Routing → Edit
#   (Zone Resource: Include → triumphsynergy.com)
# =============================================================================

set -euo pipefail

DOMAIN="triumphsynergy.com"
ACCOUNT_ID="5d6f808f4561a69a80490838b28cd9ed"
FORWARD_TO="jdrains110@gmail.com"

# ─── Check token ─────────────────────────────────────────────────────────────
if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "❌ CLOUDFLARE_API_TOKEN is not set."
  echo ""
  echo "1. Go to: https://dash.cloudflare.com/profile/api-tokens"
  echo "2. Create Token → Use template: Edit zone DNS"
  echo "3. Add permission: Zone → Email Routing → Edit"
  echo "4. Set Zone Resource: Include → triumphsynergy.com"
  echo "5. Copy the token and run:"
  echo "   export CLOUDFLARE_API_TOKEN='YOUR_TOKEN'"
  echo "   bash scripts/setup-email-dns.sh"
  exit 1
fi

CF="https://api.cloudflare.com/client/v4"
HDR=(-H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" -H "Content-Type: application/json")

echo "🔑 Cloudflare Email DNS Setup — ${DOMAIN}"
echo "================================================"

# ─── Get Zone ID ─────────────────────────────────────────────────────────────
echo "⏳ Fetching zone ID for ${DOMAIN}..."
ZONE_RESP=$(curl -sf "${CF}/zones?name=${DOMAIN}&account.id=${ACCOUNT_ID}" "${HDR[@]}")
ZONE_ID=$(echo "$ZONE_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin)['result']; print(d[0]['id'] if d else '')" 2>/dev/null || echo "")

if [[ -z "$ZONE_ID" ]]; then
  echo "❌ Could not find zone for ${DOMAIN}."
  echo "   Make sure the domain is added to your Cloudflare account and the token has access."
  exit 1
fi
echo "✅ Zone ID: ${ZONE_ID}"
echo ""

# ─── Helper ──────────────────────────────────────────────────────────────────
add_record() {
  local TYPE="$1" NAME="$2" CONTENT="$3" PRIORITY="${4:-}" TTL=1
  local BODY
  if [[ -n "$PRIORITY" ]]; then
    BODY="{\"type\":\"${TYPE}\",\"name\":\"${NAME}\",\"content\":\"${CONTENT}\",\"priority\":${PRIORITY},\"ttl\":${TTL},\"proxied\":false}"
  else
    BODY="{\"type\":\"${TYPE}\",\"name\":\"${NAME}\",\"content\":\"${CONTENT}\",\"ttl\":${TTL},\"proxied\":false}"
  fi

  RESP=$(curl -sf -X POST "${CF}/zones/${ZONE_ID}/dns_records" "${HDR[@]}" -d "$BODY" 2>&1 || true)
  if echo "$RESP" | grep -q '"success":true'; then
    echo "  ✅ ${TYPE} ${NAME} → ${CONTENT}"
  elif echo "$RESP" | grep -qi "already exists\|duplicate"; then
    echo "  ℹ️  ${TYPE} ${NAME} already exists (skipped)"
  else
    echo "  ⚠️  ${TYPE} ${NAME} — $(echo "$RESP" | python3 -c "import sys,json; e=json.load(sys.stdin).get('errors',[]); print(e[0]['message'] if e else 'unknown error')" 2>/dev/null || echo "$RESP")"
  fi
}

# ─── Step 1: MX Records (Cloudflare Email Routing) ───────────────────────────
echo "📬 Step 1: Adding MX records (Cloudflare Email Routing)..."
add_record MX "@" "route1.mx.cloudflare.net" 10
add_record MX "@" "route2.mx.cloudflare.net" 20
add_record MX "@" "route3.mx.cloudflare.net" 30
echo ""

# ─── Step 2: SPF Record ──────────────────────────────────────────────────────
echo "🛡️  Step 2: Adding SPF record..."
add_record TXT "@" "v=spf1 include:_spf.mx.cloudflare.net ~all"
echo ""

# ─── Step 3: DMARC Record ────────────────────────────────────────────────────
echo "🔒 Step 3: Adding DMARC record..."
# p=quarantine to start (safe); upgrade to p=reject after monitoring reports
add_record TXT "_dmarc" "v=DMARC1; p=quarantine; rua=mailto:admin@${DOMAIN}; ruf=mailto:admin@${DOMAIN}; sp=quarantine; adkim=r; aspf=r; pct=100; fo=1"
echo ""

# ─── Step 4: Enable Cloudflare Email Routing ─────────────────────────────────
echo "⚙️  Step 4: Enabling Cloudflare Email Routing..."
ENABLE_RESP=$(curl -sf -X POST "${CF}/zones/${ZONE_ID}/email/routing/enable" "${HDR[@]}" -d '{}' 2>&1 || true)
if echo "$ENABLE_RESP" | grep -q '"success":true\|already enabled\|enabled'; then
  echo "  ✅ Email Routing enabled"
else
  echo "  ℹ️  Email Routing status: $(echo "$ENABLE_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('result',{}).get('status','unknown'))" 2>/dev/null || echo "check dashboard")"
fi
echo ""

# ─── Step 5: Verify destination address ──────────────────────────────────────
echo "📨 Step 5: Adding destination address ${FORWARD_TO}..."
DEST_RESP=$(curl -sf -X POST "${CF}/accounts/${ACCOUNT_ID}/email/routing/addresses" "${HDR[@]}" \
  -d "{\"email\":\"${FORWARD_TO}\"}" 2>&1 || true)
if echo "$DEST_RESP" | grep -q '"success":true'; then
  echo "  ✅ Destination added: ${FORWARD_TO}"
  echo "  📧 CHECK YOUR GMAIL — Cloudflare sent a verification email."
  echo "     You MUST click the verify link before routing will work."
elif echo "$DEST_RESP" | grep -qi "already exists"; then
  echo "  ℹ️  Destination already exists: ${FORWARD_TO}"
else
  echo "  ⚠️  $(echo "$DEST_RESP" | python3 -c "import sys,json; e=json.load(sys.stdin).get('errors',[]); print(e[0]['message'] if e else 'check dashboard')" 2>/dev/null)"
fi
echo ""

# ─── Step 6: Create catch-all routing rule ───────────────────────────────────
echo "🔀 Step 6: Creating routing rules..."

create_rule() {
  local MATCH_TYPE="$1" MATCH_VALUE="$2" ACTION_VALUE="$3" NAME="$4"
  local BODY
  if [[ "$MATCH_TYPE" == "all" ]]; then
    BODY="{\"name\":\"${NAME}\",\"enabled\":true,\"matchers\":[{\"type\":\"all\"}],\"actions\":[{\"type\":\"forward\",\"value\":[\"${ACTION_VALUE}\"]}]}"
  else
    BODY="{\"name\":\"${NAME}\",\"enabled\":true,\"matchers\":[{\"type\":\"literal\",\"field\":\"to\",\"value\":\"${MATCH_VALUE}\"}],\"actions\":[{\"type\":\"forward\",\"value\":[\"${ACTION_VALUE}\"]}]}"
  fi
  RESP=$(curl -sf -X POST "${CF}/zones/${ZONE_ID}/email/routing/rules" "${HDR[@]}" -d "$BODY" 2>&1 || true)
  if echo "$RESP" | grep -q '"success":true'; then
    echo "  ✅ Rule: ${NAME}"
  elif echo "$RESP" | grep -qi "already exists\|duplicate"; then
    echo "  ℹ️  Rule already exists: ${NAME}"
  else
    echo "  ⚠️  Rule ${NAME}: $(echo "$RESP" | python3 -c "import sys,json; e=json.load(sys.stdin).get('errors',[]); print(e[0]['message'] if e else 'check dashboard')" 2>/dev/null)"
  fi
}

create_rule "literal" "jeremiah@${DOMAIN}"  "$FORWARD_TO"  "jeremiah → gmail"
create_rule "literal" "admin@${DOMAIN}"     "$FORWARD_TO"  "admin → gmail"
create_rule "literal" "saib@${DOMAIN}"      "$FORWARD_TO"  "saib → gmail"
create_rule "literal" "support@${DOMAIN}"   "$FORWARD_TO"  "support → gmail"
create_rule "literal" "info@${DOMAIN}"      "$FORWARD_TO"  "info → gmail"
create_rule "literal" "dmarc@${DOMAIN}"     "$FORWARD_TO"  "dmarc reports → gmail"
create_rule "all"     ""                    "$FORWARD_TO"  "catch-all → gmail"
echo ""

# ─── Step 7: DKIM ────────────────────────────────────────────────────────────
echo "🔐 Step 7: DKIM..."
echo "  ℹ️  Cloudflare Email Routing signs forwarded mail with Cloudflare's DKIM automatically."
echo "     No manual DKIM record needed for routing."
echo "     (If you later send FROM this domain via SMTP, add your provider's DKIM key.)"
echo ""

# ─── Summary ─────────────────────────────────────────────────────────────────
echo "================================================"
echo "✅ EMAIL DNS SETUP COMPLETE"
echo ""
echo "  Domain:   ${DOMAIN}"
echo "  Forward:  *@${DOMAIN} → ${FORWARD_TO}"
echo ""
echo "  DNS Records added:"
echo "    MX  @  route1.mx.cloudflare.net  (priority 10)"
echo "    MX  @  route2.mx.cloudflare.net  (priority 20)"
echo "    MX  @  route3.mx.cloudflare.net  (priority 30)"
echo "    TXT @  v=spf1 include:_spf.mx.cloudflare.net ~all"
echo "    TXT _dmarc  v=DMARC1; p=quarantine; ..."
echo ""
echo "  Email addresses active:"
echo "    jeremiah@${DOMAIN}  → ${FORWARD_TO}"
echo "    admin@${DOMAIN}     → ${FORWARD_TO}"
echo "    saib@${DOMAIN}      → ${FORWARD_TO}"
echo "    support@${DOMAIN}   → ${FORWARD_TO}"
echo "    info@${DOMAIN}      → ${FORWARD_TO}"
echo "    *@${DOMAIN}         → ${FORWARD_TO} (catch-all)"
echo ""
echo "  ⚠️  ACTION REQUIRED:"
echo "    1. Check ${FORWARD_TO} for a Cloudflare verification email"
echo "    2. Click 'Verify email address' in that email"
echo "    3. After verification, routing goes live immediately"
echo ""
echo "  📊 Monitor DMARC reports at: https://dash.cloudflare.com/${ACCOUNT_ID}/${DOMAIN}/email/routing"
echo "  🔐 Upgrade DMARC p=quarantine → p=reject after 1 week of clean reports"
echo "================================================"
