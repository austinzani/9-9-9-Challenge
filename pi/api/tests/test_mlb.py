"""Parser-level tests for MLB/ESPN normalization logic."""

from __future__ import annotations

from pi.api.mlb import parse_espn_payload, parse_mlb_schedule_payload, select_poll_interval


def test_select_poll_interval_rules() -> None:
    assert select_poll_interval("Preview") == 300
    assert select_poll_interval("Live") == 45
    assert select_poll_interval("Final") == 0


def test_parse_mlb_schedule_payload_maps_linescore_shape() -> None:
    payload = {
        "dates": [
            {
                "games": [
                    {
                        "status": {"abstractGameState": "Live"},
                        "gameDate": "2026-05-31T17:40:00Z",
                        "venue": {
                            "name": "Great American Ball Park",
                            "timeZone": {"id": "America/New_York"},
                        },
                        "teams": {
                            "away": {"team": {"abbreviation": "CHC", "teamName": "Cubs"}},
                            "home": {"team": {"abbreviation": "CIN", "teamName": "Reds"}},
                        },
                        "linescore": {
                            "inningHalf": "Bottom",
                            "currentInning": 7,
                            "innings": [
                                {"away": {"runs": 0}, "home": {"runs": 1}},
                                {"away": {"runs": 2}, "home": {"runs": 0}},
                            ],
                            "teams": {
                                "away": {"runs": 2, "hits": 5, "errors": 0},
                                "home": {"runs": 1, "hits": 3, "errors": 1},
                            },
                        },
                    }
                ]
            }
        ]
    }

    parsed = parse_mlb_schedule_payload(payload)
    assert parsed is not None
    assert parsed["awayAbbr"] == "CHC"
    assert parsed["homeAbbr"] == "CIN"
    assert parsed["inningState"] == "Bottom"
    assert parsed["inningOrdinal"] == "7th"
    assert parsed["scheduledStart"] == "2026-05-31T17:40:00Z"
    assert parsed["scheduledTimeZone"] == "America/New_York"
    assert parsed["venueName"] == "Great American Ball Park"
    assert parsed["R"] == {"away": 2, "home": 1}


def test_parse_espn_payload_maps_fallback_shape() -> None:
    payload = {
        "events": [
            {
                "competitions": [
                    {
                        "date": "2026-05-31T17:40:00Z",
                        "venue": {"fullName": "Great American Ball Park"},
                        "status": {
                            "period": 6,
                            "detail": "Top 6th",
                            "type": {"state": "live"},
                        },
                        "competitors": [
                            {
                                "homeAway": "away",
                                "score": "4",
                                "linescores": [{"value": 1}, {"value": 0}, {"value": 2}],
                                "team": {"abbreviation": "CHC", "name": "Cubs"},
                            },
                            {
                                "homeAway": "home",
                                "score": "3",
                                "linescores": [{"value": 0}, {"value": 1}, {"value": 0}],
                                "team": {"abbreviation": "CIN", "name": "Reds"},
                            },
                        ],
                    }
                ]
            }
        ]
    }

    parsed = parse_espn_payload(payload, team_abbr="CIN")
    assert parsed is not None
    assert parsed["awayAbbr"] == "CHC"
    assert parsed["homeAbbr"] == "CIN"
    assert parsed["inningOrdinal"] == "6th"
    assert parsed["scheduledStart"] == "2026-05-31T17:40:00Z"
    assert parsed["scheduledTimeZone"] is None
    assert parsed["venueName"] == "Great American Ball Park"
    assert parsed["R"] == {"away": 4, "home": 3}
