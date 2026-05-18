# 9·9·9 Challenge Implementation PRD

## Task Source
- Source: Freeform description from owner + design handoff bundle (`9-9-9 challenge-handoff.zip`) + prior vision doc (`999-challenge-prd.md`)
- Title: 9·9·9 Reds Game Challenge Tracker — local kiosk + remote web + Pi API
- URL: N/A
- Project / Milestone: Cincinnati Reds home game — **2026-05-31** (≈2 weeks from today, 2026-05-17)
- Last synced: 2026-05-18

> ✅ **Open questions resolved 2026-05-18.** Resolutions are listed in the [Open Questions (Resolved)](#open-questions-resolved) section below and propagated into the relevant scope sections. Full rationale for each decision lives in [`999-Challenge-Open-Questions.md`](./999-Challenge-Open-Questions.md).

---

## Problem Statement

We need a physical + digital party game tracker for the 9·9·9 challenge (9 hot dogs, 9 beers, 9 innings of Reds baseball). Participants tap an NFC-tagged coozie on one of two Raspberry-Pi-attached readers to log a hot dog or a beer. A scoreboard, designed to look like a Wrigley/Riverfront-style manual line score, runs in two places simultaneously:

1. **Local kiosk** — Pi-attached TV display next to the Reds game, big text visible across the room.
2. **Remote web** — participants and remote spectators load the scoreboard on their phones from anywhere with internet.

Both surfaces render the same React scoreboard and stay in real-time sync via the Pi-hosted API + WebSocket.

The design medium has been pre-decided (see handoff bundle). The remaining work is: pick the green/linescore variant, make it responsive (TV ↔ phone), and build the API + deployment plumbing so the remote site can reach the Pi safely.

---

## Goals

- One React scoreboard component that renders correctly at **phone width** (≈360–430px) **and** at **TV size** (1080p / 4K), with text size and spacing scaling up — not just stretching layout.
- Locked-in visual treatment: **green palette + linescore header** (the `TWEAK_DEFAULTS` shipped in `design-handoff/.../index.html`).
- Real NFC tap → score increment → leaderboard reorder visible on TV **and** every connected phone within ~1s.
- Remote participants reach the scoreboard via `999.austinzani.dev` from any phone browser, no install.
- Self-registration on first tap from any unknown UID.
- Zero ops on game day — Pi powers up, services autostart, TV shows kiosk, remote URL works.
- Database lives on the Pi (single source of truth). Cloud is a thin pipe, not a second store.

## Non-Goals

- Authentication, accounts, or login (it's a party).
- Multi-event history (one game, one DB file, archive after).
- Native mobile app.
- Undo / corrections UI (admin page only).
- Bet/wager tracking.
- Streaming reader logs / observability beyond stdout to journald.

---

## Current State (Repository Audit)

The repo currently contains only documents — **no code has been written yet.** This PRD defines a green-field build.

- `999-challenge-prd.md`: Original vision PRD. Established stack (FastAPI + SQLite + HTML/CSS/JS), hardware spec (Pi + 2× RC522 + NTAG215), MLB Stats API integration, schema, and basic endpoints. **This new PRD supersedes the visual/UI sections** but inherits the hardware/networking/data plumbing it laid out.
- `9-9-9 challenge-handoff.zip` (extracted to `design-handoff/`): Pixel-accurate React/JSX scoreboard prototype. The implementation MUST recreate the visual output of `design-handoff/9-9-9-challenge/project/scoreboard.jsx` exactly, using the `green` palette and `linescore` header variant.
- No `package.json`, no `pyproject.toml`, no source tree yet. We choose the structure.

> ❗ Domain spelling conflict: previous PRD used `999.austinzany.dev`. Owner verbally referenced `austinzani.dev`. Treating **`austinzani.dev`** as canonical. (See `Q1`.)

---

## Architecture and Ownership Plan

Two deployable artifacts plus a shared package, in one repo (monorepo, npm workspaces + a top-level `pi/` Python package):

```
9-9-9-challenge/
├── apps/
│   ├── scoreboard-web/        # Next.js (or Vite) app — built once, served two ways
│   └── admin-web/             # (optional, can be a route in scoreboard-web)
├── packages/
│   └── scoreboard-ui/         # Shared React components (Scoreboard, FlipNumber, icons, palettes)
├── pi/
│   ├── api/                   # FastAPI app (HTTP + WebSocket + SQLite)
│   ├── nfc/                   # NFC reader daemon (separate process, posts to api)
│   ├── systemd/               # *.service unit files
│   └── pyproject.toml
├── infra/
│   ├── caddy/                 # or cloudflared tunnel config
│   └── deploy/                # Vercel/Netlify project config for remote frontend
└── Planning Docs/             # This PRD + open questions
```

### Layer responsibilities

| Layer | Owns | Notes |
|---|---|---|
| `packages/scoreboard-ui` | All visual components — `Scoreboard`, `CompactGameCard`, `LinescoreCard`, `ParticipantRow`, `FlipNumber`, `HotdogIcon`, `BeerIcon`, `PALETTES`, `useRowFlip`. | Pure presentational. Receives `participants`, `game`, `tweaks`, `connectionState` as props. No fetch logic. Direct port of `scoreboard.jsx`, ditching the iOS device frame and Tweaks panel for production. |
| `apps/scoreboard-web` | Data layer: WebSocket client, REST fallback, registration modal, viewport detection ("kiosk" vs "phone" mode), service-worker for offline-resilience optional. | Same bundle deploys to **both** Pi (served from FastAPI as static files) **and** remote host (Vercel/Cloudflare Pages). Behavior differs only by environment variable for API base URL. |
| `pi/api` | FastAPI server: `GET /api/state`, `POST /api/register`, `POST /api/tap`, `WS /ws`, plus admin endpoints. Static-file serving of the built `scoreboard-web` bundle on `/`. SQLite read/write. MLB Stats API poller. WebSocket broadcaster. | Single source of truth. Runs as `999-api.service` under systemd. |
| `pi/nfc` | Two-reader RC522 polling loop. Debounce. POST taps to `127.0.0.1/api/tap`. | Runs as `999-nfc.service`. Restarts on failure with backoff. |
| `infra` | Domain config: `999.austinzani.dev` (kiosk + remote scoreboard) and `api.999.austinzani.dev` (Pi API + WebSocket). Cloudflare Tunnel preferred over port forwarding (no router/ISP exposure, no Caddy TLS dance). | Tunnel daemon (`cloudflared`) runs as `999-tunnel.service` on Pi. (See `Q2`.) |

---

## DRY and Reuse Plan

### Reuse from the design handoff

- **Port `scoreboard.jsx` verbatim into `packages/scoreboard-ui`.** Keep:
  - `PALETTES` object (drop `charcoal` and `brick` — green only, per owner direction). Keep the lookup pattern so a future palette swap is one entry.
  - `FlipNumber`, `useRowFlip`, `HotdogIcon`, `BeerIcon`, `InningArrow`, `LinescoreCard`, `ColumnHeader`, `ParticipantRow`, `Footer`, `Scoreboard`.
  - Drop: `CompactGameCard` (we're committing to linescore — but keep the file/export so it's recoverable if owner changes mind at game-day).
  - Drop: `TweaksPanel`, `IOSDevice`, `TweakRadio`, etc. — design-tool scaffolding.
  - The `INITIAL_GAME` / `INITIAL_PARTICIPANTS` mocks move to `scoreboard-web/.../mockData.ts` for Storybook / dev mode.

### Refactors to enable responsive scaling

- `scoreboard.jsx` uses hardcoded pixel values throughout (`fontSize: 28`, `width: 48`, `padding: '54px 8px 10px'`, etc.). For the TV variant these need to scale.
- **Refactor approach:** introduce a single `--scale` CSS custom property (or a `useScaleFactor()` hook) computed from viewport width / device class. Convert hardcoded pixel literals in `ParticipantRow`, `LinescoreCard`, `ColumnHeader`, `FlipNumber` to `calc(<base> * var(--scale))` or to a `size` prop threaded down from `Scoreboard`. (See `Q3` for the exact scaling strategy choice.)
- The `iOSDevice` wrapper (status bar padding `padding: '54px 8px 10px'` / `'58px 16px 12px'`) is design-only — strip those out and replace with `env(safe-area-inset-top)` for phone deploys, `0` for kiosk.

### Reuse from prior PRD

Everything in the **Networking & Deployment**, **NFC Reader Loop**, **Registration Flow**, **MLB Stats API**, and **Database Schema** sections of `999-challenge-prd.md` is inherited unchanged unless noted below. The new PRD modifies:
- UI (now from design handoff, not the Wrigley ASCII mockup).
- Hosting topology (remote frontend gets its own deployment; Pi-as-public-server replaced with Cloudflare Tunnel).
- Domain spelling (`austinzani.dev`).
- **NFC hardware: RC522 (SPI/GPIO) → AITRIP PN532 V2.0 (USB-serial).** See "Hardware (updated)" below and Step 2.1.

### Hardware (updated 2026-05-17)

| Component | Details |
|---|---|
| Raspberry Pi (any model with ≥2 USB-A ports) | Serves the app, runs the NFC daemon. SPI/GPIO no longer needed. |
| **2× AITRIP PN532 V2.0 (USB)** | Each kit ships with a 1m USB-C cable + USB-C→USB-A adapter. Both plug directly into the Pi's USB-A ports — no jumper wires, no case mod. Enumerates as a USB-serial device. |
| NTAG215 stickers | Unchanged. PN532 reads NTAG215 natively and more reliably than the RC522. |
| HDMI display / TV | Unchanged. Kiosk Chromium on `http://localhost`. |

**Why the swap:** zero GPIO wiring, lid stays on the Pi case, and the PN532 is the more capable NFC controller (fewer false-misses on NTAG215). The two readers no longer share a bus, so a fault on one can't stall the other.

**Device paths:** the two readers enumerate as `/dev/ttyUSB0` and `/dev/ttyUSB1` (or `/dev/ttyACM*` on some firmware revs — detect at startup). Assignment is **not stable across reboots** — see Step 2.1 for the udev rule that pins each reader to a role.

---

## Detailed Implementation Scope

### Phase 1 — Skeletons (Day 1–2)

#### Step 1.1: Repo scaffold + workspace plumbing
- Files: `package.json`, `pnpm-workspace.yaml` (or npm workspaces), `tsconfig.base.json`, `.gitignore`, `pi/pyproject.toml`
- Acceptance: `pnpm install` + `cd pi && pip install -e .` both succeed from a clean checkout.

#### Step 1.2: Pi API skeleton
- Files: `pi/api/main.py`, `pi/api/db.py`, `pi/api/ws.py`, `pi/api/schema.sql`
- Endpoints: `GET /api/state`, `POST /api/register`, `POST /api/tap`, `WS /ws`. All return canned data for now.
- Schema applied on startup from `schema.sql` (`participants`, `taps` — copy from prior PRD).
- Acceptance: `uvicorn pi.api.main:app --reload` boots, `curl /api/state` returns JSON, browser opens `/ws` and receives a `hello` message.

#### Step 1.3: Shared UI package
- Files: `packages/scoreboard-ui/src/*` — port `scoreboard.jsx` components one-for-one to `.tsx`. **Green palette only.** **Linescore header only** (delete or comment-export `CompactGameCard`).
- Acceptance: A Storybook story (or a plain `vite` index page) renders the scoreboard with mock data identical to the design handoff at 402×874px.

### Phase 2 — Real Data (Day 3–5)

#### Step 2.1: NFC daemon + tap pipeline
- Files: `pi/nfc/main.py`, `pi/nfc/pn532.py` (thin wrapper over `nfcpy`), `pi/udev/99-pn532.rules`
- Two PN532 V2.0 readers on USB-serial (`/dev/ttyUSB0` + `/dev/ttyUSB1`, or `/dev/ttyACM*` depending on firmware). One process, two `nfcpy` `ContactlessFrontend` instances in separate threads/tasks. 3-second per-UID debounce. POST to `http://127.0.0.1:8000/api/tap`.
- **Stable device naming:** USB enumeration order is not guaranteed across reboots. Write a udev rule that pins each reader to a stable symlink based on its USB port path (since the two PN532s are identical, we key off physical port, not serial number):
  ```
  # /etc/udev/rules.d/99-pn532.rules — pin readers to roles by USB port path
  SUBSYSTEM=="tty", ATTRS{idVendor}=="072f", KERNEL=="ttyUSB*", \
    ATTRS{devpath}=="<port-A-path>", SYMLINK+="nfc-hotdog"
  SUBSYSTEM=="tty", ATTRS{idVendor}=="072f", KERNEL=="ttyUSB*", \
    ATTRS{devpath}=="<port-B-path>", SYMLINK+="nfc-beer"
  ```
  The daemon opens `/dev/nfc-hotdog` and `/dev/nfc-beer` by path. Capture the actual `devpath` values with `udevadm info -a -n /dev/ttyUSB0` once during bench-test and commit them in the rule file.
- **`nfcpy` connection string:** `tty:USB0:pn532` style; let `nfcpy` auto-detect baud + chip. Reset/reconnect on `nfc.clf.TransmissionError`.
- Acceptance: tapping a real coozie increments a count in SQLite and pushes a `tap` event on the WS. After a reboot, the hot-dog reader is still the hot-dog reader.

#### Step 2.2: Registration flow
- Files: `apps/scoreboard-web/src/RegistrationModal.tsx`, `pi/api/main.py` (`POST /api/register`)
- Unknown UID → API emits `registration_needed` over WS → modal appears on **all** connected clients → first submitter wins, others see modal dismiss. Tap is credited atomically on register.
- Acceptance: tap an unenrolled tag, type a name on phone, watch tag's first hot dog appear in real time.

#### Step 2.3: MLB Stats API poller + manual override endpoint
- Files: `pi/api/mlb.py`, `pi/api/main.py` (background task), `pi/api/admin.py` (`POST /api/admin/game`)
- Poll cadence per state: Preview = once/5min, Live = 45s, Final = stop.
- Fallback to ESPN if MLB returns 5xx twice consecutively.
- **Manual override (Q4):** `POST /api/admin/game` with a JSON body matching the game shape (inning, state, R/H/E per team, per-inning scores) pins the poller off and broadcasts the supplied state via WS. `DELETE /api/admin/game` re-enables polling. REST-only in this phase; the admin UI form lands in phase 5.
- Acceptance: linescore card reflects the live Reds game from MLB; `curl -X POST .../api/admin/game` with a fake "bottom of the 9th" payload immediately updates every connected client.

### Phase 3 — Responsive Scoreboard (Day 5–7)

#### Step 3.1: Wire UI to live data
- Files: `apps/scoreboard-web/src/App.tsx`, `apps/scoreboard-web/src/useScoreboardSocket.ts`
- WebSocket → reducer → `<Scoreboard participants game tweaks />`. REST `GET /api/state` on first load for initial state.
- Reconnect with exponential backoff; surface a "DISCONNECTED" pill in the header when down.
- Acceptance: open two phones + the TV simultaneously, tap reader, all three reorder rows within 1s.

#### Step 3.2: Responsive scaling — fluid type via `clamp()` + `cqi`
- Files: all components in `packages/scoreboard-ui/src/` that currently use raw px font sizes / dimensions.
- **Approach (locked per Q3 + Q7):** no JS scale hooks, no media-query multipliers. The scoreboard root gets `container-type: inline-size`, and every size that needs to scale uses `clamp(min, fluid, max)` against container-inline (`cqi`) units. The `?mode=kiosk` param controls layout decisions only (safe-area padding, QR visibility) — not sizing math.
- **Conversion pattern:**
  - `fontSize: 28` → `fontSize: 'clamp(22px, 3.2cqi, 84px)'`
  - `fontSize: 16` (linescore cells) → `clamp(14px, 1.8cqi, 48px)`
  - `padding: '10px 14px'` (row) → `clamp(8px, 1.2cqi, 32px) clamp(12px, 1.6cqi, 40px)`
  - Same `clamp()` treatment for `FlipNumber` `size` prop, `ColumnHeader` font sizes, `LinescoreCard` cell dimensions, sticky header padding.
- **Tune the ceiling, not the floor:** the floor values are the existing design's pixel sizes (phone-perfect already). The ceiling values get verified on the actual TV during bench-test and adjusted there.
- **No horizontal layout rework** at any width — vertical stack stays vertical stack.
- Acceptance: render at 390×844 (iPhone 14), 1280×720, 1920×1080, 3840×2160. At each, the leaderboard is the dominant element. On the actual game-day TV, names + totals must be unambiguously readable from typical seating distance (verified during the dry run).

#### Step 3.3: Kiosk mode polish
- Files: `pi/systemd/999-kiosk.service`, `pi/scripts/launch-kiosk.sh`
- Chromium `--kiosk --noerrdialogs --disable-translate http://localhost`. Screen blanking off. Cursor hidden via `unclutter`.
- A `?mode=kiosk` query param tells the React app to skip safe-area insets, hide the QR code (or position it differently), and lock to 1× viewport height.
- Acceptance: power on Pi cold → 30s later TV shows scoreboard fullscreen with no chrome.

### Phase 4 — Remote Deployment (Day 7–9)

#### Step 4.1: Cloudflare Tunnel for the Pi (admin stays loopback-only)
- Files: `infra/cloudflared/config.yml`, `pi/systemd/999-tunnel.service`
- One public hostname:
  - `api.999.austinzani.dev` → `http://localhost:8000` (FastAPI, WS-capable)
- **`/admin/*` is NOT exposed through the tunnel** (Q5). Tunnel ingress config explicitly blocks the `/admin` path prefix; admin access happens via Pi keyboard at `http://localhost/admin` or via SSH-tunneled localhost from a laptop.
- Acceptance: `curl https://api.999.austinzani.dev/api/state` from anywhere returns live state; `curl https://api.999.austinzani.dev/admin` returns 404 from the tunnel; `curl http://localhost/admin` on the Pi works.

#### Step 4.2: Remote frontend deploy
- Files: `apps/scoreboard-web/.env.production`, Vercel/Cloudflare Pages config in `infra/deploy/`
- Build produces a static bundle; deploy target serves `999.austinzani.dev`. Build-time env: `VITE_API_BASE=https://api.999.austinzani.dev`.
- CORS on the FastAPI side: allow origin `https://999.austinzani.dev` + local Pi origin only.
- Acceptance: visiting `https://999.austinzani.dev` on a phone over LTE shows the live board and reflects taps in real time.

#### Step 4.3: Same bundle, dual deploy
- The Pi's FastAPI also serves `apps/scoreboard-web/dist` at `/` so the kiosk doesn't need the internet to render. Same build, different env injection (`API_BASE` = same-origin on Pi; full URL on remote).
- Acceptance: pull Pi's internet plug — kiosk keeps working (no MLB updates, but local taps + scoreboard still flow).

### Phase 5 — Admin + Game-Day Hardening (Day 9–10)

- **Admin route at `/admin`** (loopback-only via tunnel ingress, per Q5): list participants, manual add/rename/remove, force-register UID, reset scores (confirm-twice), QR fullscreen, **manual game-state form** (Q4 — upgrades the REST-only endpoint from phase 2 with a thin form: inning, state, runs/hits/errors per team).
- **Post-event archive endpoint** (Q10): `POST /api/admin/archive` snapshots the SQLite file to `archive/999-<event-date>.sqlite` and truncates `participants` + `taps`. Run by hand the morning after.
- **9·9·9 completion celebration** (Q8): when any participant transitions to `hotdogs ≥ 9 && beers ≥ 9` for the first time, fire a ≤2s confetti + scoreboard flash on every connected client. Implemented as a side-effect in `Scoreboard` watching for the transition; broadcast as a `celebration` WS event so all clients fire simultaneously. Idempotent — each participant celebrates exactly once per event.
- Add `999.austinzani.dev` QR code to the kiosk footer.
- NFC daemon health pinged from the API; surface a "🌭 OFFLINE" / "🍺 OFFLINE" pill in the header if a reader hasn't reported in 60s.
- Run a dry-run with 3+ coozies the day before game day.

---

## Data and Dependency Changes

### Schema additions (delta vs prior PRD)

```sql
-- Inherits participants + taps from 999-challenge-prd.md, plus:
CREATE TABLE IF NOT EXISTS event_meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
-- Used for: current game_pk, last_mlb_poll_at, kiosk_qr_url, admin_pin (if Q5 ends up auth'd)

CREATE INDEX IF NOT EXISTS idx_taps_uid_time ON taps(uid, tapped_at DESC);
```

### Package manifests

- **Frontend:** React 18, TypeScript, Vite (or Next.js — see `Q6`), `clsx`. No Tailwind — the design uses inline styles and that's fine; do not retheme.
- **Backend:** FastAPI, uvicorn, `nfcpy` (USB-serial NFC; replaces `mfrc522`), `pyserial` (transitive, but pin it), `httpx` (for MLB), `websockets` (built into FastAPI), `python-dotenv`.
- **Infra:** `cloudflared` (system package on Pi), no Caddy.

### Environment variables

| Var | Where | Purpose |
|---|---|---|
| `API_BASE` | Frontend build | `https://api.999.austinzani.dev` (remote) or empty/same-origin (kiosk) |
| `MLB_TEAM_ID` | API | `113` (Reds) |
| `MLB_GAME_DATE` | API | `2026-05-31`, overridable for testing |
| `KIOSK_QR_URL` | API | `https://999.austinzani.dev` |
| `TUNNEL_TOKEN` | Tunnel service | Cloudflare-issued |

---

## Testing and Validation Plan

### Unit tests
- `pi/api/tests/test_endpoints.py`: `/api/state`, `/api/register`, `/api/tap` happy + error paths.
- `pi/api/tests/test_mlb.py`: parses sample MLB linescore fixture into our UI shape; fallback to ESPN fixture.
- `packages/scoreboard-ui/src/__tests__/`: snapshot tests of `Scoreboard` at three viewports (phone, 1080p, 4K) using Vitest + `@testing-library/react`.

### Integration tests
- `pi/tests/test_tap_to_ws.py`: simulated tap → DB row written → WS event observed → leaderboard standings event re-broadcast.
- `apps/scoreboard-web/e2e/`: Playwright smoke — open page, mock WS, fire `tap` event, assert row reorder animation runs.

### Manual verification (game-day rehearsal)
- Tap a brand-new tag → modal on TV + phone → submit name from phone → confirm tap is credited.
- Spam-tap same reader → debounce prevents double-count.
- Unplug ethernet on Pi → kiosk and any phone on local Wi-Fi keep working over LAN; remote phones go to "DISCONNECTED" state.
- Force MLB poller to return 500 → ESPN fallback engages → header keeps updating.
- View kiosk from 12ft away on the actual TV — confirm names + numbers legible (`Q3`).

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Cloudflare Tunnel flakes on game day | Low | High (remote phones lose access) | LAN access still works; show local `192.168.x.y` QR as fallback on kiosk |
| USB port enumeration flips after reboot (hot-dog reader becomes beer reader) | Medium | Medium | udev rule pins each reader to `/dev/nfc-hotdog` / `/dev/nfc-beer` by physical USB port path; daemon refuses to start if either symlink is missing |
| PN532 enumerates as `ttyACM*` on some firmware revs instead of `ttyUSB*` | Low | Low | Daemon scans both globs at startup; udev rule covers both `KERNEL` patterns |
| `nfcpy` ↔ PN532 V2.0 baud-rate auto-detect occasionally needs explicit `115200` | Low | Low | If auto-detect flakes, hardcode baud in the connection string and document it in `pi/nfc/README.md` |
| MLB Stats API returns nothing for the 2026-05-31 game (schedule change) | Low | Medium | Admin override to manually set `gamePk` and inning state |
| Bigger-screen scaling looks bad — design was sized for 402px width | Medium | Medium | `Q3` — confirm scaling strategy + verify on a real TV during phase 3 |
| Owner wants palette/header changes day-of | Medium | Low | Keep `PALETTES` lookup + `headerStyle` switch live (even if green/linescore are defaults); admin route exposes a toggle |
| Pi power loss mid-game | Low | High | Services autostart on boot; SQLite WAL-mode survives the cut; bring a UPS or USB battery if cheap |
| NFC tag UID collisions across coozies | Very low | Low | NTAG215 UIDs are 7 bytes, globally unique. Non-issue. |
| Open public API (no auth) gets discovered + spammed | Low | Low | Rate-limit `/api/register` and `/api/tap` by IP at the Cloudflare edge. `Q5`. |
| 2-week timeline | High | High | This PRD is sized for ~10 working days. Phase 5 polish is the slip-room. |

---

## Open Questions (Resolved)

All open questions resolved 2026-05-18. Full rationale in [`999-Challenge-Open-Questions.md`](./999-Challenge-Open-Questions.md).

- **Q1 · Domain:** `austinzani.dev`. Prior PRD's `austinzany.dev` was a typo; treat the new spelling as canonical for QR codes, CORS, Cloudflare, and the kiosk footer.
- **Q2 · API exposure:** Cloudflare Tunnel. `cloudflared` runs as a systemd service on the Pi and exposes only `api.999.austinzani.dev`. No port forwarding, no inbound exposure, no router config.
- **Q3 · Responsive scaling:** `?mode=kiosk` query param + CSS container queries with `clamp(min, fluid, max)` against `cqi` units. No JS scale hook. Floors = existing design pixel sizes; ceilings tuned on the actual TV during dry run.
- **Q4 · Admin game override:** REST endpoint (`POST /api/admin/game`) in phase 2, admin UI form added in phase 5. Don't block phase-2 ship on UI work.
- **Q5 · Admin auth:** Loopback-only via Cloudflare Tunnel ingress. Tunnel blocks `/admin/*` from the public hostname; admin access via Pi keyboard or SSH-tunneled localhost.
- **Q6 · Build tool:** Vite + React + TypeScript. Static bundle deploys to both the Pi (served by FastAPI) and Cloudflare Pages (remote `999.austinzani.dev`).
- **Q7 · Kiosk-mode detection:** `?mode=kiosk` query param appended by the kiosk launcher script. Param controls layout-only (safe-area, QR visibility) — sizing is pure CSS per Q3.
- **Q8 · 9·9·9 celebration:** Confetti + scoreboard flash, ≤2s, fired via a `celebration` WS event so every client triggers simultaneously. Idempotent per participant per event.
- **Q9 · NFC stations + USB ports:** Default to the Pi's two top USB-A ports — hot-dog reader on the left, beer reader on the right. Capture each port's `devpath` via `udevadm info` during bench-test and commit the rule. Re-confirm if final enclosures route cables differently.
- **Q10 · Post-event archive:** `POST /api/admin/archive` snapshots the DB file to `archive/999-<event-date>.sqlite` and truncates `participants` + `taps`. Run by hand the morning after. No auto-archive magic.

---

## Recommended Skills

The repo is empty so no project-specific skills exist yet. Skills available in this environment that should be invoked during execution:

- **`scope-issue`** — already in use to generate this doc.
- **`execute-prd`** — step-by-step execution with per-step build gates and commits; correct fit for phases 1–4.
- **`resolve-prd-questions`** — walk owner through the Open Questions doc before kickoff.
- **`supabase-postgres-best-practices`** — not directly applicable (we're SQLite), but the indexing/connection-pool advice is useful for the FastAPI sqlite layer.
- **`native-data-fetching`** — applicable to the React WebSocket + REST fallback layer in `apps/scoreboard-web`.
- **`frontend-design`** — relevant if any visual tweaks beyond a direct port of the design handoff come up.

Not applicable to this repo: `pt-*` (Pay Theory), `pfw-*` (PointFree Swift), `expo-*` (Expo / React Native).

---

## Definition of Done

- [ ] All scoped files and modules identified
- [ ] DRY/reuse opportunities addressed (port from `scoreboard.jsx`, no duplicate palette/component definitions)
- [ ] Module ownership boundaries respected (`scoreboard-ui` is pure UI, `scoreboard-web` owns data, `pi/api` owns state, `pi/nfc` owns hardware)
- [ ] Tests and acceptance criteria defined for each phase step
- [x] Open questions resolved (2026-05-18)
- [ ] Game-day dry run scheduled ≥48h before 2026-05-31
