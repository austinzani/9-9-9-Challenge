#!/usr/bin/env bash
set -euo pipefail

# Local operations helper for running the 9-9-9 stack on macOS.
# This intentionally avoids systemd/udev assumptions from the Pi deployment.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

DEFAULT_VENV_DIR="${HOME}/.venvs/999-challenge"
DEFAULT_DB_PATH="${REPO_ROOT}/data/999-local.sqlite"
DEFAULT_DIST_DIR="${REPO_ROOT}/apps/scoreboard-web/dist"
DEFAULT_HOST="127.0.0.1"
DEFAULT_PORT="8001"
DEFAULT_LOCAL_URL="http://127.0.0.1:8001/?mode=kiosk"

log() {
  printf '[local-mac] %s\n' "$*"
}

die() {
  printf '[local-mac] ERROR: %s\n' "$*" >&2
  exit 1
}

usage() {
  cat <<'USAGE'
Usage:
  ./scripts/local-mac.sh setup [--venv-dir PATH] [--skip-node] [--skip-python]
  ./scripts/local-mac.sh readers
  ./scripts/local-mac.sh run [OPTIONS]

Run options:
  --venv-dir PATH        Python venv directory (default: ~/.venvs/999-challenge)
  --db-path PATH         SQLite file path (default: data/999-local.sqlite)
  --host HOST            API bind host (default: 127.0.0.1)
  --port PORT            API port (default: 8001)
  --dist-dir PATH        Built frontend dist directory
  --local-url URL        Kiosk URL (default: http://127.0.0.1:8001/?mode=kiosk)
  --with-kiosk           Open kiosk browser on launch
  --with-nfc             Start NFC daemon alongside API
  --hotdog-device VALUE  Reader device (tty connection string or /dev/cu.usbserial-*)
  --beer-device VALUE    Reader device (tty connection string or /dev/cu.usbserial-*)
  --no-disable-mlb       Enable MLB poller locally (disabled by default for offline runs)

Examples:
  ./scripts/local-mac.sh setup
  ./scripts/local-mac.sh readers
  ./scripts/local-mac.sh run --with-kiosk
  ./scripts/local-mac.sh run --with-nfc --hotdog-device /dev/cu.usbserial-120 --beer-device /dev/cu.usbserial-121
USAGE
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

path_has_colon() {
  local physical
  physical="$(cd "${REPO_ROOT}" && pwd -P)"
  [[ "${physical}" == *:* ]]
}

ensure_dist_or_build() {
  local dist_dir="$1"
  if [[ -f "${dist_dir}/index.html" ]]; then
    return 0
  fi

  if path_has_colon; then
    die "Missing frontend dist at ${dist_dir}. This repo path contains ':' so pnpm script builds fail. Move/clone to a path without ':' and run 'pnpm build'."
  fi

  log "Building frontend dist because ${dist_dir}/index.html is missing..."
  (
    cd "${REPO_ROOT}"
    pnpm build
  )
}

discover_usbserial_ports() {
  local ports=()
  local entry

  shopt -s nullglob
  for entry in /dev/cu.usbserial-* /dev/tty.usbserial-*; do
    ports+=("${entry}")
  done
  shopt -u nullglob

  if [[ "${#ports[@]}" -eq 0 ]]; then
    return 1
  fi

  printf '%s\n' "${ports[@]}" | awk '!seen[$0]++' | sort
}

print_reader_candidates() {
  local index=1
  local found_any=0
  local port

  while IFS= read -r port; do
    found_any=1
    printf '%d. %s\n' "${index}" "${port}"
    index=$((index + 1))
  done < <(discover_usbserial_ports || true)

  if [[ "${found_any}" -eq 0 ]]; then
    log "No /dev/cu.usbserial-* or /dev/tty.usbserial-* devices are visible."
    log "Plug in readers and confirm any required USB-serial driver is installed."
  fi
}

to_connection_string() {
  local raw="$1"
  case "${raw}" in
    tty:*)
      printf '%s\n' "${raw}"
      ;;
    /dev/cu.usbserial-*)
      printf 'tty:%s:pn532\n' "${raw#/dev/cu.}"
      ;;
    /dev/tty.usbserial-*)
      printf 'tty:%s:pn532\n' "${raw#/dev/tty.}"
      ;;
    *)
      die "Unsupported reader value '${raw}'. Use tty:<port>:pn532 or /dev/cu.usbserial-*."
      ;;
  esac
}

