"""FastAPI entrypoint for the 9-9-9 challenge API."""

from __future__ import annotations

import sqlite3
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from typing import Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field

from pi.api.db import connect, initialize_schema
from pi.api.ws import ConnectionManager


class RegisterRequest(BaseModel):
    """Payload for participant registration calls."""

    uid: str = Field(min_length=1)
    name: str = Field(min_length=1)


class TapRequest(BaseModel):
    """Payload for tap submission calls."""

    uid: str = Field(min_length=1)
    station: str = Field(pattern="^(hotdog|beer)$")


manager = ConnectionManager()


def build_canned_state() -> dict[str, Any]:
    """Return placeholder state until live integration is wired in."""
    return {
        "game": {
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
        },
        "participants": [],
        "connection": {"status": "ok"},
        "updatedAt": datetime.now(UTC).isoformat(),
    }


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Create DB schema during process startup."""
    conn = connect()
    initialize_schema(conn)
    _.state.db = conn
    try:
        yield
    finally:
        conn.close()


app = FastAPI(title="9-9-9 Challenge API", lifespan=lifespan)


@app.get("/api/state")
def get_state() -> dict[str, Any]:
    """Return current scoreboard state payload (placeholder for now)."""
    return build_canned_state()


@app.post("/api/register")
def register(payload: RegisterRequest) -> dict[str, Any]:
    """Accept registration payload and return a canned acknowledgement."""
    return {
        "ok": True,
        "uid": payload.uid,
        "name": payload.name,
        "status": "registered",
    }


@app.post("/api/tap")
def tap(payload: TapRequest) -> dict[str, Any]:
    """Accept tap payload and return a canned acknowledgement."""
    return {
        "ok": True,
        "uid": payload.uid,
        "station": payload.station,
        "status": "accepted",
    }


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    """Handle WebSocket clients and keep the connection alive."""
    await manager.connect(websocket)
    try:
        while True:
            # Keep reading so disconnects are observed promptly.
            await websocket.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
    except sqlite3.Error:
        await manager.disconnect(websocket)
