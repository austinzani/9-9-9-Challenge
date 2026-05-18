"""FastAPI entrypoint for the 9-9-9 challenge API."""

from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import UTC, datetime
from typing import Any, Literal

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from pi.api.db import (
    connect,
    fetch_participants_with_totals,
    initialize_schema,
    participant_exists,
    queue_pending_registration,
    record_tap,
    register_and_consume_pending,
)
from pi.api.ws import ConnectionManager


class RegisterRequest(BaseModel):
    """Payload for participant registration calls."""

    uid: str = Field(min_length=1)
    name: str = Field(min_length=1)


class TapRequest(BaseModel):
    """Payload for tap submission calls."""

    uid: str = Field(min_length=1)
    station: Literal['hotdog', 'beer']


manager = ConnectionManager()


def build_game_placeholder() -> dict[str, Any]:
    """Return a static linescore shape until poller integration is wired in."""
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


def build_state_payload(request: Request) -> dict[str, Any]:
    """Build full app state from DB + current game payload."""
    participants = fetch_participants_with_totals(request.app.state.db)
    return {
        "game": build_game_placeholder(),
        "participants": participants,
        "connection": {"status": "ok"},
        "updatedAt": datetime.now(UTC).isoformat(),
    }


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create DB schema during process startup."""
    conn = connect()
    initialize_schema(conn)
    app.state.db = conn
    try:
        yield
    finally:
        conn.close()


app = FastAPI(title="9-9-9 Challenge API", lifespan=lifespan)


@app.get("/api/state")
async def get_state(request: Request) -> dict[str, Any]:
    """Return current scoreboard state payload."""
    return build_state_payload(request)


@app.post("/api/register")
async def register(payload: RegisterRequest, request: Request) -> dict[str, Any]:
    """Register a participant and atomically consume any pending unknown taps."""
    result = register_and_consume_pending(
        request.app.state.db,
        payload.uid.strip(),
        payload.name.strip(),
    )
    state = build_state_payload(request)
    await manager.broadcast({"type": "registration_resolved", "registration": result})
    await manager.broadcast({"type": "state", "state": state})

    return {
        "ok": True,
        **result,
    }


@app.post("/api/tap")
async def tap(payload: TapRequest, request: Request) -> Any:
    """Record a tap event and fan it out over WebSocket."""
    if not participant_exists(request.app.state.db, payload.uid):
        pending = queue_pending_registration(request.app.state.db, payload.uid, payload.station)
        registration_needed = {
            **pending,
            "station": payload.station,
        }
        await manager.broadcast(
            {"type": "registration_needed", "registration": registration_needed}
        )
        return JSONResponse(
            status_code=status.HTTP_202_ACCEPTED,
            content={
                "ok": False,
                "registrationRequired": True,
                "registration": registration_needed,
            },
        )

    tap_event = record_tap(request.app.state.db, payload.uid, payload.station)
    state = build_state_payload(request)

    await manager.broadcast({"type": "tap", "tap": tap_event})
    await manager.broadcast({"type": "state", "state": state})

    return {
        "ok": True,
        "tap": tap_event,
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
