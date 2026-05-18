#!/usr/bin/env bash
set -euo pipefail

# Disable blanking and power management so the scoreboard stays visible.
xset s off
xset -dpms
xset s noblank

# Hide cursor when idle; ignored if unclutter is not installed.
if command -v unclutter >/dev/null 2>&1; then
  unclutter -idle 0.2 -root &
fi

URL="http://localhost/?mode=kiosk"
CHROMIUM_BIN=""

if command -v chromium-browser >/dev/null 2>&1; then
  CHROMIUM_BIN="$(command -v chromium-browser)"
elif command -v chromium >/dev/null 2>&1; then
  CHROMIUM_BIN="$(command -v chromium)"
else
  echo "Chromium not found (expected chromium-browser or chromium)." >&2
  exit 1
fi

exec "$CHROMIUM_BIN" \
  --kiosk \
  --noerrdialogs \
  --disable-translate \
  --overscroll-history-navigation=0 \
  --disable-session-crashed-bubble \
  --incognito \
  "$URL"