wait_for_api() {
  local url="$1"
  local attempts=80
  local count=0
  while [[ "${count}" -lt "${attempts}" ]]; do
    if curl -fsS "${url}" >/dev/null 2>&1; then
      return 0
    fi
    sleep 0.25
    count=$((count + 1))
  done
  return 1
}

open_kiosk() {
  local url="$1"
  local app
  local apps=(
    "Google Chrome"
    "Chromium"
    "Microsoft Edge"
    "Brave Browser"
  )

  for app in "${apps[@]}"; do
    if open -Ra "${app}" >/dev/null 2>&1; then
      log "Opening ${url} in kiosk mode via ${app}..."
      open -na "${app}" --args --kiosk --noerrdialogs --disable-session-crashed-bubble "${url}" >/dev/null 2>&1 || true
      return 0
    fi
  done

  die "No supported kiosk browser found. Install Google Chrome, Chromium, Edge, or Brave."
}

setup_local() {
  local venv_dir="${DEFAULT_VENV_DIR}"
  local skip_node=0
  local skip_python=0

  while [[ "${#}" -gt 0 ]]; do
    case "$1" in
      --venv-dir)
        [[ "${#}" -ge 2 ]] || die "--venv-dir requires a value."
        venv_dir="$2"
        shift 2
        ;;
      --skip-node)
        skip_node=1
        shift
        ;;
      --skip-python)
        skip_python=1
        shift
        ;;
      -h|--help)
        usage
        return 0
        ;;
      *)
        die "Unknown setup option: $1"
        ;;
    esac
  done

  require_cmd python3

  if [[ "${skip_node}" -eq 0 ]]; then
    require_cmd node
    require_cmd corepack
    log "Enabling corepack and installing workspace dependencies..."
    (
      cd "${REPO_ROOT}"
      corepack enable
      corepack pnpm install --frozen-lockfile
    )

    if path_has_colon; then
      log "Skipping pnpm build: repo path contains ':' which breaks pnpm script PATH handling."
      log "If you need fresh frontend builds, move/clone this repo to a path without ':'."
    else
      log "Building frontend bundle..."
      (
        cd "${REPO_ROOT}"
        pnpm build
      )
    fi
  fi

  if [[ "${skip_python}" -eq 0 ]]; then
    log "Preparing Python venv at ${venv_dir}..."
    mkdir -p "$(dirname "${venv_dir}")"
    if [[ ! -x "${venv_dir}/bin/python" ]]; then
      python3 -m venv "${venv_dir}"
    fi
    "${venv_dir}/bin/python" -m pip install --upgrade pip
    (
      cd "${REPO_ROOT}"
      "${venv_dir}/bin/pip" install -e './pi[dev]'
    )
  fi

  log "Setup complete."
  log "Next: ./scripts/local-mac.sh run --with-kiosk"
}

