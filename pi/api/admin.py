"""Admin-only API routes for game-state controls and maintenance actions."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from pi.api.db import (
    archive_and_reset_event,
    delete_participant,
    fetch_participants_with_totals,
    reset_event_scores,
    upsert_participant,
)

router = APIRouter(prefix="/api/admin", tags=["admin"])


class ParticipantPayload(BaseModel):
    """Create/update payload for participant administration."""

    uid: str = Field(min_length=1)
    name: str = Field(min_length=1)


class RenamePayload(BaseModel):
    """Rename payload for an existing participant."""

    name: str = Field(min_length=1)


class ResetPayload(BaseModel):
    """Reset confirmation payload requiring explicit double confirmation."""

    confirm_phrase: str
    confirm_second_check: bool


class ArchivePayload(BaseModel):
    """Archive request payload. Defaults to today's date when omitted."""

    event_date: str | None = None


@router.get("/participants")
async def list_participants(request: Request) -> dict[str, Any]:
    """Return participants with current totals for admin display."""
    participants = fetch_participants_with_totals(request.app.state.db)
    return {
        "ok": True,
        "participants": participants,
    }


@router.post("/participants")
async def add_or_update_participant(payload: ParticipantPayload, request: Request) -> dict[str, Any]:
    """Create or update participant name binding for a UID."""
    upsert_participant(request.app.state.db, payload.uid.strip(), payload.name.strip())
    state = request.app.state.build_state_payload(request.app)
    await request.app.state.ws_manager.broadcast({"type": "state", "state": state})

    return {
        "ok": True,
        "status": "saved",
    }


@router.patch("/participants/{uid}")
async def rename_participant(uid: str, payload: RenamePayload, request: Request) -> dict[str, Any]:
    """Rename an existing participant by UID."""
    upsert_participant(request.app.state.db, uid.strip(), payload.name.strip())
    state = request.app.state.build_state_payload(request.app)
    await request.app.state.ws_manager.broadcast({"type": "state", "state": state})

    return {
        "ok": True,
        "status": "renamed",
    }


@router.delete("/participants/{uid}")
async def remove_participant(uid: str, request: Request) -> dict[str, Any]:
    """Delete participant and all score history for that UID."""
    delete_participant(request.app.state.db, uid.strip())
    state = request.app.state.build_state_payload(request.app)
    await request.app.state.ws_manager.broadcast({"type": "state", "state": state})

    return {
        "ok": True,
        "status": "removed",
    }


@router.post("/force-register")
async def force_register(payload: ParticipantPayload, request: Request) -> dict[str, Any]:
    """Force bind a raw UID to a participant name without waiting for a tap."""
    upsert_participant(request.app.state.db, payload.uid.strip(), payload.name.strip())
    state = request.app.state.build_state_payload(request.app)
    await request.app.state.ws_manager.broadcast({"type": "state", "state": state})

    return {
        "ok": True,
        "status": "force_registered",
    }


@router.post("/reset")
async def reset_event(payload: ResetPayload, request: Request) -> dict[str, Any]:
    """Reset scores after explicit operator double confirmation."""
    if payload.confirm_phrase.strip().upper() != "RESET 999":
        raise HTTPException(status_code=400, detail="confirm_phrase must be exactly 'RESET 999'.")
    if not payload.confirm_second_check:
        raise HTTPException(status_code=400, detail="confirm_second_check must be true.")

    reset_event_scores(request.app.state.db)
    state = request.app.state.build_state_payload(request.app)
    await request.app.state.ws_manager.broadcast({"type": "state", "state": state})

    return {
        "ok": True,
        "status": "event_reset",
    }


@router.post("/archive")
async def archive_event(payload: ArchivePayload, request: Request) -> dict[str, Any]:
    """Snapshot DB to archive/ and reset the active event tables."""
    event_date = payload.event_date or datetime.now().strftime("%Y-%m-%d")
    archive_path = archive_and_reset_event(request.app.state.db, event_date)

    state = request.app.state.build_state_payload(request.app)
    await request.app.state.ws_manager.broadcast({"type": "state", "state": state})

    return {
        "ok": True,
        "status": "archived",
        "archivePath": str(archive_path),
    }


@router.post("/game")
async def set_game_override(payload: dict[str, Any], request: Request) -> dict[str, Any]:
    """Override live polling with an operator-supplied game-state payload."""
    if request.app.state.poller is None:
        raise HTTPException(status_code=503, detail="MLB poller disabled in this environment.")
    request.app.state.poller.set_manual_override(payload)
    request.app.state.game_state = payload
    state = request.app.state.build_state_payload(request.app)
    await request.app.state.ws_manager.broadcast({"type": "state", "state": state})

    return {
        "ok": True,
        "status": "override_enabled",
        "game": payload,
    }


@router.delete("/game")
async def clear_game_override(request: Request) -> dict[str, Any]:
    """Clear manual override and resume external polling."""
    if request.app.state.poller is None:
        raise HTTPException(status_code=503, detail="MLB poller disabled in this environment.")
    request.app.state.poller.clear_manual_override()
    game = await request.app.state.poller.poll_once()
    request.app.state.game_state = game
    state = request.app.state.build_state_payload(request.app)
    await request.app.state.ws_manager.broadcast({"type": "state", "state": state})

    return {
        "ok": True,
        "status": "override_cleared",
        "game": game,
    }
