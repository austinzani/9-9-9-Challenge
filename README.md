# 9-9-9 Challenge

React scoreboard + FastAPI + NFC stack for the Reds 9·9·9 challenge.

## Repo layout

- `apps/scoreboard-web/` — Vite/React scoreboard shell
- `packages/scoreboard-ui/` — shared scoreboard UI components
- `pi/api/` — FastAPI API + SQLite + WebSocket state fanout
- `pi/nfc/` — PN532 reader daemon
- `pi/systemd/` — systemd units for API, NFC, kiosk, and optional tunnel
- `infra/cloudflared/` — Cloudflare tunnel ingress template

## What is already working on this Pi

- Repo cloned to `/home/austinzani/9-9-9-Challenge`
- Node.js, npm, pnpm, and Python venv dependencies installed
- Frontend build passes (`pnpm build`)
- Frontend typecheck passes (`pnpm typecheck`)
- Frontend tests pass (`pnpm test`)
- Pi API tests pass (`python -m pytest pi/api/tests pi/tests`)

## Local setup

```bash
cd /home/austinzani/9-9-9-Challenge
pnpm install --frozen-lockfile
pnpm build
python3 -m venv .venv
. .venv/bin/activate
pip install -e './pi[dev]'
```

## Validation commands

```bash
cd /home/austinzani/9-9-9-Challenge
pnpm typecheck
pnpm test
. .venv/bin/activate
python -m pytest pi/api/tests pi/tests
```

## API service

The challenge API is intended to run on port `8001` so it does not collide with the existing `zani-pi` service on `8000`.

### Install / enable

```bash
sudo cp pi/systemd/999-api.service /etc/systemd/system/999-api.service
sudo systemctl daemon-reload
sudo systemctl enable --now 999-api
sudo systemctl status 999-api
```

### Quick smoke test

```bash
curl http://127.0.0.1:8001/api/state
```

## NFC daemon

The NFC daemon expects stable reader symlinks:

- `/dev/nfc-hotdog`
- `/dev/nfc-beer`

Before enabling `999-nfc.service`, confirm the physical USB-port mapping and install the udev rule:

```bash
sudo cp pi/udev/99-pn532.rules /etc/udev/rules.d/99-pn532.rules
sudo udevadm control --reload-rules
sudo udevadm trigger
ls -la /dev/nfc-hotdog /dev/nfc-beer
```

Then:

```bash
sudo cp pi/systemd/999-nfc.service /etc/systemd/system/999-nfc.service
sudo systemctl daemon-reload
sudo systemctl enable --now 999-nfc
sudo systemctl status 999-nfc
```

## Kiosk display

The kiosk launcher now opens `http://127.0.0.1:8001/?mode=kiosk` by default.

```bash
sudo cp pi/systemd/999-kiosk.service /etc/systemd/system/999-kiosk.service
sudo systemctl daemon-reload
sudo systemctl enable 999-kiosk
```

Start it once the Pi display/session is ready:

```bash
sudo systemctl start 999-kiosk
```

## Cloudflare / remote deployment

### Public tunnel / remote access

You have two options:

1. **Reuse the existing tunnel** in `~/.cloudflared/config.yml` and add ingress rules for:
   - `999.austinzani.dev -> http://localhost:8001` (public frontend + same-origin API)
   - `999-api.austinzani.dev -> http://localhost:8001` (optional direct API host)
2. **Create a dedicated tunnel** and use `infra/cloudflared/config.yml` + `pi/systemd/999-tunnel.service`

The tunnel should block:

- `/admin*`
- `/api/admin*`

from public access on both hosts.

### Remote web frontend

Because the FastAPI app already serves the built frontend from `/`, the simplest remote deployment is to expose the Pi app directly at:

- `https://999.austinzani.dev`

If you later move the frontend to Cloudflare Pages, the repo includes a config at `infra/deploy/cloudflare-pages.toml`.

Production frontend env for a separate static deployment:

```bash
VITE_API_BASE=https://999-api.austinzani.dev
```

## Remaining manual tasks before full deployment

1. Confirm which reader is HOTDOG vs BEER and replace the udev placeholders in `pi/udev/99-pn532.rules`
2. Install + enable `999-api.service`
3. Install + enable `999-nfc.service` after the udev symlinks exist
4. Install + enable `999-kiosk.service` on the Pi desktop session
5. Add Cloudflare ingress for `999.austinzani.dev` and optionally `999-api.austinzani.dev`
6. Verify the remote scoreboard at `https://999.austinzani.dev`
7. Verify a real end-to-end tap: NFC -> API -> WS -> local kiosk -> remote phone

## Current Pi-specific notes

- Existing `zani-pi` traffic already uses port `8000`
- Existing Cloudflare tunnel is `zani-pi`; you can extend it instead of starting a second tunnel
- Current USB serial readers appear as `/dev/ttyUSB0` and `/dev/ttyUSB1` with `idVendor=1a86` and `idProduct=7523`
