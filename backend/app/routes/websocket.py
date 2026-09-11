"""
UrbanPulse - Real-Time WebSocket Telemetry Streaming
Pushes full junction lane-state snapshots every 3–5 seconds to connected frontend clients.
"""

import json
from datetime import datetime
from typing import List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["WebSocket"])


class ConnectionManager:
    """Manages active WebSocket client connections for real-time junction telemetry."""

    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in list(self.active_connections):
            try:
                await connection.send_text(message)
            except Exception:
                self.disconnect(connection)


manager = ConnectionManager()


@router.websocket("/ws/lanes")
async def websocket_lane_telemetry(websocket: WebSocket):
    """
    Subscribes client to live junction telemetry broadcasts.
    Receives JSON snapshots of all 4 lanes, emergency status, and signal states.
    """
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection open; client can optionally send command messages
            data = await websocket.receive_text()
            # If client requests immediate refresh
            if data == "ping":
                await websocket.send_text(json.dumps({"type": "pong", "time": datetime.utcnow().isoformat()}))
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)
