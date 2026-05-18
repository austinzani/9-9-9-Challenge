# PRD: 9-9-9 Reds Game Challenge Tracker

**Project:** `999.austinzany.dev`
**Event:** Cincinnati Reds game — May 31, 2026
**Hardware:** Raspberry Pi + 2× RC522 NFC readers + NTAG215 stickers in coozies
**Stack:** Python (FastAPI) + SQLite + HTML/CSS/JS scoreboard

---

## Overview

A physical + digital party game tracker for the 9-9-9 challenge (9 hot dogs, 9 beers, 9 innings). Two NFC reader stations — one shaped like a hot dog, one like a beer — let participants tap their coozie to log consumption. A TV-facing scoreboard displays live Reds game score, current inning, and a ranked leaderboard styled like a classic Wrigley Field manual scoreboard.

Hosted at `999.austinzany.dev` via a Cloudflare A record pointing to the home static IP, with port 80/443 forwarded to the Pi.

---

## Goals

- Zero friction to participate — tap a coozie, it works
- Self-registration on first tap, no app install or account needed
- Scoreboard readable from across the room on a TV
- Works on any phone browser (bypasses Android `.local` mDNS issues)
- Minimal ops — plug in the Pi, open a browser, done

---

## Hardware

| Component | Details |
|---|---|
| Raspberry Pi (any model with SPI) | Serves the app, runs the NFC polling loop |
| 2× HiLetgo RC522 readers | SPI via GPIO; CE0 = hot dog station, CE1 = beer station |
| NTAG215 stickers | One per coozie; pre-enrolled or self-enrolling |
| HDMI display / TV | Shows scoreboard at `localhost` or `999.austinzany.dev` in kiosk-mode Chromium |

**Wiring:** Both RC522 modules share MOSI/MISO/SCK on the SPI bus. CE0 (GPIO8) selects the hot dog reader; CE1 (GPIO7) selects the beer reader. Each gets its own RST pin. Power from 3.3V — never 5V.

---

## Networking & Deployment

| Concern | Solution |
|---|---|
| Public URL | `999.austinzany.dev` → Cloudflare A record → home static IP |
| Port forwarding | Router forwards :80 and :443 to Pi's local IP |
| TLS | Caddy on Pi handles HTTPS via Cloudflare DNS-01 challenge (no port 443 inbound required) or plain HTTP on :80 for simplicity |
| Android compatibility | Full public URL avoids `.local` mDNS issues entirely |
| TV display | Chromium in kiosk mode on the Pi: `chromium-browser --kiosk http://localhost` |
| QR code | On-screen QR at `999.austinzany.dev` so guests can scan to join |

---

## Core Behavior

### NFC Reader Loop

Two independent polling threads (or async tasks), one per reader. Each loops continuously:

1. Wait for a tag present on the antenna
2. Read the 7-byte UID
3. Look up UID in SQLite `participants` table
4. **If unknown UID:** emit a `registration_needed` event via WebSocket to all connected clients, passing `source: "hotdog" | "beer"` and `uid`
5. **If known UID:** increment `hotdog_count` or `beer_count` for that participant, emit a `tap` event via WebSocket
6. Debounce: ignore re-taps from the same UID within 3 seconds

### Registration Flow

When an unknown UID is detected:

- A modal appears **on all connected screens** (TV scoreboard + any phones on the page)
- Modal shows: *"New coozie detected! What's your name?"*
- Name input + confirm button
- First person to submit wins; modal dismisses on all screens
- The tap that triggered registration **counts** — the hot dog or beer is credited immediately on registration

### Scoring

- Each tap on the hot dog reader = +1 hot dog for that UID's owner
- Each tap on the beer reader = +1 beer for that UID's owner
- Total score = `hotdog_count + beer_count` (used for leaderboard sort)
- No cap enforced in the app — challenge integrity is on the participants

---

## Scoreboard UI

### Aesthetic Direction

**Old-school manual scoreboard — Wrigley Field outfield wall.**

- Dark forest green background with aged, slightly textured feel
- White/cream hand-painted-style lettering (use a condensed display font like *Bebas Neue* or *Dharma Gothic*)
- Inning tracker across the top styled like the Wrigley line score (boxes per inning, filled as game progresses)
- Participant rows on a dark wood-toned or chalkboard panel below
- No rounded corners, no gradients, no shadows — flat, utilitarian, tactile
- Hot dog emoji 🌭 and beer emoji 🍺 as column headers, with a Σ total column
- Subtle flicker/update animation when a new tap arrives (score number flips like an old scoreboard card)

### Layout

