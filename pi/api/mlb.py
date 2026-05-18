"""MLB/ESPN polling and normalization utilities for the scoreboard header."""

from __future__ import annotations

import asyncio
from copy import deepcopy
from datetime import UTC, datetime
from typing import Any

import httpx


def ordinal(value: int) -> str:
    """Render inning numbers as ordinal strings (1st, 2nd, etc.)."""
    if 10 <= value % 100 <= 20:
        suffix = "th"
    else:
        suffix = {1: "st", 2: "nd", 3: "rd"}.get(value % 10, "th")
    return f"{value}{suffix}"


def default_game_state() -> dict[str, Any]:
    """Fallback game state used before the first successful poll."""
    return {
        "awayAbbr": "CHC",
        "awayName": "CUBS",
        "homeAbbr": "CIN",
        "homeName": "REDS",
        "inningOrdinal": "1st",
        "inningState": "Top",
        "abstractState": "Preview",
        "innings": {
            "away": [None] * 9,
            "home": [None] * 9,
        },
        "R": {"away": 0, "home": 0},
        "H": {"away": 0, "home": 0},
        "E": {"away": 0, "home": 0},
    }


def select_poll_interval(abstract_state: str) -> int:
    """Apply PRD cadence rules based on the current game state."""
    lowered = abstract_state.lower()
    if lowered == "preview":
        return 300
    if lowered == "final":
        return 0
    return 45


def _normalize_innings(innings: list[dict[str, Any]]) -> dict[str, list[int | None]]:
    away: list[int | None] = []
    home: list[int | None] = []
    for inning in innings[:9]:
        away.append(inning.get("away", {}).get("runs"))
        home.append(inning.get("home", {}).get("runs"))

    while len(away) < 9:
        away.append(None)
    while len(home) < 9:
        home.append(None)

    return {
        "away": away,
        "home": home,
    }


def parse_mlb_schedule_payload(payload: dict[str, Any]) -> dict[str, Any] | None:
    """Parse MLB schedule + linescore payload into the shared scoreboard shape."""
    dates = payload.get("dates") or []
    if not dates:
        return None

    games = dates[0].get("games") or []
    if not games:
        return None

    game = games[0]
    teams = game.get("teams", {})
    away_team = teams.get("away", {}).get("team", {})
    home_team = teams.get("home", {}).get("team", {})

    linescore = game.get("linescore", {})
    inning_state = linescore.get("inningHalf") or linescore.get("inningState") or "Top"
    inning_number = linescore.get("currentInning") or 1

    normalized = {
        "awayAbbr": away_team.get("abbreviation") or away_team.get("teamName") or "AWY",
        "awayName": away_team.get("teamName") or away_team.get("name") or "AWAY",
        "homeAbbr": home_team.get("abbreviation") or home_team.get("teamName") or "HME",
        "homeName": home_team.get("teamName") or home_team.get("name") or "HOME",
        "inningOrdinal": ordinal(int(inning_number)),
        "inningState": str(inning_state).title(),
        "abstractState": (game.get("status", {}) or {}).get("abstractGameState", "Preview"),
        "innings": _normalize_innings(linescore.get("innings") or []),
        "R": {
            "away": int(linescore.get("teams", {}).get("away", {}).get("runs") or 0),
            "home": int(linescore.get("teams", {}).get("home", {}).get("runs") or 0),
        },
        "H": {
            "away": int(linescore.get("teams", {}).get("away", {}).get("hits") or 0),
            "home": int(linescore.get("teams", {}).get("home", {}).get("hits") or 0),
        },
        "E": {
            "away": int(linescore.get("teams", {}).get("away", {}).get("errors") or 0),
            "home": int(linescore.get("teams", {}).get("home", {}).get("errors") or 0),
        },
    }
    return normalized


