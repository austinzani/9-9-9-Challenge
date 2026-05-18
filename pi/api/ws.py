"""WebSocket connection management for real-time scoreboard updates."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime

from fastapi import WebSocket


class ConnectionManager:
    """Tracks active sockets and broadcasts typed JSON events."""

    def __init__(self) -> None:
        self._clients: set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> None:
        """Accept a client and send an initial hello payload."""
        await websocket.accept()
        async with self._lock:
            self._clients.add(websocket)
        await websocket.send_json(
            {
                "type": "hello",
                "message": "connected",
                "timestamp": datetime.now(UTC).isoformat(),
            }
        )

    async def disconnect(self, websocket: WebSocket) -> None:
        """Remove a client from the active set."""
        async with self._lock:
            self._clients.discard(websocket)

    async def broadcast(self, payload: dict) -> None:
        """Send an event to all active sockets; prune closed clients."""
        async with self._lock:
            clients = list(self._clients)

        for client in clients:
            try:
                await client.send_json(payload)
            except Exception:
                await self.disconnect(client)
