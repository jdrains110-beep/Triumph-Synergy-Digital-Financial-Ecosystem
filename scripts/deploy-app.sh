#!/usr/bin/env bash
# Triumph-Synergy — Permanent triumph-app deploy line
#
#   ./scripts/deploy-app.sh           # build + recreate + verify (default)
#   ./scripts/deploy-app.sh fast      # recreate only (skip build, fastest)
#   ./scripts/deploy-app.sh hard      # full rebuild without cache, then recreate
#   ./scripts/deploy-app.sh full      # bring up every compose service + rebuild app
#   ./scripts/deploy-app.sh status    # just print state, no changes
#
# All modes finish by polling /api/ecosystem/state and printing a green/red
# health summary so you always know whether triumph-app is live and the
# autonomous tick is reaching the cortex + sovereign mesh.
set -euo pipefail

# Make docker reachable when Code's terminal launches with a stripped PATH
export PATH=/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/Applications/Docker.app/Contents/Resources/bin:${PATH:-}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.override.yml)
APP_URL="${APP_URL:-http://localhost:3000}"
MODE="${1:-default}"

c_g() { printf "\033[32m%s\033[0m" "$1"; }
c_r() { printf "\033[31m%s\033[0m" "$1"; }
c_y() { printf "\033[33m%s\033[0m" "$1"; }
c_b() { printf "\033[36m%s\033[0m" "$1"; }
hr()  { printf '%s\n' "────────────────────────────────────────────────────────────────"; }

verify() {
  hr; echo "$(c_b '▶ verifying triumph-app …')"; hr
  local i
  for i in 1 2 3 4 5 6 7 8 9 10; do
    if curl -fsS --max-time 3 "$APP_URL/api/ecosystem/state" >/dev/null 2>&1; then break; fi
    printf "  waiting for app … %d/10\n" "$i"; sleep 5
  done
  local snap
  snap="$(curl -sS --max-time 6 "$APP_URL/api/ecosystem/state" 2>/dev/null || echo '{}')"

  echo "$snap" | jq -r '
    def color(c; s): "\u001b[" + c + "m" + s + "\u001b[0m";
    def yn(b): if b then color("32";"✓") else color("31";"✗") end;
    "  loop_running   : " + yn(.loop_running // false),
    "  v9_ok          : " + yn(.last.saib_v9.status_ok // false)
                          + "   actions=" + ((.last.saib_v9.actions_count // 0)|tostring),
    "  v43_ok         : " + yn(.last.saib_v43.status_ok // false),
    "  gcv_peg        : " + (.last.saib_v9.gcv_stats.gcv_peg_usd // "—"),
    "  sustainability : " + ((.last.saib_v9.gcv_stats.sustainability // "—")|tostring),
    "  ecosystem      : " + ((.last.ecosystem.services_up   // 0)|tostring) + "/"
                          + ((.last.ecosystem.services_total// 0)|tostring)
                          + "  health=" + ((.last.ecosystem.health_pct // 0)|tostring) + "%",
    "  errors         : " + ((.last.errors // [])|length|tostring),
    (.last.errors // [])[]? | "    • " + .'
  echo
  local down
  down="$(echo "$snap" | jq -r '.last.services[]? | select(.ok==false) | "    ✗ \(.container) [\(.status // "—")] \(.ms)ms"')"
  if [ -n "$down" ]; then
    echo "$(c_y '  services down:')"
    echo "$down"
  else
    echo "$(c_g '  all probed services up')"
  fi
  hr
}

# CPU-heavy containers that interfere with builds — pause during build, unpause after
HEAVY_CONTAINERS=(
  triumph-pi-mainnet-node
  triumph-apex-services
  triumph-settlement-core
  triumph-observability-stack
  triumph-quantum-intel-fortress
  triumph-sovereign-nano-saib
  triumph-governance-shield
  triumph-guardian-watchdog-nexus
)

pause_heavy() {
  hr; echo "$(c_y '▶ pausing heavy containers to free build CPU …')"; hr
  for c in "${HEAVY_CONTAINERS[@]}"; do
    docker pause "$c" 2>/dev/null && printf "  paused  %s\n" "$c" || true
  done
}

unpause_heavy() {
  hr; echo "$(c_b '▶ unpausing heavy containers …')"; hr
  for c in "${HEAVY_CONTAINERS[@]}"; do
    docker unpause "$c" 2>/dev/null && printf "  resumed %s\n" "$c" || true
  done
}

build_app() {
  pause_heavy
  hr; echo "$(c_b '▶ building triumph-app image …')"; hr
  DOCKER_BUILDKIT=1 "${COMPOSE[@]}" build app
  unpause_heavy
}

build_app_nocache() {
  pause_heavy
  hr; echo "$(c_b '▶ building triumph-app image (no cache) …')"; hr
  DOCKER_BUILDKIT=1 "${COMPOSE[@]}" build --no-cache app
  unpause_heavy
}

recreate_app() {
  hr; echo "$(c_b '▶ recreating triumph-app container …')"; hr
  pause_heavy
  "${COMPOSE[@]}" up -d --force-recreate --no-build --no-deps app
  # wait for app to serve HTTP before unpausing CPU hogs
  local i
  for i in $(seq 1 20); do
    sleep 3
    if curl -fsS --max-time 3 "${APP_URL}/" >/dev/null 2>&1; then break; fi
  done
  unpause_heavy
}

up_all() {
  hr; echo "$(c_b '▶ starting all compose services …')"; hr
  "${COMPOSE[@]}" up -d --no-build
}

case "$MODE" in
  status)
    verify
    ;;
  fast)
    recreate_app; verify
    ;;
  hard)
    build_app_nocache; recreate_app; verify
    ;;
  full)
    up_all; build_app; recreate_app; verify
    ;;
  default|"")
    build_app; recreate_app; verify
    ;;
  *)
    echo "usage: $0 [default|fast|hard|full|status]" >&2
    exit 2
    ;;
esac
