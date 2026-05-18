"""Endpoint-level tests for the 9-9-9 FastAPI service."""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def api_client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    """Provide a test client bound to an isolated SQLite file."""
    monkeypatch.setenv("DISABLE_MLB_POLLER", "1")
    monkeypatch.setenv("CHALLENGE_DB_PATH", str(tmp_path / "test.sqlite"))

    from pi.api.main import app

    with TestClient(app) as client:
        yield client


def test_state_endpoint_returns_expected_shape(api_client: TestClient) -> None:
    response = api_client.get("/api/state")
    assert response.status_code == 200

    payload = response.json()
    assert "game" in payload
    assert "participants" in payload
    assert "readerHealth" in payload
    assert "updatedAt" in payload


def test_register_then_tap_updates_totals(api_client: TestClient) -> None:
    register = api_client.post("/api/register", json={"uid": "TAG-1", "name": "Austin"})
    assert register.status_code == 200
    assert register.json()["status"] == "registered"

    tap = api_client.post("/api/tap", json={"uid": "TAG-1", "station": "hotdog"})
    assert tap.status_code == 200

    state = api_client.get("/api/state").json()
    assert state["participants"][0]["name"] == "Austin"
    assert state["participants"][0]["hotdogs"] == 1
    assert state["participants"][0]["beers"] == 0


def test_unknown_uid_tap_requests_registration(api_client: TestClient) -> None:
    tap = api_client.post("/api/tap", json={"uid": "NEW-UID", "station": "beer"})
    assert tap.status_code == 202

    payload = tap.json()
    assert payload["registrationRequired"] is True
    assert payload["registration"]["uid"] == "NEW-UID"
    assert payload["registration"]["beerPending"] == 1
