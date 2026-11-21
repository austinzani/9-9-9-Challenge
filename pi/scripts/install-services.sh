#!/usr/bin/env bash
set -euo pipefail

# Render the systemd unit templates in pi/systemd/ for this machine and install them.
#
#   sudo ./pi/scripts/install-services.sh            # api, nfc, kiosk
#   sudo ./pi/scripts/install-services.sh api tunnel # just these
#
# Placeholders filled in:
#   @APP_USER@  the account the services run as (APP_USER, else the user who ran sudo)
#   @APP_DIR@   this repo's absolute path
#   @APP_HOME@  that user's home directory
#   @APP_UID@   that user's numeric id
#
# Set SYSTEMD_DIR to render somewhere else (handy for checking the output).

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TEMPLATE_DIR="${APP_DIR}/pi/systemd"
SYSTEMD_DIR="${SYSTEMD_DIR:-/etc/systemd/system}"

APP_USER="${APP_USER:-${SUDO_USER:-$(id -un)}}"
APP_UID="$(id -u "${APP_USER}")"
APP_HOME="$(eval echo "~${APP_USER}")"

services=("$@")
if [[ "${#services[@]}" -eq 0 ]]; then
  services=(api nfc kiosk)
fi

for service in "${services[@]}"; do
  template="${TEMPLATE_DIR}/999-${service}.service"
  if [[ ! -f "${template}" ]]; then
    echo "Unknown service '${service}'. Choose from: api nfc kiosk tunnel." >&2
    exit 1
  fi
  if [[ "${service}" == "tunnel" && ! -f "${APP_DIR}/infra/cloudflared/config.yml" ]]; then
    echo "Missing infra/cloudflared/config.yml. Copy config.example.yml and fill it in first." >&2
    exit 1
  fi

  target="${SYSTEMD_DIR}/999-${service}.service"
  sed \
    -e "s|@APP_USER@|${APP_USER}|g" \
    -e "s|@APP_DIR@|${APP_DIR}|g" \
    -e "s|@APP_HOME@|${APP_HOME}|g" \
    -e "s|@APP_UID@|${APP_UID}|g" \
    "${template}" > "${target}"
  echo "Installed ${target} (user ${APP_USER}, repo ${APP_DIR})"
done

if [[ "${SYSTEMD_DIR}" == "/etc/systemd/system" ]]; then
  systemctl daemon-reload
  echo "Reloaded systemd. Enable with: sudo systemctl enable --now 999-<service>"
fi
