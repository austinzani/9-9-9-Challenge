#!/usr/bin/env bash
set -euo pipefail

# Local rehearsal helper for testing the full project on macOS before moving to Pi.
#
# Supports offline-style rehearsal by:
# - building the web bundle,
# - running FastAPI with MLB polling disabled,
# - seeding sample data without NFC hardware,
# - running backend/unit/e2e test suites.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BIN_DIR="${REPO_ROOT}/node_modules/.pnpm/node_modules/.bin"

log() {
  printf '[rehearsal] %s\n' "$*"
}

die() {
  printf '[rehearsal] ERROR: %s\n' "$*" >&2
  exit 1
}

usage() {
  cat <<'USAGE'
Usage:
  ./scripts/local-rehearsal.sh up
  ./scripts/local-rehearsal.sh seed
  ./scripts/local-rehearsal.sh tests
  ./scripts/local-rehearsal.sh all

Commands:
  up     Install deps, build web bundle, install Playwright Chromium, and start API locally.
  seed   Seed demo participants/taps + unknown UID flow against http://127.0.0.1:8000.
  tests  Run pytest, vitest snapshot tests, and Playwright e2e.
  all    Install/build and run tests (does not keep API running).
USAGE
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

require_workspace_bin() {
  local bin_name="$1"
  [[ -x "${BIN_DIR}/${bin_name}" ]] || die "Missing ${bin_name} binary at ${BIN_DIR}/${bin_name}. Run 'corepack pnpm install' first."
}

install_deps() {
  require_cmd corepack
  require_cmd node
  require_cmd python3

  log 'Installing workspace dependencies...'
  (
    cd "$REPO_ROOT"
    corepack pnpm install
  )
}

build_web_bundle() {
  require_workspace_bin vite

  log 'Building scoreboard web bundle (production mode)...'
  (
    cd "${REPO_ROOT}/apps/scoreboard-web"
    "${BIN_DIR}/vite" build --mode production
  )
}

install_playwright_chromium() {
  require_workspace_bin playwright

  log 'Ensuring Playwright Chromium binary is installed...'
  (
    cd "$REPO_ROOT"
    "${BIN_DIR}/playwright" install chromium
  )
}

start_api() {
  require_cmd python3

  log 'Starting API at http://127.0.0.1:8000 with DISABLE_MLB_POLLER=1'
  log 'Open these URLs:'
  log '  - http://127.0.0.1:8000/'
  log '  - http://127.0.0.1:8000/?mode=kiosk'
  log '  - http://127.0.0.1:8000/admin'

  (
    cd "$REPO_ROOT"
    DISABLE_MLB_POLLER=1 CHALLENGE_DB_PATH="${REPO_ROOT}/data/999.sqlite" \
      python3 -m uvicorn pi.api.main:app --host 127.0.0.1 --port 8000 --reload
  )
}

seed_demo_data() {
  require_cmd curl

  log 'Seeding demo participant data...'

  curl -sf -X POST http://127.0.0.1:8000/api/admin/force-register \
    -H 'Content-Type: application/json' \
    -d '{"uid":"A1","name":"Austin"}' >/dev/null

  curl -sf -X POST http://127.0.0.1:8000/api/admin/force-register \
    -H 'Content-Type: application/json' \
    -d '{"uid":"M1","name":"Maddie"}' >/dev/null

  curl -sf -X POST http://127.0.0.1:8000/api/tap \
    -H 'Content-Type: application/json' \
    -d '{"uid":"A1","station":"hotdog"}' >/dev/null

  curl -sf -X POST http://127.0.0.1:8000/api/tap \
    -H 'Content-Type: application/json' \
    -d '{"uid":"A1","station":"beer"}' >/dev/null

  curl -sf -X POST http://127.0.0.1:8000/api/tap \
    -H 'Content-Type: application/json' \
    -d '{"uid":"M1","station":"beer"}' >/dev/null

  log 'Triggering unknown-UID registration modal flow...'
  curl -sf -X POST http://127.0.0.1:8000/api/tap \
    -H 'Content-Type: application/json' \
    -d '{"uid":"NEWTAG1","station":"beer"}' >/dev/null

  log 'Sending one reader heartbeat so health pills can be verified...'
  curl -sf -X POST http://127.0.0.1:8000/api/nfc/heartbeat \
    -H 'Content-Type: application/json' \
    -d '{"station":"hotdog"}' >/dev/null

  log 'Seed complete. Refresh the scoreboard/admin pages.'
}

run_tests() {
  require_workspace_bin vitest
  require_workspace_bin playwright

  log 'Running Python API tests...'
  (
    cd "$REPO_ROOT"
    python3 -m pytest pi/api/tests pi/tests -q
  )

  log 'Running scoreboard UI snapshot tests...'
  (
    cd "$REPO_ROOT"
    "${BIN_DIR}/vitest" run --config packages/scoreboard-ui/vitest.config.ts
  )

  log 'Running Playwright e2e tests...'
  (
    cd "$REPO_ROOT"
    "${BIN_DIR}/playwright" test --config apps/scoreboard-web/playwright.config.ts
  )

  log 'All tests passed.'
}

command="${1:-up}"

case "$command" in
  up)
    install_deps
    build_web_bundle
    install_playwright_chromium
    start_api
    ;;
  seed)
    seed_demo_data
    ;;
  tests)
    install_deps
    install_playwright_chromium
    run_tests
    ;;
  all)
    install_deps
    build_web_bundle
    install_playwright_chromium
    run_tests
    ;;
  -h|--help|help)
    usage
    ;;
  *)
    usage
    die "Unknown command: $command"
    ;;
esac
