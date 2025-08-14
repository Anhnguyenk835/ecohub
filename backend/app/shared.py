import asyncio
from typing import List
from fastapi import WebSocket
from app.utils.logger import get_logger

logger = get_logger(__name__)

# --- Đặt ConnectionManager ở đây ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, zone_id: str):
        await websocket.accept()
        if zone_id not in self.active_connections:
            self.active_connections[zone_id] = []
        self.active_connections[zone_id].append(websocket)
        logger.info(f"New WebSocket client connected for zone {zone_id}.")

    def disconnect(self, websocket: WebSocket, zone_id: str):
        if zone_id in self.active_connections:
            self.active_connections[zone_id].remove(websocket)
            if not self.active_connections[zone_id]:
                del self.active_connections[zone_id]
        logger.info(f"WebSocket client for zone {zone_id} disconnected.")

    async def broadcast_to_zone(self, zone_id: str, message: str):
        if zone_id in self.active_connections:
            connections = self.active_connections[zone_id]
            tasks = [connection.send_text(message) for connection in connections]
            await asyncio.gather(*tasks)
            logger.info(f"Broadcasted message to {len(connections)} client(s) in zone {zone_id}.")

# --- Đặt các biến toàn cục dùng chung ở đây ---
manager = ConnectionManager()
main_loop = None