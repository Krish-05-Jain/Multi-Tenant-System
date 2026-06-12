import logging
from typing import Dict, List
from fastapi import WebSocket

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # Store active connections isolated by tenant slug/id
        # Schema: { tenant_id: [WebSocket, WebSocket, ...] }
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, tenant_id: str, websocket: WebSocket):
        await websocket.accept()
        if tenant_id not in self.active_connections:
            self.active_connections[tenant_id] = []
        self.active_connections[tenant_id].append(websocket)
        logger.info(f"WebSocket client connected to workspace: {tenant_id}. Total active: {len(self.active_connections[tenant_id])}")

    def disconnect(self, tenant_id: str, websocket: WebSocket):
        if tenant_id in self.active_connections:
            if websocket in self.active_connections[tenant_id]:
                self.active_connections[tenant_id].remove(websocket)
                logger.info(f"WebSocket client disconnected from workspace: {tenant_id}.")
            if not self.active_connections[tenant_id]:
                del self.active_connections[tenant_id]

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        await websocket.send_json(message)

    async def broadcast_to_tenant(self, tenant_id: str, message: dict):
        """
        Broadcasts messages STRICTLY to connections within the same tenant.
        This guarantees strict data isolation during real-time operations.
        """
        connections = self.active_connections.get(tenant_id, [])
        if not connections:
            return
            
        logger.info(f"Broadcasting real-time update to {len(connections)} clients in workspace: {tenant_id}")
        for connection in connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                # Handle stale connections cleanup
                logger.warning(f"Failed to broadcast to socket. Cleaning up. Error: {e}")
                self.disconnect(tenant_id, connection)

# Global Singleton Instance
ws_manager = ConnectionManager()
