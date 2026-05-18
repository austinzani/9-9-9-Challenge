"""FastAPI entrypoint for the 9-9-9 challenge API."""

from __future__ import annotations

import asyncio
import os
from contextlib import asynccontextmanager, suppress
from typing import Any, Literal

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from pi.api.admin import router as admin_router
from pi.api.db import (
    connect,
    fetch_participants_with_totals,
    initialize_schema,
    participant_exists,
    queue_pending_registration,
    record_tap,
    register_and_consume_pending,
)
from pi.api.mlb import MlbPoller, default_game_state, utc_iso_now
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


def build_state_payload_from_app(app: FastAPI) -> dict[str, Any]:
    """Build full app state from DB and latest poller/admin game payload."""
    participants = fetch_participants_with_totals(app.state.db)
    return {
        "game": app.state.game_state,
        "participants": participants,
        "connection": {"status": "ok"},
        "updatedAt": utc_iso_now(),
    }


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create DB schema and background poll tasks during process startup."""
    conn = connect()
    initialize_schema(conn)

    team_id = int(os.getenv("MLB_TEAM_ID", "113"))
    game_date = os.getenv("MLB_GAME_DATE", "2026-05-31")

    poller = MlbPoller(team_id=team_id, game_date=game_date)

    app.state.db = conn
    app.state.poller = poller
    app.state.game_state = default_game_state()
    app.state.ws_manager = manager
    app.state.build_state_payload = build_state_payload_from_app

    async def on_game_update(game: dict[str, Any]) -> None:
        # Skip broadcasts while admin override is pinned.
        if poller.manual_override is not None:
            return

        app.state.game_state = game
        state = build_state_payload_from_app(app)
        await manager.broadcast({"type": "state", "state": state})

    poller_task = asyncio.create_task(poller.run(on_game_update), name="mlb-poller")

    try:
        yield
    finally:
        poller_task.cancel()
        with suppress(asyncio.CancelledError):
            await poller_task
        await poller.close()
        conn.close()


app = FastAPI(title="9-9-9 Challenge API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://999.austinzani.dev",
        "http://localhost",
        "http://localhost:8000",
        "http://127.0.0.1",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)
app.include_router(admin_router)


@app.get("/api/state")
async def get_state(request: Request) -> dict[str, Any]:
    """Return current scoreboard state payload."""
    return build_state_payload_from_app(request.app)


@app.post("/api/register")
async def register(payload: RegisterRequest, request: Request) -> dict[str, Any]:
    """Register a participant and atomically consume any pending unknown taps."""
    result = register_and_consume_pending(
        request.app.state.db,
        payload.uid.strip(),
        payload.name.strip(),
    )
    state = build_state_payload_from_app(request.app)
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
    state = build_state_payload_from_app(request.app)

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