run_local() {
  local venv_dir="${DEFAULT_VENV_DIR}"
  local db_path="${DEFAULT_DB_PATH}"
  local host="${DEFAULT_HOST}"
  local port="${DEFAULT_PORT}"
  local dist_dir="${DEFAULT_DIST_DIR}"
  local local_url="${DEFAULT_LOCAL_URL}"
  local local_url_overridden=0
  local with_kiosk=0
  local with_nfc=0
  local disable_mlb_poller=1
  local hotdog_device=""
  local beer_device=""
  local hotdog_conn=""
  local beer_conn=""
  local api_pid=""
  local nfc_pid=""

  while [[ "${#}" -gt 0 ]]; do
    case "$1" in
      --venv-dir)
        [[ "${#}" -ge 2 ]] || die "--venv-dir requires a value."
        venv_dir="$2"
        shift 2
        ;;
      --db-path)
        [[ "${#}" -ge 2 ]] || die "--db-path requires a value."
        db_path="$2"
        shift 2
        ;;
      --host)
        [[ "${#}" -ge 2 ]] || die "--host requires a value."
        host="$2"
        shift 2
        ;;
      --port)
        [[ "${#}" -ge 2 ]] || die "--port requires a value."
        port="$2"
        shift 2
        ;;
      --dist-dir)
        [[ "${#}" -ge 2 ]] || die "--dist-dir requires a value."
        dist_dir="$2"
        shift 2
        ;;
      --local-url)
        [[ "${#}" -ge 2 ]] || die "--local-url requires a value."
        local_url="$2"
        local_url_overridden=1
        shift 2
        ;;
      --with-kiosk)
        with_kiosk=1
        shift
        ;;
      --with-nfc)
        with_nfc=1
        shift
        ;;
      --hotdog-device)
        [[ "${#}" -ge 2 ]] || die "--hotdog-device requires a value."
        hotdog_device="$2"
        shift 2
        ;;
      --beer-device)
        [[ "${#}" -ge 2 ]] || die "--beer-device requires a value."
        beer_device="$2"
        shift 2
        ;;
      --no-disable-mlb)
        disable_mlb_poller=0
        shift
        ;;
      -h|--help)
        usage
        return 0
        ;;
      *)
        die "Unknown run option: $1"
        ;;
    esac
  done

  require_cmd curl
  require_cmd open

  if [[ "${local_url_overridden}" -eq 0 ]]; then
    local_url="http://${host}:${port}/?mode=kiosk"
  fi

  if [[ ! -x "${venv_dir}/bin/uvicorn" ]]; then
    die "Missing uvicorn at ${venv_dir}/bin/uvicorn. Run './scripts/local-mac.sh setup' first."
  fi
  if [[ ! -x "${venv_dir}/bin/python" ]]; then
    die "Missing python at ${venv_dir}/bin/python. Run './scripts/local-mac.sh setup' first."
  fi

  ensure_dist_or_build "${dist_dir}"
  mkdir -p "$(dirname "${db_path}")"

  cleanup() {
    local exit_code=$?

    if [[ -n "${nfc_pid}" ]] && kill -0 "${nfc_pid}" >/dev/null 2>&1; then
      kill "${nfc_pid}" >/dev/null 2>&1 || true
      wait "${nfc_pid}" >/dev/null 2>&1 || true
    fi
    if [[ -n "${api_pid}" ]] && kill -0 "${api_pid}" >/dev/null 2>&1; then
      kill "${api_pid}" >/dev/null 2>&1 || true
      wait "${api_pid}" >/dev/null 2>&1 || true
    fi

    exit "${exit_code}"
  }
  trap cleanup INT TERM EXIT

  log "Starting API on http://${host}:${port} (db: ${db_path})..."
  CHALLENGE_DB_PATH="${db_path}" \
  SCOREBOARD_DIST_DIR="${dist_dir}" \
  DISABLE_MLB_POLLER="${disable_mlb_poller}" \
    "${venv_dir}/bin/uvicorn" pi.api.main:app --host "${host}" --port "${port}" &
  api_pid=$!

  if ! wait_for_api "http://${host}:${port}/api/state"; then
    die "API did not become healthy on http://${host}:${port}/api/state"
  fi
  log "API is healthy."
  log "Frontend: http://${host}:${port}/"
  log "Admin:    http://${host}:${port}/admin"
  log "Kiosk:    ${local_url}"

  if [[ "${with_nfc}" -eq 1 ]]; then
    if [[ -z "${hotdog_device}" || -z "${beer_device}" ]]; then
      local discovered=()
      local port_path
      while IFS= read -r port_path; do
        discovered+=("${port_path}")
      done < <(discover_usbserial_ports || true)

      if [[ "${#discovered[@]}" -lt 2 ]]; then
        die "Need two readers for --with-nfc. Provide --hotdog-device and --beer-device explicitly, or plug in two usbserial readers."
      fi

      if [[ -z "${hotdog_device}" ]]; then
        hotdog_device="${discovered[0]}"
      fi
      if [[ -z "${beer_device}" ]]; then
        beer_device="${discovered[1]}"
      fi
    fi

    hotdog_conn="$(to_connection_string "${hotdog_device}")"
    beer_conn="$(to_connection_string "${beer_device}")"

    log "Starting NFC daemon..."
    log "  hotdog -> ${hotdog_conn}"
    log "  beer   -> ${beer_conn}"
    "${venv_dir}/bin/python" -m pi.nfc.main \
      --api-url "http://${host}:${port}/api/tap" \
      --heartbeat-url "http://${host}:${port}/api/nfc/heartbeat" \
      --hotdog-device "${hotdog_conn}" \
      --beer-device "${beer_conn}" &
    nfc_pid=$!
  fi

  if [[ "${with_kiosk}" -eq 1 ]]; then
    open_kiosk "${local_url}"
  fi

  log "Stack is running. Press Ctrl+C to stop."
  while true; do
    sleep 1
  done
}

main() {
  local command="${1:-}"
  if [[ -z "${command}" ]]; then
    usage
    exit 1
  fi
  shift

  case "${command}" in
    setup)
      setup_local "$@"
      ;;
    readers)
      print_reader_candidates
      ;;
    run)
      run_local "$@"
      ;;
    -h|--help|help)
      usage
      ;;
    *)
      die "Unknown command: ${command}"
      ;;
  esac
}

main "$@"