def parse_espn_payload(payload: dict[str, Any], team_abbr: str = "CIN") -> dict[str, Any] | None:
    """Parse ESPN scoreboard fallback payload into the shared shape."""
    events = payload.get("events") or []
    if not events:
        return None

    for event in events:
        competition = (event.get("competitions") or [{}])[0]
        competitors = competition.get("competitors") or []
        if len(competitors) != 2:
            continue

        home = next((item for item in competitors if item.get("homeAway") == "home"), competitors[0])
        away = next((item for item in competitors if item.get("homeAway") == "away"), competitors[1])

        home_abbr = ((home.get("team") or {}).get("abbreviation") or "").upper()
        away_abbr = ((away.get("team") or {}).get("abbreviation") or "").upper()
        if team_abbr.upper() not in {home_abbr, away_abbr}:
            continue

        home_lines = [item.get("value") for item in home.get("linescores") or []]
        away_lines = [item.get("value") for item in away.get("linescores") or []]

        while len(home_lines) < 9:
            home_lines.append(None)
        while len(away_lines) < 9:
            away_lines.append(None)

        header = competition.get("status", {}).get("type", {})
        inning = int(competition.get("status", {}).get("period") or 1)
        clock_detail = (competition.get("status", {}).get("detail") or "Top").split(" ")[0]

        return {
            "awayAbbr": away_abbr or "AWY",
            "awayName": (away.get("team") or {}).get("name") or "AWAY",
            "homeAbbr": home_abbr or "HME",
            "homeName": (home.get("team") or {}).get("name") or "HOME",
            "inningOrdinal": ordinal(inning),
            "inningState": clock_detail.title(),
            "abstractState": header.get("state", "live").title(),
            "innings": {
                "away": away_lines[:9],
                "home": home_lines[:9],
            },
            "R": {
                "away": int(away.get("score") or 0),
                "home": int(home.get("score") or 0),
            },
            # ESPN payload does not consistently include H/E in the lightweight API.
            "H": {"away": 0, "home": 0},
            "E": {"away": 0, "home": 0},
        }

    return None


class MlbPoller:
    """Polling coordinator with manual override and ESPN fallback support."""

    def __init__(
        self,
        team_id: int,
        game_date: str,
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        self.team_id = team_id
        self.game_date = game_date
        self.http_client = http_client or httpx.AsyncClient(timeout=10.0)
        self.current_game: dict[str, Any] = default_game_state()
        self.manual_override: dict[str, Any] | None = None
        self._consecutive_mlb_errors = 0

    async def close(self) -> None:
        """Close any poller-owned network client resources."""
        await self.http_client.aclose()

    def set_manual_override(self, game_state: dict[str, Any]) -> dict[str, Any]:
        """Pin game state from admin override and pause poll updates."""
        self.manual_override = deepcopy(game_state)
        self.current_game = deepcopy(game_state)
        return deepcopy(self.current_game)

    def clear_manual_override(self) -> None:
        """Re-enable polling by clearing the active override."""
        self.manual_override = None

    async def _fetch_from_mlb(self) -> dict[str, Any] | None:
        url = (
            "https://statsapi.mlb.com/api/v1/schedule"
            f"?sportId=1&teamId={self.team_id}&date={self.game_date}&hydrate=linescore"
        )
        response = await self.http_client.get(url)

        if response.status_code >= 500:
            raise httpx.HTTPStatusError(
                f"MLB server error: {response.status_code}",
                request=response.request,
                response=response,
            )

        response.raise_for_status()
        parsed = parse_mlb_schedule_payload(response.json())
        if parsed is None:
            return None

        self._consecutive_mlb_errors = 0
        return parsed

    async def _fetch_from_espn(self) -> dict[str, Any] | None:
        safe_date = self.game_date.replace("-", "")
        url = (
            "https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard"
            f"?dates={safe_date}"
        )
        response = await self.http_client.get(url)
        response.raise_for_status()
        return parse_espn_payload(response.json())

    async def poll_once(self) -> dict[str, Any]:
        """Run one poll iteration, honoring override and fallback rules."""
        if self.manual_override is not None:
            return deepcopy(self.manual_override)

        parsed: dict[str, Any] | None = None

        try:
            parsed = await self._fetch_from_mlb()
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code >= 500:
                self._consecutive_mlb_errors += 1
            else:
                self._consecutive_mlb_errors = 0
        except httpx.HTTPError:
            self._consecutive_mlb_errors += 1

        if parsed is None and self._consecutive_mlb_errors >= 2:
            fallback = await self._fetch_from_espn()
            if fallback is not None:
                parsed = fallback

        if parsed is not None:
            self.current_game = parsed

        return deepcopy(self.current_game)

    async def run(self, on_update) -> None:  # noqa: ANN001 - callback typed by call site.
        """Long-running polling loop that emits updates through a callback."""
        while True:
            game = await self.poll_once()
            await on_update(deepcopy(game))

            if self.manual_override is not None:
                await asyncio.sleep(5)
                continue

            delay = select_poll_interval(game.get("abstractState", "Live"))
            if delay <= 0:
                await asyncio.sleep(3600)
            else:
                await asyncio.sleep(delay)


def utc_iso_now() -> str:
    """Centralized clock source for state payload timestamps."""
    return datetime.now(UTC).isoformat()
