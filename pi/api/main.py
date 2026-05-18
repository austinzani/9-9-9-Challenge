"""FastAPI entrypoint for the 9-9-9 challenge API."""

from __future__ import annotations

import asyncio
import os
import time
from contextlib import asynccontextmanager, suppress
from pathlib import Path
from typing import Any, Literal

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from pi.api.admin import router as admin_router
from pi.api.db import (
    connect,
    fetch_participants_with_totals,
    initialize_schema,
    mark_celebration_if_earned,
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


class ReaderHeartbeatRequest(BaseModel):
    """Reader heartbeat payload from the NFC daemon."""

    station: Literal['hotdog', 'beer']


manager = ConnectionManager()
ADMIN_PAGE_PATH = Path(__file__).with_name("admin_page.html")


def reader_health_from_app(app: FastAPI) -> dict[str, bool]:
    """Compute reader online/offline health booleans from heartbeat timestamps."""
    now = time.monotonic()
    threshold_seconds = 60
    last_seen = app.state.reader_last_seen
    return {
        "hotdogOnline": (now - last_seen.get("hotdog", 0)) <= threshold_seconds,
        "beerOnline": (now - last_seen.get("beer", 0)) <= threshold_seconds,
    }


def build_state_payload_from_app(app: FastAPI) -> dict[str, Any]:
    """Build full app state from DB and latest poller/admin game payload."""
    participants = fetch_participants_with_totals(app.state.db)
    return {
        "game": app.state.game_state,
        "participants": participants,
        "connection": {"status": "ok"},
        "readerHealth": reader_health_from_app(app),
        "updatedAt": utc_iso_now(),
    }


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create DB schema and background poll tasks during process startup."""
    conn = connect()
    initialize_schema(conn)

    team_id = int(os.getenv("MLB_TEAM_ID", "113"))
    game_date = os.getenv("MLB_GAME_DATE", "2026-05-31")
    disable_mlb_poller = os.getenv("DISABLE_MLB_POLLER", "0") == "1"

    poller = None if disable_mlb_poller else MlbPoller(team_id=team_id, game_date=game_date)

    app.state.db = conn
    app.state.poller = poller
    app.state.game_state = default_game_state()
    app.state.ws_manager = manager
    app.state.build_state_payload = build_state_payload_from_app
    app.state.reader_last_seen = {
        "hotdog": 0.0,
        "beer": 0.0,
    }

    async def on_game_update(game: dict[str, Any]) -> None:
        if poller is None:
            return
        # Skip broadcasts while admin override is pinned.
        if poller.manual_override is not None:
            return

        app.state.game_state = game
        state = build_state_payload_from_app(app)
        await manager.broadcast({"type": "state", "state": state})

    poller_task = (
        None
        if poller is None
        else asyncio.create_task(poller.run(on_game_update), name="mlb-poller")
    )

    try:
        yield
    finally:
        if poller_task is not None:
            poller_task.cancel()
            with suppress(asyncio.CancelledError):
                await poller_task
        if poller is not None:
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


@app.get("/admin", include_in_schema=False)
async def admin_page() -> HTMLResponse:
    """Serve a local-only admin console UI for game-day operations."""
    if not ADMIN_PAGE_PATH.exists():
        return HTMLResponse("<h1>Admin page missing.</h1>", status_code=500)
    return HTMLResponse(ADMIN_PAGE_PATH.read_text(encoding="utf-8"))


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
    celebration = mark_celebration_if_earned(request.app.state.db, payload.uid.strip())
    if celebration is not None:
        await manager.broadcast({"type": "celebration", "participant": celebration})
    await manager.broadcast({"type": "state", "state": state})

    return {
        "ok": True,
        **result,
    }


@app.post("/api/tap")
async def tap(payload: TapRequest, request: Request) -> Any:
    """Record a tap event and fan it out over WebSocket."""
    request.app.state.reader_last_seen[payload.station] = time.monotonic()

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
    celebration = mark_celebration_if_earned(request.app.state.db, payload.uid)
    state = build_state_payload_from_app(request.app)

    await manager.broadcast({"type": "tap", "tap": tap_event})
    if celebration is not None:
        await manager.broadcast({"type": "celebration", "participant": celebration})
    await manager.broadcast({"type": "state", "state": state})

    return {
        "ok": True,
        "tap": tap_event,
    }


@app.post("/api/nfc/heartbeat")
async def nfc_heartbeat(payload: ReaderHeartbeatRequest, request: Request) -> dict[str, Any]:
    """Record daemon liveness for a given reader station."""
    request.app.state.reader_last_seen[payload.station] = time.monotonic()
    return {"ok": True, "station": payload.station}


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


scoreboard_dist_dir = Path(
    os.getenv("SCOREBOARD_DIST_DIR", "apps/scoreboard-web/dist")
).resolve()
if scoreboard_dist_dir.exists():
    app.mount(
        "/",
        StaticFiles(directory=scoreboard_dist_dir, html=True),
        name="scoreboard-web",
    )