```
┌─────────────────────────────────────────────────────┐
│  CIN  1  2  3  4  5  6  7  8  9   R   H   E         │
│        0  2  0  1  0  -  -  -  -   3   6   1         │
│  CHC  0  0  3  0  0  -  -  -  -   3   5   0         │
│                  ▲ 6th INNING ▲                      │
├─────────────────────────────────────────────────────┤
│  NAME              🌭    🍺    TOTAL                 │
│  Austin             3     4      7                   │
│  Aron               2     4      6                   │
│  Jefferson          1     3      4                   │
│  ...                                                 │
├─────────────────────────────────────────────────────┤
│  [QR code]  999.austinzany.dev                       │
└─────────────────────────────────────────────────────┘
```

- Sorted descending by total at all times
- Top participant gets subtle highlight (gold/amber tint on the row)
- Real-time updates via WebSocket — no page refresh needed
- Responsive: readable on a 55" TV from 10 feet or on a phone at arm's length

---

## Live Game Score

### Data Source

**MLB Stats API** — free, no auth, official MLB backend.

```
# Morning: get gamePk for May 31 Reds game
GET https://statsapi.mlb.com/api/v1/schedule
    ?sportId=1&teamId=113&date=2026-05-31

# During game: poll every 45 seconds
GET https://statsapi.mlb.com/api/v1/game/{gamePk}/linescore
```

### State Machine

| `abstractGameState` | Behavior |
|---|---|
| `Preview` | Show scheduled start time, no score |
| `Live` | Poll linescore every 45s, push updates via WebSocket |
| `Final` | Stop polling, display final score with "FINAL" label |
| API error | Silently retain last known state; retry next interval |

### Fields Used

- `currentInningOrdinal` — e.g. `"6th"`
- `inningState` — `"Top"` / `"Middle"` / `"Bottom"` / `"End"`
- `teams.home.runs` / `teams.away.runs`
- `teams.home.hits` / `teams.away.hits`
- `teams.home.errors` / `teams.away.errors`
- Per-inning scores array for the linescore boxes

**Fallback:** If MLB API returns 5xx, try ESPN's scoreboard endpoint:
`https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard?dates=20260531`

---

## Backend API

Built with **FastAPI** + **SQLite** (via `sqlite3` stdlib). No ORM needed.

### Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Serves scoreboard HTML |
| `GET` | `/api/state` | Full app state (participants, scores, game data) |
| `POST` | `/api/register` | `{ uid, name }` — registers a new participant |
| `POST` | `/api/tap` | Internal use by NFC loop — `{ uid, reader }` |
| `GET` | `/ws` | WebSocket for real-time score/registration events |

### WebSocket Events (server → client)

```json
{ "type": "tap",        "data": { "name": "Austin", "type": "hotdog", "hotdogs": 3, "beers": 4 } }
{ "type": "register",   "data": { "uid": "...", "source": "beer" } }
{ "type": "score",      "data": { "inning": "6th", "state": "Bottom", "home": 3, "away": 3, ... } }
{ "type": "standings",  "data": [ { "name": "Austin", "hotdogs": 3, "beers": 4, "total": 7 }, ... ] }
```

### Database Schema

```sql
CREATE TABLE participants (
  uid       TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  hotdogs   INTEGER DEFAULT 0,
  beers     INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE taps (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  uid        TEXT NOT NULL,
  reader     TEXT NOT NULL,  -- 'hotdog' | 'beer'
  tapped_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## NFC Reader Process

Separate Python script (`nfc_reader.py`) running as a `systemd` service, communicating with the FastAPI app via localhost HTTP POST to `/api/tap`.

```
systemd
  └── 999-app.service     → uvicorn main:app --port 80
  └── 999-nfc.service     → python nfc_reader.py
```

Both services start on boot. NFC script retries on error with 5s backoff.

---

## Admin / Setup

Accessible at `999.austinzany.dev/admin` (no auth — it's a party):

- View all registered participants + their UIDs
- Manually add/remove/rename a participant
- Reset all scores (with confirmation)
- Force-register a UID without tapping (for pre-enrollment)
- Show QR code fullscreen for guest join

---

## Out of Scope

- Authentication / login
- Historical data across multiple games
- Mobile native app
- Undo a tap
- Bet/wager tracking

---

## Build Order

1. SQLite schema + FastAPI skeleton + WebSocket broadcast
2. NFC reader loop (two-reader SPI, debounce, localhost POST)
3. Registration flow (unknown UID → modal → register → credit tap)
4. Scoreboard HTML/CSS (Wrigley aesthetic, WebSocket updates)
5. MLB Stats API polling + game score display
6. Cloudflare DNS + port forward + Pi autostart via systemd
7. Kiosk mode Chromium on Pi HDMI output
