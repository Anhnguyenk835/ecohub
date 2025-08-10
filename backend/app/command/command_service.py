from typing import Dict, List, Optional, Any
from datetime import datetime
from fastapi.concurrency import run_in_threadpool

from app.services.database import db
from app.utils.logger import get_logger
from app.command.command_model import CommandStatus # Import enum

logger = get_logger(__name__)

class CommandService:
    """Service class for managing command operations."""
    
    def __init__(self, collection_name: str = "commands"):
        self.collection_name = collection_name
        self.collection = db.collection(collection_name)

    async def create_command(self, command_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Tạo một command mới với trạng thái 'pending'."""
        try:
            command_data['createdAt'] = datetime.utcnow()
            command_data['status'] = CommandStatus.PENDING
            command_data['executedAt'] = None # Chưa được thực thi
            
            _update_time, doc_ref = await run_in_threadpool(self.collection.add, command_data)
            
            logger.info(f"Command created successfully with ID: {doc_ref.id}")
            
            created_data = command_data.copy()
            created_data['id'] = doc_ref.id
            return created_data
            
        except Exception as e:
            logger.error(f"Error creating command: {str(e)}")
            return None

    async def get_command(self, command_id: str) -> Optional[Dict[str, Any]]:
        """Lấy thông tin một command bằng ID."""
        try:
            doc_ref = self.collection.document(command_id)
            doc = await run_in_threadpool(doc_ref.get)
            
            if doc.exists:
                command_data = doc.to_dict()
                command_data['id'] = doc.id
                return command_data
            return None
        except Exception as e:
            logger.error(f"Error retrieving command {command_id}: {str(e)}")
            return None

    async def get_pending_commands_for_device(self, device_id: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Lấy các lệnh đang chờ (pending) cho một thiết bị cụ thể."""
        commands = []
        try:
            query = self.collection.where('deviceId', '==', device_id)\
                                  .where('status', '==', CommandStatus.PENDING)\
                                  .order_by('createdAt')\
                                  .limit(limit)
            
            docs = await run_in_threadpool(query.stream)
            for doc in docs:
                command_data = doc.to_dict()
                command_data['id'] = doc.id
                commands.append(command_data)
            return commands
        except Exception as e:
            logger.error(f"Error finding pending commands for device {device_id}: {str(e)}")
            return []

    async def update_command_status(self, command_id: str, update_data: Dict[str, Any]) -> bool:
        """Cập nhật trạng thái và thời gian thực thi của một lệnh."""
        try:
            # Luôn cập nhật thời gian thực thi khi trạng thái thay đổi
            update_data['executedAt'] = datetime.utcnow()
            
            doc_ref = self.collection.document(command_id)
            await run_in_threadpool(doc_ref.update, update_data)
            
            logger.info(f"Command {command_id} status updated successfully.")
            return True
            
        except Exception as e:
            logger.error(f"Error updating command {command_id}: {str(e)}")
            return False