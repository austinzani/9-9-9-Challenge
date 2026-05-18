# 9·9·9 Challenge — Open Questions (Resolved)

> ✅ All questions resolved **2026-05-18**. Decisions have been propagated into [`999-Challenge-Implementation-PRD.md`](./999-Challenge-Implementation-PRD.md). This doc retains the full options + rationale for each decision in case any need to be revisited.

---

## Q1 — Canonical domain name

**Resolved: `austinzani.dev`.**

The prior PRD's `austinzany.dev` is treated as a typo. All references in the implementation PRD, QR codes, CORS allowlists, Cloudflare config, and kiosk footer use `austinzani.dev`. Public hostname: `999.austinzani.dev` (scoreboard frontend); API hostname: `api.999.austinzani.dev` (Pi via tunnel).

---

## Q2 — Pi → public internet path

**Resolved: Cloudflare Tunnel (`cloudflared`).**

The Pi opens an outbound connection to Cloudflare; no port forwarding, no Caddy TLS dance, no exposure of the home IP. `cloudflared` runs as `999-tunnel.service` under systemd. Beats port-forwarding for a one-shot party deploy: works on any LAN with no router config, survives ISP IP rotation, WS-friendly. The "Pi pushes to relay" option (Fly.io middleman) was rejected as unnecessary infra for a single-event tool.

---

## Q3 — Responsive scaling strategy

**Resolved: `?mode=kiosk` query param + CSS container queries with `clamp()` on `cqi` units.**

- Scoreboard root sets `container-type: inline-size`.
- Every scaling dimension uses `clamp(min, fluid, max)` against container-inline-percentage (`cqi`) — e.g. `font-size: clamp(22px, 3.2cqi, 84px)`.
- The `?mode=kiosk` param controls **layout-only** decisions (drop safe-area padding, hide QR, lock to viewport height). It does **not** participate in sizing math — CSS handles that continuously.
- Floor values = existing design pixel sizes (phone-perfect already). Ceiling values get verified on the actual TV during the dry run.

**Why this beat the alternatives:** no JS scale hook (less to break), no media-query breakpoints (smooth at all sizes), and the kiosk flag and the sizing system are decoupled — a TV streaming the remote URL (no kiosk param) still scales fluidly, it just keeps the QR + safe area.

**Verification protocol (still TBD, fill in during dry run):**
- TV resolution: _______
- Typical viewing distance: _______
- Acceptance: name + total visible from that distance without squinting.

---

## Q4 — Admin override for game state

**Resolved: REST endpoint in phase 2, admin UI form in phase 5.**

- Phase 2 ships `POST /api/admin/game` and `DELETE /api/admin/game` (re-enable polling). Hit via `curl` from a laptop.
- Phase 5 adds a thin form at `/admin/game` over the same endpoint.

Don't block phase 2 on UI work for a tool that's rarely touched. Worst case if MLB API breaks mid-game: `curl` from a laptop on the local network, takes 30 seconds.

---

## Q5 — Admin route protection

**Resolved: Loopback-only via Cloudflare Tunnel ingress.**

The tunnel exposes `api.999.austinzani.dev` but its ingress config explicitly blocks `/admin/*`. Admin access is:
- The Pi's HDMI/keyboard at `http://localhost/admin`, or
- An SSH-tunneled localhost from a laptop (`ssh -L 8000:localhost:8000 pi`).

Beats PIN auth (no UX overhead, no localStorage state to lose) and beats Tailscale (no extra tool to install). Doing nothing — leaving `/admin` open — was rejected because the public tunnel hostname is trivially discoverable once anyone shares the QR.

---

## Q6 — Frontend build tool

**Resolved: Vite + React + TypeScript.**

Produces a static bundle that deploys identically to:
- The Pi (FastAPI serves `apps/scoreboard-web/dist` at `/`), and
- Cloudflare Pages for the remote `999.austinzani.dev`.

Build-time env var (`VITE_API_BASE`) is the only thing that differs. Next.js was rejected — no SSR needs, no API routes (the Pi is the API), and static-export Next still ships more runtime than necessary. Sticking with in-browser Babel like the design handoff was rejected as too brittle past phase 1.

---

## Q7 — Kiosk-mode detection

**Resolved: `?mode=kiosk` query param appended by the kiosk launcher script.**

Pairs cleanly with the Q3 answer — the param controls layout-only switches (safe-area, QR visibility), while sizing is purely CSS. Explicit, no false positives. A TV streaming the remote URL doesn't accidentally lose its QR.

Rejected alternatives:
- Viewport-size detection — a TV streaming the remote URL would silently flip into kiosk mode.
- `localStorage` flag — doesn't survive a Chromium profile wipe.
- `matchMedia('(display-mode: kiosk)')` — uneven browser support, depends on Chromium launch flags anyway.

---

## Q8 — 9·9·9 completion celebration

**Resolved: Confetti + scoreboard flash, ≤2s, broadcast as a WS `celebration` event.**

When the FastAPI tap handler sees a participant's row transition to `hotdogs >= 9 && beers >= 9` for the first time, it broadcasts a `celebration` event with the participant's name. Every connected client fires the same ≤2s confetti + flash animation. Idempotent — each participant celebrates exactly once per event (tracked via an `event_meta` flag).

Full-screen takeover was rejected (blocks the room from watching the actual Reds game, awkward if two people finish 30s apart). Reds home-run horn audio is a phase-5 stretch if the Pi happens to have speakers wired in by game day, otherwise just the confetti.

---

## Q9 — NFC reader stations + USB port assignment

**Resolved: Top-two USB-A ports on the Pi — hot-dog left, beer right. Capture `devpath` during bench-test, commit the udev rule.**

During phase 2 bench-test:
1. Plug the hot-dog station's PN532 into the Pi's top-left USB-A port.
2. Plug the beer station's PN532 into the top-right.
3. Run `udevadm info -a -n /dev/ttyUSB0` and `udevadm info -a -n /dev/ttyUSB1`; capture each port's `ATTRS{devpath}` value.
4. Write those values into `pi/udev/99-pn532.rules` so the hot-dog reader is always `/dev/nfc-hotdog` and the beer reader is always `/dev/nfc-beer`, regardless of USB enumeration order at boot.

If enclosures end up routing cables to different ports, re-run the capture and update the rule — it's a 30-second fix. Enclosure-state question (built / in-progress / not built) is informational only and doesn't block software.

---

## Q10 — Post-event database archive

**Resolved: `POST /api/admin/archive` endpoint, run by hand the morning after.**

Endpoint snapshots the live SQLite file to `archive/999-<event-date>.sqlite`, then truncates `participants` and `taps`. No auto-archive on date-change (rejected because dev/test boots on different days would silently wipe state). The endpoint is part of the loopback-only `/admin` surface per Q5, so it's safe from internet-side fat-fingers.
