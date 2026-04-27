#!/usr/bin/env bash
# tx-monitor.sh — Poll a Pi Testnet/Mainnet account for new transactions.
#
# Usage:
#   ACCOUNT=GA6Z5... ./scripts/tx-monitor.sh
#
# Env:
#   ACCOUNT          (required) public key to watch
#   HORIZON_URL      default https://api.testnet.minepi.com
#   POLL_SECONDS     default 30
#   WEBHOOK_URL      optional — POSTs JSON {hash, source, created_at, account} on each new tx
#                    works with Discord, Slack incoming webhooks, ntfy.sh, generic HTTP
#   STATE_FILE       default /tmp/pi-tx-monitor.<account>.last
#                    stores the last seen tx hash so restarts don't re-alert
#   QUIET            "1" to skip stdout logging (only webhook)
#
# Exit on Ctrl-C; designed to run forever (use launchd plist for daemon mode).

set -u

ACCOUNT="${ACCOUNT:-}"
HORIZON_URL="${HORIZON_URL:-https://api.testnet.minepi.com}"
POLL_SECONDS="${POLL_SECONDS:-30}"
WEBHOOK_URL="${WEBHOOK_URL:-}"
QUIET="${QUIET:-0}"

if [[ -z "$ACCOUNT" ]]; then
  echo "ERROR: set ACCOUNT=G..." >&2
  exit 1
fi

STATE_FILE="${STATE_FILE:-/tmp/pi-tx-monitor.${ACCOUNT}.last}"

log() {
  [[ "$QUIET" == "1" ]] && return 0
  echo "[$(date -u +%FT%TZ)] $*"
}

notify() {
  local hash="$1" source="$2" created="$3" type="$4"
  log "NEW TX  hash=${hash:0:12}…  src=${source:0:8}…  type=${type}  at=${created}"
  if [[ -n "$WEBHOOK_URL" ]]; then
    local payload
    payload=$(printf '{"account":"%s","hash":"%s","source":"%s","created_at":"%s","type":"%s","horizon":"%s/transactions/%s"}' \
      "$ACCOUNT" "$hash" "$source" "$created" "$type" "$HORIZON_URL" "$hash")
    # Discord webhooks expect {"content": "..."} — wrap if URL looks like discord
    if [[ "$WEBHOOK_URL" == *"discord"* ]]; then
      local msg
      msg=$(printf '🔔 Pi tx on %s\\nhash: %s\\nsrc: %s\\ntype: %s\\nat: %s\\n%s/transactions/%s' \
        "${ACCOUNT:0:10}…" "$hash" "${source:0:10}…" "$type" "$created" "$HORIZON_URL" "$hash")
      payload=$(printf '{"content":"%s"}' "$msg")
    fi
    curl -s -X POST -H "Content-Type: application/json" -d "$payload" "$WEBHOOK_URL" >/dev/null \
      || log "  (webhook POST failed)"
  fi
}

last_seen=""
[[ -f "$STATE_FILE" ]] && last_seen="$(cat "$STATE_FILE" 2>/dev/null || true)"

log "watching $ACCOUNT on $HORIZON_URL (poll=${POLL_SECONDS}s, webhook=${WEBHOOK_URL:+yes})"
[[ -n "$last_seen" ]] && log "resuming from last seen tx ${last_seen:0:12}…"

while true; do
  resp=$(curl -fsS --max-time 15 \
    "$HORIZON_URL/accounts/$ACCOUNT/transactions?order=desc&limit=10" 2>/dev/null) || {
    log "  (horizon fetch failed; retrying in ${POLL_SECONDS}s)"
    sleep "$POLL_SECONDS"
    continue
  }

  # Parse newest tx; if none, skip
  newest_hash=$(printf '%s' "$resp" | jq -r '._embedded.records[0].hash // empty')
  if [[ -z "$newest_hash" ]]; then
    sleep "$POLL_SECONDS"; continue
  fi

  if [[ -z "$last_seen" ]]; then
    # first run: just record current head, don't alert on history
    last_seen="$newest_hash"
    echo "$last_seen" > "$STATE_FILE"
    log "initial head=${newest_hash:0:12}…  (will alert on anything newer)"
    sleep "$POLL_SECONDS"; continue
  fi

  if [[ "$newest_hash" == "$last_seen" ]]; then
    sleep "$POLL_SECONDS"; continue
  fi

  # walk records from newest until we hit last_seen, alerting in chronological order
  new_hashes=$(printf '%s' "$resp" | jq -r --arg cutoff "$last_seen" '
    ._embedded.records
    | map(select(.hash != $cutoff))
    | reverse
    | .[]
    | "\(.hash)|\(.source_account)|\(.created_at)|\(.fee_account // .source_account)"
  ')

  # If last_seen wasn't in the page (>10 new txs since last poll), only the page is alerted.
  while IFS='|' read -r h src ts _; do
    [[ -z "$h" ]] && continue
    notify "$h" "$src" "$ts" "tx"
  done <<<"$new_hashes"

  last_seen="$newest_hash"
  echo "$last_seen" > "$STATE_FILE"
  sleep "$POLL_SECONDS"
done
