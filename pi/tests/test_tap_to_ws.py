"""Integration test for tap persistence and websocket fan-out."""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def api_client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    """Provide a test client bound to an isolated SQLite file."""
    monkeypatch.setenv("DISABLE_MLB_POLLER", "1")
    monkeypatch.setenv("CHALLENGE_DB_PATH", str(tmp_path / "integration.sqlite"))

    from pi.api.main import app

    with TestClient(app) as client:
        yield client


def test_tap_to_ws_broadcast_and_state_reorder(api_client: TestClient) -> None:
    api_client.post("/api/register", json={"uid": "U-A", "name": "Alice"})
    api_client.post("/api/register", json={"uid": "U-B", "name": "Bob"})

    with api_client.websocket_connect("/ws") as ws:
        hello = ws.receive_json()
        assert hello["type"] == "hello"

        tap_response = api_client.post("/api/tap", json={"uid": "U-B", "station": "beer"})
        assert tap_response.status_code == 200

        first_event = ws.receive_json()
        second_event = ws.receive_json()
        event_types = {first_event["type"], second_event["type"]}
        assert "tap" in event_types
        assert "state" in event_types

        state = api_client.get("/api/state").json()
        assert state["participants"][0]["uid"] == "U-B"
        assert state["participants"][0]["beers"] == 1


def test_celebration_event_emits_once_at_first_9x9_transition(api_client: TestClient) -> None:
    api_client.post("/api/register", json={"uid": "U-C", "name": "Champion"})

    with api_client.websocket_connect("/ws") as ws:
        hello = ws.receive_json()
        assert hello["type"] == "hello"

        for _ in range(9):
            assert api_client.post("/api/tap", json={"uid": "U-C", "station": "hotdog"}).status_code == 200
            assert api_client.post("/api/tap", json={"uid": "U-C", "station": "beer"}).status_code == 200

        celebration_found = False
        for _ in range(40):
            message = ws.receive_json()
            if message.get("type") == "celebration":
                celebration_found = True
                break
        assert celebration_found is True

        # Additional taps should not emit a second celebration for the same UID.
        assert api_client.post("/api/tap", json={"uid": "U-C", "station": "beer"}).status_code == 200
        first = ws.receive_json()
        second = ws.receive_json()
        assert first.get("type") != "celebration"
        assert second.get("type") != "celebration"
