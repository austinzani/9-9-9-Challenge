"""Admin-only API routes for game-state controls and maintenance actions."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Request

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.post("/game")
async def set_game_override(payload: dict[str, Any], request: Request) -> dict[str, Any]:
    """Override live polling with an operator-supplied game-state payload."""
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
